import { useState, useRef, useEffect } from 'react';
import { TURN_TIME_LIMIT } from '../constants/config';

export const useGameTimer = (onTimeUp: () => void) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startTimer = (difficulty: string) => {
    stopTimer();
    const limit = TURN_TIME_LIMIT[difficulty] ?? 60;
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
  };

  return { timeLeft, isVisible, startTimer, stopTimer, setIsVisible };
};


