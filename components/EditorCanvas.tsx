
import React from 'react';
import { Edit3, Type, Trash2, Tag, LABEL_ICONS } from './Icons';
import { Segment, SegmentType } from '../types';
import { LabelMenu } from './LabelMenu';
import { EditableSpan } from './EditableSpan';
import { groupSegments } from '../utils';

const LABEL_COLORS = [
  '#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#eab308'
];
const DEFAULT_TEXT_COLOR = '#94a3b8';

interface EditorCanvasProps {
  segments: Segment[];
  containerRef: React.RefObject<HTMLDivElement>;
  labelRefs: React.MutableRefObject<{[key: string]: HTMLElement | null}>;
  activeLabelMenuId: string | null;
  selectedOptionId: string | null;
  
  // Event Handlers
  onContainerClick: (e: React.MouseEvent) => void;
  onNativeCopy: () => void;
  onNativePaste: (e: React.ClipboardEvent) => void;
  
  // State Setters
  setActiveLabelMenuId: (id: string | null) => void;
  setSelectedOptionId: (id: string | null) => void;
  setEditingSegmentId: (id: string | null) => void;

  // Segment Actions
  onUpdateLabel: (id: string, updates: any) => void;
  onMoveSection: (id: string, direction: 'up' | 'down') => void;
  onCopySection: (id: string) => void;
  onSaveSectionToLibrary: () => void;
  onDeleteLabel: (id: string) => void;
  onDeleteSection: (id: string) => void;
  
  onTextChange: (id: string, newText: string) => void;
  onBlurSnapshot: () => void;
  onSplit: (id: string, index: number) => void;
  onDeleteBack: (id: string) => void;
  
