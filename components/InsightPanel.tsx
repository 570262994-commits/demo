import React, { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { BarChart3, Code, Eye, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

// 模拟数据
const mockChartData = [
  { name: '客户A', value: 50000 },
  { name: '客户B', value: 35000 },
  { name: '客户C', value: 28000 },
  { name: '客户D', value: 22000 },
  { name: '客户E', value: 18000 },
];

// 语义字典数据
const semanticDictionary = {
  销售额: {
    formula: "SUM(COALESCE(unitPrice * quantity, 0)) / 100.0",
    description: "基于订单的销售额，将分转换为元单位展示",
    unit: "元",
    level: "L0"
  },
  毛利: {
    formula: "SUM(COALESCE((unitPrice - costPrice) * quantity, 0)) / 100.0",
    description: "基于订单的毛利，扣除成本后的收益",
    unit: "元",
    level: "L1"
  }
};

interface InsightPanelProps {
  className?: string;
}

const InsightPanel: React.FC<InsightPanelProps> = ({ className = '' }) => {
  const { user, roleColor } = useUser();
  const [activeMetric, setActiveMetric] = useState('销售额');
  const [sqlHighlighted, setSqlHighlighted] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'card'>('bar');

  // 模拟透视镜联动效果
  useEffect(() => {
    // 模拟 CoT 运行到"注入 RLS"步骤时触发高亮
    const timer = setTimeout(() => {
      setSqlHighlighted(true);
      setTimeout(() => setSqlHighlighted(false), 3000);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const currentMetric = semanticDictionary[activeMetric as keyof typeof semanticDictionary];

  return (
    <div className={`bg-white border-l border-gray-200 h-full flex flex-col ${className}`}>
      {/* 图表卡片区 */}
      <div className="flex-1 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">数据分析结果</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setChartType('card')}
                className={`p-2 rounded-lg ${
                  chartType === 'card' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`p-2 rounded-lg ${
                  chartType === 'bar' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 指标选择器 */}
          <div className="flex space-x-2 mb-4">
            {Object.keys(semanticDictionary).map((metric) => (
              <button
                key={metric}
                onClick={() => setActiveMetric(metric)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  activeMetric === metric
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {metric}
              </button>
            ))}
          </div>

          {/* 图表容器 */}
          <div className="bg-gray-50 rounded-lg p-4 h-64 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Recharts 图表展示区域</p>
              <p className="text-xs text-gray-400 mt-1">
                {chartType === 'bar' ? '柱状图' : chartType === 'line' ? '折线图' : '卡片视图'}
              </p>
            </div>
          </div>

          {/* 口径定义标签 */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Eye className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-blue-900 mb-1">
                  {activeMetric} 计算口径
                </div>
                <div className="text-blue-700 font-mono text-xs mb-1">
                  {currentMetric.formula}
                </div>
                <div className="text-blue-600 text-xs">
                  {currentMetric.description}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 数据卡片展示 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="text-sm opacity-90">总销售额</div>
            <div className="text-2xl font-bold mt-1">¥123,456</div>
            <div className="text-xs opacity-80 mt-1">近30天</div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div className="text-sm opacity-90">订单数</div>
            <div className="text-2xl font-bold mt-1">892</div>
            <div className="text-xs opacity-80 mt-1">近30天</div>
          </div>
        </div>

        {/* 数据表格 */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 text-sm">客户排行榜</h4>
          <div className="space-y-2">
            {mockChartData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    ¥{item.value.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {((item.value / mockChartData[0].value) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SQL 审计视图 */}
      <div className="border-t border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center space-x-2">
            <Code className="w-4 h-4" />
            <span>SQL 审计视图</span>
            {sqlHighlighted && (
              <span className="px-2 py-1 text-xs rounded-full animate-pulse" style={{ backgroundColor: roleColor }}>
                已注入 RLS
              </span>
            )}
          </h3>
        </div>

        <div className="p-4 bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto">
          <pre>
            <code className="language-sql">
              {`SELECT
  name,
  SUM(COALESCE(unitPrice * quantity, 0)) / 100.0 as sales_amount
FROM
  orders
WHERE
  /* << RLS 注入点 >> */ ${
              sqlHighlighted
                ? `<span style="background: ${roleColor}; color: white; padding: 2px 4px; border-radius: 2px;">owner_id = '${user.userId}'</span>`
                : `owner_id = '${user.userId}'`
              }
  AND createdAt >= date('now', '-30 days')
GROUP BY
  name
ORDER BY
  sales_amount DESC
LIMIT 10;`}
            </code>
          </pre>
        </div>

        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: roleColor }}></div>
            <span className="text-xs text-gray-600">
              已自动注入行级权限过滤条件
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightPanel;