import { TabBar } from 'antd-mobile';
import { useMemo, useState } from 'react';
import MeTab from '../components/MeTab';
import MealSwitcher from '../components/MealSwitcher';
import MenuTab from '../components/MenuTab';
import MyOrdersTab from '../components/MyOrdersTab';
import SummaryTab from '../components/SummaryTab';
import { IconMe, IconMenu, IconMyOrder, IconSummary } from '../components/icons';
import { useMeals } from '../hooks/useMeals';
import { resolveCurrentMeal } from '../utils/meal';
import { getShanghaiDateStr } from '../utils/meal';
import { useAuthStore } from '../stores/auth';

const TABS = [
  { key: 'menu', title: '菜单', icon: <IconMenu /> },
  { key: 'mine', title: '我的单', icon: <IconMyOrder /> },
  { key: 'summary', title: '总单', icon: <IconSummary /> },
  { key: 'me', title: '我的', icon: <IconMe /> },
];

export default function OrderPage() {
  const { family } = useAuthStore();
  const { meals } = useMeals();
  const [tab, setTab] = useState('menu');
  const [manualMealId, setManualMealId] = useState<string | null>(null);
  const [date] = useState(() => getShanghaiDateStr());

  const autoMeal = useMemo(() => resolveCurrentMeal(meals), [meals]);
  const currentMealId = manualMealId ?? autoMeal?.id ?? meals.find((m) => m.enabled)?.id ?? null;

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('zh-CN', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      }).format(new Date(`${date}T00:00:00+08:00`)),
    [date],
  );

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header-title">{family?.name ?? '家庭点菜'}</h1>
        <p className="page-header-sub">{dateLabel}</p>
      </header>

      <MealSwitcher
        meals={meals.filter((m) => m.enabled)}
        currentId={currentMealId}
        onSelect={(id) => setManualMealId(id)}
      />

      {currentMealId === null && <div className="muted page-tip">当前不在任何餐次时段内，可点上方餐次手动选择</div>}

      <div>
        {tab === 'menu' && <MenuTab mealId={currentMealId ?? ''} date={date} />}
        {tab === 'mine' && <MyOrdersTab mealId={currentMealId ?? ''} date={date} active={tab === 'mine'} />}
        {tab === 'summary' && (
          <SummaryTab mealId={currentMealId ?? ''} date={date} active={tab === 'summary'} />
        )}
        {tab === 'me' && <MeTab />}
      </div>

      <div className="tabbar-wrap">
        <TabBar activeKey={tab} onChange={setTab}>
          {TABS.map((item) => (
            <TabBar.Item key={item.key} title={item.title} icon={item.icon} />
          ))}
        </TabBar>
      </div>
    </div>
  );
}
