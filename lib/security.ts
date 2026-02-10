import { readFileSync } from 'fs';
import { join } from 'path';

// 用户角色定义
export type UserRole = 'Admin' | 'Manager' | 'Sales';

// 用户配置接口
export interface UserConfig {
  role: UserRole;
  userId: string;
  username?: string;
  department?: string;
}

// 查询拦截结果
export interface InterceptResult {
  allowed: boolean;
  queryIntent?: string;
  rewrittenQuery?: string;
  sql?: string;
  denialMessage?: string;
  blockedFields?: string[];
  allowedFields?: string[];
  partialResults?: {
    allowedQuery?: string;
    blockedQuery?: string;
    suggestion?: string;
  };
  securityLevel?: 'L0' | 'L1';
}

// 指标权限检查结果
export interface IndicatorPermissionCheck {
  hasL1Access: boolean;
  blockedIndicators: string[];
  allowedIndicators: string[];
  denialMessages: string[];
  partialResults?: {
    allowedQueries: string[];
    blockedQueries: string[];
  };
}

// 加载语义字典
function loadSemanticDictionary() {
  try {
    const dictionaryPath = join(process.cwd(), 'data', 'semantic_dict.json');
    const dictionaryContent = readFileSync(dictionaryPath, 'utf-8');
    return JSON.parse(dictionaryContent);
  } catch (error) {
    throw new Error(`Failed to load semantic dictionary: ${error}`);
  }
}

// 检查用户角色是否有访问 L1 指标的权限
function hasL1Access(userRole: UserRole): boolean {
  return userRole === 'Admin';
}

// 从查询意图中提取涉及的指标
function extractIndicatorsFromQuery(queryIntent: string): string[] {
  const dictionary = loadSemanticDictionary();
  const indicators: string[] = [];
  const queryLower = queryIntent.toLowerCase();

  // 遍历所有指标，检查查询中是否包含指标的同义词
  for (const [key, indicator] of Object.entries(dictionary.indicators)) {
    const synonyms = indicator.synonyms.map(s => s.toLowerCase());

    // 检查查询中是否包含指标名称或同义词
    const indicatorName = indicator.name.toLowerCase();
    if (queryLower.includes(indicatorName) ||
        synonyms.some(syn => queryLower.includes(syn))) {
      indicators.push(key);
    }
  }

  return indicators;
}

// 递归扫描敏感字段 - 新增
function recursivelyScanSensitiveFields(
  queryIntent: string,
  userRole: UserRole,
  scannedFields: Set<string> = new Set()
): string[] {
  const dictionary = loadSemanticDictionary();
  const sensitiveFields: string[] = [];
  const queryLower = queryIntent.toLowerCase();

  // 第一层：直接字段扫描
  const allFields = Object.values(dictionary.indicators).flatMap(ind => ind.fields);

  for (const field of allFields) {
    if (scannedFields.has(field)) continue;

    if (queryLower.includes(field.toLowerCase())) {
      sensitiveFields.push(field);
      scannedFields.add(field);

      // 第二层：查找依赖此字段的 L1 指标
      for (const [indicatorKey, indicator] of Object.entries(dictionary.indicators)) {
        if (indicator.level === 'L1' &&
            indicator.fields.includes(field) &&
            !hasL1Access(userRole)) {
          sensitiveFields.push(`${indicatorKey}(${field})`);
          scannedFields.add(`${indicatorKey}(${field})`);

          // 第三层：递归扫描该指标的其他字段
          for (const depField of indicator.fields) {
            if (!scannedFields.has(depField)) {
              const recursiveFields = recursivelyScanSensitiveFields(
                `包含${depField}的查询`,
                userRole,
                scannedFields
              );
              sensitiveFields.push(...recursiveFields);
            }
          }
        }
      }
    }
  }

  return sensitiveFields;
}

