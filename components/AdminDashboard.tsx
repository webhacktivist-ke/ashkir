
import React, { useEffect, useState } from 'react';
import { X, Database, Search, User, Trash2, ShieldAlert, Edit2, RotateCcw, Activity, Eye, Skull, DollarSign, Calendar, Check, LayoutDashboard, Wallet, Users, MessageSquare, Settings, TrendingUp, Ban, Lock, Unlock, Send, ArrowRightCircle, PlusCircle, MinusCircle, AlertTriangle, FileClock, Crosshair, Target, Key, Tag, FileText, Globe, Smartphone, RefreshCw, Gift, Megaphone, Image as ImageIcon, CreditCard, Plug, Power, UserCheck, ShieldCheck, Download, Upload } from 'lucide-react';
import { dbService, UserAccount, HouseAccount, SupportTicket, SystemLog, Voucher } from '../services/dbService';
import { GamePhase } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import UserTransactionsModal from './UserTransactionsModal';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onForceCrash: () => void;
  gamePhase: GamePhase;
  onSetNextCrash?: (val: number) => void;
  liveExposure?: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose, onForceCrash, gamePhase, onSetNextCrash, liveExposure = 0 }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'finance' | 'promos' | 'security' | 'support' | 'settings' | 'content' | 'integrations' | 'system'>('dashboard');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [house, setHouse] = useState<HouseAccount | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  
  // Interaction State
  const [search, setSearch] = useState('');
  const [balanceEdit, setBalanceEdit] = useState<{phone: string, amount: string} | null>(null);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [depositModal, setDepositModal] = useState(false);
  const [ticketReply, setTicketReply] = useState<{id: string, text: string} | null>(null);

  // Round Manipulation State
  const [nextCrashInput, setNextCrashInput] = useState('');
  const [isNextCrashSet, setIsNextCrashSet] = useState(false);

  // Promo State
  const [promoForm, setPromoForm] = useState({ code: '', amount: '100', claims: '50' });

  // New History State
  const [viewHistoryUser, setViewHistoryUser] = useState<UserAccount | null>(null);
  
  // Config State
  const [gameConfig, setGameConfig] = useState(dbService.getGameConfig());
  const [roundLogs, setRoundLogs] = useState(dbService.getRoundHistory().slice(0, 50)); // Last 50

  useEffect(() => {
    if (isOpen) {
        refreshData();
        const interval = setInterval(refreshData, 5000); // Poll for updates
        return () => clearInterval(interval);
    }
  }, [isOpen]);

  const refreshData = () => {
      setUsers(dbService.getAllUsers());
      setHouse(dbService.getHouseStats());
      setTickets(dbService.getTickets());
      setGameConfig(dbService.getGameConfig());
      setRoundLogs(dbService.getRoundHistory().slice(0, 50));
      setLogs(dbService.getSystemLogs());
      setVouchers(dbService.getVouchers());
  };

  if (!isOpen) return null;

  // --- ACTIONS ---

  const handleDelete = (phone: string) => {
      if (window.confirm(`PERMANENTLY DELETE USER ${phone}?`)) {
          dbService.deleteUser(phone);
          refreshData();
      }
  };

  const handleBan = (phone: string, currentStatus: boolean) => {
      dbService.banUser(phone, !currentStatus);
      refreshData();
  };

  const handleFreeze = (phone: string, currentStatus: boolean) => {
      dbService.freezeUserFunds(phone, !currentStatus);
      refreshData();
  };
  
  const handleResetPassword = (phone: string) => {
      if (confirm(`Reset password for ${phone} to '1234'?`)) {
          dbService.resetUserPassword(phone);
          alert(`Password for ${phone} reset to '1234'.`);
          refreshData();
      }
  };

  const handleAdjustBalance = () => {
      if (balanceEdit) {
          const amt = parseInt(balanceEdit.amount);
          if (!isNaN(amt)) {
              if (confirm(`Set balance for ${balanceEdit.phone} to ${amt}?`)) {
                dbService.setBalance(balanceEdit.phone, amt);
                setBalanceEdit(null);
                refreshData();
              }
          }
      }
  };

  const handleHouseWithdraw = (amount: number, method: 'MPESA' | 'BANK', dest: string) => {
      const res = dbService.withdrawHouseFunds(amount, method, dest);
      if (res.success) {
          alert(`Successfully withdrew ${amount.toLocaleString()} KSH to ${method}`);
          setWithdrawModal(false);
          refreshData();
      } else {
          alert(res.message);
      }
  };

  const handleCreateVoucher = () => {
      if (!promoForm.code) return;
      dbService.createVoucher(promoForm.code, parseInt(promoForm.amount), parseInt(promoForm.claims));
      setPromoForm({ code: '', amount: '100', claims: '50' });
      refreshData();
      alert("Voucher Created!");
  };

  const handleTicketResolve = (id: string) => {
      if (ticketReply && ticketReply.text) {
          dbService.resolveTicket(id, ticketReply.text);
          setTicketReply(null);
          refreshData();
      }
  };

  const handleConfigUpdate = (key: keyof typeof gameConfig, value: any) => {
      dbService.updateGameConfig({ [key]: value });
      refreshData();
  };
  
  const handleSecurityUpdate = (key: 'require2FA' | 'ipWhitelist' | 'antiFraudAI', value: boolean) => {
      dbService.updateGameConfig({ security: { ...gameConfig.security, [key]: value } });
      refreshData();
  };

  const handleBackup = () => {
      const data = dbService.exportDatabase();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dundabets_backup_${Date.now()}.json`;
      a.click();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  const success = dbService.importDatabase(ev.target.result as string);
                  if (success) {
                      alert('Database restored successfully!');
                      refreshData();
                  } else {
                      alert('Failed to restore database. Invalid format.');
                  }
              }
          };
          reader.readAsText(file);
      }
  };

  const handlePanicLogout = () => {
      if (confirm("EMERGENCY: Log out ALL users? This cannot be undone.")) {
          dbService.updateGameConfig({ maintenanceMode: true });
          alert("Maintenance Mode Enabled. Users will be blocked.");
          refreshData();
      }
  };

  const handleSetNextCrash = () => {
      const val = parseFloat(nextCrashInput);
      if (val >= 1.0) {
          if (onSetNextCrash) onSetNextCrash(val);
          setIsNextCrashSet(true);
          setNextCrashInput('');
          setTimeout(() => setIsNextCrashSet(false), 3000);
      }
  };
  
  // Dummy Handlers for buttons
  const notImplemented = (feature: string) => alert(`${feature} feature triggered. (Simulation)`);

  const filteredUsers = users.filter(u => u.phone.toLowerCase().includes(search.toLowerCase()));
  const pendingTickets = tickets.filter(t => t.status === 'open');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 font-sans text-slate-200">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose}></div>

      {/* History Modal Overlay */}
      <UserTransactionsModal 
         isOpen={!!viewHistoryUser} 
         onClose={() => setViewHistoryUser(null)} 
         transactions={viewHistoryUser?.history || []}
         title={`Transactions: ${viewHistoryUser?.phone}`}
      />

      {/* Adjust Balance Modal */}
      {balanceEdit && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 w-80">
                  <h3 className="text-white font-bold mb-4">Adjust Balance: {balanceEdit.phone}</h3>
                  <input type="number" value={balanceEdit.amount} onChange={e => setBalanceEdit({...balanceEdit, amount: e.target.value})} className="w-full bg-black border border-slate-700 p-3 rounded mb-4 text-white"/>
                  <div className="flex gap-2">
                      <button onClick={handleAdjustBalance} className="flex-1 bg-emerald-600 py-2 rounded font-bold text-white">Save</button>
                      <button onClick={() => setBalanceEdit(null)} className="flex-1 bg-slate-700 py-2 rounded text-white">Cancel</button>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-slate-950 border border-slate-800 w-full md:max-w-7xl h-full md:h-[95vh] md:rounded-3xl shadow-2xl relative z-10 flex overflow-hidden">
        
        {/* SIDEBAR */}
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
            <div className="p-6 border-b border-slate-800">
                 <h2 className="text-xl font-black text-white italic tracking-tighter">DUNDA<span className="text-rose-500">ADMIN</span></h2>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Super Admin Panel</p>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {[
                    { id: 'dashboard', icon: LayoutDashboard, label: 'Command Deck' },
                    { id: 'users', icon: Users, label: 'Player Control' },
                    { id: 'finance', icon: Wallet, label: 'Financials' },
                    { id: 'promos', icon: Tag, label: 'Promotions' },
                    { id: 'content', icon: Megaphone, label: 'Content & CMS' },
                    { id: 'integrations', icon: Plug, label: 'Integrations' },
                    { id: 'security', icon: ShieldAlert, label: 'Security & Logs' },
                    { id: 'support', icon: MessageSquare, label: 'Support Desk', count: pendingTickets.length },
                    { id: 'settings', icon: Settings, label: 'Game Config' },
                    { id: 'system', icon: Database, label: 'System Data' },
                ].map(item => (
                    <button 
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <div className="flex items-center gap-3">
                            <item.icon size={18} />
                            {item.label}
                        </div>
                        {item.count ? (
                            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{item.count}</span>
                        ) : null}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
                 <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                     <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">System Status</div>
                     <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                         <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                         Operational
                     </div>
                 </div>
                 <button onClick={onClose} className="w-full mt-4 text-slate-500 hover:text-white text-xs font-bold uppercase flex items-center justify-center gap-2">
                     <Settings size={14} /> Close Terminal
                 </button>
            </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col bg-slate-950/50">
            {/* Mobile Header */}
            <div className="md:hidden p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                 <h2 className="text-lg font-black text-white">ADMIN PANEL</h2>
                 <button onClick={onClose}><X size={24} className="text-slate-400"/></button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                
                {/* --- DASHBOARD TAB --- */}
                {activeTab === 'dashboard' && house && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h1 className="text-2xl font-black text-white uppercase tracking-tight">Mission Control</h1>
                                <p className="text-slate-500 text-sm">Real-time platform overview</p>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Server Time</div>
                                <div className="font-mono text-emerald-500">{new Date().toLocaleTimeString()}</div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* House Balance Card */}
                            <div className="md:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                                    <Wallet size={64} className="text-emerald-500" />
                                </div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">House Balance</div>
                                <div className={`text-4xl font-mono font-black ${house.balance < 200000 ? 'text-rose-500' : 'text-white'}`}>
                                    {house.balance.toLocaleString()} <span className="text-lg text-slate-500">KSH</span>
                                </div>
                                {house.balance < 200000 && (
                                    <div className="flex items-center gap-2 text-rose-500 text-xs font-bold mt-2 animate-pulse">
                                        <AlertTriangle size={14} /> Low Funds Warning
                                    </div>
                                )}
                            </div>

                            {/* Profit Card */}
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Net Profit</div>
                                <div className="text-3xl font-mono font-black text-emerald-400">
                                    +{house.totalProfit.toLocaleString()}
                                </div>
                            </div>
                            
                            {/* Live Risk Card */}
                            <div className={`bg-slate-900 p-6 rounded-2xl border ${liveExposure > 10000 ? 'border-rose-500/50 bg-rose-900/10' : 'border-slate-800'}`}>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Round Risk</div>
                                <div className={`text-3xl font-mono font-black ${liveExposure > 10000 ? 'text-rose-400' : 'text-slate-200'}`}>
                                    {liveExposure.toLocaleString()} <span className="text-sm opacity-50">KSH</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             {/* Round Manipulation */}
                             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between relative overflow-hidden">
                                 <div className="absolute inset-0 bg-rose-900/5 pointer-events-none"></div>
                                 <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Crosshair size={16} className="text-rose-500"/> Emergency Override
                                    </h3>
                                    
                                    <div className="space-y-4 relative z-10">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Set Next Round Result</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    min="1.00" 
                                                    placeholder="2.00" 
                                                    className="w-full bg-black border border-slate-700 p-3 rounded-xl text-white font-mono font-bold"
                                                    value={nextCrashInput}
                                                    onChange={(e) => setNextCrashInput(e.target.value)}
                                                />
                                                <button 
                                                    onClick={handleSetNextCrash}
                                                    className={`px-4 rounded-xl font-bold uppercase text-xs transition ${isNextCrashSet ? 'bg-emerald-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
                                                >
                                                    {isNextCrashSet ? <Check size={16} /> : 'Set'}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-slate-500">Overrides RNG for exactly one round.</p>
                                        </div>
                                        
                                        <hr className="border-slate-800"/>

                                        <button 
                                            onClick={onForceCrash}
                                            disabled={gamePhase !== GamePhase.FLYING}
                                            className="w-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-500 border border-rose-600/50 py-3 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
                                        >
                                            <Skull size={18} /> Force Crash Round (NOW)
                                        </button>
                                    </div>
                                 </div>
                             </div>

                             {/* Chart */}
                             <div className="md:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 h-96">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <TrendingUp size={16} className="text-cyan-400"/> Profit & Loss Tracking (Hourly)
                                </h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={house.profitHistory}>
                                        <defs>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString()} stroke="#475569" fontSize={10} />
                                        <YAxis stroke="#475569" fontSize={10} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                            labelFormatter={(l) => new Date(l).toLocaleString()}    
                                        />
                                        <Area type="monotone" dataKey="balance" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- FINANCE TAB --- */}
                {activeTab === 'finance' && house && (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-6">House Wallet & Banking</h1>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
                                <div className="absolute -right-10 -top-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
                                <div className="relative z-10">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Available Liquidity</h3>
                                    <div className="text-5xl font-mono font-black text-white mb-8">
                                        {house.balance.toLocaleString()} <span className="text-lg text-slate-500">KSH</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => setWithdrawModal(true)} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-4 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20 transition"><MinusCircle size={20} /> Withdraw Profit</button>
                                        <button onClick={() => setDepositModal(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition"><PlusCircle size={20} /> Add Funds</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Financial Operations</h3>
                                <div className="grid grid-cols-2 gap-4">
                                     <button onClick={() => notImplemented("Deposit Logs")} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl flex flex-col items-center gap-2 text-xs font-bold uppercase text-slate-300 transition">
                                         <FileClock size={24} className="text-emerald-500"/> Deposit Logs
                                     </button>
                                     <button onClick={() => notImplemented("Withdrawal Approvals")} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl flex flex-col items-center gap-2 text-xs font-bold uppercase text-slate-300 transition">
                                         <Check size={24} className="text-rose-500"/> Withdrawal Approvals
                                     </button>
                                     <button onClick={() => notImplemented("Refund Tool")} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl flex flex-col items-center gap-2 text-xs font-bold uppercase text-slate-300 transition">
                                         <RotateCcw size={24} className="text-amber-500"/> Refund Tool
                                     </button>
                                     <button onClick={() => notImplemented("Bonus Crediting")} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl flex flex-col items-center gap-2 text-xs font-bold uppercase text-slate-300 transition">
                                         <Gift size={24} className="text-purple-500"/> Credit Bonus
                                     </button>
                                </div>
                            </div>
                        </div>
                         {withdrawModal && (
                             <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 animate-in fade-in zoom-in mt-4 max-w-md">
                                 <h3 className="font-bold text-white mb-4">Withdraw to M-PESA</h3>
                                 <div className="space-y-4">
                                     <input type="number" placeholder="Amount" id="wd-amount" className="w-full bg-black p-3 rounded text-white border border-slate-700"/>
                                     <input type="text" placeholder="Phone Number" id="wd-phone" className="w-full bg-black p-3 rounded text-white border border-slate-700"/>
                                     <div className="flex gap-2">
                                         <button onClick={() => {
                                             const amt = (document.getElementById('wd-amount') as HTMLInputElement).value;
                                             const phone = (document.getElementById('wd-phone') as HTMLInputElement).value;
                                             handleHouseWithdraw(parseInt(amt), 'MPESA', phone);
                                         }} className="flex-1 bg-emerald-600 py-2 rounded text-white font-bold">Confirm</button>
                                         <button onClick={() => setWithdrawModal(false)} className="flex-1 bg-slate-700 py-2 rounded text-white">Cancel</button>
                                     </div>
                                 </div>
                             </div>
                        )}
                    </div>
                )}
                
                {/* --- PROMOS TAB --- */}
                {activeTab === 'promos' && (
                    <div className="space-y-6">
                         <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-6">Promotions & Bonuses</h1>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {/* Create Voucher */}
                             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Tag size={16}/> Create Voucher Code</h3>
                                 <div className="space-y-4">
                                     <div>
                                         <label className="text-xs font-bold text-slate-500 uppercase">Code</label>
                                         <input type="text" value={promoForm.code} onChange={e => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})} className="w-full bg-black border border-slate-800 rounded p-3 text-white font-mono" placeholder="WELCOME2024"/>
                                     </div>
                                     <div className="flex gap-4">
                                         <div className="flex-1">
                                             <label className="text-xs font-bold text-slate-500 uppercase">Amount (KSH)</label>
                                             <input type="number" value={promoForm.amount} onChange={e => setPromoForm({...promoForm, amount: e.target.value})} className="w-full bg-black border border-slate-800 rounded p-3 text-white"/>
                                         </div>
                                         <div className="flex-1">
                                             <label className="text-xs font-bold text-slate-500 uppercase">Max Claims</label>
                                             <input type="number" value={promoForm.claims} onChange={e => setPromoForm({...promoForm, claims: e.target.value})} className="w-full bg-black border border-slate-800 rounded p-3 text-white"/>
                                         </div>
                                     </div>
                                     <button onClick={handleCreateVoucher} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl uppercase tracking-wider transition">Create Voucher</button>
                                 </div>
                             </div>

                             {/* Campaigns */}
                             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Megaphone size={16}/> Campaigns</h3>
                                 <div className="grid grid-cols-2 gap-4">
                                     <button onClick={() => notImplemented("Free Bet")} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl flex flex-col items-center gap-2 text-xs font-bold uppercase text-slate-300 transition">
                                         <Gift size={24} className="text-pink-500"/> Send Free Bet
                                     </button>
                                     <button onClick={() => notImplemented("Referral Config")} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl flex flex-col items-center gap-2 text-xs font-bold uppercase text-slate-300 transition">
                                         <Users size={24} className="text-blue-500"/> Referral Config
                                     </button>
                                     <button onClick={() => notImplemented("Cashback")} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl flex flex-col items-center gap-2 text-xs font-bold uppercase text-slate-300 transition">
                                         <RotateCcw size={24} className="text-amber-500"/> Cashback Program
                                     </button>
                                     <button onClick={() => notImplemented("Affiliate")} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl flex flex-col items-center gap-2 text-xs font-bold uppercase text-slate-300 transition">
                                         <Globe size={24} className="text-emerald-500"/> Affiliate Settings
                                     </button>
                                 </div>
                             </div>
                             
                             {/* Active Vouchers List */}
                             <div className="md:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 overflow-hidden">
                                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Active Vouchers</h3>
                                 <div className="h-48 overflow-y-auto space-y-2">
                                     {vouchers.length === 0 && <div className="text-slate-500 italic text-sm">No active vouchers.</div>}
                                     {vouchers.map((v, i) => (
                                         <div key={i} className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-lg">
                                             <div>
                                                 <div className="font-mono font-bold text-emerald-400">{v.code}</div>
                                                 <div className="text-[10px] text-slate-500">Value: {v.amount} KSH</div>
                                             </div>
                                             <div className="text-right">
                                                 <div className="text-xs font-bold text-white">{v.claimedBy.length} / {v.maxClaims}</div>
                                                 <div className="text-[10px] text-slate-500 uppercase">Claimed</div>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         </div>
                    </div>
                )}
                
                {/* --- CONTENT TAB (NEW) --- */}
                {activeTab === 'content' && (
                     <div className="space-y-6">
                         <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-6">Content & CMS</h1>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><ImageIcon size={16}/> Visual Assets</h3>
                                 <div className="space-y-4">
                                     <button onClick={() => notImplemented("Edit Banners")} className="w-full bg-slate-800 p-4 rounded-xl flex justify-between items-center hover:bg-slate-700 transition">
                                         <span className="font-bold text-sm">Homepage Banners</span>
                                         <Edit2 size={16} className="text-slate-400" />
                                     </button>
                                     <button onClick={() => notImplemented("Edit Ticker")} className="w-full bg-slate-800 p-4 rounded-xl flex justify-between items-center hover:bg-slate-700 transition">
                                         <span className="font-bold text-sm">News Ticker</span>
                                         <Edit2 size={16} className="text-slate-400" />
                                     </button>
                                     <button onClick={() => notImplemented("Edit FAQ")} className="w-full bg-slate-800 p-4 rounded-xl flex justify-between items-center hover:bg-slate-700 transition">
                                         <span className="font-bold text-sm">FAQ / Help Text</span>
                                         <Edit2 size={16} className="text-slate-400" />
                                     </button>
                                 </div>
                             </div>

                             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><MessageSquare size={16}/> Notification Templates</h3>
                                  <div className="space-y-4">
                                     <button onClick={() => notImplemented("SMS Template")} className="w-full bg-slate-800 p-4 rounded-xl flex justify-between items-center hover:bg-slate-700 transition">
                                         <span className="font-bold text-sm">SMS Alerts (Deposit/Withdraw)</span>
                                         <Settings size={16} className="text-slate-400" />
                                     </button>
                                     <button onClick={() => notImplemented("Email Template")} className="w-full bg-slate-800 p-4 rounded-xl flex justify-between items-center hover:bg-slate-700 transition">
                                         <span className="font-bold text-sm">Email Campaigns</span>
                                         <Settings size={16} className="text-slate-400" />
                                     </button>
                                     <button onClick={() => notImplemented("In-App Message")} className="w-full bg-slate-800 p-4 rounded-xl flex justify-between items-center hover:bg-slate-700 transition">
                                         <span className="font-bold text-sm">In-App Announcements</span>
                                         <Megaphone size={16} className="text-slate-400" />
                                     </button>
                                 </div>
                             </div>
                         </div>
                     </div>
                )}
                
                {/* --- INTEGRATIONS TAB (NEW) --- */}
                {activeTab === 'integrations' && (
                    <div className="space-y-6">
                         <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-6">System Integrations</h1>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><CreditCard size={16}/> Payment Gateways</h3>
                                 <div className="space-y-4">
                                     <div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-emerald-500/30">
                                         <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 bg-green-600 rounded flex items-center justify-center font-black text-white">M</div>
                                             <div><div className="font-bold text-sm">M-PESA Daraja API</div><div className="text-[10px] text-emerald-500">Connected</div></div>
                                         </div>
                                         <button onClick={() => notImplemented("M-PESA Config")} className="px-3 py-1 bg-slate-800 rounded text-xs font-bold hover:bg-slate-700">Configure</button>
                                     </div>
                                     <div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800 opacity-60">
                                         <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center font-black text-white">S</div>
                                             <div><div className="font-bold text-sm">Stripe / Card</div><div className="text-[10px] text-slate-500">Not Configured</div></div>
                                         </div>
                                         <button onClick={() => notImplemented("Stripe Config")} className="px-3 py-1 bg-slate-800 rounded text-xs font-bold hover:bg-slate-700">Connect</button>
                                     </div>
                                 </div>
                             </div>

                             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Plug size={16}/> 3rd Party Services</h3>
                                  <div className="space-y-4">
                                     <div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800">
                                         <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 bg-amber-600 rounded flex items-center justify-center font-black text-white"><MessageSquare size={20}/></div>
                                             <div><div className="font-bold text-sm">Africa's Talking (SMS)</div><div className="text-[10px] text-amber-500">API Key Missing</div></div>
                                         </div>
                                         <button onClick={() => notImplemented("SMS Config")} className="px-3 py-1 bg-slate-800 rounded text-xs font-bold hover:bg-slate-700">Configure</button>
                                     </div>
                                      <div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800">
                                         <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center font-black text-white"><Globe size={20}/></div>
                                             <div><div className="font-bold text-sm">Webhook Events</div><div className="text-[10px] text-slate-500">No active hooks</div></div>
                                         </div>
                                         <button onClick={() => notImplemented("Webhooks")} className="px-3 py-1 bg-slate-800 rounded text-xs font-bold hover:bg-slate-700">Manage</button>
                                     </div>
                                 </div>
                             </div>
                         </div>
                    </div>
                )}

                {/* --- USERS TAB --- */}
                {activeTab === 'users' && (
                    <div className="space-y-6 h-full flex flex-col">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Player Control</h1>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input 
                                    className="bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-rose-500 outline-none w-64"
                                    placeholder="Search users..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                             <div className="overflow-auto flex-1">
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="bg-slate-950 sticky top-0 z-10 font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                                        <tr>
                                            <th className="p-4">User</th>
                                            <th className="p-4 text-right">Balance</th>
                                            <th className="p-4 text-center">Status</th>
                                            <th className="p-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {filteredUsers.map(user => (
                                            <tr key={user.phone} className="hover:bg-slate-800/50 transition">
                                                <td className="p-4 font-mono font-bold text-white">
                                                    <div>{user.phone}</div>
                                                    <div className="text-[10px] text-slate-500 font-normal">Joined: {new Date(user.joinedAt).toLocaleDateString()}</div>
                                                    <div className="text-[10px] text-slate-500 font-normal">IP: {user.ip || 'Unknown'}</div>
                                                </td>
                                                <td className="p-4 text-right font-mono text-emerald-400">{user.balance.toLocaleString()}</td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        {user.isBanned && <span className="bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-rose-500/20">Banned</span>}
                                                        {user.isFrozen && <span className="bg-cyan-500/10 text-cyan-500 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-cyan-500/20">Frozen</span>}
                                                        {!user.isBanned && !user.isFrozen && <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[10px] uppercase font-bold">Active</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-center gap-2">
                                                        {user.role === 'user' && (
                                                            <>
                                                                <button onClick={() => setViewHistoryUser(user)} title="View Transaction History" className="p-2 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-lg transition">
                                                                    <FileClock size={16} />
                                                                </button>
                                                                <button onClick={() => notImplemented("KYC Review")} title="Review KYC" className="p-2 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-lg transition">
                                                                    <UserCheck size={16} />
                                                                </button>
                                                                <button onClick={() => setBalanceEdit({phone: user.phone, amount: user.balance.toString()})} title="Adjust Balance" className="p-2 bg-slate-800 text-slate-400 hover:bg-emerald-600 hover:text-white rounded-lg transition">
                                                                    <DollarSign size={16} />
                                                                </button>
                                                                <button onClick={() => handleBan(user.phone, user.isBanned)} title={user.isBanned ? "Unban" : "Ban"} className={`p-2 rounded-lg transition ${user.isBanned ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white'}`}>
                                                                    {user.isBanned ? <Check size={16}/> : <Ban size={16} />}
                                                                </button>
                                                                <button onClick={() => handleFreeze(user.phone, user.isFrozen)} title={user.isFrozen ? "Unfreeze" : "Freeze Funds"} className={`p-2 rounded-lg transition ${user.isFrozen ? 'bg-emerald-500/10 text-emerald-500' : 'bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500 hover:text-white'}`}>
                                                                    {user.isFrozen ? <Unlock size={16}/> : <Lock size={16} />}
                                                                </button>
                                                                <button onClick={() => handleResetPassword(user.phone)} title="Reset Password" className="p-2 bg-slate-800 text-slate-400 hover:bg-amber-600 hover:text-white rounded-lg transition">
                                                                    <Key size={16} />
                                                                </button>
                                                                <button onClick={() => handleDelete(user.phone)} title="Delete User" className="p-2 bg-slate-800 text-slate-400 hover:bg-rose-600 hover:text-white rounded-lg transition">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    </div>
                )}
                
                {/* --- SECURITY TAB --- */}
                {activeTab === 'security' && (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-6">Security & Audit Logs</h1>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col h-[500px]">
                                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><FileText size={16}/> Audit Trail</h3>
                                 <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                     {logs.map(log => (
                                         <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                                             <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${log.severity === 'critical' ? 'bg-rose-500' : log.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                             <div className="flex-1">
                                                 <div className="flex justify-between items-center mb-1">
                                                     <span className="text-xs font-bold text-white uppercase">{log.action}</span>
                                                     <span className="text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                                                 </div>
                                                 <p className="text-xs text-slate-400 font-mono">{log.details}</p>
                                                 <div className="mt-1 text-[10px] text-slate-600">Admin: {log.admin}</div>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                             
                             <div className="space-y-6">
                                 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                                     <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Globe size={16}/> Access Control</h3>
                                     <div className="space-y-4">
                                         <div className="flex items-center justify-between p-3 bg-slate-950 rounded border border-slate-800">
                                             <span className="text-xs font-bold text-white">IP Whitelisting</span>
                                             <button onClick={() => handleSecurityUpdate('ipWhitelist', !gameConfig.security?.ipWhitelist)} className={`w-8 h-4 rounded-full relative transition-colors ${gameConfig.security?.ipWhitelist ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                 <div className={`w-2 h-2 bg-white rounded-full absolute top-1 transition-all ${gameConfig.security?.ipWhitelist ? 'left-5' : 'left-1'}`}></div>
                                             </button>
                                         </div>
                                         <div className="flex items-center justify-between p-3 bg-slate-950 rounded border border-slate-800">
                                             <span className="text-xs font-bold text-white">Admin 2FA</span>
                                             <button onClick={() => handleSecurityUpdate('require2FA', !gameConfig.security?.require2FA)} className={`w-8 h-4 rounded-full relative transition-colors ${gameConfig.security?.require2FA ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                 <div className={`w-2 h-2 bg-white rounded-full absolute top-1 transition-all ${gameConfig.security?.require2FA ? 'left-5' : 'left-1'}`}></div>
                                             </button>
                                         </div>
                                          <div className="flex items-center justify-between p-3 bg-slate-950 rounded border border-slate-800">
                                             <span className="text-xs font-bold text-white">Anti-Fraud AI</span>
                                             <button onClick={() => handleSecurityUpdate('antiFraudAI', !gameConfig.security?.antiFraudAI)} className={`w-8 h-4 rounded-full relative transition-colors ${gameConfig.security?.antiFraudAI ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                 <div className={`w-2 h-2 bg-white rounded-full absolute top-1 transition-all ${gameConfig.security?.antiFraudAI ? 'left-5' : 'left-1'}`}></div>
                                             </button>
                                         </div>
                                     </div>
                                 </div>

                                 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                                     <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Smartphone size={16}/> Device History</h3>
                                     <p className="text-xs text-slate-500">Last login: 127.0.0.1 (Chrome/Windows)</p>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}

                {/* --- SUPPORT TAB --- */}
                {activeTab === 'support' && (
                    <div className="space-y-6">
                         <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-6">Support Desk</h1>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {tickets.length === 0 && <div className="text-slate-500 italic">No tickets found.</div>}
                             {tickets.map(ticket => (
                                 <div key={ticket.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
                                     <div className="flex justify-between items-start">
                                         <div><div className="text-xs text-rose-500 font-bold uppercase">{ticket.userPhone}</div><h4 className="font-bold text-white text-lg">{ticket.subject}</h4></div>
                                         <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${ticket.status === 'open' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{ticket.status}</span>
                                     </div>
                                     <p className="text-slate-400 text-sm bg-black/30 p-3 rounded-lg">{ticket.message}</p>
                                     {ticket.status === 'open' && (
                                         <div className="mt-2">
                                             {ticketReply?.id === ticket.id ? (
                                                 <div className="flex gap-2">
                                                     <input className="flex-1 bg-black border border-slate-700 rounded p-2 text-sm text-white" placeholder="Type response..." value={ticketReply.text} onChange={(e) => setTicketReply({...ticketReply, text: e.target.value})} />
                                                     <button onClick={() => handleTicketResolve(ticket.id)} className="bg-emerald-600 text-white px-3 rounded font-bold"><Send size={14}/></button>
                                                 </div>
                                             ) : (
                                                 <button onClick={() => setTicketReply({id: ticket.id, text: ''})} className="text-xs font-bold text-cyan-500 uppercase flex items-center gap-1 hover:text-cyan-400"><MessageSquare size={12} /> Reply & Resolve</button>
                                             )}
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                    </div>
                )}
                
                {/* --- SETTINGS TAB --- */}
                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-6">Game Configuration</h1>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">RTP & Limits</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                                        <div className="flex flex-col">
                                            <span className="text-white font-bold">Maintenance Mode</span>
                                            <span className="text-xs text-slate-500">Blocks all logins and betting</span>
                                        </div>
                                        <button onClick={() => handleConfigUpdate('maintenanceMode', !gameConfig.maintenanceMode)} className={`w-12 h-6 rounded-full p-1 transition-colors ${gameConfig.maintenanceMode ? 'bg-rose-600' : 'bg-slate-700'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${gameConfig.maintenanceMode ? 'translate-x-6' : ''}`} />
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Return to Player (RTP %)</label>
                                        <input type="number" value={gameConfig.rtp} onChange={(e) => handleConfigUpdate('rtp', parseFloat(e.target.value))} className="w-full bg-black border border-slate-800 p-3 rounded text-white" />
                                        <p className="text-[10px] text-slate-500">Determines long-term payout. Standard is 96%.</p>
                                    </div>
                                    
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Min Bet</label>
                                            <input type="number" value={gameConfig.minBet} onChange={(e) => handleConfigUpdate('minBet', parseInt(e.target.value))} className="w-full bg-black border border-slate-800 p-3 rounded text-white" />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Max Bet</label>
                                            <input type="number" value={gameConfig.maxBet} onChange={(e) => handleConfigUpdate('maxBet', parseInt(e.target.value))} className="w-full bg-black border border-slate-800 p-3 rounded text-white" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Max Profit / Round</label>
                                        <input type="number" value={gameConfig.maxProfitPerRound} onChange={(e) => handleConfigUpdate('maxProfitPerRound', parseInt(e.target.value))} className="w-full bg-black border border-slate-800 p-3 rounded text-white" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Round Audit Log</h3>
                                <div className="h-64 overflow-y-auto space-y-2 pr-2">
                                    {roundLogs.map((log, i) => (
                                        <div key={i} className="flex justify-between items-center p-2 bg-slate-950 rounded border border-slate-800 text-xs">
                                            <span className="font-mono text-emerald-400 font-bold">@{log.crashPoint}x</span>
                                            <span className="font-mono text-slate-500 text-[10px] truncate max-w-[150px]">{log.hash}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SYSTEM TAB --- */}
                {activeTab === 'system' && (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-6">System Management</h1>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {/* Backup & Restore */}
                             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                     <Database size={16} /> Database Operations
                                 </h3>
                                 <p className="text-xs text-slate-500 mb-6">Export full database for cold storage or restore from a previous backup file.</p>
                                 
                                 <div className="flex flex-col gap-4">
                                     <button onClick={handleBackup} className="w-full bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-500 border border-cyan-500/50 py-4 rounded-xl font-bold uppercase flex items-center justify-center gap-2 transition">
                                         <Download size={18} /> Export / Backup Database
                                     </button>
                                     
                                     <div className="relative">
                                         <input type="file" onChange={handleRestore} className="absolute inset-0 opacity-0 cursor-pointer" accept=".json" />
                                         <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 py-4 rounded-xl font-bold uppercase flex items-center justify-center gap-2 transition">
                                             <Upload size={18} /> Restore Database (Upload)
                                         </button>
                                     </div>
                                 </div>
                             </div>

                             {/* Emergency */}
                             <div className="bg-slate-900 p-6 rounded-2xl border border-rose-900/30">
                                 <h3 className="text-sm font-bold text-rose-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                     <ShieldAlert size={16} /> Emergency Controls
                                 </h3>
                                 <p className="text-xs text-slate-500 mb-6">Use only in case of security breach or critical bug. This will disrupt all players.</p>
                                 
                                 <button onClick={handlePanicLogout} className="w-full bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 py-4 rounded-xl font-black uppercase flex items-center justify-center gap-2 transition animate-pulse">
                                     <Power size={18} /> PANIC: Logout All Users
                                 </button>
                             </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
