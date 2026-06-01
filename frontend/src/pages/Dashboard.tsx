import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/stores/user-store';
import { usePlanStore } from '@/stores/plan-store';
import { db } from '@/db/local-db';
import { calculateStreak, todayStr } from '@/utils/streak';
import type { GrowthLog } from '@/types';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loadUser, loading } = useUserStore();
  const { activePlan, loadActivePlan } = usePlanStore();
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, todayTrained: false });
  const [totalGrowth, setTotalGrowth] = useState(0);
  const [weekRecords, setWeekRecords] = useState(0);
  const [todayRecord, setTodayRecord] = useState<number | null>(null);

  useEffect(() => {
    loadUser();
    loadActivePlan();
  }, [loadUser, loadActivePlan]);

  useEffect(() => {
    async function loadStats() {
      const records = await db.records.toArray();
      const today = todayStr();

      // Check today's record
      const todayRec = records.find((r) => r.date === today);
      if (todayRec?.id) setTodayRecord(todayRec.id);

      // Streak
      const s = calculateStreak(records);
      setStreak(s);

      // Total growth
      const growthLogs = await db.growthLogs.toArray();
      setTotalGrowth(growthLogs.reduce((sum, g: GrowthLog) => sum + g.points, 0));

      // This week records
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startStr = startOfWeek.toISOString().slice(0, 10);
      setWeekRecords(records.filter((r) => r.date >= startStr).length);
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          IronLog <span className="text-amber-500">⚡</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {user?.nickname ? `欢迎回来，${user.nickname}` : '欢迎使用 IronLog'}
        </p>
      </div>

      {/* Streak Banner */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-100 text-xs">连续训练</p>
            <p className="text-white text-3xl font-bold">
              {streak.currentStreak} <span className="text-lg">天</span>
            </p>
            <p className="text-amber-100 text-xs mt-1">最长 {streak.longestStreak} 天</p>
          </div>
          <div className="text-5xl">{streak.currentStreak >= 3 ? '🔥' : '💪'}</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-gray-400 text-xs">成长值</p>
          <p className="text-white text-2xl font-bold mt-1">{totalGrowth}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-gray-400 text-xs">本周训练</p>
          <p className="text-white text-2xl font-bold mt-1">{weekRecords} 次</p>
        </div>
      </div>

      {/* Today's Plan */}
      <div>
        <h2 className="text-white font-semibold text-lg mb-3">今日训练</h2>
        {activePlan ? (
          <div
            className="bg-[#1a1a1a] rounded-2xl p-4 active:scale-[0.98] transition-transform"
            onClick={() => {
              if (todayRecord) {
                navigate(`/records/${todayRecord}`);
              } else {
                navigate(`/plans/${activePlan.id}`);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{activePlan.name}</p>
                <p className="text-gray-400 text-sm mt-1">
                  {activePlan.cycleDays}天循环 · {activePlan.exercises?.length || 0}个动作
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                <span className="text-black text-lg">
                  {todayRecord ? '📊' : '▶'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
            <p className="text-gray-400 text-sm mb-3">还没有训练计划</p>
            <button
              onClick={() => navigate('/ai-coach')}
              className="bg-amber-500 text-black font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-transform"
            >
              🤖 AI生成计划
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-white font-semibold text-lg mb-3">快捷操作</h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/ai-coach')}
            className="bg-[#1a1a1a] rounded-xl p-3 text-center active:scale-95 transition-transform"
          >
            <span className="text-2xl block mb-1">🤖</span>
            <span className="text-gray-300 text-xs">AI教练</span>
          </button>
          <button
            onClick={() => navigate('/data')}
            className="bg-[#1a1a1a] rounded-xl p-3 text-center active:scale-95 transition-transform"
          >
            <span className="text-2xl block mb-1">📈</span>
            <span className="text-gray-300 text-xs">数据中心</span>
          </button>
          <button
            onClick={() => navigate('/calendar')}
            className="bg-[#1a1a1a] rounded-xl p-3 text-center active:scale-95 transition-transform"
          >
            <span className="text-2xl block mb-1">📅</span>
            <span className="text-gray-300 text-xs">训练日历</span>
          </button>
        </div>
      </div>
    </div>
  );
}
