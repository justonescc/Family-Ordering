import { useState } from 'react';
import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import { api } from '../../services/api';
import { setCurrentFamily, setSession, useAuth } from '../../stores/auth';
import { resetMealSession } from '../../stores/meal';
import { requireFamilySession } from '../../utils/guard';
import type { Family } from '../../types';
import './index.scss';

/** 切换/加入家庭：列出我加入过的家庭进入，或凭口令加入新家庭（对齐 H5 Families 页） */
export default function FamiliesPage() {
  const { family, families } = useAuth();
  const [passphrase, setPassphrase] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState<'enter' | 'join' | null>(null);

  useDidShow(() => {
    if (!requireFamilySession()) return;
    // families 列表由登录/进入/加入流程维护（auth store），此处仅守卫
  });

  function fail(error: unknown) {
    Taro.showToast({ title: (error as Error).message || '操作失败', icon: 'none' });
  }

  async function onEnter(item: Family) {
    if (submitting) return;
    setSubmitting('enter');
    try {
      const payload = await api.enterFamily(item.id);
      resetMealSession();
      setCurrentFamily(payload.family!, payload.member!, payload.token);
      Taro.reLaunch({ url: '/pages/menu/index' });
    } catch (error) {
      fail(error);
    } finally {
      setSubmitting(null);
    }
  }

  async function onJoin() {
    if (submitting || passphrase.length < 6) return;
    setSubmitting('join');
    try {
      const payload = await api.joinFamily({
        passphrase,
        nickname: nickname.trim() || undefined,
      });
      resetMealSession();
      setSession(payload);
      Taro.reLaunch({ url: '/pages/menu/index' });
    } catch (error) {
      fail(error);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <View className='page'>
      <View className='card'>
        <View className='card-head'>
          <Text className='card-title'>我的家庭</Text>
        </View>
        {families.map((item) => {
          const isCurrent = item.id === family?.id;
          return (
            <View key={item.id} className='family-row'>
              <Text className='family-name'>{item.name}</Text>
              {isCurrent ? (
                <Text className='muted'>当前</Text>
              ) : (
                <View
                  className={`btn-mini${submitting ? ' is-disabled' : ''}`}
                  onClick={() => void onEnter(item)}
                >
                  进入
                </View>
              )}
            </View>
          );
        })}
        {families.length === 0 && <Text className='muted'>还没有加入任何家庭</Text>}
      </View>

      <View className='card'>
        <View className='card-head'>
          <Text className='card-title'>凭口令加入其他家庭</Text>
        </View>
        <Input
          className='custom-input family-input'
          placeholder='家庭口令（向管理员索取，至少 6 位）'
          password
          value={passphrase}
          onInput={(e) => setPassphrase(e.detail.value)}
        />
        <Input
          className='custom-input family-input'
          placeholder='我在该家庭的昵称（可选）'
          value={nickname}
          onInput={(e) => setNickname(e.detail.value)}
        />
        <Button
          className='btn-logout'
          disabled={passphrase.length < 6 || Boolean(submitting)}
          loading={submitting === 'join'}
          onClick={() => void onJoin()}
        >
          加入
        </Button>
      </View>

      <Text className='version'>家庭点菜 · 小程序</Text>
    </View>
  );
}
