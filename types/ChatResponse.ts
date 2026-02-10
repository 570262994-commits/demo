// 错误类型定义
export interface ApiError {
  success: false;
  error: string;
  message: string;
  sql?: string;
  suggestion?: string;
  security_level?: 'L0' | 'L1';
}

// 安全信息接口
export interface SecurityInfo {
  original_query: string;
  rewritten_query: string;
  security_level: 'L0' | 'L1';
  intercepted_fields?: string[];
}

// ChatResponse 接口 - 与后端 app/api/chat/route.ts 对齐
export interface ChatResponse {
  success: true;
  data: any[];
  sql: string;
  explanation: string;
  visualization_type: string | null;
  security_info: SecurityInfo;
  timestamp: string;
}

// ChatMessage 接口 - 增强版
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  explanation?: string;           // 推理过程
  visualization_type?: string;     // 图表类型建议
  security_info?: SecurityInfo;  // 安全信息
  status: 'pending' | 'processing' | 'completed' | 'error';
}

// CoT 步骤接口
export interface CotStep {
  id: string;
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  details?: string;
  sql?: string;
}

// 可视化类型
export type VisualizationType =
  | 'card'
  | 'line_chart'
  | 'bar_chart'
  | 'table'
  | 'map'
  | 'progress_chart'
  | null;