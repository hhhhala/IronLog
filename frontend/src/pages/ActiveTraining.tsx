import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTraining } from '@/hooks/useTraining';
import { useTrainingStore } from '@/stores/training-store';
import { useUserStore } from '@/stores/user-store';
import { useTimer } from '@/hooks/useTimer';
import { showToast } from '@/components/shared/Toast';
import Modal from '@/components/shared/Modal';

export default function ActiveTraining() {
  const { planId, day } = useParams<{ planId: string; day: string }>();
  const navigate = useNavigate();
  const { initTraining, logSet, finishWorkout, startRest, skipRest, reset } = useTraining();
  const { session, elapsedSeconds } = useTrainingStore();
  const { user } = useUserStore();
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState<number | null>(null);
  const initialized = useRef(false);
  const [vibrateMode, setVibrateMode] = useState(true);

  const timerMode = user?.timerMode || 'countup';

  // Initialize session
  useEffect(() => {
    if (!initialized.current && planId && day) {
      initTraining(Number(planId), Number(day));
      initialized.current = true;
    }
  }, [planId, day, initTraining]);

  // Rest timer - supports both countup and countdown
  const currentExercise = session?.exercises[session?.currentExerciseIndex ?? 0];
  const {
    remaining: restRemaining,
    elapsed: restElapsed,
    start: startRestTimer,
    skip: skipRestTimer,
    reset: resetRestTimer,
    formattedTime: restFormatted,
  } = useTimer({
    duration: currentExercise?.restTime || 90,
    mode: timerMode,
    autoStart: false,
    vibrate: vibrateMode,
    onComplete: () => {
      useTrainingStore.getState().updateSession({ phase: 'exercising' });
    },
  });

  // Watch for rest phase transition
  useEffect(() => {
    if (session?.phase === 'resting') {
      resetRestTimer(currentExercise?.restTime || 90);
      startRestTimer();
    }
  }, [session?.phase, session?.restStartTime]);

  const progress = session
    ? session.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0) /
      session.exercises.reduce((sum, ex) => sum + ex.targetSets, 0)
    : 0;

  function handleLogSet() {
    const w = parseFloat(weightInput) || 0;
    const r = parseInt(repsInput) || 0;
    if (w <= 0 || r <= 0) {
      showToast('请输入重量和次数', 'error');
      return;
    }
    logSet(w, r);
    setWeightInput('');
    setRepsInput('');
    if (navigator.vibrate) navigator.vibrate(50);
  }

  async function handleComplete() {
    const recordId = await finishWorkout();
    setSavedRecordId(recordId || null);
    setShowCompleteModal(true);
  }

  function handleFinishAndExit() {
    reset();
    if (savedRecordId) {
      navigate(`/records/${savedRecordId}`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }

  function handleExit() {
    if (session && session.phase !== 'completed' && session.phase !== 'idle') {
      if (!confirm('确定退出训练吗？当前进度将不会保存。')) return;
    }
    reset();
    navigate(-1);
  }

  const totalSets = session?.exercises.reduce((sum, ex) => sum + ex.targetSets, 0) || 0;
  const completedSets = session?.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0) || 0;

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f]">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-800"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>
        <button onClick={handleExit} className="text-gray-400 text-lg">✕</button>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{formatElapsed(elapsedSeconds)}</p>
          <p className="text-gray-500 text-xs">{completedSets}/{totalSets} 组完成</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setVibrateMode(!vibrateMode)}
            className={`text-sm ${vibrateMode ? 'text-amber-400' : 'text-gray-600'}`}
          >
            {vibrateMode ? '📳' : '🔇'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800">
        <div
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-area">
        {session.phase === 'resting' ? (
          /* Rest Timer View */
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <p className="text-gray-400 text-sm">
              {timerMode === 'countdown' ? '休息倒计时' : '休息时间'}
            </p>
            <div className={`w-48 h-48 rounded-full border-4 flex items-center justify-center ${
              timerMode === 'countdown' ? 'border-amber-500 pulse-ring' : 'border-green-500'
            }`}>
              <span className="text-6xl font-bold text-white tabular-nums">{restFormatted}</span>
            </div>
            {timerMode === 'countdown' && currentExercise && (
              <p className="text-gray-500 text-xs">目标休息 {currentExercise.restTime}秒</p>
            )}
            {timerMode === 'countup' && currentExercise && (
              <p className="text-gray-500 text-xs">建议休息 {currentExercise.restTime}秒</p>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  skipRestTimer();
                  useTrainingStore.getState().updateSession({ phase: 'exercising' });
                }}
                className="bg-gray-800 text-white px-6 py-3 rounded-xl font-medium active:scale-95 transition-transform"
              >
                跳过休息
              </button>
            </div>
            <p className="text-gray-600 text-xs">
              下一组: {session.exercises[session.currentExerciseIndex]?.name}
              {' · '}第{session.currentSetNumber + 1}组
            </p>
          </div>
        ) : session.phase === 'completed' ? (
          /* Completed View */
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <span className="text-6xl">🎉</span>
            <h2 className="text-2xl font-bold text-white">训练完成！</h2>
            <p className="text-gray-400 text-sm">总时长: {formatElapsed(elapsedSeconds)}</p>
            <button
              onClick={handleComplete}
              className="bg-amber-500 text-black font-bold px-8 py-3 rounded-2xl active:scale-95 transition-transform"
            >
              保存训练记录
            </button>
          </div>
        ) : (
          /* Exercise View */
          <div className="space-y-5">
            {/* Current Exercise Card */}
            <div className="bg-[#1a1a1a] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-400 text-xs">
                    动作 {session.currentExerciseIndex + 1}/{session.exercises.length}
                  </p>
                  <h2 className="text-xl font-bold text-white mt-1">
                    {session.exercises[session.currentExerciseIndex]?.name}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">目标</p>
                  <p className="text-amber-400 font-bold">
                    {session.exercises[session.currentExerciseIndex]?.targetSets}组 × {session.exercises[session.currentExerciseIndex]?.targetReps}次
                  </p>
                </div>
              </div>

              {/* Set Progress */}
              <div className="flex gap-2 mb-4">
                {Array.from({ length: session.exercises[session.currentExerciseIndex]?.targetSets || 0 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-full h-2 rounded-full transition-colors ${
                      session.exercises[session.currentExerciseIndex]?.sets[i]?.completed
                        ? 'bg-amber-500'
                        : i === session.currentSetNumber
                        ? 'bg-amber-500/30'
                        : 'bg-gray-800'
                    }`}
                  />
                ))}
              </div>

              {/* Log Set */}
              <div>
                <p className="text-gray-400 text-xs mb-2">
                  第 {session.currentSetNumber + 1} 组
                </p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      placeholder="重量 (kg)"
                      inputMode="decimal"
                      className="w-full bg-[#252525] text-white text-center rounded-xl px-3 py-3 text-lg border border-gray-700 focus:border-amber-500 focus:outline-none"
                    />
                    <p className="text-gray-600 text-xs text-center mt-1">kg</p>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={repsInput}
                      onChange={(e) => setRepsInput(e.target.value)}
                      placeholder="次数"
                      inputMode="numeric"
                      className="w-full bg-[#252525] text-white text-center rounded-xl px-3 py-3 text-lg border border-gray-700 focus:border-amber-500 focus:outline-none"
                    />
                    <p className="text-gray-600 text-xs text-center mt-1">次</p>
                  </div>
                </div>
                <button
                  onClick={handleLogSet}
                  className="w-full bg-amber-500 text-black font-bold py-3 rounded-xl mt-3 active:scale-[0.98] transition-transform"
                >
                  完成这组 ✓
                </button>
              </div>
            </div>

            {/* Completed Sets History */}
            {session.exercises[session.currentExerciseIndex]?.sets.some((s) => s.completed) && (
              <div className="bg-[#1a1a1a] rounded-2xl p-4">
                <p className="text-gray-400 text-xs mb-3">已完成的组</p>
                <div className="space-y-2">
                  {session.exercises[session.currentExerciseIndex]?.sets.map((s, i) =>
                    s.completed ? (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">第{i + 1}组</span>
                        <span className="text-white font-medium">{s.weight}kg × {s.reps}次</span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Exercise list mini preview at bottom */}
      {session.phase === 'exercising' && (
        <div className="px-4 py-3 border-t border-gray-800 overflow-x-auto">
          <div className="flex gap-2">
            {session.exercises.map((ex, i) => {
              const completed = ex.sets.every((s) => s.completed);
              const current = i === session.currentExerciseIndex;
              return (
                <div
                  key={i}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs ${
                    completed
                      ? 'bg-green-500/20 text-green-400'
                      : current
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  {ex.name}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Complete Modal */}
      <Modal open={showCompleteModal} onClose={handleFinishAndExit} title="训练记录已保存">
        <div className="text-center space-y-4">
          <p className="text-gray-300 text-sm">
            本次训练数据已保存。你可以在记录中查看详情。
          </p>
          <button
            onClick={handleFinishAndExit}
            className="w-full bg-amber-500 text-black font-bold py-3 rounded-xl active:scale-95 transition-transform"
          >
            查看记录
          </button>
        </div>
      </Modal>
    </div>
  );
}
