import { Button, Card, Tag, Toast } from 'antd-mobile';
import { useCallback, useRef, useState } from 'react';
import EmptyState from '../components/EmptyState';
import { IconError, IconSummary } from '../components/icons';
import ListSkeleton from '../components/Loading';
import { api } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useAuthStore } from '../stores/auth';
import type { SummaryGroup } from '../types';

interface Props {
  mealId: string;
  date: string;
  active: boolean;
  mealName: string;
}

/** 给做饭的人看的总单：10s 轮询，可划掉/恢复、批量操作、复制清单 */
export default function SummaryTab({ mealId, date, active, mealName }: Props) {
  const { family } = useAuthStore();
  const [groups, setGroups] = useState<SummaryGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    try {
      const next = mealId ? await api.summary({ mealId, date }) : [];
      if (id !== reqId.current) return;
      setGroups(next);
      setError(false);
    } catch (err) {
      if (id !== reqId.current) return;
      setError(true);
      Toast.show({ content: (err as Error).message });
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [mealId, date]);

  // 激活时每 10 秒刷新一次（钩子会立即执行一次）
  usePolling(load, 10_000, active);

  async function setGroupsStruck(target: boolean) {
    const list = groups.filter((g) => g.struck !== target);
    if (list.length === 0) return;
    setBusy(true);
    try {
      await Promise.all(list.flatMap((g) => g.members.map((m) => api.setStruck(m.itemId, target))));
      await load();
    } catch (error) {
      Toast.show({ content: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function toggleGroup(group: SummaryGroup) {
    await setGroupsStruck(!group.struck);
  }

  async function copyAll() {
    const activeGroups = groups.filter((g) => !g.struck);
    if (activeGroups.length === 0) {
      Toast.show({ content: '没有需要复制的菜品' });
      return;
    }
    const title = `【${family?.name ?? '家庭点菜'}${mealName ? ` · ${mealName}` : ''}】`;
    const lines = activeGroups.map((g) => {
      const detail = g.members.map((m) => `${m.nickname}×${m.qty}`).join('、');
      return `${g.dishName} × ${g.qty}（${detail}）`;
    });
    const text = [title, ...lines].join('\n');

    let ok = false;
    if (navigator.clipboard?.writeText) {
      try {
        await Promise.race([
          navigator.clipboard.writeText(text),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 800)),
        ]);
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
    }
    Toast.show({ content: ok ? '已复制总单' : '复制失败，请手动选择复制' });
  }

  const totalQty = groups.reduce((sum, group) => sum + group.qty, 0);
  const totalPeople = new Set(groups.flatMap((group) => group.members.map((m) => m.nickname))).size;
  const struckCount = groups.filter((group) => group.struck).length;

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
        <div className="summary-footer">
          <span className="muted tabular">
            已划 {struckCount}/{groups.length}
          </span>
          <div className="summary-actions">
            <button
              type="button"
              className="btn-outline"
              disabled={busy || struckCount === groups.length}
              onClick={() => setGroupsStruck(true)}
            >
              全部划掉
            </button>
            <button
              type="button"
              className="btn-outline"
              disabled={busy || struckCount === 0}
              onClick={() => setGroupsStruck(false)}
            >
              重置
            </button>
            <button type="button" className="btn-outline" onClick={copyAll}>
              复制清单
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
