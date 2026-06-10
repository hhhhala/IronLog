import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_API_URL: string;
};

const router = new Hono<{ Bindings: Bindings }>();

const PLAN_PROMPT = `你是一个专业的健身教练AI助手，名为IronLog Coach。根据用户的身体数据和训练目标，生成科学的训练计划。

请按以下JSON格式返回训练计划：
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
- 先简短文字说明，然后提供JSON格式的计划`;

const CHAT_PROMPT = `你是一个友好的健身教练AI助手，名为IronLog Coach。你的职责是回答健身相关问题、提供训练建议，以及与用户日常聊天。

回复要求：
- 用中文友好回复
- 语气亲切自然，像个真实的教练
- 如果用户问健身相关问题，给出专业建议
- 如果用户闲聊，就正常聊天
- 不需要输出JSON，除非用户明确要求生成计划`;

router.post('/chat', async (c) => {
  const body = await c.req.json();
  const { messages, userProfile, apiKey: requestApiKey, isPlanRequest } = body;

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
    // Build messages: filter out frontend system messages, add profile context for plans
    const userMessages = messages.filter((m: { role: string }) => m.role !== 'system');
    if (isPlanRequest && userProfile) {
      const profileText = `用户资料：身高${userProfile.height}cm 体重${userProfile.weight}kg 目标${userProfile.goal} 经验${userProfile.trainingExperience} 每周${userProfile.weeklyFrequency}天`;
      const last = userMessages.length - 1;
      if (last >= 0) {
        userMessages[last] = {
          ...userMessages[last],
          content: `${profileText}\n\n用户说："${userMessages[last]?.content || ''}"`,
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
          { role: 'system', content: isPlanRequest ? PLAN_PROMPT : CHAT_PROMPT },
          ...userMessages,
        ],
        temperature: isPlanRequest ? 0.7 : 0.9,
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
