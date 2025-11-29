import React, { useRef, useLayoutEffect } from 'react';

const DEFAULT_TEXT_COLOR = '#94a3b8'; // Slate 400

interface EditableSpanProps {
  id: string;
  value: string;
  color?: string;
  onChange: (id: string, text: string) => void;
  onBlur: () => void;
  onSplit: (cursorIndex: number) => void;
  onDeleteBack: (id: string) => void;
}

// Inline editable span
export const EditableSpan: React.FC<EditableSpanProps> = ({ 
  id, 
  value, 
  color,
  onChange, 
  onBlur,
  onSplit,
  onDeleteBack
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const isComposing = useRef(false);
  const lastCursorPos = useRef<number | null>(null);
  
  useLayoutEffect(() => {
    if (!spanRef.current) return;
    
    if (spanRef.current.textContent !== value) {
       spanRef.current.textContent = value;
    }

    // Conservative Cursor Restoration
    if (document.activeElement === spanRef.current && !isComposing.current) {
        // Only restore if we have a tracked position AND the current selection is completely invalid/missing
        // We trust the browser's cursor placement for normal typing/clicking
        if (lastCursorPos.current !== null) {
             const sel = window.getSelection();
             if (!sel || sel.rangeCount === 0 || 
                 (sel.anchorNode !== spanRef.current && !spanRef.current.contains(sel.anchorNode))) {
                try {
                    const range = document.createRange();
                    const textNode = spanRef.current.firstChild;
                    const len = textNode?.textContent?.length || 0;
                    const safeOffset = Math.min(lastCursorPos.current, len);
                    
                    if (textNode) {
                        range.setStart(textNode, safeOffset);
                    } else {
                        range.setStart(spanRef.current, 0);
                    }
                    range.collapse(true);
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                } catch (e) { }
             }
        }
    }
  }, [value]); 

  const handleInput = (e: React.FormEvent<HTMLSpanElement>) => {
    if (isComposing.current) return;
    
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        lastCursorPos.current = sel.getRangeAt(0).startOffset;
    }

    const text = e.currentTarget.textContent || '';
    onChange(id, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isComposing.current || e.nativeEvent.isComposing) return;

    // Track cursor on navigation keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        requestAnimationFrame(() => {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) lastCursorPos.current = sel.getRangeAt(0).startOffset;
        });
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && spanRef.current) {
        const range = sel.getRangeAt(0);
        let offset = range.startOffset;
        // Handle container-based selection
        if (range.startContainer === spanRef.current) {
            offset = (range.startOffset === 0) ? 0 : (spanRef.current.textContent?.length || 0);
        }
        const len = spanRef.current.textContent?.length || 0;
        offset = Math.min(offset, len);
        
        // When pressing enter, we want cursor to land on new line (index + 1)
        lastCursorPos.current = offset + 1;
        onSplit(offset);
      }
    } else if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (range.collapsed && range.startOffset === 0) {
          e.preventDefault();
          onDeleteBack(id);
        }
      }
    }
  };

  const handleMouseUp = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
          lastCursorPos.current = sel.getRangeAt(0).startOffset;
      }
  }

  // FIX: Only strictly empty segments need the placeholder block.
  // Segments with '\n' should remain inline so they properly break the line.
  const isEmpty = !value || value.length === 0;
  const needsPlaceholder = isEmpty;
  
  return (
    <span
      ref={spanRef}
      data-segment-id={id}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onMouseUp={handleMouseUp}
      onBlur={onBlur}
      onCompositionStart={() => { isComposing.current = true; }}
      onCompositionEnd={(e) => { 
          isComposing.current = false; 
          handleInput(e as unknown as React.FormEvent<HTMLSpanElement>); 
      }}
      className="outline-none font-mono text-sm md:text-base break-words transition-colors rounded-sm align-baseline focus:bg-white/5"
      spellCheck={false}
      style={{ 
        whiteSpace: 'pre-wrap', // Strictly enforce pre-wrap to handle \n correctly
        display: needsPlaceholder ? 'inline-block' : 'inline', 
        minWidth: needsPlaceholder ? '2px' : undefined, // Visible width for empty placeholder
        minHeight: needsPlaceholder ? '1.5em' : undefined, // Ensure empty lines have height
        color: color || DEFAULT_TEXT_COLOR 
      }} 
    />
  );
};
