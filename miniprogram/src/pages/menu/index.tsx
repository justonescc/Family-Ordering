import { useEffect, useState } from 'react';
import { Text, View } from '@tarojs/components';
import { useDidShow } from '@tarojs/taro';

import { api } from '../../services/api';
import { requireFamilySession } from '../../utils/guard';
import type { MenuCategoryNode } from '../../types';
import './index.scss';

/** 阶段 2 占位：只读菜单列表；阶段 3 加入搜索、餐次胶囊与数量步进 */
export default function MenuPage() {
  const [menu, setMenu] = useState<MenuCategoryNode[] | null>(null);
  const [error, setError] = useState('');

  useDidShow(() => {
    if (!requireFamilySession()) return;
  });

  useEffect(() => {
    let alive = true;
    api
      .getMenu()
      .then((nodes) => {
        if (alive) setMenu(nodes);
      })
      .catch((err: unknown) => {
        if (alive) setError((err as Error).message);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View className='page'>
      <View className='page-header'>
        <Text className='page-title'>菜单</Text>
        <Text className='page-sub'>阶段 3 将加入搜索、餐次切换与点菜数量</Text>
      </View>

      {!menu && !error && <Text className='muted'>加载中…</Text>}
      {!!error && <Text className='muted'>{error}</Text>}

      {menu && menu.length === 0 && (
        <View className='empty'>
          <Text className='empty-title'>菜单还是空的</Text>
          <Text className='empty-desc'>请家人先在管理端添加分类与菜品</Text>
        </View>
      )}

      {menu &&
        menu.map((node) => (
          <View key={node.category.id} className='card'>
            <Text className='card-title'>{node.category.name}</Text>
            {node.dishes.length === 0 && <Text className='muted'>该分类暂无菜品</Text>}
            {node.dishes.map((dish) => (
              <View key={dish.id} className='dish-row'>
                <Text className='dish-name'>{dish.name}</Text>
                {!!dish.description && <Text className='dish-desc'>{dish.description}</Text>}
              </View>
            ))}
          </View>
        ))}
    </View>
  );
}
