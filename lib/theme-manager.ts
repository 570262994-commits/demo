import { UserRole } from '@/contexts/UserContext';

/**
 * 主题管理器
 * 管理不同身份下的全局样式和视觉效果
 */
export class ThemeManager {
  /**
   * 根据角色获取主题配置
   */
  static getThemeConfig(role: UserRole) {
    switch (role) {
      case 'Admin':
        return {
          primaryColor: '#D4AF37', // 金色
          secondaryColor: '#F4E4C1',
          backgroundColor: '#FEF3C7',
          borderColor: '#F59E0B',
          shadowColor: 'rgba(212, 175, 55, 0.3)',
          gradient: 'from-yellow-400 via-yellow-500 to-yellow-600',
          glow: 'shadow-[0_0_30px_rgba(212,175,55,0.4)]',
          icon: '👑',
        };
      case 'Manager':
        return {
          primaryColor: '#3B82F6', // 蓝色
          secondaryColor: '#DBEAFE',
          backgroundColor: '#EFF6FF',
          borderColor: '#2563EB',
          shadowColor: 'rgba(59, 130, 246, 0.3)',
          gradient: 'from-blue-500 via-blue-600 to-blue-700',
          glow: 'shadow-[0_0_25px_rgba(59,130,246,0.4)]',
          icon: '👥',
        };
      case 'Sales':
        return {
          primaryColor: '#10B981', // 绿色
          secondaryColor: '#D1FAE5',
          backgroundColor: '#ECFDF5',
          borderColor: '#059669',
          shadowColor: 'rgba(16, 185, 129, 0.3)',
          gradient: 'from-green-500 via-green-600 to-green-700',
          glow: 'shadow-[0_0_20px_rgba(16,185,129,0.4)]',
          icon: '👤',
        };
      default:
        return this.getThemeConfig('Sales');
    }
  }

  /**
   * 应用主题到文档根元素
   */
  static applyTheme(role: UserRole) {
    const theme = this.getThemeConfig(role);
    const root = document.documentElement;

    // 更新 CSS 变量
    root.style.setProperty('--theme-primary', theme.primaryColor);
    root.style.setProperty('--theme-secondary', theme.secondaryColor);
    root.style.setProperty('--theme-background', theme.backgroundColor);
    root.style.setProperty('--theme-border', theme.borderColor);
    root.style.setProperty('--theme-shadow', theme.shadowColor);

    // 更新全局渐变
    const gradientBar = document.querySelector('.fixed.top-0');
    if (gradientBar) {
      gradientBar.setAttribute('style', `
        background: linear-gradient(90deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 50%, ${theme.primaryColor} 100%);
        height: 4px;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 50;
      `);
    }

    // 更新 body 背景
    document.body.className = `bg-gray-50 transition-colors duration-500`;
  }

  /**
   * 获取角色特定的动画类
   */
  static getRoleAnimationClasses(role: UserRole): string {
    switch (role) {
      case 'Admin':
        return 'animate-pulse';
      case 'Manager':
        return 'animate-bounce';
      case 'Sales':
        return 'animate-pulse';
      default:
        return '';
    }
  }

  /**
   * 生成角色特定的阴影动画
   */
  static getRoleShadowAnimation(role: UserRole): string {
    const theme = this.getThemeConfig(role);
    return `
      @keyframes shadow-${role} {
        0% { box-shadow: 0 0 0 0 rgba(${this.hexToRgb(theme.primaryColor)}, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(${this.hexToRgb(theme.primaryColor)}, 0); }
        100% { box-shadow: 0 0 0 0 rgba(${this.hexToRgb(theme.primaryColor)}, 0); }
      }
      .shadow-${role}-animate {
        animation: shadow-${role} 2s infinite;
      }
    `;
  }

  /**
   * 转换十六进制颜色为 RGB
   */
  private static hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
      `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
      '255, 255, 255';
  }

  /**
   * 创建主题切换的过渡动画
   */
  static createThemeTransition(): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = `
      * {
        transition: background-color 0.3s ease, border-color 0.3s ease,
                   color 0.3s ease, box-shadow 0.3s ease;
      }

      .theme-transition-fast {
        transition: all 0.1s ease;
      }

      .theme-transition-slow {
        transition: all 0.5s ease;
      }
    `;
    return style;
  }
}