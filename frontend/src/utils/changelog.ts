/** Current app version — bump this on each release */
export const APP_VERSION = '1.3.0';

/** Changelog entries — newest first. Shown in update announcement. */
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.3.0',
    date: '2026-06-09',
    changes: [
      '新增中文版 README 及项目说明文档 (CLAUDE.md)',
      '优化 AI 教练网络请求：浏览器直连 DeepSeek API，不再绕道 Cloudflare Worker 代理',
      '新增 60 秒超时自动降级：直连失败 → Worker 代理 → 本地计划，三级兜底',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-06-01',
    changes: [
      'IronLog 首发上线 🎉',
      'AI 教练通过 DeepSeek 生成训练计划',
      '训练执行：组次记录、休息计时、震动提醒',
      '训练记录与数据中心：趋势图表、成长值',
      '训练日历与连续打卡',
      'PWA 支持，可安装到 iPhone 主屏幕',
      'Cloudflare D1 云端数据存储',
    ],
  },
];

/** Get the latest changelog entry */
export function getLatestChangelog(): ChangelogEntry {
  return CHANGELOG[0];
}
