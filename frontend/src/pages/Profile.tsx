import { useEffect, useState } from 'react';
import { useUserStore } from '@/stores/user-store';
import type { UserProfile } from '@/types';
import { showToast } from '@/components/shared/Toast';
import { db } from '@/db/local-db';

const goalOptions: UserProfile['goal'][] = ['增肌', '减脂', '力量提升', '运动表现'];
const expOptions: UserProfile['trainingExperience'][] = ['新手', '半年', '1年', '2年+'];

export default function Profile() {
  const { user, loadUser, saveUser, loading } = useUserStore();

  // Separate state for each field — no type casting needed
  const [nickname, setNickname] = useState('');
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [goal, setGoal] = useState<UserProfile['goal']>('增肌');
  const [trainingExperience, setTrainingExperience] = useState<UserProfile['trainingExperience']>('新手');
  const [weeklyFrequency, setWeeklyFrequency] = useState(3);
  const [deepseekApiKey, setDeepseekApiKey] = useState('');
  const [timerMode, setTimerMode] = useState<UserProfile['timerMode']>('countup');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
      setHeight(user.height || 170);
      setWeight(user.weight || 70);
      setGoal(user.goal || '增肌');
      setTrainingExperience(user.trainingExperience || '新手');
      setWeeklyFrequency(user.weeklyFrequency || 3);
      setDeepseekApiKey(user.deepseekApiKey || '');
      setTimerMode(user.timerMode || 'countup');
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveUser({
        nickname,
        height,
        weight,
        goal,
        trainingExperience,
        weeklyFrequency,
        deepseekApiKey: deepseekApiKey.trim(),
        timerMode,
      });
      showToast('保存成功', 'success');
    } catch (err) {
      console.error('Save user failed:', err);
      showToast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = {
        users: await db.users.toArray(),
        plans: await db.plans.toArray(),
        planExercises: await db.planExercises.toArray(),
        records: await db.records.toArray(),
        recordExercises: await db.recordExercises.toArray(),
        weightLogs: await db.weightLogs.toArray(),
        growthLogs: await db.growthLogs.toArray(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ironlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('数据导出成功', 'success');
    } catch {
      showToast('导出失败', 'error');
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-5">
      <h1 className="text-2xl font-bold text-white">个人中心</h1>

      {/* Avatar */}
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center text-3xl">
          💪
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Nickname */}
        <div>
          <label className="text-gray-400 text-sm block mb-1.5">昵称</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="输入昵称"
            className="w-full bg-[#1a1a1a] text-white rounded-xl px-4 py-3 text-sm border border-gray-800 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Height & Weight */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-gray-400 text-sm block mb-1.5">身高 (cm)</label>
            <input
              type="number"
              value={height || ''}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full bg-[#1a1a1a] text-white rounded-xl px-4 py-3 text-sm border border-gray-800 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1.5">体重 (kg)</label>
            <input
              type="number"
              value={weight || ''}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full bg-[#1a1a1a] text-white rounded-xl px-4 py-3 text-sm border border-gray-800 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Weekly Frequency */}
        <div>
          <label className="text-gray-400 text-sm block mb-1.5">每周训练天数</label>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => setWeeklyFrequency(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  weeklyFrequency === n
                    ? 'bg-amber-500 text-black'
                    : 'bg-[#1a1a1a] text-gray-300'
                }`}
              >
                {n}天
              </button>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div>
          <label className="text-gray-400 text-sm block mb-1.5">训练目标</label>
          <div className="grid grid-cols-2 gap-2">
            {goalOptions.map((g) => (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  goal === g
                    ? 'bg-amber-500 text-black'
                    : 'bg-[#1a1a1a] text-gray-300'
                }`}
              >
                {g === '增肌' ? '💪 增肌' :
                 g === '减脂' ? '🔥 减脂' :
                 g === '力量提升' ? '🏋️ 力量提升' :
                 '⚡ 运动表现'}
              </button>
            ))}
          </div>
        </div>

        {/* Experience */}
        <div>
          <label className="text-gray-400 text-sm block mb-1.5">训练经验</label>
          <div className="grid grid-cols-2 gap-2">
            {expOptions.map((e) => (
              <button
                key={e}
                onClick={() => setTrainingExperience(e)}
                className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  trainingExperience === e
                    ? 'bg-amber-500 text-black'
                    : 'bg-[#1a1a1a] text-gray-300'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* DeepSeek API Key */}
        <div>
          <label className="text-gray-400 text-sm block mb-1.5">
            🔑 DeepSeek API Key
            <span className="text-gray-600 ml-1">(可选，用于AI教练)</span>
          </label>
          <input
            type="text"
            value={deepseekApiKey}
            onChange={(e) => setDeepseekApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-[#1a1a1a] text-white rounded-xl px-4 py-3 text-sm border border-gray-800 focus:border-amber-500 focus:outline-none font-mono"
          />
          <p className="text-gray-600 text-xs mt-1">在 platform.deepseek.com 获取 Key，留空则AI使用本地模式</p>
        </div>

        {/* Timer Mode */}
        <div>
          <label className="text-gray-400 text-sm block mb-1.5">⏱️ 休息计时模式</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTimerMode('countup')}
              className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                timerMode === 'countup'
                  ? 'bg-amber-500 text-black'
                  : 'bg-[#1a1a1a] text-gray-300'
              }`}
            >
              ⬆ 正计时（默认）
            </button>
            <button
              onClick={() => setTimerMode('countdown')}
              className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                timerMode === 'countdown'
                  ? 'bg-amber-500 text-black'
                  : 'bg-[#1a1a1a] text-gray-300'
              }`}
            >
              ⬇ 倒计时
            </button>
          </div>
          <p className="text-gray-600 text-xs mt-1">正计时：显示已休息时长 | 倒计时：归零震动提醒</p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-amber-500 text-black font-semibold py-3 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存资料'}
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          className="w-full bg-[#1a1a1a] text-gray-300 font-medium py-3 rounded-xl active:scale-[0.98] transition-transform"
        >
          📦 导出数据备份
        </button>
      </div>
    </div>
  );
}
