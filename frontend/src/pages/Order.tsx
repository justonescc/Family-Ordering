import { TabBar } from 'antd-mobile';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

const TABS = [
  { key: 'menu', title: '菜单' },
  { key: 'mine', title: '我的单' },
  { key: 'summary', title: '总单' },
  { key: 'me', title: '我的' },
];

export default function OrderPage() {
  const navigate = useNavigate();
  const { family, member, logout } = useAuthStore();
  const [active, setActive] = useState('menu');

  return (
    <div className="page">
      <h1 className="page-title">{family?.name}</h1>
      <div style={{ padding: '0 16px' }}>
        <p className="muted">
          {member?.nickname}（{member?.role === 'ADMIN' ? '管理员' : '成员'}）· 阶段 D 完善此页
        </p>
      </div>
      <TabBar activeKey={active} onChange={setActive}>
        {TABS.map((tab) => (
          <TabBar.Item key={tab.key} title={tab.title} />
        ))}
      </TabBar>
      <div style={{ padding: 16 }}>
        <ButtonLike onClick={() => { navigate('/families'); }} label="切换家庭" />
        <ButtonLike
          onClick={() => { logout(); navigate('/login', { replace: true }); }}
          label="退出登录"
        />
      </div>
    </div>
  );
}

function ButtonLike({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: 'block', width: '100%', padding: 12, marginTop: 8 }}
    >
      {label}
    </button>
  );
}
