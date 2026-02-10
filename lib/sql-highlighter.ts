import { SecurityInfo } from '@/types/ChatResponse';

/**
 * SQL 高亮工具类
 * 用于在代码编辑器中高亮显示安全相关信息
 */
export class SQLHighlighter {
  /**
   * 高亮 SQL 中的安全相关部分
   */
  static highlightSecurity(sql: string, securityInfo: SecurityInfo): string {
    let highlightedSQL = sql;

    // 1. 高亮 owner_id 过滤条件
    const ownerIdRegex = /WHERE\s+owner_id\s*=\s*['"]?([^'"\s]+)['"]?/gi;
    highlightedSQL = highlightedSQL.replace(ownerIdRegex, (match, p1) => {
      return match.replace(p1, `**${p1}**`);
    });

    // 2. 高亮被拦截的字段
    if (securityInfo.intercepted_fields && securityInfo.intercepted_fields.length > 0) {
      securityInfo.intercepted_fields.forEach(field => {
        const fieldRegex = new RegExp(`\\b${field}\\b`, 'gi');
        highlightedSQL = highlightedSQL.replace(fieldRegex, `~~${field}~~`);
      });
    }

    // 3. 添加安全标记
    if (securityInfo.intercepted_fields && securityInfo.intercepted_fields.length > 0) {
      highlightedSQL = `-- [SECURITY INTERCEPTED] 敏感字段已被屏蔽\n${highlightedSQL}`;
    } else {
      highlightedSQL = `-- [SECURITY PASSED] 行级权限已注入\n${highlightedSQL}`;
    }

    return highlightedSQL;
  }

  /**
   * 获取高亮类型
   */
  static getHighlightType(securityInfo: SecurityInfo): 'success' | 'warning' | 'error' {
    if (securityInfo.intercepted_fields && securityInfo.intercepted_fields.length > 0) {
      return 'error';
    }
    if (securityInfo.security_level === 'L1') {
      return 'warning';
    }
    return 'success';
  }

  /**
   * 生成安全状态说明
   */
  static generateSecurityStatus(securityInfo: SecurityInfo): string {
    if (securityInfo.intercepted_fields && securityInfo.intercepted_fields.length > 0) {
      return `❌ 安全拦截：已屏蔽 ${securityInfo.intercepted_fields.join('、')}`;
    }

    if (securityInfo.security_level === 'L1') {
      return `⚠️  L1 权限：仅限管理员访问`;
    }

    return `✅ 安全通过：已注入行级权限`;
  }
}