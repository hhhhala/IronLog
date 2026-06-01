import { useEffect, useState } from 'react';
import { db } from '@/db/local-db';
import { calculateStreak } from '@/utils/streak';
import type { TrainingRecord } from '@/types';
import BottomSheet from '@/components/shared/BottomSheet';

export default function CalendarPage() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<TrainingRecord[]>([]);

  useEffect(() => {
    db.records.orderBy('date').toArray().then(setRecords);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  const trainingDates = new Set(records.map((r) => r.date));
  const { currentStreak, todayTrained } = calculateStreak(records);

  function goToPrevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }
  function goToNextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function handleDateClick(dateStr: string) {
    setSelectedDate(dateStr);
    const dayRecords = records.filter((r) => r.date === dateStr);
    setSelectedRecords(dayRecords);
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    return `${m}分钟`;
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="px-5 py-6">
      <h1 className="text-2xl font-bold text-white mb-1">训练日历</h1>

      {/* Streak */}
      <div className="flex items-center gap-3 my-3">
        <div className="bg-amber-500/20 text-amber-400 text-sm px-3 py-1 rounded-full">
          🔥 连续训练 {currentStreak} 天
        </div>
        {todayTrained && (
          <div className="bg-green-500/20 text-green-400 text-sm px-3 py-1 rounded-full">
            ✓ 今日已训练
          </div>
        )}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={goToPrevMonth} className="text-gray-400 text-xl px-3 py-1">‹</button>
        <h2 className="text-white font-semibold text-lg">
          {year}年{month + 1}月
        </h2>
        <button onClick={goToNextMonth} className="text-gray-400 text-xl px-3 py-1">›</button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-[#1a1a1a] rounded-2xl p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-3">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-gray-500 text-xs py-1">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-y-2">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const trained = trainingDates.has(dateStr);
            const isToday = dateStr === today;

            return (
              <div
                key={day}
                onClick={() => trained && handleDateClick(dateStr)}
                className="flex flex-col items-center py-1"
              >
                <div
                  className={`
                    w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors
                    ${trained ? 'cursor-pointer active:scale-90' : ''}
                    ${isToday ? 'bg-amber-500 text-black font-bold' : ''}
                    ${trained && !isToday ? 'bg-green-500/30 text-green-400' : ''}
                    ${!trained && !isToday ? 'text-gray-400' : ''}
                  `}
                >
                  {day}
                </div>
                {trained && (
                  <span className="text-[10px] mt-0.5 text-green-500">✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500/30" />
          <span className="text-gray-500 text-xs">已训练</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-700" />
          <span className="text-gray-500 text-xs">未训练</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-gray-500 text-xs">今天</span>
        </div>
      </div>

      {/* Date Detail Sheet */}
      <BottomSheet
        open={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate || ''}
        height="50vh"
      >
        {selectedRecords.length > 0 ? (
          <div className="space-y-3">
            {selectedRecords.map((r) => (
              <div key={r.id} className="bg-[#252525] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-medium">
                    {formatDuration(r.totalDuration)}
                  </span>
                  <span className="text-amber-400 text-sm">+{r.growthPoints}成长值</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {r.exercises?.slice(0, 5).map((ex, i) => (
                    <span key={i} className="text-gray-400 text-xs bg-gray-800 px-2 py-0.5 rounded">
                      {ex.exerciseName}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">当天无训练记录</p>
        )}
      </BottomSheet>
    </div>
  );
}