// 解析公式意图 - 新增
function parseFormulaIntent(queryIntent: string): {
  hasFormulaPattern: boolean;
  potentialFormulas: string[];
  relatedL1Indicators: string[];
} {
  const dictionary = loadSemanticDictionary();
  const queryLower = queryIntent.toLowerCase();

  // 公式模式匹配 - 扩展更全面的公式识别
  const formulaPatterns = [
    // 基础算术模式
    /单价\s*[-\+]\s*成本/i,
    /成本\s*[-\+]\s*单价/i,
    /售价\s*[-\+]\s*成本/i,
    /进货\s*[-\+]\s*售价/i,
    /进价\s*[-\+]\s*售价/i,
    // 复杂表达式模式
    /利润\s*=\s*.*[-\+].*/i,
    /毛利\s*=\s*.*[-\+].*/i,
    /收益\s*=\s*.*[-\+].*/i,
    /盈利\s*=\s*.*[-\+].*/i,
    /收入\s*-\s*支出/i,
    /营收\s*-\s*成本/i,
    // 中文表达模式
    /.*(?:赚|亏|赚了|亏了).*\d+.*元/i,
    /.*(?:盈亏).*\d+/i,
    // 特殊组合模式
    /(销售.*?[-\+].*?进货)|(进货.*?[-\+].*?销售)/i,
    /(售价.*?[-\+].*?进价)|(进价.*?[-\+].*?售价)/i
  ];

  const hasFormulaPattern = formulaPatterns.some(pattern => pattern.test(queryIntent));

  // 查找可能的 L1 指标关联
  const relatedL1Indicators: string[] = [];

  // 检查是否包含 L1 指标的字段组合
  for (const [key, indicator] of Object.entries(dictionary.indicators)) {
    if (indicator.level === 'L1') {
      const fieldPattern = indicator.fields.join('|').toLowerCase();
      if (queryLower.includes(fieldPattern)) {
        relatedL1Indicators.push(key);
      }
    }
  }

  return {
    hasFormulaPattern,
    potentialFormulas: extractFormulasFromQuery(queryIntent),
    relatedL1Indicators
  };
}

// 从查询中提取公式 - 新增
function extractFormulasFromQuery(queryIntent: string): string[] {
  const formulas: string[] = [];

  // 匹配常见的数学表达式
  const mathPatterns = [
    /([a-zA-Z0-9\u4e00-\u9fa5]+)\s*[-\+]\s*([a-zA-Z0-9\u4e00-\u9fa5]+)/g,
    /\(.*\s*[-\+]\s*.*\)/g
  ];

  for (const pattern of mathPatterns) {
    let match;
    while ((match = pattern.exec(queryIntent)) !== null) {
      formulas.push(match[0]);
    }
  }

  return formulas;
}

// 检查指标权限
function checkIndicatorPermissions(
  indicators: string[],
  userRole: UserRole
): IndicatorPermissionCheck {
  const hasL1Access = hasL1Access(userRole);
  const blockedIndicators: string[] = [];
  const allowedIndicators: string[] = [];
  const denialMessages: string[] = [];
  const allowedQueries: string[] = [];
  const blockedQueries: string[] = [];

  // 检查每个指标的权限
  indicators.forEach(indicatorKey => {
    const dictionary = loadSemanticDictionary();
    const indicator = dictionary.indicators[indicatorKey];

    if (indicator.level === 'L1' && !hasL1Access) {
      blockedIndicators.push(indicatorKey);
      blockedQueries.push(indicator.name);
      denialMessages.push(indicator.denial_message ||
        `${indicator.name}涉及敏感数据，需 Admin 权限`);
    } else {
      allowedIndicators.push(indicatorKey);
      allowedQueries.push(indicator.name);
    }
  });

  // 处理原子性查询 - 新增
  const partialResults = processAtomicQueries(
    indicators,
    userRole,
    allowedQueries,
    blockedQueries
  );

  // 特殊处理：即使没有明确指标，也要检查变相探测
  if (indicators.length === 0 && !hasL1Access) {
    // 检查是否为变相探测 L1 指标的查询
    const potentialProbes = detectPotentialL1Probing();
    if (potentialProbes.length > 0) {
      blockedIndicators.push(...potentialProbes);
      blockedQueries.push(...potentialProbes);
      denialMessages.push('检测到敏感数据探测行为');
    }
  }

  return {
    hasL1Access,
    blockedIndicators,
    allowedIndicators,
    denialMessages,
    partialResults: partialResults ? {
      allowedQueries,
      blockedQueries
    } : undefined
  };
}

// 检测潜在的 L1 指标探测 - 新增
function detectPotentialL1Probing(): string[] {
  // 这里可以添加更复杂的探测检测逻辑
  // 例如：查看用户是否在尝试通过间接方式获取 L1 数据
  return [];
}

