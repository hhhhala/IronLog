import { Hono } from 'hono';

type Bindings = { DB: D1Database };

const router = new Hono<{ Bindings: Bindings }>();

// List plans for a user
router.get('/', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ success: false, error: 'userId required' }, 400);

  const plans = await c.env.DB.prepare(
    'SELECT * FROM plans WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all();

  // Get exercises for each plan
  const result = [];
  for (const plan of plans.results) {
    const exercises = await c.env.DB.prepare(
      'SELECT * FROM plan_exercises WHERE plan_id = ? ORDER BY sort_order'
    ).bind(plan.id).all();
    result.push({ ...plan, exercises: exercises.results });
  }

  return c.json({ success: true, data: result });
});

// Get single plan
router.get('/:id', async (c) => {
  const id = c.req.param('id');
  const plan = await c.env.DB.prepare('SELECT * FROM plans WHERE id = ?').bind(id).first();
  if (!plan) return c.json({ success: false, error: 'Plan not found' }, 404);

  const exercises = await c.env.DB.prepare(
    'SELECT * FROM plan_exercises WHERE plan_id = ? ORDER BY sort_order'
  ).bind(id).all();
  return c.json({ success: true, data: { ...plan, exercises: exercises.results } });
});

// Create or update plan
router.post('/', async (c) => {
  const body = await c.req.json();
  const { id, userId, name, goal, cycleDays, isActive, exercises } = body;

  if (!userId) return c.json({ success: false, error: 'userId required' }, 400);

  let planId = id;

  if (planId) {
    // Update
    await c.env.DB.prepare(`
      UPDATE plans SET name = ?, goal = ?, cycle_days = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).bind(name || '', goal || '', cycleDays || 3, isActive ? 1 : 0, planId, userId).run();
    // Delete old exercises
    await c.env.DB.prepare('DELETE FROM plan_exercises WHERE plan_id = ?').bind(planId).run();
  } else {
    // Insert
    const res = await c.env.DB.prepare(`
      INSERT INTO plans (user_id, name, goal, cycle_days, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).bind(userId, name || '', goal || '', cycleDays || 3, isActive ? 1 : 0).run();
    planId = res.meta?.last_row_id || undefined;
  }

  // Insert exercises
  if (exercises && Array.isArray(exercises) && planId) {
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      await c.env.DB.prepare(`
        INSERT INTO plan_exercises (plan_id, day_number, exercise_name, sets, reps, target_weight, rest_time, sort_order, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        planId, ex.dayNumber || 1, ex.exerciseName || '', ex.sets || 3,
        ex.reps || 10, ex.targetWeight || 0, ex.restTime || 90, i,
        ex.notes || ''
      ).run();
    }
  }

  const plan = await c.env.DB.prepare('SELECT * FROM plans WHERE id = ?').bind(planId).first();
  const exs = await c.env.DB.prepare(
    'SELECT * FROM plan_exercises WHERE plan_id = ? ORDER BY sort_order'
  ).bind(planId).all();
  return c.json({ success: true, data: { ...plan, exercises: exs.results } });
});

// Delete plan
router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM plan_exercises WHERE plan_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM plans WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default router;
