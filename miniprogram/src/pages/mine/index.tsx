import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import MealSwitcher from '../../components/MealSwitcher';
import { api } from '../../services/api';
import { useAuth } from '../../stores/auth';
import {
  ensureMeals,
  resolveCurrentMealId,
  selectMeal,
  syncMealSession,
  useMealSession,
} from '../../stores/meal';
import { requireFamilySession } from '../../utils/guard';
import { getDateLabel } from '../../utils/meal';
import type { OrderItem } from '../../types';
import './index.scss';

/** 我的单：我在本餐次的点菜列表，支持 −/+/删（对齐 H5 MyOrdersTab） */
export default function MinePage() {
  const { family } = useAuth();
  const session = useMealSession();
  const mealId = resolveCurrentMealId(session);
  const enabledMeals = useMemo(() => session.meals.filter((m) => m.enabled), [session.meals]);

  const [items, setItems] = useState<OrderItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const reqId = useRef(0);

  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  useDidShow(() => {
    if (!requireFamilySession()) return;
    syncMealSession();
    void ensureMeals(family?.id ?? null);
    void load();
  });

  // meals 加载完成 / 手动切餐次 / 跨天后重新拉取
  useEffect(() => {
    void load();
  }, [mealId, session.date]);

  async function load() {
    const id = ++reqId.current;
    if (!mealId) {
      setItems([]);
      setError(false);
      setLoading(false);
      return;
    }
    try {
      const next = await api.myOrders({ mealId, date: session.date });
      if (id !== reqId.current) return;
      setItems(next);
      setError(false);
    } catch (err) {
      if (id !== reqId.current) return;
      setError(true);
      Taro.showToast({ title: (err as Error).message || '加载失败', icon: 'none' });
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  async function change(item: OrderItem, delta: number) {
    if (!mealId || busy) return;
    const next = Math.max(0, Math.min(99, item.qty + delta));
    if (next === item.qty) return;
    setBusy(true);
    try {
      setItems(
        await api.upsertMyOrder({
          mealId,
          date: session.date,
          dishId: item.dishId ?? undefined,
          dishName: item.dishName,
          qty: next,
        }),
      );
    } catch (err) {
      Taro.showToast({ title: (err as Error).message || '操作失败', icon: 'none' });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View className='page'>
        <View className='page-header'>
          <Text className='page-title'>我的单</Text>
        </View>
        <Text className='muted'>加载中…</Text>
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View className='page'>
        <View className='page-header'>
          <Text className='page-title'>我的单</Text>
        </View>
        <View className='empty'>
          <View className='empty-icon'><Text>⚠️</Text></View>
          <Text className='empty-title'>加载失败</Text>
          <Text className='empty-desc'>网络异常，请稍后重试</Text>
          <View className='empty-action'>
            <View className='btn-retry' onClick={() => void load()}>重试</View>
          </View>
        </View>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View className='page'>
        <View className='page-header'>
          <Text className='page-title'>我的单</Text>
        </View>
        <View className='empty'>
          <View className='empty-icon'><Text>🧾</Text></View>
          <Text className='empty-title'>还没点菜</Text>
          <Text className='empty-desc'>去菜单看看，点好后会出现在这里</Text>
        </View>
      </View>
    );
  }

  return (
    <View className='page'>
      <View className='page-header'>
        <Text className='page-title'>我的单</Text>
        <Text className='page-sub'>{getDateLabel(session.date)}</Text>
      </View>

      <MealSwitcher meals={enabledMeals} currentId={mealId} onSelect={selectMeal} />
      {mealId === null && (
        <View className='muted page-tip'>当前不在任何餐次时段内，可点上方餐次手动选择</View>
      )}

      <View className='card'>
        <View className='card-head'>
          <Text className='card-title'>我的点餐单</Text>
          <Text className='card-extra tabular'>共 {totalQty} 份</Text>
        </View>
        {items.map((item) => (
          <View key={item.id} className='list-row'>
            <View className='list-row-main'>
              <View className='list-row-title'>{item.dishName}</View>
            </View>
            <View className='list-row-actions'>
              <View
                className={`qty-btn${busy ? ' is-disabled' : ''}`}
                onClick={() => void change(item, -1)}
              >
                −
              </View>
              <Text className='qty-num' key={item.qty}>{item.qty}</Text>
              <View
                className={`qty-btn${busy ? ' is-disabled' : ''}`}
                onClick={() => void change(item, +1)}
              >
                +
              </View>
              <View
                className={`btn-outline btn-danger${busy ? ' is-disabled' : ''}`}
                onClick={() => void change(item, -item.qty)}
              >
                删
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
