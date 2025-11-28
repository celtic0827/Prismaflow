import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Sliders, Edit3, Copy, Check, X as XIcon } from './Icons';

interface RandomizerEditorProps {
  options: string[];
  onSave: (newOptions: string[]) => void;
}

export const RandomizerEditor: React.FC<RandomizerEditorProps> = ({ options, onSave }) => {
  const [items, setItems] = useState<string[]>(options);
  const [newItem, setNewItem] = useState('');
  
  // Inline Editing State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingIndex !== null && editInputRef.current) {
        editInputRef.current.focus();
    }
  }, [editingIndex]);

  const handleAdd = () => {
    if (newItem.trim()) {
      const updated = [...items, newItem.trim()];
      setItems(updated);
      setNewItem('');
      onSave(updated);
    }
  };

  const handleRemove = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    onSave(updated);
  };

  const handleDuplicate = (index: number) => {
      const itemToCopy = items[index];
      const updated = [...items];
      updated.splice(index + 1, 0, itemToCopy);
      setItems(updated);
      onSave(updated);
  };

  const startEditing = (index: number) => {
      setEditingIndex(index);
      setEditValue(items[index]);
  };

  const cancelEditing = () => {
      setEditingIndex(null);
      setEditValue('');
  };

  const saveEditing = (index: number) => {
      if (editValue.trim()) {
          const updated = [...items];
          updated[index] = editValue.trim();
          setItems(updated);
          onSave(updated);
      }
      setEditingIndex(null);
      setEditValue('');
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="bg-brand-900/20 p-3 rounded border border-brand-500/30 flex items-center gap-3">
        <Sliders className="text-brand-400" size={18} />
        <p className="text-xs text-brand-200">
          Manage variations. Varia will randomly select one.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="New option..."
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

      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {items.length === 0 && (
          <div className="text-center py-6 text-canvas-600 text-xs italic border border-dashed border-canvas-800 rounded">
            No options defined.
          </div>
        )}
        {items.map((item, idx) => (
          <div 
            key={idx} 
            className={`group flex items-center justify-between bg-canvas-900 border border-canvas-800 rounded px-3 py-2 transition-all ${editingIndex === idx ? 'border-brand-500 ring-1 ring-brand-500/50' : 'hover:border-canvas-600'}`}
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
                    <span className="text-sm font-mono text-canvas-200 break-all mr-2">{item}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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