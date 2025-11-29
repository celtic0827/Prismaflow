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
