import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Sparkles, 
  Layers, 
  RefreshCw, 
  Copy, 
  Zap, 
  Trash2,
  Tag,
  Download,
  Upload,
  FilePlus,
  Save,
  Book,
  Clock,
  X,
  Undo2,
  Check,
  ClipboardPaste,
  Command,
  Sliders,
  Terminal,
  Edit3
} from './components/Icons';
import { Segment, SelectionState, groupSegments, SectionGroup, SavedProject, SegmentType } from './types';
import { Modal } from './components/Modal';
import { RandomizerEditor } from './components/RandomizerEditor';
import { LabelMenu } from './components/LabelMenu';

// Helper to get random item from array
const getRandom = (arr: string[]) => {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
};

// Custom MIME type for internal copy/paste
const ALCHEMIST_MIME_TYPE = 'application/x-prismaflow-fragment';

// Colors for labels - Modern Code Editor Palette (Neon/Vibrant)
const LABEL_COLORS = [
  '#38bdf8', // Sky 400
  '#4ade80', // Green 400
  '#fb923c', // Orange 400
  '#c084fc', // Purple 400
  '#f472b6', // Pink 400
  '#2dd4bf', // Teal 400
  '#facc15', // Yellow 400
];

const DEFAULT_TEXT_COLOR = '#94a3b8'; // Slate 400 (Muted for default text)

// Updated Storage Keys
const STORAGE_KEY = 'prismaflow_current_workspace';
const PROJECTS_KEY = 'prismaflow_saved_projects';

// --- Normalization Helper ---
// Ensures Text segments always surround Blocks (Labels/Randoms) to prevent cursor trapping.
// IMPORTANT: Must ALWAYS clone objects to prevent state mutation affecting Undo history.
const normalizeSegments = (segments: Segment[]): Segment[] => {
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
        // This ensures that 'abc\n' and 'next' remain separate segments, 
        // giving 'next' its own DOM element on the new line for stable cursor placement.
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
      // This ensures the new line created by that newline is clickable/accessible.
      const last = normalized[normalized.length - 1];
      if (last.type === 'text' && (last.content as string).endsWith('\n')) {
          normalized.push({ id: uuidv4(), type: 'text', content: '' });
      }
  }

  return normalized;
};


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
const EditableSpan: React.FC<EditableSpanProps> = ({ 
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
        minWidth: needsPlaceholder ? '4px' : undefined, // Visible width for empty placeholder
        minHeight: needsPlaceholder ? '1.5em' : undefined, // Ensure empty lines have height
        color: color || DEFAULT_TEXT_COLOR 
      }} 
    />
  );
};

