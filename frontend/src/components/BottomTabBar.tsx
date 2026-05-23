import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, User } from 'lucide-react';
import { AiAssistantIcon } from './Icons';

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
                <AiAssistantIcon size={22} color={isActive ? '#f97316' : '#9ca3af'} />
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
