
import { v4 as uuidv4 } from 'uuid';
import { Segment, SectionGroup } from './types';

// --- Text & Clipboard ---

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    try {
      // Fallback for older browsers or restricted contexts
      const textArea = document.createElement("textarea");
      textArea.value = text;
      
      // Ensure it's not visible but part of DOM
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (fallbackErr) {
      console.error('Copy failed', fallbackErr);
      return false;
    }
  }
};

export const getRandom = (arr: string[]) => {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
};

// --- Segment Grouping ---

export const groupSegments = (segments: Segment[]): SectionGroup[] => {
  const groups: SectionGroup[] = [];
  let currentGroup: SectionGroup = { contentSegments: [] };

  segments.forEach(seg => {
    if (seg.type === 'label') {
      // Push previous group if it has content or a label
      if (currentGroup.labelSegment || currentGroup.contentSegments.length > 0) {
        groups.push(currentGroup);
      }
      // Start new group
      currentGroup = { labelSegment: seg, contentSegments: [] };
    } else {
      currentGroup.contentSegments.push(seg);
    }
  });

  // Push final group
  if (currentGroup.labelSegment || currentGroup.contentSegments.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
};

// --- Normalization Logic ---

// Ensures Text segments always surround Blocks (Labels/Randoms) to prevent cursor trapping.
// IMPORTANT: Must ALWAYS clone objects to prevent state mutation affecting Undo history.
export const normalizeSegments = (segments: Segment[]): Segment[] => {
  if (!segments || segments.length === 0) {
    return [{ id: uuidv4(), type: 'text', content: '' }];
  }

  const normalized: Segment[] = [];
  
  // Ensure start is text
  if (segments[0].type !== 'text') {
    normalized.push({ id: uuidv4(), type: 'text', content: '' });
  }

  for (let i = 0; i < segments.length; i++) {
    // CLONE the segment to ensure immutability
    const current = { ...segments[i] };
    
    // If we have two text segments adjacent, merge them
    if (normalized.length > 0 && 
        normalized[normalized.length - 1].type === 'text' && 
        current.type === 'text') {
        const prev = normalized[normalized.length - 1];
        
        // FIX: Do not merge if the previous segment ends with a newline OR if current starts with newline.
        const prevText = prev.content as string;
        const currText = current.content as string;

        if (!prevText.endsWith('\n') && !currText.startsWith('\n')) {
            // Mutating 'prev' is safe here because 'prev' is already a clone created in this loop
            prev.content = prevText + currText;
            continue;
        }
    }

    normalized.push(current);

    // If current is Block, ensure next is Text.
    const isCurrentBlock = current.type !== 'text';
    const next = segments[i + 1];
    const isNextBlock = !next || next.type !== 'text';

    if (isCurrentBlock && isNextBlock) {
      normalized.push({ id: uuidv4(), type: 'text', content: '' });
    }
  }

  // Double check last is text
  if (normalized.length === 0 || normalized[normalized.length - 1].type !== 'text') {
      normalized.push({ id: uuidv4(), type: 'text', content: '' });
  } else {
      // FIX: If the very last text segment ends with a newline, append a new empty segment.
      const last = normalized[normalized.length - 1];
      if (last.type === 'text' && (last.content as string).endsWith('\n')) {
          normalized.push({ id: uuidv4(), type: 'text', content: '' });
      }
  }

  return normalized;
};

// --- DOM Calculations ---

export const findClickedSegment = (
    e: React.MouseEvent, 
    container: HTMLElement
): { span: HTMLElement, offset: number } | null => {
    
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) return null;
    if ((e.target as HTMLElement).closest('[contenteditable="false"]')) return null;

    const currentSel = window.getSelection();
    if (currentSel && !currentSel.isCollapsed && currentSel.toString().length > 0) {
        return null;
    }

    const clickY = e.clientY;
    const spans = Array.from(container.querySelectorAll('span[data-segment-id]'));
    
    // Helper to find potential targets within a vertical tolerance
    const getCandidates = (tolerance: number) => {
        const found: { rect: DOMRect, span: HTMLElement }[] = [];
        spans.forEach(span => {
            const rects = (span as HTMLElement).getClientRects();
            for (let i = 0; i < rects.length; i++) {
                const r = rects[i];
                if (clickY >= r.top - tolerance && clickY <= r.bottom + tolerance) {
                    found.push({ rect: r, span: span as HTMLElement });
                }
            }
        });
        return found;
    };

    let candidates = getCandidates(0);
    if (candidates.length === 0) {
        candidates = getCandidates(6); // 6px tolerance
    }

    if (candidates.length > 0) {
        // Sort by visual order (rightmost first to catch clicks at end of lines)
        candidates.sort((a, b) => b.rect.right - a.rect.right);
        const rightMost = candidates[0];

        // Case 1: Clicked to the right of the last element on line
        if (e.clientX > rightMost.rect.right) {
             const span = rightMost.span;
             const text = span.textContent || '';
             let offset = text.length;
             // If ends with newline, place cursor before it
             if (text.endsWith('\n') && offset > 0) {
                 offset -= 1;
             }
             return { span, offset };
        }

        // Case 2: Clicked inside/between text (Standard browser behavior check)
        // We defer to native behavior mostly, but fallback to calculation if needed
        if ((document as any).caretRangeFromPoint) {
            const range = (document as any).caretRangeFromPoint(e.clientX, clickY);
            if (range) {
                // If browser thinks we clicked the container DIV directly
                if (range.startContainer === container || container.contains(range.startContainer) && range.startContainer.nodeName === 'DIV') {
                     const span = rightMost.span;
                     const text = span.textContent || '';
                     let offset = text.length;
                     if (text.endsWith('\n') && offset > 0) offset -= 1;
                     return { span, offset };
                }

                // Fix: Caret lands on next line visually sometimes
                const rangeRects = range.getClientRects();
                if (rangeRects.length > 0) {
                    const caretRect = rangeRects[0];
                    if (caretRect.top > rightMost.rect.bottom - 2) {
                        // Adjust if we are accidentally on the newline char
                         if (range.startContainer.nodeType === Node.TEXT_NODE) {
                             const content = range.startContainer.textContent || '';
                             if (range.startOffset > 0 && content[range.startOffset - 1] === '\n') {
                                 // Return adjusted logic manually isn't easy here returning Range, 
                                 // so we return null to let caller use range directly or we handle range here.
                                 // For this utility, let's return null if standard behavior is "close enough", 
                                 // BUT we are using this to FORCE focus.
                             }
                         }
                    }
                }
                
                // We return null here to indicate "Use the native range we found" 
                // but since we can't return Range easily in this signature, 
                // let's handle the specific "Click on container" case above, 
                // and return null for "Let browser handle it"
                return null;
            }
        }
    }
    return null;
};
