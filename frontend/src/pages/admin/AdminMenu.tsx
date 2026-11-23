import { Button, Card, Dialog, Input, Selector, Toast } from 'antd-mobile';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import { IconError, IconMenu } from '../../components/icons';
import ListSkeleton from '../../components/Loading';
import { api } from '../../services/api';
import type { MenuCategoryNode } from '../../types';

export default function AdminMenu() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState<MenuCategoryNode[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [dishForm, setDishForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    imageUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    setLoading(firstLoad.current);
    firstLoad.current = false;
    try {
      const tree = await api.adminMenu();
      setMenu(tree);
      setDishForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || tree[0]?.category.id || '',
      }));
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

  /** 串行化写操作，按钮 loading 防重复提交 */
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (err) {
      Toast.show({ content: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const addCategory = () =>
    void run(async () => {
      await api.createCategory({ name: newCategory.trim() });
      setNewCategory('');
      await load();
    });

  const removeCategory = (categoryId: string, name: string) =>
    void run(async () => {
      const ok = await Dialog.confirm({ content: `删除分类「${name}」？` });
      if (!ok) return;
      await api.deleteCategory(categoryId);
      await load();
    });

  const addDish = () =>
    void run(async () => {
      await api.createDish({
        categoryId: dishForm.categoryId,
        name: dishForm.name.trim(),
        description: dishForm.description.trim() || undefined,
        imageUrl: dishForm.imageUrl.trim() || undefined,
      });
      setDishForm((prev) => ({ ...prev, name: '', description: '', imageUrl: '' }));
      await load();
    });

  const toggleDish = (dishId: string, enabled: boolean) =>
    void run(async () => {
      await api.updateDish(dishId, { enabled });
      await load();
    });

  const removeDish = (dishId: string, name: string) =>
    void run(async () => {
      const ok = await Dialog.confirm({ content: `删除菜品「${name}」？历史点菜记录不受影响` });
      if (!ok) return;
      await api.deleteDish(dishId);
      await load();
    });

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header-title">菜品与分类</h1>
        <p className="page-header-sub">维护菜单分类与菜品</p>
      </header>

      {loading ? (
        <ListSkeleton rows={4} />
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
            title="分类"
            extra={<span className="card-extra">{menu.length} 个分类</span>}
          >
            <div className="custom-row mb-2">
              <Input
                value={newCategory}
                onChange={setNewCategory}
                placeholder="新分类名"
                aria-label="新分类名"
                className="custom-input"
              />
              <Button color="primary" loading={busy} disabled={!newCategory.trim()} onClick={addCategory}>
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
                    disabled={busy}
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
            <Input
              value={dishForm.imageUrl}
              onChange={(v) => setDishForm((prev) => ({ ...prev, imageUrl: v }))}
              placeholder="图片地址（可选，http(s):// 或 / 开头）"
              aria-label="菜品图片地址"
              autoComplete="off"
              className="mt-2"
            />
            <Button
              block
              color="primary"
              className="mt-3"
              loading={busy}
              disabled={!dishForm.categoryId || !dishForm.name.trim()}
              onClick={addDish}
            >
              保存菜品
            </Button>
          </Card>

          {menu.every((node) => node.dishes.length === 0) && (
            <EmptyState
              icon={<IconMenu size={28} />}
              title="还没有菜品"
              description="在上方选择分类并添加菜品"
            />
          )}

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
                        disabled={busy}
                        onClick={() => toggleDish(dish.id, !dish.enabled)}
                      >
                        {dish.enabled ? '下架' : '上架'}
                      </button>
                      <button
                        type="button"
                        className="btn-outline btn-danger"
                        disabled={busy}
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