export default function App() {
  // --- Initialization ---
  const initialSegments: Segment[] = [
    // Removed "Create an " text to allow Label to be first visually (normalizeSegments will add an empty text segment)
    { id: uuidv4(), type: 'label', content: 'Composition', color: LABEL_COLORS[0] }, 
    { id: uuidv4(), type: 'text', content: 'editorial fashion photography, wide shot, three models standing in a ' },
    { id: uuidv4(), type: 'random', content: ['minimalist concrete hall', 'neon-lit subway', 'industrial warehouse'], activeValue: 'minimalist concrete hall' },
    { id: uuidv4(), type: 'text', content: '. High contrast lighting. \n' },
    
    { id: uuidv4(), type: 'label', content: 'Model_Left', color: LABEL_COLORS[1] }, 
    { id: uuidv4(), type: 'text', content: 'Left figure wearing ' },
    { id: uuidv4(), type: 'random', content: ['an oversized trench coat', 'a vinyl jacket', 'a denim blazer'], activeValue: 'an oversized trench coat' },
    { id: uuidv4(), type: 'text', content: ' and ' },
    { id: uuidv4(), type: 'random', content: ['baggy cargo trousers', 'wide-leg pants', 'distressed jeans'], activeValue: 'baggy cargo trousers' },
    { id: uuidv4(), type: 'text', content: '. \n' },

    { id: uuidv4(), type: 'label', content: 'Model_Center', color: LABEL_COLORS[3] },
    { id: uuidv4(), type: 'text', content: 'Center figure in ' },
    { id: uuidv4(), type: 'random', content: ['a metallic silver bodysuit', 'a matte black vest', 'an asymmetric dress'], activeValue: 'a metallic silver bodysuit' },
    { id: uuidv4(), type: 'text', content: ' with ' },
    { id: uuidv4(), type: 'random', content: ['geometric sunglasses', 'a chrome face mask', 'silver chains'], activeValue: 'geometric sunglasses' },
    { id: uuidv4(), type: 'text', content: '. \n' },

    { id: uuidv4(), type: 'label', content: 'Model_Right', color: LABEL_COLORS[2] },
    { id: uuidv4(), type: 'text', content: 'Right figure dressed in ' },
    { id: uuidv4(), type: 'random', content: ['a silk shirt', 'a puffer vest', 'a mesh turtleneck'], activeValue: 'a silk shirt' },
    { id: uuidv4(), type: 'text', content: ' and ' },
    { id: uuidv4(), type: 'random', content: ['combat boots', 'chunky sneakers', 'tabi boots'], activeValue: 'combat boots' },
    { id: uuidv4(), type: 'text', content: '.' }
  ];

  const loadInitialState = (): { segments: Segment[], name: string, projectId: string | null } => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      let loadedSegments = initialSegments;
      let loadedName = 'Urban Editorial Config';
      let loadedId = null;

      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            loadedSegments = parsed;
        } else {
            loadedSegments = parsed.segments || initialSegments;
            loadedName = parsed.name || 'Untitled';
            loadedId = parsed.projectId || null;
        }
      } else {
         const oldVaria = localStorage.getItem('varia_current_workspace');
         const oldAlchemist = localStorage.getItem('alchemist_current_workspace');
         const legacy = oldVaria || oldAlchemist;
         if (legacy) {
             const p = JSON.parse(legacy);
             loadedSegments = p.segments || (Array.isArray(p) ? p : initialSegments); 
             loadedName = p.name || 'Migrated Project'; 
             loadedId = p.projectId || null;
         }
      }
      return { segments: normalizeSegments(loadedSegments), name: loadedName, projectId: loadedId };
    } catch (e) {
      return { segments: normalizeSegments(initialSegments), name: 'Urban Editorial Config', projectId: null };
    }
  };

  const loadSavedProjects = (): SavedProject[] => {
    try {
      const saved = localStorage.getItem(PROJECTS_KEY);
      if (saved) return JSON.parse(saved);
      const oldVaria = localStorage.getItem('varia_saved_projects');
      if (oldVaria) return JSON.parse(oldVaria);
      const oldAlchemist = localStorage.getItem('alchemist_saved_projects');
      return oldAlchemist ? JSON.parse(oldAlchemist) : [];
    } catch (e) { return []; }
  };

  const initialState = loadInitialState();

  // --- State ---
  const [segments, setSegments] = useState<Segment[]>(initialState.segments);
  const [promptName, setPromptName] = useState(initialState.name);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(initialState.projectId);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(loadSavedProjects);
  const [notification, setNotification] = useState<string | null>(null);

  const [history, setHistory] = useState<Segment[][]>(() => [initialState.segments]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [selection, setSelection] = useState<SelectionState>({ startId: null, endId: null, startOffset: 0, endOffset: 0, text: '' });
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [activeLabelMenuId, setActiveLabelMenuId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{id: string, offset: number} | null>(null);
  const [isRerolling, setIsRerolling] = useState(false);
  const [copied, setCopied] = useState(false);

  const labelRefs = useRef<{[key: string]: HTMLElement | null}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // --- Actions ---
  
  const updateSegments = (newSegments: Segment[], shouldSaveSnapshot = true) => {
      // Must clone and normalize to ensure clean state history
      const normalized = normalizeSegments(newSegments);
      if (shouldSaveSnapshot) {
          saveSnapshot(normalized);
      }
      setSegments(normalized);
  };

  const saveSnapshot = (newSegments: Segment[]) => {
    setHistory(prev => {
      const currentHistory = prev.slice(0, historyIndex + 1);
      // Deep compare to avoid duplicates
      if (currentHistory.length > 0 && JSON.stringify(currentHistory[currentHistory.length - 1]) === JSON.stringify(newSegments)) {
        return currentHistory;
      }
      return [...currentHistory, newSegments];
    });
    setHistoryIndex(prev => prev + 1);
  };

  // --- Derived ---
  const resultPrompt = segments.map(s => {
    if (s.type === 'text') return s.content;
    if (s.type === 'random') return s.activeValue || '';
    return ''; 
  }).join('');

  const isDirty = useMemo(() => {
    if (!currentProjectId) return true;
    const saved = savedProjects.find(p => p.id === currentProjectId);
    if (!saved) return true;
    return JSON.stringify(saved.segments) !== JSON.stringify(segments) || saved.name !== promptName;
  }, [segments, promptName, currentProjectId, savedProjects]);

  const canRandomize = useMemo(() => {
    if (!selection.startId) return false;
    const seg = segments.find(s => s.id === selection.startId);
    if (!seg || seg.type !== 'text') return false;
    return selection.text.trim().length > 0;
  }, [selection, segments]);

  // --- Effects ---
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ segments, name: promptName, projectId: currentProjectId }));
    } catch (e) {}
  }, [segments, promptName, currentProjectId]);

  useEffect(() => {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(savedProjects));
  }, [savedProjects]);

  useLayoutEffect(() => {
    if (!focusRequest) return;
    const attemptFocus = () => {
        const element = document.querySelector(`span[data-segment-id="${focusRequest.id}"]`) as HTMLElement;
        if (element) {
            element.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            if (element.firstChild && element.firstChild.nodeType === Node.TEXT_NODE) {
                const len = element.firstChild.textContent?.length || 0;
                range.setStart(element.firstChild, Math.min(focusRequest.offset, len));
            } else {
                range.setStart(element, 0);
            }
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
            setFocusRequest(null);
            return true;
        }
        return false;
    };
    if (!attemptFocus()) {
        const timer = setTimeout(attemptFocus, 0);
        return () => clearTimeout(timer);
    }
  }, [focusRequest, segments]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setSelection(prev => ({ ...prev, startId: null, endId: null, text: '' }));
        return;
      }
      const range = sel.getRangeAt(0);
      let startNode: Node | null = range.startContainer;
      while (startNode && startNode !== document.body) {
        if (startNode.nodeType === Node.ELEMENT_NODE && (startNode as HTMLElement).dataset.segmentId) break;
        startNode = startNode.parentNode;
      }
      const startEl = startNode as HTMLElement;
      const startId = startEl?.dataset?.segmentId || null;
      if (startId) {
         setSelection({ startId, endId: startId, startOffset: range.startOffset, endOffset: range.endOffset, text: sel.toString() });
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      if (history[prevIndex]) {
          setHistoryIndex(prevIndex);
          setSegments(history[prevIndex]); // Direct restore, no normalization to ensure exact history match
          setSelection({ startId: null, endId: null, startOffset: 0, endOffset: 0, text: '' });
      }
    }
  };

  const handleBlurSnapshot = () => {
    if (JSON.stringify(segments) !== JSON.stringify(history[historyIndex])) {
      saveSnapshot(segments);
    }
  };

  // --- Editor Handlers ---

  const handleTextChange = (id: string, newText: string) => {
    // We do NOT normalize on every keystroke to avoid cursor jumping and performance issues.
    // Normalization only happens on structural changes (split, delete, paste)
    setSegments(prev => prev.map(s => s.id === id ? { ...s, content: newText } : s));
  };

  const handleSplit = (id: string, index: number) => {
    const segIdx = segments.findIndex(s => s.id === id);
    if (segIdx === -1) return;
    const seg = segments[segIdx];
    const content = seg.content as string;
    
    // Explicitly handle split logic.
    // If we are at index, we want: [0..index] + '\n' AND [index..end]
    const pre = content.substring(0, index) + '\n';
    const post = content.substring(index); 

    const newSegs: Segment[] = [
        { ...seg, content: pre },
        { id: uuidv4(), type: 'text', content: post } // Ensure new segment is created even if 'post' is empty
    ];
    
    const result = [...segments];
    result.splice(segIdx, 1, ...newSegs);
    
    const normalized = normalizeSegments(result);
    saveSnapshot(normalized);
    setSegments(normalized);
    
    // Find the new segment to focus
    const newId = newSegs[1].id;
    // Check if newId exists (split successful) or was merged back (e.g. text split inside text)
    if (normalized.find(s => s.id === newId)) {
        setFocusRequest({ id: newId, offset: 0 });
    } else {
        // Segment was merged back into the original ID or previous ID.
        // We know we split at 'pre.length'. Since 'pre' ends with \n, the cursor should be at index `pre.length`.
        // However, if the user pressed Enter, they usually expect to be on the new line (the next segment).
        // If normalization merged it (unlikely with \n split logic), we check:
        const mergedSeg = normalized.find(s => s.id === seg.id);
        if (mergedSeg) {
            setFocusRequest({ id: seg.id, offset: pre.length });
        }
    }
  };

  const handleDeleteBack = (id: string) => {
    const index = segments.findIndex(s => s.id === id);
    if (index <= 0) return;

    const current = segments[index];
    const previous = segments[index - 1];

    let newSegments = [...segments];
    let focusTarget: { id: string, offset: number } | null = null;

    if (previous.type === 'text' && current.type === 'text') {
        const prevContent = previous.content as string;
        const currContent = current.content as string;
        let finalPrevContent = prevContent;
        let mergeOffset = prevContent.length;

        if (finalPrevContent.endsWith('\n')) {
            finalPrevContent = finalPrevContent.slice(0, -1);
            mergeOffset = finalPrevContent.length;
        }
        
        const newContent = finalPrevContent + currContent;
        // Modify copy
        newSegments[index - 1] = { ...previous, content: newContent };
        newSegments.splice(index, 1);
        focusTarget = { id: previous.id, offset: mergeOffset };

    } else if (previous.type !== 'text') {
        // Delete block
        newSegments.splice(index - 1, 1); 
        focusTarget = { id: current.id, offset: 0 };
    } 

    const normalized = normalizeSegments(newSegments);
    saveSnapshot(normalized);
    setSegments(normalized);
    if (focusTarget) setFocusRequest(focusTarget);
  };

  // --- Other Actions ---

  const handleClear = () => {
    if (JSON.stringify(segments) !== JSON.stringify(history[historyIndex])) saveSnapshot(segments);
    const newSegments: Segment[] = [{ id: uuidv4(), type: 'text', content: '' }];
    saveSnapshot(newSegments);
    setSegments(newSegments);
    setPromptName('Untitled Project');
    setCurrentProjectId(null);
    showNotification("Workspace Cleared");
  };

  const addLabel = () => {
    const color = LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)];
    const newLabel: Segment = { id: uuidv4(), type: 'label', content: 'New Label', color: color };
    let newSegments = [...segments];
    
    if (selection.startId) {
        const index = newSegments.findIndex(s => s.id === selection.startId);
        if (index !== -1) {
            const seg = newSegments[index];
            if (seg.type === 'text') {
                const content = seg.content as string;
                const pre = content.substring(0, selection.startOffset);
                const post = content.substring(selection.startOffset);
                const finalPre = pre.endsWith('\n') ? pre : (pre + '\n');
                
                const replacement = [
                    {...seg, content: finalPre},
                    newLabel,
                    {id: uuidv4(), type: 'text', content: post}
                ];
                newSegments.splice(index, 1, ...replacement as Segment[]);
            } else {
                newSegments.splice(index + 1, 0, newLabel);
            }
        }
    } else {
        newSegments.push(newLabel);
    }
    
    updateSegments(newSegments);
  };

  const convertToRandom = () => {
    if (!selection.startId || !selection.text || !canRandomize) return;
    
    setSegments(prev => {
      const index = prev.findIndex(s => s.id === selection.startId);
      if (index === -1) return prev;
      const oldSegment = prev[index];
      if (typeof oldSegment.content !== 'string') return prev;

      const rawBeforeText = oldSegment.content.substring(0, selection.startOffset);
      const rawSelectedText = selection.text;
      const rawAfterText = oldSegment.content.substring(selection.endOffset);

      const newSegmentsSlice: Segment[] = [];
      if (rawBeforeText) newSegmentsSlice.push({ id: uuidv4(), type: 'text', content: rawBeforeText });
      newSegmentsSlice.push({ id: uuidv4(), type: 'random' as SegmentType, content: [rawSelectedText.trim()], activeValue: rawSelectedText.trim() });
      if (rawAfterText) newSegmentsSlice.push({ id: uuidv4(), type: 'text', content: rawAfterText });

      const result = [...prev];
      result.splice(index, 1, ...newSegmentsSlice);
      
      const normalized = normalizeSegments(result);
      return normalized;
    });
    
    setSelection({ startId: null, endId: null, startOffset: 0, endOffset: 0, text: '' });
  };

  const updateRandomOptions = (newOptions: string[]) => {
    if (!editingSegmentId) return;
    const newSegments = segments.map(s => {
      if (s.id === editingSegmentId) {
        let newActive = s.activeValue;
        if (!newActive || !newOptions.includes(newActive)) newActive = newOptions.length > 0 ? newOptions[0] : '';
        return { ...s, content: newOptions, activeValue: newActive };
      }
      return s;
    });
    updateSegments(newSegments);
  };

  const deleteSegment = (id: string) => {
    const newSegments = segments.filter(s => s.id !== id);
    updateSegments(newSegments);
    setEditingSegmentId(null);
  }

  const handleDuplicateBlock = (id: string) => {
    const index = segments.findIndex(s => s.id === id);
    if (index === -1) return;
    const seg = segments[index];
    // Create deep copy of content if it's an array
    const content = Array.isArray(seg.content) ? [...seg.content] : seg.content;
    const newSeg: Segment = { ...seg, id: uuidv4(), content }; 
    
    const newSegments = [...segments];
    // Insert after the current block
    newSegments.splice(index + 1, 0, newSeg);
    
    updateSegments(newSegments);
    showNotification("Block Duplicated");
  };

  const handleReroll = useCallback(() => {
    setIsRerolling(true);
    setTimeout(() => {
      const next = segments.map(seg => {
        if (seg.type === 'random' && Array.isArray(seg.content) && seg.content.length > 0) {
          return { ...seg, activeValue: getRandom(seg.content) };
        }
        return seg;
      });
      saveSnapshot(next);
      setSegments(next); 
      setIsRerolling(false);
    }, 300);
  }, [segments]);

  const handleCopy = () => {
    navigator.clipboard.writeText(resultPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (!editorContainerRef.current) return;
    
    // Ignore clicks on buttons/blocks/contentEditable=false areas
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('[contenteditable="false"]')) return;

    // FIX: If the user has selected text (Range), do not force-move the cursor.
    // This happens when a user drags to select text and releases mouse (triggering click).
    const currentSel = window.getSelection();
    if (currentSel && !currentSel.isCollapsed && currentSel.toString().length > 0) {
        return;
    }

    const clickY = e.clientY;
    const spans = Array.from(editorContainerRef.current.querySelectorAll('span[data-segment-id]'));
    
    // Helper to get candidates with a specific vertical tolerance
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

    // 1. Identify all segments/lines that vertically intersect the click
    // First, try strict matching (no tolerance) to avoid ambiguity with stacked empty lines
    let candidates = getCandidates(0);
    // Fallback to loose matching if no strict match found
    if (candidates.length === 0) {
        candidates = getCandidates(6);
    }

    if (candidates.length > 0) {
        // Found matching visual line(s).
        // Find the one furthest to the right (visually last on this line).
        candidates.sort((a, b) => b.rect.right - a.rect.right);
        const rightMost = candidates[0];

        // 2. Determine target selection
        // If the user clicked in the empty space to the right of the line
        if (e.clientX > rightMost.rect.right) {
             const span = rightMost.span;
             const text = span.textContent || '';
             
             // Fix: If spans ends with newline, we want to place cursor BEFORE the newline (index - 1)
             // This ensures the cursor visually stays on the line the user clicked, rather than
             // wrapping to the start of the next line (which is what the browser defaults to for index after \n).
             let offset = text.length;
             if (text.endsWith('\n') && offset > 0) {
                 offset -= 1;
             }
             
             const range = document.createRange();
             if (span.firstChild && span.firstChild.nodeType === Node.TEXT_NODE) {
                 range.setStart(span.firstChild, offset);
             } else {
                 range.setStart(span, 0);
             }
             range.collapse(true);
             const sel = window.getSelection();
             sel?.removeAllRanges();
             sel?.addRange(range);
             span.focus();
             return;
        }

        // 3. Use standard API to resolve caret position for clicks WITHIN the line text
        if ((document as any).caretRangeFromPoint) {
            const range = (document as any).caretRangeFromPoint(e.clientX, clickY);
            if (range) {
                // FALLBACK: If caretRangeFromPoint hit the CONTAINER (bg) instead of a text node
                const container = editorContainerRef.current;
                if (range.startContainer === container || container.contains(range.startContainer) && range.startContainer.nodeName === 'DIV') {
                     const span = rightMost.span;
                     span.focus();
                     // Place cursor at end of span (applying same newline fix logic)
                     const text = span.textContent || '';
                     let offset = text.length;
                     if (text.endsWith('\n') && offset > 0) offset -= 1;

                     const r = document.createRange();
                     if (span.firstChild) r.setStart(span.firstChild, offset);
                     else r.setStart(span, 0);
                     r.collapse(true);
                     const sel = window.getSelection();
                     sel?.removeAllRanges();
                     sel?.addRange(r);
                     return;
                }

                // 4. Line Jump Correction
                // If the browser resolved the caret to the start of the NEXT line (common for wrapping/newlines),
                // but the user clicked the CURRENT line...
                const rangeRects = range.getClientRects();
                if (rangeRects.length > 0) {
                    const caretRect = rangeRects[0];
                    if (caretRect.top > rightMost.rect.bottom - 2) {
                         // Back up one character if possible, specifically if we are at the char after \n
                         if (range.startContainer.nodeType === Node.TEXT_NODE) {
                             const content = range.startContainer.textContent || '';
                             if (range.startOffset > 0 && content[range.startOffset - 1] === '\n') {
                                 range.setStart(range.startContainer, range.startOffset - 1);
                                 range.collapse(true);
                             }
                         }
                    }
                }

                // Check specifically if we landed exactly AFTER a newline character
                if (range.startContainer.nodeType === Node.TEXT_NODE) {
                    const content = range.startContainer.textContent || '';
                    if (range.startOffset === content.length && content.endsWith('\n')) {
                         range.setStart(range.startContainer, range.startOffset - 1);
                         range.collapse(true);
                    }
                }

                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
                
                // Ensure the span is focused (EditableSpan needs focus to work)
                const containerSpan = range.startContainer.parentElement?.closest('span[data-segment-id]') as HTMLElement;
                containerSpan?.focus();
                return;
            }
        }
    }
  };

  const handleNativeCopy = () => {};
  const handleNativePaste = useCallback((e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      if (text && selection.startId) {
          const index = segments.findIndex(s => s.id === selection.startId);
          if (index !== -1 && segments[index].type === 'text') {
              const seg = segments[index];
              const content = seg.content as string;
              const pre = content.substring(0, selection.startOffset);
              const post = content.substring(selection.startOffset);
              const newContent = pre + text + post;
              const newSegments = [...segments];
              newSegments[index] = {...seg, content: newContent};
              updateSegments(newSegments);
          }
      }
  }, [selection, segments]);

  const handleToolbarPaste = async () => {
      try {
          const text = await navigator.clipboard.readText();
          if (text && selection.startId) {
             const index = segments.findIndex(s => s.id === selection.startId);
             if (index !== -1 && segments[index].type === 'text') {
                 const seg = segments[index];
                 const content = seg.content as string;
                 const pre = content.substring(0, selection.startOffset);
                 const post = content.substring(selection.startOffset);
                 const newSegments = [...segments];
                 newSegments[index] = {...seg, content: pre + text + post};
                 updateSegments(newSegments);
             }
          }
      } catch (e) {
          showNotification("Paste Failed: Check Permissions");
      }
  };

  const handleMoveSection = (labelId: string, direction: 'up' | 'down') => {
      const groups = groupSegments(segments);
      const idx = groups.findIndex(g => g.labelSegment?.id === labelId);
      if (idx === -1) return;
      
      const newGroups = [...groups];
      if (direction === 'up' && idx > 0) {
          [newGroups[idx], newGroups[idx-1]] = [newGroups[idx-1], newGroups[idx]];
      } else if (direction === 'down' && idx < newGroups.length - 1) {
          [newGroups[idx], newGroups[idx+1]] = [newGroups[idx+1], newGroups[idx]];
      } else return;

      const flattened: Segment[] = [];
      newGroups.forEach(g => {
          if (g.labelSegment) flattened.push(g.labelSegment);
          flattened.push(...g.contentSegments);
      });
      updateSegments(flattened);
  };

  const handleUpdateLabel = (id: string, updates: any) => {
      const newSegments = segments.map(s => s.id === id ? { ...s, ...updates } : s);
      updateSegments(newSegments);
  };

  const handleDeleteLabel = (id: string) => {
      updateSegments(segments.filter(s => s.id !== id));
      setActiveLabelMenuId(null);
  };

  const handleDeleteSection = (id: string) => {
      const groups = groupSegments(segments);
      const idx = groups.findIndex(g => g.labelSegment?.id === id);
      if (idx !== -1) {
          groups.splice(idx, 1);
          const flattened: Segment[] = [];
          groups.forEach(g => {
              if (g.labelSegment) flattened.push(g.labelSegment);
              flattened.push(...g.contentSegments);
          });
          updateSegments(flattened);
      }
      setActiveLabelMenuId(null);
  };

  const handleCopySection = (id: string) => { showNotification("Section Copy ready"); };
  const handleSaveProject = () => {
      const now = Date.now();
      if (currentProjectId) {
          setSavedProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, name: promptName, segments, updatedAt: now } : p));
          showNotification("Project Updated");
      } else {
          const newId = uuidv4();
          setSavedProjects(prev => [{id: newId, name: promptName || 'Untitled', segments, updatedAt: now}, ...prev]);
          setCurrentProjectId(newId);
          showNotification("Project Saved");
      }
  };
  const handleSaveAsNew = () => {
      const newId = uuidv4();
      const newName = promptName + ' (Copy)';
      setSavedProjects(prev => [{id: newId, name: newName, segments, updatedAt: Date.now()}, ...prev]);
      setCurrentProjectId(newId);
      setPromptName(newName);
      showNotification("Copy Saved");
  };
  const handleLoadProject = (p: SavedProject) => {
      updateSegments(p.segments);
      setPromptName(p.name);
      setCurrentProjectId(p.id);
      showNotification("Project Loaded");
  };
  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('Delete project?')) {
          setSavedProjects(prev => prev.filter(p => p.id !== id));
          if (currentProjectId === id) setCurrentProjectId(null);
      }
  };
  
  const handleExportCSV = () => {}; 
  const handleImportCSV = (e: any) => {};
  const handleImportClick = () => fileInputRef.current?.click();

  const groupsForCalc = groupSegments(segments);
  let currentHighlightColor = DEFAULT_TEXT_COLOR;

  if (!segments) return <div className="min-h-screen bg-canvas-950 flex items-center justify-center text-canvas-500 font-mono">Loading Prismaflow...</div>;

  return (
    <div className="min-h-screen bg-canvas-950 flex flex-col items-center py-10 px-4 md:px-8">
      <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 bg-canvas-800 border border-brand-500/50 text-brand-100 px-6 py-3 rounded-full shadow-lg z-50 transition-all ${notification ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <Zap size={14} className="inline mr-2" />{notification}
      </div>

      <header className="mb-8 text-center flex flex-col gap-2">
        <h1 className="text-4xl font-sans font-black tracking-tight text-white flex items-center justify-center gap-4">
          <Layers className="text-brand-500" size={32} /> PRISMAFLOW
        </h1>
        <p className="text-canvas-500 font-mono text-xs tracking-[0.2em] uppercase">Modular Prompt Engine</p>
      </header>

      <main className="w-full max-w-7xl flex flex-col lg:flex-row gap-6 items-start h-[calc(100vh-200px)]">
        <div className="flex-1 w-full min-w-0 flex flex-col h-full gap-4">
            <div className="bg-canvas-900 border border-canvas-800 rounded-lg p-3 flex flex-col md:flex-row gap-4 justify-between items-center shrink-0">
                <div className="flex-1 w-full md:w-auto flex gap-2 items-center">
                    <input type="text" value={promptName} onChange={e => setPromptName(e.target.value)} className="bg-transparent text-lg font-bold text-white w-full focus:outline-none" placeholder="Untitled Project" />
                    {currentProjectId && <span className={`text-[10px] px-2 py-0.5 rounded-full border ${!isDirty ? 'bg-emerald-950 border-emerald-800 text-emerald-400' : 'bg-amber-950 border-amber-800 text-amber-400'}`}>{!isDirty ? 'Synced' : 'Edited'}</span>}
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={handleUndo} className="p-2 text-canvas-400 hover:text-white rounded" title="Undo"><Undo2 size={18}/></button>
                    <div className="w-px h-5 bg-canvas-800 mx-2"></div>
                    <button onClick={addLabel} className="p-2 text-canvas-400 hover:text-brand-400 rounded" title="Add Label"><Tag size={18}/></button>
                    <button onClick={convertToRandom} className={`p-2 rounded ${canRandomize ? 'text-brand-400' : 'text-canvas-600'}`} title="Randomize"><Zap size={18}/></button>
                    <div className="w-px h-5 bg-canvas-800 mx-2"></div>
                    <button onClick={handleToolbarPaste} className="p-2 text-canvas-400 hover:text-white rounded" title="Paste"><ClipboardPaste size={18}/></button>
                    <div className="w-px h-5 bg-canvas-800 mx-2"></div>
                    <button onClick={handleSaveProject} className="p-2 text-canvas-400 hover:text-white rounded" title="Save"><Save size={18}/></button>
                    <button onClick={handleSaveAsNew} className="p-2 text-canvas-400 hover:text-emerald-400 rounded" title="Save Copy"><FilePlus size={18}/></button>
                    <div className="w-px h-5 bg-canvas-800 mx-2"></div>
                    <button onClick={handleClear} className="p-2 text-canvas-400 hover:text-red-400 rounded" title="Clear"><Trash2 size={18}/></button>
                </div>
            </div>

            <div 
                ref={editorContainerRef}
                onClick={handleContainerClick}
                onCopy={handleNativeCopy}
                onPaste={handleNativePaste}
                className="flex-1 bg-canvas-900/50 border border-canvas-800 rounded-lg p-6 overflow-y-auto custom-scrollbar shadow-inner relative z-10 cursor-text text-left leading-loose font-mono text-sm md:text-base"
            >
                {segments.map((seg, idx) => {
                    if (seg.type === 'label') {
                        currentHighlightColor = seg.color || DEFAULT_TEXT_COLOR;
                        const groupIndex = groupsForCalc.findIndex(g => g.labelSegment?.id === seg.id);
                        const isMenuOpen = activeLabelMenuId === seg.id;
                        return (
                        <span 
                            key={seg.id}
                            data-segment-id={seg.id}
                            ref={(el) => { labelRefs.current[seg.id] = el; }}
                            contentEditable={false}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider select-none mx-1 align-baseline cursor-pointer hover:ring-1 hover:ring-white/20 relative ${isMenuOpen ? 'z-50' : 'z-auto'}`}
                            style={{ backgroundColor: `${seg.color}20`, color: seg.color || DEFAULT_TEXT_COLOR, border: `1px solid ${seg.color}40` }} 
                            onClick={(e) => { e.stopPropagation(); setActiveLabelMenuId(activeLabelMenuId === seg.id ? null : seg.id); }}
                        >
                            <Tag size={10} style={{ color: seg.color }} />
                            {seg.content}
                            <LabelMenu 
                                isOpen={isMenuOpen}
                                onClose={() => setActiveLabelMenuId(null)}
                                anchorRef={{ current: labelRefs.current[seg.id] || null }}
                                labelName={seg.content as string}
                                currentColor={seg.color || DEFAULT_TEXT_COLOR}
                                colors={LABEL_COLORS}
                                onRename={(name) => handleUpdateLabel(seg.id, { content: name })}
                                onColorChange={(color) => handleUpdateLabel(seg.id, { color: color })}
                                onMoveUp={() => handleMoveSection(seg.id, 'up')}
                                onMoveDown={() => handleMoveSection(seg.id, 'down')}
                                onCopySection={() => handleCopySection(seg.id)}
                                onDeleteLabel={() => handleDeleteLabel(seg.id)}
                                onDeleteSection={() => handleDeleteSection(seg.id)}
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
                            onChange={handleTextChange}
                            onBlur={handleBlurSnapshot}
                            onSplit={(idx) => handleSplit(seg.id, idx)}
                            onDeleteBack={handleDeleteBack}
                        />
                        );
                    } else {
                        return (
                        <span
                            key={seg.id}
                            data-segment-id={seg.id}
                            contentEditable={false}
                            className="inline-flex items-center align-baseline mx-1 my-0.5 rounded border border-canvas-700 bg-canvas-800 text-brand-200 select-none group/opt relative shadow-sm transition-all hover:border-brand-500/50 hover:bg-canvas-800/80 hover:shadow-brand-500/10"
                        >
                            {/* Value Display */}
                            <span 
                                onClick={(e) => { e.stopPropagation(); setEditingSegmentId(seg.id); }}
                                className="px-2 py-0.5 cursor-pointer hover:text-brand-100 transition-colors max-w-[200px] truncate font-mono text-sm border-r border-transparent group-hover/opt:border-canvas-700"
                                title={`Options: ${(seg.content as string[]).join(', ')}`}
                            >
                                {seg.activeValue || '(empty)'}
                            </span>
                            
                            {/* Actions - Visible on Hover */}
                            <span className="flex items-center w-0 overflow-hidden group-hover/opt:w-auto transition-all bg-canvas-900">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingSegmentId(seg.id); }}
                                    className="p-1.5 hover:bg-brand-600 hover:text-white text-canvas-400 transition-colors"
                                    title="Edit Options"
                                >
                                    <Edit3 size={12} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDuplicateBlock(seg.id); }}
                                    className="p-1.5 hover:bg-brand-600 hover:text-white text-canvas-400 transition-colors"
                                    title="Duplicate Block"
                                >
                                    <Copy size={12} />
                                </button>
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); deleteSegment(seg.id); }}
                                    className="p-1.5 hover:bg-red-500 hover:text-white text-canvas-400 transition-colors"
                                    title="Delete Block"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </span>
                        </span>
                        );
                    }
                })}
            </div>

            <div className="bg-canvas-950 border border-canvas-800 rounded-lg flex flex-col shrink-0 min-h-[140px]">
                <div className="bg-canvas-900/50 px-4 py-2 border-b border-canvas-800 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-canvas-500 font-bold uppercase tracking-widest"><Terminal size={14}/> Generated Prompt</div>
                    <div className="flex items-center gap-2">
                         <button onClick={handleReroll} className={`p-1.5 rounded bg-brand-600 hover:bg-brand-500 text-white shadow-lg ${isRerolling ? 'animate-spin':''}`}><RefreshCw size={16}/></button>
                         <button onClick={handleCopy} className="p-1.5 rounded bg-canvas-800 hover:bg-canvas-700 text-canvas-400 hover:text-white">{copied ? <Check size={16}/> : <Copy size={16}/>}</button>
                    </div>
                </div>
                <div className="p-4 overflow-y-auto custom-scrollbar max-h-[100px] flex-1">
                     <p className={`font-mono text-sm text-canvas-300 leading-relaxed ${isRerolling?'opacity-50 blur-[1px]':'opacity-100'}`}>{resultPrompt}</p>
                </div>
            </div>
        </div>

        <div className="w-full lg:w-72 flex-shrink-0 h-full flex flex-col bg-canvas-900 border border-canvas-800 rounded-lg overflow-hidden">
             <div className="p-4 border-b border-canvas-800 bg-canvas-900 flex items-center justify-between shrink-0">
                 <h3 className="text-white font-bold text-sm flex items-center gap-2 uppercase tracking-wider"><Book size={16} className="text-brand-500"/> Library</h3>
                 <span className="text-[10px] text-canvas-400 bg-canvas-800 px-2 py-0.5 rounded-full font-mono">{savedProjects.length}</span>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                 {savedProjects.length === 0 && <div className="flex flex-col items-center justify-center h-40 text-canvas-600 space-y-3 text-center p-4"><Layers size={32} className="opacity-20"/><p className="text-xs">Library is empty.</p></div>}
                 {savedProjects.map(p => (
                    <div key={p.id} onClick={() => handleLoadProject(p)} className={`group border rounded-md p-3 cursor-pointer ${currentProjectId === p.id ? 'bg-brand-900/10 border-brand-500/40' : 'bg-transparent border-transparent hover:bg-canvas-800 hover:border-canvas-700'}`}>
                        <button onClick={(e) => handleDeleteProject(p.id, e)} className="absolute top-2 right-2 text-canvas-600 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1 hover:bg-canvas-900 rounded"><X size={12}/></button>
                        <h4 className={`text-sm font-medium truncate pr-6 ${currentProjectId === p.id ? 'text-brand-200' : 'text-canvas-300 group-hover:text-white'}`}>{p.name}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-canvas-500 mt-1.5 font-mono"><Clock size={10}/>{new Date(p.updatedAt).toLocaleDateString()}</div>
                    </div>
                 ))}
             </div>
        </div>
      </main>

      <footer className="mt-8 text-canvas-600 text-[10px] font-mono uppercase tracking-widest">Prismaflow Engine v1.0</footer>

      {editingSegmentId && (
        <Modal isOpen={!!editingSegmentId} onClose={() => setEditingSegmentId(null)} title="Edit Options">
          <div className="space-y-6">
             {(() => {
                const seg = segments.find(s => s.id === editingSegmentId);
                if (!seg || seg.type !== 'random') return null;
                return (
                  <>
                    <RandomizerEditor options={seg.content as string[]} onSave={updateRandomOptions} />
                    <div className="pt-4 border-t border-canvas-800 flex justify-end">
                      <button onClick={() => deleteSegment(editingSegmentId)} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-xs px-3 py-2 rounded hover:bg-red-900/20 uppercase font-bold tracking-wider"><Trash2 size={14}/> Delete Block</button>
                    </div>
                  </>
                );
             })()}
          </div>
        </Modal>
      )}
    </div>
  );
}