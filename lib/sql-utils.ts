import { PrismaClient } from '@prisma/client';

export class SQLUtils {
  /**
   * 生成安全的 SQL 查询，自动处理 Null 值和权限
   */
  static generateSafeSQL(query: string, ownerId: string): string {
    let safeSQL = query;

    // 1. 注入 owner_id 过滤
    if (!safeSQL.toLowerCase().includes('where')) {
      safeSQL += ` WHERE owner_id = '${ownerId}'`;
    } else {
      safeSQL += ` AND owner_id = '${ownerId}'`;
    }

    // 2. 处理 Null 值
    safeSQL = this.handleNullValues(safeSQL);

    // 3. 添加时间约束（如果没有的话）
    if (!this.hasTimeConstraint(safeSQL)) {
      safeSQL += ` AND created_at >= date('now', '-30 days')`;
    }

    return safeSQL;
  }

  /**
   * 处理 SQL 中的 Null 值
   */
  static handleNullValues(sql: string): string {
    // 为常见的计算模式添加 COALESCE
    const patterns = [
      // 金额计算
      {
        pattern: /(\w+\s*\*\s*\w+)/g,
        replacement: 'COALESCE($&, 0)'
      },
      // SUM 函数
      {
        pattern: /SUM\s*\(\s*(\w+)(\s*[\+\-\*\/]\s*\w+)*\s*\)/g,
        replacement: 'COALESCE(SUM($1), 0)'
      },
      // 基础字段
      {
        pattern: /(\w+)/g,
        replacement: (match: string) => {
          const nullFields = ['unitPrice', 'costPrice', 'quantity', 'amount'];
          if (nullFields.includes(match)) {
            return `COALESCE(${match}, 0)`;
          }
          return match;
        }
      }
    ];

    patterns.forEach(({ pattern, replacement }) => {
      if (typeof replacement === 'function') {
        sql = sql.replace(pattern, replacement);
      } else {
        sql = sql.replace(pattern, replacement);
      }
    });

    return sql;
  }

  /**
   * 检查 SQL 是否包含时间约束
   */
  static hasTimeConstraint(sql: string): boolean {
    const timePatterns = [
      /where.*created_at/i,
      /where.*order_date/i,
      /where.*date/i,
      /where.*today/i,
      /where.*yesterday/i,
      /where.*this_week/i,
      /where.*this_month/i,
      /where.*last_week/i,
      /where.*last_month/i,
      /date\s*\(/i
    ];

    return timePatterns.some(pattern => pattern.test(sql));
  }

  /**
   * 构建聚合查询
   */
  static buildAggregationQuery(
    table: string,
    groupBy: string[],
    aggregations: Record<string, string>,
    conditions: string[] = [],
    ownerId?: string
  ): string {
    const whereConditions = [
      ...(ownerId ? [`owner_id = '${ownerId}'`] : []),
      ...conditions
    ];

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const groupClause = groupBy.length > 0
      ? `GROUP BY ${groupBy.join(', ')}`
      : '';

    const selects = Object.entries(aggregations)
      .map(([alias, expr]) => `${expr} as ${alias}`)
      .join(', ');

    return `
      SELECT ${selects}
      FROM ${table}
      ${whereClause}
      ${groupClause}
    `.trim();
  }

  /**
   * 构建时间维度查询
   */
  static buildTimeDimensionQuery(
    table: string,
    timeField: string,
    timeRange: string,
    aggregations: Record<string, string>,
    ownerId?: string
  ): string {
    const whereConditions = [
      `${timeField} >= ${timeRange}`,
      ...(ownerId ? [`owner_id = '${ownerId}'`] : [])
    ];

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const selects = Object.entries(aggregations)
      .map(([alias, expr]) => `${expr} as ${alias}`)
      .join(', ');

    return `
      SELECT ${selects}
      FROM ${table}
      ${whereClause}
      ORDER BY ${timeField}
    `.trim();
  }
}