# CLAUDE.md - AC-Insight 智能经营分析工作台

## 0. 项目概览

**项目名称**: AC-Insight 智能经营分析工作台
**版本**: V1.0
**状态**: MVP 开发阶段
**技术栈**: Next.js 15, Tailwind CSS v4, Prisma + SQLite, GLM API
**核心价值**: 语义标准化 + AI 原生安全

### 项目目标
- 通过语义中台统一全公司指标计算逻辑
- 实现自然语言驱动的零代码数据查询
- 构建AI原生的权限拦截体系，确保数据安全

---

## 1. 开发原则与约束

### 1.1 模型约束 - GLM API 集成
- **System Prompt 结构化要求**:
  ```json
  {
    "role": "system",
    "content": {
      "persona": "AC-Insight 智能经营分析助手",
      "constraints": [
        "必须严格遵循 data/semantic_dict.json 中的指标定义",
        "非 Admin 身份自动触发 lib/security.ts 权限校验",
        "所有查询结果必须包含可解释的推理过程"
      ],
      "output_format": {
        "query_plan": "string",
        "sql_generated": "string",
        "explanation": "string",
        "visualizations": []
      }
    }
  }
  ```

### 1.2 业务优先级级联
1. **语义层优先级最高**: AI 严禁绕过 semantic_dict.json 自行解释数据指标
2. **安全权限零容忍**: 非 Admin 必须强制执行权限拦截，无例外
3. **视觉体验专业**: 使用 ui-ux-pro-max 技能打造 B 端专业界面
4. **性能指标达标**: 端到端响应延迟 < 5s

### 1.3 工程规范 - Codex 协作流
所有开发任务必须严格遵循：
1. **Plan 阶段**: 需求分析 → 技术方案 → 实现计划
2. **Diff Prototype 阶段**: 调用 Codex 生成实现原型
3. **Rewrite 阶段**: 重写为企业级生产代码
4. **Review 阶段**: Code Review 确保质量

---

## 2. 核心架构组件

### 2.1 语义中台 (Semantic Center)
**文件位置**: `data/semantic_dict.json`

```json
{
  "indicators": {
    "毛利": {
      "formula": "(单价 - 成本) * 数量",
      "fields": ["price", "cost", "quantity"],
      "level": "L1",
      "synonyms": ["利润", "盈利", "margin"]
    },
    "销售额": {
      "formula": "单价 * 数量",
      "fields": ["price", "quantity"],
      "level": "L0",
      "synonyms": ["营收", "销售额", "sales_amount"]
    }
  }
}
```

**实现要求**:
- **唯一事实来源**: semantic_dict.json 是系统指标的 Single Source of Truth
- **冲突检测**: LLM 生成的查询如果与字典中的 formula 逻辑冲突，后端必须报错丢弃
- **动态配置更新**: 仅 Admin 可操作，公式变更需同步影响所有相关查询
- **强制约束**: 所有指标必须包含时间维度，无时间约束的查询视为非法

### 2.2 安全引擎 (Security Engine)
**文件位置**: `lib/security.ts`

```typescript
interface SecurityConfig {
  role: 'Admin' | 'Manager' | 'Sales';
  permissions: {
    dataAccess: string[];
    fieldLevel: Record<string, 'L0' | 'L1'>;
    rowFilter?: string;
  };
}

export function enforceSecurity(query: string, user: SecurityConfig): {
  query: string;
  blocked: boolean;
  reason?: string;
} {
  // 1. 字段级权限检查
  // 2. 行级权限注入
  // 3. SQL 注入防护
}
```

**安全要求**:
- **拦截时点**: SQL 执行前必须经过拦截器校验，而非生成后校验
- **注入式防御**: 拦截器需具备注入式防御能力，强制将 owner_id 拼接到 WHERE 子句中
- **L1 字段屏蔽**: 非 Admin 完全无法访问 L1 字段
- **行级隔离**: 自动注入 `owner_id = {current_user_id}` 过滤条件

### 2.3 查询引擎 (Query Engine)
**文件位置**: `lib/query-engine.ts`

```typescript
interface QueryRequest {
  naturalLanguage: string;
  userRole: string;
  userId: string;
}

interface QueryResult {
  sql: string;
  data: any[];
  explanation: string;
  visualization: {
    type: 'chart' | 'table' | 'metric';
    config: any;
  };
}
```

---

## 3. 用户角色与权限体系

### 3.1 角色定义矩阵
| 角色 | 数据权限 | 字段权限 | 特殊能力 |
|------|----------|----------|----------|
| Admin | 全量数据 | L0 + L1 | 配置语义字典、管理用户 |
| Manager | 团队数据 | L0 + 团队内 L1 | 查看团队汇总、客户排名 |
| Sales | 个人数据 | 仅个人 L0 | 查看个人业绩、回款明细 |

