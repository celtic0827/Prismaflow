
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Sliders, Edit3, Copy, Check, X as XIcon, CheckSquare, Square, Sparkles, Wand2 } from './Icons';
import { generateCreativeOptions } from '../services/ai';

interface RandomizerEditorProps {
  options: string[];
  disabledIndices?: number[];
  onSave: (newOptions: string[], newDisabledIndices: number[]) => void;
}

interface EditorItem {
    text: string;
    enabled: boolean;
}

export const RandomizerEditor: React.FC<RandomizerEditorProps> = ({ options, disabledIndices = [], onSave }) => {
  // Initialize state merging options and disabled indices
  const [items, setItems] = useState<EditorItem[]>(() => {
      return options.map((opt, idx) => ({
          text: opt,
          enabled: !disabledIndices.includes(idx)
      }));
  });

  const [newItem, setNewItem] = useState('');
  
  // Inline Editing State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // AI State
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (editingIndex !== null && editInputRef.current) {
        editInputRef.current.focus();
    }
  }, [editingIndex]);

  // Helper to trigger save to parent
  const triggerSave = (currentItems: EditorItem[]) => {
      const newOptions = currentItems.map(i => i.text);
      const newDisabled = currentItems
          .map((item, idx) => item.enabled ? -1 : idx)
          .filter(idx => idx !== -1);
      onSave(newOptions, newDisabled);
  };

  const handleAdd = () => {
    if (newItem.trim()) {
      const updated = [...items, { text: newItem.trim(), enabled: true }];
      setItems(updated);
      setNewItem('');
      triggerSave(updated);
    }
  };

  const handleAiGenerate = async () => {
      if (!aiPrompt.trim()) return;
      
      // Check and request API Key if needed
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        const aistudio = (window as any).aistudio;
        try {
            const hasKey = await aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await aistudio.openSelectKey();
            }
        } catch (e) {
            console.error("API Key selection error:", e);
        }
      }
      
      setIsAiLoading(true);
      setAiError(null);
      
      const currentContext = items.map(i => i.text);
      const result = await generateCreativeOptions(aiPrompt, aiCount, currentContext);
      
      if (result.error) {
          setAiError(result.error);
          // If the error suggests key issues, offer a retry link
          if (result.error.includes("API Key") && typeof window !== 'undefined' && (window as any).aistudio) {
               // Optional: Trigger select again on next click or provide UI hint
          }
      } else if (result.options.length > 0) {
          const newItems = result.options.map(opt => ({ text: opt, enabled: true }));
          const updated = [...items, ...newItems];
          setItems(updated);
          triggerSave(updated);
          setAiPrompt(''); // Clear prompt on success
      }
      
      setIsAiLoading(false);
  };

  const handleRemove = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    triggerSave(updated);
  };

  const handleDuplicate = (index: number) => {
      const itemToCopy = items[index];
      // Clone the item state
      const updated = [...items];
      updated.splice(index + 1, 0, { ...itemToCopy });
      setItems(updated);
      triggerSave(updated);
  };

  const toggleEnabled = (index: number) => {
      const updated = items.map((item, i) => 
          i === index ? { ...item, enabled: !item.enabled } : item
      );
      setItems(updated);
      triggerSave(updated);
  };

  const toggleAll = () => {
      // If all are enabled, disable all. Otherwise, enable all.
      const allEnabled = items.every(i => i.enabled);
      const updated = items.map(i => ({ ...i, enabled: !allEnabled }));
      setItems(updated);
      triggerSave(updated);
  };

  const startEditing = (index: number) => {
      setEditingIndex(index);
      setEditValue(items[index].text);
  };

  const cancelEditing = () => {
      setEditingIndex(null);
      setEditValue('');
  };

  const saveEditing = (index: number) => {
      if (editValue.trim()) {
          const updated = [...items];
          updated[index] = { ...updated[index], text: editValue.trim() };
          setItems(updated);
          triggerSave(updated);
      }
      setEditingIndex(null);
      setEditValue('');
  };

  const isAllEnabled = items.length > 0 && items.every(i => i.enabled);

  return (
    <div className="space-y-4 font-sans">
      <div className="bg-brand-900/20 p-3 rounded border border-brand-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Sliders className="text-brand-400" size={18} />
            <p className="text-xs text-brand-200">
            Manage variations. Uncheck to disable.
            </p>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsAiMode(!isAiMode)} 
                className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${isAiMode ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/50' : 'text-canvas-400 hover:text-purple-300 hover:bg-white/5'}`}
                title="AI Magic Expand"
            >
                <Sparkles size={14} className={isAiMode ? "text-purple-400" : ""} />
                Magic
            </button>
            {items.length > 0 && (
                <button 
                    onClick={toggleAll} 
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-canvas-400 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors"
                >
                    {isAllEnabled ? <CheckSquare size={14} className="text-brand-400"/> : <Square size={14}/>}
                    {isAllEnabled ? 'All On' : 'Toggle'}
                </button>
            )}
        </div>
      </div>

      {/* AI Expansion Area */}
      {isAiMode && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <div className="bg-purple-900/10 border border-purple-500/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                    <Wand2 size={14} className="text-purple-400" />
                    <span className="text-xs font-bold text-purple-200 uppercase tracking-wider">Magic Expand</span>
                </div>
                <div className="flex gap-2">
                    <div className="relative w-16 shrink-0" title="Number of options to generate">
                        <input 
                            type="number"
                            min="1"
                            max="20"
                            value={aiCount}
                            onChange={(e) => setAiCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                            className="w-full bg-canvas-950 border border-purple-500/30 focus:border-purple-500 rounded pl-8 pr-1 py-2 text-sm text-white focus:outline-none"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] text-purple-400/50 font-bold pointer-events-none">QTY</span>
                    </div>
                    <input 
                        type="text" 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                        placeholder="e.g. 'sci-fi metals', 'moody colors'"
                        className="flex-1 bg-canvas-950 border border-purple-500/30 focus:border-purple-500 rounded px-3 py-2 text-sm text-white placeholder:text-purple-300/30 focus:outline-none"
                        autoFocus
                    />
                    <button 
                        onClick={handleAiGenerate}
                        disabled={isAiLoading || !aiPrompt.trim()}
                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded font-bold text-xs transition-colors flex items-center gap-2 min-w-[80px] justify-center"
                    >
                        {isAiLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Generate'}
                    </button>
                </div>
                {aiError && (
                    <p className="text-[10px] text-red-400 px-1">{aiError}</p>
                )}
                <p className="text-[10px] text-purple-300/50 px-1 italic">
                    Tip: Describe what you want, and AI will generate exactly {aiCount} options.
                </p>
                {aiError && aiError.includes("API Key") && (
                     <button 
                        onClick={() => typeof window !== 'undefined' && (window as any).aistudio?.openSelectKey()} 
                        className="text-[10px] text-brand-400 underline hover:text-brand-300 block mt-1"
                     >
                        Configure API Key
                     </button>
                )}
            </div>
          </div>
      )}

      {/* Manual Input */}
      {!isAiMode && (
        <div className="flex gap-2">
            <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add option manually..."
            className="flex-1 bg-canvas-950 border border-canvas-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors placeholder:text-canvas-600"
            autoFocus={editingIndex === null}
            />
            <button
            onClick={handleAdd}
            disabled={!newItem.trim()}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded transition-all"
            >
            <Plus size={18} />
            </button>
        </div>
      )}

      {/* List */}
      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {items.length === 0 && (
          <div className="text-center py-6 text-canvas-600 text-xs italic border border-dashed border-canvas-800 rounded">
            No options defined. Use Magic Expand or add manually.
          </div>
        )}
        {items.map((item, idx) => (
          <div 
            key={idx} 
            className={`group flex items-center justify-between bg-canvas-900 border border-canvas-800 rounded pl-2 pr-3 py-2 transition-all ${editingIndex === idx ? 'border-brand-500 ring-1 ring-brand-500/50' : 'hover:border-canvas-600'} ${!item.enabled ? 'opacity-60' : ''}`}
          >
            {editingIndex === idx ? (
                <div className="flex items-center gap-2 w-full">
                    <input 
                        ref={editInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditing(idx);
                            if (e.key === 'Escape') cancelEditing();
                        }}
                        className="flex-1 bg-canvas-950 text-sm text-white px-1 py-0.5 rounded focus:outline-none"
                    />
                    <button onClick={() => saveEditing(idx)} className="text-emerald-400 hover:text-emerald-300 p-1"><Check size={14}/></button>
                    <button onClick={cancelEditing} className="text-red-400 hover:text-red-300 p-1"><XIcon size={14}/></button>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button 
                            onClick={() => toggleEnabled(idx)}
                            className={`shrink-0 ${item.enabled ? 'text-brand-400 hover:text-brand-300' : 'text-canvas-600 hover:text-canvas-400'}`}
                            title={item.enabled ? "Disable Item" : "Enable Item"}
                        >
                            {item.enabled ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                        <span className={`text-sm font-mono break-all cursor-pointer ${item.enabled ? 'text-canvas-200' : 'text-canvas-500 line-through decoration-canvas-700'}`} onClick={() => startEditing(idx)}>
                            {item.text}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                         <button
                            onClick={() => startEditing(idx)}
                            className="text-canvas-500 hover:text-brand-400 p-1.5 hover:bg-canvas-800 rounded"
                            title="Edit Item"
                        >
                            <Edit3 size={12} />
                        </button>
                        <button
                            onClick={() => handleDuplicate(idx)}
                            className="text-canvas-500 hover:text-white p-1.5 hover:bg-canvas-800 rounded"
                            title="Duplicate Item"
                        >
                            <Copy size={12} />
                        </button>
                        <button
                            onClick={() => handleRemove(idx)}
                            className="text-canvas-500 hover:text-red-400 p-1.5 hover:bg-canvas-800 rounded"
                            title="Remove Item"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
