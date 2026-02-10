import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ThemeManager } from '@/lib/theme-manager';

export type UserRole = 'Admin' | 'Manager' | 'Sales';

export interface User {
  userId: string;
  role: UserRole;
  name: string;
  region: string;
}

interface UserContextType {
  user: User;
  setUser: (user: User) => void;
  isAdmin: boolean;
  isManager: boolean;
  isSales: boolean;
  roleColor: string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// 角色对应的颜色
const ROLE_COLORS = {
  Admin: '#D4AF37', // 金色
  Manager: '#3B82F6', // 蓝色
  Sales: '#10B981', // 绿色
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>({
    userId: 'sales001',
    role: 'Sales',
    name: '张三',
    region: '华东',
  });

  // 监听角色变化，应用主题
  useEffect(() => {
    ThemeManager.applyTheme(user.role);
  }, [user.role]);

  const isAdmin = user.role === 'Admin';
  const isManager = user.role === 'Manager';
  const isSales = user.role === 'Sales';
  const roleColor = ROLE_COLORS[user.role];

  return (
    <UserContext.Provider value={{
      user,
      setUser,
      isAdmin,
      isManager,
      isSales,
      roleColor,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// 角色切换工具函数
export const roleOptions: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'Admin',
    label: '系统管理员',
    description: '全量数据权限，可配置语义字典'
  },
  {
    value: 'Manager',
    label: '销售经理',
    description: '团队数据权限，可查看团队汇总'
  },
  {
    value: 'Sales',
    label: '普通销售',
    description: '个人数据权限，仅查看个人业绩'
  }
];