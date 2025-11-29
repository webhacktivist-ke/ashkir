
import React from 'react';
import { X, ArrowUpRight, ArrowDownLeft, Gamepad2, Coins, FileClock } from 'lucide-react';
import { Transaction } from '../services/dbService';

interface UserTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  title?: string;
  isDarkMode?: boolean;
}

const UserTransactionsModal: React.FC<UserTransactionsModalProps> = ({ isOpen, onClose, transactions, title = "Transaction History", isDarkMode = true }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`border w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl relative z-10 flex flex-col overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
           <h2 className={`text-lg font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
               <FileClock size={20} className="text-amber-500"/> {title}
           </h2>
           <button onClick={onClose} className={`${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700">
           {transactions.length === 0 ? (
               <div className="p-12 text-center opacity-50 italic">No transactions found.</div>
           ) : (
               <table className={`w-full text-left text-xs md:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                   <thead className={`sticky top-0 uppercase font-bold tracking-wider z-10 ${isDarkMode ? 'bg-slate-950/90 text-slate-500' : 'bg-slate-100/90 text-slate-500'}`}>
                       <tr>
                           <th className="p-4">Type</th>
                           <th className="p-4">Amount</th>
                           <th className="p-4">Balance</th>
                           <th className="p-4 text-right">Time</th>
                       </tr>
                   </thead>
                   <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                       {transactions.slice().reverse().map((tx, i) => (
                           <tr key={i} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                               <td className="p-4">
                                   <div className="flex items-center gap-2 font-bold uppercase">
                                       {tx.type === 'deposit' && <ArrowDownLeft size={16} className="text-emerald-500"/>}
                                       {tx.type === 'withdraw' && <ArrowUpRight size={16} className="text-rose-500"/>}
                                       {tx.type === 'bet' && <Gamepad2 size={16} className="text-amber-500"/>}
                                       {tx.type === 'win' && <Coins size={16} className="text-emerald-400"/>}
                                       <span className={
                                           tx.type === 'deposit' ? 'text-emerald-500' :
                                           tx.type === 'withdraw' ? 'text-rose-500' :
                                           tx.type === 'win' ? 'text-emerald-400' :
                                           'opacity-70'
                                       }>{tx.type}</span>
                                       {tx.multiplier && <span className={`px-1.5 py-0.5 rounded text-[10px] ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>@{tx.multiplier}x</span>}
                                   </div>
                                   {tx.note && <div className="text-[10px] opacity-50 mt-1 ml-6">{tx.note}</div>}
                                   {tx.roomName && <div className="text-[10px] opacity-50 mt-0.5 ml-6">Room: {tx.roomName}</div>}
                               </td>
                               <td className={`p-4 font-mono font-bold ${tx.amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                   {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                               </td>
                               <td className="p-4 font-mono opacity-80">{tx.balanceAfter.toLocaleString()}</td>
                               <td className="p-4 text-right opacity-60 font-mono text-[10px]">
                                   {new Date(tx.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })}
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           )}
        </div>
      </div>
    </div>
  );
};

export default UserTransactionsModal;
