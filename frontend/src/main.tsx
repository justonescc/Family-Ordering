import React from 'react';
import { createRoot } from 'react-dom/client';
import { unstableSetRender } from 'antd-mobile';
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

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
