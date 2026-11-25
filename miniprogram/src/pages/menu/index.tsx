import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Input, ScrollView, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import MealSwitcher from '../../components/MealSwitcher';
import { api } from '../../services/api';
import { useAuth } from '../../stores/auth';
import {
  buildCartKey,
  cartQtyOf,
  cartTotalCount,
  clearUncommitted,
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
import type { Dish, MenuCategoryNode } from '../../types';
import './index.scss';

/**
 * 右列恒定尺寸（rpx，750 设计稿），用于滚动联动左栏高亮的偏移估算。
 * 必须与 index.scss 的实际渲染尺寸一致：
 * 分组标题 64rpx；卡片 = 缩略图 120rpx + 上下内边距 24rpx×2 + 底部 1rpx 分割线 = 169rpx；组间距 16rpx。
 */
const GROUP_TITLE_RPX = 64;
const DISH_ROW_RPX = 169;
const GROUP_GAP_RPX = 16;

/** 已选弹层行：draft 键 + 内容 */
interface CartRow extends CartDraftEntry {
  key: string;
}

/** 点菜主页：左分类导航 + 右菜品列表（滚动联动）+ 底部购物车栏（先选后提交） */
export default function MenuPage() {
  const { family } = useAuth();
  const session = useMealSession();
  const mealId = resolveCurrentMealId(session);
  const enabledMeals = useMemo(() => session.meals?.filter((m) => m.enabled) ?? [], [session.meals]);

  const cartKey = mealId ? buildCartKey(family?.id, mealId, session.date) : null;
  const cart = useCart(cartKey);
  const dirtyItems = useMemo(() => getDirtyItems(cart), [cart]);
  const totalCount = cartTotalCount(cart);

  const [menu, setMenu] = useState<MenuCategoryNode[]>([]);
  const [customName, setCustomName] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [activeCatId, setActiveCatId] = useState<string>('');
  const [intoView, setIntoView] = useState<string>('');
  const menuReqId = useRef(0);
  const ordersReqId = useRef(0);
  /** 滚动定位序号：保证重复点击同一分类时 scroll-into-view 仍会触发 */
  const scrollSeq = useRef(0);

  // 窗口宽度只取一次用于 rpx→px 换算；渲染期不重复调原生接口
  const [windowWidth] = useState(() => Taro.getSystemInfoSync().windowWidth || 375);
  const px = (rpx: number) => (rpx / 750) * windowWidth;

  /** 各菜品当前数量（只读 draft，含待删除的 0 值项） */
  const qtyByDish = useMemo(() => {
    const map = new Map<string, number>();
    for (const draftEntry of Object.values(cart.draft)) {
      if (draftEntry.dishId) map.set(draftEntry.dishId, draftEntry.qty);
    }
    return map;
  }, [cart]);

  /** 已选弹层行：draft 中数量 > 0 的项（自定义菜一并可加减） */
  const cartRows = useMemo<CartRow[]>(
    () =>
      Object.entries(cart.draft)
        .map(([key, draftEntry]) => ({ key, ...draftEntry }))
        .filter((row) => row.qty > 0),
    [cart],
  );

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

  /** 各分组在右列表中的顶部偏移（px 估算），驱动左栏高亮联动 */
  const groupOffsets = useMemo(() => {
    const map = new Map<string, number>();
    let acc = 0;
    for (const node of filtered) {
      map.set(node.category.id, acc);
      acc += px(GROUP_TITLE_RPX) + node.dishes.length * px(DISH_ROW_RPX) + px(GROUP_GAP_RPX);
    }
    return map;
  }, [filtered]);

  /** 分类已选数量角标 */
  const catCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const node of filtered) {
      let n = 0;
      for (const dish of node.dishes) n += qtyByDish.get(dish.id) ?? 0;
      map.set(node.category.id, n);
    }
    return map;
  }, [filtered, qtyByDish]);

  useDidShow(() => {
    if (!requireFamilySession()) return;
    syncMealSession();
    void ensureMeals(family?.id ?? null);
    void loadMenu();
    void loadOrders();
  });

  // meals 加载完成 / 手动切餐次 / 跨天后重新拉「我的单」（刷新购物车基线）
  useEffect(() => {
    void loadOrders();
  }, [mealId, session.date]);

  async function loadMenu() {
    const id = ++menuReqId.current;
    setLoading(menu.length === 0);
    try {
      const next = await api.getMenu();
      if (id !== menuReqId.current) return;
      if (!Array.isArray(next)) throw new Error('菜单数据异常');
      setMenu(next);
      setActiveCatId((prev) => prev || next[0]?.category.id || '');
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
    if (!mealId) return;
    try {
      const next = await api.myOrders({ mealId, date: session.date });
      if (id !== ordersReqId.current) return;
      if (!Array.isArray(next)) throw new Error('数据异常');
      resetFromBaseline(cartKey, next);
    } catch (err) {
      if (id !== ordersReqId.current) return;
      Taro.showToast({ title: (err as Error).message || '加载失败', icon: 'none' });
    }
  }

  /** +/− 只改本地 draft（零请求），提交后才落库 */
  function changeQty(dish: { dishId?: string | null; dishName: string }, current: number, delta: number) {
    const next = Math.max(0, Math.min(99, current + delta));
    if (next === current) return;
    setQty(cartKey, dish, next);
  }

  function change(dish: Dish, delta: number) {
    changeQty({ dishId: dish.id, dishName: dish.name }, qtyByDish.get(dish.id) ?? 0, delta);
  }

  function changeRow(row: CartRow, delta: number) {
    changeQty({ dishId: row.dishId, dishName: row.dishName }, row.qty, delta);
  }

  /** 自定义菜加入购物车（零请求；同名菜 +1） */
  function addCustom() {
    const name = customName.trim();
    if (!name) return;
    if (!cartKey) {
      Taro.showToast({ title: '请先选择餐次', icon: 'none' });
      return;
    }
    setQty(cartKey, { dishName: name }, Math.min(99, cartQtyOf(cart, { dishName: name }) + 1));
    setCustomName('');
    setCustomOpen(false);
    setCartOpen(true);
  }

  /** 批量提交未提交变更；成功后基线刷新为服务端全量 */
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

  /** 清空已选：仅撤销未提交的改动（draft 回滚到基线），不发生网络请求 */
  async function clearCart() {
    if (dirtyItems.length === 0) return;
    const res = await Taro.showModal({
      title: '清空已选',
      content: '将撤销未提交的改动，已提交的菜保持不变',
      confirmText: '撤销改动',
      cancelText: '取消',
    });
    if (!res.confirm) return;
    clearUncommitted(cartKey);
  }

  function onCatClick(catId: string) {
    setActiveCatId(catId);
    // scroll-into-view 需要变化的值才会重复生效：先给带序号的临时 id，下一帧切回稳定 id
    scrollSeq.current += 1;
    setIntoView(`cat-${catId}-${scrollSeq.current}`);
    requestAnimationFrame(() => setIntoView(`cat-${catId}`));
  }

  function onListScroll(e) {
    const top = e.detail.scrollTop;
    let current = filtered[0]?.category.id ?? '';
    for (const node of filtered) {
      const offset = groupOffsets.get(node.category.id) ?? 0;
      if (top + px(120) >= offset) current = node.category.id;
    }
    if (current && current !== activeCatId) setActiveCatId(current);
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
          <Text className='empty-desc'>「我的 → 菜品管理」里添加分类和菜品后，就能开始点菜了</Text>
        </View>
      </View>
    );
  }

  return (
    <View className='menu-page'>
      {/* 顶部：家庭 + 日期 + 餐次 + 搜索 */}
      <View className='menu-top'>
        <View className='page-header menu-header'>
          <Text className='page-title'>{family?.name ?? '家庭点菜'}</Text>
          <Text className='page-sub'>{getDateLabel(session.date)}</Text>
        </View>

        <MealSwitcher meals={enabledMeals} currentId={mealId} onSelect={selectMeal} />
        {mealId === null && (
          <View className='muted menu-tip'>当前不在任何餐次时段内，可点上方餐次手动选择</View>
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
      </View>

      {/* 双栏主体 */}
      <View className='menu-body'>
        {search === '' && (
          <View className='cat-nav-wrap'>
            <ScrollView className='cat-nav' scrollY enhanced showScrollbar={false}>
              {menu.map((node) => {
                const id = node.category.id;
                const active = activeCatId === id;
                const count = catCount.get(id) ?? 0;
                return (
                  <View
                    key={id}
                    className={`cat-nav-item${active ? ' cat-nav-item-active' : ''}`}
                    onClick={() => onCatClick(id)}
                  >
                    <Text className='cat-nav-name'>{node.category.name}</Text>
                    {count > 0 && <Text className='cat-nav-badge'>{count}</Text>}
                  </View>
                );
              })}
            </ScrollView>
            <View className='cat-custom' onClick={() => setCustomOpen(true)}>
              <Text className='cat-custom-icon'>＋</Text>
              <Text className='cat-custom-text'>自定义菜</Text>
            </View>
          </View>
        )}

        <ScrollView
          className='dish-scroll'
          scrollY
          scrollIntoView={intoView}
          scrollWithAnimation
          enhanced
          enableFlex
          usingSticky
          showScrollbar={false}
          onScroll={onListScroll}
        >
          {filtered.map((node) => (
            <View key={node.category.id} id={`cat-${node.category.id}`} className='dish-group'>
              <View className='dish-group-title'>
                <Text>{node.category.name}</Text>
              </View>
              {node.dishes.map((dish) => {
                const qty = qtyByDish.get(dish.id) ?? 0;
                return (
                  <View key={dish.id} className='dish-card'>
                    {dish.imageUrl ? (
                      <Image className='dish-card-img' src={dish.imageUrl} mode='aspectFill' lazyLoad />
                    ) : (
                      <View className='dish-card-img dish-card-img-empty'><Text>🍲</Text></View>
                    )}
                    <View className='dish-card-info'>
                      <Text className='dish-card-name'>{dish.name}</Text>
                      {!!dish.description && <Text className='dish-card-desc'>{dish.description}</Text>}
                    </View>
                    <View className='dish-card-actions'>
                      {qty > 0 && (
                        <View className='qty-btn' onClick={() => change(dish, -1)}>
                          −
                        </View>
                      )}
                      {qty > 0 && <Text className='qty-num' key={qty}>{qty}</Text>}
                      <View
                        className={`qty-btn${qty === 0 ? ' qty-btn-solid' : ''}`}
                        onClick={() => change(dish, 1)}
                      >
                        +
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          {filtered.length === 0 && (
            <View className='empty'>
              <View className='empty-icon'><Text>🔍</Text></View>
              <Text className='empty-title'>没有找到相关菜品</Text>
              <Text className='empty-desc'>换个关键词试试</Text>
            </View>
          )}
          <View className='scroll-pad' />
        </ScrollView>
      </View>

      {/* 底部购物车栏：左侧整条可点展开已选弹层，右侧提交按钮 */}
      <View className='cart-bar'>
        <View className='cart-main' onClick={() => setCartOpen((v) => !v)}>
          <View className='cart-icon-wrap'>
            <Text className='cart-icon'>🛒</Text>
            {totalCount > 0 && <View className='cart-badge'>{totalCount}</View>}
          </View>
          <View className='cart-summary'>
            {totalCount > 0 ? (
              <Text className='cart-count-text'>已选 {totalCount} 份</Text>
            ) : (
              <Text className='cart-count-text cart-empty-text'>还没有选菜</Text>
            )}
            {dirtyItems.length > 0 && (
              <Text className='cart-dirty-text tabular'>{dirtyItems.length} 处未提交</Text>
            )}
          </View>
        </View>
        <View
          className={`cart-submit${dirtyItems.length === 0 || busy ? ' is-disabled' : ''}`}
          onClick={() => void submit()}
        >
          <Text className='cart-submit-text'>
            {busy ? '提交中…' : dirtyItems.length > 0 ? `提交点菜（${dirtyItems.length}）` : '暂无变更'}
          </Text>
        </View>
      </View>

      {/* 购物车弹层：已选清单（draft）+ 自定义菜 */}
      {cartOpen && (
        <View className='cart-pop-mask' onClick={() => setCartOpen(false)}>
          <View className='pop-mask-bg' />
          <View className='cart-pop' onClick={(e) => e.stopPropagation()}>
            <View className='cart-pop-head'>
              <Text className='card-title'>已选菜品</Text>
              <View className='cart-pop-head-right'>
                {dirtyItems.length > 0 && (
                  <Text className='cart-pop-clear' onClick={() => void clearCart()}>清空已选</Text>
                )}
                <Text className='cart-pop-close' onClick={() => setCartOpen(false)}>✕</Text>
              </View>
            </View>
            <ScrollView className='cart-pop-scroll' scrollY enhanced showScrollbar={false}>
              {cartRows.length === 0 && <Text className='muted cart-pop-empty'>还没有选菜</Text>}
              {cartRows.length > 0 && (
                <Text className='cart-pop-tip'>改动需点「提交点菜」后才会上到总单</Text>
              )}
              {cartRows.map((row) => (
                <View key={row.key} className='cart-pop-row'>
                  <View className='cart-pop-info'>
                    <Text className='cart-pop-name'>{row.dishName}</Text>
                    {!row.dishId && <Text className='cart-pop-custom'>自定义</Text>}
                  </View>
                  <View className='list-row-actions'>
                    <View className='qty-btn' onClick={() => changeRow(row, -1)}>
                      −
                    </View>
                    <Text className='qty-num' key={row.qty}>{row.qty}</Text>
                    <View className='qty-btn' onClick={() => changeRow(row, 1)}>
                      +
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View className='cart-pop-footer'>
              <View className='custom-row'>
                <Input
                  className='custom-input'
                  value={customName}
                  placeholder='输入菜名直接点'
                  placeholderClass='muted'
                  onInput={(e) => setCustomName(e.detail.value)}
                />
                <View
                  className={`btn-solid${!customName.trim() ? ' is-disabled' : ''}`}
                  onClick={() => addCustom()}
                >
                  加入
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 自定义菜输入弹层（左栏「＋ 自定义菜」入口） */}
      {customOpen && (
        <View className='custom-pop-mask' onClick={() => setCustomOpen(false)}>
          <View className='pop-mask-bg' />
          <View className='custom-pop' onClick={(e) => e.stopPropagation()}>
            <View className='custom-pop-head'>
              <Text className='card-title'>自定义菜</Text>
              <Text className='custom-pop-close' onClick={() => setCustomOpen(false)}>✕</Text>
            </View>
            <Input
              className='custom-input'
              value={customName}
              placeholder='输入菜名，例如：番茄炒蛋'
              placeholderClass='muted'
              focus={customOpen}
              onInput={(e) => setCustomName(e.detail.value)}
            />
            <View
              className={`btn-solid${!customName.trim() ? ' is-disabled' : ''}`}
              onClick={() => addCustom()}
            >
              加入
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
