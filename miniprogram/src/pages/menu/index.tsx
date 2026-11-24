import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Input, Text, View } from '@tarojs/components';
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
import type { Dish, MenuCategoryNode, OrderItem } from '../../types';
import './index.scss';

/** 点菜主页：餐次胶囊 + 搜索 + 分类分组 + 数量步进（对齐 H5 MenuTab） */
export default function MenuPage() {
  const { family } = useAuth();
  const session = useMealSession();
  const mealId = resolveCurrentMealId(session);
  const enabledMeals = useMemo(() => session.meals?.filter((m) => m.enabled) ?? [], [session.meals]);

  const [menu, setMenu] = useState<MenuCategoryNode[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [customName, setCustomName] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const menuReqId = useRef(0);
  const ordersReqId = useRef(0);

  const qtyByDish = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of orders) {
      if (item.dishId) map.set(item.dishId, item.qty);
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return menu;
    return menu
      .map((node) => ({
        ...node,
        dishes: node.dishes.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            (d.description ?? '').toLowerCase().includes(q),
        ),
      }))
      .filter((node) => node.dishes.length > 0);
  }, [menu, search]);

  const totalCount = orders.reduce((sum, item) => sum + item.qty, 0);

  useDidShow(() => {
    if (!requireFamilySession()) return;
    syncMealSession();
    void ensureMeals(family?.id ?? null);
    void loadMenu();
    void loadOrders();
  });

  // meals 加载完成 / 手动切餐次 / 跨天后重新拉「我的单」
  useEffect(() => {
    void loadOrders();
  }, [mealId, session.date]);

  async function loadMenu() {
    const id = ++menuReqId.current;
    // 菜单为全量数据：已有内容时静默刷新，仅首次无数据才显示加载态
    setLoading(menu.length === 0);
    try {
      const next = await api.getMenu();
      if (id !== menuReqId.current) return;
      setMenu(next);
      setError(false);
    } catch (err) {
      if (id !== menuReqId.current) return;
      setError(true);
      Taro.showToast({ title: (err as Error).message || '加载失败', icon: 'none' });
    } finally {
      if (id === menuReqId.current) setLoading(false);
    }
  }

  async function loadOrders() {
    const id = ++ordersReqId.current;
    if (!mealId) {
      setOrders([]);
      return;
    }
    try {
      const next = await api.myOrders({ mealId, date: session.date });
      if (id !== ordersReqId.current) return;
      setOrders(next);
    } catch (err) {
      if (id !== ordersReqId.current) return;
      Taro.showToast({ title: (err as Error).message || '加载失败', icon: 'none' });
    }
  }

  async function save(input: { dishId?: string; dishName?: string; qty: number }) {
    if (!mealId || busy) return;
    setBusy(true);
    try {
      setOrders(await api.upsertMyOrder({ mealId, date: session.date, ...input }));
    } catch (err) {
      Taro.showToast({ title: (err as Error).message || '操作失败', icon: 'none' });
    } finally {
      setBusy(false);
    }
  }

  async function change(dish: Dish, delta: number) {
    const current = qtyByDish.get(dish.id) ?? 0;
    const next = Math.max(0, Math.min(99, current + delta));
    if (next === current) return;
    await save({ dishId: dish.id, qty: next });
  }

  async function addCustom() {
    const name = customName.trim();
    if (!name || busy) return;
    await save({ dishName: name, qty: 1 });
    setCustomName('');
  }

  if (loading) {
    return (
      <View className='page'>
        <View className='page-header'>
          <Text className='page-title'>{family?.name ?? '家庭点菜'}</Text>
        </View>
        <Text className='muted'>加载中…</Text>
      </View>
    );
  }

  if (error && menu.length === 0) {
    return (
      <View className='page'>
        <View className='page-header'>
          <Text className='page-title'>{family?.name ?? '家庭点菜'}</Text>
        </View>
        <View className='empty'>
          <Text className='empty-icon'>⚠️</Text>
          <Text className='empty-title'>加载失败</Text>
          <Text className='empty-desc'>网络异常，请稍后重试</Text>
          <View className='empty-action'>
            <View className='btn-retry' onClick={() => { void loadMenu(); void loadOrders(); }}>
              重试
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (menu.length === 0) {
    return (
      <View className='page'>
        <View className='page-header'>
          <Text className='page-title'>{family?.name ?? '家庭点菜'}</Text>
        </View>
        <View className='empty'>
          <View className='empty-icon'><Text>🍽️</Text></View>
          <Text className='empty-title'>菜单还没有菜品</Text>
          <Text className='empty-desc'>添加分类和菜品后，就能开始点菜了</Text>
        </View>
      </View>
    );
  }

  return (
    <View className='page'>
      <View className='page-header'>
        <Text className='page-title'>{family?.name ?? '家庭点菜'}</Text>
        <Text className='page-sub'>{getDateLabel(session.date)}</Text>
      </View>

      <MealSwitcher meals={enabledMeals} currentId={mealId} onSelect={selectMeal} />
      {mealId === null && (
        <View className='muted page-tip'>当前不在任何餐次时段内，可点上方餐次手动选择</View>
      )}

      <View className='search-bar'>
        <Text className='search-icon'>🔍</Text>
        <Input
          className='search-input'
          value={search}
          placeholder='搜索菜品'
          placeholderClass='muted'
          onInput={(e) => setSearch(e.detail.value)}
        />
        {search !== '' && (
          <Text className='search-clear' onClick={() => setSearch('')}>✕</Text>
        )}
      </View>

      {filtered.length === 0 && (
        <View className='empty'>
          <View className='empty-icon'><Text>🔍</Text></View>
          <Text className='empty-title'>没有找到相关菜品</Text>
          <Text className='empty-desc'>换个关键词试试</Text>
        </View>
      )}

      {filtered.map((node) => (
        <View key={node.category.id} className='card'>
          <View className='card-head'>
            <Text className='card-title'>{node.category.name}</Text>
          </View>
          {node.dishes.map((dish) => {
            const qty = qtyByDish.get(dish.id) ?? 0;
            return (
              <View key={dish.id} className='list-row'>
                <View className='list-row-main'>
                  {dish.imageUrl ? (
                    <Image
                      className='dish-thumb'
                      src={dish.imageUrl}
                      mode='aspectFill'
                      lazyLoad
                    />
                  ) : (
                    <View className='dish-thumb dish-thumb-empty'>
                      <Text>🍲</Text>
                    </View>
                  )}
                  <View className='dish-info'>
                    <View className='list-row-title'>{dish.name}</View>
                    {!!dish.description && (
                      <View className='list-row-desc'>{dish.description}</View>
                    )}
                  </View>
                </View>
                <View className='list-row-actions'>
                  {qty > 0 && (
                    <View
                      className={`qty-btn${busy ? ' is-disabled' : ''}`}
                      onClick={() => void change(dish, -1)}
                    >
                      −
                    </View>
                  )}
                  {qty > 0 && (
                    <Text className='qty-num' key={qty}>{qty}</Text>
                  )}
                  <View
                    className={`qty-btn${qty === 0 ? ' qty-btn-solid' : ''}${busy ? ' is-disabled' : ''}`}
                    
                    onClick={() => void change(dish, 1)}
                  >
                    +
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}

      <View className='card'>
        <View className='card-head'>
          <Text className='card-title'>想吃菜单里没有的？</Text>
        </View>
        <View className='custom-row'>
          <Input
            className='custom-input'
            value={customName}
            placeholder='输入菜名直接点'
            placeholderClass='muted'
            onInput={(e) => setCustomName(e.detail.value)}
          />
          <View
            className={`btn-solid${busy || !customName.trim() ? ' is-disabled' : ''}`}
            onClick={() => void addCustom()}
          >
            加入
          </View>
        </View>
      </View>

      {totalCount > 0 && (
        <View className='muted page-tip'>我已点了 {totalCount} 份</View>
      )}
    </View>
  );
}
