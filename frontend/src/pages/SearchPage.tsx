import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';

const searchHistory = ['幼猫猫粮', '渴望六种鱼', '性价比猫粮', '猫罐头'];

const hotSearches = [
  '皇家猫粮 K36',
  '渴望六种鱼',
  '幼猫吃什么好',
  '国产猫粮推荐',
  '猫粮性价比排行',
  '猫罐头推荐',
  '冻干猫粮',
  '布偶猫猫粮',
];

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = (q: string) => {
    if (q.trim()) {
      navigate(`/products?search=${encodeURIComponent(q)}`);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-100 flex justify-center items-start md:py-8">
      <div className="w-full max-w-[430px] h-[100dvh] md:h-[850px] bg-gray-50 md:rounded-[40px] md:shadow-2xl md:border-[8px] md:border-gray-800 overflow-hidden relative flex flex-col">
        <div className="hidden md:block h-6 bg-gray-800 rounded-b-xl mx-auto w-32 z-10 shrink-0" />
        
        {/* 搜索头部 */}
        <div className="shrink-0 bg-white px-4 py-2.5 flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <Icon name="arrowLeft" size={20} className="text-gray-600" />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-3.5 py-2">
            <Icon name="search" size={14} className="text-gray-400" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
              placeholder="搜索猫粮、狗粮、用品..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery('')}>
                <Icon name="x" size={14} className="text-gray-400" />
              </button>
            )}
          </div>
          <button
            className="text-sm text-orange-500 font-medium"
            onClick={() => handleSearch(query)}
          >
            搜索
          </button>
        </div>

        <main className="flex-1 overflow-y-auto px-4 py-4">
          {/* 搜索历史 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Icon name="clock" size={14} className="text-gray-400" />
                搜索历史
              </h3>
              <button className="text-xs text-gray-400">清除</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1.5 bg-white rounded-full text-xs text-gray-600 border border-gray-100"
                  onClick={() => handleSearch(item)}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* 热门搜索 */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
              <Icon name="trendingUp" size={14} className="text-orange-500" />
              热门搜索
            </h3>
            <div className="bg-white rounded-2xl overflow-hidden">
              {hotSearches.map((item, index) => (
                <button
                  key={item}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-left"
                  onClick={() => handleSearch(item)}
                >
                  <span
                    className={`text-xs font-bold w-4 text-center ${
                      index < 3 ? 'text-orange-500' : 'text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-700">{item}</span>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SearchPage;
