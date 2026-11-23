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
      <header className="page-header">
        <h1 className="page-header-title">菜品与分类</h1>
        <p className="page-header-sub">维护菜单分类与菜品</p>
      </header>

      <Card title="分类">
        <div className="custom-row mb-2">
          <Input
            value={newCategory}
            onChange={setNewCategory}
            placeholder="新分类名"
            aria-label="新分类名"
            className="custom-input"
          />
          <Button color="primary" disabled={!newCategory.trim()} onClick={addCategory}>
            添加
          </Button>
        </div>
        <div>
          {menu.map((node) => (
            <div className="list-row" key={node.category.id}>
              <div className="list-row-main">
                <span>{node.category.name}</span>
              </div>
              <button
                type="button"
                className="btn-outline btn-danger"
                onClick={() => removeCategory(node.category.id, node.category.name)}
              >
                删除
              </button>
            </div>
          ))}
        </div>
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
          aria-label="菜名"
          className="mt-2"
        />
        <Input
          value={dishForm.description}
          onChange={(v) => setDishForm((prev) => ({ ...prev, description: v }))}
          placeholder="简介（可选）"
          aria-label="菜品简介"
          className="mt-2"
        />
        <Button
          block
          color="primary"
          className="mt-3"
          disabled={!dishForm.categoryId || !dishForm.name.trim()}
          onClick={addDish}
        >
          保存菜品
        </Button>
      </Card>

      {menu.every((node) => node.dishes.length === 0) && <Empty description="还没有菜品" />}

      {menu.map((node) => (
        <Card key={node.category.id} title={node.category.name}>
          <div>
            {node.dishes.map((dish) => (
              <div
                className={`list-row${dish.enabled ? '' : ' list-row-disabled'}`}
                key={dish.id}
              >
                <div className="list-row-main">
                  <div className="list-row-title">{dish.name}</div>
                  {dish.description && <div className="list-row-desc">{dish.description}</div>}
                </div>
                <div className="list-row-actions">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => toggleDish(dish.id, !dish.enabled)}
                  >
                    {dish.enabled ? '下架' : '上架'}
                  </button>
                  <button
                    type="button"
                    className="btn-outline btn-danger"
                    onClick={() => removeDish(dish.id, dish.name)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <div className="page-footer">
        <Button block onClick={() => navigate('/order')}>
          返回点菜
        </Button>
      </div>
    </div>
  );
}
