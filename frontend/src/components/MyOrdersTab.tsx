import { Card, Toast } from 'antd-mobile';
import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import { IconMyOrder } from '../components/icons';
import ListSkeleton from '../components/Loading';
import { api } from '../services/api';
import type { OrderItem } from '../types';

interface Props {
  mealId: string;
  date: string;
  active: boolean;
}

export default function MyOrdersTab({ mealId, date, active }: Props) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setItems(await api.myOrders({ mealId, date }));
    } catch (error) {
      Toast.show({ content: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (active) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealId, date, active]);

  async function change(item: OrderItem, delta: number) {
    const next = Math.max(0, Math.min(99, item.qty + delta));
    if (next === item.qty) return;
    setBusy(true);
    try {
      setItems(
        await api.upsertMyOrder({
          mealId,
          date,
          dishId: item.dishId ?? undefined,
          dishName: item.dishName,
          qty: next,
        }),
      );
    } catch (error) {
      Toast.show({ content: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <ListSkeleton rows={3} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<IconMyOrder size={28} />}
        title="还没点菜"
        description="去菜单看看，点好后会出现在这里"
      />
    );
  }

  return (
    <Card title="我的点餐单">
      <div>
        {items.map((item) => (
          <div className="list-row" key={item.id}>
            <div className="list-row-main">
              <div className="list-row-title">{item.dishName}</div>
            </div>
            <div className="list-row-actions">
              <button
                type="button"
                className="qty-btn"
                disabled={busy}
                aria-label={`减少 ${item.dishName}`}
                onClick={() => change(item, -1)}
              >
                −
              </button>
              <span className="qty-num">{item.qty}</span>
              <button
                type="button"
                className="qty-btn"
                disabled={busy}
                aria-label={`增加 ${item.dishName}`}
                onClick={() => change(item, 1)}
              >
                +
              </button>
              <button
                type="button"
                className="btn-outline btn-danger"
                disabled={busy}
                onClick={() => change(item, -item.qty)}
              >
                删
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
