
import React, { useState } from 'react';
import { Plane, Lock, Phone, ArrowRight, AlertCircle, ShieldCheck, UserX, Skull, Terminal, ShieldAlert, ChevronLeft, CheckSquare, Square } from 'lucide-react';
import { dbService } from '../services/dbService';

interface LoginPageProps {
  onLogin: (phone: string, role: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isOver18, setIsOver18] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Hidden Admin State
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [secretClicks, setSecretClicks] = useState(0);

  const validateSafaricom = (num: string) => {
    const safaricomRegex = /^(07(?:0|1|2|4|5|6|8|9)[0-9]{7}|01(?:1[0-5])[0-9]{6})$/;
    return safaricomRegex.test(num);
  };

  const handleLogoClick = () => {
      setSecretClicks(prev => {
          const newCount = prev + 1;
          if (newCount >= 5) {
              setShowAdminLogin(true);
              setPhone('kelly'); // Auto-fill new admin username
              setPassword('');
              setError(null);
              return 0;
          }
          return newCount;
      });
      
      // Reset clicks if inactive
      setTimeout(() => setSecretClicks(0), 2000);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      
      const result = dbService.loginUser(phone, password);
      
      if (result.success && result.user && result.user.role === 'admin') {
          onLogin(result.user.phone, result.user.role);
      } else {
          setError("ACCESS DENIED: Invalid Root Credentials");
          // Shake effect or visual feedback could be added here
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // If user somehow tries to login as admin from main form
    if (phone === 'kelly' || phone === 'root') {
         setError("System restricted. Use admin portal.");
         return;
    }

    if (isRegistering && !isOver18) {
        setError("You must be 18+ to register.");
        return;
    }

    // REGULAR USER VALIDATION
    if (!validateSafaricom(phone)) {
      setError("Please enter a valid Safaricom number (e.g., 07xx or 011x).");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    if (isRegistering) {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      const result = dbService.registerUser(phone, password);
      if (result.success && result.user) {
        onLogin(result.user.phone, result.user.role);
      } else {
        setError(result.message || "Registration failed.");
      }

    } else {
      const result = dbService.loginUser(phone, password);
      if (result.success && result.user) {
         onLogin(result.user.phone, result.user.role);
      } else {
         setError(result.message || "Login failed.");
      }
    }
  };

  const handleDemo = () => {
    const result = dbService.loginUser('DemoUser', undefined, true);
    if (result.success && result.user) {
        onLogin(result.user.phone, result.user.role);
    }
  };

  // --- ADMIN PORTAL RENDER ---
  if (showAdminLogin) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-mono text-red-500 relative overflow-hidden">
             {/* Matrix-like background effect */}
             <div className="absolute inset-0 opacity-10 pointer-events-none" 
                  style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(220, 38, 38, .3) 25%, rgba(220, 38, 38, .3) 26%, transparent 27%, transparent 74%, rgba(220, 38, 38, .3) 75%, rgba(220, 38, 38, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(220, 38, 38, .3) 25%, rgba(220, 38, 38, .3) 26%, transparent 27%, transparent 74%, rgba(220, 38, 38, .3) 75%, rgba(220, 38, 38, .3) 76%, transparent 77%, transparent)', backgroundSize: '50px 50px' }}>
             </div>

             <div className="w-full max-w-md bg-zinc-900 border-2 border-red-900 p-8 rounded-xl shadow-[0_0_50px_rgba(220,38,38,0.2)] relative z-10">
                <div className="flex justify-between items-start mb-8 border-b border-red-900/50 pb-4">
                    <div className="flex items-center gap-3">
                        <Skull size={32} className="animate-pulse" />
                        <div>
                            <h1 className="text-2xl font-black tracking-widest uppercase">Root Access</h1>
                            <p className="text-xs text-red-700 font-bold">UNAUTHORIZED ACCESS FORBIDDEN</p>
                        </div>
                    </div>
                    <button onClick={() => setShowAdminLogin(false)} className="text-red-800 hover:text-red-500 transition">
                        <ChevronLeft size={24} />
                    </button>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <Terminal size={14} /> System Identifier
                        </label>
                        <input 
                            type="text" 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-black border border-red-900 text-red-500 p-4 rounded-none focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition font-mono text-lg"
                            placeholder="root"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                         <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <Lock size={14} /> Encryption Key
                        </label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black border border-red-900 text-red-500 p-4 rounded-none focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition font-mono text-lg"
                            placeholder="••••••"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-950/50 border border-red-900 text-red-400 p-3 flex items-center gap-2 text-xs font-bold animate-pulse">
                            <ShieldAlert size={16} />
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        className="w-full bg-red-900/20 hover:bg-red-900/40 border border-red-800 text-red-500 font-black uppercase tracking-widest py-4 transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2 mt-4"
                    >
                        Authenticate
                    </button>
                </form>

                <div className="mt-8 text-center text-[10px] text-red-900 uppercase tracking-widest">
                    Secure Connection Established • IP Logged
                </div>
             </div>
        </div>
      );
  }

