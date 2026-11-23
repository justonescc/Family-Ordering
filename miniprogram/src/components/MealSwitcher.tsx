import { ScrollView, Text, View } from '@tarojs/components';

import type { Meal } from '../types';

interface Props {
  meals: Meal[];
  currentId: string | null;
  onSelect: (mealId: string) => void;
}

/** 餐次切换胶囊：自动判定的当前餐次高亮，也可手动选择（对齐 H5 MealSwitcher） */
export default function MealSwitcher({ meals, currentId, onSelect }: Props) {
  if (meals.length === 0) {
    return <View className='muted page-tip'>尚未配置餐次</View>;
  }

  return (
    <ScrollView className='meal-switcher' scrollX enhanced showScrollbar={false}>
      <View className='meal-switcher-inner'>
        {meals.map((meal) => {
          const active = meal.id === currentId;
          return (
            <View
              key={meal.id}
              className={`meal-pill${active ? ' meal-pill-active' : ''}`}
              onClick={() => onSelect(meal.id)}
            >
              <Text className='meal-pill-name'>{meal.name}</Text>
              <Text className='meal-pill-time'>
                {meal.startTime}-{meal.endTime}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
