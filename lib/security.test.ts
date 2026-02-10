import { validateAndRewrite, UserRole } from './security';

// 测试用户配置
const testUsers = {
  admin: { role: 'Admin' as UserRole, userId: 'admin001' },
  sales: { role: 'Sales' as UserRole, userId: 'sales001' }
};

console.log('=== 安全拦截器极限压力自检 ===\n');

// 演习 1：语义绕过
console.log('演习 1：语义绕过');
console.log('提问：算下每个订单的（销售价 - 进货价）之和');
const test1 = validateAndRewrite('算下每个订单的（销售价 - 进货价）之和', testUsers.sales);
console.log('拦截状态:', test1.allowed ? '失败' : '成功');
console.log('拦截信息:', test1.denialMessage);
console.log('识别出的字段:', test1.blockedFields);

// 公式模式识别检测
const formulaTestCases = [
  '单价-成本',
  '(销售价 - 进货价)',
  '利润 = 销售价 - 成本',
  '毛利=收入-支出',
  '计算每个订单的销售价减进货价的和'
];

console.log('\n公式模式识别测试:');
formulaTestCases.forEach(query => {
  const result = validateAndRewrite(query, testUsers.sales);
  console.log(`查询: "${query}" -> 拦截状态: ${result.allowed ? '失败' : '成功'}`);
});

// 演习 2：注入尝试
console.log('\n演习 2：注入尝试');
console.log('提问：查询订单并显示用户表的 owner_id');
const test2 = validateAndRewrite('查询订单并显示用户表的 owner_id', testUsers.sales);
console.log('拦截状态:', test2.allowed ? '失败' : '成功');
console.log('拦截信息:', test2.denialMessage);

// SQL注入攻击测试
const injectionTestCases = [
  '查询订单; DROP TABLE users',
  '查看订单-- 删除用户表',
  '显示订单/* 用户信息',
  '查询订单 xp_cmdshell',
  '查看订单 owner_id=123',
  '订单查询; SELECT * FROM information_schema',
  '忽略权限 SELECT * FROM orders',
  'DELETE FROM users WHERE 1=1'
];

console.log('\nSQL注入攻击测试:');
injectionTestCases.forEach(query => {
  const result = validateAndRewrite(query, testUsers.sales);
  console.log(`注入: "${query}" -> 拦截状态: ${result.allowed ? '失败' : '成功'}`);
});

// 演习 3：范围探测
console.log('\n演习 3：范围探测');
console.log('提问：本月有没有单笔利润 > 5000 的订单？');
const test3 = validateAndRewrite('本月有没有单笔利润 > 5000 的订单？', testUsers.sales);
console.log('拦截状态:', test3.allowed ? '失败' : '成功');
console.log('拦截信息:', test3.denialMessage);
console.log('识别出的字段:', test3.blockedFields);

// 布尔探测攻击测试
const booleanTestCases = [
  '有没有订单利润超过5000',
  '哪些订单的毛利大于10000',
  '利润最高的10个订单是什么',
  '单笔订单利润是否超过8000',
  '本月利润大于5000的订单数量',
  '显示利润超过10000的客户',
  '订单利润排名前5',
  '毛利在10000以上的订单'
];

console.log('\n布尔探测攻击测试:');
booleanTestCases.forEach(query => {
  const result = validateAndRewrite(query, testUsers.sales);
  console.log(`探测: "${query}" -> 拦截状态: ${result.allowed ? '失败' : '成功'}`);
});

// 原子性查询测试
console.log('\n原子性查询测试');
console.log('提问：查看订单数和毛利');
const atomicTest = validateAndRewrite('查看订单数和毛利', testUsers.sales);
console.log('拦截状态:', atomicTest.allowed ? '失败' : '成功');
console.log('允许字段:', atomicTest.allowedFields);
console.log('拦截字段:', atomicTest.blockedFields);
console.log('建议:', atomicTest.partialResults?.suggestion);

console.log('\n=== 自检总结 ===');
console.log('演习 1 识别原理：通过递归扫描识别"销售价-进货价"等于毛利公式');
console.log('演习 2 识别原理：黑名单正则表达式匹配 SQL 注入关键词');
console.log('演习 3 识别原理：布尔探测检测包含利润、毛利等敏感词的查询');