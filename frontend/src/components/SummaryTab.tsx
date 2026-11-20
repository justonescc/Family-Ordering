import { Button, Card, Empty, Tag, Toast } from 'antd-mobile';
import { useCallback, useState } from 'react';
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

  const load = useCallback(async () => {
    try {
      setGroups(await api.summary({ mealId, date }));
    } catch (error) {
      Toast.show({ content: (error as Error).message });
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

  if (groups.length === 0) {
    return <Empty description="还没有人点菜" />;
  }

  return (
    <Card title="今日总单">
      {groups.map((group) => (
        <div
          key={group.dishName}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            opacity: group.struck ? 0.45 : 1,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ textDecoration: group.struck ? 'line-through' : 'none' }}>
              {group.dishName} × {group.qty}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {group.members.map((member) => (
                <Tag key={member.itemId} color="primary" fill="outline">
                  {member.avatar} {member.nickname} × {member.qty}
                </Tag>
              ))}
            </div>
          </div>
          <Button
            size="small"
            fill="outline"
            disabled={busy}
            style={{ marginLeft: 8 }}
            onClick={() => toggleGroup(group)}
          >
            {group.struck ? '恢复' : '划掉'}
          </Button>
        </div>
      ))}
    </Card>
  );
}
