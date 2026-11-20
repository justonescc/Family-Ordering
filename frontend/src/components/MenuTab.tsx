import { Button, Card, Empty, Input, Toast } from 'antd-mobile';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Dish, MenuCategoryNode, OrderItem } from '../types';

interface Props {
  mealId: string;
  date: string;
}

export default function MenuTab({ mealId, date }: Props) {
  const [menu, setMenu] = useState<MenuCategoryNode[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [customName, setCustomName] = useState('');
  const [busy, setBusy] = useState(false);

  const qtyByDish = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of orders) {
      if (item.dishId) map.set(item.dishId, item.qty);
    }
    return map;
  }, [orders]);

  async function load() {
    try {
      const [nextMenu, nextOrders] = await Promise.all([
        api.getMenu(),
        api.myOrders({ mealId, date }),
      ]);
      setMenu(nextMenu);
      setOrders(nextOrders);
    } catch (error) {
      Toast.show({ content: (error as Error).message });
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

  return (
    <div>
      {menu.length === 0 && <Empty description="菜单还是空的，去「我的-管理」加菜吧" />}

      {menu.map((node) => (
        <Card
          key={node.category.id}
          title={node.category.name}
          style={{ marginBottom: 12 }}
        >
          {node.dishes.map((dish) => {
            const qty = qtyByDish.get(dish.id) ?? 0;
            return (
              <div
                key={dish.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                }}
              >
                <div>
                  <div>{dish.name}</div>
                  {dish.description && <div className="muted">{dish.description}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {qty > 0 && (
                    <>
                      <Button
                        size="small"
                        fill="outline"
                        disabled={busy}
                        onClick={() => change(dish, -1)}
                      >
                        -
                      </Button>
                      <span style={{ minWidth: 20, textAlign: 'center' }}>{qty}</span>
                    </>
                  )}
                  <Button
                    size="small"
                    color="primary"
                    fill={qty > 0 ? 'outline' : 'solid'}
                    disabled={busy}
                    onClick={() => change(dish, 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      ))}

      <Card title="想吃菜单里没有的？">
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            value={customName}
            onChange={setCustomName}
            placeholder="输入菜名直接点"
            style={{ flex: 1 }}
          />
          <Button color="primary" disabled={busy || !customName.trim()} onClick={addCustom}>
            加入
          </Button>
        </div>
      </Card>

      {totalCount > 0 && (
        <div style={{ padding: '8px 16px' }} className="muted">
          我已点了 {totalCount} 份
        </div>
      )}
    </div>
  );
}
