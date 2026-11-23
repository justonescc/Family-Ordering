import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** 空状态：图标 + 标题 + 说明 + 可选操作 */
export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {description && <div className="empty-desc">{description}</div>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
