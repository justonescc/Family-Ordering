import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** 统一线性图标：24 网格、1.8 描边、圆角端点，颜色跟随 currentColor */
function Svg({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** 品牌标识：一碗饭 + 一双筷子 */
export function IconBowl(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12h16" />
      <path d="M6 12a6 6 0 0 0 12 0" />
      <path d="M12 18v2" />
      <path d="M9 20h6" />
      <path d="M9 6.5 15.5 4.5" />
    </Svg>
  );
}

/** 菜单 */
export function IconMenu(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
    </Svg>
  );
}

/** 我的点餐单：带勾的清单 */
export function IconMyOrder(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1-1.5z" />
      <path d="M14.5 3.5V8H19" />
      <path d="M8.5 13.5l2 2 4-4" />
    </Svg>
  );
}

/** 总单：剪贴板汇总 */
export function IconSummary(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="6.5" width="14" height="14" rx="2" />
      <path d="M9 6.5V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </Svg>
  );
}

/** 我的 */
export function IconMe(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </Svg>
  );
}

/** 加载失败 */
export function IconError(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v4.5" />
      <path d="M12 15.5v.01" />
    </Svg>
  );
}
