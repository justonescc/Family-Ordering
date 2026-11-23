import { Button, Card, Input, Toast } from 'antd-mobile';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { IconBowl } from '../components/icons';
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
      <header className="page-header">
        <h1 className="page-header-title">{user?.username ?? '我的家庭'}</h1>
        <p className="page-header-sub">进入已有家庭，或创建新的家庭</p>
      </header>

      {families.length === 0 && (
        <EmptyState
          icon={<IconBowl size={28} />}
          title="还没有家庭"
          description="创建一个家庭，或凭口令加入已有家庭"
        />
      )}

      {families.length > 0 && (
        <Card title="我的家庭">
          <div>
            {families.map((family: Family) => (
              <div className="list-row" key={family.id}>
                <div className="list-row-main">
                  <div className="list-row-title">{family.name}</div>
                </div>
                <Button size="small" color="primary" fill="outline" onClick={() => onEnter(family.id)}>
                  进入
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="创建或加入">
        <Input
          value={name}
          onChange={setName}
          placeholder="新家庭名称（创建时填）"
          aria-label="新家庭名称"
        />
        <Input
          value={passphrase}
          onChange={setPassphrase}
          placeholder="家庭口令（至少 6 位）"
          aria-label="家庭口令"
          autoComplete="off"
          className="mt-2"
        />
        <Input
          value={nickname}
          onChange={setNickname}
          placeholder="我在本家庭的昵称（可选）"
          aria-label="我在本家庭的昵称"
          className="mt-2"
        />
        <Button
          block
          color="primary"
          className="mt-3"
          disabled={!name.trim() || passphrase.length < 6}
          onClick={onCreate}
        >
          创建家庭
        </Button>
        <Button block className="mt-2" disabled={passphrase.length < 6} onClick={onJoin}>
          凭口令加入
        </Button>
        <Button block fill="none" className="mt-2" onClick={onLogout}>
          退出登录
        </Button>
      </Card>
    </div>
  );
}
