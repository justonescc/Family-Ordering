import { Button, Card, Input, Toast } from 'antd-mobile';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { IconError, IconMenu } from '../components/icons';
import ListSkeleton from '../components/Loading';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import type { Dish, MenuCategoryNode, OrderItem } from '../types';

interface Props {
  mealId: string;
  date: string;
}

export default function MenuTab({ mealId, date }: Props) {
  const navigate = useNavigate();
  const { member } = useAuthStore();
  const [menu, setMenu] = useState<MenuCategoryNode[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [customName, setCustomName] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const qtyByDish = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of orders) {
      if (item.dishId) map.set(item.dishId, item.qty);
    }
    return map;
  }, [orders]);

  async function load() {
    // 菜单为全量数据：已有内容时静默刷新，仅首次无数据才显示骨架
    setLoading(menu.length === 0);
    try {
      const [nextMenu, nextOrders] = await Promise.all([
        api.getMenu(),
        mealId ? api.myOrders({ mealId, date }) : Promise.resolve([]),
      ]);
      setMenu(nextMenu);
      setOrders(nextOrders);
      setError(false);
    } catch (err) {
      setError(true);
      Toast.show({ content: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealId, date]);

  async function save(input: { dishId?: string; dishName?: string; qty: number }) {
    setBusy(true);
    try {
      setOrders(await api.upsertMyOrder({ mealId, date, ...input }));
    } catch (error) {
      Toast.show({ content: (error as Error).message });
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
    if (!name) return;
    await save({ dishName: name, qty: 1 });
    setCustomName('');
  }

  const totalCount = orders.reduce((sum, item) => sum + item.qty, 0);

  if (loading) {
    return <ListSkeleton rows={5} />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<IconError size={28} />}
        title="加载失败"
        description="网络异常，请稍后重试"
        action={
          <Button size="small" color="primary" fill="outline" onClick={() => void load()}>
            重试
          </Button>
        }
      />
    );
  }

  if (menu.length === 0) {
    return (
      <EmptyState
        icon={<IconMenu size={28} />}
        title="菜单还没有菜品"
        description="添加分类和菜品后，就能开始点菜了"
        action={
          member?.role === 'ADMIN' ? (
            <Button size="small" color="primary" fill="outline" onClick={() => navigate('/admin/menu')}>
              去管理
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div>
      {menu.map((node) => (
        <Card key={node.category.id} title={node.category.name}>
          <div>
            {node.dishes.map((dish) => {
              const qty = qtyByDish.get(dish.id) ?? 0;
              return (
                <div className="list-row" key={dish.id}>
                  <div className="list-row-main">
                    <div className="list-row-title">{dish.name}</div>
                    {dish.description && <div className="list-row-desc">{dish.description}</div>}
                  </div>
                  <div className="list-row-actions">
                    {qty > 0 && (
                      <button
                        type="button"
                        className="qty-btn"
                        disabled={busy}
                        aria-label={`减少 ${dish.name}`}
                        onClick={() => change(dish, -1)}
                      >
                        −
                      </button>
                    )}
                    {qty > 0 && (
                      <span className="qty-num" key={qty}>
                        {qty}
                      </span>
                    )}
                    <button
                      type="button"
                      className={`qty-btn${qty === 0 ? ' qty-btn-solid' : ''}`}
                      disabled={busy}
                      aria-label={`增加 ${dish.name}`}
                      onClick={() => change(dish, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <Card title="想吃菜单里没有的？">
        <div className="custom-row">
          <Input
            value={customName}
            onChange={setCustomName}
            placeholder="输入菜名直接点"
            aria-label="自定义菜名"
            className="custom-input"
          />
          <Button color="primary" disabled={busy || !customName.trim()} onClick={addCustom}>
            加入
          </Button>
        </div>
      </Card>

      {totalCount > 0 && <div className="muted page-tip">我已点了 {totalCount} 份</div>}
    </div>
  );
}
