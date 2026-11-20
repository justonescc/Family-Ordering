import { Button, Card, Dialog, Empty, Input, Selector, Toast } from 'antd-mobile';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { MenuCategoryNode } from '../../types';

export default function AdminMenu() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState<MenuCategoryNode[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [dishForm, setDishForm] = useState({ categoryId: '', name: '', description: '' });

  const load = useCallback(async () => {
    try {
      const tree = await api.adminMenu();
      setMenu(tree);
      setDishForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || tree[0]?.category.id || '',
      }));
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

  async function addCategory() {
    try {
      await api.createCategory({ name: newCategory.trim() });
      setNewCategory('');
      await load();
    } catch (error) {
      fail(error);
    }
  }

  async function removeCategory(categoryId: string, name: string) {
    const ok = await Dialog.confirm({ content: `删除分类「${name}」？` });
    if (!ok) return;
    try {
      await api.deleteCategory(categoryId);
      await load();
    } catch (error) {
      fail(error);
    }
  }

  async function addDish() {
    try {
      await api.createDish({
        categoryId: dishForm.categoryId,
        name: dishForm.name.trim(),
        description: dishForm.description.trim() || undefined,
      });
      setDishForm((prev) => ({ ...prev, name: '', description: '' }));
      await load();
    } catch (error) {
      fail(error);
    }
  }

  async function toggleDish(dishId: string, enabled: boolean) {
    try {
      await api.updateDish(dishId, { enabled });
      await load();
    } catch (error) {
      fail(error);
    }
  }

  async function removeDish(dishId: string, name: string) {
    const ok = await Dialog.confirm({ content: `删除菜品「${name}」？历史点菜记录不受影响` });
    if (!ok) return;
    try {
      await api.deleteDish(dishId);
      await load();
    } catch (error) {
      fail(error);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">菜品与分类</h1>

      <Card title="分类">
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Input
            value={newCategory}
            onChange={setNewCategory}
            placeholder="新分类名"
            style={{ flex: 1 }}
          />
          <Button color="primary" disabled={!newCategory.trim()} onClick={addCategory}>
            添加
          </Button>
        </div>
        {menu.map((node) => (
          <div
            key={node.category.id}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}
          >
            <span>{node.category.name}</span>
            <Button
              size="small"
              fill="outline"
              onClick={() => removeCategory(node.category.id, node.category.name)}
            >
              删除
            </Button>
          </div>
        ))}
      </Card>

      <Card title="添加菜品">
        <Selector
          options={menu.map((node) => ({ label: node.category.name, value: node.category.id }))}
          value={[dishForm.categoryId]}
          onChange={(value) => {
            if (value.length > 0) setDishForm((prev) => ({ ...prev, categoryId: value[0] }));
          }}
        />
        <Input
          value={dishForm.name}
          onChange={(v) => setDishForm((prev) => ({ ...prev, name: v }))}
          placeholder="菜名"
          style={{ marginTop: 8 }}
        />
        <Input
          value={dishForm.description}
          onChange={(v) => setDishForm((prev) => ({ ...prev, description: v }))}
          placeholder="简介（可选）"
          style={{ marginTop: 8 }}
        />
        <Button
          block
          color="primary"
          style={{ marginTop: 8 }}
          disabled={!dishForm.categoryId || !dishForm.name.trim()}
          onClick={addDish}
        >
          保存菜品
        </Button>
      </Card>

      {menu.every((node) => node.dishes.length === 0) && <Empty description="还没有菜品" />}

      {menu.map((node) => (
        <Card key={node.category.id} title={node.category.name}>
          {node.dishes.map((dish) => (
            <div
              key={dish.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0',
                opacity: dish.enabled ? 1 : 0.5,
              }}
            >
              <div>
                <div>{dish.name}</div>
                {dish.description && <div className="muted">{dish.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="small" fill="outline" onClick={() => toggleDish(dish.id, !dish.enabled)}>
                  {dish.enabled ? '下架' : '上架'}
                </Button>
                <Button
                  size="small"
                  color="danger"
                  fill="outline"
                  onClick={() => removeDish(dish.id, dish.name)}
                >
                  删除
                </Button>
              </div>
            </div>
          ))}
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
