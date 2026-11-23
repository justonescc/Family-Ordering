import { Button, Card, Dialog, Input, Tag, Toast } from 'antd-mobile';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import { IconBowl, IconError } from '../../components/icons';
import ListSkeleton from '../../components/Loading';
import { api } from '../../services/api';
import type { Meal } from '../../types';

export default function AdminMeals() {
  const navigate = useNavigate();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [form, setForm] = useState({ id: '', name: '', startTime: '11:00', endTime: '14:59' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    setLoading(firstLoad.current);
    firstLoad.current = false;
    try {
      setMeals(await api.listMeals());
      setError(false);
    } catch (err) {
      setError(true);
      Toast.show({ content: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function fail(error: unknown) {
    Toast.show({ content: (error as Error).message });
  }

  function editMeal(meal: Meal) {
    setForm({
      id: meal.id,
      name: meal.name,
      startTime: meal.startTime,
      endTime: meal.endTime,
    });
  }

  function resetForm() {
    setForm({ id: '', name: '', startTime: '11:00', endTime: '14:59' });
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      if (form.id) {
        await api.updateMeal(form.id, {
          name: form.name.trim(),
          startTime: form.startTime,
          endTime: form.endTime,
        });
      } else {
        await api.createMeal({
          name: form.name.trim(),
          startTime: form.startTime,
          endTime: form.endTime,
        });
      }
      resetForm();
      await load();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  }

  async function removeMeal(meal: Meal) {
    if (busy) return;
    const ok = await Dialog.confirm({ content: `停用餐次「${meal.name}」？历史点菜记录保留` });
    if (!ok) return;
    setBusy(true);
    try {
      await api.deleteMeal(meal.id);
      await load();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  }

  const valid = form.name.trim().length > 0 && form.startTime !== form.endTime;

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header-title">餐次设置</h1>
        <p className="page-header-sub">配置用餐时段与跨午夜规则</p>
      </header>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
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
      ) : (
        <>
          <Card
            title={form.id ? '编辑餐次' : '新增餐次'}
            extra={<span className="card-extra">{meals.length} 个餐次</span>}
          >
            <Input
              value={form.name}
              onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
              placeholder="餐次名（如 午餐 / 夜宵）"
              aria-label="餐次名"
            />
            <div className="time-row">
              <Input
                type="time"
                value={form.startTime}
                onChange={(v) => setForm((prev) => ({ ...prev, startTime: v }))}
                aria-label="开始时间"
                className="time-input"
              />
              <span className="muted">至</span>
              <Input
                type="time"
                value={form.endTime}
                onChange={(v) => setForm((prev) => ({ ...prev, endTime: v }))}
                aria-label="结束时间"
                className="time-input"
              />
            </div>
            <div className="muted mt-2">结束时间早于开始时间表示跨午夜（如 21:00 - 01:00）</div>
            <Button block color="primary" className="mt-3" loading={busy} disabled={!valid} onClick={submit}>
              {form.id ? '保存修改' : '添加餐次'}
            </Button>
            {form.id && (
              <Button block fill="none" className="mt-2" onClick={resetForm}>
                取消编辑
              </Button>
            )}
          </Card>

          {meals.length === 0 ? (
            <EmptyState
              icon={<IconBowl size={28} />}
              title="还没有餐次"
              description="添加餐次后，才能按时段自动切换点菜"
            />
          ) : (
            meals.map((meal) => (
              <Card key={meal.id} title={meal.name}>
                <div className="list-row">
                  <div className="list-row-main">
                    <div className="list-row-desc">
                      <Tag color={meal.enabled ? 'success' : 'default'}>
                        {meal.enabled ? '启用中' : '已停用'}
                      </Tag>
                      <span className="ml-2 tabular">
                        {meal.startTime} - {meal.endTime}
                      </span>
                    </div>
                  </div>
                  <div className="list-row-actions">
                    <button type="button" className="btn-outline" disabled={busy} onClick={() => editMeal(meal)}>
                      编辑
                    </button>
                    <button
                      type="button"
                      className="btn-outline btn-danger"
                      disabled={busy}
                      onClick={() => removeMeal(meal)}
                    >
                      停用
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </>
      )}

      <div className="page-footer">
        <Button block onClick={() => navigate('/order')}>
          返回点菜
        </Button>
      </div>
    </div>
  );
}
