import { Button, Card, Input, Toast } from 'antd-mobile';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

const AVATARS = ['😊', '😄', '😎', '👨', '👩', '👦', '👧', '🧓', '👵', '🐱', '🐶', '🐼', '🦊', '🐸', '🐯', '🐷'];

export default function MeTab() {
  const navigate = useNavigate();
  const { family, member, user, setCurrentFamily, logout } = useAuthStore();
  const [nickname, setNickname] = useState(member?.nickname ?? '');
  const [avatar, setAvatar] = useState(member?.avatar ?? '😊');
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    setSaving(true);
    try {
      const updated = await api.updateMyProfile({ nickname: nickname.trim(), avatar });
      if (family) setCurrentFamily(family, updated, useAuthStore.getState().token ?? '');
      Toast.show({ content: '已保存' });
    } catch (error) {
      Toast.show({ content: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  function logoutAndGo() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div>
      <Card title="当前家庭">
        <div style={{ marginBottom: 8 }}>{family?.name}</div>
        <div className="muted">
          {user?.username} · {member?.role === 'ADMIN' ? '管理员' : '成员'}
        </div>
      </Card>

      <Card title="我在本家庭的昵称">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {AVATARS.map((item) => (
            <span
              key={item}
              onClick={() => setAvatar(item)}
              style={{
                fontSize: 24,
                padding: 6,
                borderRadius: 8,
                border: avatar === item ? '2px solid var(--color-primary)' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {item}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input value={nickname} onChange={setNickname} placeholder="昵称" style={{ flex: 1 }} />
          <Button color="primary" disabled={saving || !nickname.trim()} onClick={saveProfile}>
            保存
          </Button>
        </div>
      </Card>

      {member?.role === 'ADMIN' && (
        <Card title="家庭管理">
          <Button block style={{ marginBottom: 8 }} onClick={() => navigate('/admin/menu')}>
            菜品与分类
          </Button>
          <Button block style={{ marginBottom: 8 }} onClick={() => navigate('/admin/meals')}>
            餐次设置
          </Button>
          <Button block onClick={() => navigate('/admin/members')}>
            成员与权限
          </Button>
        </Card>
      )}

      <div style={{ padding: '8px 16px' }}>
        <Button block style={{ marginBottom: 8 }} onClick={() => navigate('/families')}>
          切换家庭
        </Button>
        <Button block fill="outline" color="danger" onClick={logoutAndGo}>
          退出登录
        </Button>
      </div>
    </div>
  );
}
