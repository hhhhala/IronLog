import { Hono } from 'hono';
import { cors } from 'hono/cors';
import userRoutes from './routes/user';
import planRoutes from './routes/plans';
import recordRoutes from './routes/records';
import aiRoutes from './routes/ai';
import syncRoutes from './routes/sync';

type Bindings = {
  DB: D1Database;
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_API_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// Health check
app.get('/api/health', (c) => c.json({ success: true, time: Date.now() }));

// Routes
app.route('/api/user', userRoutes);
app.route('/api/plans', planRoutes);
app.route('/api/records', recordRoutes);
app.route('/api/ai', aiRoutes);
app.route('/api/sync', syncRoutes);

export default app;