// 处理原子性查询 - 新增
function processAtomicQueries(
  indicators: string[],
  userRole: UserRole,
  allowedQueries: string[],
  blockedQueries: string[]
): boolean {
  // 如果同时存在允许和禁止的查询，启用原子性处理
  const hasBoth = allowedQueries.length > 0 && blockedQueries.length > 0;

  if (hasBoth) {
    console.log(`原子性查询处理: 允许查询 ${allowedQueries.join(', ')}, 禁止查询 ${blockedQueries.join(', ')}`);
    return true;
  }

  return false;
}

// 检查查询中是否包含敏感字段
function containsSensitiveFields(queryIntent: string, userRole: UserRole): string[] {
  // 使用新的递归扫描函数
  const recursivelyDetected = recursivelyScanSensitiveFields(queryIntent, userRole);

  // 检查公式意图
  const formulaIntent = parseFormulaIntent(queryIntent);

  // 如果检测到公式模式，且涉及 L1 指标
  if (formulaIntent.hasFormulaPattern && formulaIntent.relatedL1Indicators.length > 0) {
    return [
      ...recursivelyDetected,
      ...formulaIntent.relatedL1Indicators.map(ind => `${ind}(formula)`),
      'formula_intent_detected'
    ];
  }

  return recursivelyDetected;
}

