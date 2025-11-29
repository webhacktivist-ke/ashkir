
import React, { useState, useEffect } from 'react';
import { GamePhase } from '../types';
import { MAX_BET } from '../constants';
import { MousePointer2, RefreshCw } from 'lucide-react';

interface ControlsProps {
  phase: GamePhase;
  balance: number;
  onBet: (index: number, amount: number) => void;
  onCashOut: (index: number) => void;
  onCancel: (index: number) => void;
  myBets: (number | null)[];
  cashOutMultipliers: (number | null)[];
  multiplier: number;
  autoCashOuts: (number | null)[];
  onAutoCashOutChange: (index: number, val: number | null) => void;
  minBet: number;
  isDarkMode: boolean;
}

interface BetPanelProps {
  index: number;
  phase: GamePhase;
  balance: number;
  onBet: (amount: number) => void;
  onCashOut: () => void;
  onCancel: () => void;
  myBet: number | null;
  cashOutMultiplier: number | null;
  multiplier: number;
  autoCashOutAt: number | null;
  onAutoCashOutChange: (val: number | null) => void;
  minBet: number;
  isDarkMode: boolean;
  accentColor: 'cyan' | 'purple';
}

const BetControlPanel: React.FC<BetPanelProps> = ({
  index,
  phase,
  balance,
  onBet,
  onCashOut,
  onCancel,
  myBet,
  cashOutMultiplier,
  multiplier,
  autoCashOutAt,
  onAutoCashOutChange,
  minBet,
  isDarkMode,
  accentColor
}) => {
  // Tabs: Manual vs Auto
  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');
  
  // Auto Bet State
  const [isAutoRunning, setIsAutoRunning] = useState(false);

  // Initialize bet amount
  const [betAmount, setBetAmount] = useState<number>(Math.max(100, minBet));
  const [nextRoundBet, setNextRoundBet] = useState<number | null>(null);
  const [isInputSuccess, setIsInputSuccess] = useState(false);
  
  // Local state to remember the value when toggled off
  const [localAutoValue, setLocalAutoValue] = useState<string>(
      autoCashOutAt ? autoCashOutAt.toFixed(2) : "2.00"
  );

  const isBetting = myBet !== null;
  const hasCashedOut = cashOutMultiplier !== null;
  const isAutoEnabled = autoCashOutAt !== null;

  // Handle quick bet amounts
  const allQuickBets = [50, 100, 200, 500, 1000, 2000];
  const quickBets = allQuickBets.filter(amt => amt >= minBet && amt <= MAX_BET).slice(0, 4);

  // Update bet amount if it falls below new minBet
  useEffect(() => {
      if (betAmount < minBet) {
          setBetAmount(minBet);
      }
  }, [minBet]);

  // --- AUTO BET LOGIC ---
  useEffect(() => {
    // Check if Auto is running and we are in the IDLE phase
    if (isAutoRunning && phase === GamePhase.IDLE) {
        // Only bet if we haven't bet yet, haven't queued a bet, and have money
        if (!isBetting && !nextRoundBet) {
            if (balance >= betAmount && betAmount >= minBet && betAmount <= MAX_BET) {
                const timer = setTimeout(() => {
                    onBet(betAmount);
                    triggerSuccessAnim();
                }, 500 + (index * 200)); // Stagger slightly if both active
                return () => clearTimeout(timer);
            } else {
                setIsAutoRunning(false);
            }
        }
    }
  }, [phase, isAutoRunning, isBetting, nextRoundBet, balance, betAmount, minBet, onBet, index]);

  const triggerSuccessAnim = () => {
      setIsInputSuccess(true);
      setTimeout(() => setIsInputSuccess(false), 500);
  };

  const handleAction = () => {
    if (phase === GamePhase.FLYING && isBetting && !hasCashedOut) {
        onCashOut();
        return;
    }

    if (activeTab === 'auto') {
        if (isAutoRunning) {
            setIsAutoRunning(false);
        } else {
            if (balance >= betAmount && betAmount >= minBet && betAmount <= MAX_BET) {
                setIsAutoRunning(true);
                if (phase === GamePhase.IDLE && !isBetting) {
                    onBet(betAmount);
                    triggerSuccessAnim();
                }
            }
        }
        return;
    }

    if (phase === GamePhase.IDLE) {
      if (isBetting) {
        onCancel();
      } else {
        if (balance >= betAmount && betAmount >= minBet && betAmount <= MAX_BET) {
            onBet(betAmount);
            triggerSuccessAnim();
        }
      }
    } else {
      if (nextRoundBet) {
          setNextRoundBet(null);
      } else {
          if (betAmount >= minBet && betAmount <= MAX_BET) {
              setNextRoundBet(betAmount);
              triggerSuccessAnim();
          }
      }
    }
  };

  useEffect(() => {
    if (phase === GamePhase.IDLE && nextRoundBet !== null && activeTab === 'manual') {
        if (!isBetting && balance >= nextRoundBet && nextRoundBet >= minBet && nextRoundBet <= MAX_BET) {
            onBet(nextRoundBet);
        }
        setNextRoundBet(null);
    }
  }, [phase, nextRoundBet, onBet, isBetting, balance, minBet, activeTab]);

  const toggleAutoCashOut = () => {
    if (isAutoEnabled) {
        onAutoCashOutChange(null);
    } else {
        const val = parseFloat(localAutoValue);
        if (!isNaN(val) && val >= 1.01) {
            onAutoCashOutChange(val);
        } else {
            onAutoCashOutChange(2.00);
            setLocalAutoValue("2.00");
        }
    }
  };

  const handleAutoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setLocalAutoValue(valStr);
    
    if (isAutoEnabled) {
        const val = parseFloat(valStr);
        if (!isNaN(val) && val >= 1.01) {
            onAutoCashOutChange(val);
        }
    }
  };

  const handleAutoInputBlur = () => {
      const val = parseFloat(localAutoValue);
      if (isNaN(val) || val < 1.01) {
          setLocalAutoValue("1.10");
          if (isAutoEnabled) onAutoCashOutChange(1.10);
      } else {
          setLocalAutoValue(val.toFixed(2));
      }
  };

  const isTooLow = betAmount < minBet;
  const isTooHigh = betAmount > MAX_BET;
  const isInvalidAmount = isTooLow || isTooHigh;

  const isValidBet = !isInvalidAmount;
  const canAfford = balance >= betAmount;

  const getButtonState = () => {
    if (phase === GamePhase.FLYING && isBetting && !hasCashedOut) return 'CASH_OUT';
    if (activeTab === 'auto') {
        if (isAutoRunning) return 'STOP_AUTO';
        return 'START_AUTO';
    }
    if (phase === GamePhase.IDLE) {
        if (isBetting) return 'CANCEL_NOW'; 
        return 'BET_NOW';
    }
    if (phase === GamePhase.FLYING || phase === GamePhase.CRASHED) {
        if (nextRoundBet) return 'CANCEL_NEXT';
        return 'BET_NEXT';
    }
    return 'BET_NEXT';
  };

  const btnState = getButtonState();
  const isDisabled = 
    (btnState !== 'STOP_AUTO' && !canAfford && !isBetting && !nextRoundBet) || 
    (btnState !== 'STOP_AUTO' && !isValidBet && !isBetting && !nextRoundBet);

  const bgPanel = isDarkMode ? 'bg-zinc-900' : 'bg-slate-900';
  const bgInput = isDarkMode ? 'bg-black' : 'bg-[#0B0E14]';
  const borderCol = isDarkMode ? 'border-zinc-800' : 'border-slate-800';
  const textSub = isDarkMode ? 'text-zinc-400' : 'text-slate-400';
  const quickBtnBg = isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-slate-800 hover:bg-slate-700';
  
  // Dynamic Accent Colors (UPDATED: Cyan->Amber, Purple->Indigo)
  const activeTabColor = isDarkMode 
    ? (accentColor === 'cyan' ? 'bg-zinc-800 text-amber-400' : 'bg-zinc-800 text-indigo-400') 
    : (accentColor === 'cyan' ? 'bg-slate-800 text-amber-400' : 'bg-slate-800 text-indigo-400');
  
  const mainBtnColor = accentColor === 'cyan' 
        ? 'bg-amber-500 border-amber-600 hover:bg-amber-400' 
        : 'bg-indigo-600 border-indigo-700 hover:bg-indigo-500';

  return (
    <div className={`w-full ${bgPanel} rounded-2xl border-2 ${borderCol} shadow-lg relative overflow-hidden transition-all duration-300 flex flex-col`}>
      
      {/* Tabs */}
      <div className={`flex border-b ${borderCol}`}>
          <button 
             onClick={() => { setActiveTab('manual'); setIsAutoRunning(false); }}
             className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-colors ${activeTab === 'manual' ? `${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-slate-800 text-white'}` : `${textSub} hover:bg-white/5`}`}
          >
             <MousePointer2 size={12} /> Bet {index + 1}
          </button>
          <button 
             onClick={() => setActiveTab('auto')}
             className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-colors ${activeTab === 'auto' ? activeTabColor : `${textSub} hover:bg-white/5`}`}
          >
             <RefreshCw size={12} className={isAutoRunning ? 'animate-spin' : ''} /> Auto
          </button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Top Row: Input + Auto Toggle */}
        <div className="flex gap-2">
            <div className="relative group flex-1">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <span className={`font-black text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>KSH</span>
                 </div>
                 <input 
                     type="number"
                     min={minBet}
                     max={MAX_BET}
                     value={betAmount}
                     onChange={(e) => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                     disabled={isAutoRunning}
                     className={`w-full ${bgInput} border-2 text-white pl-10 pr-2 py-2 rounded-xl font-bold font-hud text-lg focus:outline-none transition-all shadow-inner h-12
                         ${isInvalidAmount ? 'border-rose-600 focus:border-rose-600' : isInputSuccess ? 'border-emerald-500' : `${isDarkMode ? 'border-zinc-700' : 'border-slate-700'} focus:border-white/20`}
                         ${isAutoRunning ? 'opacity-50 cursor-not-allowed' : ''}
                     `}
                 />
                 {isTooLow && <div className="absolute -bottom-4 left-0 text-[9px] text-rose-500 font-bold">Min: {minBet}</div>}
                 {isTooHigh && <div className="absolute -bottom-4 left-0 text-[9px] text-rose-500 font-bold">Max: {MAX_BET}</div>}
            </div>
            
            <div className={`relative w-24 rounded-xl border-2 transition-colors ${isAutoEnabled ? `border-${accentColor === 'cyan' ? 'amber' : 'indigo'}-500/50 ${bgInput}` : `${isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-slate-800 bg-slate-900'} opacity-60`}`}>
                <input 
                  type="number" 
                  step="0.1"
                  min="1.01"
                  disabled={!isAutoEnabled}
                  value={localAutoValue}
                  onChange={handleAutoInputChange}
                  onBlur={handleAutoInputBlur}
                  className="w-full bg-transparent text-white px-2 py-2 rounded-xl font-bold font-hud text-sm focus:outline-none h-full text-center" 
                />
                <button 
                    onClick={toggleAutoCashOut} 
                    className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer shadow-md border border-black/20 ${isAutoEnabled ? (accentColor === 'cyan' ? 'bg-amber-500' : 'bg-indigo-500') : (isDarkMode ? 'bg-zinc-600' : 'bg-slate-600')}`}
                >
                    <div className={`w-2 h-2 bg-white rounded-full`} />
                </button>
            </div>
        </div>

        {/* Quick Bets */}
        <div className="flex gap-1 justify-between">
             {quickBets.map(amt => (
                 <button
                     key={amt}
                     onClick={() => setBetAmount(amt)}
                     className={`flex-1 py-1 ${quickBtnBg} rounded text-[10px] font-bold font-hud ${textSub} hover:text-white transition border ${isDarkMode ? 'border-zinc-700' : 'border-slate-700'}`}
                 >
                     {amt}
                 </button>
             ))}
        </div>

        {/* Main Action Button */}
        <button
            onClick={handleAction}
            disabled={isDisabled}
            className={`
                w-full h-14 rounded-xl font-black text-xl uppercase tracking-wider transition-all transform active:scale-95 shadow-lg flex flex-col items-center justify-center border-b-4
                ${btnState === 'CASH_OUT' ? 'bg-amber-500 border-amber-700 hover:bg-amber-400 text-slate-900 animate-pulse' : ''}
                
                ${(btnState === 'BET_NOW' || btnState === 'BET_NEXT') && activeTab === 'manual' ? mainBtnColor + ' text-white' : ''}
                
                ${(btnState === 'CANCEL_NEXT' || btnState === 'CANCEL_NOW') ? 'bg-rose-600 border-rose-800 hover:bg-rose-500 text-white' : ''}

                ${btnState === 'START_AUTO' ? mainBtnColor + ' text-white' : ''}
                ${btnState === 'STOP_AUTO' ? 'bg-rose-600 border-rose-800 hover:bg-rose-500 text-white' : ''}

                ${isDisabled ? `opacity-50 cursor-not-allowed ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-slate-800 border-slate-700 text-slate-500'}` : ''}
            `}
        >
            {btnState === 'CASH_OUT' && (
                <span className="flex items-center gap-2">
                    <span>CASH OUT</span> 
                    <span className="text-sm font-mono font-hud bg-black/10 px-2 rounded">{(betAmount * multiplier).toFixed(0)}</span>
                </span> 
            )}

            {btnState === 'BET_NOW' && <span>BET</span>}
            
            {btnState === 'BET_NEXT' && (
                <span className="text-base leading-none">BET <span className="text-[10px] opacity-70 block font-normal">Next Round</span></span>
            )}

            {btnState === 'CANCEL_NOW' && <span className="text-base">CANCEL</span>}

            {btnState === 'CANCEL_NEXT' && (
                <span className="flex flex-col items-center leading-none">
                    <span className="text-sm">CANCEL BET</span>
                    <span className="text-[10px] opacity-70 font-mono font-hud mt-0.5">{nextRoundBet} KSH</span>
                </span>
            )}

            {btnState === 'START_AUTO' && <span className="text-base">START AUTO</span>}

            {btnState === 'STOP_AUTO' && (
                <span className="text-base relative z-10">STOP AUTO</span>
            )}
        </button>
      </div>
    </div>
  );
};

const Controls: React.FC<ControlsProps> = (props) => {
  return (
    <div className="w-full flex flex-col md:flex-row gap-4">
      <BetControlPanel 
        {...props}
        index={0}
        myBet={props.myBets[0]}
        cashOutMultiplier={props.cashOutMultipliers[0]}
        autoCashOutAt={props.autoCashOuts[0]}
        onBet={(amt) => props.onBet(0, amt)}
        onCashOut={() => props.onCashOut(0)}
        onCancel={() => props.onCancel(0)}
        onAutoCashOutChange={(val) => props.onAutoCashOutChange(0, val)}
        accentColor="cyan"
      />
      
      <BetControlPanel 
        {...props}
        index={1}
        myBet={props.myBets[1]}
        cashOutMultiplier={props.cashOutMultipliers[1]}
        autoCashOutAt={props.autoCashOuts[1]}
        onBet={(amt) => props.onBet(1, amt)}
        onCashOut={() => props.onCashOut(1)}
        onCancel={() => props.onCancel(1)}
        onAutoCashOutChange={(val) => props.onAutoCashOutChange(1, val)}
        accentColor="purple"
      />
    </div>
  );
};

export default Controls;
