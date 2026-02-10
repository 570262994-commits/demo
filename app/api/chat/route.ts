// 错误类型定义
interface ApiError {
  success: false;
  error: string;
  message: string;
  sql?: string;
  suggestion?: string;
  security_level?: 'L0' | 'L1';
}

// 成功响应类型定义
interface ApiResponse {
  success: true;
  data: any[];
  sql: string;
  explanation: string;
  visualization_type: string | null;
  security_info: {
    original_query: string;
    rewritten_query: string;
    security_level: 'L0' | 'L1';
    intercepted_fields?: string[];
  };
  timestamp: string;
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

// 金额单位转换（分转元）
function convertFenToYuan(amount: number): number {
  return parseFloat((amount / 100.0).toFixed(2));
}

// 构建 GLM System Prompt
function buildSystemPrompt(userQuery: string, userConfig: UserConfig): any {
  const dictionary = loadSemanticDictionary();

  return {
    role: "system",
    content: {
      persona: "AC-Insight 智能经营分析助手",

      // 核心约束
      constraints: [
        "必须严格遵循 data/semantic_dict.json 中的指标定义",
        "所有查询必须包含时间维度约束",
        "生成的 SQL 必须完全符合预定义的公式",
        "非 Admin 身份自动触发权限校验",
        "所有金额计算必须使用 COALESCE 处理 NULL 值",
        "金额相关结果必须将分转换为元单位"
      ],

      // 语义字典
      dictionary: {
        indicators: dictionary.indicators,
        dimensions: dictionary.dimensions,
        rules: {
          calculation: dictionary.rules.calculation,
          security: dictionary.rules.security
        }
      },

      // 单位防御要求
      unit_defense: {
        mandatory_unit_conversion: true,
        conversion_formula: "金额（分） / 100.0",
        precision: "浮点数除法",
        required_units: ["元", "%", "个"]
      },

      // 计算过程解释要求
      calculation_explanation: {
        include_formula_derivation: true,
        show_calculation_steps: true,
        explain_time_constraints: true,
        clarify_field_mappings: true
      },

      // 权限和安全要求
      security_requirements: {
        row_level_security: true,
        owner_id_injection: true,
        sensitive_field_protection: true,
        sql_injection_prevention: true
      },

      // 输出格式要求
      output_format: {
        sql: "string - 生成的 SQL 查询语句",
        explanation: "string - 详细的计算过程和推理说明",
        visualization_type: "string | null - 推荐的可视化类型 (card, line_chart, bar_chart, table, map, progress_chart)",
        calculation_steps: "string - 分步计算过程",
        formula_used: "string - 使用的具体公式"
      }
    }
  };
}

// 格式化 GLM 响应
function formatGLMResponse(response: any): {
  sql: string;
  explanation: string;
  visualization_type: string | null;
} {
  // GLM 可能返回不同的格式，这里需要适配
  const content = response.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Invalid GLM response format');
  }

  try {
    // 尝试解析 JSON 响应
    const parsed = JSON.parse(content);

    return {
      sql: parsed.sql || '',
      explanation: parsed.explanation || '',
      visualization_type: parsed.visualization_type || null
    };
  } catch {
    // 如果不是 JSON 格式，尝试从文本中提取
    return {
      sql: extractSQLFromText(content),
      explanation: extractExplanationFromText(content),
      visualization_type: extractVisualizationTypeFromText(content)
    };
  }
}

// 从文本中提取 SQL
function extractSQLFromText(text: string): string {
  const sqlMatch = text.match(/```sql\n([\s\S]*?)\n```/) ||
                   text.match(/SELECT[\s\S]*?;/i) ||
                   text.match(/```([\s\S]*?)```/);

  return sqlMatch ? sqlMatch[1] || sqlMatch[0] : '';
}

// 从文本中提取解释
function extractExplanationFromText(text: string): string {
  const explanationMatch = text.match(/解释[:：]\s*([\s\S]*?)(?=\n|$)/) ||
                          text.match(/推理[:：]\s*([\s\S]*?)(?=\n|$)/);

  return explanationMatch ? explanationMatch[1] : text;
}

// 从文本中提取可视化类型
function extractVisualizationTypeFromText(text: string): string | null {
  const typeMatch = text.match(/(card|line_chart|bar_chart|table|map|progress_chart)/i);
  return typeMatch ? typeMatch[1] : null;
}

