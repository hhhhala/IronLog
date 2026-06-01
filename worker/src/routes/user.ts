import { Hono } from 'hono';

type Bindings = { DB: D1Database };

const router = new Hono<{ Bindings: Bindings }>();

// Get user
router.get('/:id', async (c) => {
  const userId = c.req.param('id');
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  if (!user) return c.json({ success: false, error: 'User not found' }, 404);
  return c.json({ success: true, data: user });
});

// Create or update user
router.post('/', async (c) => {
  const body = await c.req.json();
  const {
    id, nickname, height, weight, goal,
    training_experience, weekly_frequency,
  } = body;

  if (!id) return c.json({ success: false, error: 'User id is required' }, 400);

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();

  if (existing) {
    await c.env.DB.prepare(`
      UPDATE users SET
        nickname = ?, height = ?, weight = ?, goal = ?,
        training_experience = ?, weekly_frequency = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(nickname || '', height || 170, weight || 70, goal || '增肌',
      training_experience || '新手', weekly_frequency || 3, id).run();
  } else {
    await c.env.DB.prepare(`
      INSERT INTO users (id, nickname, height, weight, goal, training_experience, weekly_frequency)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, nickname || '', height || 170, weight || 70, goal || '增肌',
      training_experience || '新手', weekly_frequency || 3).run();
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  return c.json({ success: true, data: user });
});

export default router;
