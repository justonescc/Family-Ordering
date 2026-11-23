import { Text, View } from '@tarojs/components';
import { useDidShow } from '@tarojs/taro';

import { requireFamilySession } from '../../utils/guard';
import './index.scss';

/** 阶段 2 占位：阶段 3 实现我的单列表、数量调整与删除 */
export default function MinePage() {
  useDidShow(() => {
    if (!requireFamilySession()) return;
  });

  return (
    <View className='page'>
      <View className='page-header'>
        <Text className='page-title'>我的单</Text>
        <Text className='page-sub'>我在本餐次点过的菜</Text>
      </View>
      <View className='placeholder-card'>
        <Text className='placeholder-emoji'>🧾</Text>
        <Text className='placeholder-title'>建设中</Text>
        <Text className='placeholder-desc'>阶段 3 实现：我的点菜列表、数量调整与删除</Text>
      </View>
    </View>
  );
}
