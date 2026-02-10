import React, { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { roleOptions } from '@/contexts/UserContext';
import {
  User,
  Shield,
  Settings,
  LogOut,
  ChevronDown,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const { user, setUser, roleColor } = useUser();
  const [expanded, setExpanded] = useState(false);

  const handleRoleChange = (newRole: 'Admin' | 'Manager' | 'Sales') => {
    setUser({
      ...user,
      role: newRole,
      name: newRole === 'Admin' ? '管理员' :
            newRole === 'Manager' ? '王经理' : '张三',
      region: newRole === 'Admin' ? '全国' :
              newRole === 'Manager' ? '华东' : '华东'
    });
  };

  // 权限开关状态
  const [securitySettings, setSecuritySettings] = useState({
    l1Interception: true,
    cotDisplay: true,
    realTimeLog: false
  });

  const toggleSetting = (key: keyof typeof securitySettings) => {
    setSecuritySettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className={`bg-white border-r border-gray-200 h-screen flex flex-col ${className}`}>
      {/* 顶部用户信息卡片 */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: roleColor }}
          >
            {user.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-500">{user.region}</p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-gray-100"
          >
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* 身份切换器 */}
        <div className="space-y-2">
          {roleOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleRoleChange(option.value)}
              className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center justify-between group ${
                user.role === option.value
                  ? 'bg-gray-100 border-2'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
              style={{
                borderColor: user.role === option.value ? roleColor : 'transparent'
              }}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    user.role === option.value ? 'bg-current' : 'bg-gray-300'
                  }`}
                  style={{ color: roleColor }}
                />
                <div>
                  <div className="font-medium text-gray-900 group-hover:text-gray-900">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {option.description}
                  </div>
                </div>
              </div>
              {user.role === option.value && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: roleColor }}
                >
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 权限设置区域 */}
      <div className="flex-1 p-6 space-y-6">
        {/* 安全控制 */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-gray-600" />
            <h4 className="font-semibold text-gray-900">安全控制</h4>
          </div>

          {/* L1 拦截开关 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">L1 拦截器</div>
              <div className="text-xs text-gray-500">
                启用敏感字段访问拦截
              </div>
            </div>
            <button
              onClick={() => toggleSetting('l1Interception')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                securitySettings.l1Interception
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  securitySettings.l1Interception ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* CoT 展示开关 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">思维链展示</div>
              <div className="text-xs text-gray-500">
                显示推理过程解析
              </div>
            </div>
            <button
              onClick={() => toggleSetting('cotDisplay')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                securitySettings.cotDisplay
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  securitySettings.cotDisplay ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 实时日志开关 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">实时日志</div>
              <div className="text-xs text-gray-500">
                监控安全拦截事件
              </div>
            </div>
            <button
              onClick={() => toggleSetting('realTimeLog')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                securitySettings.realTimeLog
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  securitySettings.realTimeLog ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 系统设置 */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <h4 className="font-semibold text-gray-900">系统设置</h4>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-900 mb-2">GLM 参数调节</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Temperature</span>
                <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded">0.1</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Max Tokens</span>
                <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded">2000</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部退出按钮 */}
      <div className="p-6 border-t border-gray-100">
        <button className="w-full flex items-center justify-center space-x-2 p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
          <LogOut className="w-4 h-4" />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;