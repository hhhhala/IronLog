import { useEffect, useState } from 'react';
import { db } from '@/db/local-db';
import { calculateStreak } from '@/utils/streak';
import type { TrainingRecord, GrowthLog } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';

export default function DataCenter() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [growthLogs, setGrowthLogs] = useState<GrowthLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const recs = await db.records.orderBy('date').toArray();
      const growth = await db.growthLogs.orderBy('date').toArray();
      setRecords(recs);
      setGrowthLogs(growth);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalDays = [...new Set(records.map((r) => r.date))].length;
  const totalDuration = records.reduce((sum, r) => sum + r.totalDuration, 0);
  const totalGrowth = growthLogs.reduce((sum, g) => sum + g.points, 0);
  const totalCalories = records.reduce((sum, r) => sum + r.estimatedCalories, 0);
  const { currentStreak, longestStreak } = calculateStreak(records);

  // Weekly frequency data
  const weekMap: Record<string, { count: number; duration: number }> = {};
  records.forEach((r) => {
    const d = new Date(r.date);
    const monday = new Date(d);
    monday.setDate(d.getDate() - d.getDay() + 1);
    const key = monday.toISOString().slice(0, 10);
    if (!weekMap[key]) weekMap[key] = { count: 0, duration: 0 };
    weekMap[key].count++;
    weekMap[key].duration += r.totalDuration;
  });
  const freqData = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, data]) => ({
      week: week.slice(5),
      count: data.count,
      duration: Math.round(data.duration / 60),
    }));

  // Volume trend
  const volumeData = records.slice(-20).map((r) => ({
    date: r.date.slice(5),
    volume: Math.round(r.totalVolume),
    calories: r.estimatedCalories,
  }));

  return (
    <div className="px-5 py-6">
      <h1 className="text-2xl font-bold text-white mb-5">数据中心</h1>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-gray-400 text-xs">总训练天数</p>
          <p className="text-white text-2xl font-bold mt-1">{totalDays}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-gray-400 text-xs">总时长</p>
          <p className="text-white text-2xl font-bold mt-1">{Math.round(totalDuration / 60)}分</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-gray-400 text-xs">总成长值</p>
          <p className="text-amber-400 text-2xl font-bold mt-1">{totalGrowth}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-gray-400 text-xs">总消耗热量</p>
          <p className="text-white text-2xl font-bold mt-1">{totalCalories}kcal</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-gray-400 text-xs">当前连续</p>
          <p className="text-white text-2xl font-bold mt-1">{currentStreak}天</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-gray-400 text-xs">最长连续</p>
          <p className="text-white text-2xl font-bold mt-1">{longestStreak}天</p>
        </div>
      </div>

      {/* Frequency Chart */}
      <div className="bg-[#1a1a1a] rounded-2xl p-4 mb-4">
        <h3 className="text-white font-semibold mb-4">训练频率趋势（周）</h3>
        {freqData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={freqData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="week" stroke="#666" fontSize={11} />
              <YAxis stroke="#666" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="训练次数" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-10 text-sm">还没有训练数据</p>
        )}
      </div>

      {/* Volume Trend */}
      <div className="bg-[#1a1a1a] rounded-2xl p-4">
        <h3 className="text-white font-semibold mb-4">训练容量趋势</h3>
        {volumeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#666" fontSize={11} />
              <YAxis stroke="#666" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="volume" stroke="#f59e0b" strokeWidth={2} name="容量(kg)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-10 text-sm">还没有训练数据</p>
        )}
      </div>
    </div>
  );
}
