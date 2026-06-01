import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  duration: number;       // seconds
  autoStart?: boolean;
  onComplete?: () => void;
  vibrate?: boolean;
}

export function useTimer({ duration, autoStart = false, onComplete, vibrate = true }: UseTimerOptions) {
  const [remaining, setRemaining] = useState(duration);
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
    setRemaining(newDuration ?? duration);
  }, [duration, clearTimer]);

  const skip = useCallback(() => {
    clearTimer();
    setRemaining(0);
    setIsRunning(false);
    onCompleteRef.current?.();
  }, [clearTimer]);

  useEffect(() => {
    if (!isRunning) {
      clearTimer();
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          if (vibrate && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
          // Delay callback to avoid render issues
          setTimeout(() => onCompleteRef.current?.(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [isRunning, clearTimer, vibrate]);

  const progress = duration > 0 ? (duration - remaining) / duration : 0;

  return {
    remaining,
    isRunning,
    progress,
    start,
    pause,
    reset,
    skip,
    formattedTime: formatTime(remaining),
  };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
