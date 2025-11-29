
import React, { useState } from 'react';
import { X, Smartphone, CheckCircle, Loader, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from 'lucide-react';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, type: 'deposit' | 'withdraw') => void;
  phoneNumber: string;
  isWithdraw?: boolean; // New prop to toggle mode
}

const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose, onConfirm, phoneNumber, isWithdraw = false }) => {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'processing' | 'success'>('input');
  
  // Toggle between deposit and withdraw inside modal if needed, or stick to prop
  const [mode, setMode] = useState<'deposit' | 'withdraw'>(isWithdraw ? 'withdraw' : 'deposit');

  if (!isOpen) return null;

  const handleTransaction = () => {
    const val = parseInt(amount);
    
    if (mode === 'deposit') {
        if (!val || val < 10) return;
        if (val > 5000) return;
    } else {
        if (!val || val < 50) return; // Min withdrawal
    }

    setStep('processing');
    setIsLoading(true);

    // Simulate Network delay
    setTimeout(() => {
        setIsLoading(false);
        setStep('success');
        onConfirm(val, mode);
        
        // Auto close after success
        setTimeout(() => {
            onClose();
            setStep('input');
            setAmount('');
        }, 2000);
    }, 2500);
  };

  const themeColor = mode === 'deposit' ? '#4AC459' : '#F43F5E'; // Green or Rose
  const themeBg = mode === 'deposit' ? 'bg-[#4AC459]' : 'bg-rose-500';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden">
        
        {/* Header */}
        <div className={`${themeBg} p-6 text-white flex justify-between items-start transition-colors duration-300`}>
            <div>
                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                    {mode === 'deposit' ? <ArrowDownCircle /> : <ArrowUpCircle />}
                    {mode === 'deposit' ? 'Top Up' : 'Withdraw'}
                </h2>
                <p className="text-sm opacity-90 font-medium">{mode === 'deposit' ? 'M-PESA STK Push' : 'Transfer to M-PESA'}</p>
            </div>
            <button onClick={onClose} className="bg-white/20 p-1 rounded-full hover:bg-white/30 transition">
                <X size={20} />
            </button>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex border-b border-slate-100">
            <button 
                onClick={() => setMode('deposit')}
                className={`flex-1 py-3 font-bold text-xs uppercase tracking-wider transition-colors ${mode === 'deposit' ? 'text-[#4AC459] border-b-2 border-[#4AC459]' : 'text-slate-400'}`}
            >
                Deposit
            </button>
            <button 
                onClick={() => setMode('withdraw')}
                className={`flex-1 py-3 font-bold text-xs uppercase tracking-wider transition-colors ${mode === 'withdraw' ? 'text-rose-500 border-b-2 border-rose-500' : 'text-slate-400'}`}
            >
                Withdraw
            </button>
        </div>

        <div className="p-6">
            {step === 'input' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 bg-slate-100 p-3 rounded-xl">
                        <Smartphone className="text-slate-400" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-500">Phone Number</span>
                            <span className="font-mono font-bold text-lg">{phoneNumber}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase text-slate-500">Enter Amount (KSH)</label>
                        <input 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={mode === 'deposit' ? "Min 10 - Max 5000" : "Min 50"}
                            className={`w-full border-2 border-slate-200 rounded-xl p-4 text-2xl font-black text-center focus:outline-none transition focus:border-[${themeColor}]`}
                            style={{ borderColor: amount ? themeColor : '' }}
                            autoFocus
                        />
                        
                        {/* Validation Msg */}
                        {mode === 'deposit' && (
                            <div className="text-[10px] text-slate-400 flex justify-between">
                                <span>Min: 10 KSH</span>
                                <span>Max: 5,000 KSH</span>
                            </div>
                        )}
                         {mode === 'withdraw' && (
                            <div className="text-[10px] text-slate-400 flex justify-between">
                                <span>Min: 50 KSH</span>
                                <span>Max: 140,000 KSH</span>
                            </div>
                        )}

                        <div className="flex justify-between gap-2">
                            {[50, 100, 500, 1000].map(val => (
                                <button 
                                    key={val}
                                    onClick={() => setAmount(val.toString())}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg text-xs font-bold text-slate-600 transition"
                                >
                                    {val}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleTransaction}
                        disabled={!amount || (mode === 'deposit' ? parseInt(amount) < 10 : parseInt(amount) < 50)}
                        className={`w-full text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${themeBg}`}
                    >
                        {mode === 'deposit' ? 'Send Request' : 'Withdraw Funds'}
                    </button>
                </div>
            )}

            {step === 'processing' && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <div className="relative">
                        <div className={`w-16 h-16 border-4 border-slate-200 rounded-full animate-spin`} style={{ borderTopColor: themeColor }}></div>
                    </div>
                    <div className="text-center">
                        <h3 className="font-bold text-lg">{mode === 'deposit' ? 'Check your phone' : 'Processing Payout'}</h3>
                        <p className="text-slate-500 text-sm">{mode === 'deposit' ? 'Enter M-PESA PIN to complete.' : 'Funds are being transferred.'}</p>
                    </div>
                </div>
            )}

            {step === 'success' && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in zoom-in duration-300">
                    <CheckCircle size={64} color={themeColor} />
                    <div className="text-center">
                        <h3 className="font-black text-2xl text-slate-800">Confirmed!</h3>
                        <p className="text-slate-500 font-medium">Your transaction was successful.</p>
                    </div>
                </div>
            )}
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Secure Payment Gateway</p>
        </div>
      </div>
    </div>
  );
};

export default TopUpModal;