// 执行参数化查询
async function executeQuery(sql: string, userId: string): Promise<any[]> {
  // 安全检查：确保 SQL 中包含 owner_id 过滤
  if (!sql.includes(`owner_id = '${userId}'`) && !sql.includes(`owner_id = "${userId}"`)) {
    throw new Error('SQL query must include owner_id filter for security');
  }

  try {
    // 使用 Prisma executeRaw 执行 SQL
    const result = await prisma.$queryRawUnsafe(sql);

    // 处理结果数据，进行单位转换
    if (Array.isArray(result) && result.length > 0) {
      const processedData = result.map(row => {
        const newRow = { ...row };
        // 遍历所有字段，对金额相关字段进行单位转换
        Object.keys(newRow).forEach(key => {
          // 假设包含 'amount', 'price', 'cost', 'total', 'sales_amount', 'revenue' 等字段是金额
          if (typeof newRow[key] === 'number' &&
              (key.includes('amount') ||
               key.includes('price') ||
               key.includes('cost') ||
               key.includes('total') ||
               key.includes('sales') ||
               key.includes('revenue'))) {
            newRow[key] = convertFenToYuan(newRow[key]);
          }
        });
        return newRow;
      });
      return processedData;
    }

    return Array.isArray(result) ? result : [];
  } catch (error) {
    throw new Error(`Query execution failed: ${error}`);
  }
}

// 生成友好的错误提示
function generateFriendlyError(error: Error, originalSql?: string): ApiError {
  const errorMessage = error.message;

  // 根据错误类型生成友好提示
  if (errorMessage.includes('syntax error')) {
    return {
      success: false,
      error: "SQL 语法错误",
      message: "查询语句存在语法问题，请尝试修改您的提问",
      sql: originalSql,
      suggestion: "可以尝试使用更简单的表达方式，比如'查询销售额'而不是复杂的计算"
    };
  }

  if (errorMessage.includes('owner_id')) {
    return {
      success: false,
      error: "权限验证错误",
      message: "系统权限验证失败",
      sql: originalSql,
      suggestion: "请重新登录或联系系统管理员"
    };
  }

  return {
    success: false,
    error: "查询执行失败",
    message: "执行查询时发生错误",
    sql: originalSql,
    suggestion: "请检查查询内容或稍后重试"
  };
}

// 主处理函数
export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求数据
    const body = await request.json();
    const { query, userId, role } = body;

    // 验证必填字段
    if (!query || !userId || !role) {
      return NextResponse.json({
        success: false,
        error: "参数错误",
        message: "query、userId 和 role 是必填项"
      }, { status: 400 });
    }

    // 验证用户角色
    const validRoles: UserRole[] = ['Admin', 'Manager', 'Sales'];
    if (!validRoles.includes(role as UserRole)) {
      return NextResponse.json({
        success: false,
        error: "无效的角色",
        message: "role 必须是 Admin、Manager 或 Sales"
      }, { status: 400 });
    }

    // 2. 创建用户配置
    const userConfig: UserConfig = {
      role: role as UserRole,
      userId,
      username: `User_${userId}`
    };

    // 3. 调用安全拦截器
    const securityResult: InterceptResult = validateAndRewrite(query, userConfig);

    // 4. 处理安全拦截结果
    if (!securityResult.allowed) {
      return NextResponse.json({
        success: false,
        error: "权限不足",
        message: securityResult.denialMessage || "您的查询被系统拦截",
        security_level: securityResult.securityLevel || 'L1',
        suggestion: securityResult.partialResults?.suggestion || "请尝试查询其他指标"
      } as ApiError, { status: 403 });
    }

    // 5. 构建 GLM System Prompt
    const systemPrompt = buildSystemPrompt(query, userConfig);

    // 6. 调用 GLM API
    if (!GLM_API_KEY) {
      throw new Error('GLM_API_KEY environment variable is not set');
    }

    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GLM_API_KEY}`
      },
      body: JSON.stringify({
        model: 'glm-4',
        messages: [
          systemPrompt,
          {
            role: "user",
            content: `请根据以下自然语言查询生成 SQL 语句：${query}\n\n用户信息：角色=${role}, 用户ID=${userId}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.1, // 低温度确保一致性
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`GLM API request failed: ${response.statusText}`);
    }

    const glmResponse = await response.json();

    // 7. 格式化 GLM 响应
    const { sql, explanation, visualization_type } = formatGLMResponse(glmResponse);

    // 8. 权限重写 - 使用安全 SQL 重写函数
    const finalSql = rewriteSQLWithOwnerID(sql, userId);

    // 9. 执行查询
    const data = await executeQuery(finalSql, userId);

    // 10. 构建成功响应
    const apiResponse: ApiResponse = {
      success: true,
      data,
      sql: finalSql,
      explanation: explanation,
      visualization_type,
      security_info: {
        original_query: query,
        rewritten_query: securityResult.rewrittenQuery || query,
        security_level: securityResult.securityLevel || 'L0',
        intercepted_fields: securityResult.blockedFields
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(apiResponse);

  } catch (error) {
    console.error('Chat route error:', error);

    // 生成友好的错误响应
    const friendlyError = generateFriendlyError(error as Error);

    return NextResponse.json(friendlyError, {
      status: 200 // 不返回 500，而是返回 200 包含错误信息
    });
  }
}

// GET 方法用于健康检查
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Chat API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}