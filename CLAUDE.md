# IronLog — CLAUDE.md

AI 驱动的健身训练计划与记录 PWA。

## 技术栈

- **前端**: React 19, TypeScript, Vite 6, Tailwind CSS 4, PostCSS + Autoprefixer
- **状态管理**: Zustand 5
- **路由**: react-router-dom 7
- **本地数据库**: Dexie.js（IndexedDB 封装）
- **图表**: Recharts
- **PWA**: vite-plugin-pwa（Workbox，Service Worker 自动更新）
- **后端**: Cloudflare Workers + Hono.js 4
- **云数据库**: Cloudflare D1 (SQLite)
- **AI**: DeepSeek API（REST: `POST /api/ai/plan`）

## 项目结构

```
ironlog/
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # 根组件：页面路由 + 布局包裹
│   │   ├── main.tsx             # 入口：挂载 React + 注册 Service Worker
│   │   ├── types.ts             # 共享 TS 类型定义
│   │   ├── stores/              # Zustand 状态仓库
│   │   │   ├── plan-store.ts
│   │   │   ├── training-store.ts
│   │   │   ├── user-store.ts
│   │   │   └── sync-store.ts
│   │   ├── pages/               # 页面组件（10 个文件）
│   │   ├── components/          # 可复用 UI 组件
│   │   │   ├── layout/          # Layout, TabBar
│   │   │   └── shared/          # Modal, Toast, BottomSheet 等
│   │   ├── hooks/               # 自定义 Hooks（useTimer, useTraining 等）
│   │   ├── services/            # API 客户端、AI 服务、同步逻辑
│   │   ├── db/                  # Dexie.js IndexedDB 数据库定义
│   │   └── utils/               # 工具函数（热量、成长、连续记录、更新日志）
│   ├── public/                  # PWA 图标
│   ├── vite.config.ts           # Vite + PWA 配置，别名 @/，服务器 0.0.0.0
│   └── index.html
├── worker/
│   ├── wrangler.toml            # Cloudflare Workers 配置 + D1 绑定
│   ├── schema.sql               # D1 数据库建表语句（7 张表）
│   └── src/
│       ├── index.ts             # Hono 应用入口 + CORS + 路由注册
│       └── routes/              # 路由模块：user, plans, records, ai, sync
├── README.md
├── README.zh-CN.md
├── CLAUDE.md
└── .gitignore
```

## 常用命令

### 前端
```bash
cd frontend
npm install       # 安装依赖
npm run dev       # 启动 Vite 开发服务器 → localhost:5173
npm run build     # tsc 类型检查 + vite 构建 → dist/
npm run preview   # 预览生产构建
```

### Worker
```bash
cd worker
npm install              # 安装依赖
npm run dev              # wrangler dev（本地 D1）
npm run deploy           # wrangler deploy 部署到生产
npm run db:init          # 初始化生产环境 D1 数据库
npm run db:local         # 初始化本地 D1 数据库
```

## 架构与约定

### 状态管理
- **Zustand stores** — 按领域分文件：user, plan, training, sync
- 仅管理前端状态；云同步通过 `useCloudSync` hook 处理
- 每次数据变更自动持久化到 IndexedDB（Dexie.js）

### 数据流
```
用户输入 → Zustand store → Dexie（本地）→ 可选同步 → CF D1（云端）
AI 教练 → POST /api/ai/plan（DeepSeek）→ 返回计划 JSON → 存入本地
```

### 路由
- SPA，使用 react-router-dom v7
- 底部 TabBar 主导航：计划列表、仪表盘、数据中心、日历、个人中心
- 活跃训练和 AI 教练为次级路由

### 命名规范
- **文件**：工具函数 `kebab-case.ts`；页面和组件 `PascalCase.tsx`
- **类型/接口**：PascalCase（`UserProfile`, `TrainingPlan`, `PlanExercise`）
- **状态仓库**：camelCase，导出为 zustand hook（`useUserStore`, `usePlanStore`）
- **Hooks**：`useXxx` 命名规范
- **数据库列**：SQL 中用 snake_case；TS 类型中映射为 camelCase
- **API 路由**：RESTful 复数形式（`/api/plans`, `/api/records`）

### 数据库（D1/SQLite）
7 张表：`users`, `plans`, `plan_exercises`, `records`, `record_exercises`, `weight_logs`, `growth_logs`。所有时间戳默认 `datetime('now')`。

### PWA
- Service Worker 通过 `vite-plugin-pwa` 自动更新（`registerType: 'autoUpdate'`）
- API 请求使用 NetworkFirst 缓存策略（24 小时 TTL）
- 支持 iOS/Android 安装，本地数据库操作支持离线使用

### Worker 环境变量
- `DB` — D1 数据库绑定（在 wrangler.toml 中配置）
- `DEEPSEEK_API_KEY` — DeepSeek API 密钥（通过 `wrangler secret put` 设置）
- `DEEPSEEK_API_URL` — DeepSeek API 地址，默认 `https://api.deepseek.com`

## 共享组件
- `Modal` — 带遮罩的弹窗
- `BottomSheet` — 从底部滑出的面板（移动优先）
- `Toast` — 短暂提示通知
- `EmptyState` — 空数据占位视图
- `UpdateModal` — PWA 更新提示

## 远程仓库
- `git@github.com:ironlog-ai/ironlog.git`
