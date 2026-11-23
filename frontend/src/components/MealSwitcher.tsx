import type { Meal } from '../types';

interface Props {
  meals: Meal[];
  currentId: string | null;
  onSelect: (mealId: string) => void;
}

/** 餐次切换：自动判定的当前餐次高亮，也可手动选择 */
export default function MealSwitcher({ meals, currentId, onSelect }: Props) {
  if (meals.length === 0) {
    return (
      <div className="muted page-tip">尚未配置餐次</div>
    );
  }

  return (
    <div className="meal-switcher" role="tablist" aria-label="选择餐次">
      {meals.map((meal) => {
        const active = meal.id === currentId;
        return (
          <button
            key={meal.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`meal-pill${active ? ' meal-pill-active' : ''}`}
            onClick={() => onSelect(meal.id)}
          >
            {meal.name}
            <span className="meal-pill-time">
              {meal.startTime}-{meal.endTime}
            </span>
          </button>
        );
      })}
    </div>
  );
}
