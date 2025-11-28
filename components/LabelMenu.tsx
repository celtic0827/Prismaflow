import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowUp, 
  ArrowDown, 
  Palette, 
  FileEdit, 
  Trash2, 
  X,
  Tag,
  Check,
  Copy
} from './Icons';

interface LabelMenuProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  labelName: string;
  currentColor: string;
  colors: string[];
  onRename: (newName: string) => void;
  onColorChange: (color: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onCopySection: () => void;
  onDeleteLabel: () => void;
  onDeleteSection: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const LabelMenu: React.FC<LabelMenuProps> = ({
  isOpen,
  onClose,
  anchorRef,
  labelName,
  currentColor,
  colors,
  onRename,
  onColorChange,
  onMoveUp,
  onMoveDown,
  onCopySection,
  onDeleteLabel,
  onDeleteSection,
  isFirst,
  isLast
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(labelName);
  const [position, setPosition] = useState<{top: number, left: number} | null>(null);

  useEffect(() => {
    if (isOpen) {
        setIsEditing(false);
        setEditValue(labelName);
    }
  }, [isOpen, labelName]);

  useLayoutEffect(() => {
    if (isOpen && anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        const MENU_WIDTH = 256;
        let top = rect.top;
        let left = rect.right + 8;
        if (left + MENU_WIDTH > window.innerWidth) left = rect.left - MENU_WIDTH - 8;
        if (top + 350 > window.innerHeight) top = Math.max(10, window.innerHeight - 360);
        setPosition({ top, left });
    }
  }, [isOpen, anchorRef]);

  useEffect(() => {
    if (isOpen) {
        const handleScroll = () => onClose();
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  const handleSaveRename = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (editValue.trim()) { onRename(editValue.trim()); setIsEditing(false); } 
    else { setIsEditing(false); setEditValue(labelName); }
  };

  if (!isOpen || !position) return null;

  return createPortal(
    <div 
      ref={menuRef}
      className="fixed z-[9999] w-64 bg-canvas-900 border border-canvas-700 rounded-lg shadow-2xl shadow-black/60 overflow-hidden font-sans text-sm animate-in fade-in zoom-in-95 duration-100"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-canvas-950 px-3 py-2 border-b border-canvas-800 flex items-center justify-between">
        <span className="text-[10px] font-bold text-brand-500 uppercase tracking-widest">Section Settings</span>
        <button onClick={onClose} className="text-canvas-500 hover:text-white"><X size={14} /></button>
      </div>

      <div className="p-1 space-y-0.5">
        {isEditing ? (
            <div className="px-2 py-2 flex items-center gap-1">
                <input 
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') handleSaveRename(e); }}
                    className="flex-1 bg-canvas-950 border border-brand-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none"
                    autoFocus
                />
                <button onClick={handleSaveRename} className="p-1 text-emerald-400 hover:bg-emerald-900/30 rounded"><Check size={14} /></button>
            </div>
        ) : (
            <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="w-full flex items-center gap-3 px-3 py-2 text-canvas-300 hover:bg-canvas-800 rounded text-left transition-colors">
              <FileEdit size={14} /> Rename
            </button>
        )}

        <div className="px-3 py-2">
          <div className="flex items-center gap-2 mb-2 text-[10px] text-canvas-500 uppercase font-bold tracking-wider">
            <Palette size={10} /> Color Tag
          </div>
          <div className="flex gap-2 flex-wrap">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => onColorChange(c)}
                className={`w-5 h-5 rounded border border-white/5 hover:scale-110 transition-transform ${currentColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-canvas-900' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="h-px bg-canvas-800 my-1" />

        <button onClick={(e) => { e.stopPropagation(); onCopySection(); }} className="w-full flex items-center gap-3 px-3 py-2 text-canvas-300 hover:bg-canvas-800 rounded text-left transition-colors">
          <Copy size={14} /> Copy Section
        </button>

        <div className="h-px bg-canvas-800 my-1" />

        <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} className="w-full flex items-center gap-3 px-3 py-2 text-canvas-300 hover:bg-canvas-800 rounded text-left disabled:opacity-30">
          <ArrowUp size={14} /> Move Up
        </button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} className="w-full flex items-center gap-3 px-3 py-2 text-canvas-300 hover:bg-canvas-800 rounded text-left disabled:opacity-30">
          <ArrowDown size={14} /> Move Down
        </button>

        <div className="h-px bg-canvas-800 my-1" />

        <button onClick={(e) => { e.stopPropagation(); onDeleteLabel(); }} className="w-full flex items-center gap-3 px-3 py-2 text-canvas-400 hover:bg-canvas-800 hover:text-red-400 rounded text-left">
          <Tag size={14} /> Remove Label
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDeleteSection(); }} className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-900/20 rounded text-left">
          <Trash2 size={14} /> Delete Section
        </button>
      </div>
    </div>,
    document.body
  );
};