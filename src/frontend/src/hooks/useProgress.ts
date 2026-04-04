import { useCallback, useState } from "react";

export interface SubjectProgress {
  stars: number;
  completed: boolean;
  questionsAnswered: number;
  correctAnswers: number;
}

export interface ClassProgress {
  [subject: string]: SubjectProgress;
}

export interface AllProgress {
  [classId: string]: ClassProgress;
}

const STORAGE_KEY = "kidslearn_progress";

const defaultSubject = (): SubjectProgress => ({
  stars: 0,
  completed: false,
  questionsAnswered: 0,
  correctAnswers: 0,
});

export function useProgress() {
  const [progress, setProgress] = useState<AllProgress>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const saveProgress = useCallback((updated: AllProgress) => {
    setProgress(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  }, []);

  const getSubjectProgress = useCallback(
    (classId: string, subject: string): SubjectProgress => {
      return progress[classId]?.[subject] ?? defaultSubject();
    },
    [progress],
  );

  const addStar = useCallback(
    (classId: string, subject: string, isCorrect: boolean) => {
      const current = progress[classId]?.[subject] ?? defaultSubject();
      const updated: AllProgress = {
        ...progress,
        [classId]: {
          ...progress[classId],
          [subject]: {
            ...current,
            stars: isCorrect ? current.stars + 1 : current.stars,
            questionsAnswered: current.questionsAnswered + 1,
            correctAnswers: isCorrect
              ? current.correctAnswers + 1
              : current.correctAnswers,
          },
        },
      };
      saveProgress(updated);
    },
    [progress, saveProgress],
  );

  const markCompleted = useCallback(
    (classId: string, subject: string) => {
      const current = progress[classId]?.[subject] ?? defaultSubject();
      const updated: AllProgress = {
        ...progress,
        [classId]: {
          ...progress[classId],
          [subject]: { ...current, completed: true },
        },
      };
      saveProgress(updated);
    },
    [progress, saveProgress],
  );

  const getTotalStars = useCallback(
    (classId: string): number => {
      const cp = progress[classId];
      if (!cp) return 0;
      return Object.values(cp).reduce((sum, s) => sum + s.stars, 0);
    },
    [progress],
  );

  const resetProgress = useCallback(() => {
    saveProgress({});
  }, [saveProgress]);

  return {
    progress,
    getSubjectProgress,
    addStar,
    markCompleted,
    getTotalStars,
    resetProgress,
  };
}
