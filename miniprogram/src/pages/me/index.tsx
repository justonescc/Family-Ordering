import { useState } from 'react';
import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import { api } from '../../services/api';
import { logout, setMember, useAuth } from '../../stores/auth';
import { resetMealSession } from '../../stores/meal';
import { requireFamilySession } from '../../utils/guard';
import './index.scss';

/** 与 H5 MeTab 相同的头像候选（emoji 列表） */
const AVATARS = [
  '😊', '😄', '😎', '👨', '👩', '👦', '👧',
  '🧓', '👵', '🐱', '🐶', '🐼', '🦊', '🐸',
  '🐯', '🐷',
];

/** 我的：profile 头 + 头像/昵称编辑 + 退出登录（对齐 H5 MeTab，管理端为二期） */
export default function MePage() {
  const { user, family, member } = useAuth();
  const [nickname, setNickname] = useState(member?.nickname ?? '');
  const [avatar, setAvatar] = useState(member?.avatar ?? '😊');
  const [saving, setSaving] = useState(false);

  useDidShow(() => {
    if (!requireFamilySession()) return;
  });

  async function saveProfile() {
    if (saving || !nickname.trim()) return;
    setSaving(true);
    try {
      const updated = await api.updateMyProfile({ nickname: nickname.trim(), avatar });
      setMember(updated);
      Taro.showToast({ title: '已保存', icon: 'none' });
    } catch (error) {
      Taro.showToast({ title: (error as Error).message || '保存失败', icon: 'none' });
    } finally {
      setSaving(false);
    }
  }

  function onLogout() {
    logout();
    resetMealSession();
    Taro.reLaunch({ url: '/pages/login/index' });
  }

  return (
    <View className='page'>
      <View className='profile-card'>
        <View className='avatar'>
          <Text className='avatar-emoji'>{avatar}</Text>
        </View>
        <View className='profile-meta'>
          <Text className='profile-name'>{member?.nickname || user?.username || '家庭成员'}</Text>
          <Text className='profile-family'>
            {family?.name} · {user?.username} · {member?.role === 'ADMIN' ? '管理员' : '成员'}
          </Text>
        </View>
      </View>

      {member?.role === 'ADMIN' && (
        <View className='card' onClick={() => Taro.navigateTo({ url: '/pages/admin/index' })}>
          <View className='card-head me-row'>
            <Text className='card-title'>菜品管理</Text>
            <Text className='muted'>›</Text>
          </View>
        </View>
      )}

      <View className='card' onClick={() => Taro.navigateTo({ url: '/pages/families/index' })}>
        <View className='card-head me-row'>
          <Text className='card-title'>切换家庭</Text>
          <Text className='muted'>›</Text>
        </View>
      </View>

      <View className='card'>
        <View className='card-head'>
          <Text className='card-title'>我在本家庭的昵称</Text>
        </View>
        <View className='avatar-grid'>
          {AVATARS.map((item) => {
            const active = avatar === item;
            return (
              <View
                key={item}
                className={`avatar-item${active ? ' avatar-item-active' : ''}`}
                onClick={() => setAvatar(item)}
              >
                <Text>{item}</Text>
              </View>
            );
          })}
        </View>
        <View className='custom-row me-row'>
          <Input
            className='custom-input'
            value={nickname}
            placeholder='昵称'
            placeholderClass='muted'
            onInput={(e) => setNickname(e.detail.value)}
          />
          <View
            className={`btn-solid${saving || !nickname.trim() ? ' is-disabled' : ''}`}
            onClick={() => void saveProfile()}
          >
            保存
          </View>
        </View>
      </View>

      <Button className='btn-logout' onClick={onLogout}>退出登录</Button>
      <Text className='version'>家庭点菜 · 小程序</Text>
    </View>
  );
}
