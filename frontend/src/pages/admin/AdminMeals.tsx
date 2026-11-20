import { Button, Card, Dialog, Empty, Input, Tag, Toast } from 'antd-mobile';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { Meal } from '../../types';

export default function AdminMeals() {
  const navigate = useNavigate();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [form, setForm] = useState({ id: '', name: '', startTime: '11:00', endTime: '14:59' });

  const load = useCallback(async () => {
    try {
      setMeals(await api.listMeals());
    } catch (error) {
      Toast.show({ content: (error as Error).message });
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
    }
  }

  async function removeMeal(meal: Meal) {
    const ok = await Dialog.confirm({ content: `停用餐次「${meal.name}」？历史点菜记录保留` });
    if (!ok) return;
    try {
      await api.deleteMeal(meal.id);
      await load();
    } catch (error) {
      fail(error);
    }
  }

  const valid = form.name.trim().length > 0 && form.startTime !== form.endTime;

  return (
    <div className="page">
      <h1 className="page-title">餐次设置</h1>

      <Card title={form.id ? '编辑餐次' : '新增餐次'}>
        <Input
          value={form.name}
          onChange={(v) => setForm((prev) => ({ ...prev, name: v }))}
          placeholder="餐次名（如 午餐 / 夜宵）"
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <Input
            type="time"
            value={form.startTime}
            onChange={(v) => setForm((prev) => ({ ...prev, startTime: v }))}
          />
          <span>至</span>
          <Input
            type="time"
            value={form.endTime}
            onChange={(v) => setForm((prev) => ({ ...prev, endTime: v }))}
          />
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          结束时间早于开始时间表示跨午夜（如 21:00 - 01:00）
        </div>
        <Button block color="primary" style={{ marginTop: 8 }} disabled={!valid} onClick={submit}>
          {form.id ? '保存修改' : '添加餐次'}
        </Button>
        {form.id && (
          <Button block fill="none" style={{ marginTop: 8 }} onClick={resetForm}>
            取消编辑
          </Button>
        )}
      </Card>

      {meals.length === 0 && <Empty description="还没有餐次" />}

      {meals.map((meal) => (
        <Card key={meal.id} title={meal.name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Tag color={meal.enabled ? 'success' : 'default'}>
                {meal.enabled ? '启用中' : '已停用'}
              </Tag>
              <span style={{ marginLeft: 8 }}>
                {meal.startTime} - {meal.endTime}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button size="small" fill="outline" onClick={() => editMeal(meal)}>
                编辑
              </Button>
              <Button size="small" color="danger" fill="outline" onClick={() => removeMeal(meal)}>
                停用
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <div style={{ padding: '8px 16px' }}>
        <Button block onClick={() => navigate('/order')}>
          返回点菜
        </Button>
      </div>
    </div>
  );
}
