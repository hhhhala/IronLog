# IronLog 🏋️

AI-powered fitness training planner and tracker PWA. Generate training plans via DeepSeek AI, execute workouts with rest timers, and track your progress over time.

## Features

- 🤖 **AI Coach** — Generate personalized training plans via DeepSeek API
- 📋 **Training Plans** — Create, edit, and manage workout plans
- ⏱️ **Training Mode** — Execute workouts with rest timers and vibration alerts
- 📊 **Records** — Track training history, volume, and growth points
- 📈 **Data Center** — Charts for training frequency, volume, and trends
- 📅 **Calendar** — Monthly view with streak tracking
- 📱 **PWA** — Installable on iPhone, works offline
- ☁️ **Cloud Sync** — Sync data to Cloudflare D1

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4
- **State**: Zustand
- **Local DB**: Dexie.js (IndexedDB)
- **PWA**: vite-plugin-pwa
- **Backend**: Cloudflare Workers + Hono.js
- **Cloud DB**: Cloudflare D1 (SQLite)
- **AI**: DeepSeek API

## Getting Started

```bash
# Install frontend
cd frontend
npm install
npm run dev

# Install worker
cd worker
npm install
npm run dev
```

## Deploy

```bash
# Frontend to Cloudflare Pages
cd frontend
npm run build
# Deploy dist/ folder via Cloudflare Pages dashboard or wrangler pages deploy

# Worker
cd worker
npx wrangler deploy
```
