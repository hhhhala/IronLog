import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  duration: number;       // seconds (for countdown)
  mode?: 'countdown' | 'countup';
  autoStart?: boolean;
  onComplete?: () => void;
  vibrate?: boolean;
}

export function useTimer({ duration, mode = 'countdown', autoStart = false, onComplete, vibrate = true }: UseTimerOptions) {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newDuration?: number) => {
    setIsRunning(false);
    clearTimer();
    setElapsed(0);
  }, [clearTimer]);

  const skip = useCallback(() => {
    clearTimer();
    setElapsed(0);
    setIsRunning(false);
    onCompleteRef.current?.();
  }, [clearTimer]);

  useEffect(() => {
    if (!isRunning) {
      clearTimer();
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        // Countdown complete?
        if (mode === 'countdown' && next >= duration) {
          clearTimer();
          setIsRunning(false);
          if (vibrate && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
          setTimeout(() => onCompleteRef.current?.(), 0);
        }
        return next;
      });
    }, 1000);

    return clearTimer;
  }, [isRunning, clearTimer, mode, duration, vibrate]);

  const isCountdown = mode === 'countdown';
  const remaining = isCountdown ? Math.max(0, duration - elapsed) : elapsed;
  const progress = isCountdown ? (duration > 0 ? elapsed / duration : 0) : 0;

  return {
    elapsed,
    remaining,
    isRunning,
    progress,
    start,
    pause,
    reset,
    skip,
    formattedTime: formatTime(remaining),
    mode,
  };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
