import { Button, Form, Input } from 'antd-mobile';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setSubmitting(true);
    try {
      const payload = await (mode === 'login'
        ? api.login(username, password)
        : api.register(username, password));
      setSession({
        token: payload.token,
        user: payload.user,
        family: payload.family,
        member: payload.member,
        families: payload.families,
      });
      navigate(payload.family ? '/order' : '/families', { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">家庭点菜</h1>
      <Form layout="vertical" style={{ padding: '0 16px' }}>
        <Form.Item label="用户名">
          <Input value={username} onChange={setUsername} placeholder="请输入用户名" />
        </Form.Item>
        <Form.Item label="密码">
          <Input
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="请输入密码"
          />
        </Form.Item>
        <Button block color="primary" loading={submitting} onClick={onSubmit}>
          {mode === 'login' ? '登录' : '注册'}
        </Button>
        <Button
          block
          fill="none"
          style={{ marginTop: 12 }}
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
        </Button>
      </Form>
    </div>
  );
}