  onFlattenOption: (id: string) => void;
  onDeleteSegment: (id: string) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  segments,
  containerRef,
  labelRefs,
  activeLabelMenuId,
  selectedOptionId,
  onContainerClick,
  onNativeCopy,
  onNativePaste,
  setActiveLabelMenuId,
  setSelectedOptionId,
  setEditingSegmentId,
  onUpdateLabel,
  onMoveSection,
  onCopySection,
  onSaveSectionToLibrary,
  onDeleteLabel,
  onDeleteSection,
  onTextChange,
  onBlurSnapshot,
  onSplit,
  onDeleteBack,
  onFlattenOption,
  onDeleteSegment
}) => {
  const groupsForCalc = groupSegments(segments);
  let currentHighlightColor = DEFAULT_TEXT_COLOR;

  return (
    <div 
        ref={containerRef}
        onClick={onContainerClick}
        onCopy={onNativeCopy}
        onPaste={onNativePaste}
        className="h-[400px] lg:h-auto lg:flex-1 bg-canvas-900/50 border border-canvas-800 rounded-lg p-6 overflow-y-auto custom-scrollbar shadow-inner relative z-10 cursor-text text-left leading-loose font-mono text-sm md:text-base"
    >
        {segments.map((seg, idx) => {
            if (seg.type === 'label') {
                currentHighlightColor = seg.color || DEFAULT_TEXT_COLOR;
                const groupIndex = groupsForCalc.findIndex(g => g.labelSegment?.id === seg.id);
                const isMenuOpen = activeLabelMenuId === seg.id;
                
                // Icon Resolution
                const IconComponent = seg.icon && LABEL_ICONS[seg.icon] ? LABEL_ICONS[seg.icon] : Tag;

                return (
                <span 
                    key={seg.id}
                    data-segment-id={seg.id}
                    ref={(el) => { labelRefs.current[seg.id] = el; }}
                    contentEditable={false}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider select-none mx-1 align-baseline cursor-pointer hover:ring-1 hover:ring-white/20 relative ${isMenuOpen ? 'z-50' : 'z-auto'}`}
                    style={{ backgroundColor: `${seg.color}20`, color: seg.color || DEFAULT_TEXT_COLOR, border: `1px solid ${seg.color}40` }} 
                    onClick={(e) => { e.stopPropagation(); setActiveLabelMenuId(activeLabelMenuId === seg.id ? null : seg.id); }}
                    title="Click to edit section settings"
                >
                    <IconComponent size={12} style={{ color: seg.color }} />
                    {seg.content && <span className="truncate max-w-[120px] md:max-w-[300px]">{seg.content}</span>}
                    <LabelMenu 
                        isOpen={isMenuOpen}
                        onClose={() => setActiveLabelMenuId(null)}
                        anchorRef={{ current: labelRefs.current[seg.id] || null }}
                        labelName={seg.content as string}
                        currentColor={seg.color || DEFAULT_TEXT_COLOR}
                        currentIcon={seg.icon || 'Tag'}
                        colors={LABEL_COLORS}
                        onRename={(name) => onUpdateLabel(seg.id, { content: name })}
                        onColorChange={(color) => onUpdateLabel(seg.id, { color: color })}
                        onIconChange={(iconKey) => onUpdateLabel(seg.id, { icon: iconKey })}
                        onMoveUp={() => onMoveSection(seg.id, 'up')}
                        onMoveDown={() => onMoveSection(seg.id, 'down')}
                        onCopySection={() => onCopySection(seg.id)}
                        onSaveToLibrary={onSaveSectionToLibrary}
                        onDeleteLabel={() => onDeleteLabel(seg.id)}
                        onDeleteSection={() => onDeleteSection(seg.id)}
                        isFirst={groupIndex <= 0} 
                        isLast={groupIndex === groupsForCalc.length - 1}
                    />
                </span>
                );
            } else if (seg.type === 'text') {
                const content = seg.content as string;
                if (content.startsWith('\n')) currentHighlightColor = DEFAULT_TEXT_COLOR;
                return (
                <EditableSpan
                    key={seg.id}
                    id={seg.id}
                    value={content}
                    color={currentHighlightColor} 
                    onChange={onTextChange}
                    onBlur={onBlurSnapshot}
                    onSplit={(idx) => onSplit(seg.id, idx)}
                    onDeleteBack={onDeleteBack}
                />
                );
            } else {
                const isSelected = selectedOptionId === seg.id;
                const allDisabled = Array.isArray(seg.content) && seg.content.length > 0 && seg.content.every((_, i) => seg.disabledIndices?.includes(i));
                return (
                <span
                    key={seg.id}
                    data-segment-id={seg.id}
                    contentEditable={false}
                    onClick={(e) => { e.stopPropagation(); setSelectedOptionId(seg.id); }}
                    className={`inline-flex items-center align-baseline mx-1 my-0.5 rounded border select-none group/opt relative shadow-sm transition-all hover:bg-canvas-800/80
                        ${isSelected ? 'border-brand-500 bg-brand-900/20 ring-1 ring-brand-500/50' : 
                          allDisabled ? 'border-canvas-800 bg-canvas-900' :
                          'border-canvas-700 bg-canvas-800 hover:border-brand-500/50 hover:shadow-brand-500/10'}
                    `}
                >
                    {/* Value Display */}
                    <span 
                        className={`px-2 py-0.5 cursor-pointer hover:text-brand-100 transition-colors max-w-[100px] lg:max-w-[200px] truncate font-mono text-sm ${allDisabled ? 'text-canvas-600' : ''}`}
                        title={`Options: ${(seg.content as string[]).join(', ')}`}
                    >
                        {seg.activeValue || '(empty)'}
                    </span>
                    
                    {/* Actions - Floating Bubble (Absolute Positioning) */}
                    <span className="absolute left-1/2 -translate-x-1/2 bottom-full pb-1.5 z-50 hidden group-hover/opt:flex justify-center animate-in fade-in zoom-in-95 duration-100 pointer-events-none group-hover/opt:pointer-events-auto">
                        <span className="bg-canvas-900 border border-canvas-700 rounded shadow-xl flex items-center gap-1 px-2 py-1 min-w-[80px] justify-center pointer-events-auto">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setEditingSegmentId(seg.id); }}
                                className="p-1 hover:bg-brand-600 hover:text-white text-canvas-400 transition-colors rounded"
                                title="Edit Options"
                            >
                                <Edit3 size={14} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onFlattenOption(seg.id); }}
                                className="p-1 hover:bg-purple-600 hover:text-white text-canvas-400 transition-colors rounded"
                                title="Convert to Text"
                            >
                                <Type size={14} />
                            </button>
                             <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteSegment(seg.id); }}
                                className="p-1 hover:bg-red-500 hover:text-white text-canvas-400 transition-colors rounded"
                                title="Delete Block"
                            >
                                <Trash2 size={14} />
                            </button>
                        </span>
                    </span>
                </span>
                );
            }
        })}
    </div>
  );
};
