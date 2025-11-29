import React from 'react';
import { BetHistoryItem } from '../types';

interface HistoryProps {
  history: BetHistoryItem[];
  isDarkMode: boolean;
}

const History: React.FC<HistoryProps> = ({ history, isDarkMode }) => {
  return (
    <div className="w-full flex gap-2 overflow-x-auto py-2 px-1 scrollbar-hide">
      {history.slice().reverse().map((item, index) => (
        <div 
          key={index} 
          className={`
            flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border
            ${item.multiplier < 2 
                ? (isDarkMode ? 'bg-zinc-800 text-blue-400 border-zinc-700' : 'bg-slate-800 text-blue-400 border-slate-700') 
                : item.multiplier < 10 
                    ? 'bg-purple-900/30 text-purple-400 border-purple-800' 
                    : 'bg-pink-900/30 text-pink-400 border-pink-800'}
          `}
        >
          {item.multiplier.toFixed(2)}x
        </div>
      ))}
    </div>
  );
};

export default History;