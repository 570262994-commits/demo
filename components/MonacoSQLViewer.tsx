import React, { useEffect, useRef } from 'react';
import { SecurityInfo } from '@/types/ChatResponse';
import { SQLHighlighter } from '@/lib/sql-highlighter';

interface MonacoSQLViewerProps {
  sql: string;
  securityInfo?: SecurityInfo;
  className?: string;
}

const MonacoSQLViewer: React.FC<MonacoSQLViewerProps> = ({
  sql,
  securityInfo,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 模拟 Monaco Editor 渲染
  useEffect(() => {
    if (!containerRef.current) return;

    // 清空容器
    containerRef.current.innerHTML = '';

    // 创建代码容器
    const codeContainer = document.createElement('div');
    codeContainer.className = `font-mono text-sm p-4 rounded-lg overflow-x-auto ${className}`;

    // 应用高亮
    let highlightedSQL = sql;
    let bgColor = 'bg-gray-800';
    let textColor = 'text-gray-100';

    if (securityInfo) {
      highlightedSQL = SQLHighlighter.highlightSecurity(sql, securityInfo);

      switch (SQLHighlighter.getHighlightType(securityInfo)) {
        case 'success':
          bgColor = 'bg-green-50 border border-green-200';
          textColor = 'text-green-900';
          break;
        case 'warning':
          bgColor = 'bg-yellow-50 border border-yellow-200';
          textColor = 'text-yellow-900';
          break;
        case 'error':
          bgColor = 'bg-red-50 border border-red-200';
          textColor = 'text-red-900';
          break;
      }
    }

    // 设置样式
    codeContainer.className += ` ${bgColor} ${textColor}`;

    // 格式化 SQL 并显示
    const formattedSQL = highlightedSQL
      .split('\n')
      .map(line => {
        // 移除注释行中的标记
        if (line.trim().startsWith('--')) {
          return `<span class="text-gray-500 font-semibold">${line}</span>`;
        }
        return line;
      })
      .join('\n');

    // 创建 pre 标签
    const pre = document.createElement('pre');
    pre.innerHTML = formattedSQL;
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.wordBreak = 'break-word';

    // 添加语法高亮样式
    const style = document.createElement('style');
    style.textContent = `
      .monaco-editor .keyword { color: #d73a49; font-weight: bold; }
      .monaco-editor .string { color: #032f62; }
      .monaco-editor .number { color: #005cc5; }
      .monaco-editor .comment { color: #6a737d; }
      .monaco-editor .operator { color: #d73a49; }
      .monaco-editor .punctuation { color: #24292e; }

      /* 高亮样式 */
      .highlight-owner {
        background-color: rgba(16, 185, 129, 0.2);
        border-bottom: 2px solid #10b981;
        font-weight: bold;
      }
      .highlight-blocked {
        background-color: rgba(239, 68, 68, 0.2);
        border-bottom: 2px solid #ef4444;
        text-decoration: line-through;
        color: #dc2626;
      }
    `;
    containerRef.current.appendChild(style);
    containerRef.current.appendChild(pre);

    // 应用高亮类
    const spans = pre.querySelectorAll('span');
    spans.forEach(span => {
      const text = span.textContent || '';

      // 高亮 owner_id
      if (text.includes('**')) {
        span.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<span class="highlight-owner">$1</span>');
      }

      // 高亮被拦截的字段
      if (text.includes('~~')) {
        span.innerHTML = text.replace(/~~(.*?)~~/g, '<span class="highlight-blocked">$1</span>');
      }
    });

  }, [sql, securityInfo, className]);

  return (
    <div ref={containerRef} className="w-full">
      {/* 安全状态提示 */}
      {securityInfo && (
        <div className={`mb-2 p-2 rounded text-sm font-medium ${
          SQLHighlighter.getHighlightType(securityInfo) === 'success' ? 'bg-green-100 text-green-800' :
          SQLHighlighter.getHighlightType(securityInfo) === 'warning' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {SQLHighlighter.generateSecurityStatus(securityInfo)}
        </div>
      )}
    </div>
  );
};

export default MonacoSQLViewer;