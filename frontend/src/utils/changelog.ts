/** Current app version — bump this on each release */
export const APP_VERSION = '1.2.0';

/** Changelog entries — newest first. Shown in update announcement. */
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: '2026-06-01',
    changes: [
      '新增 AI 教练页面内置 API Key 设置，无需去个人中心',
      '新增双向云端同步：上传到 D1 / 从 D1 下载',
      '新增休息计时双模式：正计时 / 倒计时',
      '修复训练计划页按钮被导航栏遮挡',
      '修复云端同步地址错误',
      '优化 AI 对话体验，支持闲聊和计划生成',
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
