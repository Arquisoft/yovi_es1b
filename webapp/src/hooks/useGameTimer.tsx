import { useCallback, useState, useRef } from 'react';
import {TURN_TIME_LIMIT, UI_TO_ENGLISH_DIFFICULTY} from '../constants/config';

export const useGameTimer = (onTimeUp: () => void) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback((difficulty: string) => {
    stopTimer();
    const englishDiff = UI_TO_ENGLISH_DIFFICULTY[difficulty] ?? difficulty;
    const limit = TURN_TIME_LIMIT[englishDiff] ?? 60;
    setTimeLeft(limit);
    setIsVisible(true);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          stopTimer();
          onTimeUp(); // Dispara el movimiento automático
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [onTimeUp, stopTimer]);

  return { timeLeft, isVisible, startTimer, stopTimer, setIsVisible };
};


