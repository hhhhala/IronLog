// DeepSeek AI Service - local prompt simulation + cloud API proxy
import type { UserProfile, AIChatMessage } from '@/types';

const AI_SYSTEM_PROMPT = `你是一个专业的健身教练AI助手，名为IronLog Coach。你的职责是根据用户的身体数据和训练目标，生成科学的训练计划。

用户会提供以下信息：
- 年龄、身高、体重
- 训练经验（新手/半年/1年/2年+）
- 目标（增肌/减脂/力量提升/运动表现）
- 每周训练天数

你需要生成一个结构化的训练计划，包含：
1. 计划名称
2. 训练周期（几天一循环）
3. 每天的训练动作列表
4. 每个动作的组数、次数、目标重量、休息时间

请始终以JSON格式返回训练计划，格式如下：
{
  "name": "计划名称",
  "goal": "训练目标",
  "cycleDays": 5,
  "exercises": [
    {
      "dayNumber": 1,
      "exerciseName": "动作名称",
      "sets": 4,
      "reps": 8,
      "targetWeight": 0,
      "restTime": 90,
      "sortOrder": 0,
      "notes": ""
    }
  ]
}

重要规则：
- 动作名称使用中文（如"卧推"、"深蹲"、"引体向上"等）
- 组数范围3-5组，次数范围6-15次
- 休息时间60-120秒
- 每个训练日包含4-6个动作
- 计划应科学合理，符合增肌/减脂的基本原理
- 每次回复都先进行简短的文字说明，然后提供JSON格式的计划`;

export function buildUserContext(user: UserProfile): string {
  return `用户信息：
年龄：${user.nickname ? '已设置' : '未设置'}
身高：${user.height}cm
体重：${user.weight}kg
训练经验：${user.trainingExperience}
目标：${user.goal}
每周训练：${user.weeklyFrequency}天`;
}

export function buildPlanPrompt(user: UserProfile, customRequest?: string): string {
  const base = buildUserContext(user);
  if (customRequest) {
    return `${base}\n\n用户额外要求：${customRequest}\n\n请根据以上信息和用户要求，生成一个训练计划。`;
  }
  return `${base}\n\n请根据以上信息，生成一个适合我的训练计划。`;
}

export function buildEditPrompt(
  user: UserProfile,
  currentPlan: object,
  editRequest: string
): string {
  return `${buildUserContext(user)}

当前训练计划：
${JSON.stringify(currentPlan, null, 2)}

修改要求：${editRequest}

请根据修改要求调整训练计划，并返回完整的修改后计划JSON。`;
}

// Local fallback: generate a basic plan without API
export function generateLocalPlan(user: UserProfile): AIChatMessage['planData'] {
  const exercises = getDefaultExercises(user);
  return {
    userId: user.id,
    name: user.goal === '增肌' ? '增肌训练计划' :
          user.goal === '减脂' ? '减脂训练计划' :
          user.goal === '力量提升' ? '力量提升计划' : '运动表现计划',
    goal: user.goal,
    cycleDays: user.weeklyFrequency,
    isActive: true,
    exercises,
  };
}