### 3.2 权限实现规范
- **RBAC + ABAC 混合模型**: 角色 + 属性访问控制
- **权限校验点**:
  - API 入口拦截 (`/api/query`)
  - 查询解析前 (`lib/parse-natural-language.ts`)
  - SQL 执行前 (`lib/security-interceptor.ts`)

---

## 4. GLM 集成与指令工程

### 4.1 System Prompt 结构
```json
{
  "role": "system",
  "content": {
    "persona": "AC-Insight 智能经营分析助手",
    "core_constraints": [
      "必须严格遵循 semantic_dict.json 的指标定义",
      "必须执行安全拦截器校验",
      "所有查询必须包含时间约束"
    ],
    "chinese_processing": {
      "long_sentence_handling": "分析中文长难句，提取核心查询意图",
      "time_dimension_enforcement": "发现无时间约束的查询，必须默认使用近30天",
      "clarification_mechanism": "查询意图不明确时，反向追问用户"
    }
  }
}
```

### 4.2 中文长难句处理策略

**反向追问机制**:
```typescript
interface QueryClarification {
  originalQuery: string;
  detectedIntent: string;
  missingElements: string[];
  clarificationQuestions: string[];
}

export function clarifyChineseQuery(query: string): QueryClarification {
  // 检测时间维度缺失
  if (!containsTimeConstraint(query)) {
    return {
      missingElements: ["时间范围"],
      clarificationQuestions: ["您想查询哪个时间段的数据？"]
    };
  }

  // 检测指标范围不明确
  if (containsMultipleIndicators(query)) {
    return {
      missingElements: ["具体指标"],
      clarificationQuestions: ["您想查看哪个具体指标？"]
    };
  }
}
```

**默认时间维度规则**:
- 无时间约束的销售额查询 → 默认使用近30天
- 无时间约束的用户数查询 → 默认使用自然月
- 跨期对比查询 → 默认使用同比（去年同期）

### 4.3 查询生成流程

```typescript
interface QueryGenerationPipeline {
  // 1. 自然语言解析
  step1: parseNaturalLanguage;

  // 2. 语义字典验证
  step2: validateAgainstSemanticDict;

  // 3. 安全拦截器
  step3: securityInterceptor;

  // 4. SQL 生成
  step4: generateSQL;

  // 5. 查询执行
  step5: executeQuery;
}
```

---

## 5. 开发规范

