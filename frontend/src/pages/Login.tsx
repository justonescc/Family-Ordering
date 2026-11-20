import { Button, Form, Input, Toast } from 'antd-mobile';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import type { AuthPayload } from '../types';

async function pickFamily(payload: AuthPayload): Promise<AuthPayload> {
  if (payload.family || payload.families.length === 0) return payload;
  if (payload.families.length === 1) {
    return api.enterFamily(payload.families[0].id);
  }
  return payload;
}

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
        ? api.login(username.trim(), password)
        : api.register(username.trim(), password));
      const resolved = await pickFamily(payload);
      setSession({
        token: resolved.token,
        user: resolved.user,
        family: resolved.family,
        member: resolved.member,
        families: resolved.families,
      });
      navigate(resolved.family ? '/order' : '/families', { replace: true });
    } catch (error) {
      Toast.show({ content: (error as Error).message });
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
