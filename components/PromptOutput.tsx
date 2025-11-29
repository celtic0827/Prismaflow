import React from 'react';
import { Terminal, RefreshCw, Copy, Check } from './Icons';

interface PromptOutputProps {
  promptText: string;
  isRerolling: boolean;
  copied: boolean;
  onReroll: () => void;
  onCopy: () => void;
}

export const PromptOutput: React.FC<PromptOutputProps> = ({
  promptText,
  isRerolling,
  copied,
  onReroll,
  onCopy
}) => {
  return (
    <div className="bg-canvas-950 border border-canvas-800 rounded-lg flex flex-col shrink-0 min-h-[140px]" onClick={e => e.stopPropagation()}>
        {/* Generated Prompt Header */}
        <div className="bg-canvas-900/50 px-3 py-2 border-b border-canvas-800 flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs text-canvas-500 font-bold uppercase tracking-widest"><Terminal size={14}/> Generated Prompt</div>
            <div className="flex items-center gap-2">
                 <button onClick={onReroll} className={`p-1.5 rounded bg-brand-600 hover:bg-brand-500 text-white shadow-lg ${isRerolling ? 'animate-spin':''}`}><RefreshCw size={16}/></button>
                 <button onClick={onCopy} className="p-1.5 rounded bg-canvas-800 hover:bg-canvas-700 text-canvas-400 hover:text-white">{copied ? <Check size={16}/> : <Copy size={16}/>}</button>
            </div>
        </div>
        <div className="p-4 overflow-y-auto custom-scrollbar max-h-[100px] flex-1">
             <p className={`font-mono text-sm text-canvas-300 leading-relaxed ${isRerolling?'opacity-50 blur-[1px]':'opacity-100'}`}>{promptText}</p>
        </div>
    </div>
  );
};
