import { Button, Dialog, Input, Toast } from 'antd-mobile';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import type { Family } from '../types';

export default function FamiliesPage() {
  const navigate = useNavigate();
  const { families, user, setSession, setCurrentFamily, logout } = useAuthStore();
  const [name, setName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    api.listFamilies().then((list) => useAuthStore.getState().setFamilies(list)).catch(() => undefined);
  }, []);

  function fail(error: unknown) {
    Toast.show({ content: (error as Error).message });
  }

  async function onEnter(familyId: string) {
    try {
      const payload = await api.enterFamily(familyId);
      setCurrentFamily(payload.family!, payload.member!, payload.token);
      navigate('/order', { replace: true });
    } catch (error) {
      fail(error);
    }
  }

  async function onCreate() {
    try {
      const payload = await api.createFamily({
        name: name.trim(),
        passphrase,
        nickname: nickname.trim() || undefined,
      });
      setSession({
        token: payload.token,
        user: payload.user,
        family: payload.family,
        member: payload.member,
        families: payload.families,
      });
      navigate('/order', { replace: true });
    } catch (error) {
      fail(error);
    }
  }

  async function onJoin() {
    try {
      const payload = await api.joinFamily({
        passphrase,
        nickname: nickname.trim() || undefined,
      });
      setSession({
        token: payload.token,
        user: payload.user,
        family: payload.family,
        member: payload.member,
        families: payload.families,
      });
      navigate('/order', { replace: true });
    } catch (error) {
      fail(error);
    }
  }

  function onLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="page">
      <h1 className="page-title">{user?.username} 的家庭</h1>

      {families.length === 0 && <div style={{ padding: '8px 16px' }}>还没有家庭，创建一个或加入已有家庭</div>}

      {families.map((family: Family) => (
        <Button
          key={family.id}
          block
          style={{ margin: '8px 16px' }}
          onClick={() => onEnter(family.id)}
        >
          {family.name}
        </Button>
      ))}

      <div style={{ padding: '16px' }}>
        <Input value={name} onChange={setName} placeholder="新家庭名称（创建时填）" />
        <Input
          value={passphrase}
          onChange={setPassphrase}
          placeholder="家庭口令"
          style={{ marginTop: 8 }}
        />
        <Input
          value={nickname}
          onChange={setNickname}
          placeholder="我在本家庭的昵称（可选）"
          style={{ marginTop: 8 }}
        />
        <Button
          block
          color="primary"
          style={{ marginTop: 12 }}
          disabled={!name.trim() || passphrase.length < 6}
          onClick={onCreate}
        >
          创建家庭
        </Button>
        <Button
          block
          style={{ marginTop: 8 }}
          disabled={passphrase.length < 6}
          onClick={onJoin}
        >
          凭口令加入
        </Button>
        <Button block fill="none" style={{ marginTop: 8 }} onClick={onLogout}>
          退出登录
        </Button>
      </div>

      <Dialog visible={false} content="占位" onClose={() => undefined} />
    </div>
  );
}
