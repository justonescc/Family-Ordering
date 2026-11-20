import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Meal } from '../types';

export function useMeals() {
  const [meals, setMeals] = useState<Meal[]>([]);

  const reload = useCallback(async () => {
    try {
      setMeals(await api.listMeals());
    } catch {
      // 拉取失败时保留旧值，避免页面闪烁
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { meals, reload };
}
