'use client';

import React from 'react';
import { UserProvider } from '@/contexts/UserContext';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import InsightPanel from '@/components/InsightPanel';

const Page = () => {
  return (
    <UserProvider>
      <div className="flex h-screen bg-gray-50">
        {/* 全局顶部装饰条，根据身份变色 */}
        <div className="fixed top-0 left-0 right-0 h-1 z-50"
             style={{
               background: 'linear-gradient(90deg, #D4AF37 0%, #F4E4C1 50%, #D4AF37 100%)'
             }}>
        </div>

        {/* 左侧配置栏 */}
        <Sidebar className="w-1/4" />

        {/* 中间对话栏 */}
        <div className="w-1/2 h-full">
          <ChatWindow />
        </div>

        {/* 右侧展示栏 */}
        <InsightPanel className="w-1/4" />
      </div>
    </UserProvider>
  );
};

export default Page;