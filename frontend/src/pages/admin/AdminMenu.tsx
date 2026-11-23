import { Button, Card, Dialog, Input, Selector, Toast } from 'antd-mobile';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import { IconError, IconMenu } from '../../components/icons';
import ListSkeleton from '../../components/Loading';
import { compressImage } from '../../utils/image';
import { api } from '../../services/api';
import type { MenuCategoryNode } from '../../types';

function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const next = [...list];
  const j = index + dir;
  if (j < 0 || j >= next.length) return list;
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

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
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const moveCategory = (index: number, dir: -1 | 1) => {
    const next = moveItem(menu, index, dir);
    if (next === menu) return;
    void run(async () => {
      await api.reorderCategories(next.map((n) => n.category.id));
      await load();
    });
  };

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

  const moveDish = (categoryId: string, index: number, dir: -1 | 1) => {
    const node = menu.find((n) => n.category.id === categoryId);
    if (!node) return;
    const next = moveItem(node.dishes, index, dir);
    if (next === node.dishes) return;
    void run(async () => {
      await api.reorderDishes(next.map((d) => d.id));
      await load();
    });
  };

  /** 本地选图 → 压缩为 dataURL 填入图片地址，免服务器存储 */
  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      Toast.show({ content: '图片不能超过 5MB' });
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      setDishForm((prev) => ({ ...prev, imageUrl: dataUrl }));
    } catch {
      Toast.show({ content: '图片读取失败' });
    } finally {
      setUploading(false);
    }
  }

  /** 导出菜单 JSON */
  function exportMenu() {
    const payload = { exportedAt: new Date().toISOString(), menu };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `菜单-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.show({ content: '已导出菜单' });
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header-title">菜品与分类</h1>
        <p className="page-header-sub">维护菜单分类与菜品，可用 ↑↓ 调整顺序</p>
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
          <div className="page-toolbar">
            <Button size="small" fill="outline" onClick={exportMenu}>
              导出菜单
            </Button>
          </div>

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
              {menu.map((node, index) => (
                <div className="list-row" key={node.category.id}>
                  <div className="list-row-main">
                    <span>{node.category.name}</span>
                  </div>
                  <div className="list-row-actions">
                    <div className="row-nav">
                      <button
                        type="button"
                        className="row-nav-btn"
                        disabled={busy || index === 0}
                        aria-label="上移分类"
                        onClick={() => moveCategory(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="row-nav-btn"
                        disabled={busy || index === menu.length - 1}
                        aria-label="下移分类"
                        onClick={() => moveCategory(index, 1)}
                      >
                        ↓
                      </button>
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
            <div className="custom-row mt-2">
              <Input
                value={dishForm.imageUrl}
                onChange={(v) => setDishForm((prev) => ({ ...prev, imageUrl: v }))}
                placeholder="图片地址（可选）"
                aria-label="菜品图片地址"
                autoComplete="off"
                className="custom-input"
              />
              <Button fill="outline" loading={uploading} onClick={() => fileRef.current?.click()}>
                上传
              </Button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
            </div>
            {dishForm.imageUrl && (
              <img
                className="dish-preview"
                src={dishForm.imageUrl}
                alt="菜品图片预览"
                width={96}
                height={96}
              />
            )}
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
                {node.dishes.map((dish, index) => (
                  <div
                    className={`list-row${dish.enabled ? '' : ' list-row-disabled'}`}
                    key={dish.id}
                  >
                    <div className="list-row-main">
                      <div className="list-row-title">{dish.name}</div>
                      {dish.description && <div className="list-row-desc">{dish.description}</div>}
                    </div>
                    <div className="list-row-actions">
                      <div className="row-nav">
                        <button
                          type="button"
                          className="row-nav-btn"
                          disabled={busy || index === 0}
                          aria-label={`上移 ${dish.name}`}
                          onClick={() => moveDish(node.category.id, index, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="row-nav-btn"
                          disabled={busy || index === node.dishes.length - 1}
                          aria-label={`下移 ${dish.name}`}
                          onClick={() => moveDish(node.category.id, index, 1)}
                        >
                          ↓
                      </button>
                      </div>
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
