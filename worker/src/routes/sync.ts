import { Hono } from 'hono';

type Bindings = { DB: D1Database };

const router = new Hono<{ Bindings: Bindings }>();

// Full sync endpoint - receives all local data and merges with cloud
router.post('/', async (c) => {
  const body = await c.req.json();
  const { user, plans, planExercises, records, recordExercises, weightLogs, growthLogs } = body;

  const db = c.env.DB;

  // Upsert user
  if (user) {
    await db.prepare(`
      INSERT INTO users (id, nickname, height, weight, goal, training_experience, weekly_frequency, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        nickname = excluded.nickname, height = excluded.height, weight = excluded.weight,
        goal = excluded.goal, training_experience = excluded.training_experience,
        weekly_frequency = excluded.weekly_frequency, updated_at = datetime('now')
    `).bind(user.id, user.nickname || '', user.height || 170, user.weight || 70,
      user.goal || '增肌', user.trainingExperience || '新手', user.weeklyFrequency || 3).run();
  }

  // Upsert plans
  if (plans && Array.isArray(plans)) {
    for (const plan of plans) {
      if (plan.id) {
        await db.prepare(`
          INSERT INTO plans (id, user_id, name, goal, cycle_days, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name, goal = excluded.goal, cycle_days = excluded.cycle_days,
            is_active = excluded.is_active, updated_at = datetime('now')
        `).bind(plan.id, user?.id || plan.userId, plan.name, plan.goal,
          plan.cycleDays, plan.isActive ? 1 : 0, plan.createdAt || '').run();
      }
    }
  }

  // Upsert plan exercises
  if (planExercises && Array.isArray(planExercises)) {
    for (const ex of planExercises) {
      if (ex.id) {
        await db.prepare(`
          INSERT INTO plan_exercises (id, plan_id, day_number, exercise_name, sets, reps, target_weight, rest_time, sort_order, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            exercise_name = excluded.exercise_name, sets = excluded.sets, reps = excluded.reps,
            target_weight = excluded.target_weight, rest_time = excluded.rest_time
        `).bind(ex.id, ex.planId, ex.dayNumber, ex.exerciseName, ex.sets, ex.reps,
          ex.targetWeight, ex.restTime, ex.sortOrder, ex.notes || '').run();
      }
    }
  }

  // Upsert records
  if (records && Array.isArray(records)) {
    for (const record of records) {
      if (record.id) {
        await db.prepare(`
          INSERT INTO records (id, user_id, plan_id, date, total_duration, total_sets, total_reps, total_volume, estimated_calories, growth_points, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            total_duration = excluded.total_duration, total_sets = excluded.total_sets,
            total_reps = excluded.total_reps, total_volume = excluded.total_volume,
            estimated_calories = excluded.estimated_calories, growth_points = excluded.growth_points,
            notes = excluded.notes
        `).bind(record.id, user?.id || record.userId, record.planId, record.date,
          record.totalDuration, record.totalSets, record.totalReps, record.totalVolume,
          record.estimatedCalories, record.growthPoints, record.notes || '',
          record.createdAt || '').run();
      }
    }
  }

  // Upsert record exercises
  if (recordExercises && Array.isArray(recordExercises)) {
    for (const ex of recordExercises) {
      if (ex.id) {
        await db.prepare(`
          INSERT INTO record_exercises (id, record_id, exercise_name, set_number, weight, reps, is_pr)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            weight = excluded.weight, reps = excluded.reps, is_pr = excluded.is_pr
        `).bind(ex.id, ex.recordId, ex.exerciseName, ex.setNumber, ex.weight, ex.reps, ex.isPR ? 1 : 0).run();
      }
    }
  }

  // Upsert weight logs
  if (weightLogs && Array.isArray(weightLogs)) {
    for (const log of weightLogs) {
      if (log.id) {
        await db.prepare(`
          INSERT INTO weight_logs (id, user_id, date, weight, created_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET weight = excluded.weight
        `).bind(log.id, user?.id || log.userId, log.date, log.weight,
          log.createdAt || '').run();
      }
    }
  }

  // Upsert growth logs
  if (growthLogs && Array.isArray(growthLogs)) {
    for (const log of growthLogs) {
      if (log.id) {
        await db.prepare(`
          INSERT INTO growth_logs (id, user_id, date, points, reason, related_record_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET points = excluded.points, reason = excluded.reason
        `).bind(log.id, user?.id || log.userId, log.date, log.points, log.reason || '',
          log.relatedRecordId, log.createdAt || '').run();
      }
    }
  }

  return c.json({
    success: true,
    data: { syncedAt: new Date().toISOString() },
  });
});

// Download all cloud data for a user (used when switching devices)
router.get('/pull', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ success: false, error: 'userId required' }, 400);

  const db = c.env.DB;

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  const plans = await db.prepare('SELECT * FROM plans WHERE user_id = ?').bind(userId).all();
  const records = await db.prepare('SELECT * FROM records WHERE user_id = ? ORDER BY date DESC').bind(userId).all();
  const weightLogs = await db.prepare('SELECT * FROM weight_logs WHERE user_id = ?').bind(userId).all();
  const growthLogs = await db.prepare('SELECT * FROM growth_logs WHERE user_id = ?').bind(userId).all();

  // Get exercises for all plans
  const planExercises = [];
  for (const p of plans.results) {
    const exs = await db.prepare('SELECT * FROM plan_exercises WHERE plan_id = ?').bind(p.id).all();
    planExercises.push(...exs.results);
  }

  // Get exercises for all records
  const recordExercises = [];
  for (const r of records.results) {
    const exs = await db.prepare('SELECT * FROM record_exercises WHERE record_id = ?').bind(r.id).all();
    recordExercises.push(...exs.results);
  }

  return c.json({
    success: true,
    data: {
      user,
      plans: plans.results,
      planExercises,
      records: records.results,
      recordExercises,
      weightLogs: weightLogs.results,
      growthLogs: growthLogs.results,
      pulledAt: new Date().toISOString(),
    },
  });
});

export default router;
