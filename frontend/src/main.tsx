import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toast, unstableSetRender } from 'antd-mobile';
import App from './App';
import './styles/global.css';

// antd-mobile v5 面向 React 16~18，React 19 移除了 ReactDOM.unmountComponentAtNode。
// 这里用 createRoot 适配其命令式组件（Toast / Dialog / Popup）的挂载与卸载。
unstableSetRender((node, container) => {
  const root = createRoot(container);
  root.render(node);
  return async () => {
    root.unmount();
  };
});

// 命令式 Toast 默认无 aria-live，屏幕阅读器不会播报；同步到视觉隐藏 live 区。
const liveRegion = document.createElement('div');
liveRegion.className = 'sr-only';
liveRegion.setAttribute('role', 'status');
liveRegion.setAttribute('aria-live', 'polite');
document.body.appendChild(liveRegion);
const toastShow = Toast.show.bind(Toast);
Toast.show = (props) => {
  const content = typeof props === 'string' ? props : props.content;
  liveRegion.textContent = typeof content === 'string' ? content : '';
  return toastShow(props);
};

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
