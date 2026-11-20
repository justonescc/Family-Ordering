import { TabBar } from 'antd-mobile';
import { useMemo, useState } from 'react';
import MeTab from '../components/MeTab';
import MealSwitcher from '../components/MealSwitcher';
import MenuTab from '../components/MenuTab';
import MyOrdersTab from '../components/MyOrdersTab';
import SummaryTab from '../components/SummaryTab';
import { useMeals } from '../hooks/useMeals';
import { resolveCurrentMeal } from '../utils/meal';
import { getShanghaiDateStr } from '../utils/meal';
import { useAuthStore } from '../stores/auth';

const TABS = [
  { key: 'menu', title: '菜单' },
  { key: 'mine', title: '我的单' },
  { key: 'summary', title: '总单' },
  { key: 'me', title: '我的' },
];

export default function OrderPage() {
  const { family } = useAuthStore();
  const { meals } = useMeals();
  const [tab, setTab] = useState('menu');
  const [manualMealId, setManualMealId] = useState<string | null>(null);
  const [date] = useState(() => getShanghaiDateStr());

  const autoMeal = useMemo(() => resolveCurrentMeal(meals), [meals]);
  const currentMealId = manualMealId ?? autoMeal?.id ?? meals.find((m) => m.enabled)?.id ?? null;

  return (
    <div className="page">
      <h1 className="page-title">{family?.name}</h1>

      <MealSwitcher
        meals={meals.filter((m) => m.enabled)}
        currentId={currentMealId}
        onSelect={(id) => setManualMealId(id)}
      />

      {currentMealId === null && (
        <div style={{ padding: '8px 16px' }} className="muted">
          当前不在任何餐次时段内，可点上方餐次手动选择
        </div>
      )}

      <div style={{ padding: '0 0 72px' }}>
        {tab === 'menu' && <MenuTab mealId={currentMealId ?? ''} date={date} />}
        {tab === 'mine' && <MyOrdersTab mealId={currentMealId ?? ''} date={date} active={tab === 'mine'} />}
        {tab === 'summary' && (
          <SummaryTab mealId={currentMealId ?? ''} date={date} active={tab === 'summary'} />
        )}
        {tab === 'me' && <MeTab />}
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          paddingBottom: 'var(--safe-bottom)',
        }}
      >
        <TabBar activeKey={tab} onChange={setTab}>
          {TABS.map((item) => (
            <TabBar.Item key={item.key} title={item.title} />
          ))}
        </TabBar>
      </div>
    </div>
  );
}
