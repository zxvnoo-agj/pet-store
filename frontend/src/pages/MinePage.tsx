import React from 'react';
import { Icon } from '../components/Icon';
import MobileLayout from '../components/MobileLayout';
import { FavoriteIcon } from '../components/Icons';

const menuItems = [
  { icon: 'favorite' as const, label: '我的收藏', desc: '12个商品', color: 'text-red-500', bg: 'bg-red-50' },
  { icon: 'clock' as const, label: '浏览历史', desc: '', color: 'text-blue-500', bg: 'bg-blue-50' },
  { icon: 'messageSquare' as const, label: '我的评价', desc: '3条评价', color: 'text-green-500', bg: 'bg-green-50' },
  { icon: 'star' as const, label: '我的关注', desc: '关注的品牌', color: 'text-orange-500', bg: 'bg-orange-50' },
];

const otherItems = [
  { icon: 'helpCircle' as const, label: '帮助与反馈', color: 'text-gray-500', bg: 'bg-gray-50' },
  { icon: 'shield' as const, label: '隐私设置', color: 'text-gray-500', bg: 'bg-gray-50' },
  { icon: 'settings' as const, label: '通用设置', color: 'text-gray-500', bg: 'bg-gray-50' },
];

const MinePage: React.FC = () => {

  return (
    <MobileLayout activeTab="mine" className="bg-gray-50">
      {/* 头部背景 */}
      <div className="bg-gradient-to-br from-orange-400 to-orange-500 px-4 pt-8 pb-10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-3xl">
            🐱
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">猫奴小王</h1>
            <p className="text-xs text-orange-100 mt-0.5">养猫 2 年 · 1 只猫咪</p>
          </div>
          <button className="p-1.5">
            <Icon name="settings" size={20} color="white" className="opacity-80" />
          </button>
        </div>

        {/* 数据统计 */}
        <div className="flex justify-around mt-6">
          {[
            { label: '收藏', value: '12' },
            { label: '评价', value: '5' },
            { label: '提问', value: '23' },
            { label: '浏览', value: '168' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-lg font-bold text-white">{item.value}</p>
              <p className="text-[10px] text-orange-100">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 宠物卡片 */}
      <div className="px-4 -mt-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <span className="text-3xl">🐱</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">咪咪</p>
            <p className="text-xs text-gray-500">英国短毛猫 · 2岁 · 4.5kg</p>
          </div>
          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">已绝育</span>
        </div>
      </div>

      {/* 功能菜单 */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {menuItems.map((item, i) => {
            return (
              <button
                key={i}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-left"
              >
                <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center`}>
                  {item.icon === 'favorite' ? (
                    <FavoriteIcon size={18} color="#ef4444" />
                  ) : (
                    <Icon name={item.icon} size={18} className={item.color} />
                  )}
                </div>
                <span className="flex-1 text-sm text-gray-800">{item.label}</span>
                {item.desc && <span className="text-xs text-gray-400">{item.desc}</span>}
                <Icon name="chevronRight" size={14} className="text-gray-300" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 其他 */}
      <div className="px-4 mt-4 pb-6">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {otherItems.map((item, i) => {
            return (
              <button
                key={i}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-left"
              >
                <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center`}>
                  <Icon name={item.icon} size={18} className={item.color} />
                </div>
                <span className="flex-1 text-sm text-gray-800">{item.label}</span>
                <Icon name="chevronRight" size={14} className="text-gray-300" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 底部信息 */}
      <div className="text-center pb-6">
        <p className="text-[10px] text-gray-400">宠物好物助手 v1.0.0</p>
      </div>
    </MobileLayout>
  );
};

export default MinePage;
