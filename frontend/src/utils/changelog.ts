/** Current app version — bump this on each release */
export const APP_VERSION = '1.7.0';

/** Changelog entries — newest first. Shown in update announcement. */
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.7.0',
    date: '2026-06-09',
    changes: [
      'AI 教练支持正常聊天对话：闲聊、问答、生成计划三种模式自由切换',
      '前端将聊天意图传给 Worker，Worker 使用不同的系统提示',
      '生成计划时自动带上用户资料，聊天时语气自然亲切',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-06-09',
    changes: [
      'AI 教练去掉本地计划兜底，失败时显示具体错误信息（API Key 错误 / 网络异常等）',
      '未设置 API Key 时提示引导配置，不再生成默认计划',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-06-09',
    changes: [
      '云端同步全面升级：训练计划、训练记录、DeepSeek API Key 均可跨设备同步',
      '修复下载同步时字段映射错误，确保数据完整',
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
