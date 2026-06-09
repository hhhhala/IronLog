import { Hono } from 'hono';

type Bindings = { DB: D1Database };

const router = new Hono<{ Bindings: Bindings }>();

// Upload: clear cloud data for this user, then insert all local data
router.post('/', async (c) => {
  const body = await c.req.json();
  const { user, plans, planExercises, records, recordExercises, weightLogs, growthLogs } = body;

  const db = c.env.DB;
  let userId = user?.id as string;
  if (!userId) return c.json({ success: false, error: 'No user data' }, 400);

  const counts = { plans: 0, planExercises: 0, records: 0, recordExercises: 0, weightLogs: 0, growthLogs: 0 };

  // 1. Upsert user (including deepseek_api_key for cross-device sync)
  await db.prepare(`
    INSERT INTO users (id, nickname, height, weight, goal, training_experience, weekly_frequency, deepseek_api_key, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      nickname = ?2, height = ?3, weight = ?4, goal = ?5,
      training_experience = ?6, weekly_frequency = ?7,
      deepseek_api_key = ?8, updated_at = datetime('now')
  `).bind(userId, user.nickname || '', user.height || 170, user.weight || 70,
    user.goal || '增肌', user.trainingExperience || '新手', user.weeklyFrequency || 3,
    user.deepseekApiKey || '').run();

  // 2. Clear & re-insert plans for this user
  if (plans && Array.isArray(plans)) {
    await db.prepare('DELETE FROM plan_exercises WHERE plan_id IN (SELECT id FROM plans WHERE user_id = ?)').bind(userId).run();
    await db.prepare('DELETE FROM plans WHERE user_id = ?').bind(userId).run();

    for (const plan of plans) {
      await db.prepare(`
        INSERT INTO plans (user_id, name, goal, cycle_days, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(userId, plan.name || '', plan.goal || '', plan.cycleDays || 3, plan.isActive ? 1 : 0, plan.createdAt || '').run();

      // Get the newly inserted plan's ID
      const newPlan = await db.prepare('SELECT last_insert_rowid() as id').first();
      const newPlanId = (newPlan as { id: number }).id;
      counts.plans++;

      // Insert exercises for this plan (match by old plan ID)
      const planExs = (planExercises || []).filter((ex: { planId?: number }) => ex.planId === plan.id);
      for (const ex of planExs) {
        await db.prepare(`
          INSERT INTO plan_exercises (plan_id, day_number, exercise_name, sets, reps, target_weight, rest_time, sort_order, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(newPlanId, ex.dayNumber || 1, ex.exerciseName || '', ex.sets || 3,
          ex.reps || 10, ex.targetWeight || 0, ex.restTime || 90, ex.sortOrder || 0, ex.notes || '').run();
        counts.planExercises++;
      }
    }
  }

  // 3. Clear & re-insert records
  if (records && Array.isArray(records)) {
    await db.prepare('DELETE FROM record_exercises WHERE record_id IN (SELECT id FROM records WHERE user_id = ?)').bind(userId).run();
    await db.prepare('DELETE FROM growth_logs WHERE user_id = ?').bind(userId).run();
    await db.prepare('DELETE FROM records WHERE user_id = ?').bind(userId).run();

    for (const r of records) {
      await db.prepare(`
        INSERT INTO records (user_id, plan_id, date, total_duration, total_sets, total_reps, total_volume, estimated_calories, growth_points, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(userId, r.planId || null, r.date || '', r.totalDuration || 0, r.totalSets || 0,
        r.totalReps || 0, r.totalVolume || 0, r.estimatedCalories || 0,
        r.growthPoints || 0, r.notes || '', r.createdAt || '').run();

      const newRecord = await db.prepare('SELECT last_insert_rowid() as id').first();
      const newRecordId = (newRecord as { id: number }).id;
      counts.records++;

      // Insert exercises for this record
      const recExs = (recordExercises || []).filter((ex: { recordId?: number }) => ex.recordId === r.id);
      for (const ex of recExs) {
        await db.prepare(`
          INSERT INTO record_exercises (record_id, exercise_name, set_number, weight, reps, is_pr)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(newRecordId, ex.exerciseName || '', ex.setNumber || 1, ex.weight || 0, ex.reps || 0, ex.isPR ? 1 : 0).run();
        counts.recordExercises++;
      }
    }
  }

  // 4. Weight logs
  if (weightLogs && Array.isArray(weightLogs)) {
    await db.prepare('DELETE FROM weight_logs WHERE user_id = ?').bind(userId).run();
    for (const log of weightLogs) {
      await db.prepare('INSERT INTO weight_logs (user_id, date, weight, created_at) VALUES (?, ?, ?, ?)')
        .bind(userId, log.date || '', log.weight || 0, log.createdAt || '').run();
      counts.weightLogs++;
    }
  }

  // 5. Growth logs
  if (growthLogs && Array.isArray(growthLogs)) {
    await db.prepare('DELETE FROM growth_logs WHERE user_id = ?').bind(userId).run();
    for (const log of growthLogs) {
      await db.prepare('INSERT INTO growth_logs (user_id, date, points, reason, related_record_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(userId, log.date || '', log.points || 0, log.reason || '', log.relatedRecordId || null, log.createdAt || '').run();
      counts.growthLogs++;
    }
  }

  return c.json({
    success: true,
    data: { syncedAt: new Date().toISOString(), counts },
  });
});

// Download all cloud data (device-agnostic)
router.get('/pull', async (c) => {
  const db = c.env.DB;

  const user = await db.prepare('SELECT * FROM users LIMIT 1').first();
  if (!user) return c.json({ success: false, error: '云端无数据，请先上传' }, 404);

  const userId = user.id as string;

  const plans = await db.prepare('SELECT * FROM plans WHERE user_id = ?').bind(userId).all();
  const records = await db.prepare('SELECT * FROM records WHERE user_id = ? ORDER BY date DESC').bind(userId).all();
  const weightLogs = await db.prepare('SELECT * FROM weight_logs WHERE user_id = ?').bind(userId).all();
  const growthLogs = await db.prepare('SELECT * FROM growth_logs WHERE user_id = ?').bind(userId).all();

  const planExercises: unknown[] = [];
  for (const p of plans.results) {
    const exs = await db.prepare('SELECT * FROM plan_exercises WHERE plan_id = ?').bind(p.id).all();
    planExercises.push(...exs.results);
  }

  const recordExercises: unknown[] = [];
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
