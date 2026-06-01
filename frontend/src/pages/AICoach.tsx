import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/stores/user-store';
import { usePlanStore } from '@/stores/plan-store';
import { generateLocalPlan, buildPlanPrompt, buildEditPrompt, buildUserContext } from '@/services/ai';
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUser();
    if (user) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `你好！我是 IronLog AI 教练 🤖\n\n我可以根据你的个人信息生成专属训练计划。你目前的目标是**${user.goal}**，每周训练**${user.weeklyFrequency}**天。\n\n你可以直接让我生成计划，也可以告诉我你的特殊需求，比如：\n• "给我生成一个增肌计划"\n• "我想重点练胸和背"\n• "增加一个飞鸟动作"`,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [user, loadUser]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function callDeepSeek(prompt: string): Promise<string> {
    // Try API proxy first
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      if (API_BASE) {
        const res = await fetch(`${API_BASE}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: '你是IronLog健身教练AI' },
              { role: 'user', content: prompt },
            ],
            userProfile: user,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          return data.content || data.data?.content || '';
        }
      }
    } catch {
      // Fall back to local generation
    }

    // Local fallback: generate locally
    return JSON.stringify(generateLocalPlan(user!), null, 2);
  }

  function parsePlanFromResponse(content: string): TrainingPlan | null {
    try {
      // Try to extract JSON
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
    } catch {
      // Parse failed
    }
    return null;
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
      let prompt: string;
      if (currentPlan) {
        prompt = buildEditPrompt(user, currentPlan, text);
      } else {
        prompt = buildPlanPrompt(user, text);
      }

      const response = await callDeepSeek(prompt);
      const plan = parsePlanFromResponse(response);

      const aiMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: plan
          ? `已生成训练计划：**${plan.name}**\n\n${(plan.exercises || [])
              .filter((e) => e.dayNumber === 1)
              .map((e, i) => `${i + 1}. ${e.exerciseName} — ${e.sets}组×${e.reps}次`)
              .join('\n')}\n\n你可以要求修改，或直接保存此计划。`
          : response.slice(0, 500),
        planData: plan,
        timestamp: Date.now(),
      };

      if (plan) setCurrentPlan(plan);
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
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
          <p className="text-gray-400 text-xs">
            {user?.goal ? `目标：${user.goal} | ${user.weeklyFrequency}天/周` : ''}
          </p>
        </div>
        {currentPlan && (
          <button
            onClick={handleSavePlan}
            className="bg-amber-500 text-black font-semibold px-4 py-1.5 rounded-lg text-sm active:scale-95 transition-transform"
          >
            保存计划
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
              {msg.planData && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <p className="text-xs text-amber-400 font-medium">📋 训练计划已生成</p>
                  <div className="mt-2 space-y-1">
                    {msg.planData.exercises
                      ?.filter((e) => e.dayNumber === 1)
                      .slice(0, 5)
                      .map((e, i) => (
                        <p key={i} className="text-xs text-gray-300">
                          {e.exerciseName} {e.sets}×{e.reps}
                        </p>
                      ))}
                    {msg.planData.exercises && msg.planData.exercises.filter((e) => e.dayNumber === 1).length > 5 && (
                      <p className="text-xs text-gray-500">...更多动作</p>
                    )}
                  </div>
                </div>
              )}
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
