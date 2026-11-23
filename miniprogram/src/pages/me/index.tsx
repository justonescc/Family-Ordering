import { Button, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import { logout, useAuth } from '../../stores/auth';
import { requireFamilySession } from '../../utils/guard';
import './index.scss';

/** 阶段 2 占位：展示登录态与家庭成员信息；阶段 3 接入头像/昵称编辑 */
export default function MePage() {
  const { user, family, member } = useAuth();

  useDidShow(() => {
    if (!requireFamilySession()) return;
  });

  function onLogout() {
    logout();
    Taro.reLaunch({ url: '/pages/login/index' });
  }

  return (
    <View className='page'>
      <View className='profile-card'>
        <View className='avatar'>
          <Text className='avatar-emoji'>{member?.avatar || '🙂'}</Text>
        </View>
        <View className='profile-meta'>
          <Text className='profile-name'>{member?.nickname || user?.username || '未登录'}</Text>
          <Text className='profile-family'>{family?.name || '未加入家庭'}</Text>
        </View>
      </View>

      <View className='info-card'>
        <View className='info-row'>
          <Text className='info-label'>家庭</Text>
          <Text className='info-value'>{family?.name || '-'}</Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>角色</Text>
          <Text className='info-value'>
            {member?.role === 'ADMIN' ? '管理员' : member ? '成员' : '-'}
          </Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>账号</Text>
          <Text className='info-value'>{user?.username || '-'}</Text>
        </View>
      </View>

      <Button className='btn-logout' onClick={onLogout}>
        退出登录
      </Button>
      <Text className='version'>家庭点菜 · 小程序阶段 2 骨架</Text>
    </View>
  );
}
