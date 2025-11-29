
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
  Copy,
  FolderPlus,
  LABEL_ICONS
} from './Icons';

interface LabelMenuProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  labelName: string;
  currentColor: string;
  currentIcon: string;
  colors: string[];
  onRename: (newName: string) => void;
  onColorChange: (color: string) => void;
  onIconChange: (iconKey: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onCopySection: () => void;
  onSaveToLibrary: () => void;
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
  currentIcon,
  colors,
  onRename,
  onColorChange,
  onIconChange,
  onMoveUp,
  onMoveDown,
  onCopySection,
  onSaveToLibrary,
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
        const MENU_WIDTH = 320; // w-80
        const GAP = 8;
        const SCREEN_MARGIN = 16;
        
        let top = rect.top;
        let left: number;
        
        // Define vertical mode based on common mobile/tablet breakpoint (lg = 1024px)
        const isVerticalMode = window.innerWidth < 1024;

        if (isVerticalMode) {
            // Vertical Mode: Force align to right edge of screen
            left = window.innerWidth - MENU_WIDTH - SCREEN_MARGIN;
        } else {
            // Desktop Mode: Try placement to the right of the anchor
            left = rect.right + GAP;
            // If it overflows right edge, flip to left of anchor
            if (left + MENU_WIDTH > window.innerWidth) {
                left = rect.left - MENU_WIDTH - GAP;
            }
        }
        
        // Vertical positioning (Smart clamping)
        // Estimate height (w/o scroll) ~440px
        const MENU_EST_HEIGHT = 440;
        
        if (top + MENU_EST_HEIGHT > window.innerHeight) {
            top = window.innerHeight - MENU_EST_HEIGHT - SCREEN_MARGIN;
        }
        
        // Ensure strictly positive top
        top = Math.max(SCREEN_MARGIN, top);
        
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
    onRename(editValue.trim()); 
    setIsEditing(false);
  };

  if (!isOpen || !position) return null;

  return createPortal(
    <div 
      ref={menuRef}
      className="fixed z-[9999] w-80 bg-canvas-900 border border-canvas-700 rounded-xl shadow-2xl shadow-black/80 font-sans text-sm animate-in fade-in zoom-in-95 duration-100 flex flex-col"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="bg-canvas-950/80 px-4 py-2.5 border-b border-canvas-800 flex items-center justify-between rounded-t-xl shrink-0">
        <span className="text-[10px] font-bold text-brand-500 uppercase tracking-widest flex items-center gap-1.5">
            <Tag size={12}/> Section Settings
        </span>
        <button onClick={onClose} className="text-canvas-500 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"><X size={14} /></button>
      </div>

      {/* Content - No Scrolling */}
      <div className="p-3 flex flex-col gap-4">
        
        {/* Rename & Identity Block */}
        <div className="space-y-3">
            {isEditing ? (
                <div className="flex items-center gap-1">
                    <input 
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') handleSaveRename(e); }}
                        className="flex-1 bg-canvas-950 border border-brand-500/50 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        autoFocus
                        placeholder="Label Name"
                    />
                    <button onClick={handleSaveRename} className="p-2 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 rounded"><Check size={14} /></button>
                </div>
            ) : (
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
                    className="w-full flex items-center justify-between px-3 py-2 bg-canvas-800/50 hover:bg-canvas-800 text-white rounded border border-canvas-700/50 hover:border-canvas-600 transition-all group"
                >
                    <span className="font-semibold truncate pr-2">{labelName || 'Untitled Label'}</span>
                    <FileEdit size={14} className="text-canvas-500 group-hover:text-brand-400" />
                </button>
            )}

            {/* Visuals Row */}
            <div className="space-y-3">
                 {/* Icons Grid (Compact 2 rows) */}
                 <div>
                    <div className="flex items-center justify-between mb-1.5 px-1">
                        <span className="text-[10px] text-canvas-500 uppercase font-bold tracking-wider">Icon</span>
                    </div>
                    <div className="grid grid-cols-10 gap-1">
                        {Object.entries(LABEL_ICONS).map(([key, IconComponent]) => (
                            <button
                                key={key}
                                onClick={() => onIconChange(key)}
                                className={`h-7 rounded-sm flex items-center justify-center hover:bg-white/10 transition-colors ${currentIcon === key ? 'text-white bg-white/20 ring-1 ring-white/30' : 'text-canvas-500'}`}
                                title={key}
                            >
                                <IconComponent size={14} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Colors */}
                <div>
                    <div className="text-[10px] text-canvas-500 uppercase font-bold tracking-wider mb-1.5 px-1">Color</div>
                    <div className="flex gap-2">
                        {colors.map(c => (
                        <button
                            key={c}
                            onClick={() => onColorChange(c)}
                            className={`flex-1 h-5 rounded-sm border border-white/5 hover:scale-105 transition-all ${currentColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-canvas-900' : 'opacity-70 hover:opacity-100'}`}
                            style={{ backgroundColor: c }}
                        />
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="h-px bg-canvas-800 w-full" />

        {/* Management Actions (Grid) */}
        <div className="grid grid-cols-2 gap-2">
            <button onClick={(e) => { e.stopPropagation(); onSaveToLibrary(); }} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-canvas-300 hover:text-white bg-canvas-800/30 hover:bg-canvas-800 border border-transparent hover:border-canvas-600 rounded transition-all">
                <FolderPlus size={14} className="text-purple-400" /> Save Preset
            </button>
            <button onClick={(e) => { e.stopPropagation(); onCopySection(); }} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-canvas-300 hover:text-white bg-canvas-800/30 hover:bg-canvas-800 border border-transparent hover:border-canvas-600 rounded transition-all">
                <Copy size={14} className="text-sky-400" /> Copy JSON
            </button>
            
            <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-canvas-300 hover:text-white bg-canvas-800/30 hover:bg-canvas-800 border border-transparent hover:border-canvas-600 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                <ArrowUp size={14} /> Move Up
            </button>
            <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-canvas-300 hover:text-white bg-canvas-800/30 hover:bg-canvas-800 border border-transparent hover:border-canvas-600 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                <ArrowDown size={14} /> Move Down
            </button>
        </div>

        {/* Destructive Actions (Grid) */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-canvas-800">
            <button onClick={(e) => { e.stopPropagation(); onDeleteLabel(); }} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-canvas-400 hover:text-red-300 hover:bg-red-900/10 rounded transition-colors">
                <Tag size={14} /> Remove Label
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDeleteSection(); }} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-white hover:bg-red-600 rounded transition-colors shadow-sm">
                <Trash2 size={14} /> Delete All
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
