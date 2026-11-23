interface Props {
  /** 骨架行数 */
  rows?: number;
  /** 是否显示标题占位 */
  withTitle?: boolean;
}

/** 列表骨架屏：加载占位；微光动画遵循 prefers-reduced-motion */
export default function ListSkeleton({ rows = 4, withTitle = true }: Props) {
  return (
    <div className="adm-card skeleton-card" aria-busy="true" aria-hidden="true">
      {withTitle && <div className="skeleton skeleton-title" />}
      <div>
        {Array.from({ length: rows }).map((_, i) => (
          <div className="skeleton-row" key={i}>
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-circle" />
          </div>
        ))}
      </div>
    </div>
  );
}
