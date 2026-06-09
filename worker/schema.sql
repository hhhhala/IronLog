-- IronLog D1 Database Schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nickname TEXT DEFAULT '',
  height REAL DEFAULT 170,
  weight REAL DEFAULT 70,
  goal TEXT DEFAULT '增肌',
  training_experience TEXT DEFAULT '新手',
  weekly_frequency INTEGER DEFAULT 3,
  deepseek_api_key TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL DEFAULT '',
  goal TEXT DEFAULT '',
  cycle_days INTEGER DEFAULT 3,
  is_active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plan_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  day_number INTEGER DEFAULT 1,
  exercise_name TEXT NOT NULL DEFAULT '',
  sets INTEGER DEFAULT 3,
  reps INTEGER DEFAULT 10,
  target_weight REAL DEFAULT 0,
  rest_time INTEGER DEFAULT 90,
  sort_order INTEGER DEFAULT 0,
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  plan_id INTEGER REFERENCES plans(id),
  date TEXT NOT NULL,
  total_duration INTEGER DEFAULT 0,
  total_sets INTEGER DEFAULT 0,
  total_reps INTEGER DEFAULT 0,
  total_volume REAL DEFAULT 0,
  estimated_calories REAL DEFAULT 0,
  growth_points INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS record_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL DEFAULT '',
  set_number INTEGER DEFAULT 1,
  weight REAL DEFAULT 0,
  reps INTEGER DEFAULT 0,
  is_pr INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  weight REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS growth_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  reason TEXT DEFAULT '',
  related_record_id INTEGER REFERENCES records(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plans_user ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan ON plan_exercises(plan_id);
CREATE INDEX IF NOT EXISTS idx_records_user ON records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
CREATE INDEX IF NOT EXISTS idx_record_exercises_record ON record_exercises(record_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user ON weight_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_growth_logs_user ON growth_logs(user_id, date);
