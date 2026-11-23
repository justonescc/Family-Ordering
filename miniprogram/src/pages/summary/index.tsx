import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from '@tarojs/components';
import Taro, { useDidHide, useDidShow } from '@tarojs/taro';

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
import type { SummaryGroup } from '../../types';
import './index.scss';

/**
 * 总单：给做饭的人看，10s 轮询；划掉/恢复、批量操作、复制清单
 * （对齐 H5 SummaryTab；onShow 启动轮询，onHide 清除）
 */
export default function SummaryPage() {
  const { family } = useAuth();
  const session = useMealSession();
  const mealId = resolveCurrentMealId(session);
  const enabledMeals = useMemo(() => session.meals.filter((m) => m.enabled), [session.meals]);
  const mealName = useMemo(
    () => session.meals.find((m) => m.id === mealId)?.name ?? '',
    [session.meals, mealId],
  );

  const [groups, setGroups] = useState<SummaryGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const reqId = useRef(0);
  /** 轮询定时器（onShow 启动 / onHide 清除） */
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** 轮询触发时取最新 load（避免闭包拿到旧 mealId/date） */
  const loadRef = useRef<() => void>(() => {});

  const totalQty = groups.reduce((sum, group) => sum + group.qty, 0);
  const totalPeople = new Set(groups.flatMap((group) => group.members.map((m) => m.nickname))).size;
  const struckCount = groups.filter((group) => group.struck).length;

  useDidShow(() => {
    if (!requireFamilySession()) return;
    syncMealSession();
    void ensureMeals(family?.id ?? null);
    void load();
    if (pollRef.current === null) {
      pollRef.current = setInterval(() => loadRef.current(), 10_000);
    }
  });

  useDidHide(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  });

  // meals 加载完成 / 手动切餐次 / 跨天后重新拉取
  useEffect(() => {
    void load();
  }, [mealId, session.date]);

  useEffect(() => {
    loadRef.current = load;
  });

  async function load() {
    const id = ++reqId.current;
    if (!mealId) {
      setGroups([]);
      setError(false);
      setLoading(false);
      return;
    }
    try {
      const next = await api.summary({ mealId, date: session.date });
      if (id !== reqId.current) return;
      setGroups(next);
      setError(false);
    } catch (err) {
      
      if (id !== reqId.current) return;
      setError(true);
      Taro.showToast({ title: (err as Error).message || '加载失败', icon: 'none' });
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  /** 单组或批量划掉/恢复；完成后 reload 对齐服务端 */
  async function setGroupsStruck(target: boolean) {
    const list = groups.filter((g) => g.struck !== target);
    if (list.length === 0 || busy) return;
    setBusy(true);
    try {
      await Promise.all(list.flatMap((g) => g.members.map((m) => api.setStruck(m.itemId, target))));
      await load();
    } catch (err) {
      Taro.showToast({ title: (err as Error).message || '操作失败', icon: 'none' });
    } finally {
      setBusy(false);
    }
  }

  /** 复制清单：格式对齐 H5（排除已划掉分组） */
  function copyAll() {
    const activeGroups = groups.filter((g) => !g.struck);
    if (activeGroups.length === 0) {
      Taro.showToast({ title: '没有需要复制的菜品', icon: 'none' });
      return;
    }
    const title = `【${family?.name ?? '家庭点菜'}${mealName ? ` · ${mealName}` : ''}】`;
    const lines = activeGroups.map((g) => {
      const detail = g.members.map((m) => `${m.nickname}×${m.qty}`).join('、');
      return `${g.dishName} × ${g.qty}（${detail}）`;
    });
    const text = [title, ...lines].join('\n');

    Taro.setClipboardData({
      data: text,
      success: () => Taro.showToast({ title: '已复制总单', icon: 'none' }),
      fail: () => Taro.showToast({ title: '复制失败，请手动选择复制', icon: 'none' }),
    });
  }

  if (loading) {
    return (
      <View className='page'>
        <View className='page-header'>
          <Text className='page-title'>总单</Text>
        </View>
        <Text className='muted'>加载中…</Text>
      </View>
    );
  }

  // 轮询失败但已有数据时保留内容，仅首次无数据才显示错误态
  if (error && groups.length === 0) {
    return (
      <View className='page'>
        <View className='page-header'>
          <Text className='page-title'>总单</Text>
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

  if (groups.length === 0) {
    return (
      <View className='page'>
        <View className='page-header'>
          <Text className='page-title'>总单</Text>
        </View>
        <View className='empty'>
          <View className='empty-icon'><Text>📋</Text></View>
          <Text className='empty-title'>还没有人点菜</Text>
          <Text className='empty-desc'>点好菜后，这里会实时汇总全家人的选择</Text>
        </View>
      </View>
    );
  }

  return (
    <View className='page'>
      <View className='page-header'>
        <Text className='page-title'>总单</Text>
        <Text className='page-sub'>{getDateLabel(session.date)}</Text>
      </View>

      <MealSwitcher meals={enabledMeals} currentId={mealId} onSelect={selectMeal} />
      {mealId === null && (
        <View className='muted page-tip'>当前不在任何餐次时段内，可点上方餐次手动选择</View>
      )}

      <View className='card'>
        <View className='card-head'>
          <Text className='card-title'>本餐次总单</Text>
          <Text className='card-extra tabular'>共 {totalQty} 份 · {totalPeople} 人</Text>
        </View>
        {groups.map((group) => (
          <View
            key={group.dishName}
            className={`list-row${group.struck ? ' list-row-struck' : ''}`}
          >
            <View className='list-row-main'>
              <View className='dish-info'>
                <View className='list-row-title tabular'>
                  {group.dishName} × {group.qty}
                </View>
                <View className='member-tags'>
                  {group.members.map((member) => (
                    <Text key={member.itemId} className='member-tag'>
                      {member.avatar} {member.nickname} × {member.qty}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
            <View
              className={`btn-outline${busy ? ' is-disabled' : ''}`}
              onClick={() => void setGroupsStruck(!group.struck)}
            >
              {group.struck ? '恢复' : '划掉'}
            </View>
          </View>
        ))}
        <View className='summary-footer'>
          <Text className='muted tabular'>
            已划 {struckCount}/{groups.length}
          </Text>
          <View className='summary-actions'>
            <View
              className={`btn-outline${busy || struckCount === groups.length ? ' is-disabled' : ''}`}
              onClick={() => void setGroupsStruck(true)}
            >
              全部划掉
            </View>
            <View
              className={`btn-outline${busy || struckCount === 0 ? ' is-disabled' : ''}`}
              onClick={() => void setGroupsStruck(false)}
            >
              重置
            </View>
            <View className='btn-outline' onClick={copyAll}>
              复制清单
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
