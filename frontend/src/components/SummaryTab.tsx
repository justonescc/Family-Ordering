import { Button, Card, Tag, Toast } from 'antd-mobile';
import { useCallback, useState } from 'react';
import EmptyState from '../components/EmptyState';
import { IconError, IconSummary } from '../components/icons';
import ListSkeleton from '../components/Loading';
import { api } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import type { SummaryGroup } from '../types';

interface Props {
  mealId: string;
  date: string;
  active: boolean;
}

/** 给做饭的人看的总单：10s 轮询，可按组划掉/恢复 */
export default function SummaryTab({ mealId, date, active }: Props) {
  const [groups, setGroups] = useState<SummaryGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setGroups(mealId ? await api.summary({ mealId, date }) : []);
      setError(false);
    } catch (err) {
      setError(true);
      Toast.show({ content: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [mealId, date]);

  // 激活时每 10 秒刷新一次（钩子会立即执行一次）
  usePolling(load, 10_000, active);

  async function toggleGroup(group: SummaryGroup) {
    const target = !group.struck;
    setBusy(true);
    try {
      await Promise.all(group.members.map((member) => api.setStruck(member.itemId, target)));
      await load();
    } catch (error) {
      Toast.show({ content: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const totalQty = groups.reduce((sum, group) => sum + group.qty, 0);
  const totalPeople = new Set(groups.flatMap((group) => group.members.map((m) => m.nickname))).size;

  if (loading) {
    return <ListSkeleton rows={3} />;
  }

  // 轮询失败但已有数据时保留内容，仅首次无数据才显示错误态
  if (error && groups.length === 0) {
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

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<IconSummary size={28} />}
        title="还没有人点菜"
        description="点好菜后，这里会实时汇总全家人的选择"
      />
    );
  }

  return (
    <Card
      title="本餐次总单"
      extra={
        <span className="card-extra tabular">
          共 {totalQty} 份 · {totalPeople} 人
        </span>
      }
    >
      <div>
        {groups.map((group) => (
          <div className={`list-row${group.struck ? ' list-row-struck' : ''}`} key={group.dishName}>
            <div className="list-row-main">
              <div className="list-row-title tabular">
                {group.dishName} × {group.qty}
              </div>
              <div className="member-tags">
                {group.members.map((member) => (
                  <Tag key={member.itemId} color="primary" fill="outline" className="member-tag">
                    {member.avatar} {member.nickname} × {member.qty}
                  </Tag>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="btn-outline"
              disabled={busy}
              onClick={() => toggleGroup(group)}
            >
              {group.struck ? '恢复' : '划掉'}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
