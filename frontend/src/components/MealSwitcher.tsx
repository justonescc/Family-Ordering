import { Tag } from 'antd-mobile';
import type { Meal } from '../types';

interface Props {
  meals: Meal[];
  currentId: string | null;
  onSelect: (mealId: string) => void;
}

/** 餐次切换：自动判定的当前餐次高亮，也可手动选择 */
export default function MealSwitcher({ meals, currentId, onSelect }: Props) {
  if (meals.length === 0) {
    return <div style={{ padding: '8px 16px' }} className="muted">尚未配置餐次</div>;
  }

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 16px' }}>
      {meals.map((meal) => (
        <Tag
          key={meal.id}
          color={meal.id === currentId ? 'primary' : 'default'}
          fill="outline"
          style={{ flexShrink: 0, cursor: 'pointer' }}
          onClick={() => onSelect(meal.id)}
        >
          {meal.name}
          <span style={{ marginLeft: 4, opacity: 0.7 }}>
            {meal.startTime}-{meal.endTime}
          </span>
        </Tag>
      ))}
    </div>
  );
}
