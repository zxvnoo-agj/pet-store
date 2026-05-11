import React from 'react';
import BottomTabBar from './BottomTabBar';

interface MobileLayoutProps {
  children: React.ReactNode;
  showTabBar?: boolean;
  activeTab?: string;
  className?: string;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  showTabBar = true,
  activeTab = 'home',
  className = '',
}) => {
  return (
    <div className="min-h-screen w-full bg-gray-100 flex justify-center items-start py-0 md:py-8">
      {/* 手机外壳模拟 */}
      <div className="w-full max-w-[430px] h-[100dvh] md:h-[850px] bg-gray-50 md:rounded-[40px] md:shadow-2xl md:border-[8px] md:border-gray-800 overflow-hidden relative flex flex-col">
        {/* 刘海屏模拟（桌面端显示） */}
        <div className="hidden md:block h-6 bg-gray-800 rounded-b-xl mx-auto w-32 z-10 shrink-0" />
        
        {/* 主内容区域 */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide ${className}`}>
          {children}
        </main>

        {/* 底部TabBar */}
        {showTabBar && (
          <div className="shrink-0 z-10">
            <BottomTabBar activeTab={activeTab} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileLayout;
