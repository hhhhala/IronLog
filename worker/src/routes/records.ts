import { Hono } from 'hono';

type Bindings = { DB: D1Database };

const router = new Hono<{ Bindings: Bindings }>();

// List records for a user
router.get('/', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ success: false, error: 'userId required' }, 400);

  const records = await c.env.DB.prepare(
    'SELECT * FROM records WHERE user_id = ? ORDER BY date DESC, created_at DESC'
  ).bind(userId).all();

  const result = [];
  for (const r of records.results) {
    const exercises = await c.env.DB.prepare(
      'SELECT * FROM record_exercises WHERE record_id = ? ORDER BY set_number'
    ).bind(r.id).all();
    result.push({ ...r, exercises: exercises.results });
  }

  return c.json({ success: true, data: result });
});

// Get single record
router.get('/:id', async (c) => {
  const id = c.req.param('id');
  const record = await c.env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(id).first();
  if (!record) return c.json({ success: false, error: 'Record not found' }, 404);

  const exercises = await c.env.DB.prepare(
    'SELECT * FROM record_exercises WHERE record_id = ? ORDER BY set_number'
  ).bind(id).all();
  return c.json({ success: true, data: { ...record, exercises: exercises.results } });
});

// Create or update record
router.post('/', async (c) => {
  const body = await c.req.json();
  const {
    id, userId, planId, date, totalDuration, totalSets,
    totalReps, totalVolume, estimatedCalories, growthPoints,
    exercises, notes,
  } = body;

  if (!userId) return c.json({ success: false, error: 'userId required' }, 400);

  let recordId = id;

  if (recordId) {
    await c.env.DB.prepare(`
      UPDATE records SET
        plan_id = ?, date = ?, total_duration = ?, total_sets = ?,
        total_reps = ?, total_volume = ?, estimated_calories = ?,
        growth_points = ?, notes = ?
      WHERE id = ? AND user_id = ?
    `).bind(planId || null, date, totalDuration || 0, totalSets || 0,
      totalReps || 0, totalVolume || 0, estimatedCalories || 0,
      growthPoints || 0, notes || '', recordId, userId).run();
    await c.env.DB.prepare('DELETE FROM record_exercises WHERE record_id = ?').bind(recordId).run();
  } else {
    const res = await c.env.DB.prepare(`
      INSERT INTO records (user_id, plan_id, date, total_duration, total_sets, total_reps, total_volume, estimated_calories, growth_points, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(userId, planId || null, date, totalDuration || 0, totalSets || 0,
      totalReps || 0, totalVolume || 0, estimatedCalories || 0,
      growthPoints || 0, notes || '').run();
    recordId = res.meta?.last_row_id;
  }

  // Insert exercises
  if (exercises && Array.isArray(exercises) && recordId) {
    for (const ex of exercises) {
      await c.env.DB.prepare(`
        INSERT INTO record_exercises (record_id, exercise_name, set_number, weight, reps, is_pr)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(recordId, ex.exerciseName || '', ex.setNumber || 1,
        ex.weight || 0, ex.reps || 0, ex.isPR ? 1 : 0).run();
    }
  }

  // Log growth
  if (growthPoints > 0 && recordId) {
    await c.env.DB.prepare(`
      INSERT INTO growth_logs (user_id, date, points, reason, related_record_id)
      VALUES (?, ?, ?, '训练完成', ?)
    `).bind(userId, date, growthPoints, recordId).run();
  }

  const record = await c.env.DB.prepare('SELECT * FROM records WHERE id = ?').bind(recordId).first();
  const exs = await c.env.DB.prepare(
    'SELECT * FROM record_exercises WHERE record_id = ? ORDER BY set_number'
  ).bind(recordId).all();
  return c.json({ success: true, data: { ...record, exercises: exs.results } });
});

// Delete record
router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM growth_logs WHERE related_record_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM record_exercises WHERE record_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM records WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default router;