  // --- STANDARD USER RENDER ---
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-slate-200">
      
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10">
        
        {/* Logo (Secret Trigger) */}
        <div className="flex flex-col items-center mb-8 select-none cursor-pointer active:scale-95 transition-transform" onClick={handleLogoClick}>
            <div className="w-16 h-16 bg-gradient-to-tr from-rose-600 to-red-600 rounded-2xl flex items-center justify-center transform -rotate-6 shadow-lg shadow-rose-900/50 mb-4">
                <Plane className="text-white transform rotate-45" size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white italic leading-none">
                DUNDA<span className="text-rose-500">BETS</span>
            </h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">The Ultimate Crash Game</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl mb-6">
            <button 
                onClick={() => { setIsRegistering(false); setError(null); }}
                className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${!isRegistering ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Log In
            </button>
            <button 
                onClick={() => { setIsRegistering(true); setError(null); }}
                className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${isRegistering ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Register
            </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Phone Input */}
            <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Phone Number</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone size={18} className="text-slate-500" />
                    </div>
                    <input 
                        type="text" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="07XX... or 011X..."
                        className="w-full bg-slate-950 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono text-lg"
                        required
                    />
                </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Password</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock size={18} className="text-slate-500" />
                    </div>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                        required
                    />
                </div>
            </div>

            {/* Confirm Password (Register Only) */}
            {isRegistering && (
                <>
                    <div className="space-y-1 animate-fadeIn">
                        <label className="text-xs font-bold uppercase text-slate-500 ml-1">Confirm Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <ShieldCheck size={18} className="text-slate-500" />
                            </div>
                            <input 
                                type="password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-slate-950 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                                required
                            />
                        </div>
                    </div>
                    
                    {/* 18+ Checkbox */}
                    <div className="flex items-start gap-3 mt-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800 cursor-pointer" onClick={() => setIsOver18(!isOver18)}>
                         <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isOver18 ? 'bg-cyan-500 border-cyan-500 text-black' : 'border-slate-600'}`}>
                             {isOver18 && <CheckSquare size={14} />}
                         </div>
                         <div className="text-xs text-slate-400">
                             I confirm I am over <strong>18 years of age</strong> and accept the Terms & Conditions.
                         </div>
                    </div>
                </>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-rose-900/20 border border-rose-900/50 text-rose-500 p-3 rounded-xl flex items-center gap-2 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Submit Button */}
            <button 
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
            >
                {isRegistering ? 'Create Account' : 'Log In To Play'}
                <ArrowRight size={20} />
            </button>
        </form>

        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500">Or</span>
            </div>
        </div>

        {/* Demo Button */}
        <button 
            onClick={handleDemo}
            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold uppercase tracking-wider py-3 rounded-xl transition-all flex items-center justify-center gap-2 group"
        >
            <UserX size={18} className="text-slate-500 group-hover:text-slate-300" />
            Play Demo (No Withdrawals)
        </button>
        
        {/* BCLB Regulation Notices */}
        <div className="mt-8 pt-4 border-t border-slate-800 text-center space-y-2">
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                Gambling can be addictive. Play Responsibly.
            </p>
            <p className="text-[10px] text-slate-600 font-bold uppercase">
                Licensed by BCLB under the Betting, Lotteries and Gaming Act, Cap 131, Laws of Kenya under License No: BK0000523.
            </p>
        </div>

      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center">
          <p className="text-slate-600 text-xs">
              &copy; {new Date().getFullYear()} Dundabets. Only Safaricom numbers accepted.
          </p>
      </div>
    </div>
  );
};

export default LoginPage;
