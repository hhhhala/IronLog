import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/stores/user-store';
import { usePlanStore } from '@/stores/plan-store';
import { generateLocalPlan, buildPlanPrompt, buildEditPrompt } from '@/services/ai';
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
  const [usingRemote, setUsingRemote] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (user) {
      const hasApiKey = !!(user.deepseekApiKey && user.deepseekApiKey.trim().length > 5);
      setUsingRemote(hasApiKey);
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: hasApiKey
            ? `你好！我是 IronLog AI 教练 🤖\n\n🔗 **远程AI模式** — 使用 DeepSeek API\n\n我会根据你的个人资料生成科学训练计划：\n• 目标：**${user.goal}**\n• 训练频率：**${user.weeklyFrequency}天/周**\n\n直接告诉我你的需求，比如：\n• "给我生成一个增肌计划"\n• "我想重点练胸和背"\n• "把卧推改成史密斯卧推"`
            : `你好！我是 IronLog AI 教练 🤖\n\n📦 **本地模式** — 未配置 DeepSeek API Key\n\n我会根据你的个人资料生成训练计划：\n• 目标：**${user.goal}**\n• 训练频率：**${user.weeklyFrequency}天/周**\n\n💡 去**个人中心**填写 API Key 即可切换远程 AI 模式（在 deepseek.com 获取）\n\n直接告诉我你的需求，我会用本地算法生成计划：`,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function callDeepSeek(prompt: string): Promise<{ content: string; remote: boolean }> {
    const apiKey = user?.deepseekApiKey?.trim();
    const API_BASE = import.meta.env.VITE_API_URL || '';

    if (apiKey && apiKey.length > 5) {
      try {
        const res = await fetch(`${API_BASE}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'user', content: prompt },
            ],
            userProfile: user,
            apiKey: apiKey,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.content) {
            return { content: data.data.content, remote: true };
          }
        }
      } catch {
        // Fall through to local
      }
    }

    // Local fallback
    const localPlan = generateLocalPlan(user!);
    const planText = JSON.stringify(localPlan, null, 2);
    return { content: planText, remote: false };
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
    } catch { /* parse failed */ }
    return null;
  }

  function formatPlanPreview(plan: TrainingPlan): string {
    const lines: string[] = [];
    lines.push(`📋 **${plan.name}**`);
    lines.push(`目标：${plan.goal} | ${plan.cycleDays}天循环 | ${plan.exercises?.length || 0}个动作`);
    lines.push('');

    const days = [...new Set((plan.exercises || []).map((e) => e.dayNumber))].sort();
    for (const day of days.slice(0, 3)) {
      const dayExs = (plan.exercises || []).filter((e) => e.dayNumber === day);
      lines.push(`**第${day}天**`);
      dayExs.slice(0, 5).forEach((ex, i) => {
        lines.push(`  ${i + 1}. ${ex.exerciseName} — ${ex.sets}组×${ex.reps}次`);
      });
      if (dayExs.length > 5) lines.push(`  ...还有${dayExs.length - 5}个动作`);
      lines.push('');
    }
    if (days.length > 3) lines.push(`...共${days.length}个训练日`);
    return lines.join('\n');
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !user) return;

    const userMsg: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const prompt = currentPlan
        ? buildEditPrompt(user, currentPlan, text)
        : buildPlanPrompt(user, text);

      const { content, remote } = await callDeepSeek(prompt);
      const plan = parsePlanFromResponse(content);

      let aiContent: string;
      if (plan) {
        const planPreview = formatPlanPreview(plan);
        aiContent = remote
          ? `🔗 远程AI生成\n\n${planPreview}\n\n你可以继续修改，或点击右上角**保存计划**。`
          : `📦 本地生成（未使用远程AI）\n\n${planPreview}\n\n💡 去**个人中心**填写 DeepSeek API Key 获取更智能的计划。点击右上角**保存计划**即可使用。`;
      } else {
        aiContent = content.slice(0, 800) + (content.length > 800 ? '...' : '');
      }

      const aiMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        planData: plan,
        timestamp: Date.now(),
      };

      if (plan) setCurrentPlan(plan);
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '抱歉，生成计划时出错了。请重试。',
          timestamp: Date.now(),
        },
      ]);
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
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">AI 教练</h1>
          <p className={`text-xs ${usingRemote ? 'text-green-400' : 'text-amber-400'}`}>
            {usingRemote ? '🔗 远程AI模式 (DeepSeek)' : '📦 本地模式'}
            {user?.goal ? ` | ${user.goal} | ${user.weeklyFrequency}天/周` : ''}
          </p>
        </div>
        {currentPlan && (
          <button
            onClick={handleSavePlan}
            className="bg-amber-500 text-black font-semibold px-4 py-1.5 rounded-lg text-sm active:scale-95 transition-transform"
          >
            💾 保存计划
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scroll-area">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-amber-500 text-black'
                  : 'bg-[#1a1a1a] text-white'
              }`}
            >
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
            placeholder={currentPlan ? '输入修改要求...' : '描述你的训练需求...'}
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
