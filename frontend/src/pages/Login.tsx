import { Button, Form, Input, Toast } from 'antd-mobile';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBowl } from '../components/icons';
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
        ? api.login(username.trim(), password)
        : api.register(username.trim(), password));

      // 先把登录态写入 store（token 会被持久化，后续请求才能带上）
      setSession({
        token: payload.token,
        user: payload.user,
        family: payload.family,
        member: payload.member,
        families: payload.families,
      });

      if (payload.family) {
        navigate('/order', { replace: true });
        return;
      }
      if (payload.families.length === 1) {
        // 只有一个家庭时自动进入
        const entered = await api.enterFamily(payload.families[0].id);
        useAuthStore.getState().setCurrentFamily(entered.family!, entered.member!, entered.token);
        navigate('/order', { replace: true });
        return;
      }
      navigate('/families', { replace: true });
    } catch (error) {
      Toast.show({ content: (error as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="brand">
        <div className="brand-logo">
          <IconBowl size={40} />
        </div>
        <div className="brand-title">家庭点菜</div>
        <div className="brand-sub">多人点菜 · 实时汇总</div>
      </div>

      <div className="auth-card">
        <Form layout="vertical">
          <Form.Item label="用户名">
            <Input
              value={username}
              onChange={setUsername}
              placeholder="请输入用户名"
              name="username"
              autoComplete="username"
            />
          </Form.Item>
          <Form.Item label="密码">
            <Input
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="请输入密码"
              name="password"
              autoComplete="current-password"
            />
          </Form.Item>
          <Button block color="primary" loading={submitting} onClick={onSubmit}>
            {mode === 'login' ? '登录' : '注册'}
          </Button>
          <Button
            block
            fill="none"
            className="mt-3"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
          </Button>
        </Form>
      </div>
    </div>
  );
}
