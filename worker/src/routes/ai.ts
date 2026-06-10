import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_API_URL: string;
};

const router = new Hono<{ Bindings: Bindings }>();

const SYSTEM_PROMPT = `你是一个友好的健身教练AI助手，名为IronLog Coach。

日常聊天、回答健身问题 → 用中文友好回复，自然亲切。

当用户要求生成训练计划时，务必先文字说明解释计划思路，然后在末尾附上严格的JSON格式计划，方便App自动保存。

JSON格式必须如下，不要加任何额外字段：
{
  "name": "计划名称",
  "goal": "训练目标",
  "cycleDays": 1,
  "exercises": [
    {
      "dayNumber": 1,
      "exerciseName": "动作名称",
      "sets": 4,
      "reps": 10,
      "targetWeight": 0,
      "restTime": 90,
      "sortOrder": 0,
      "notes": "要点说明"
    }
  ]
}

规则：
- dayNumber从1开始，同一天的动作用相同dayNumber
- exerciseName用中文
- 组数3-5组，次数6-15次
- 休息60-120秒
- 每个训练日4-8个动作
- 必须记住用户说的限制条件（如"在家"、"徒手"、"有伤"），体现在targetWeight=0和notes中`;

router.post('/chat', async (c) => {
  const body = await c.req.json();
  const { messages, userProfile, apiKey: requestApiKey } = body;

  if (!messages || !Array.isArray(messages)) {
    return c.json({ success: false, error: 'messages array required' }, 400);
  }

  // Use API key from request first, then fall back to env var
  const apiKey = (requestApiKey && requestApiKey.length > 5) ? requestApiKey : c.env.DEEPSEEK_API_KEY;
  const apiUrl = c.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';

  // If no API key at all, let the client fall back to local mode
  if (!apiKey || apiKey.length < 5) {
    return c.json({
      success: false,
      error: 'NO_API_KEY',
    });
  }

  try {
    // 总是带上用户资料帮助AI，移除繁琐的模式切换
    const userMessages = messages.filter((m: { role: string }) => m.role !== 'system');
    if (userProfile) {
      const profileText = `用户资料：身高${userProfile.height}cm 体重${userProfile.weight}kg 目标${userProfile.goal} 经验${userProfile.trainingExperience} 每周${userProfile.weeklyFrequency}天`;
      const last = userMessages.length - 1;
      if (last >= 0) {
        userMessages[last] = {
          ...userMessages[last],
          content: `${profileText}\n\n${userMessages[last]?.content || ''}`,
        };
      }
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...userMessages,
        ],
        temperature: 0.8,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('DeepSeek API error:', response.status, errText);
      return c.json({
        success: false,
        error: `AI API error: ${response.status}`,
      }, 502);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return c.json({ success: true, data: { content } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('DeepSeek API exception:', message);
    return c.json({ success: false, error: message }, 502);
  }
});

export default router;
