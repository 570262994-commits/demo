import { Request } from 'express';

export interface SecurityConfig {
  role: 'Admin' | 'Manager' | 'Sales';
  permissions: {
    dataAccess: string[];
    fieldLevel: Record<string, 'L0' | 'L1'>;
    rowFilter?: string;
  };
}

export interface InterceptResult {
  query: string;
  allowed: boolean;
  reason?: string;
}

export class SecurityInterceptor {
  /**
   * 从 Header 中提取用户身份
   */
  public extractUserId(request: Request): string {
    const userId = request.headers['x-user-id'] as string;

    if (!userId) {
      throw new Error('Missing required header: x-user-id');
    }

    // 基本格式验证
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(userId)) {
      throw new Error('Invalid user ID format');
    }

    return userId;
  }

  /**
   * 拦截 SQL 查询意图
   */
  public interceptQueryIntent(
    queryIntent: string,
    user: SecurityConfig
  ): InterceptResult {
    // 1. L1 字段权限检查
    if (this.containsL1Fields(queryIntent) && user.role !== 'Admin') {
      return {
        query: '',
        allowed: false,
        reason: 'Access denied: L1 fields require Admin role'
      };
    }

    // 2. 强制注入 owner_id 过滤条件
    const injectedQuery = this.injectRowFilter(queryIntent, user.permissions);

    // 3. 时间维度检查
    const queryWithTime = this.enforceTimeConstraint(injectedQuery);

    return {
      query: queryWithTime,
      allowed: true
    };
  }

  /**
   * 检查是否包含 L1 字段
   */
  private containsL1Fields(query: string): boolean {
    const l1Fields = ['costPrice', 'profit', 'margin'];
    return l1Fields.some(field =>
      query.toLowerCase().includes(field.toLowerCase())
    );
  }

  /**
   * 注入行级权限过滤
   */
  private injectRowFilter(query: string, permissions: SecurityConfig['permissions']): string {
    const ownerId = permissions.rowFilter || '';

    // 如果查询中没有 WHERE 子句，添加 WHERE
    if (!query.toLowerCase().includes('where')) {
      return `${query} WHERE owner_id = '${ownerId}'`;
    }

    // 如果有 WHERE 子句，添加 AND
    return `${query} AND owner_id = '${ownerId}'`;
  }

  /**
   * 强制时间维度约束
   */
  private enforceTimeConstraint(query: string): string {
    if (!this.hasTimeConstraint(query)) {
      // 默认添加近30天的约束
      if (query.toLowerCase().includes('where')) {
        return `${query} AND created_at >= date('now', '-30 days')`;
      } else {
        return `${query} WHERE created_at >= date('now', '-30 days')`;
      }
    }
    return query;
  }

  /**
   * 检查是否包含时间约束
   */
  private hasTimeConstraint(query: string): boolean {
    const timeKeywords = [
      'where.*created_at',
      'where.*order_date',
      'where.*date',
      'where.*today',
      'where.*yesterday',
      'where.*this_week',
      'where.*this_month',
      'where.*last_week',
      'where.*last_month'
    ];

    return timeKeywords.some(pattern =>
      new RegExp(pattern, 'i').test(query)
    );
  }

  /**
   * 生成安全的 SQL 查询，包含 Null 值处理
   */
  public generateSecureSQL(naturalQuery: string, user: SecurityConfig): string {
    const intercepted = this.interceptQueryIntent(naturalQuery, user);

    if (!intercepted.allowed) {
      throw new Error(intercepted.reason);
    }

    // 应用 Null 值处理
    let secureSQL = intercepted.query;

    // 为金额字段添加 COALESCE
    secureSQL = this.handleNullValues(secureSQL);

    return secureSQL;
  }

  /**
   * 处理 Null 值
   */
  private handleNullValues(sql: string): string {
    // 为计算字段添加 COALESCE
    const nullPatterns = [
      '(quantity \\* unitPrice)',
      '(quantity \\* costPrice)',
      '(unitPrice - costPrice)',
      'SUM\\(.*amount.*\\)',
      'SUM\\(.*profit.*\\)'
    ];

    nullPatterns.forEach(pattern => {
      const regex = new RegExp(pattern, 'g');
      sql = sql.replace(regex, `COALESCE(${pattern}, 0)`);
    });

    return sql;
  }
}

// 导出单例
export const securityInterceptor = new SecurityInterceptor();