import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlanStore } from '@/stores/plan-store';
import type { PlanExercise } from '@/types';
import { showToast } from '@/components/shared/Toast';

export default function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { plans, loadPlans, savePlan } = usePlanStore();
  const plan = plans.find((p) => p.id === Number(id));
  const [selectedDay, setSelectedDay] = useState(1);
  const [editing, setEditing] = useState(false);
  const [editExercises, setEditExercises] = useState<PlanExercise[]>([]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    if (plan) {
      setEditExercises((plan.exercises || []).filter((e) => e.dayNumber === selectedDay));
    }
  }, [plan, selectedDay]);

  if (!plan) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const planExercisesList = plan?.exercises || [];
  const dayExercises = planExercisesList.filter((e) => e.dayNumber === selectedDay).sort((a, b) => a.sortOrder - b.sortOrder);

  function updateExercise(index: number, field: keyof PlanExercise, value: number | string) {
    setEditExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    );
  }

  function addExercise() {
    setEditExercises((prev) => [
      ...prev,
      {
        dayNumber: selectedDay,
        exerciseName: '新动作',
        sets: 3,
        reps: 10,
        targetWeight: 0,
        restTime: 90,
        sortOrder: prev.length,
        notes: '',
      },
    ]);
  }

  function removeExercise(index: number) {
    setEditExercises((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveEdits() {
    if (!plan) return;
    const allExercises = [
      ...(plan.exercises || []).filter((e) => e.dayNumber !== selectedDay),
      ...editExercises,
    ];
    await savePlan({ ...plan, exercises: allExercises });
    setEditing(false);
    showToast('修改已保存', 'success');
  }

  return (
    <div className="px-5 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-lg">←</button>
        <div>
          <h1 className="text-xl font-bold text-white">{plan.name}</h1>
          <p className="text-gray-400 text-xs">{plan.goal} · {plan.cycleDays}天循环</p>
        </div>
        <button
          onClick={() => (editing ? handleSaveEdits() : setEditing(true))}
          className={`ml-auto text-sm font-medium px-3 py-1.5 rounded-lg ${
            editing ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-300'
          }`}
        >
          {editing ? '✓ 完成' : '编辑'}
        </button>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {Array.from({ length: plan.cycleDays }, (_, i) => i + 1).map((day) => (
          <button
            key={day}
            onClick={() => { setSelectedDay(day); setEditing(false); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              selectedDay === day
                ? 'bg-amber-500 text-black'
                : 'bg-[#1a1a1a] text-gray-300'
            }`}
          >
            第{day}天
          </button>
        ))}
      </div>

      {/* Exercises */}
      {editing ? (
        <div className="space-y-3">
          {editExercises.map((ex, index) => (
            <div key={index} className="bg-[#1a1a1a] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={ex.exerciseName}
                  onChange={(e) => updateExercise(index, 'exerciseName', e.target.value)}
                  className="flex-1 bg-[#252525] text-white rounded-lg px-3 py-1.5 text-sm border border-gray-700 focus:border-amber-500 focus:outline-none"
                />
                <button onClick={() => removeExercise(index)} className="text-red-400 text-sm px-2 py-1">✕</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-gray-500 text-xs">组数</label>
                  <input
                    type="number"
                    value={ex.sets}
                    onChange={(e) => updateExercise(index, 'sets', Number(e.target.value))}
                    className="w-full bg-[#252525] text-white rounded-lg px-2 py-1.5 text-sm border border-gray-700 mt-1"
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-xs">次数</label>
                  <input
                    type="number"
                    value={ex.reps}
                    onChange={(e) => updateExercise(index, 'reps', Number(e.target.value))}
                    className="w-full bg-[#252525] text-white rounded-lg px-2 py-1.5 text-sm border border-gray-700 mt-1"
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-xs">休息(秒)</label>
                  <input
                    type="number"
                    value={ex.restTime}
                    onChange={(e) => updateExercise(index, 'restTime', Number(e.target.value))}
                    className="w-full bg-[#252525] text-white rounded-lg px-2 py-1.5 text-sm border border-gray-700 mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addExercise}
            className="w-full border-2 border-dashed border-gray-700 rounded-2xl py-4 text-gray-400 text-sm active:scale-[0.98] transition-transform"
          >
            + 添加动作
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {dayExercises.map((ex, index) => (
            <div key={index} className="bg-[#1a1a1a] rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{ex.exerciseName}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {ex.sets}组 × {ex.reps}次
                    {ex.targetWeight > 0 ? ` · 目标${ex.targetWeight}kg` : ''}
                    {' · '}休息{ex.restTime}秒
                  </p>
                </div>
              </div>
            </div>
          ))}
          {dayExercises.length === 0 && (
            <p className="text-gray-500 text-center py-8">该天暂无训练动作</p>
          )}
        </div>
      )}

      {/* Start Training */}
      <div className="fixed bottom-0 left-0 right-0 p-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
        <button
          onClick={() => navigate(`/training/${plan.id}/${selectedDay}`)}
          className="w-full bg-amber-500 text-black font-bold py-3.5 rounded-2xl text-lg active:scale-[0.98] transition-transform shadow-lg shadow-amber-500/30"
        >
          ▶ 开始训练
        </button>
      </div>
    </div>
  );
}
