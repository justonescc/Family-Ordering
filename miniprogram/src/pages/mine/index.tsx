import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import MealSwitcher from '../../components/MealSwitcher';
import { api } from '../../services/api';
import { useAuth } from '../../stores/auth';
import {
  buildCartKey,
  cartTotalCount,
  getDirtyItems,
  resetFromBaseline,
  setQty,
  submitCart,
  useCart,
  type CartDraftEntry,
} from '../../stores/cart';
import {
  ensureMeals,
  resolveCurrentMealId,
  selectMeal,
  syncMealSession,
  useMealSession,
} from '../../stores/meal';
import { requireFamilySession } from '../../utils/guard';
import { getDateLabel } from '../../utils/meal';
import './index.scss';

/** 我的单行：draft 键 + 内容 */
interface MineRow extends CartDraftEntry {
  key: string;
}

/** 我的单：与点菜页共享同一份购物车 draft，步进器只改本地，点提交才落库 */
export default function MinePage() {
  const { family } = useAuth();
  const session = useMealSession();
  const mealId = resolveCurrentMealId(session);
  const enabledMeals = useMemo(() => session.meals?.filter((m) => m.enabled) ?? [], [session.meals]);

  const cartKey = mealId ? buildCartKey(family?.id, mealId, session.date) : null;
  const cart = useCart(cartKey);
  const dirtyItems = useMemo(() => getDirtyItems(cart), [cart]);
  const totalQty = cartTotalCount(cart);

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const reqId = useRef(0);

  /** 展示行：draft 中数量 > 0 的项（与点菜页同一份 draft） */
  const rows = useMemo<MineRow[]>(
    () =>
      Object.entries(cart.draft)
        .map(([key, draftEntry]) => ({ key, ...draftEntry }))
        .filter((row) => row.qty > 0),
    [cart],
  );

  useDidShow(() => {
    if (!requireFamilySession()) return;
    syncMealSession();
    void ensureMeals(family?.id ?? null);
    void load();
  });

  // meals 加载完成 / 手动切餐次 / 跨天后重新拉取（刷新购物车基线）
  useEffect(() => {
    void load();
  }, [mealId, session.date]);

  async function load() {
    const id = ++reqId.current;
    if (!mealId) {
      setError(false);
      setLoading(false);
      return;
    }
    try {
      const next = await api.myOrders({ mealId, date: session.date });
      if (id !== reqId.current) return;
      if (!Array.isArray(next)) throw new Error('数据异常');
      resetFromBaseline(cartKey, next);
      setError(false);
    } catch (err) {
      if (id !== reqId.current) return;
      setError(true);
      Taro.showToast({ title: (err as Error).message || '加载失败', icon: 'none' });
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  function change(row: MineRow, delta: number) {
    const next = Math.max(0, Math.min(99, row.qty + delta));
    if (next === row.qty) return;
    setQty(cartKey, { dishId: row.dishId, dishName: row.dishName }, next);
  }

  /** 与点菜页共用 submitCart：提交后 draft 基线刷新，点菜页同步 */
  async function submit() {
    if (!mealId || !cartKey || busy || dirtyItems.length === 0) return;
    setBusy(true);
    try {
      await submitCart(cartKey, mealId, session.date);
      Taro.showToast({ title: '已提交，总单已更新', icon: 'success' });
    } catch (err) {
      Taro.showToast({ title: (err as Error).message || '提交失败', icon: 'none' });
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

  if (error && rows.length === 0) {
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

  if (rows.length === 0) {
    return (
      <View className='page'>
        <View className='page-header'>
          <Text className='page-title'>我的单</Text>
        </View>
        <View className='empty'>
          <View className='empty-icon'><Text>🧾</Text></View>
          <Text className='empty-title'>还没点菜</Text>
          <Text className='empty-desc'>去菜单看看，提交后会出现在这里</Text>
        </View>
        {dirtyItems.length > 0 && (
          <View className='mine-submit'>
            <View
              className={`btn-solid${busy ? ' is-disabled' : ''}`}
              onClick={() => void submit()}
            >
              {busy ? '提交中…' : `提交点菜（${dirtyItems.length}）`}
            </View>
            <Text className='mine-submit-tip'>有 {dirtyItems.length} 处改动待提交（含删除）</Text>
          </View>
        )}
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
        {rows.map((row) => (
          <View key={row.key} className='list-row'>
            <View className='list-row-main'>
              <View className='list-row-title'>{row.dishName}</View>
              {!row.dishId && <Text className='mine-custom-tag'>自定义</Text>}
            </View>
            <View className='list-row-actions'>
              <View className='qty-btn' onClick={() => change(row, -1)}>
                −
              </View>
              <Text className='qty-num' key={row.qty}>{row.qty}</Text>
              <View className='qty-btn' onClick={() => change(row, +1)}>
                +
              </View>
              <View
                className='btn-outline btn-danger'
                onClick={() => change(row, -row.qty)}
              >
                删
              </View>
            </View>
          </View>
        ))}
        {dirtyItems.length > 0 && (
          <View className='mine-submit'>
            <View
              className={`btn-solid${busy ? ' is-disabled' : ''}`}
              onClick={() => void submit()}
            >
              {busy ? '提交中…' : `提交点菜（${dirtyItems.length}）`}
            </View>
            <Text className='mine-submit-tip'>有 {dirtyItems.length} 处改动未提交，提交后才会上到总单</Text>
          </View>
        )}
      </View>
    </View>
  );
}