// 检查并防止 SQL 注入
function validateAgainstSQLInjection(queryIntent: string): boolean {
  // 黑名单关键词 - 扩展更全面的注入防护
  const blacklistedPatterns = [
    // 基础 SQL 注入
    /;\s*(drop|delete|update|insert|alter|create|truncate|exec|execute)/i,
    /--/,
    /\/\*/,
    /\*\//,
    /xp_/,
    /sys\./,
    /information_schema/i,
    /master\./,
    /tempdb\./,
    /msdb\./,
    // 注入尝试
    /owner_id/i,
    /ownerid/i,
    /user_id/i,
    /userid/i,
    /concat/i,
    /union/i,
    /select\s+.*\s+from/i,
    /;\s*select/i,
    /;\s*insert/i,
    /;\s*update/i,
    /;\s*delete/i,
    // 绕过尝试
    /ignore\s+permission/i,
    /bypass\s+security/i,
    /hack/i,
    /drop\s+table/i,
    /delete\s+from/i,
    // 编码尝试
    /char\s*\(/i,
    /ascii/i,
    /unicode/i,
    /hex/i,
    /base64/i
  ];

  for (const pattern of blacklistedPatterns) {
    if (pattern.test(queryIntent)) {
      return false;
    }
  }

  return true;
}

// 检查时间维度约束
function validateTimeDimension(queryIntent: string): { hasTimeConstraint: boolean; suggestedRange?: string } {
  const timePatterns = [
    /今天|昨天|本周|本月|上月|近\d+天|本季度|本年度/i,
    /last\s+\d+\s+days?|this\s+month|last\s+month/i
  ];

  const hasTimeConstraint = timePatterns.some(pattern => pattern.test(queryIntent));

  if (!hasTimeConstraint) {
    return {
      hasTimeConstraint: false,
      suggestedRange: '近30天'
    };
  }

  return { hasTimeConstraint: true };
}

// 重写查询意图，添加安全约束
function rewriteQueryIntent(
  queryIntent: string,
  userConfig: UserConfig
): { rewrittenQuery: string; securityLog: string } {
  let rewrittenQuery = queryIntent;
  const securityLog: string[] = [];

  // 1. 注入行级权限过滤
  if (userConfig.role !== 'Admin') {
    rewrittenQuery = `仅查询用户 ${userConfig.userId} 名下的数据：${queryIntent}`;
    securityLog.push(`已注入行级权限过滤：owner_id = ${userConfig.userId}`);
  }

  // 2. 检查并替换敏感字段
  const sensitiveFields = containsSensitiveFields(queryIntent, userConfig.role);
  if (sensitiveFields.length > 0) {
    securityLog.push(`检测到敏感字段访问：${sensitiveFields.join(', ')}`);
    // 这里可以添加字段替换逻辑
  }

  // 3. 添加时间维度（如果缺失）
  const timeCheck = validateTimeDimension(queryIntent);
  if (!timeCheck.hasTimeConstraint) {
    rewrittenQuery = `默认时间范围（${timeCheck.suggestedRange}）：${rewrittenQuery}`;
    securityLog.push(`已添加默认时间范围：${timeCheck.suggestedRange}`);
  }

  return {
    rewrittenQuery,
    securityLog: securityLog.join('; ')
  };
}

// 身份验证接口
export interface AuthContext {
  sessionId: string;
  userId: string;
  role: UserRole;
  issuedAt: number;
  expiresAt: number;
}

// 从请求中提取身份上下文 - 新增
function extractAuthContextFromRequest(request: any): AuthContext {
  // 这里应该从 HTTP 请求的 header 中提取 sessionId
  // 然后从 Session Store 中验证并获取用户信息
  // 防止前端直接传递 userId

  const sessionId = request.headers['x-session-id'];
  if (!sessionId) {
    throw new Error('Missing session ID');
  }

  // TODO: 实现从 Redis/Database 中验证 sessionId 并获取用户信息
  // 这里只是示例
  return {
    sessionId,
    userId: 'demo-user-id', // 应该从 Session 中获取
    role: 'Sales', // 应该从 Session 中获取
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000 // 1小时过期
  };
}

// 验证身份上下文 - 新增
function validateAuthContext(authContext: AuthContext): boolean {
  const now = Date.now();

  // 检查过期时间
  if (now > authContext.expiresAt) {
    return false;
  }

  // TODO: 实现 Session 验证逻辑
  return true;
}

// 创建安全用户配置 - 新增
function createSecureUserConfig(authContext: AuthContext): UserConfig {
  // 确保用户配置来自可信的上下文
  return {
    role: authContext.role,
    userId: authContext.userId,
    username: `User_${authContext.userId}`,
    department: 'Default'
  };
}

// 主拦截器函数 - 重写实现原子性处理
export function validateAndRewrite(
  queryIntent: string,
  currentUser: UserConfig
): InterceptResult {
  const securityLog: string[] = [];

  try {
    // 1. 基础安全检查 - SQL 注入防护
    if (!validateAgainstSQLInjection(queryIntent)) {
      return {
        allowed: false,
        denialMessage: '查询包含不安全的内容，已被系统拦截',
        securityLevel: 'L1'
      };
    }

    securityLog.push('SQL 注入检查通过');

    // 2. 检查查询涉及的指标
    const indicators = extractIndicatorsFromQuery(queryIntent);
    securityLog.push(`检测到查询涉及指标：${indicators.join(', ') || '无具体指标'}`);

    // 3. 检查指标权限
    const permissionCheck = checkIndicatorPermissions(indicators, currentUser.role);
    securityLog.push(`权限检查结果：L1访问=${permissionCheck.hasL1Access}, 允许指标=${permissionCheck.allowedIndicators.join(', ')}`);

    // 4. 处理敏感字段检测（递归扫描）
    const sensitiveFields = containsSensitiveFields(queryIntent, currentUser.role);
    securityLog.push(`敏感字段检测：${sensitiveFields.join(', ') || '无敏感字段'}`);

    // 5. 处理原子性查询 - 新增
    if (permissionCheck.partialResults) {
      const { allowedQueries, blockedQueries } = permissionCheck.partialResults;

      // 如果同时存在允许和禁止的查询
      if (allowedQueries.length > 0 && blockedQueries.length > 0) {
        return {
          allowed: true, // 允许部分查询
          queryIntent,
          rewrittenQuery: `安全查询：仅处理 ${allowedQueries.join(', ')}，已屏蔽 ${blockedQueries.join(', ')}`,
          allowedFields: allowedQueries,
          blockedFields: blockedQueries,
          partialResults: {
            allowedQuery: `允许查询：${allowedQueries.join('、')}`,
            blockedQuery: `已屏蔽：${blockedQueries.join('、')}`,
            suggestion: `建议仅查询 ${allowedQueries.join('、')} 等公开指标`
          },
          securityLevel: 'L0'
        };
      }
    }

    // 6. 如果完全被拦截
    if (permissionCheck.blockedIndicators.length > 0 || sensitiveFields.length > 0) {
      const denialMessage = permissionCheck.denialMessages.join('；');

      // 如果是公式意图检测
      if (sensitiveFields.includes('formula_intent_detected')) {
        return {
          allowed: false,
          queryIntent,
          blockedFields: permissionCheck.blockedIndicators,
          denialMessage: `检测到变相计算敏感数据的意图：${denialMessage}`,
          partialResults: {
            suggestion: '如需查看相关数据，请申请 Admin 权限'
          },
          securityLevel: 'L1'
        };
      }

      return {
        allowed: false,
        queryIntent,
        blockedFields: permissionCheck.blockedIndicators,
        denialMessage,
        securityLevel: 'L1'
      };
    }

    // 7. 重写查询意图，添加安全约束
    const { rewrittenQuery, securityLog: rewriteLog } = rewriteQueryIntent(queryIntent, currentUser);
    securityLog.push(rewriteLog);

    // 8. 返回允许的查询结果
    return {
      allowed: true,
      queryIntent: rewrittenQuery,
      rewrittenQuery,
      securityLevel: 'L0'
    };

  } catch (error) {
    console.error('Security validation error:', error);
    return {
      allowed: false,
      queryIntent,
      denialMessage: '系统验证时发生错误，请检查查询内容',
      securityLevel: 'L1'
    };
  }
}

// 安全拦截器类（用于高级功能）
export class SecurityInterceptor {
  private currentUser: UserConfig;

  constructor(currentUser: UserConfig) {
    this.currentUser = currentUser;
  }

  // 在 SQL 生成前强制拦截
  public interceptBeforeSQLGeneration(queryIntent: string): InterceptResult {
    return validateAndRewrite(queryIntent, this.currentUser);
  }

  // 获取安全日志
  public getSecurityLog(queryIntent: string): string[] {
    const result = this.interceptBeforeSQLGeneration(queryIntent);
    return [
      `用户: ${this.currentUser.username || this.currentUser.userId}`,
      `角色: ${this.currentUser.role}`,
      `查询: ${queryIntent}`,
      `结果: ${result.allowed ? '允许' : '拒绝'}`,
      ...(result.denialMessage ? [`拒绝原因: ${result.denialMessage}`] : []),
      `时间: ${new Date().toISOString()}`
    ];
  }

  // 批量检查多个查询意图
  public batchCheckQueries(queryIntents: string[]): InterceptResult[] {
    return queryIntents.map(query => this.interceptBeforeSQLGeneration(query));
  }
}

// 安全重写 SQL，注入 owner_id 条件
export function rewriteSQLWithOwnerID(sql: string, userId: string): string {
  // 检查是否已经包含 owner_id 条件
  if (sql.includes(`owner_id = '${userId}'`) || sql.includes(`owner_id = \"${userId}\"`)) {
    return sql; // 已经包含 owner_id，无需重写
  }

  let rewrittenSQL = sql;

  // 情况 1：SQL 包含 WHERE 子句
  if (sql.includes('WHERE')) {
    // 确保多个 WHERE 子句不会重复
    rewrittenSQL = sql.replace(/WHERE\s+/, `WHERE owner_id = '${userId}' AND `);
  }
  // 情况 2：SQL 包含 GROUP BY 或 ORDER BY 但没有 WHERE
  else if (sql.includes('GROUP BY') || sql.includes('ORDER BY')) {
    // 在 GROUP BY 或 ORDER BY 之前插入 WHERE
    rewrittenSQL = sql.replace(/(GROUP BY|ORDER BY)/, `WHERE owner_id = '${userId}' $1`);
  }
  // 情况 3：SQL 只有 SELECT 和 FROM
  else {
    // 在 FROM 之后添加 WHERE
    rewrittenSQL = sql.replace(/FROM\s+([^\s]+)\s*/, `FROM $1 WHERE owner_id = '${userId}' `);
  }

  return rewrittenSQL;
}

// 快速权限检查函数
export function quickPermissionCheck(userRole: UserRole, queryIntent: string): {
  canProceed: boolean;
  reason?: string;
} {
  const indicators = extractIndicatorsFromQuery(queryIntent);
  const permissionCheck = checkIndicatorPermissions(indicators, userRole);

  if (permissionCheck.blockedIndicators.length > 0) {
    return {
      canProceed: false,
      reason: permissionCheck.denialMessages.join('；')
    };
  }

  return { canProceed: true };
}

// 导出默认实例
export const defaultSecurityInterceptor = new SecurityInterceptor({
  role: 'Admin',
  userId: 'system',
  username: 'System'
});