### 5.1 文件结构约定
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── query/         # 查询接口
│   │   └── auth/          # 权限验证
│   ├── components/        # UI 组件
│   │   ├── semantic/      # 语义相关组件
│   │   ├── security/      # 安全提示组件
│   │   └── charts/        # 图表组件
│   └── dashboard/         # 主页面
├── lib/                   # 核心库
│   ├── security.ts        # 安全引擎
│   ├── security-interceptor.ts  # 拦截器
│   ├── semantic.ts        # 语义解析
│   ├── query-engine.ts    # 查询引擎
│   ├── chinese-parser.ts  # 中文解析器
│   └── utils/             # 工具函数
├── data/                  # 数据定义
│   ├── semantic_dict.json  # 语义字典（SSOT）
│   └── permissions.json   # 权限配置
└── prisma/                # 数据库模式
```

### 5.2 代码规范
- **TypeScript 严格模式**: 启用 `noImplicitAny` 和 `strictNullChecks`
- **API 响应格式化**: 统一使用 `/lib/api-responses.ts`
- **错误处理**: 使用 `/lib/errors.ts` 中的标准错误类型
- **日志记录**: 使用 `/lib/logger.ts` 结构化日志

### 5.3 性能要求
- **响应时间**: 95% 查询 < 5s
- **并发处理**: 支持 10 QPS
- **缓存策略**: 语义字典、用户权限缓存
- **懒加载**: 图表组件按需加载

---

## 6. 安全强化规范

### 6.1 拦截器强制要求
```typescript
export class SecurityInterceptor {
  // 在 SQL 生成前强制拦截
  public interceptBeforeSQLGeneration(
    queryIntent: string,
    user: UserConfig
  ): InterceptResult {
    // 1. L1 字段检查
    if (containsL1Fields(queryIntent) && user.role !== 'Admin') {
      throw new SecurityError('L1 fields not allowed');
    }

    // 2. 强制注入 owner_id
    const injectedQuery = injectRowFilter(queryIntent, user.userId);

    // 3. 时间维度检查
    if (!hasTimeConstraint(injectedQuery)) {
      injectedQuery.addDefaultTimeRange();
    }

    return { query: injectedQuery, allowed: true };
  }
}
```

### 6.2 语义冲突检测
```typescript
export class SemanticValidator {
  public validateFormulaConsistency(
    generatedSQL: string,
    indicator: Indicator
  ): ValidationResult {
    // 检查生成的 SQL 是否符合字典中的 formula
    const sqlFormula = extractFormulaFromSQL(generatedSQL);
    if (!isFormulaConsistent(sqlFormula, indicator.formula)) {
      return {
        valid: false,
        error: `Formula conflict: ${sqlFormula} vs ${indicator.formula}`
      };
    }
    return { valid: true };
  }
}
```

---

## 7. 测试策略

### 7.1 安全测试专项
- **拦截器测试**: 验证 SQL 执行前的强制拦截
- **注入攻击测试**: 测试各种注入式攻击的防御能力
- **权限绕过测试**: 验证无法绕过 L1 字段屏蔽
- **语义冲突测试**: 验证与字典冲突的查询被丢弃

### 7.2 中文处理测试
- **长难句解析**: 测试复杂中文查询的解析准确率
- **时间维度检测**: 验证无时间约束查询的默认处理
- **反向追问**: 测试意图不明确时的追问机制

### 7.3 性能测试
- **并发安全**: 多用户同时查询时的权限隔离
- **响应时间**: 端到端查询延迟监控
- **资源占用**: 内存和 CPU 使用量监控

---

## 8. 部署与运维

### 8.1 环境配置
- **开发环境**: Next.js Dev Server + HMR
- **预发布环境**: Docker 容器化部署
- **生产环境**: Nginx 反向代理 + PM2 进程管理

### 8.2 监控指标
- **业务指标**: 查询成功率、平均响应时间
- **安全指标**: 权限拦截次数、异常访问尝试、注入攻击次数
- **系统指标**: CPU、内存、数据库连接数

---

## 9. 版本规划

### V1.0 (当前)
- [x] 语义中台基础功能
- [x] 安全引擎实现
- [x] 基础查询界面
- [x] MVP 验收标准达成

### V1.1 (下阶段)
- [ ] 异常数据主动预警
- [ ] 查询历史与收藏
- [ ] 批量数据导出
- [ ] 移动端适配

### V1.2 (远期)
- [ ] GLM-4.5-Air 模型集成
- [ ] 多租户支持
- [ ] 高级分析功能
- [ ] API 开放平台

---

## 10. 协作指南

### 10.1 Git 工作流
- **分支命名**: `feature/功能名`、`bugfix/问题描述`
- **Commit 消息**: 遵循 Conventional Commits
- **Code Review**: 至少一人审核通过

### 10.2 文档维护
- **API 文档**: 使用 Swagger 自动生成
- **更新日志**: 遵循 Keep a Changelog
- **用户手册**: 内置帮助系统

---

## 11. 质量标准

### 11.1 代码质量
- **ESLint**: 严格模式，无警告
- **Prettier**: 统一代码格式
- **SonarQube**: 关键漏洞 0 容忍

### 11.2 用户体验
- **交互响应**: < 100ms 操作反馈
- **错误提示**: 友好的错误信息
- **加载状态**: 明确的加载指示器

### 11.3 数据安全
- **加密存储**: 敏感数据加密
- **审计日志**: 完整操作记录
- **定期备份**: 数据自动备份

---

## 12. 紧急响应预案

### 12.1 安全事件
- **数据泄露**: 立即停止服务，启动应急预案
- **权限绕过**: 紧急修复 + 权限审计
- **服务异常**: 快速降级机制

### 12.2 技术支持
- **SLA**: 重大问题 2 小时内响应
- **回滚方案**: 每次发布提供回滚路径
- **灾备方案**: 跨 AZ 部署

---

## 13. 加固要点总结

### 13.1 安全拦截加固
- **拦截时点**: SQL 执行前强制拦截，非生成后校验
- **注入式防御**: 强制 owner_id 注入到 WHERE 子句
- **多层防护**: API、解析、生成、执行四层拦截

### 13.2 语义层加固
- **SSOT 原则**: semantic_dict.json 为唯一事实来源
- **冲突检测**: 任何与字典公式冲突的查询必须报错丢弃
- **强制约束**: 所有查询必须包含时间维度

### 13.3 GLM 指令加固
- **中文长难句**: 专门处理策略，反向追问机制
- **时间维度**: 无时间约束时使用默认值或追问
- **默认规则**: 销售额→近30天，用户数→自然月等

## 14.GitHub 提交流程规范 (Git Workflow)
- **智能提醒**：每当你完成一个在 PRD.md 或 roadmap.md 中定义的阶段性任务、功能点、或修复了一个 Bug 后，必须主动询问我：“是否需要同步更新到 GitHub？”。
- **预撰写提交信息**：在询问时，请根据本次实际修改的内容，预撰写一条符合 B 端项目严谨性的 Commit Message。格式建议：
    - `feat(业务模块): 描述新增功能` (例如：feat(schema): 初始化财务核算 Mock 表)
    - `docs(文档类型): 描述文档更新` (例如：docs(prd): 更新毛利计算口径)
    - `fix(问题点): 描述修复内容`
- **执行推送**：在我确认“OK”或“提交”后，自动执行 `git add .`、`git commit` 和 `git push`。

## 自定义指令集 (Custom Commands)
- `/resume`: 自动执行项目状态初始化，读取 roadmap、PRD 及业务字典，汇报当前进度。
- `/sync`: 触发 GitHub 同步逻辑（即我们之前配置的智能提醒提交）。