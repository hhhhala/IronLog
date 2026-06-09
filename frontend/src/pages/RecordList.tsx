import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllRecords, deleteRecord } from '@/db/local-db';
import type { TrainingRecord } from '@/types';
import EmptyState from '@/components/shared/EmptyState';
import { showToast } from '@/components/shared/Toast';

export default function RecordList() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    setLoading(true);
    const data = await getAllRecords();
    setRecords(data);
    setLoading(false);
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('确定删除这条训练记录吗？')) return;
    try {
      await deleteRecord(id);
      await loadRecords();
      showToast('记录已删除', 'info');
    } catch (err) {
      console.error('Delete error:', err);
      showToast('删除失败', 'error');
    }
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 py-6">
      <h1 className="text-2xl font-bold text-white mb-5">训练记录</h1>

      {records.length === 0 ? (
        <EmptyState
          icon="📊"
          title="还没有训练记录"
          description="完成一次训练后，记录会出现在这里"
          action={{ label: '开始训练', onClick: () => navigate('/plans') }}
        />
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div
              key={record.id}
              onClick={() => navigate(`/records/${record.id}`)}
              className="bg-[#1a1a1a] rounded-2xl p-4 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold">{record.date}</h3>
                <div className="flex gap-2">
                  <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">
                    +{record.growthPoints}成长值
                  </span>
                  <button
                    onClick={(e) => handleDelete(record.id!, e)}
                    className="text-red-400 text-xs"
                  >
                    🗑
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">时长</p>
                  <p className="text-white">{formatDuration(record.totalDuration)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">容量</p>
                  <p className="text-white">{record.totalVolume.toFixed(0)}kg</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">热量</p>
                  <p className="text-white">{record.estimatedCalories}kcal</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-800">
                <div className="flex flex-wrap gap-1">
                  {record.exercises?.slice(0, 4).map((ex, i) => (
                    <span key={i} className="text-gray-400 text-xs bg-gray-800 px-2 py-0.5 rounded">
                      {ex.exerciseName}
                    </span>
                  ))}
                  {record.exercises && record.exercises.length > 4 && (
                    <span className="text-gray-500 text-xs px-1">+{record.exercises.length - 4}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
