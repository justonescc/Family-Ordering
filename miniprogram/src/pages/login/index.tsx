import { useEffect, useState } from 'react';
import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';

import { api } from '../../services/api';
import { setCurrentFamily, setSession, useAuth } from '../../stores/auth';
import { resetCart } from '../../stores/cart';
import './index.scss';

export default function LoginPage() {
  const { token, family, families } = useAuth();
  const [loggingIn, setLoggingIn] = useState(false);
  const [submitting, setSubmitting] = useState<'create' | 'join' | null>(null);
  const [name, setName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [nickname, setNickname] = useState('');

  const entered = Boolean(token && family);

  // 已登录并进入家庭：直接进菜单页
  useDidShow(() => {
    if (entered) Taro.reLaunch({ url: '/pages/menu/index' });
  });

  useEffect(() => {
    if (entered) Taro.reLaunch({ url: '/pages/menu/index' });
  }, [entered]);

  function fail(error: unknown) {
    Taro.showToast({ title: (error as Error).message || '操作失败', icon: 'none' });
  }

  /** wx.login 取 code → 后端换 openid 签发 JWT；无家庭时停留本页展示表单 */
  async function onWxLogin() {
    if (loggingIn) return;
    setLoggingIn(true);
    try {
      const { code } = await Taro.login();
      const payload = await api.wechatLogin(code);
      setSession(payload);
      // payload.family 恒为 null：由 entered 副作用决定去向
    } catch (error) {
      fail(error);
    } finally {
      setLoggingIn(false);
    }
  }

  async function submitFamily(mode: 'create' | 'join') {
    if (submitting) return;
    setSubmitting(mode);
    try {
      const payload =
        mode === 'create'
          ? await api.createFamily({
              name: name.trim(),
              passphrase,
              nickname: nickname.trim() || undefined,
            })
          : await api.joinFamily({
              passphrase,
              nickname: nickname.trim() || undefined,
            });
      resetCart();
      setSession(payload);
    } catch (error) {
      fail(error);
    } finally {
      setSubmitting(null);
    }
  }

  async function onEnter(familyId: string) {
    if (submitting) return;
    setSubmitting('join');
    try {
      const payload = await api.enterFamily(familyId);
      resetCart();
      setCurrentFamily(payload.family!, payload.member!, payload.token);
    } catch (error) {
      fail(error);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <View className='page'>
      <View className='brand'>
        <Text className='brand-logo'>🍲</Text>
        <Text className='brand-title'>家庭点菜</Text>
        <Text className='brand-sub'>多人点菜 · 实时汇总</Text>
      </View>

      {!token && (
        <View className='auth-card'>
          <Button className='btn-primary' loading={loggingIn} onClick={onWxLogin}>
            微信一键登录
          </Button>
          <Text className='hint'>使用微信账号快捷登录，无需注册</Text>
        </View>
      )}

      {token && !family && (
        <View className='auth-card'>
          {families.length > 0 && (
            <View className='family-block'>
              <Text className='section-title'>我的家庭</Text>
              {families.map((item) => (
                <View key={item.id} className='family-row'>
                  <Text className='family-name'>{item.name}</Text>
                  <Button
                    className='btn-mini'
                    disabled={Boolean(submitting)}
                    onClick={() => onEnter(item.id)}
                  >
                    进入
                  </Button>
                </View>
              ))}
            </View>
          )}

          <Text className='section-title'>创建或加入家庭</Text>
          <Input
            className='field'
            placeholder='新家庭名称（创建时填）'
            value={name}
            onInput={(e) => setName(e.detail.value)}
          />
          <Input
            className='field'
            placeholder='家庭口令（至少 6 位）'
            password
            value={passphrase}
            onInput={(e) => setPassphrase(e.detail.value)}
          />
          <Input
            className='field'
            placeholder='我在本家庭的昵称（可选）'
            value={nickname}
            onInput={(e) => setNickname(e.detail.value)}
          />
          <Button
            className='btn-primary'
            disabled={!name.trim() || passphrase.length < 6 || Boolean(submitting)}
            loading={submitting === 'create'}
            onClick={() => submitFamily('create')}
          >
            创建家庭
          </Button>
          <Button
            className='btn-ghost'
            disabled={passphrase.length < 6 || Boolean(submitting)}
            loading={submitting === 'join'}
            onClick={() => submitFamily('join')}
          >
            凭口令加入
          </Button>
        </View>
      )}
    </View>
  );
}
