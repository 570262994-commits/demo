import { UserRole } from '@/contexts/UserContext';
import { SecurityInfo } from '@/types/ChatResponse';

/**
 * 演示剧本预设
 * 提供三个杀手锏演示场景
 */
export class DemoScenarios {
  /**
   * 场景1：销售查询毛利（被拦截）
   */
  static scenario1 = {
    title: '销售查看毛利',
    description: '演示普通销售无法访问 L1 级别敏感字段',
    steps: [
      {
        role: 'Sales' as UserRole,
        userInput: '帮我查询一下本月的毛利情况',
        expectedResponse: '很抱歉，您的查询包含敏感字段，当前角色无法访问。',
        expectedSecurity: {
          original_query: '帮我查询一下本月的毛利情况',
          rewritten_query: '已重写，屏蔽敏感字段',
          security_level: 'L1' as const,
          intercepted_fields: ['毛利']
        }
      }
    ]
  };

  /**
   * 场景2：经理查看团队数据（部分权限）
   */
  static scenario2 = {
    title: '经理查看团队业绩',
    description: '演示销售经理可以查看团队数据，但无法查看成本信息',
    steps: [
      {
        role: 'Manager' as UserRole,
        userInput: '查看华东大区团队的销售额排名',
        expectedResponse: '根据您的查询，我已经为您生成了数据分析结果。',
        expectedSecurity: {
          original_query: '查看华东大区团队的销售额排名',
          rewritten_query: '已注入 owner_id = 团队成员ID列表',
          security_level: 'L0' as const,
          intercepted_fields: undefined
        }
      }
    ]
  };

  /**
   * 场景3：管理员查看所有数据（全权限）
   */
  static scenario3 = {
    title: '管理员审计全域数据',
    description: '演示管理员拥有全量数据访问权限',
    steps: [
      {
        role: 'Admin' as UserRole,
        userInput: '分析全国各区域的毛利率和欠款情况',
        expectedResponse: '根据您的查询，我已经为您生成了数据分析结果。',
        expectedSecurity: {
          original_query: '分析全国各区域的毛利率和欠款情况',
          rewritten_query: '已注入 owner_id = Admin范围',
          security_level: 'L0' as const,
          intercepted_fields: undefined
        }
      }
    ]
  };

  /**
   * 获取所有场景
   */
  static getAllScenarios() {
    return [
      { id: '1', ...this.scenario1 },
      { id: '2', ...this.scenario2 },
      { id: '3', ...this.scenario3 }
    ];
  }

  /**
   * 获取指定场景
   */
  static getScenario(id: string) {
    return this.getAllScenarios().find(s => s.id === id);
  }

  /**
   * 快速演示销售查看毛利
   */
  static quickDemoSalesMargin() {
    return this.scenario1;
  }

  /**
   * 执行演示剧本
   */
  static async executeScenario(
    scenarioId: string,
    setUser: (user: any) => void,
    simulateQuery: (query: string) => Promise<any>
  ): Promise<void> {
    const scenario = this.getScenario(scenarioId);
    if (!scenario) throw new Error('场景不存在');

    // 切换到指定角色
    const firstStep = scenario.steps[0];
    setUser({
      userId: firstStep.role === 'Admin' ? 'admin001' :
              firstStep.role === 'Manager' ? 'manager001' : 'sales001',
      role: firstStep.role,
      name: firstStep.role === 'Admin' ? '系统管理员' :
            firstStep.role === 'Manager' ? '销售经理' : '销售代表',
      region: firstStep.role === 'Admin' ? '全国' :
              firstStep.role === 'Manager' ? '华东大区' : '华东',
    });

    // 等待角色切换动画
    await new Promise(resolve => setTimeout(resolve, 800));

    // 执行查询
    await simulateQuery(firstStep.userInput);
  }
}