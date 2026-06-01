import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/stores/user-store';
import { usePlanStore } from '@/stores/plan-store';
import { db } from '@/db/local-db';
import { generateLocalPlan } from '@/services/ai';
import { showToast } from '@/components/shared/Toast';
import type { AIChatMessage, TrainingPlan } from '@/types';

export default function AICoach() {
  const navigate = useNavigate();
  const { user, loadUser } = useUserStore();
  const { savePlan, loadPlans } = usePlanStore();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasApiKey = apiKey.trim().length > 10;

  useEffect(() => { loadUser(); }, [loadUser]);

  useEffect(() => {
    if (user) {
      setApiKey(user.deepseekApiKey || '');
    }
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function saveApiKey(key: string) {
    if (!user) return;
    const updated = { ...user, deepseekApiKey: key.trim(), updatedAt: new Date().toISOString() };
    await db.users.put(updated);
    useUserStore.getState().setUser(updated);
    setApiKey(key.trim());
  }

  async function handleSaveApiKey() {
    await saveApiKey(apiKey);
    setShowApiInput(false);
    showToast(apiKey.trim().length > 10 ? 'API Key 已保存 ✅' : 'API Key 已清除，使用本地模式', 'success');
  }

  // Real AI call via Worker
  async function callRemoteAI(prompt: string): Promise<string> {
    const API_BASE = import.meta.env.VITE_API_URL || '';
    const res = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: prompt },
        ],
        userProfile: user,
        apiKey: apiKey.trim(),
      }),
    });
    if (!res.ok) throw new Error('API call failed');
    const data = await res.json() as { success: boolean; data?: { content?: string }; error?: string };
    if (!data.success || !data.data?.content) throw new Error(data.error || 'No content');
    return data.data.content;
  }

  function buildPrompt(userText: string): string {
    const profileInfo = `用户资料：身高${user?.height}cm 体重${user?.weight}kg 目标${user?.goal} 经验${user?.trainingExperience} 每周${user?.weeklyFrequency}天`;

    // Detect if user is asking to generate/modify a plan
    const isPlanRequest = /计划|训练|生成|创建|增肌|减脂|动作|组|次|修改|改成|增加|删除/.test(userText);

    if (isPlanRequest) {
      return `你是一个专业健身教练。${profileInfo}

用户说："${userText}"

请根据用户的身体数据和需求，生成或修改训练计划。用以下JSON格式返回：
{"name":"计划名","goal":"目标","cycleDays":5,"exercises":[{"dayNumber":1,"exerciseName":"动作名","sets":4,"reps":8,"targetWeight":0,"restTime":90,"sortOrder":0,"notes":""}]}

先简短说明，再给出JSON。动作名用中文。`;
    }

    // Casual conversation
    return `你是一个专业健身教练AI助手，叫IronLog Coach。${profileInfo}

用户说："${userText}"

请用中文友好地回答。如果用户只是打招呼或闲聊，正常回复。如果用户问健身相关问题，给出专业建议。`;
  }

  function parsePlanFromResponse(content: string): TrainingPlan | null {
    try {
      const jsonMatch = content.match(/\{[\s\S]*"exercises"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          userId: user!.id,
          name: parsed.name || 'AI训练计划',
          goal: parsed.goal || user!.goal,
          cycleDays: parsed.cycleDays || user!.weeklyFrequency,
          isActive: true,
          exercises: (parsed.exercises || []).map((ex: Record<string, unknown>, i: number) => ({
            dayNumber: (ex.dayNumber as number) || 1,
            exerciseName: ex.exerciseName as string,
            sets: ex.sets as number,
            reps: ex.reps as number,
            targetWeight: (ex.targetWeight as number) || 0,
            restTime: (ex.restTime as number) || 90,
            sortOrder: (ex.sortOrder as number) ?? i,
            notes: (ex.notes as string) || '',
          })),
        };
      }
    } catch { /* */ }
    return null;
  }

  function formatPlanPreview(plan: TrainingPlan): string {
    const days = [...new Set((plan.exercises || []).map((e) => e.dayNumber))].sort();
    let text = `📋 **${plan.name}** | ${plan.goal} | ${plan.cycleDays}天循环\n\n`;
    for (const day of days.slice(0, 3)) {
      text += `**第${day}天**\n`;
      (plan.exercises || []).filter(e => e.dayNumber === day).slice(0, 5).forEach((ex, i) => {
        text += `  ${i + 1}. ${ex.exerciseName} ${ex.sets}×${ex.reps}\n`;
      });
    }
    if (days.length > 3) text += `\n...共${days.length}个训练日`;
    return text;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !user) return;

    const userMsg: AIChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const prompt = buildPrompt(text);
      let content: string;
      let remote = false;

      if (hasApiKey) {
        try {
          content = await callRemoteAI(prompt);
          remote = true;
        } catch {
          // Fallback to local
          const localPlan = generateLocalPlan(user);
          content = `⚠️ 远程AI调用失败，使用本地生成：\n\n${JSON.stringify(localPlan, null, 2)}`;
        }
      } else {
        const localPlan = generateLocalPlan(user);
        content = `📦 本地模式（未配置API Key）\n\n${JSON.stringify(localPlan, null, 2)}`;
      }

      const plan = parsePlanFromResponse(content);
      let displayContent: string;

      if (plan) {
        displayContent = (remote ? '🔗 远程AI生成\n\n' : '📦 本地生成\n\n') + formatPlanPreview(plan);
        displayContent += '\n点击右上角 💾保存计划 即可使用。';
      } else {
        // No plan found — show raw AI response (for casual chat)
        displayContent = content.length > 1000 ? content.slice(0, 1000) + '...' : content;
        if (remote) displayContent = '🔗 ' + displayContent;
      }

      const aiMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: displayContent,
        planData: plan,
        timestamp: Date.now(),
      };

      if (plan) setCurrentPlan(plan);
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，出错了，请重试。',
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePlan() {
    if (!currentPlan) return;
    const id = await savePlan(currentPlan);
    await loadPlans();
    showToast('计划保存成功！', 'success');
    navigate(`/plans/${id}`);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">AI 教练</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowApiInput(!showApiInput)}
              className={`text-xs px-3 py-1 rounded-lg font-medium ${
                hasApiKey ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {hasApiKey ? '🔗 已连接' : '🔑 设置Key'}
            </button>
            {currentPlan && (
              <button
                onClick={handleSavePlan}
                className="bg-amber-500 text-black font-semibold px-3 py-1 rounded-lg text-xs active:scale-95"
              >
                💾 保存计划
              </button>
            )}
          </div>
        </div>

        {/* API Key input */}
        {showApiInput && (
          <div className="flex gap-2">
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-... (DeepSeek API Key)"
              className="flex-1 bg-[#252525] text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-amber-500 focus:outline-none font-mono"
            />
            <button
              onClick={handleSaveApiKey}
              className="bg-amber-500 text-black text-xs px-3 py-2 rounded-lg font-medium"
            >
              保存
            </button>
          </div>
        )}
        <p className={`text-xs ${hasApiKey ? 'text-green-400' : 'text-gray-500'}`}>
          {hasApiKey ? '🔗 远程AI模式' : '📦 本地模式 — 点击右上角设置API Key'}
          {user?.goal ? ` | ${user.goal} | ${user.weeklyFrequency}天/周` : ''}
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scroll-area">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="text-4xl mb-4">🤖</p>
            <p className="text-gray-400 text-sm">我是 IronLog AI 教练</p>
            <p className="text-gray-600 text-xs mt-2">
              直接说你的需求，比如：<br/>
              "给我生成一个增肌计划"<br/>
              "今天练什么好"<br/>
              "我想重点练胸"
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' ? 'bg-amber-500 text-black' : 'bg-[#1a1a1a] text-white'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#1a1a1a] rounded-2xl px-4 py-3">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-800" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={hasApiKey ? '和AI教练聊天...' : '描述你的训练需求...'}
            className="flex-1 bg-[#1a1a1a] text-white rounded-xl px-4 py-3 text-sm border border-gray-800 focus:border-amber-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-amber-500 text-black rounded-xl px-4 py-3 font-semibold text-sm active:scale-95 transition-transform disabled:opacity-40"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
