import { Text, View } from '@tarojs/components';
import { useDidShow } from '@tarojs/taro';

import { requireFamilySession } from '../../utils/guard';
import './index.scss';

/** 阶段 2 占位：阶段 3 实现总单分组、划掉/恢复、10s 轮询与复制清单 */
export default function SummaryPage() {
  useDidShow(() => {
    if (!requireFamilySession()) return;
  });

  return (
    <View className='page'>
      <View className='page-header'>
        <Text className='page-title'>总单</Text>
        <Text className='page-sub'>全家庭本餐次汇总，做饭的人照单备菜</Text>
      </View>
      <View className='placeholder-card'>
        <Text className='placeholder-emoji'>📋</Text>
        <Text className='placeholder-title'>建设中</Text>
        <Text className='placeholder-desc'>
          阶段 3 实现：按菜汇总、划掉/恢复、进度与复制清单（剪贴板）
        </Text>
      </View>
    </View>
  );
}