function getDefaultExercises(user: UserProfile) {
  const isBulking = user.goal === '增肌' || user.goal === '力量提升';
  const exercises = [];

  // Day 1: Chest + Shoulders + Triceps
  exercises.push(
    { dayNumber: 1, exerciseName: '卧推', sets: 4, reps: isBulking ? 8 : 12, targetWeight: 0, restTime: 90, sortOrder: 0, notes: '' },
    { dayNumber: 1, exerciseName: '上斜卧推', sets: 4, reps: 10, targetWeight: 0, restTime: 90, sortOrder: 1, notes: '' },
    { dayNumber: 1, exerciseName: '绳索夹胸', sets: 4, reps: 12, targetWeight: 0, restTime: 60, sortOrder: 2, notes: '' },
    { dayNumber: 1, exerciseName: '肩推', sets: 4, reps: 10, targetWeight: 0, restTime: 90, sortOrder: 3, notes: '' },
    { dayNumber: 1, exerciseName: '侧平举', sets: 3, reps: 15, targetWeight: 0, restTime: 60, sortOrder: 4, notes: '' },
    { dayNumber: 1, exerciseName: '绳索下拉', sets: 3, reps: 12, targetWeight: 0, restTime: 60, sortOrder: 5, notes: '' },
  );

  // Day 2: Back + Biceps
  exercises.push(
    { dayNumber: 2, exerciseName: '引体向上', sets: 4, reps: isBulking ? 8 : 10, targetWeight: 0, restTime: 90, sortOrder: 0, notes: '' },
    { dayNumber: 2, exerciseName: '杠铃划船', sets: 4, reps: 10, targetWeight: 0, restTime: 90, sortOrder: 1, notes: '' },
    { dayNumber: 2, exerciseName: '高位下拉', sets: 4, reps: 10, targetWeight: 0, restTime: 90, sortOrder: 2, notes: '' },
    { dayNumber: 2, exerciseName: '坐姿划船', sets: 3, reps: 12, targetWeight: 0, restTime: 60, sortOrder: 3, notes: '' },
    { dayNumber: 2, exerciseName: '杠铃弯举', sets: 3, reps: 12, targetWeight: 0, restTime: 60, sortOrder: 4, notes: '' },
  );

  // Day 3: Legs
  exercises.push(
    { dayNumber: 3, exerciseName: '深蹲', sets: 5, reps: isBulking ? 8 : 12, targetWeight: 0, restTime: 120, sortOrder: 0, notes: '' },
    { dayNumber: 3, exerciseName: '硬拉', sets: 4, reps: 8, targetWeight: 0, restTime: 120, sortOrder: 1, notes: '' },
    { dayNumber: 3, exerciseName: '腿举', sets: 4, reps: 10, targetWeight: 0, restTime: 90, sortOrder: 2, notes: '' },
    { dayNumber: 3, exerciseName: '腿弯举', sets: 3, reps: 12, targetWeight: 0, restTime: 60, sortOrder: 3, notes: '' },
    { dayNumber: 3, exerciseName: '提踵', sets: 4, reps: 15, targetWeight: 0, restTime: 60, sortOrder: 4, notes: '' },
  );

  // Additional days for 4-5 day splits
  if (user.weeklyFrequency >= 4) {
    exercises.push(
      { dayNumber: 4, exerciseName: '哑铃飞鸟', sets: 4, reps: 12, targetWeight: 0, restTime: 60, sortOrder: 0, notes: '' },
      { dayNumber: 4, exerciseName: '面拉', sets: 3, reps: 15, targetWeight: 0, restTime: 60, sortOrder: 1, notes: '' },
      { dayNumber: 4, exerciseName: '臂屈伸', sets: 3, reps: 12, targetWeight: 0, restTime: 60, sortOrder: 2, notes: '' },
      { dayNumber: 4, exerciseName: '锤式弯举', sets: 3, reps: 12, targetWeight: 0, restTime: 60, sortOrder: 3, notes: '' },
      { dayNumber: 4, exerciseName: '腹肌训练', sets: 3, reps: 20, targetWeight: 0, restTime: 60, sortOrder: 4, notes: '' },
    );
  }

  if (user.weeklyFrequency >= 5) {
    exercises.push(
      { dayNumber: 5, exerciseName: '哑铃卧推', sets: 4, reps: 10, targetWeight: 0, restTime: 90, sortOrder: 0, notes: '' },
      { dayNumber: 5, exerciseName: 'T杠划船', sets: 4, reps: 10, targetWeight: 0, restTime: 90, sortOrder: 1, notes: '' },
      { dayNumber: 5, exerciseName: '前平举', sets: 3, reps: 12, targetWeight: 0, restTime: 60, sortOrder: 2, notes: '' },
      { dayNumber: 5, exerciseName: '集中弯举', sets: 3, reps: 12, targetWeight: 0, restTime: 60, sortOrder: 3, notes: '' },
      { dayNumber: 5, exerciseName: '拉伸放松', sets: 1, reps: 1, targetWeight: 0, restTime: 300, sortOrder: 4, notes: '全身拉伸5分钟' },
    );
  }

  return exercises;
}
