import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Send, Sparkles, ShoppingBag, Loader2, User } from 'lucide-react';
import { products, quickQuestions } from '../data/mockData';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  isComplete?: boolean;
  referencedProducts?: typeof products;
}

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      content: '你好！我是你的宠物用品顾问🐾\n\n我可以帮你：\n• 根据宠物情况推荐合适的用品\n• 对比不同产品的优缺点\n• 分析真实用户评价\n• 解答养宠常见问题\n\n有什么可以帮你的吗？',
      isComplete: true,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStream, setCurrentStream] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStream]);

  // 模拟流式响应
  const simulateStreamResponse = async (userMessage: string) => {
    setIsLoading(true);
    setCurrentStream('');

    // 模拟思考延迟
    await new Promise(resolve => setTimeout(resolve, 800));

    // 根据用户问题生成回复
    const responses = [
      {
        keywords: ['幼猫', '小猫', '3个月', '三个月'],
        content: `对于3个月幼猫，建议选择专门的幼猫粮，营养配比更适合生长发育。\n\n根据您的预算和需求，我推荐以下几款：\n\n**🥇 皇家幼猫粮 K36** — ¥168起\n✅ 专为4-12月龄幼猫设计\n✅ 颗粒小，容易咀嚼\n✅ 营养均衡，适口性好\n⚠️ 香精味较重\n\n**🥈 渴望幼猫粮** — ¥189起\n✅ 高蛋白，天然无谷\n✅ 鲜肉含量高\n⚠️ 部分猫咪可能软便\n\n**🥉 网易严选幼猫粮** — ¥89起\n✅ 性价比之选\n✅ 第三方检测透明\n⚠️ 适口性因猫而异\n\n需要我详细对比某两款吗？`,
        products: products.filter(p => p.id === 6 || p.id === 2),
      },
      {
        keywords: ['皇家', '渴望', '对比', '哪个好'],
        content: `**皇家猫粮 vs 渴望猫粮 对比分析：**\n\n📊 **核心数据对比**\n\n| 维度 | 皇家 Indoor 27 | 渴望六种鱼 |\n|------|----------------|------------|\n| 价格 | ¥128起 | ¥389起 |\n| 综合评分 | ⭐4.5 | ⭐4.7 |\n| 蛋白质 | 中等 | 极高 |\n| 适口性 | 4.3 | 4.6 |\n\n✅ **皇家优势：**\n• 价格亲民，多猫家庭友好\n• 适口性好，大部分猫接受\n• 营养均衡，品控稳定\n\n✅ **渴望优势：**\n• 天然无谷，食材优质\n• 高蛋白，毛发改善明显\n• 口碑顶级，品质有保障\n\n💡 **建议：**\n• 预算充足 + 追求高品质 → 渴望\n• 多猫家庭 / 性价比优先 → 皇家`,
        products: products.filter(p => p.id === 1 || p.id === 2),
      },
      {
        keywords: ['200', '预算', '便宜', '性价比'],
        content: `200元预算内，推荐以下高性价比猫粮：\n\n**🏆 网易严选全价猫粮** — ¥69起\n⭐4.2  性价比之王\n✅ 动物性原料≥70%\n✅ 配方透明，检测报告公开\n✅ 1890+条真实评价\n\n**🥈 素力高金装猫粮** — ¥199起\n⭐4.3  老牌进口粮\n✅ 美国进口，肠道友好\n✅ 富含益生菌\n\n**🥉 皇家室内成猫粮** — ¥128起\n⭐4.5  经典之选\n✅ 品牌历史悠久\n✅ 适口性佳\n\n需要了解其中某款的详细评价吗？`,
        products: products.filter(p => p.id === 3 || p.id === 10 || p.id === 1),
      },
    ];

    let matchedResponse = responses.find(r =>
      r.keywords.some(k => userMessage.includes(k))
    );

    if (!matchedResponse) {
      matchedResponse = {
        keywords: [],
        content: `这个问题问得很好！让我来帮你分析一下。\n\n根据我的了解，选购猫粮主要需要考虑以下几个方面：\n\n1️⃣ **猫咪年龄** — 幼猫、成猫、老年猫营养需求不同\n2️⃣ **健康状况** — 是否有过敏、肥胖、泌尿系统等问题\n3️⃣ **预算范围** — 量力而行，贵的不一定最适合\n4️⃣ **适口性** — 再好的粮猫不吃也白搭\n\n你可以告诉我：\n• 你的猫咪多大了？\n• 有没有特殊健康需求？\n• 预算大概在什么范围？\n\n这样我可以给你更精准的推荐！`,
        products: [],
      };
    }

    // 模拟流式输出
    const chars = matchedResponse.content.split('');
    let accumulated = '';
    for (const char of chars) {
      accumulated += char;
      setCurrentStream(accumulated);
      await new Promise(resolve => setTimeout(resolve, 15));
    }

    const newMessage: Message = {
      id: Date.now(),
      role: 'assistant',
      content: matchedResponse.content,
      isComplete: true,
      referencedProducts: matchedResponse.products,
    };

    setMessages(prev => [...prev, newMessage]);
    setCurrentStream('');
    setIsLoading(false);
  };

  const handleSend = async (text?: string) => {
    const content = text || inputValue.trim();
    if (!content || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content,
      isComplete: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    await simulateStreamResponse(content);
  };

  // 解析消息内容中的markdown风格
  const renderMessage = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // 标题
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={i} className="text-sm font-bold text-gray-800 mt-2 mb-1">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }
      // 粗体行
      if (line.startsWith('**') && line.includes('**')) {
        return (
          <p key={i} className="text-xs font-semibold text-gray-700 mt-1.5">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }
      // 列表项
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <p key={i} className="text-xs text-gray-600 pl-1 py-0.5">
            {line}
          </p>
        );
      }
      // 编号项
      if (/^\d️⃣/.test(line) || /^\d\./.test(line)) {
        return (
          <p key={i} className="text-xs text-gray-700 font-medium mt-1.5 pl-1">
            {line}
          </p>
        );
      }
      // 分隔符
      if (line.startsWith('---')) {
        return <hr key={i} className="my-2 border-gray-200" />;
      }
      // 表格
      if (line.startsWith('|')) {
        const cells = line.split('|').filter(c => c.trim());
        if (cells.length > 1 && !line.includes('---')) {
          return (
            <div key={i} className="flex gap-2 py-0.5 text-xs">
              {cells.map((cell, j) => (
                <span key={j} className={`${j === 0 ? 'font-medium text-gray-600 w-20' : 'text-gray-700'}`}>
                  {cell.trim()}
                </span>
              ))}
            </div>
          );
        }
        return null;
      }
      // 空行
      if (!line.trim()) {
        return <div key={i} className="h-1" />;
      }
      // 普通文本
      return (
        <p key={i} className="text-xs text-gray-700 leading-relaxed py-0.5">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen w-full bg-gray-100 flex justify-center items-start md:py-8">
      <div className="w-full max-w-[430px] h-[100dvh] md:h-[850px] bg-gray-50 md:rounded-[40px] md:shadow-2xl md:border-[8px] md:border-gray-800 overflow-hidden relative flex flex-col">
        <div className="hidden md:block h-6 bg-gray-800 rounded-b-xl mx-auto w-32 z-10 shrink-0" />

        {/* 头部 */}
        <div className="shrink-0 bg-white px-4 py-2.5 flex items-center gap-3 border-b border-gray-100 z-10">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-800">AI宠物顾问</h1>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="text-[10px] text-gray-400">在线</span>
              </div>
            </div>
          </div>
          <button className="ml-auto p-1.5">
            <MoreHorizontal size={20} className="text-gray-600" />
          </button>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shrink-0 mr-2 self-start mt-0.5">
                  <Sparkles size={13} className="text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-orange-500 text-white rounded-br-md'
                    : 'bg-white border border-gray-100 rounded-bl-md shadow-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-xs leading-relaxed">{msg.content}</p>
                ) : (
                  <div>{renderMessage(msg.content)}</div>
                )}

                {/* 推荐商品卡片 */}
                {msg.referencedProducts && msg.referencedProducts.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.referencedProducts.map((product) => (
                      <button
                        key={product.id}
                        className="w-full flex items-center gap-2.5 p-2 bg-gray-50 rounded-xl text-left hover:bg-orange-50 transition-colors"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-gray-800 truncate">{product.name}</p>
                          <p className="text-[10px] text-orange-600 font-medium">¥{product.priceMin}起</p>
                        </div>
                        <ShoppingBag size={14} className="text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 ml-2 self-start mt-0.5">
                  <User size={13} className="text-gray-500" />
                </div>
              )}
            </div>
          ))}

          {/* 流式输出 */}
          {currentStream && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shrink-0 mr-2 self-start mt-0.5">
                <Sparkles size={13} className="text-white" />
              </div>
              <div className="max-w-[75%] rounded-2xl px-3.5 py-2.5 bg-white border border-gray-100 rounded-bl-md shadow-sm">
                <div>{renderMessage(currentStream)}</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-1 h-1 bg-orange-400 rounded-full animate-pulse" />
                  <span className="w-1 h-1 bg-orange-400 rounded-full animate-pulse delay-75" />
                  <span className="w-1 h-1 bg-orange-400 rounded-full animate-pulse delay-150" />
                </div>
              </div>
            </div>
          )}

          {/* 加载状态 */}
          {isLoading && !currentStream && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shrink-0 mr-2 self-start">
                <Sparkles size={13} className="text-white" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-white border border-gray-100 rounded-bl-md shadow-sm">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 size={14} className="animate-spin text-orange-500" />
                  <span>正在搜索相关产品...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 快捷问题 */}
        {messages.length <= 1 && (
          <div className="shrink-0 px-4 pb-2">
            <p className="text-[10px] text-gray-400 mb-2">你可以这样问：</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  className="shrink-0 px-3 py-1.5 bg-white border border-orange-200 text-orange-600 text-xs rounded-full hover:bg-orange-50 transition-colors"
                  onClick={() => handleSend(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 输入栏 */}
        <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-2.5 flex items-center gap-2 z-10">
          <input
            ref={inputRef}
            className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-orange-200 transition-shadow"
            placeholder="请输入问题，如：幼猫吃什么粮好？"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              inputValue.trim() && !isLoading
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-200 text-gray-400'
            }`}
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
