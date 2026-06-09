import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, deleteRecord } from '@/db/local-db';
import type { TrainingRecord } from '@/types';
import Modal from '@/components/shared/Modal';
import { showToast } from '@/components/shared/Toast';
import { triggerSync } from '@/services/sync';

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<TrainingRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [editSets, setEditSets] = useState<{ exerciseName: string; setNumber: number; weight: number; reps: number }[]>([]);

  useEffect(() => {
    loadRecord();
  }, [id]);

  async function loadRecord() {
    const r = await db.records.get(Number(id));
    if (!r) return;
    const exercises = await db.recordExercises.where({ recordId: r.id }).toArray();
    setRecord({ ...r, exercises });
  }

  async function handleDelete() {
    if (!record?.id) return;
    if (!confirm('确定删除这条训练记录吗？')) return;
    try {
      await deleteRecord(record.id);
      triggerSync().catch(() => {});
      showToast('记录已删除', 'info');
      navigate('/records', { replace: true });
    } catch (err) {
      console.error('Delete error:', err);
      showToast('删除失败', 'error');
    }
  }

  function startEditing() {
    if (!record) return;
    const recExs = record.exercises || [];
    setEditSets(
      recExs.map((ex) => ({
        exerciseName: ex.exerciseName,
        setNumber: ex.setNumber,
        weight: ex.weight,
        reps: ex.reps,
      }))
    );
    setEditing(true);
  }

  async function saveEdits() {
    if (!record) return;
    const recExs = record.exercises || [];
    const exercises = editSets.map((s, i) => ({
      ...recExs[i],
      ...s,
      recordId: record.id,
    }));

    // Recalculate
    const totalSets = exercises.length;
    const totalReps = exercises.reduce((sum, e) => sum + e.reps, 0);
    const totalVolume = exercises.reduce((sum, e) => sum + e.weight * e.reps, 0);

    const updated = {
      ...record,
      totalSets,
      totalReps,
      totalVolume,
      exercises,
    };

    await db.records.update(record.id!, updated);
    await db.recordExercises.where({ recordId: record.id }).delete();
    for (const ex of exercises) {
      await db.recordExercises.add(ex);
    }
    setRecord(updated);
    setEditing(false);
    showToast('修改已保存', 'success');
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
  }

  if (!record) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-lg">←</button>
        <div>
          <h1 className="text-xl font-bold text-white">{record.date}</h1>
          <p className="text-gray-400 text-xs">训练记录详情</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => (editing ? saveEdits() : startEditing())}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
              editing ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-300'
            }`}
          >
            {editing ? '✓ 保存' : '编辑'}
          </button>
          <button
            onClick={handleDelete}
            className="text-sm px-3 py-1.5 rounded-lg font-medium bg-red-500/10 text-red-400"
          >
            删除
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-gray-400 text-xs">训练时长</p>
          <p className="text-white text-xl font-bold mt-1">{formatDuration(record.totalDuration)}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-gray-400 text-xs">成长值</p>
          <p className="text-amber-400 text-xl font-bold mt-1">+{record.growthPoints}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-gray-400 text-xs">训练容量</p>
          <p className="text-white text-xl font-bold mt-1">{record.totalVolume.toFixed(0)} kg</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl p-4">
          <p className="text-gray-400 text-xs">预估消耗</p>
          <p className="text-white text-xl font-bold mt-1">{record.estimatedCalories} kcal</p>
        </div>
      </div>

      {/* Exercise Breakdown */}
      <div>
        <h2 className="text-white font-semibold mb-3">动作详情</h2>
        <div className="space-y-3">
          {/* Group by exercise */}
          {Object.entries(
            (record.exercises || []).reduce((acc, ex) => {
              if (!acc[ex.exerciseName]) acc[ex.exerciseName] = [];
              acc[ex.exerciseName].push(ex);
              return acc;
            }, {} as Record<string, import('@/types').RecordExercise[]>)
          ).map(([name, sets]) => (
            <div key={name} className="bg-[#1a1a1a] rounded-2xl p-4">
              <h3 className="text-white font-medium mb-2">{name}</h3>
              <div className="space-y-1">
                {sets.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">第{s.setNumber}组</span>
                    {editing ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editSets.find((es) => es.exerciseName === name && es.setNumber === s.setNumber)?.weight || 0}
                          onChange={(e) => {
                            const idx = editSets.findIndex(
                              (es) => es.exerciseName === name && es.setNumber === s.setNumber
                            );
                            if (idx >= 0) {
                              const copy = [...editSets];
                              copy[idx] = { ...copy[idx], weight: Number(e.target.value) };
                              setEditSets(copy);
                            }
                          }}
                          className="w-16 bg-[#252525] text-white text-center rounded-lg px-2 py-1 border border-gray-700"
                        />
                        <span className="text-gray-400 self-center">×</span>
                        <input
                          type="number"
                          value={editSets.find((es) => es.exerciseName === name && es.setNumber === s.setNumber)?.reps || 0}
                          onChange={(e) => {
                            const idx = editSets.findIndex(
                              (es) => es.exerciseName === name && es.setNumber === s.setNumber
                            );
                            if (idx >= 0) {
                              const copy = [...editSets];
                              copy[idx] = { ...copy[idx], reps: Number(e.target.value) };
                              setEditSets(copy);
                            }
                          }}
                          className="w-16 bg-[#252525] text-white text-center rounded-lg px-2 py-1 border border-gray-700"
                        />
                      </div>
                    ) : (
                      <span className="text-white font-medium">
                        {s.weight}kg × {s.reps}次
                        {s.isPR ? ' 🔥' : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
