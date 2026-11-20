import { Button, Dialog, Input } from 'antd-mobile';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

export default function FamiliesPage() {
  const navigate = useNavigate();
  const { families, user, setCurrentFamily, setFamilies, logout } = useAuthStore();
  const [passphrase, setPassphrase] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    api.listFamilies().then(setFamilies).catch(() => undefined);
  }, [setFamilies]);

  async function onEnter(familyId: string) {
    const payload = await api.enterFamily(familyId);
    setCurrentFamily(payload.family!, payload.member!, payload.token);
    navigate('/order', { replace: true });
  }

  async function onCreate() {
    const payload = await api.createFamily({ name, passphrase });
    setCurrentFamily(payload.family!, payload.member!, payload.token);
    navigate('/order', { replace: true });
  }

  async function onJoin() {
    const payload = await api.joinFamily({ passphrase });
    setCurrentFamily(payload.family!, payload.member!, payload.token);
    navigate('/order', { replace: true });
  }

  return (
    <div className="page">
      <h1 className="page-title">{user?.username} 的家庭</h1>
      {families.map((family) => (
        <Button key={family.id} block style={{ margin: '8px 16px' }} onClick={() => onEnter(family.id)}>
          {family.name}
        </Button>
      ))}

      <div style={{ padding: '16px' }}>
        <Input value={name} onChange={setName} placeholder="新家庭名称" />
        <Input
          value={passphrase}
          onChange={setPassphrase}
          placeholder="家庭口令"
          style={{ marginTop: 8 }}
        />
        <Button block color="primary" style={{ marginTop: 12 }} onClick={onCreate}>
          创建家庭
        </Button>
        <Button block style={{ marginTop: 8 }} onClick={onJoin}>
          凭口令加入
        </Button>
        <Button block fill="none" style={{ marginTop: 8 }} onClick={logout}>
          退出登录
        </Button>
      </div>

      <Dialog
        visible={false}
        content="占位"
        onClose={() => undefined}
      />
    </div>
  );
}
