import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/stores/user-store';
import { usePlanStore } from '@/stores/plan-store';
import { db } from '@/db/local-db';
import { showToast } from '@/components/shared/Toast';
import type { AIChatMessage, TrainingPlan, ChatSession } from '@/types';

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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasApiKey = apiKey.trim().length > 10;

  useEffect(() => { loadUser(); loadSessions(); }, [loadUser]);

  useEffect(() => {
    if (user) setApiKey(user.deepseekApiKey || '');
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function loadSessions() {
    const all = await db.chatSessions.orderBy('updatedAt').reverse().toArray();
    setSessions(all);
    if (all.length > 0) {
      setActiveSessionId(all[0].id!);
      setMessages(JSON.parse(all[0].messages || '[]'));
    }
  }

  async function saveCurrentSession(msgs: AIChatMessage[], sessionId?: number | null) {
    const id = sessionId ?? activeSessionId;
    if (!id) return;
    const title = msgs.find(m => m.role === 'user')?.content.slice(0, 30) || '新对话';
    await db.chatSessions.update(id, {
      title,
      messages: JSON.stringify(msgs),
      updatedAt: new Date().toISOString(),
    });
    // Refresh session list
    const all = await db.chatSessions.orderBy('updatedAt').reverse().toArray();
    setSessions(all);
  }

  async function createNewSession() {
    const id = await db.chatSessions.add({
      title: '新对话',
      messages: '[]',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setActiveSessionId(id);
    setMessages([]);
    setCurrentPlan(null);
    setShowSidebar(false);
  }

  async function switchSession(session: ChatSession) {
    // Save current session first
    if (activeSessionId && messages.length > 0) {
      await saveCurrentSession(messages, activeSessionId);
    }
    setActiveSessionId(session.id!);
    setMessages(JSON.parse(session.messages || '[]'));
    setCurrentPlan(null);
    setShowSidebar(false);
  }

  async function deleteSession(id: number) {
    await db.chatSessions.delete(id);
    if (activeSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      if (remaining.length > 0) {
        switchSession(remaining[0]);
      } else {
        await createNewSession();
      }
    }
    await loadSessions();
  }

  async function saveApiKey(key: string) {
    if (!user) return;
    const updated = { ...user, deepseekApiKey: key.trim(), updatedAt: new Date().toISOString() };
    await db.users.put(updated);
    useUserStore.getState().setUser(updated);
    setApiKey(key.trim());
  }

  // 通过 Worker 代理调用 DeepSeek API（唯一路径）
  async function callAI(prompt: string): Promise<string> {
    const API_BASE = import.meta.env.VITE_API_URL || '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          userProfile: user,
          apiKey: apiKey.trim(),
        }),
        signal: controller.signal,
      });

      const data = await res.json() as { success: boolean; data?: { content?: string }; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(data?.error || `请求失败 (${res.status})`);
      }
      if (!data.data?.content) throw new Error('AI 返回内容为空');
      return data.data.content;
    } finally {
      clearTimeout(timeout);
    }
  }

  function buildPrompt(userText: string): string {
    const profileInfo = `用户资料：身高${user?.height}cm 体重${user?.weight}kg 目标${user?.goal} 经验${user?.trainingExperience} 每周${user?.weeklyFrequency}天`;
    const isPlanRequest = /计划|训练|生成|创建|增肌|减脂|动作|组|次|修改|改成|增加|删除/.test(userText);
    if (isPlanRequest) {
      return `你是专业健身教练。${profileInfo}\n\n用户说："${userText}"\n\n请生成训练计划。用JSON格式：{"name":"计划名","goal":"目标","cycleDays":5,"exercises":[{"dayNumber":1,"exerciseName":"动作","sets":4,"reps":8,"targetWeight":0,"restTime":90,"sortOrder":0,"notes":""}]}\n\n先文字说明再JSON。`;
    }
    return `你是健身教练AI，叫IronLog Coach。${profileInfo}\n\n用户说："${userText}"\n\n用中文友好回复。`;
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

  async function handleSend() {
    const text = input.trim();
    if (!text || !user) return;

    const userMsg: AIChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);

    // Auto-create session if none active
    let sid = activeSessionId;
    if (!sid) {
      sid = await db.chatSessions.add({
        title: text.slice(0, 30),
        messages: '[]',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setActiveSessionId(sid);
      setSessions(await db.chatSessions.orderBy('updatedAt').reverse().toArray());
    }

    setInput('');
    setLoading(true);

    try {
      const prompt = buildPrompt(text);

      if (!hasApiKey) {
        setMessages([...newMsgs, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '🔑 请先设置 DeepSeek API Key\n\n点击右上角 🔑 按钮，输入你的 DeepSeek API Key 后才能使用 AI 教练。\n\n（可在 https://platform.deepseek.com 获取）',
          timestamp: Date.now(),
        }]);
        await saveCurrentSession([...newMsgs, { id: (Date.now() + 1).toString(), role: 'assistant', content: '', timestamp: Date.now() }], sid);
        return;
      }

      let content: string;
      try {
        content = await callAI(prompt);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : '未知错误';
        setMessages([...newMsgs, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ AI 连接失败\n\n${errMsg}\n\n请检查：\n1. DeepSeek API Key 是否正确\n2. 网络连接是否正常\n3. Worker 服务是否已部署`,
          timestamp: Date.now(),
        }]);
        await saveCurrentSession(newMsgs, sid);
        return;
      }

      const plan = parsePlanFromResponse(content);
      const display = plan
        ? `🤖 AI 教练\n\n${formatPlan(plan)}`
        : content.length > 1000 ? content.slice(0, 1000) + '...' : content;

      const aiMsg: AIChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: display, planData: plan, timestamp: Date.now() };
      const finalMsgs = [...newMsgs, aiMsg];
      setMessages(finalMsgs);
      if (plan) setCurrentPlan(plan);
      await saveCurrentSession(finalMsgs, sid);
    } finally {
      setLoading(false);
    }
  }

  function formatPlan(plan: TrainingPlan): string {
    const days = [...new Set((plan.exercises || []).map(e => e.dayNumber))].sort();
    let t = `📋 **${plan.name}** | ${plan.goal} | ${plan.cycleDays}天\n\n`;
    for (const d of days.slice(0, 3)) {
      t += `**第${d}天**\n`;
      (plan.exercises || []).filter(e => e.dayNumber === d).slice(0, 5).forEach((ex, i) => {
        t += `  ${i + 1}. ${ex.exerciseName} ${ex.sets}×${ex.reps}\n`;
      });
    }
    return t;
  }

  async function handleSavePlan() {
    if (!currentPlan) return;
    const id = await savePlan(currentPlan);
    await loadPlans();
    showToast('计划已保存', 'success');
    navigate(`/plans/${id}`);
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar(!showSidebar)} className="text-gray-400 text-xl p-1">☰</button>
            <h1 className="text-lg font-bold text-white">AI 教练</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowApiInput(!showApiInput)}
              className={`text-xs px-3 py-1 rounded-lg ${hasApiKey ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
              {hasApiKey ? '🔗' : '🔑'}
            </button>
            {currentPlan && (
              <button onClick={handleSavePlan} className="bg-amber-500 text-black text-xs px-3 py-1 rounded-lg font-semibold">
                💾 保存计划
              </button>
            )}
            <button onClick={createNewSession} className="text-gray-400 text-xl p-1">+</button>
          </div>
        </div>
        {showApiInput && (
          <div className="flex gap-2">
            <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..." className="flex-1 bg-[#252525] text-white text-xs rounded-lg px-3 py-2 border border-gray-700 font-mono" />
            <button onClick={async () => { await saveApiKey(apiKey); setShowApiInput(false); showToast('已保存', 'success'); }}
              className="bg-amber-500 text-black text-xs px-3 py-2 rounded-lg">保存</button>
          </div>
        )}
        <p className={`text-xs ${hasApiKey ? 'text-green-400' : 'text-gray-500'}`}>
          {hasApiKey ? '🔗 远程模式' : '📦 本地模式'}
          {sessions.length > 0 && ` | ${sessions.length}个会话`}
        </p>
      </div>

      {/* Sidebar overlay */}
      {showSidebar && (
        <div className="absolute inset-0 z-30 flex" style={{ top: 0 }}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSidebar(false)} />
          <div className="relative w-72 bg-[#111] h-full overflow-y-auto animate-slide-up z-40" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-white font-semibold">历史记录</h2>
            </div>
            <button onClick={createNewSession}
              className="w-full text-left px-4 py-3 text-amber-400 text-sm border-b border-gray-800 hover:bg-[#1a1a1a]">
              + 新对话
            </button>
            {sessions.map(s => (
              <div key={s.id}
                onClick={() => switchSession(s)}
                className={`flex items-center justify-between px-4 py-3 text-sm border-b border-gray-800/50 cursor-pointer hover:bg-[#1a1a1a] ${s.id === activeSessionId ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : ''}`}>
                <span className={`truncate flex-1 ${s.id === activeSessionId ? 'text-amber-400' : 'text-gray-300'}`}>
                  {s.title}
                </span>
                <button onClick={e => { e.stopPropagation(); deleteSession(s.id!); }}
                  className="text-gray-600 hover:text-red-400 ml-2 text-xs">✕</button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-gray-600 text-xs text-center py-8">暂无历史记录</p>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scroll-area">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🤖</p>
            <p className="text-gray-400 text-sm">IronLog AI 教练</p>
            <p className="text-gray-600 text-xs mt-2">说"生成增肌计划"开始</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-amber-500 text-black' : 'bg-[#1a1a1a] text-white'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#1a1a1a] rounded-2xl px-4 py-3">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
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
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="和AI教练聊天..."
            className="flex-1 bg-[#1a1a1a] text-white rounded-xl px-4 py-3 text-sm border border-gray-800 focus:border-amber-500 focus:outline-none" />
          <button onClick={handleSend} disabled={loading || !input.trim()}
            className="bg-amber-500 text-black rounded-xl px-4 py-3 font-semibold text-sm active:scale-95 disabled:opacity-40">
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
