import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { passphraseKey } from '../src/utils/passphrase';

const prisma = new PrismaClient();

const CATEGORIES: { name: string; sort: number; dishes: { name: string; description?: string }[] }[] = [
  {
    name: '荤菜',
    sort: 1,
    dishes: [
      { name: '红烧肉', description: '肥而不腻，入口即化' },
      { name: '宫保鸡丁', description: '微辣，下饭' },
      { name: '鱼香肉丝', description: '酸甜微辣' },
      { name: '糖醋排骨', description: '酸甜开胃' },
      { name: '可乐鸡翅', description: '孩子最爱' },
      { name: '水煮鱼', description: '麻辣鲜香' },
    ],
  },
  {
    name: '素菜',
    sort: 2,
    dishes: [
      { name: '地三鲜', description: '土豆茄子青椒' },
      { name: '麻婆豆腐', description: '麻辣嫩滑' },
      { name: '清炒时蔬', description: '当季绿叶菜' },
      { name: '西红柿炒蛋', description: '经典家常菜' },
      { name: '蒜蓉西兰花', description: '清爽健康' },
      { name: '干煸豆角', description: '咸香下饭' },
    ],
  },
  {
    name: '汤羹',
    sort: 3,
    dishes: [
      { name: '紫菜蛋花汤', description: '快手汤' },
      { name: '番茄牛腩汤', description: '酸甜浓郁' },
      { name: '冬瓜排骨汤', description: '清热解腻' },
      { name: '玉米排骨汤', description: '清甜可口' },
    ],
  },
  {
    name: '主食',
    sort: 4,
    dishes: [
      { name: '米饭', description: '五常大米' },
      { name: '馒头', description: '手工老面' },
      { name: '面条', description: '手擀面' },
      { name: '饺子', description: '猪肉白菜馅' },
    ],
  },
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('demo1234', 10);
  const passphraseHash = await bcrypt.hash('family123', 10);

  // 全局账号
  const [dad, mom, kid] = await Promise.all(
    [
      { username: 'dad', nickname: '爸爸', avatar: '👨' },
      { username: 'mom', nickname: '妈妈', avatar: '👩' },
      { username: 'kid', nickname: '小明', avatar: '👦' },
    ].map((u) =>
      prisma.user.upsert({
        where: { username: u.username },
        create: { username: u.username, passwordHash },
        update: {},
      }),
    ),
  );

  // 家庭
  const family = await prisma.family.upsert({
    where: { passphraseKey: passphraseKey('family123') },
    create: { name: '示例家庭', passphraseKey: passphraseKey('family123'), passphraseHash },
    update: { name: '示例家庭' },
  });

  // 成员档案
  const memberSeeds = [
    { user: dad, nickname: '爸爸', avatar: '👨', role: 'ADMIN' as const },
    { user: mom, nickname: '妈妈', avatar: '👩', role: 'MEMBER' as const },
    { user: kid, nickname: '小明', avatar: '👦', role: 'MEMBER' as const },
  ];
  for (const seed of memberSeeds) {
    await prisma.familyMember.upsert({
      where: { familyId_userId: { familyId: family.id, userId: seed.user.id } },
      create: {
        familyId: family.id,
        userId: seed.user.id,
        nickname: seed.nickname,
        avatar: seed.avatar,
        role: seed.role,
      },
      update: { nickname: seed.nickname, avatar: seed.avatar },
    });
  }

  // 餐次
  const meals = [
    { name: '午餐', startTime: '11:00', endTime: '14:59', sort: 1 },
    { name: '晚餐', startTime: '17:00', endTime: '21:59', sort: 2 },
  ];
  for (const meal of meals) {
    const existing = await prisma.meal.findFirst({
      where: { familyId: family.id, name: meal.name },
    });
    if (existing) {
      await prisma.meal.update({
        where: { id: existing.id },
        data: { startTime: meal.startTime, endTime: meal.endTime, enabled: true },
      });
    } else {
      await prisma.meal.create({ data: { familyId: family.id, ...meal } });
    }
  }

  // 分类 + 菜品
  for (const cat of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { familyId_name: { familyId: family.id, name: cat.name } },
      create: { familyId: family.id, name: cat.name, sort: cat.sort },
      update: { sort: cat.sort },
    });

    for (const dish of cat.dishes) {
      await prisma.dish.upsert({
        where: {
          familyId_categoryId_name: {
            familyId: family.id,
            categoryId: category.id,
            name: dish.name,
          },
        },
        create: {
          familyId: family.id,
          categoryId: category.id,
          name: dish.name,
          description: dish.description ?? null,
        },
        update: { description: dish.description ?? null, enabled: true },
      });
    }
  }

  console.log('种子数据完成：');
  console.log('  家庭口令: family123');
  console.log('  演示账号: dad / mom / kid，密码均为 demo1234');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
