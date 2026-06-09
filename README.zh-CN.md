# IronLog 🏋️

AI 驱动的健身训练计划与记录 PWA。通过 DeepSeek AI 生成训练计划，执行训练并配有休息计时器，长期追踪你的进步。

## 功能特性

- 🤖 **AI 教练** — 通过 DeepSeek API 生成个性化训练计划
- 📋 **训练计划** — 创建、编辑和管理训练计划
- ⏱️ **训练模式** — 执行训练，配有休息计时器和震动提醒
- 📊 **训练记录** — 追踪训练历史、训练量和成长点数
- 📈 **数据中心** — 训练频率、训练量和趋势图表
- 📅 **日历视图** — 月度展示，含连续训练记录
- 📱 **PWA 支持** — 可在 iPhone 上安装，支持离线使用
- ☁️ **云同步** — 数据同步至 Cloudflare D1

## 技术栈

- **前端**: React 19, TypeScript, Vite, Tailwind CSS 4
- **状态管理**: Zustand
- **本地数据库**: Dexie.js (IndexedDB)
- **PWA**: vite-plugin-pwa
- **后端**: Cloudflare Workers + Hono.js
- **云数据库**: Cloudflare D1 (SQLite)
- **AI**: DeepSeek API

## 快速开始

```bash
# 安装前端依赖
cd frontend
npm install
npm run dev

# 安装 Worker 依赖
cd worker
npm install
npm run dev
```

## 部署

```bash
# 前端部署到 Cloudflare Pages
cd frontend
npm run build
# 通过 Cloudflare Pages 控制台或 wrangler pages deploy 部署 dist/ 目录

# Worker 部署
cd worker
npx wrangler deploy
```
