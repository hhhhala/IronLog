import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_API_URL: string;
};

const router = new Hono<{ Bindings: Bindings }>();

const SYSTEM_PROMPT = `你是一个专业的健身教练AI助手，名为IronLog Coach。你的职责是根据用户的身体数据和训练目标，生成科学的训练计划。

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
- 计划应科学合理
- 每次回复先简短文字说明，然后提供JSON格式的计划`;

router.post('/chat', async (c) => {
  const body = await c.req.json();
  const { messages, userProfile } = body;

  if (!messages || !Array.isArray(messages)) {
    return c.json({ success: false, error: 'messages array required' }, 400);
  }

  const apiKey = c.env.DEEPSEEK_API_KEY;
  const apiUrl = c.env.DEEPSEEK_API_URL;

  // If no API key configured, return a helpful message
  if (!apiKey) {
    return c.json({
      success: true,
      data: {
        content: 'AI服务尚未配置API Key。请在Cloudflare Worker环境变量中设置 DEEPSEEK_API_KEY。\n\n当前可使用本地模式生成计划。',
      },
    });
  }

  try {
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
          ...messages.filter((m: { role: string }) => m.role !== 'system'),
        ],
        temperature: 0.7,
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
