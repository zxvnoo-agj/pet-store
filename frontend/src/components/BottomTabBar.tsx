import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, User } from 'lucide-react';

interface BottomTabBarProps {
  activeTab?: string;
}

const tabs = [
  { key: 'home', label: '首页', icon: Home, path: '/' },
  { key: 'category', label: '分类', icon: LayoutGrid, path: '/category' },
  { key: 'chat', label: 'AI助手', path: '/chat' },
  { key: 'mine', label: '我的', icon: User, path: '/mine' },
];

const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab: propActiveTab }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeKey = propActiveTab || (() => {
    const path = location.pathname;
    const tab = tabs.find(t => t.path === path);
    return tab?.key || 'home';
  })();

  return (
    <div className="h-14 bg-white border-t border-gray-200 flex items-center justify-around select-none shrink-0">
      {tabs.map((tab) => {
        const isActive = activeKey === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center justify-center gap-0.5 w-16 h-full relative"
          >
            <div className={`p-1 rounded-lg transition-colors ${isActive ? 'text-orange-500' : 'text-gray-400'}`}>
              {tab.key === 'chat' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0-3.31-3.58-6-8-6S4 6.69 4 10c0 1.89 1.08 3.56 2.78 4.66L6 20l3.87-2.71c.66.13 1.34.2 2.03.21.34 0 .67-.02 1-.06"/>
                  <path d="M17.5 14l.5-1.5.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5z"/>
                  <path d="M8 4.5L6.5 2"/><path d="M10 4.2L9.5 1.5"/>
                  <path d="M14 4.2L14.5 1.5"/><path d="M16 4.5L17.5 2"/>
                  <circle cx="9" cy="10" r=".8" fill="currentColor" stroke="none"/>
                  <circle cx="15" cy="10" r=".8" fill="currentColor" stroke="none"/>
                  <path d="M9.5 12.5c.6.5 1.4.8 2.25.8s1.65-.3 2.25-.8"/>
                </svg>
              ) : tab.icon ? (
                <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              ) : null}
            </div>
            <span className={`text-[10px] leading-none ${isActive ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
              {tab.label}
            </span>
            {isActive && (
              <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-orange-500 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default BottomTabBar;
