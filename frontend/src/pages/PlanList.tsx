import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanStore } from '@/stores/plan-store';
import EmptyState from '@/components/shared/EmptyState';
import { showToast } from '@/components/shared/Toast';

export default function PlanList() {
  const navigate = useNavigate();
  const { plans, loading, loadPlans, deletePlan, setActive } = usePlanStore();

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除这个训练计划吗？')) return;
    await deletePlan(id);
    showToast('计划已删除', 'info');
  };

  const handleSetActive = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await setActive(id);
    showToast('已设为当前计划', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-white">训练计划</h1>
        <button
          onClick={() => navigate('/ai-coach')}
          className="bg-amber-500 text-black text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-transform"
        >
          + AI生成
        </button>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon="📋"
          title="还没有训练计划"
          description="使用AI教练生成你的第一个训练计划"
          action={{ label: '🤖 AI生成计划', onClick: () => navigate('/ai-coach') }}
        />
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => navigate(`/plans/${plan.id}`)}
              className="bg-[#1a1a1a] rounded-2xl p-4 active:scale-[0.98] transition-transform relative"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold">{plan.name}</h3>
                <div className="flex gap-2">
                  {plan.isActive && (
                    <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">
                      当前
                    </span>
                  )}
                  <span className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded-full">
                    {plan.goal}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>{plan.cycleDays}天循环</span>
                <span>{plan.exercises?.length || 0}个动作</span>
                <span>
                  {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString('zh-CN') : ''}
                </span>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
                <button
                  onClick={(e) => handleSetActive(plan.id!, e)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                    plan.isActive
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {plan.isActive ? '✓ 当前计划' : '设为当前'}
                </button>
                <button
                  onClick={() => navigate(`/training/${plan.id}`)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium bg-amber-500 text-black"
                >
                  ▶ 开始训练
                </button>
                <button
                  onClick={(e) => handleDelete(plan.id!, e)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-500/10 text-red-400 ml-auto"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
