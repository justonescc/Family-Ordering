import { useState } from 'react';
import { Image, Input, Picker, Text, Textarea, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import { api } from '../../services/api';
import { useAuth } from '../../stores/auth';
import { requireAdminSession } from '../../utils/guard';
import { pickDishImage } from '../../utils/image';
import type { Category, Dish, MenuCategoryNode } from '../../types';
import './index.scss';

type FormMode = 'category-create' | 'category-edit' | 'dish-create' | 'dish-edit';

interface DishForm {
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string; // '' = 无图；编辑时可置空表示清除
}

/** 菜品/分类管理（仅家庭管理员；后端接口均有 requireAdmin 保护） */
export default function AdminPage() {
  const { member } = useAuth();
  const [nodes, setNodes] = useState<MenuCategoryNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 表单弹层状态
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingId, setEditingId] = useState<string>('');
  const [catName, setCatName] = useState('');
  const [dishForm, setDishForm] = useState<DishForm>({ categoryId: '', name: '', description: '', imageUrl: '' });
  const [picking, setPicking] = useState(false);

  useDidShow(() => {
    if (!requireAdminSession()) return;
    void reload();
  });

  async function reload() {
    setLoading(true);
    try {
      setNodes(await api.adminDishes());
    } catch (error) {
      Taro.showToast({ title: (error as Error).message || '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }

  function fail(error: unknown) {
    Taro.showToast({ title: (error as Error).message || '操作失败', icon: 'none' });
  }

  function confirm(content: string): Promise<boolean> {
    return new Promise((resolve) => {
      Taro.showModal({ title: '确认', content, success: (r) => resolve(Boolean(r.confirm)) });
    });
  }

  // ---- 分类操作 ----

  function openCategoryForm(node?: MenuCategoryNode) {
    setFormMode(node ? 'category-edit' : 'category-create');
    setEditingId(node?.category.id ?? '');
    setCatName(node?.category.name ?? '');
  }

  async function submitCategory() {
    const name = catName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      if (formMode === 'category-edit') {
        await api.updateCategory(editingId, { name });
      } else {
        await api.createCategory(name);
      }
      setFormMode(null);
      Taro.showToast({ title: '已保存', icon: 'none' });
      await reload();
    } catch (error) {
      fail(error);
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteCategory(node: MenuCategoryNode) {
    if (node.dishes.length > 0) {
      Taro.showToast({ title: '分类下还有菜品，请先移走或删除', icon: 'none' });
      return;
    }
    if (!(await confirm(`删除分类「${node.category.name}」？`))) return;
    try {
      await api.deleteCategory(node.category.id);
      await reload();
    } catch (error) {
      fail(error);
    }
  }

  async function moveCategory(node: MenuCategoryNode, delta: number) {
    const index = nodes.findIndex((n) => n.category.id === node.category.id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= nodes.length) return;
    const ids = nodes.map((n) => n.category.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setNodes([...nodes].sort((a, b) => ids.indexOf(a.category.id) - ids.indexOf(b.category.id)));
    try {
      await api.reorderCategories(ids);
    } catch (error) {
      fail(error);
      await reload();
    }
  }

  // ---- 菜品操作 ----

  function openDishForm(categoryId: string, dish?: Dish) {
    setFormMode(dish ? 'dish-edit' : 'dish-create');
    setEditingId(dish?.id ?? '');
    setDishForm({
      categoryId: dish?.categoryId ?? categoryId,
      name: dish?.name ?? '',
      description: dish?.description ?? '',
      imageUrl: dish?.imageUrl ?? '',
    });
  }

  async function chooseImage() {
    if (picking) return;
    setPicking(true);
    try {
      const dataUrl = await pickDishImage();
      if (dataUrl) setDishForm((f) => ({ ...f, imageUrl: dataUrl }));
    } catch (error) {
      fail(error);
    } finally {
      setPicking(false);
    }
  }

  async function submitDish() {
    const name = dishForm.name.trim();
    if (!name || !dishForm.categoryId || saving) return;
    setSaving(true);
    try {
      if (formMode === 'dish-edit') {
        await api.updateDish(editingId, {
          categoryId: dishForm.categoryId,
          name,
          description: dishForm.description.trim() || null,
          imageUrl: dishForm.imageUrl || null,
        });
      } else {
        await api.createDish({
          categoryId: dishForm.categoryId,
          name,
          description: dishForm.description.trim() || undefined,
          imageUrl: dishForm.imageUrl || undefined,
        });
      }
      setFormMode(null);
      Taro.showToast({ title: '已保存', icon: 'none' });
      await reload();
    } catch (error) {
      fail(error);
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteDish(dish: Dish) {
    if (!(await confirm(`删除菜品「${dish.name}」？历史点菜记录不受影响`))) return;
    try {
      await api.deleteDish(dish.id);
      await reload();
    } catch (error) {
      fail(error);
    }
  }

  async function onToggleDish(dish: Dish) {
    try {
      await api.updateDish(dish.id, { enabled: !dish.enabled });
      await reload();
    } catch (error) {
      fail(error);
    }
  }

  async function moveDish(node: MenuCategoryNode, dish: Dish, delta: number) {
    const list = node.dishes;
    const index = list.findIndex((d) => d.id === dish.id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= list.length) return;
    const ids = list.map((d) => d.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    const sorted = [...list].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    setNodes(nodes.map((n) => (n.category.id === node.category.id ? { ...n, dishes: sorted } : n)));
    try {
      await api.reorderDishes(ids);
    } catch (error) {
      fail(error);
      await reload();
    }
  }

  // ---- 渲染 ----

  const isAdmin = member?.role === 'ADMIN';
  if (!isAdmin) return null;

  const categories: Category[] = nodes.map((n) => n.category);

  return (
    <View className='page'>
      {loading && <Text className='muted page-tip'>加载中…</Text>}

      {/* 分类管理 */}
      <View className='card'>
        <View className='card-head'>
          <Text className='card-title'>分类</Text>
          <View className='btn-mini' onClick={() => openCategoryForm()}>+ 新增分类</View>
        </View>
        {nodes.map((node, index) => (
          <View key={node.category.id} className='admin-row'>
            <Text className='admin-row-name'>{node.category.name}</Text>
            <Text className='muted admin-row-sub'>{node.dishes.length} 道菜</Text>
            <View className='admin-ops'>
              <Text className='op' onClick={() => void moveCategory(node, -1)}>↑</Text>
              <Text className='op' onClick={() => void moveCategory(node, 1)}>↓</Text>
              <Text className='op' onClick={() => openCategoryForm(node)}>编辑</Text>
              <Text className='op op-danger' onClick={() => void onDeleteCategory(node)}>删除</Text>
            </View>
          </View>
        ))}
        {nodes.length === 0 && !loading && <Text className='muted'>还没有分类，先新增一个</Text>}
      </View>

      {/* 菜品分组 */}
      {nodes.map((node) => (
        <View key={node.category.id} className='card'>
          <View className='card-head'>
            <Text className='card-title'>{node.category.name}</Text>
            <View className='btn-mini' onClick={() => openDishForm(node.category.id)}>+ 加菜</View>
          </View>
          {node.dishes.map((dish, index) => (
            <View key={dish.id} className={`dish-row${dish.enabled ? '' : ' dish-row-disabled'}`}>
              <Image
                className='dish-thumb'
                src={dish.imageUrl || ''}
                mode='aspectFill'
                lazyLoad
              />
              <View className='dish-info'>
                <Text className='dish-name'>{dish.name}</Text>
                {!!dish.description && <Text className='muted dish-desc'>{dish.description}</Text>}
                {!dish.enabled && <Text className='dish-off'>已停用</Text>}
              </View>
              <View className='admin-ops'>
                <Text className='op' onClick={() => void onToggleDish(dish)}>{dish.enabled ? '停用' : '启用'}</Text>
                <Text className='op' onClick={() => openDishForm(node.category.id, dish)}>编辑</Text>
                <Text className='op op-danger' onClick={() => void onDeleteDish(dish)}>删除</Text>
                <Text className='op' onClick={() => void moveDish(node, dish, -1)}>↑</Text>
                <Text className='op' onClick={() => void moveDish(node, dish, 1)}>↓</Text>
              </View>
            </View>
          ))}
          {node.dishes.length === 0 && <Text className='muted'>该分类还没有菜品</Text>}
        </View>
      ))}

      {/* 表单弹层 */}
      {formMode && (
        <View className='modal-mask' onClick={() => setFormMode(null)}>
          <View className='modal-card' onClick={(e) => e.stopPropagation()}>
            {formMode.startsWith('category') ? (
              <>
                <Text className='card-title'>{formMode === 'category-edit' ? '编辑分类' : '新增分类'}</Text>
                <Input
                  className='custom-input admin-input'
                  value={catName}
                  placeholder='分类名（1–20 字）'
                  maxlength={20}
                  onInput={(e) => setCatName(e.detail.value)}
                />
                <View
                  className={`btn-solid${!catName.trim() || saving ? ' is-disabled' : ''}`}
                  onClick={() => void submitCategory()}
                >
                  保存
                </View>
              </>
            ) : (
              <>
                <Text className='card-title'>{formMode === 'dish-edit' ? '编辑菜品' : '新增菜品'}</Text>
                <Picker
                  mode='selector'
                  range={categories}
                  rangeKey='name'
                  value={Math.max(0, categories.findIndex((c) => c.id === dishForm.categoryId))}
                  onChange={(e) => {
                    const cat = categories[Number(e.detail.value)];
                    if (cat) setDishForm((f) => ({ ...f, categoryId: cat.id }));
                  }}
                >
                  <View className='admin-input picker-line'>
                    <Text>{categories.find((c) => c.id === dishForm.categoryId)?.name || '选择分类'}</Text>
                  </View>
                </Picker>
                <Input
                  className='custom-input admin-input'
                  value={dishForm.name}
                  placeholder='菜名（1–30 字）'
                  maxlength={30}
                  onInput={(e) => setDishForm((f) => ({ ...f, name: e.detail.value }))}
                />
                <Textarea
                  className='custom-input admin-input admin-textarea'
                  value={dishForm.description}
                  placeholder='简介（选填，100 字内）'
                  maxlength={100}
                  onInput={(e) => setDishForm((f) => ({ ...f, description: e.detail.value }))}
                />
                <View className='admin-img-line'>
                  {dishForm.imageUrl ? (
                    <Image className='admin-img-preview' src={dishForm.imageUrl} mode='aspectFill' />
                  ) : (
                    <View className='admin-img-preview admin-img-empty'>
                      <Text className='muted'>无图</Text>
                    </View>
                  )}
                  <View className='admin-img-actions'>
                    <View className='btn-mini' onClick={() => void chooseImage()}>
                      {picking ? '处理中…' : dishForm.imageUrl ? '换图' : '选图'}
                    </View>
                    {!!dishForm.imageUrl && (
                      <View className='btn-mini' onClick={() => setDishForm((f) => ({ ...f, imageUrl: '' }))}>
                        移除
                      </View>
                    )}
                  </View>
                </View>
                <View
                  className={`btn-solid${!dishForm.name.trim() || !dishForm.categoryId || saving ? ' is-disabled' : ''}`}
                  onClick={() => void submitDish()}
                >
                  保存
                </View>
              </>
            )}
            <View className='admin-cancel' onClick={() => setFormMode(null)}>取消</View>
          </View>
        </View>
      )}
    </View>
  );
}
