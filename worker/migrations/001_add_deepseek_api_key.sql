-- Migration: add deepseek_api_key to users table
-- Run: wrangler d1 execute ironlog-db --file=migrations/001_add_deepseek_api_key.sql
-- Or for local: wrangler d1 execute ironlog-db --file=migrations/001_add_deepseek_api_key.sql --local

ALTER TABLE users ADD COLUMN deepseek_api_key TEXT DEFAULT '';
