import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import { UserRole } from '@/contexts/UserContext';
import { Shield, Loader2, Check, Crown, Users, User, Zap, Play } from 'lucide-react';
import { DemoScenarios } from '@/lib/demo-scenarios';

interface IdentitySwitcherProps {
  className?: string;
}

const IdentitySwitcher: React.FC<IdentitySwitcherProps> = ({ className = '' }) => {
  const { user, setUser, roleColor } = useUser();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [isVerifying, setIsVerifying] = useState(false);
  const transitionLock = useRef(false);

  const roleConfig = {
    Admin: {
      label: '系统管理员',
      icon: Crown,
      description: '全量数据权限',
      subtitle: '可审计全域 3 个区域数据',
      gradient: 'from-yellow-400 to-yellow-600',
      glow: 'shadow-[0_0_25px_rgba(212,175,55,0.6)]',
      accessLevel: 'L0 + L1',
      regions: ['华东', '华北', '华南'],
    },
    Manager: {
      label: '销售经理',
      icon: Users,
      description: '团队数据权限',
      subtitle: '可查看团队汇总数据',
      gradient: 'from-blue-500 to-blue-700',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
      accessLevel: 'L0 + 团队内 L1',
      regions: ['华东'],
    },
    Sales: {
      label: '普通销售',
      icon: User,
      description: '个人数据权限',
      subtitle: '受控行级权限：仅限个人区域',
      gradient: 'from-green-500 to-green-700',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]',
      accessLevel: '仅个人 L0',
      regions: ['华东 - 个人'],
    },
  };

  // 处理竞态条件的切换函数
  const handleRoleChange = useCallback(async (newRole: UserRole) => {
    // 防止竞态条件
    if (newRole === user.role || isTransitioning || transitionLock.current) return;

    transitionLock.current = true;
    setSelectedRole(newRole);
    setIsVerifying(true);

    try {
      // 清空对话 - 实际项目中应该调用 clearMessages 函数
      // clearMessages();

      // 模拟 800ms 权限校验过程
      await new Promise(resolve => setTimeout(resolve, 800));

      // 更新 UserContext
      setUser({
        ...user,
        role: newRole,
        name: newRole === 'Admin' ? '系统管理员' :
              newRole === 'Manager' ? '销售经理' : '销售代表',
        region: newRole === 'Admin' ? '全国' :
                newRole === 'Manager' ? '华东大区' : '华东 - 个人',
      });
    } catch (error) {
      console.error('角色切换失败:', error);
      setSelectedRole(user.role); // 回滚
    } finally {
      setIsVerifying(false);
      transitionLock.current = false;
    }
  }, [user, setUser, isTransitioning]);

  // 执行演示场景
  const executeDemoScenario = async (scenarioId: string) => {
    const scenario = DemoScenarios.getScenario(scenarioId);
    if (!scenario) return;

    setIsVerifying(true);

    try {
      // 切换到场景角色
      const targetRole = scenario.steps[0].role;

      setSelectedRole(targetRole);

      // 模拟权限验证
      await new Promise(resolve => setTimeout(resolve, 800));

      // 更新用户状态
      setUser({
        ...user,
        role: targetRole,
        name: targetRole === 'Admin' ? '系统管理员' :
              targetRole === 'Manager' ? '销售经理' : '销售代表',
        region: targetRole === 'Admin' ? '全国' :
                targetRole === 'Manager' ? '华东大区' : '华东',
      });

      // 触发消息提示（实际项目中应该通过全局事件）
      console.log(`🎬 演示场景已启动：${scenario.title}`);

      // 模拟自动发送查询
      setTimeout(() => {
        console.log(`📝 自动发送查询：${scenario.steps[0].userInput}`);
      }, 1000);

    } catch (error) {
      console.error('演示执行失败:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 当前身份卡片 */}
      <div className={`relative overflow-hidden rounded-xl p-6 bg-white border-2 transition-all duration-500 ease-in-out ${
        user.role === 'Admin'
          ? 'border-yellow-400 ' + roleConfig.Admin.glow
          : user.role === 'Manager'
          ? 'border-blue-500 ' + roleConfig.Manager.glow
          : 'border-green-500 ' + roleConfig.Sales.glow
      }`}>
        {/* 流光效果 */}
        {user.role === 'Admin' && (
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-yellow-300 to-transparent animate-shine"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-yellow-600/5"></div>
          </div>
        )}

        {/* 呼吸灯效果 */}
        {user.role === 'Sales' && (
          <div className="absolute inset-0 rounded-xl opacity-20">
            <div className={`absolute inset-0 rounded-xl bg-green-500 animate-pulse`}></div>
          </div>
        )}

        <div className="relative z-10">
          <div className="flex items-center space-x-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all duration-500 relative ${
                user.role === 'Admin' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                user.role === 'Manager' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                'bg-gradient-to-br from-green-500 to-green-700'
              }`}
            >
              <roleConfig[user.role].icon className="w-7 h-7" />
              {/* Admin 添加小皇冠装饰 */}
              {user.role === 'Admin' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Zap className="w-2 h-2 text-yellow-900" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-gray-900 transition-all duration-500">
                  {user.name}
                </h3>
                <Shield className="w-4 h-4 text-gray-500 flex-shrink-0" />
              </div>

              {/* 副标题和权限信息 */}
              <div className="mt-1 space-y-1">
                <p className="text-sm text-gray-600 transition-all duration-500">
                  {user.region} · {roleConfig[user.role].description}
                </p>
                <p className="text-xs font-medium text-gray-700 transition-all duration-500">
                  {roleConfig[user.role].subtitle}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500">权限等级:</span>
                    <span className="text-xs font-semibold text-gray-700">
                      {roleConfig[user.role].accessLevel}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500">区域:</span>
                    <span className="text-xs font-medium text-gray-700">
                      {roleConfig[user.role].regions.join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center space-x-2">
                <span className="text-xs font-medium text-gray-700">
                  当前身份：{roleConfig[user.role].label}
                </span>
                {isVerifying && (
                  <div className="ml-2 text-xs text-blue-600 animate-pulse">
                    权限策略同步中...
                  </div>
                )}
              </div>
            </div>
            {isVerifying ? (
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            ) : isTransitioning ? (
              <Check className="w-6 h-6 text-green-500" />
            ) : null}
          </div>
        </div>
      </div>

      {/* 角色切换选项 */}
      <div className="space-y-3">
        {(Object.keys(roleConfig) as UserRole[]).map((role) => {
          const Icon = roleConfig[role].icon;
          const isActive = user.role === role;
          const isSelected = selectedRole === role;

          return (
            <button
              key={role}
              onClick={() => handleRoleChange(role)}
              disabled={isVerifying || isTransitioning}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-300 ease-in-out relative overflow-hidden ${
                isActive
                  ? role === 'Admin'
                    ? 'border-yellow-400 bg-yellow-50 ' + roleConfig.Admin.glow
                    : role === 'Manager'
                    ? 'border-blue-500 bg-blue-50 ' + roleConfig.Manager.glow
                    : 'border-green-500 bg-green-50 ' + roleConfig.Sales.glow
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {/* 选中指示器 */}
              {isSelected && !isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl"></div>
              )}

              {/* 角色徽章 */}
              <div className="absolute top-2 right-2">
                <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                  role === 'Admin' ? 'bg-yellow-100 text-yellow-800' :
                  role === 'Manager' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {roleConfig[role].accessLevel}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                    isActive
                      ? role === 'Admin'
                        ? 'bg-gradient-to-br from-yellow-400 to-yellow-600'
                        : role === 'Manager'
                        ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                        : 'bg-gradient-to-br from-green-500 to-green-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center space-x-2">
                    <div className="font-semibold text-gray-900 transition-all duration-300">
                      {roleConfig[role].label}
                    </div>
                    {isActive && (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-sm text-gray-600 transition-all duration-300">
                    {roleConfig[role].description}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {roleConfig[role].subtitle}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-400">区域:</span>
                    <span className="text-xs text-gray-600">
                      {roleConfig[role].regions.join(', ')}
                    </span>
                  </div>
                </div>
                {isVerifying && isSelected && (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 演示场景选择器 */}
      <div className="pt-4 border-t border-gray-200 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">🎬 演示剧本</h3>

        {DemoScenarios.getAllScenarios().map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => executeDemoScenario(scenario.id)}
            disabled={isVerifying || isTransitioning}
            className="w-full p-3 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg text-left hover:from-gray-100 hover:to-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center space-x-3">
              <Play className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm">
                  {scenario.title}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {scenario.description}
                </div>
              </div>
              {isVerifying && (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* 快速演示按钮 */}
      <div className="pt-2">
        <button
          onClick={() => executeDemoScenario('1')}
          disabled={isVerifying || isTransitioning}
          className="w-full py-2 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center space-x-2">
            <User className="w-4 h-4" />
            <span>🚀 一键演示：销售查看毛利</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default IdentitySwitcher;