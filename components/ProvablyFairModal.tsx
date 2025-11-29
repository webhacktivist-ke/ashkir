
import React, { useState } from 'react';
import { X, ShieldCheck, Copy, Check, Lock, RefreshCcw } from 'lucide-react';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverSeed: string;
  clientSeed: string;
  hash: string;
}

const ProvablyFairModal: React.FC<ProvablyFairModalProps> = ({ isOpen, onClose, serverSeed, clientSeed, hash }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-black/50">
            <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 p-2 rounded-lg">
                    <ShieldCheck className="text-emerald-500" size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest">Provably Fair</h2>
                    <p className="text-xs text-zinc-500 font-bold">Fairness Guaranteed</p>
                </div>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
                <X size={24} />
            </button>
        </div>

        <div className="p-6 space-y-6">
            <p className="text-sm text-zinc-400 leading-relaxed">
                DundaBets uses a cryptographic provably fair system. The result of each round is determined by a combination of the Server Seed, Client Seed, and a Nonce. You can verify the outcome using any SHA256 calculator.
            </p>

            {/* Active Hash */}
            <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase text-zinc-500">
                    <span className="flex items-center gap-1"><Lock size={12} /> Active Server Seed (Hashed)</span>
                    <span className="text-emerald-500">Live</span>
                </div>
                <div className="bg-black border border-zinc-800 p-3 rounded-lg font-mono text-xs text-zinc-300 break-all flex items-start gap-3">
                    <span className="flex-1">{hash}</span>
                    <button onClick={() => handleCopy(hash, 'hash')} className="text-zinc-500 hover:text-white transition">
                        {copiedField === 'hash' ? <Check size={14} className="text-emerald-500"/> : <Copy size={14} />}
                    </button>
                </div>
            </div>

            {/* Client Seed */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-zinc-500">Client Seed (Public)</label>
                <div className="flex gap-2">
                    <div className="bg-black border border-zinc-800 p-3 rounded-lg font-mono text-xs text-zinc-300 flex-1 truncate">
                        {clientSeed}
                    </div>
                    <button className="bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg text-zinc-400 transition">
                        <RefreshCcw size={14} />
                    </button>
                </div>
                <p className="text-[10px] text-zinc-600">
                    This random string ensures we cannot control the outcome.
                </p>
            </div>

            {/* Next Round Info */}
            <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-800">
                <div className="flex items-start gap-3">
                    <div className="mt-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white mb-1">How it works?</h4>
                        <code className="text-[10px] text-zinc-400 bg-black/50 px-2 py-1 rounded block mb-2">
                            HMAC_SHA256(ServerSeed, ClientSeed + Nonce)
                        </code>
                        <p className="text-xs text-zinc-500">
                            The crash point is calculated from the hex output of this function. Because you control the client seed, we cannot manipulate the result.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div className="p-4 bg-black/50 border-t border-zinc-800 text-center">
             <a href="#" className="text-xs font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-2">
                 Verify on 3rd Party Site <ShieldCheck size={14} />
             </a>
        </div>
      </div>
    </div>
  );
};

export default ProvablyFairModal;
