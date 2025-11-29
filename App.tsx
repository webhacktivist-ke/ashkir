
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GamePhase, BetHistoryItem, Player } from './types';
import { FAKE_PLAYERS, IDLE_DURATION_MS, MAX_BET } from './constants';
import GameCanvas from './components/GameCanvas';
import Controls from './components/Controls';
import History from './components/History';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import TopUpModal from './components/TopUpModal';
import AdminDashboard from './components/AdminDashboard';
import ProvablyFairModal from './components/ProvablyFairModal';
import UserTransactionsModal from './components/UserTransactionsModal';
import { Wallet, Plane, Menu, X, Volume2, VolumeX, MonitorPlay, Zap, LayoutGrid, Check, Moon, Sun, LogOut, PlusCircle, ShieldCheck, ShieldAlert, Skull, Lock, MessageSquare, BookOpen, UserCheck, Ghost, MinusCircle, Settings, Share2, Copy, FileClock } from 'lucide-react';
import { audioManager } from './services/audioService';
import { dbService } from './services/dbService';

const ROOMS = [
    { id: 'standard', name: 'Standard Room', min: 10 },
    { id: 'vip', name: 'VIP Lounge', min: 500 },
    { id: 'turbo', name: 'Turbo Room', min: 100 }
];

const TAX_RATE = 0.20; 

const getElapsedFromMultiplier = (mult: number) => {
    return Math.log(mult) / 0.15;
};

