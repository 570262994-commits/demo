import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始生成 Mock 数据...');

  // 创建两个不同角色的负责人
  const adminUser = await prisma.customer.create({
    data: {
      name: '管理员',
      ownerId: 'admin001',
      region: '全国',
    },
  });

  const salesUser1 = await prisma.customer.create({
    data: {
      name: '销售张三',
      ownerId: 'sales001',
      region: '华东',
    },
  });

  const salesUser2 = await prisma.customer.create({
    data: {
      name: '销售李四',
      ownerId: 'sales002',
      region: '华北',
    },
  });

  // 为销售张三创建订单和财务记录
  const order1 = await prisma.order.create({
    data: {
      customerId: salesUser1.id,
      productName: '产品A',
      quantity: 10,
      unitPrice: 10000, // 100元 = 10000分
      costPrice: 7000,   // 70元 = 7000分
      ownerId: 'sales001',
      orderDate: new Date('2024-01-15'),
    },
  });

  const order2 = await prisma.order.create({
    data: {
      customerId: salesUser1.id,
      productName: '产品B',
      quantity: 5,
      unitPrice: 20000, // 200元 = 20000分
      costPrice: 15000, // 150元 = 15000分
      ownerId: 'sales001',
      orderDate: new Date('2024-01-20'),
    },
  });

  // 为销售李四创建订单
  const order3 = await prisma.order.create({
    data: {
      customerId: salesUser2.id,
      productName: '产品C',
      quantity: 8,
      unitPrice: 15000, // 150元 = 15000分
      costPrice: 10000, // 100元 = 10000分
      ownerId: 'sales002',
      orderDate: new Date('2024-01-18'),
    },
  });

  // 创建财务记录 - 欠款（增加债务）
  await prisma.finance.create({
    data: {
      customerId: salesUser1.id,
      amount: 50000, // 500元 = 50000分
      type: 'DEBT', // 欠款，增加债务
      ownerId: 'sales001',
      date: new Date('2024-01-16'),
    },
  });

  // 创建财务记录 - 还款（减少债务）
  await prisma.finance.create({
    data: {
      customerId: salesUser1.id,
      amount: 30000, // 300元 = 30000分
      type: 'REPAY', // 还款，减少债务
      ownerId: 'sales001',
      date: new Date('2024-01-25'),
    },
  });

  // 为销售李四创建欠款记录
  await prisma.finance.create({
    data: {
      customerId: salesUser2.id,
      amount: 80000, // 800元 = 80000分
      type: 'DEBT', // 欠款
      ownerId: 'sales002',
      date: new Date('2024-01-19'),
    },
  });

  console.log('✅ Mock 数据生成完成！');
  console.log('\n📊 数据摘要:');
  console.log(`- 管理员用户: ${adminUser.name} (ID: ${adminUser.ownerId})`);
  console.log(`- 销售用户1: ${salesUser1.name} (ID: ${salesUser1.ownerId})`);
  console.log(`  - 订单数: 2`);
  console.log(`  - 欠款: 500分 | 还款: 300分`);
  console.log(`- 销售用户2: ${salesUser2.name} (ID: ${salesUser2.ownerId})`);
  console.log(`  - 订单数: 1`);
  console.log(`  - 欠款: 800分`);
  console.log('\n🎯 演示要点:');
  console.log('1. 切换到 Sales 身份只能看到自己的数据');
  console.log('2. 管理员可以看到所有数据');
  console.log('3. 欠款(DEBT)增加债务，还款(REPAY)减少债务');
}

main()
  .catch((e) => {
    console.error('❌ 生成数据失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });