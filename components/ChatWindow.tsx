import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Send, Bot, User as UserIcon, ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { ChatMessage, ChatResponse, SecurityInfo } from '@/types/ChatResponse';
import MonacoSQLViewer from '@/components/MonacoSQLViewer';

const ChatWindow: React.FC = () => {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: `您好！我是 AC-Insight 智能经营分析助手。当前身份：${user.role}（${user.name}），我可以帮您查询销售相关的数据。请问您想了解什么？`,
      timestamp: new Date(),
      status: 'completed'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [cotExpanded, setCotExpanded] = useState(false);
  const [cotSteps, setCotSteps] = useState<CotStep[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 模拟发送消息
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // 模拟 AI 生成响应
    setTimeout(() => {
      generateAIResponse(inputMessage);
    }, 1000);
  };

  // 生成 AI 响应和 CoT 步骤
  const generateAIResponse = (query: string) => {
    // 检查是否包含敏感字段
    const sensitiveFields = checkSensitiveFields(query);
    const hasInterception = sensitiveFields.length > 0 && user.role !== 'Admin';

    const newCotSteps: CotStep[] = [
      {
        id: 'cot-1',
        step: 1,
        title: '自然语言解析',
        description: '识别用户的查询意图',
        status: 'completed',
        details: `检测到查询："${query}"`,
        sql: undefined
      },
      {
        id: 'cot-2',
        step: 2,
        title: '语义字典匹配',
        description: '查找匹配的指标定义',
        status: 'completed',
        details: hasInterception
          ? `检测到敏感字段：${sensitiveFields.join('、')}`
          : '匹配到公开指标',
        sql: undefined
      },
      {
        id: 'cot-3',
        step: 3,
        title: '权限拦截检查',
        description: '验证用户权限和敏感字段',
        status: 'completed',
        details: hasInterception
          ? `当前用户：${user.role}，无权访问 L1 级别字段`
          : `当前用户：${user.role}，允许访问`,
        sql: undefined
      },
      {
        id: 'cot-4',
        step: 4,
        title: 'SQL 生成过程',
        description: '生成安全查询语句',
        status: 'completed',
        details: hasInterception
          ? '已拦截敏感字段查询，建议查询公开指标'
          : '注入行级权限过滤条件',
        sql: hasInterception
          ? `-- [SENSITIVE FIELDS BLOCKED] owner_id filtering applied`
          : `SELECT name, SUM(COALESCE(unitPrice * quantity, 0)) / 100.0 as sales_amount
              FROM orders
              WHERE owner_id = '${user.userId}'
              AND createdAt >= date('now', '-30 days')
              GROUP BY name
              ORDER BY sales_amount DESC`
      }
    ];

    const securityInfo: SecurityInfo = {
      original_query: query,
      rewritten_query: hasInterception ? '已重写，屏蔽敏感字段' : `已注入 owner_id = '${user.userId}'`,
      security_level: hasInterception ? 'L1' : 'L0',
      intercepted_fields: hasInterception ? sensitiveFields : undefined
    };

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: hasInterception
        ? `很抱歉，您的查询"${query}"包含敏感字段，当前角色无法访问。建议您查询销售额、订单数等公开指标。`
        : `根据您的查询"${query}"，我已经为您生成了数据分析结果。`,
      timestamp: new Date(),
      security_info: securityInfo,
      explanation: generateExplanation(query, hasInterception),
      visualization_type: hasInterception ? 'card' : 'bar_chart',
      status: 'completed'
    };

    setCotSteps(newCotSteps);
    setMessages(prev => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">智能对话</h2>
            <p className="text-sm text-gray-500">与 AI 助手进行数据分析</p>
          </div>
          <button
            onClick={() => setCotExpanded(!cotExpanded)}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <span>思维链</span>
              {cotExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>
          </button>
        </div>
      </div>

      {/* 对话流区域 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-2' : 'space-x-2'}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'user'
                    ? 'bg-blue-500'
                    : 'bg-green-500'
                }`}
              >
                {message.type === 'user' ? (
                  <UserIcon className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div
                className={`p-4 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                {/* 安全拦截提示 */}
                {message.security_info?.intercepted_fields && (
                  <div className="flex items-center space-x-2 mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <Shield className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-red-700 font-medium">
                      安全拦截：已屏蔽 {message.security_info.intercepted_fields.join('、')}
                    </span>
                  </div>
                )}

                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* 推理过程 */}
                {message.explanation && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700">{message.explanation}</p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </p>

                  {/* 图表类型提示 */}
                  {message.visualization_type && (
                    <span className="text-xs text-gray-500">
                      推荐图表：{message.visualization_type === 'bar_chart' ? '柱状图' :
                              message.visualization_type === 'line_chart' ? '折线图' :
                              message.visualization_type === 'card' ? '卡片' : '表格'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* AI 正在输入指示器 */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex max-w-[80%] space-x-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 滚动锚点 */}
        <div ref={messagesEndRef} />
      </div>

      {/* 思维链展示区 */}
      {cotExpanded && (
        <div className="bg-white border-t border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">思维链解析</h3>
            <div className="flex space-x-1">
              {cotSteps.map((step) => (
                <div
                  key={step.id}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    step.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : step.status === 'in-progress'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {step.step}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {cotSteps.map((step) => (
              <div
                key={step.id}
                className="flex space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                    step.status === 'completed'
                      ? 'bg-green-500 text-white'
                      : step.status === 'in-progress'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-300 text-white'
                  }`}
                >
                  {step.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    <span className="text-xs text-gray-500">{step.description}</span>
                  </div>
                  {step.details && (
                    <p className="text-sm text-gray-600 mt-1">{step.details}</p>
                  )}
                  {step.sql && (
                    <div className="mt-2">
                      <MonacoSQLViewer
                        sql={step.sql}
                        securityInfo={
                          step.step === 4 ? messages[messages.length - 1]?.security_info : undefined
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1 bg-gray-100 rounded-lg p-3">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="输入您的查询，例如：查询销售额最高的客户..."
              className="w-full bg-transparent border-none resize-none focus:outline-none text-gray-900 placeholder-gray-500"
              rows={1}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            className={`p-3 rounded-lg transition-colors ${
              inputMessage.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// 辅助函数：检查敏感字段
function checkSensitiveFields(query: string): string[] {
  const sensitiveWords = ['毛利', '成本', '欠款', '毛利率', '回款率', '实时欠款'];
  const foundFields: string[] = [];

  const queryLower = query.toLowerCase();
  sensitiveWords.forEach(word => {
    if (queryLower.includes(word.toLowerCase())) {
      foundFields.push(word);
    }
  });

  return foundFields;
}

// 辅助函数：生成解释
function generateExplanation(query: string, hasInterception: boolean): string {
  if (hasInterception) {
    return `系统检测到您的查询包含敏感字段。根据当前角色权限，这些字段已被自动屏蔽。这是为了保护核心业务数据的安全。建议您查询销售额、订单数等公开指标。`;
  }

  return `已成功解析您的查询"${query}"。系统自动注入了行级权限过滤条件（owner_id = '${query.includes('张三') ? '张三' : '当前用户'}'），确保只能访问授权范围内的数据。所有金额已自动从分转换为元单位显示。`;
}