const generateWeightedBet = (minBet: number) => {
    const rand = Math.random();
    let bet = minBet;
    if (rand < 0.7) {
        const targetMin = Math.max(minBet, 20);
        const targetMax = Math.max(targetMin, 100);
        bet = Math.floor(Math.random() * (targetMax - targetMin + 1)) + targetMin;
    } else if (rand < 0.9) {
        const targetMin = Math.max(minBet, 100);
        const targetMax = Math.max(targetMin, 1000);
        bet = Math.floor(Math.random() * (targetMax - targetMin + 1)) + targetMin;
    } else {
        const targetMin = Math.max(minBet, 1000);
        const targetMax = Math.max(targetMin, 5000);
        bet = Math.floor(Math.random() * (targetMax - targetMin + 1)) + targetMin;
    }
    return Math.ceil(bet / 10) * 10;
};

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<{ phone: string, role: string } | null>(null);

  // Game State
  const [phase, setPhase] = useState<GamePhase>(GamePhase.IDLE);
  const [multiplier, setMultiplier] = useState<number>(1.00);
  const [balance, setBalance] = useState<number>(0); 
  const [history, setHistory] = useState<BetHistoryItem[]>([]);
  
  // App Settings / Menu / Modals
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Toasts
  const [smsNotification, setSmsNotification] = useState<string | null>(null);

  const [highQuality, setHighQuality] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false); 
  const [currentRoom, setCurrentRoom] = useState(ROOMS[0]);
  const [isMuted, setIsMuted] = useState(true);

  // Provably Fair State
  const [serverSeed, setServerSeed] = useState('');
  const [clientSeed, setClientSeed] = useState('0000000000000000000301e2c99a22f357947137f884f3780365735165839019');
  const [roundHash, setRoundHash] = useState('');

  const [houseEdgeActive] = useState(true); 
  
  // Admin Controls
  const [nextCrashOverride, setNextCrashOverride] = useState<number | null>(null);
  const nextCrashOverrideRef = useRef<number | null>(null);

  // Betting State
  const [myBets, setMyBets] = useState<(number | null)[]>([null, null]);
  const [cashOutMultipliers, setCashOutMultipliers] = useState<(number | null)[]>([null, null]);
  const [autoCashOuts, setAutoCashOuts] = useState<(number | null)[]>([null, null]);
  
  // Simulation State
  const [simulatedPlayers, setSimulatedPlayers] = useState<Player[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  
  // Animation Triggers
  const [totalCashOuts, setTotalCashOuts] = useState<number>(0);
  const [timeToNextRound, setTimeToNextRound] = useState<number>(0);

  // Dynamic Config Limits
  const [minBetLimit, setMinBetLimit] = useState(10);
  
  // Refs
  const crashPointRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const prevTotalCashOutsRef = useRef<number>(0);
  const isRoundActiveRef = useRef<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentRoomRef = useRef(currentRoom);
  const currentUserRef = useRef(currentUser);
  const isDemoModeRef = useRef(isDemoMode);
  const idleTimeRef = useRef(0);
  
  const myBetsRef = useRef<(number | null)[]>([null, null]);
  const cashOutMultipliersRef = useRef<(number | null)[]>([null, null]);
  const autoCashOutsRef = useRef<(number | null)[]>([null, null]);

  useEffect(() => { myBetsRef.current = myBets; }, [myBets]);
  useEffect(() => { cashOutMultipliersRef.current = cashOutMultipliers; }, [cashOutMultipliers]);
  useEffect(() => { autoCashOutsRef.current = autoCashOuts; }, [autoCashOuts]);
  useEffect(() => { currentRoomRef.current = currentRoom; }, [currentRoom]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { isDemoModeRef.current = isDemoMode; }, [isDemoMode]);
  useEffect(() => { nextCrashOverrideRef.current = nextCrashOverride; }, [nextCrashOverride]);

  // Handle Login & Security
  useEffect(() => {
    // Check config for maintenance
    const config = dbService.getGameConfig();
    setMinBetLimit(config.minBet || 10);
    
    if (config.maintenanceMode && currentUser) {
        alert("System is under maintenance. Please try again later.");
        handleLogout();
    }

    // Activity Monitor (Auto Logout)
    const resetIdle = () => { idleTimeRef.current = 0; };
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keypress', resetIdle);
    
    const interval = setInterval(() => {
        if (currentUser) {
            idleTimeRef.current += 1;
            if (idleTimeRef.current > 300) { // 5 minutes (300s)
                handleLogout();
                alert("Session expired due to inactivity.");
            }
        }
    }, 1000);

    return () => {
        window.removeEventListener('mousemove', resetIdle);
        window.removeEventListener('keypress', resetIdle);
        clearInterval(interval);
    }
  }, [currentUser]);

  const handleLogin = (phone: string, role: string) => {
    const config = dbService.getGameConfig();
    if (config.maintenanceMode && role !== 'admin') {
        alert("Maintenance Mode is Active. Login restricted.");
        return;
    }

    setCurrentUser({ phone, role });
    refreshBalance(phone, isDemoMode);
    setTimeout(() => startGame(), 100);
  };

  const refreshBalance = (phone: string, demo: boolean) => {
      const user = dbService.getUser(phone);
      if (user) {
          setBalance(demo ? user.demoBalance : user.balance);
      }
  };

  useEffect(() => {
      if (currentUser) {
          refreshBalance(currentUser.phone, isDemoMode);
      }
  }, [isDemoMode]);

  const handleLogout = () => {
    setCurrentUser(null);
    setPhase(GamePhase.IDLE);
    setMultiplier(1.00);
    setMyBets([null, null]);
    setIsDemoMode(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    audioManager.toggleMute(); 
  };

  const showSmsToast = (msg: string) => {
      setSmsNotification(msg);
      audioManager.playBetPlaced(); // Use bet sound as notification ping
      setTimeout(() => setSmsNotification(null), 5000);
  };

  const handleTransaction = (amount: number, type: 'deposit' | 'withdraw') => {
      if (currentUser && currentUser.role === 'user' && !isDemoMode) {
          try {
              if (type === 'withdraw') {
                  if (balance < amount) {
                      alert("Insufficient funds for withdrawal.");
                      return;
                  }
                   const newBal = dbService.updateBalance(currentUser.phone, -amount, 'withdraw', false);
                   setBalance(newBal);
                   showSmsToast(`Confirmed. Ksh${amount.toLocaleString()} sent to ${currentUser.phone}. M-PESA Ref: QH${Math.random().toString(36).substring(2,7).toUpperCase()}.`);
              } else {
                   const newBal = dbService.updateBalance(currentUser.phone, amount, 'deposit', false);
                   setBalance(newBal);
                   showSmsToast(`Confirmed. Ksh${amount.toLocaleString()} received from ${currentUser.phone}. New Balance: Ksh${newBal.toLocaleString()}.`);
              }
          } catch(e) {
              alert("Transaction failed.");
          }
      }
  };

  const handleClaimRain = (amount: number) => {
      if (currentUser) {
          audioManager.playCashout(); 
          if (currentUser.role === 'user') {
              const newBal = dbService.updateBalance(currentUser.phone, amount, 'win', isDemoMode, undefined, 'Rain Promo');
              setBalance(newBal);
          } else {
              setBalance(prev => prev + amount);
          }
      }
  };

  useEffect(() => {
    if (!currentUser) return;
    const playerCount = Math.floor(Math.random() * (145 - 99 + 1)) + 99;
    
    const players: Player[] = Array.from({ length: playerCount }).map((_, i) => {
        const nameBase = FAKE_PLAYERS[i % FAKE_PLAYERS.length];
        const name = i >= FAKE_PLAYERS.length ? `${nameBase} ${Math.floor(Math.random() * 999)}` : nameBase;
        
        return {
            id: `bot-${i}`,
            name,
            betAmount: generateWeightedBet(currentRoom.min),
            avatar: `https://picsum.photos/seed/${name}-${i}/50/50`
        };
    });
    setSimulatedPlayers(players);
    setOnlineUsers(Math.floor(playerCount * (1.2 + Math.random() * 0.2)));
  }, [currentRoom, currentUser]); 

  const toggleSound = () => {
      const muted = audioManager.toggleMute();
      setIsMuted(muted);
  };

  const calculateRegulatedCrashPoint = (roomId: string) => {
    // 1. Admin Override (Rigging)
    if (nextCrashOverrideRef.current !== null) {
        const crash = nextCrashOverrideRef.current;
        setNextCrashOverride(null); // Clear after use
        
        const newHash = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        setRoundHash('SHA256:' + newHash + Date.now().toString(16) + '_ADMIN');
        setServerSeed('HIDDEN_OVERRIDE_' + Date.now());
        
        return crash;
    }

    let houseEdge = 0.04; 
    // Load config from DB
    const config = dbService.getGameConfig();
    if (config.rtp) {
        // RTP 96% -> Edge 4%. Formula: Edge = 100 - RTP
        houseEdge = (100 - config.rtp) / 100;
    }
    
    if (roomId === 'vip') houseEdge = 0.02;
    if (roomId === 'turbo') houseEdge = 0.05;
    if (!houseEdgeActive) houseEdge = 0;

    const r = Math.random();
    
    // DEMO MODE OVERRIDE (High Hopes logic)
    if (isDemoModeRef.current) {
        if (r < 0.5) { 
            return 1.5 + Math.random() * 3.5;
        }
        if (Math.random() < 0.05) {
            return 10.0 + Math.random() * 90.0;
        }
    }

    // Provably Fair Inverse Formula
    let crash = (1 - houseEdge) / (1 - r);
    crash = Math.floor(crash * 100) / 100;
    
    if (crash < 1.00) crash = 1.00;
    
    const MAX_MULTIPLIER = 200000;
    if (crash > MAX_MULTIPLIER) crash = MAX_MULTIPLIER;

    const newHash = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    setRoundHash('SHA256:' + newHash + Date.now().toString(16));
    setServerSeed('HIDDEN_' + Date.now());

    return crash;
  };

  const switchRoom = (room: typeof ROOMS[0]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setCurrentRoom(room);
      setMyBets([null, null]);
      setCashOutMultipliers([null, null]);
      setTotalCashOuts(0);
      setIsMenuOpen(false);
      isRoundActiveRef.current = false;
      
      const joinActive = Math.random() < 0.7;
      if (joinActive) {
          setPhase(GamePhase.FLYING);
          isRoundActiveRef.current = true;
          const crash = calculateRegulatedCrashPoint(room.id);
          crashPointRef.current = crash;
          const safeMax = Math.min(crash * 0.95, 10);
          const startMult = 1.01 + Math.random() * (Math.max(0, safeMax - 1.01));
          
          if (startMult >= crash) {
             setPhase(GamePhase.CRASHED);
             setMultiplier(crash);
             isRoundActiveRef.current = false;
             timeoutRef.current = setTimeout(() => {
                 setPhase(GamePhase.IDLE);
                 const nextTime = Date.now() + IDLE_DURATION_MS;
                 setTimeToNextRound(nextTime);
                 timeoutRef.current = setTimeout(startGame, IDLE_DURATION_MS);
             }, 2000);
             return;
          }

          setMultiplier(startMult);
          const elapsedSec = getElapsedFromMultiplier(startMult);
          startTimeRef.current = Date.now() - (elapsedSec * 1000);
      } else {
          setPhase(GamePhase.IDLE);
          isRoundActiveRef.current = false;
          const timeLeft = Math.floor(Math.random() * 9000) + 1000;
          const nextTime = Date.now() + timeLeft;
          setTimeToNextRound(nextTime);
          timeoutRef.current = setTimeout(startGame, timeLeft);
      }
  };

  useEffect(() => {
      if (!currentUser) return;
      if (phase === GamePhase.FLYING) {
          audioManager.startEngine();
      } else if (phase === GamePhase.CRASHED) {
          audioManager.playCrash();
      } else {
          audioManager.stopEngine();
      }
  }, [phase, currentUser]);

  useEffect(() => {
      if (totalCashOuts > prevTotalCashOutsRef.current && phase === GamePhase.FLYING) {
          audioManager.playCashout();
      }
      prevTotalCashOutsRef.current = totalCashOuts;
  }, [totalCashOuts, phase]);

  const startGame = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    setPhase(GamePhase.FLYING);
    setMultiplier(1.00);
    setCashOutMultipliers([null, null]);
    setTotalCashOuts(0);
    prevTotalCashOutsRef.current = 0;
    startTimeRef.current = Date.now();
    isRoundActiveRef.current = true;
    
    const crash = calculateRegulatedCrashPoint(currentRoomRef.current.id);
    crashPointRef.current = crash;
    
    setSimulatedPlayers(prev => prev.map(p => ({
        ...p,
        betAmount: generateWeightedBet(currentRoomRef.current.min),
        cashedOutAt: undefined
    })));
    
    setOnlineUsers(prev => {
        const variance = Math.floor(Math.random() * 10) - 5;
        return Math.max(prev + variance, simulatedPlayers.length + 5);
    });

  }, [simulatedPlayers.length]);

  const endGame = useCallback(() => {
    if (!isRoundActiveRef.current) return;
    isRoundActiveRef.current = false;
    
    setPhase(GamePhase.CRASHED);
    setHistory(prev => [...prev, { multiplier: crashPointRef.current, timestamp: Date.now() }]);
    
    // Log Round for Admin Audit
    dbService.logRound(crashPointRef.current, roundHash);

    if (!isDemoModeRef.current) {
        let playerLosses = 0;
        let playerWins = 0;
        
        myBetsRef.current.forEach((bet, index) => {
            if (bet !== null) {
                const cashOut = cashOutMultipliersRef.current[index];
                if (!cashOut) {
                    playerLosses += bet;
                } else {
                    const winAmount = (bet * cashOut) - bet;
                    playerWins += winAmount;
                }
            }
        });
        dbService.processRoundResult(playerLosses, playerWins);
    }

    timeoutRef.current = setTimeout(() => {
        setPhase(GamePhase.IDLE);
        setMyBets([null, null]); 
        setCashOutMultipliers([null, null]);
        const nextTime = Date.now() + IDLE_DURATION_MS;
        setTimeToNextRound(nextTime);
        timeoutRef.current = setTimeout(startGame, IDLE_DURATION_MS); 
    }, 3000); 
  }, [startGame, simulatedPlayers, roundHash]);

  const handleForceCrash = () => {
      if (currentUser?.role !== 'admin') return;
      if (phase === GamePhase.FLYING && isRoundActiveRef.current) {
          crashPointRef.current = multiplier; 
      }
  };

  const processWin = (index: number, betAmount: number, cashOutMult: number) => {
      const grossPayout = Math.floor(betAmount * cashOutMult);
      const profit = grossPayout - betAmount;
      const tax = (!isDemoMode && profit > 0) ? Math.floor(profit * TAX_RATE) : 0; 
      const netPayout = betAmount + (profit - tax);

      if (currentUserRef.current?.role === 'user') {
          const newBal = dbService.updateBalance(
              currentUserRef.current.phone, 
              netPayout, 
              'win', 
              isDemoModeRef.current, 
              cashOutMult, 
              currentRoomRef.current.name
          );
          setBalance(newBal);
      } else {
          setBalance(prev => prev + netPayout);
      }
      return { netPayout, tax };
  };

  useEffect(() => {
    if (!currentUser) return;
    let frameId: number;
    const tick = () => {
      if (phase === GamePhase.FLYING && isRoundActiveRef.current) {
        const now = Date.now();
        const elapsed = (now - startTimeRef.current) / 1000; 
        const newMult = Math.pow(Math.E, 0.06 * elapsed * 2.5); 
        
        if (newMult >= crashPointRef.current) {
          setMultiplier(crashPointRef.current);
          endGame();
        } else {
          setMultiplier(newMult);
          audioManager.updateEngine(newMult); 
          
          myBetsRef.current.forEach((bet, index) => {
              if (bet !== null && !cashOutMultipliersRef.current[index] && autoCashOutsRef.current[index]) {
                  if (newMult >= autoCashOutsRef.current[index]!) {
                      processWin(index, bet, newMult);
                      setCashOutMultipliers(prev => {
                          const copy = [...prev];
                          copy[index] = newMult;
                          return copy;
                      });
                      setTotalCashOuts(prev => prev + 1);
                  }
              }
          });
          
          let newCashouts = 0;
          setSimulatedPlayers(prev => prev.map(p => {
             if (!p.cashedOutAt && newMult > 1.05 && Math.random() < 0.02) {
                 newCashouts++;
                 return { ...p, cashedOutAt: newMult };
             }
             return p;
          }));
          if (newCashouts > 0) setTotalCashOuts(prev => prev + newCashouts);
          frameId = requestAnimationFrame(tick);
        }
      }
    };
    if (phase === GamePhase.FLYING) {
      frameId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(frameId);
  }, [phase, endGame, currentUser]);

  const handleBet = (index: number, amount: number) => {
    if (currentUser?.role === 'admin') return;
    if (balance >= amount && amount >= Math.max(currentRoom.min, minBetLimit)) {
      if (currentUser?.role === 'user') {
          try {
            const newBal = dbService.updateBalance(
                currentUser.phone, 
                -amount, 
                'bet', 
                isDemoMode,
                undefined, 
                currentRoom.name
            );
            setBalance(newBal);
            setMyBets(prev => {
                const copy = [...prev];
                copy[index] = amount;
                return copy;
            });
            audioManager.playBetPlaced();
          } catch(e) {
              alert("Transaction Failed: Funds Frozen or Error.");
          }
      } else {
          setBalance(prev => prev - amount);
          setMyBets(prev => {
              const copy = [...prev];
              copy[index] = amount;
              return copy;
          });
          audioManager.playBetPlaced();
      }
    }
  };

  const handleCancelBet = (index: number) => {
    if (phase === GamePhase.IDLE && myBets[index] !== null) {
      const amount = myBets[index]!;
      if (currentUser?.role === 'user') {
          const newBal = dbService.updateBalance(
              currentUser.phone, 
              amount, 
              'deposit', 
              isDemoMode, 
              undefined, 
              'Refund'
          );
          setBalance(newBal);
      } else {
          setBalance(prev => prev + amount);
      }
      setMyBets(prev => {
          const copy = [...prev];
          copy[index] = null;
          return copy;
      });
    }
  };

  const handleCashOut = (index: number) => {
    const bet = myBets[index];
    if (bet && !cashOutMultipliersRef.current[index] && phase === GamePhase.FLYING) {
      processWin(index, bet, multiplier);
      setCashOutMultipliers(prev => {
          const copy = [...prev];
          copy[index] = multiplier;
          return copy;
      });
      setTotalCashOuts(prev => prev + 1);
    }
  };

  const handleAutoCashOutChange = (index: number, val: number | null) => {
      setAutoCashOuts(prev => {
          const copy = [...prev];
          copy[index] = val;
          return copy;
      });
  };

  if (!currentUser) {
      return <LoginPage onLogin={handleLogin} />;
  }

  const bgMain = isDarkMode ? 'bg-black' : 'bg-[#050505]';
  const bgPanel = isDarkMode ? 'bg-zinc-900' : 'bg-slate-900';
  const borderCol = isDarkMode ? 'border-zinc-800' : 'border-slate-800';
  const textMain = isDarkMode ? 'text-zinc-200' : 'text-slate-200';
  const textSub = isDarkMode ? 'text-zinc-500' : 'text-slate-500';

  const latestUserCashOut = cashOutMultipliers.filter(m => m !== null).sort((a,b) => (b||0) - (a||0))[0];

  // Calculate live risk for admin
  const liveExposure = myBets.reduce((acc, bet, idx) => {
      // Only count active bets (not cancelled, not cashed out)
      if (bet && !cashOutMultipliers[idx]) return acc + bet;
      return acc;
  }, 0);

  return (
    <div className={`min-h-screen ${bgMain} ${textMain} flex flex-col font-sans selection:bg-amber-500 selection:text-black relative overflow-hidden transition-colors duration-500 pb-8`}>
      
      {/* SMS Toast */}
      {smsNotification && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 border border-slate-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 fade-in duration-300 max-w-sm w-full">
              <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-500"><MessageSquare size={20}/></div>
              <div className="flex-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">M-PESA Message</div>
                  <p className="text-xs font-mono leading-tight">{smsNotification}</p>
              </div>
          </div>
      )}

      {/* Modals */}
      <TopUpModal 
        isOpen={isTopUpOpen} 
        onClose={() => setIsTopUpOpen(false)} 
        onConfirm={handleTransaction}
        phoneNumber={currentUser.phone}
      />
      <AdminDashboard 
        isOpen={isAdminOpen} 
        onClose={() => setIsAdminOpen(false)}
        onForceCrash={handleForceCrash}
        gamePhase={phase}
        onSetNextCrash={setNextCrashOverride}
        liveExposure={liveExposure}
      />
      <ProvablyFairModal
        isOpen={isFairnessOpen}
        onClose={() => setIsFairnessOpen(false)}
        serverSeed={serverSeed}
        clientSeed={clientSeed}
        hash={roundHash}
      />
      <UserTransactionsModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        transactions={currentUser.role === 'user' ? dbService.getUser(currentUser.phone)?.history || [] : []}
        title="My Transactions"
        isDarkMode={isDarkMode}
      />

      {/* Referral Modal */}
      {isReferralOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsReferralOpen(false)} />
              <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden text-center p-8">
                  <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Share2 size={32} className="text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase mb-2">Invite Friends</h2>
                  <p className="text-slate-400 text-sm mb-6">Earn <span className="text-emerald-500 font-bold">50 KSH</span> for every friend who joins and wins their first bet!</p>
                  
                  <div className="bg-black border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4 mb-4">
                      <code className="text-amber-500 font-mono font-bold text-lg">{currentUser.phone}</code>
                      <button onClick={() => { navigator.clipboard.writeText(`Join Dundabets with code: ${currentUser.phone}`); alert("Copied!"); }} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition"><Copy size={16}/></button>
                  </div>
                  <button onClick={() => setIsReferralOpen(false)} className="text-slate-500 font-bold text-sm">Close</button>
              </div>
          </div>
      )}
      
      {/* Game Guide Modal */}
      {isGuideOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsGuideOpen(false)} />
              <div className={`bg-slate-900 border border-slate-700 w-full max-w-3xl h-[80vh] rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden`}>
                  <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-black/40">
                      <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-2"><BookOpen size={20} className="text-amber-500"/> Game Guide</h2>
                      <button onClick={() => setIsGuideOpen(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-8 text-slate-300 leading-relaxed">
                      <section>
                          <h3 className="text-lg font-bold text-white mb-2">Rules and Objectives</h3>
                          <p>Your goal in Aviator on Dundabets is simple: <strong>Cash out before the plane flies away.</strong></p>
                      </section>
                  </div>
              </div>
          </div>
      )}

      {/* Navigation Drawer */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
         <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsMenuOpen(false)} />
         
         <div className={`w-80 h-full ${bgPanel} border-l ${borderCol} shadow-2xl pointer-events-auto absolute right-0 top-0 transform transition-transform duration-300 flex flex-col ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className={`p-6 border-b ${borderCol} flex justify-between items-center`}>
                <h2 className="text-xl font-black uppercase tracking-widest text-white font-hud">Menu</h2>
                <button onClick={() => setIsMenuOpen(false)} className={`${textSub} hover:text-white`}><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* User Info */}
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.phone)}&background=random`} 
                        className="w-10 h-10 rounded-lg"
                        alt="User" 
                    />
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-sm truncate font-hud">{currentUser.role === 'admin' ? 'Root User' : currentUser.phone}</span>
                        <span className={`text-[10px] uppercase font-bold ${currentUser.role === 'admin' ? 'text-rose-500' : 'text-amber-400'}`}>
                            {currentUser.role === 'admin' ? 'Administrator' : 'Verified Player'}
                        </span>
                    </div>
                </div>

                {/* Account Actions */}
                <section className="space-y-2">
                    <button onClick={() => { setIsHistoryOpen(true); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl border ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-800' : 'border-slate-800 hover:bg-slate-800'} transition-all text-sm font-bold text-slate-300`}>
                        <FileClock size={16} className="text-emerald-500" /> My Transactions
                    </button>
                    <button onClick={() => { setIsReferralOpen(true); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl border ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-800' : 'border-slate-800 hover:bg-slate-800'} transition-all text-sm font-bold text-slate-300`}>
                        <Share2 size={16} className="text-amber-500" /> Refer & Earn
                    </button>
                    <button onClick={() => { setIsGuideOpen(true); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl border ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-800' : 'border-slate-800 hover:bg-slate-800'} transition-all text-sm font-bold text-slate-300`}>
                        <BookOpen size={16} className="text-cyan-500" /> How to Play
                    </button>
                </section>

                {/* Settings Section */}
                <section className="space-y-4">
                    <h3 className={`text-xs font-bold ${textSub} uppercase tracking-wider flex items-center gap-2`}>
                        <Settings size={14} /> Preferences
                    </h3>
                    
                    {/* Dark Mode */}
                    <div className={`flex items-center justify-between p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-800/50 border-slate-800'}`}>
                        <div className={`flex items-center gap-3 font-bold ${textMain}`}>
                            {isDarkMode ? <Moon size={18} className="text-indigo-400"/> : <Sun size={18} className="text-amber-400"/>}
                            <span>Dark Mode</span>
                        </div>
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-12 h-6 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-600'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Sound */}
                    <div className={`flex items-center justify-between p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-800/50 border-slate-800'}`}>
                         <div className={`flex items-center gap-3 font-bold ${textMain}`}>
                            {isMuted ? <VolumeX size={18} className="text-rose-400"/> : <Volume2 size={18} className="text-emerald-400"/>}
                            <span>Sound Effects</span>
                        </div>
                        <button onClick={toggleSound} className={`w-12 h-6 rounded-full p-1 transition-colors ${!isMuted ? 'bg-emerald-600' : 'bg-slate-600'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${!isMuted ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Animation Quality */}
                     <div className={`flex items-center justify-between p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-800/50 border-slate-800'}`}>
                         <div className={`flex items-center gap-3 font-bold ${textMain}`}>
                            <MonitorPlay size={18} className="text-cyan-400"/>
                            <span>HD Graphics</span>
                        </div>
                        <button onClick={() => setHighQuality(!highQuality)} className={`w-12 h-6 rounded-full p-1 transition-colors ${highQuality ? 'bg-cyan-600' : 'bg-slate-600'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${highQuality ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </section>

                {/* Rooms */}
                <section className="space-y-4">
                    <h3 className={`text-xs font-bold ${textSub} uppercase tracking-wider flex items-center gap-2`}>
                        <LayoutGrid size={14} /> Switch Room
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                        {ROOMS.map(room => (
                            <button key={room.id} onClick={() => switchRoom(room)} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${currentRoom.id === room.id ? 'bg-amber-500/10 border-amber-500 text-amber-400' : `${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-800 border-slate-700'} ${textSub} hover:border-slate-500`}`}>
                                <div className="flex flex-col items-start"><span className="font-bold text-sm">{room.name}</span><span className="text-[10px] opacity-70 font-hud">Min: {room.min} KSH</span></div>
                                {currentRoom.id === room.id && <Check size={16} />}
                            </button>
                        ))}
                    </div>
                </section>

                 <button onClick={handleLogout} className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-slate-300 p-4 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-700 transition">
                    <LogOut size={16} /> Log Out
                 </button>
            </div>
            
            <div className={`p-6 border-t ${borderCol} text-center flex justify-between items-center text-xs ${textSub} font-hud`}>
                <span>DUNDABETS v2.1.0</span>
                {currentUser.role === 'admin' && (
                    <button onClick={() => { setIsAdminOpen(true); setIsMenuOpen(false); }} className="hover:text-rose-500">ROOT</button>
                )}
            </div>
         </div>
      </div>

      {/* Header - Z-Index updated for mobile */}
      <header className={`${bgPanel} border-b ${borderCol} px-4 md:px-6 py-4 flex justify-between items-center shadow-2xl z-40 relative transition-colors duration-500`}>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-lg flex items-center justify-center transform -rotate-6 shadow-lg shadow-orange-900/50">
            <Plane className="text-black transform rotate-45" size={20} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white italic leading-none font-hud">
                DUNDA<span className="text-amber-500">BETS</span>
            </h1>
            <span className={`text-[9px] md:text-[10px] ${textSub} font-bold uppercase tracking-widest`}>{currentRoom.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
            {/* Real / Demo Toggle - Now visible on mobile but compact */}
            {currentUser.role === 'user' && (
                <div className={`flex items-center p-1 rounded-full border ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-800 border-slate-700'}`}>
                    <button onClick={() => setIsDemoMode(false)} className={`w-8 md:w-auto px-0 md:px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${!isDemoMode ? 'bg-emerald-500 text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                        <UserCheck size={12} /> <span className="hidden md:inline">Real</span>
                    </button>
                    <button onClick={() => setIsDemoMode(true)} className={`w-8 md:w-auto px-0 md:px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${isDemoMode ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Ghost size={12} /> <span className="hidden md:inline">Demo</span>
                    </button>
                </div>
            )}

            {/* Balance - Clickable Wrapper for Mobile */}
            <button 
                onClick={() => !isDemoMode && setIsTopUpOpen(true)}
                disabled={isDemoMode}
                className={`flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-2.5 rounded-xl border border-opacity-20 backdrop-blur-md shadow-xl transition-all ${isDemoMode ? 'opacity-90 cursor-default' : 'active:scale-95 cursor-pointer hover:border-emerald-500/50'} ${isDarkMode ? 'bg-zinc-800/80 border-amber-500/30' : 'bg-slate-800/80 border-amber-500/30'}`}
             >
                <div className={`${isDemoMode ? 'bg-blue-500/20' : 'bg-emerald-500/20'} p-1.5 md:p-2 rounded-lg shadow-inner`}>
                    <Wallet className={isDemoMode ? 'text-blue-400' : 'text-emerald-400'} size={16} />
                </div>
                <div className="flex flex-col leading-none text-right md:text-left">
                    <span className={`text-[8px] md:text-[10px] font-bold uppercase ${textSub} mb-0.5`}>
                        {currentUser.role === 'admin' ? 'Admin' : (isDemoMode ? 'Demo' : 'Balance')}
                    </span>
                    {currentUser.role === 'admin' ? (
                        <span className="text-xs md:text-sm font-bold text-rose-500 uppercase tracking-widest mt-1">NO PLAY</span>
                    ) : (
                        <span className="text-base md:text-xl font-black font-hud text-white tracking-wider drop-shadow-sm">{balance.toLocaleString()}</span>
                    )}
                </div>
            </button>

            <button onClick={() => setIsMenuOpen(true)} className={`p-2 md:p-3 ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'} ${textSub} hover:text-white rounded-xl transition border shadow-lg`}>
                <Menu size={20} />
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row p-4 lg:p-6 gap-6 max-w-[1800px] mx-auto w-full relative z-10">
        <div className="flex-1 flex flex-col gap-4">
           <History history={history} isDarkMode={isDarkMode} />
           <div className="flex-1 min-h-[400px] lg:min-h-0 relative group">
              <GameCanvas 
                phase={phase} 
                multiplier={multiplier} 
                recentCashOuts={totalCashOuts}
                timeToNextRound={timeToNextRound}
                highQuality={highQuality}
                isDarkMode={isDarkMode}
              />
              {latestUserCashOut && phase !== GamePhase.IDLE && (
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-slate-950 px-8 py-3 rounded-full font-black text-xl shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-bounce z-20 border-4 border-white/20 flex flex-col items-center">
                      <span className="font-hud">YOU WON! {latestUserCashOut.toFixed(2)}x</span>
                  </div>
              )}
           </div>
           
           {currentUser.role !== 'admin' && (
               <Controls 
                 key={currentRoom.id}
                 phase={phase} 
                 balance={balance} 
                 onBet={handleBet} 
                 onCashOut={handleCashOut}
                 onCancel={handleCancelBet}
                 myBets={myBets}
                 cashOutMultipliers={cashOutMultipliers}
                 multiplier={multiplier}
                 autoCashOuts={autoCashOuts}
                 onAutoCashOutChange={handleAutoCashOutChange}
                 minBet={Math.max(currentRoom.min, minBetLimit)}
                 isDarkMode={isDarkMode}
               />
           )}
           {currentUser.role === 'admin' && (
               <div className="w-full h-24 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest">
                   Admin Mode Active • Betting Disabled
               </div>
           )}
        </div>

        <Sidebar 
            phase={phase}
            multiplier={multiplier}
            currentPlayers={[
                ...(myBets[0] !== null ? [{ 
                    id: 'me-0', 
                    name: isDemoMode ? 'You (Demo)' : 'You (Bet 1)', 
                    betAmount: myBets[0]!, 
                    cashedOutAt: cashOutMultipliers[0] || undefined, 
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.phone)}&background=random` 
                }] : []),
                ...(myBets[1] !== null ? [{ 
                    id: 'me-1', 
                    name: isDemoMode ? 'You (Demo 2)' : 'You (Bet 2)', 
                    betAmount: myBets[1]!, 
                    cashedOutAt: cashOutMultipliers[1] || undefined, 
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.phone)}&background=random` 
                }] : []),
                ...simulatedPlayers
            ]}
            history={history}
            onlineUsers={onlineUsers}
            isDarkMode={isDarkMode}
            onClaimRain={handleClaimRain}
        />
      </main>

      <div className={`fixed bottom-0 w-full ${isDarkMode ? 'bg-zinc-950/90' : 'bg-slate-950/90'} backdrop-blur border-t ${borderCol} py-2 px-4 z-50 text-center`}>
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest relative">
              <span className="flex items-center gap-1 text-rose-600"><ShieldCheck size={12}/> Authorized by BCLB | License No: BK0000523</span>
              <span>18+ Only</span>
              <span className="hidden md:inline">|</span>
              <span className="text-amber-500">Gambling can be addictive. Play Responsibly.</span>
              <span className="hidden md:inline">|</span>
              <button onClick={() => setIsFairnessOpen(true)} className="flex items-center gap-1 hover:text-emerald-500 transition-colors"><Lock size={12} className="text-emerald-500" /> Provably Fair</button>
          </div>
      </div>
    </div>
  );
};

export default App;
