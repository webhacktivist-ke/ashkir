
import React, { useEffect, useState, useRef } from 'react';
import { GamePhase, Player, ChatMessage, BetHistoryItem } from '../types';
import { RANDOM_CHAT_MESSAGES } from '../constants';
import { Bot, User, MessageSquare, Trophy, ShieldAlert, History as HistoryIcon, Clock, Hash, Users, ArrowDownWideNarrow, XCircle, CloudRain, CheckCircle2 } from 'lucide-react';
import { getGameAssistantResponse } from '../services/geminiService';

interface SidebarProps {
  phase: GamePhase;
  multiplier: number;
  currentPlayers: Player[];
  history: BetHistoryItem[];
  onlineUsers?: number;
  isDarkMode: boolean;
  onClaimRain: (amount: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ phase, multiplier, currentPlayers, history, onlineUsers = 0, isDarkMode, onClaimRain }) => {
  const [activeTab, setActiveTab] = useState<'bets' | 'chat' | 'history'>('bets');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Mambo vipi! I am DundaBot. I calculate risks so you don\'t have to (but I might be wrong!).' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [sortBy, setSortBy] = useState<'bet' | 'result'>('bet'); // New sort state

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentPlayersRef = useRef(currentPlayers);

  // Keep ref updated to access latest players in interval without resetting it
  useEffect(() => {
    currentPlayersRef.current = currentPlayers;
  }, [currentPlayers]);

  useEffect(() => {
    if (activeTab === 'chat' && messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Random Chat & Rain Simulation
  useEffect(() => {
    const interval = setInterval(() => {
        const players = currentPlayersRef.current;
        const rand = Math.random();

        // 1. Rain Logic (Rare Event - 5% chance every 3s if players exist)
        if (rand < 0.05 && players.length > 5) {
             const amount = [50, 100, 200, 500][Math.floor(Math.random() * 4)];
             const rainMsg: ChatMessage = {
                 id: `rain-${Date.now()}`,
                 role: 'system',
                 text: 'Free Rain!',
                 isRain: true,
                 rainAmount: amount,
                 claimed: false
             };
             setMessages(prev => [...prev, rainMsg]);
             return; // Skip chat if rain happens
        }

        // 2. Chat Logic (30% chance)
        if (rand < 0.35 && players.length > 0) {
            const bots = players.filter(p => !p.id.startsWith('me'));
            if (bots.length > 0) {
                const randomBot = bots[Math.floor(Math.random() * bots.length)];
                const randomMsg = RANDOM_CHAT_MESSAGES[Math.floor(Math.random() * RANDOM_CHAT_MESSAGES.length)];
                
                const newMsg: ChatMessage = {
                    id: Date.now().toString() + Math.random().toString(),
                    role: 'player',
                    text: randomMsg,
                    name: randomBot.name,
                    avatar: randomBot.avatar
                };
                
                setMessages(prev => {
                    const updated = [...prev, newMsg];
                    // Keep history manageable (last 50 messages)
                    if (updated.length > 50) return updated.slice(updated.length - 50);
                    return updated;
                });
            }
        }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
        const historyForAi = messages.filter(m => !m.isRain).map(m => ({
            role: (m.role === 'model' ? 'model' : 'user') as 'user' | 'model',
            text: m.role === 'player' ? `[Player ${m.name}]: ${m.text}` : m.text
        }));

        const responseText = await getGameAssistantResponse(userMsg.text, historyForAi);
        const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
        setMessages(prev => [...prev, botMsg]);
    } catch (e) {
        console.error(e);
    } finally {
        setIsTyping(false);
    }
  };

  const handleClaim = (id: string, amount: number) => {
      setMessages(prev => prev.map(m => {
          if (m.id === id && !m.claimed) {
              onClaimRain(amount);
              return { ...m, claimed: true };
          }
          return m;
      }));
  };

  // Sort players logic
  const sortedPlayers = [...currentPlayers].sort((a, b) => {
      if (sortBy === 'result') {
          // Sort by Cashout multiplier desc
          const multA = a.cashedOutAt || 0;
          const multB = b.cashedOutAt || 0;
          if (multB !== multA) return multB - multA;
      }
      // Default / Tie-breaker: High bets first
      return b.betAmount - a.betAmount;
  });

  // Helper for history color
  const getHistoryColor = (m: number) => {
    if (m < 2) return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
    if (m < 10) return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
    return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
  };

  // Theme Constants
  const bgPanel = isDarkMode ? 'bg-zinc-900' : 'bg-slate-900';
  const bgHeader = isDarkMode ? 'bg-black' : 'bg-[#0B0E14]';
  const borderCol = isDarkMode ? 'border-zinc-800' : 'border-slate-800';
  const textSub = isDarkMode ? 'text-zinc-500' : 'text-slate-500';
  const textMain = isDarkMode ? 'text-zinc-300' : 'text-slate-300';
  const hoverText = isDarkMode ? 'hover:text-zinc-300' : 'hover:text-slate-300';
  const activeSortClass = isDarkMode ? 'text-amber-400' : 'text-amber-500';

  return (
    <div className={`w-full lg:w-96 ${bgPanel} border ${borderCol} flex flex-col h-[600px] lg:h-auto rounded-2xl overflow-hidden mt-4 lg:mt-0 shadow-xl transition-colors duration-300`}>
      {/* Tabs */}
      <div className={`flex border-b ${borderCol} ${bgHeader}`}>
        <button 
          onClick={() => setActiveTab('bets')}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'bets' ? `${bgPanel} text-rose-500 border-t-2 border-rose-500` : `${textSub} ${hoverText}`}`}
        >
          <Trophy size={14} /> Bets
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'history' ? `${bgPanel} text-indigo-400 border-t-2 border-indigo-400` : `${textSub} ${hoverText}`}`}
        >
          <HistoryIcon size={14} /> History
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? `${bgPanel} text-amber-400 border-t-2 border-amber-400` : `${textSub} ${hoverText}`}`}
        >
          <MessageSquare size={14} /> Chat
        </button>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-hidden relative ${bgPanel}`}>
        {activeTab === 'bets' && (
          <div className="h-full flex flex-col">
             {/* Player Counts Bar */}
             <div className={`${bgHeader} border-b ${borderCol} px-4 py-2 flex justify-between items-center text-[10px] font-bold tracking-wider text-slate-400`}>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-emerald-500">{onlineUsers} ONLINE</span>
                </div>
                <div className="flex items-center gap-2">
                    <Users size={12} />
                    <span>{currentPlayers.length} PLAYING</span>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700">
                {/* Sortable Header */}
                <div className={`sticky top-0 ${isDarkMode ? 'bg-zinc-900/95' : 'bg-slate-900/95'} backdrop-blur z-10 grid grid-cols-3 text-[10px] ${textSub} px-4 py-2 border-b ${borderCol} font-bold uppercase tracking-wider`}>
                    <span className="col-span-1">Player</span>
                    
                    {/* Sort by Bet */}
                    <button 
                        onClick={() => setSortBy('bet')} 
                        className={`col-span-1 text-center flex items-center justify-center gap-1 hover:text-white transition cursor-pointer ${sortBy === 'bet' ? activeSortClass : ''}`}
                    >
                        Bet {sortBy === 'bet' && <ArrowDownWideNarrow size={10} />}
                    </button>
                    
                    {/* Sort by Result */}
                    <button 
                        onClick={() => setSortBy('result')}
                        className={`col-span-1 text-right flex items-center justify-end gap-1 hover:text-white transition cursor-pointer ${sortBy === 'result' ? activeSortClass : ''}`}
                    >
                        Result {sortBy === 'result' && <ArrowDownWideNarrow size={10} />}
                    </button>
                </div>

                <div className="flex flex-col">
                {sortedPlayers.length === 0 ? (
                <div className={`p-8 text-center ${textSub} text-sm italic`}>Waiting for bets...</div>
                ) : (
                    sortedPlayers.map(p => (
                    <div key={p.id} className={`grid grid-cols-3 items-center px-4 py-2 border-b ${isDarkMode ? 'border-zinc-800/50' : 'border-slate-800/50'} ${p.id.startsWith('me') ? `${isDarkMode ? 'bg-zinc-800/50' : 'bg-slate-800/50'} border-l-2 border-l-amber-500` : ''} ${p.cashedOutAt ? 'bg-emerald-900/5' : (phase === GamePhase.CRASHED ? 'bg-rose-900/5' : '')}`}>
                        <div className="col-span-1 flex items-center gap-2 overflow-hidden">
                            <img 
                                src={p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`} 
                                alt="avatar" 
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`;
                                }}
                                className={`w-8 h-8 rounded-lg ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-800 border-slate-700'} object-cover border`} 
                            />
                            <span className={`text-sm font-bold truncate ${p.id.startsWith('me') ? 'text-amber-400' : textMain}`}>{p.name}</span>
                        </div>
                        <div className="col-span-1 text-center">
                            <div className={`text-xs font-mono font-hud ${textSub}`}>{p.betAmount}</div>
                        </div>
                        <div className="col-span-1 text-right">
                            {p.cashedOutAt ? (
                                <div className="flex flex-col items-end leading-tight">
                                    <span className="text-emerald-400 font-bold text-xs">
                                        +{(p.betAmount * p.cashedOutAt).toFixed(0)} <span className="text-[9px] opacity-70">KSH</span>
                                    </span>
                                    <span className={`text-[10px] ${textSub} font-mono font-hud ${isDarkMode ? 'bg-zinc-800/50' : 'bg-slate-800/50'} px-1 rounded`}>
                                        @{p.cashedOutAt.toFixed(2)}x
                                    </span>
                                </div>
                            ) : phase === GamePhase.CRASHED ? (
                                <div className="flex flex-col items-end leading-tight animate-in fade-in duration-300">
                                    <div className="flex items-center gap-1 text-rose-500">
                                         <span className="font-bold text-xs">-{p.betAmount}</span>
                                         <span className="text-[9px] opacity-70">KSH</span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5 text-rose-500">
                                        <XCircle size={10} strokeWidth={3} />
                                        <span className="text-[9px] font-black uppercase tracking-wider">LOST</span>
                                    </div>
                                </div>
                            ) : (
                                <div className={`${textSub} text-xs italic opacity-70 flex items-center justify-end gap-1`}>
                                    {phase === GamePhase.FLYING && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />}
                                    {phase === GamePhase.FLYING ? 'Playing...' : '-'}
                                </div>
                            )}
                        </div>
                    </div>
                    ))
                )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="h-full flex flex-col">
             {/* Stats Header */}
             <div className={`grid grid-cols-2 gap-2 p-3 border-b ${borderCol} ${isDarkMode ? 'bg-black/30' : 'bg-[#0B0E14]/30'}`}>
                <div className={`${isDarkMode ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-slate-800/50 border-slate-700/50'} p-2 rounded-lg text-center border`}>
                    <div className={`text-[10px] ${textSub} uppercase font-bold tracking-wider`}>Rounds</div>
                    <div className={`text-lg font-black font-hud ${isDarkMode ? 'text-zinc-200' : 'text-slate-200'}`}>{history.length}</div>
                </div>
                <div className={`${isDarkMode ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-slate-800/50 border-slate-700/50'} p-2 rounded-lg text-center border`}>
                    <div className={`text-[10px] ${textSub} uppercase font-bold tracking-wider`}>Top Multiplier</div>
                    <div className="text-lg font-black font-hud text-indigo-400">
                        {history.length > 0 ? Math.max(...history.map(h => h.multiplier)).toFixed(2) + 'x' : '-'}
                    </div>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700">
                 <div className={`sticky top-0 ${isDarkMode ? 'bg-zinc-900/95' : 'bg-slate-900/95'} backdrop-blur z-10 grid grid-cols-2 text-[10px] ${textSub} px-6 py-2 border-b ${borderCol} font-bold uppercase tracking-wider`}>
                    <span className="col-span-1">Crash Point</span>
                    <span className="col-span-1 text-right">Time</span>
                 </div>
                 <div className="flex flex-col p-4 gap-2">
                     {history.length === 0 ? (
                         <div className={`text-center ${textSub} text-sm py-10 italic`}>No rounds played yet.</div>
                     ) : (
                        history.slice().reverse().map((h, i) => (
                            <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${getHistoryColor(h.multiplier)} transition-all hover:brightness-110 group`}>
                                <div className="flex flex-col">
                                    <div className="font-black font-hud text-xl tracking-tighter group-hover:scale-105 transition-transform">
                                        {h.multiplier.toFixed(2)}x
                                    </div>
                                    <div className="text-[10px] opacity-50 font-mono flex items-center gap-1">
                                        <Hash size={10} />
                                        {Math.abs(Math.sin(h.timestamp)).toString(16).substring(2, 10).toUpperCase()}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-mono opacity-70">
                                    <Clock size={12} />
                                    {new Date(h.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second: '2-digit' })}
                                </div>
                            </div>
                        ))
                     )}
                 </div>
             </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex gap-2 items-start">
                 <ShieldAlert className="text-amber-500 shrink-0" size={16} />
                 <p className="text-[10px] text-amber-500/80 leading-tight">
                    Do not share personal info. DundaBot is AI-powered and results are random.
                 </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar */}
                        {msg.isRain ? (
                             <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500 shadow-lg border border-blue-400">
                                 <CloudRain size={16} className="text-white" />
                             </div>
                        ) : (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden border ${
                                msg.role === 'user' ? (isDarkMode ? 'border-indigo-700/50' : 'border-indigo-200') :
                                msg.role === 'model' ? (isDarkMode ? 'border-amber-700/50' : 'border-amber-200') :
                                (isDarkMode ? 'border-zinc-700/50' : 'border-slate-300')
                            } ${
                                msg.role === 'user' ? 'bg-gradient-to-br from-indigo-600 to-indigo-700' : 
                                msg.role === 'model' ? 'bg-gradient-to-br from-amber-600 to-orange-700' :
                                (isDarkMode ? 'bg-zinc-800' : 'bg-slate-200')
                            }`}>
                                {msg.role === 'user' ? <User size={16} className="text-white" /> : 
                                msg.role === 'model' ? <Bot size={16} className="text-white" /> :
                                <img 
                                    src={msg.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.name || 'Player')}&background=random`} 
                                    alt="p" 
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.name || 'Player')}&background=random`;
                                    }}
                                    className="w-full h-full object-cover"
                                />
                                }
                            </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {msg.role === 'player' && <span className={`text-[10px] ${textSub} font-bold mb-1 ml-1`}>{msg.name}</span>}
                            {msg.role === 'system' && <span className="text-[10px] text-blue-400 font-bold mb-1 ml-1 uppercase">Promo</span>}
                            
                            {msg.isRain ? (
                                <div className={`p-4 rounded-xl text-sm shadow-lg border border-blue-500/50 bg-blue-600/20 w-48 animate-in zoom-in duration-300`}>
                                    <div className="flex items-center gap-2 mb-2 text-blue-300 font-bold uppercase text-xs">
                                        <CloudRain size={14} /> Rain Event
                                    </div>
                                    <div className="font-black text-xl text-white mb-3">
                                        {msg.rainAmount} KSH
                                    </div>
                                    <button 
                                        onClick={() => handleClaim(msg.id, msg.rainAmount!)}
                                        disabled={msg.claimed}
                                        className={`w-full py-2 rounded-lg font-bold text-xs uppercase transition ${
                                            msg.claimed 
                                            ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50 cursor-default' 
                                            : 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-900/20'
                                        }`}
                                    >
                                        {msg.claimed ? 'Claimed' : 'Claim Now'}
                                    </button>
                                </div>
                            ) : (
                                <div className={`p-3 rounded-2xl text-sm shadow-md border ${
                                    msg.role === 'user' 
                                        ? (isDarkMode ? 'bg-indigo-900/40 border-indigo-700/50 text-indigo-100' : 'bg-indigo-50 border-indigo-200 text-indigo-900') + ' rounded-tr-none' 
                                        : msg.role === 'model'
                                            ? (isDarkMode ? 'bg-amber-900/40 border-amber-700/50 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-900') + ' rounded-tl-none'
                                            : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-slate-100 border-slate-200 text-slate-800') + ' rounded-tl-none'
                                }`}>
                                    {msg.text}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex gap-2 items-end">
                        <div className={`w-6 h-6 ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-800'} rounded-full animate-bounce`}></div>
                        <div className={`w-6 h-6 ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-800'} rounded-full animate-bounce delay-75`}></div>
                        <div className={`w-6 h-6 ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-800'} rounded-full animate-bounce delay-150`}></div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className={`p-4 ${bgHeader} border-t ${borderCol}`}>
                <div className="flex gap-2 relative">
                    <input 
                        className={`flex-1 ${bgPanel} border-2 ${borderCol} rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none transition placeholder:text-slate-600`}
                        placeholder="Ask DundaBot..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button 
                        onClick={handleSendMessage}
                        className="bg-amber-600 hover:bg-amber-500 text-white p-3 rounded-xl transition shadow-lg shadow-amber-900/20"
                    >
                        <MessageSquare size={18} />
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
