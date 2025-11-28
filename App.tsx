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
  Edit3,
  Folder,
  FolderPlus,
  ArrowRightLeft,
  Plus,
  MousePointer2,
  Settings,
  Library,
  LayoutTemplate,
  Package,
  HelpCircle
} from './components/Icons';
import { Segment, SelectionState, groupSegments, SectionGroup, SavedProject, SegmentType, OptionPreset, SectionPreset } from './types';
import { Modal } from './components/Modal';
import { RandomizerEditor } from './components/RandomizerEditor';
import { LabelMenu } from './components/LabelMenu';
import { HelpModal } from './components/HelpModal';

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
const OPTION_PRESETS_KEY = 'prismaflow_option_presets';
const SECTION_PRESETS_KEY = 'prismaflow_section_presets';

// --- Clipboard Helper ---
const copyToClipboard = async (text: string): Promise<boolean> => {
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
      } 
      return { segments: normalizeSegments(loadedSegments), name: loadedName, projectId: loadedId };
    } catch (e) {
      return { segments: normalizeSegments(initialSegments), name: 'Urban Editorial Config', projectId: null };
    }
  };

  const loadSavedProjects = (): SavedProject[] => {
    try {
      const saved = localStorage.getItem(PROJECTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  };

  const loadOptionPresets = (): OptionPreset[] => {
      try {
          const saved = localStorage.getItem(OPTION_PRESETS_KEY);
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  };

  const loadSectionPresets = (): SectionPreset[] => {
      try {
          const saved = localStorage.getItem(SECTION_PRESETS_KEY);
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  };

  const initialState = loadInitialState();

  // --- State ---
  const [segments, setSegments] = useState<Segment[]>(initialState.segments);
  const [promptName, setPromptName] = useState(initialState.name);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(initialState.projectId);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(loadSavedProjects);
  const [optionPresets, setOptionPresets] = useState<OptionPreset[]>(loadOptionPresets);
  const [sectionPresets, setSectionPresets] = useState<SectionPreset[]>(loadSectionPresets);
  const [notification, setNotification] = useState<string | null>(null);

  const [history, setHistory] = useState<Segment[][]>(() => [initialState.segments]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [selection, setSelection] = useState<SelectionState>({ startId: null, endId: null, startOffset: 0, endOffset: 0, text: '' });
  
  // Sidebar State
  const [activeSidebarTab, setActiveSidebarTab] = useState<'library' | 'projects'>('library');

  // Editing State
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [activeLabelMenuId, setActiveLabelMenuId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{id: string, offset: number} | null>(null);
  const [isRerolling, setIsRerolling] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Modal States
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false); // Used for Options
  const [isSaveSectionModalOpen, setIsSaveSectionModalOpen] = useState(false); // Used for Sections
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [savingSectionId, setSavingSectionId] = useState<string | null>(null); // Temp ID for section being saved
  const [presetNameInput, setPresetNameInput] = useState('');

  const labelRefs = useRef<{[key: string]: HTMLElement | null}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
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
    if (s.type === 'random') {
        const disabled = s.disabledIndices || [];
        const options = s.content as string[];
        // If the entire block is disabled (all options disabled), it shouldn't output text in the prompt?
        // Or should it output the first dimmed one? 
        // Usually, disabled blocks don't contribute to the final prompt.
        // However, based on the request "show first item but dimmed", it implies it's still visible in the editor.
        // For the *Generated Prompt* (resultPrompt), let's assume fully disabled blocks are silent, 
        // OR we output the value if it's active.
        // If the user manually disabled everything, it likely shouldn't be in the result.
        // Let's check if the current activeValue is actually enabled.
        const isActiveEnabled = options.indexOf(s.activeValue || '') !== -1 && !disabled.includes(options.indexOf(s.activeValue || ''));
        
        // If the active value is technically "enabled" (or forced), we return it.
        // But if ALL are disabled, we return empty string for the generated prompt?
        // Let's stick to: Output the active value IF it is not effectively "off". 
        // If the UI shows it as "dimmed/off", it shouldn't be in the prompt.
        if (options.length > 0 && options.every((_, i) => disabled.includes(i))) {
            return ''; // All disabled -> No output
        }
        return s.activeValue || '';
    }
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

  useEffect(() => {
      localStorage.setItem(OPTION_PRESETS_KEY, JSON.stringify(optionPresets));
  }, [optionPresets]);

  useEffect(() => {
      localStorage.setItem(SECTION_PRESETS_KEY, JSON.stringify(sectionPresets));
  }, [sectionPresets]);

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
      // If selection is gone, assume it might just be focus shift to toolbar. 
      // Do not clear it immediately to support insertion at last cursor.
      if (!sel || sel.rangeCount === 0) {
        return;
      }

      const range = sel.getRangeAt(0);
      let startNode: Node | null = range.startContainer;
      let isInside = false;
      while (startNode && startNode !== document.body) {
        if (startNode.nodeType === Node.ELEMENT_NODE && (startNode as HTMLElement).dataset.segmentId) {
            isInside = true;
            break;
        }
        startNode = startNode.parentNode;
      }
      
      if (isInside) {
          const startEl = startNode as HTMLElement;
          const startId = startEl?.dataset?.segmentId || null;
          if (startId) {
             setSelection({ startId, endId: startId, startOffset: range.startOffset, endOffset: range.endOffset, text: sel.toString() });
          }
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
      const newRandomId = uuidv4();
      newSegmentsSlice.push({ id: newRandomId, type: 'random' as SegmentType, content: [rawSelectedText.trim()], activeValue: rawSelectedText.trim(), disabledIndices: [] });
      if (rawAfterText) newSegmentsSlice.push({ id: uuidv4(), type: 'text', content: rawAfterText });

      const result = [...prev];
      result.splice(index, 1, ...newSegmentsSlice);
      
      const normalized = normalizeSegments(result);
      // Auto-select the newly created block
      setTimeout(() => setSelectedOptionId(newRandomId), 0);
      return normalized;
    });
    
    setSelection({ startId: null, endId: null, startOffset: 0, endOffset: 0, text: '' });
  };

  const updateRandomOptions = (newOptions: string[], newDisabledIndices: number[]) => {
    if (editingSegmentId) {
        // Editing a block on the canvas
        const newSegments = segments.map(s => {
          if (s.id === editingSegmentId) {
            let newActive = s.activeValue;
            
            // Check if active value is now disabled or removed
            const activeIndex = newOptions.indexOf(newActive || '');
            const isActiveDisabled = activeIndex !== -1 && newDisabledIndices.includes(activeIndex);
            const isRemoved = activeIndex === -1;

            if (isRemoved || isActiveDisabled) {
                // Find first enabled option
                const firstEnabledIndex = newOptions.findIndex((_, idx) => !newDisabledIndices.includes(idx));
                if (firstEnabledIndex !== -1) {
                    newActive = newOptions[firstEnabledIndex];
                } else {
                    // All disabled? Keep first one but it will be rendered dim
                    newActive = newOptions.length > 0 ? newOptions[0] : '';
                }
            }
            
            return { ...s, content: newOptions, activeValue: newActive, disabledIndices: newDisabledIndices };
          }
          return s;
        });
        updateSegments(newSegments);
    } else if (editingPresetId) {
        // Editing a preset in the folder
        // Note: For presets, we currently just store the list of strings.
        // If we want to store enabled state in presets, OptionPreset interface needs update.
        // For now, we'll just save the text options and ignore disabled state for library presets to keep them simple.
        setOptionPresets(prev => prev.map(p => {
            if (p.id === editingPresetId) {
                return { ...p, options: newOptions };
            }
            return p;
        }));
    }
  };

  const deleteSegment = (id: string) => {
    const newSegments = segments.filter(s => s.id !== id);
    updateSegments(newSegments);
    setEditingSegmentId(null);
    if (selectedOptionId === id) setSelectedOptionId(null);
  }

  // --- Option Preset Actions ---

  const handleOpenSavePresetModal = () => {
    if (!selectedOptionId) return;
    const seg = segments.find(s => s.id === selectedOptionId);
    if (!seg || seg.type !== 'random' || !Array.isArray(seg.content)) return;
    
    setPresetNameInput(seg.activeValue || 'New Preset');
    setIsSavePresetModalOpen(true);
  };

  const confirmSavePreset = () => {
    if (!selectedOptionId || !presetNameInput.trim()) return;
    const seg = segments.find(s => s.id === selectedOptionId);
    if (!seg || !Array.isArray(seg.content)) return;

    const newPreset: OptionPreset = {
        id: uuidv4(),
        name: presetNameInput.trim(),
        options: [...seg.content]
    };
    setOptionPresets(prev => [...prev, newPreset]);
    setIsSavePresetModalOpen(false);
    showNotification("Preset Saved");
  };

  const handleInsertPreset = (preset: OptionPreset) => {
      const activeVal = preset.options.length > 0 ? preset.options[0] : '';
      const newSeg: Segment = {
          id: uuidv4(),
          type: 'random',
          content: [...preset.options],
          activeValue: activeVal,
          disabledIndices: []
      };
      
      let newSegments = [...segments];

      // 1. If an Option block is selected, insert after it
      if (selectedOptionId) {
          const index = newSegments.findIndex(s => s.id === selectedOptionId);
          if (index !== -1) {
              newSegments.splice(index + 1, 0, newSeg);
              updateSegments(newSegments);
              showNotification(`Inserted "${preset.name}"`);
              return;
          }
      }

      // 2. If text cursor is active (selection.startId is set), insert at cursor
      if (selection.startId) {
          const index = newSegments.findIndex(s => s.id === selection.startId);
          if (index !== -1) {
              const seg = newSegments[index];
              if (seg.type === 'text') {
                  const content = seg.content as string;
                  const offset = selection.startOffset;
                  
                  // Split text segment
                  const pre = content.substring(0, offset);
                  const post = content.substring(offset);
                  
                  const preSeg = { ...seg, content: pre };
                  const postSeg = { id: uuidv4(), type: 'text' as SegmentType, content: post };
                  
                  newSegments.splice(index, 1, preSeg, newSeg, postSeg);
              } else {
                  // Fallback: insert after segment if not text
                  newSegments.splice(index + 1, 0, newSeg);
              }
              updateSegments(newSegments);
              showNotification(`Inserted "${preset.name}"`);
              return;
          }
      }

      // 3. Fallback: Append to end
      newSegments.push(newSeg);
      updateSegments(newSegments);
      showNotification(`Inserted "${preset.name}"`);
  };

  const handleReplacePreset = (preset: OptionPreset) => {
      if (!selectedOptionId) return;
      const index = segments.findIndex(s => s.id === selectedOptionId);
      if (index === -1) return;

      const activeVal = preset.options.length > 0 ? preset.options[0] : '';
      const newSeg: Segment = {
          ...segments[index],
          content: [...preset.options],
          activeValue: activeVal,
          disabledIndices: [] // Reset disabled state on replacement
      };
      
      const newSegments = [...segments];
      newSegments[index] = newSeg;
      updateSegments(newSegments);
      showNotification(`Replaced with "${preset.name}"`);
  };

  const handleDeletePreset = (id: string) => {
      if (confirm("Delete this preset?")) {
          setOptionPresets(prev => prev.filter(p => p.id !== id));
      }
  };

  // --- Section Preset Actions ---

  const handleOpenSaveSectionModal = () => {
      if (!activeLabelMenuId) return;
      const group = groupSegments(segments).find(g => g.labelSegment?.id === activeLabelMenuId);
      if (!group || !group.labelSegment) return;
      
      setPresetNameInput(group.labelSegment.content as string);
      setSavingSectionId(activeLabelMenuId); // Preserve the target ID
      setActiveLabelMenuId(null); // Close the Label Menu immediately
      setIsSaveSectionModalOpen(true);
  };

  const confirmSaveSection = () => {
      if (!savingSectionId || !presetNameInput.trim()) return; // Use preserved ID
      const group = groupSegments(segments).find(g => g.labelSegment?.id === savingSectionId);
      if (!group || !group.labelSegment) return;

      const newPreset: SectionPreset = {
          id: uuidv4(),
          name: presetNameInput.trim(),
          data: [group.labelSegment, ...group.contentSegments]
      };

      setSectionPresets(prev => [...prev, newPreset]);
      setIsSaveSectionModalOpen(false);
      setSavingSectionId(null);
      showNotification("Section Saved to Library");
  };

  const handleInsertSectionPreset = (preset: SectionPreset) => {
      // Regenerate IDs for all segments in the preset
      const pastedSegments = preset.data.map(s => ({ ...s, id: uuidv4() }));

      if (selection.startId) {
          const index = segments.findIndex(s => s.id === selection.startId);
          if (index !== -1) {
              const seg = segments[index];
              if (seg.type === 'text') {
                  const content = seg.content as string;
                  const offset = selection.startOffset;
                  let pre = content.substring(0, offset);
                  const post = content.substring(offset);

                  // Ensure Label starts on new line
                  if (pre.length > 0 && !pre.endsWith('\n')) {
                      pre += '\n';
                  }

                  const preSeg = { ...seg, content: pre };
                  const postSeg = { id: uuidv4(), type: 'text' as SegmentType, content: post };
                  
                  const newSegments = [...segments];
                  newSegments.splice(index, 1, preSeg, ...pastedSegments, postSeg);
                  updateSegments(newSegments);
                  showNotification(`Inserted Section "${preset.name}"`);
                  return;
              } else {
                  const newSegments = [...segments];
                  newSegments.splice(index + 1, 0, ...pastedSegments);
                  updateSegments(newSegments);
                  showNotification(`Inserted Section "${preset.name}"`);
                  return;
              }
          }
      }

      // Fallback: Append
      updateSegments([...segments, ...pastedSegments]);
      showNotification(`Inserted Section "${preset.name}"`);
  };

  const handleDeleteSectionPreset = (id: string) => {
      if (confirm("Delete this section preset?")) {
          setSectionPresets(prev => prev.filter(p => p.id !== id));
      }
  };


  // --- Reroll & Copy ---
  const handleReroll = useCallback(() => {
    setIsRerolling(true);
    setTimeout(() => {
      const next = segments.map(seg => {
        if (seg.type === 'random' && Array.isArray(seg.content) && seg.content.length > 0) {
          // Filter out disabled options
          const disabled = seg.disabledIndices || [];
          const enabledOptions = seg.content.filter((_, i) => !disabled.includes(i));
          
          if (enabledOptions.length > 0) {
              return { ...seg, activeValue: getRandom(enabledOptions) };
          }
          // If all disabled, keep current or first (it will be rendered dim anyway)
          return seg;
        }
        return seg;
      });
      saveSnapshot(next);
      setSegments(next); 
      setIsRerolling(false);
    }, 300);
  }, [segments]);

  const handleCopy = async () => {
    const success = await copyToClipboard(resultPrompt);
    if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    } else {
        showNotification("Copy Failed");
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (!editorContainerRef.current) return;
    
    // Ignore clicks on buttons/blocks/contentEditable=false areas
    // Note: Option blocks now handle their own clicks via stopPropagation to set selection
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('[contenteditable="false"]')) return;

    // Clear Option selection if clicking background
    setSelectedOptionId(null);

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
        // If the user clicked in the empty space to the right of a line
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
  
  // Unified paste handler
  const handlePasteData = async (text: string) => {
      if (!text) return;

      let pastedSegments: Segment[] | null = null;
      
      // Try parsing as Prismaflow fragment
      try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.type === ALCHEMIST_MIME_TYPE && Array.isArray(parsed.data)) {
              // Regenerate IDs
              pastedSegments = parsed.data.map((s: Segment) => ({ ...s, id: uuidv4() }));
          }
      } catch (e) {
          // Not JSON, ignore
      }

      if (selection.startId) {
          const index = segments.findIndex(s => s.id === selection.startId);
          if (index !== -1) {
              const seg = segments[index];
              
              if (seg.type === 'text') {
                   // Split and insert
                   const content = seg.content as string;
                   const offset = selection.startOffset;
                   let pre = content.substring(0, offset);
                   const post = content.substring(offset);

                   // NEW LOGIC: If we are pasting a Section (starting with a Label), 
                   // ensure it starts on a new line to preserve structural alignment.
                   // If 'pre' is not empty and doesn't end with a newline, append one.
                   if (pastedSegments && pastedSegments.length > 0 && pastedSegments[0].type === 'label') {
                       if (pre.length > 0 && !pre.endsWith('\n')) {
                           pre += '\n';
                       }
                   }
                   
                   const preSeg = { ...seg, content: pre };
                   const postSeg = { id: uuidv4(), type: 'text' as SegmentType, content: post };
                   
                   let newSegments = [...segments];
                   if (pastedSegments) {
                       newSegments.splice(index, 1, preSeg, ...pastedSegments, postSeg);
                   } else {
                       // Plain text paste
                       const newContent = pre + text + post;
                       newSegments[index] = {...seg, content: newContent};
                   }
                   updateSegments(newSegments);
                   return;
              } else {
                  // Insert after block
                  let newSegments = [...segments];
                  if (pastedSegments) {
                      newSegments.splice(index + 1, 0, ...pastedSegments);
                  } else {
                      newSegments.splice(index + 1, 0, { id: uuidv4(), type: 'text', content: text });
                  }
                  updateSegments(newSegments);
                  return;
              }
          }
      }
      
      // No selection fallback
      if (pastedSegments) {
          updateSegments([...segments, ...pastedSegments]);
      } else {
          // Append
          updateSegments([...segments, { id: uuidv4(), type: 'text', content: text }]);
      }
  };

  const handleNativePaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      handlePasteData(text);
  };

  const handleToolbarPaste = async () => {
      try {
          const text = await navigator.clipboard.readText();
          handlePasteData(text);
      } catch (e) {
          showNotification("Browser blocked paste. Please use Ctrl+V");
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

  const handleCopySection = async (id: string) => { 
      const groups = groupSegments(segments);
      const group = groups.find(g => g.labelSegment?.id === id);
      
      if (group && group.labelSegment) {
          const payload = {
              type: ALCHEMIST_MIME_TYPE,
              data: [group.labelSegment, ...group.contentSegments]
          };
          const text = JSON.stringify(payload);
          const success = await copyToClipboard(text);
          if (success) {
              showNotification("Section Copied");
          } else {
              showNotification("Copy Failed: Check Permissions");
          }
      }
      setActiveLabelMenuId(null);
  };

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
          // FIX: If we delete the current project, detach the workspace so next save works correctly
          if (currentProjectId === id) {
              setCurrentProjectId(null);
              showNotification("Project Deleted (Workspace Unsaved)");
          }
      }
  };
  
  // Backup Functions
  const handleExportBackup = () => {
      const backupData = {
          version: 1,
          timestamp: Date.now(),
          projects: savedProjects,
          optionPresets,
          sectionPresets
      };
      const filename = `prismaflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification("Backup Exported");
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const content = e.target?.result as string;
              const data = JSON.parse(content);
              
              if (!data || !data.version) throw new Error("Invalid backup file");

              let importedProjectsCount = 0;
              let importedOptionsCount = 0;
              let importedSectionsCount = 0;

              // Merge Projects
              if (Array.isArray(data.projects)) {
                  setSavedProjects(prev => {
                      const existingIds = new Set(prev.map(p => p.id));
                      const newItems = data.projects.map((p: SavedProject) => {
                          if (existingIds.has(p.id)) return { ...p, id: uuidv4(), name: p.name + ' (Imported)' };
                          return p;
                      });
                      importedProjectsCount = newItems.length;
                      return [...prev, ...newItems];
                  });
              }

              // Merge Option Presets
              if (Array.isArray(data.optionPresets)) {
                  setOptionPresets(prev => {
                      const existingIds = new Set(prev.map(p => p.id));
                      const newItems = data.optionPresets.map((p: OptionPreset) => {
                           if (existingIds.has(p.id)) return { ...p, id: uuidv4(), name: p.name + ' (Imported)' };
                           return p;
                      });
                      importedOptionsCount = newItems.length;
                      return [...prev, ...newItems];
                  });
              }

              // Merge Section Presets
              if (Array.isArray(data.sectionPresets)) {
                   setSectionPresets(prev => {
                      const existingIds = new Set(prev.map(p => p.id));
                      const newItems = data.sectionPresets.map((p: SectionPreset) => {
                           if (existingIds.has(p.id)) return { ...p, id: uuidv4(), name: p.name + ' (Imported)' };
                           return p;
                      });
                      importedSectionsCount = newItems.length;
                      return [...prev, ...newItems];
                  });
              }

              showNotification(`Restored: ${importedProjectsCount} Projects, ${importedOptionsCount} Options, ${importedSectionsCount} Sections`);
          } catch (err) {
              console.error(err);
              showNotification("Failed to parse backup file");
          }
          if (backupFileInputRef.current) backupFileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };
  
  const handleImportCSV = (e: any) => {};
  const handleImportClick = () => backupFileInputRef.current?.click();

  const groupsForCalc = groupSegments(segments);
  let currentHighlightColor = DEFAULT_TEXT_COLOR;
  
  // Logic to determine what to show in the RandomizerEditor modal
  const isEditorOpen = !!editingSegmentId || !!editingPresetId;
  const currentEditingData = useMemo(() => {
      if (editingSegmentId) {
          const seg = segments.find(s => s.id === editingSegmentId);
          if (seg && Array.isArray(seg.content)) {
              return { 
                  options: seg.content as string[], 
                  disabledIndices: seg.disabledIndices || [] 
              };
          }
      } else if (editingPresetId) {
          const preset = optionPresets.find(p => p.id === editingPresetId);
          if (preset) {
              // Presets currently don't store disabled state, so assume all enabled
              return { options: preset.options, disabledIndices: [] };
          }
      }
      return { options: [], disabledIndices: [] };
  }, [editingSegmentId, editingPresetId, segments, optionPresets]);
  
  const handleCloseEditor = () => {
      setEditingSegmentId(null);
      setEditingPresetId(null);
  };

  if (!segments) return <div className="min-h-screen bg-canvas-950 flex items-center justify-center text-canvas-500 font-mono">Loading Prismaflow...</div>;

  return (
    <div className="min-h-screen bg-canvas-950 flex flex-col items-center py-10 px-4 md:px-8">
      <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
      <input type="file" ref={backupFileInputRef} onChange={handleImportBackup} accept=".json" className="hidden" />
      
      {/* Notifications - FIXED: Strictly conditional rendering to prevent ghost icon */}
      {notification && notification.trim() !== '' && (
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 bg-canvas-800 border border-brand-500/50 text-brand-100 px-6 py-3 rounded-full shadow-lg z-50 transition-all opacity-100 translate-y-0`}>
          <Zap size={14} className="inline mr-2" />{notification}
      </div>
      )}

      {/* Help Button - Conditional render inside Modal check, but Button is always visible */}
      <button 
        onClick={() => setIsHelpModalOpen(true)}
        className="fixed top-6 right-6 p-2 text-canvas-500 hover:text-brand-400 transition-colors z-50 bg-canvas-900/50 rounded-full border border-canvas-800 hover:border-brand-500/50"
        title="Help & Guide"
      >
        <HelpCircle size={24} />
      </button>

      <header className="mb-8 text-center flex flex-col gap-2">
        <h1 className="text-4xl font-sans font-black tracking-tight text-white flex items-center justify-center gap-4">
          <Layers className="text-brand-500" size={32} /> PRISMAFLOW
        </h1>
        <p className="text-canvas-500 font-mono text-xs tracking-[0.2em] uppercase">Modular Prompt Engine</p>
      </header>

      {/* Mobile Layout Fix: Allow h-auto on mobile, fixed height on desktop */}
      <main className="w-full max-w-7xl flex flex-col lg:flex-row gap-6 items-start h-auto lg:h-[calc(100vh-200px)]">
        {/* Left Column (Toolbar + Editor) */}
        <div className="flex-1 w-full min-w-0 flex flex-col h-auto lg:h-full gap-4">
            {/* Toolbar - FIXED: Consistent px-3 py-2 padding, smaller text */}
            <div className="bg-canvas-900 border border-canvas-800 rounded-lg px-3 py-2 flex flex-col md:flex-row gap-4 justify-between items-center shrink-0">
                <div className="flex-1 w-full md:w-auto flex gap-2 items-center">
                    <input type="text" value={promptName} onChange={e => setPromptName(e.target.value)} className="bg-transparent text-sm font-bold text-white w-full focus:outline-none" placeholder="Untitled Project" />
                    {currentProjectId && <span className={`text-[10px] px-2 py-0.5 rounded-full border ${!isDirty ? 'bg-emerald-950 border-emerald-800 text-emerald-400' : 'bg-amber-950 border-amber-800 text-amber-400'}`}>{!isDirty ? 'Synced' : 'Edited'}</span>}
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={handleUndo} className="p-1.5 text-canvas-400 hover:text-white rounded" title="Undo"><Undo2 size={16}/></button>
                    <div className="w-px h-4 bg-canvas-800 mx-2"></div>
                    <button onClick={addLabel} className="p-1.5 text-canvas-400 hover:text-brand-400 rounded" title="Add Label"><Tag size={16}/></button>
                    <button onClick={convertToRandom} className={`p-1.5 rounded ${canRandomize ? 'text-brand-400' : 'text-canvas-600'}`} title="Randomize"><Zap size={16}/></button>
                    <div className="w-px h-4 bg-canvas-800 mx-2"></div>
                    <button onClick={handleToolbarPaste} className="p-1.5 text-canvas-400 hover:text-white rounded" title="Paste"><ClipboardPaste size={16}/></button>
                    <div className="w-px h-4 bg-canvas-800 mx-2"></div>
                    <button onClick={handleSaveProject} className="p-1.5 text-canvas-400 hover:text-white rounded" title="Save"><Save size={16}/></button>
                    <button onClick={handleSaveAsNew} className="p-1.5 text-canvas-400 hover:text-emerald-400 rounded" title="Save Copy"><FilePlus size={16}/></button>
                    
                    {/* Backup Controls */}
                    <button onClick={handleExportBackup} className="p-1.5 text-canvas-400 hover:text-sky-400 rounded" title="Export Backup"><Upload size={16}/></button>
                    <button onClick={handleImportClick} className="p-1.5 text-canvas-400 hover:text-purple-400 rounded" title="Import Backup"><Download size={16}/></button>
                    
                    <div className="w-px h-4 bg-canvas-800 mx-2"></div>
                    <button onClick={handleClear} className="p-1.5 text-canvas-400 hover:text-red-400 rounded" title="Clear"><Trash2 size={16}/></button>
                </div>
            </div>

            <div 
                ref={editorContainerRef}
                onClick={handleContainerClick}
                onCopy={handleNativeCopy}
                onPaste={handleNativePaste}
                // Mobile: Fixed height (400px) ensures editor is scrollable but doesn't fill screen. Desktop: Flex-1 fills available space.
                className="h-[400px] lg:h-auto lg:flex-1 bg-canvas-900/50 border border-canvas-800 rounded-lg p-6 overflow-y-auto custom-scrollbar shadow-inner relative z-10 cursor-text text-left leading-loose font-mono text-sm md:text-base"
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
                                onSaveToLibrary={handleOpenSaveSectionModal}
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
                        const isSelected = selectedOptionId === seg.id;
                        const allDisabled = Array.isArray(seg.content) && seg.content.length > 0 && seg.content.every((_, i) => seg.disabledIndices?.includes(i));
                        return (
                        <span
                            key={seg.id}
                            data-segment-id={seg.id}
                            contentEditable={false}
                            onClick={(e) => { e.stopPropagation(); setSelectedOptionId(seg.id); }}
                            className={`inline-flex items-center align-baseline mx-1 my-0.5 rounded border select-none group/opt relative shadow-sm transition-all hover:bg-canvas-800/80
                                ${isSelected ? 'border-brand-500 bg-brand-900/20 ring-1 ring-brand-500/50' : 'border-canvas-700 bg-canvas-800 hover:border-brand-500/50 hover:shadow-brand-500/10'}
                                ${allDisabled ? 'opacity-50 grayscale' : ''}
                            `}
                        >
                            {/* Value Display */}
                            <span 
                                className={`px-2 py-0.5 cursor-pointer hover:text-brand-100 transition-colors max-w-[200px] truncate font-mono text-sm ${allDisabled ? 'text-canvas-500' : ''}`}
                                title={`Options: ${(seg.content as string[]).join(', ')}`}
                            >
                                {seg.activeValue || '(empty)'}
                            </span>
                            
                            {/* Actions - Floating Bubble (Absolute Positioning) */}
                            {/* FIX: Hit area bridge. Container padded bottom to reach the parent block */}
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
                                        onClick={(e) => { e.stopPropagation(); deleteSegment(seg.id); }}
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

            <div className="bg-canvas-950 border border-canvas-800 rounded-lg flex flex-col shrink-0 min-h-[140px]">
                {/* Generated Prompt Header - FIXED: Consistent px-3 py-2 padding */}
                <div className="bg-canvas-900/50 px-3 py-2 border-b border-canvas-800 flex justify-between items-center">
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

        {/* Tabbed Sidebar - Mobile: h-auto allows it to flow naturally. Desktop: Fixed width & full height. */}
        <div className="w-full lg:w-72 flex-shrink-0 h-auto lg:h-full flex flex-col bg-canvas-900 border border-canvas-800 rounded-lg overflow-hidden">
             
             {/* Tab Header - FIXED: Consistent py-2 padding */}
             <div className="flex shrink-0 border-b border-canvas-800">
                <button 
                    onClick={() => setActiveSidebarTab('library')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeSidebarTab === 'library' ? 'bg-canvas-800 text-brand-400 border-b-2 border-brand-500' : 'bg-canvas-900 text-canvas-500 hover:text-canvas-300 hover:bg-canvas-800/50'}`}
                >
                    <Library size={14}/> Library
                </button>
                <button 
                    onClick={() => setActiveSidebarTab('projects')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeSidebarTab === 'projects' ? 'bg-canvas-800 text-brand-400 border-b-2 border-brand-500' : 'bg-canvas-900 text-canvas-500 hover:text-canvas-300 hover:bg-canvas-800/50'}`}
                >
                    <Book size={14}/> Projects
                </button>
             </div>

             {/* Tab Content: Library */}
             {activeSidebarTab === 'library' && (
                 <div className="flex flex-col lg:flex-1 lg:overflow-hidden">
                     {/* 1. Option Presets */}
                     <div className="flex flex-col lg:flex-1 lg:min-h-0 border-b border-canvas-800">
                         {/* Library Headers - FIXED: Consistent px-3 py-2 padding */}
                         <div className="px-3 py-2 bg-canvas-950/30 flex items-center justify-between">
                            <h4 className="text-canvas-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><Folder size={12}/> Options</h4>
                            <button 
                                onClick={handleOpenSavePresetModal}
                                disabled={!selectedOptionId}
                                className="p-1 rounded hover:bg-brand-600/20 text-brand-400 hover:text-brand-300 disabled:opacity-20 transition-colors"
                                title="Save selected Option"
                            >
                                <Plus size={14}/>
                            </button>
                         </div>
                         <div className="p-2 space-y-1 lg:flex-1 lg:overflow-y-auto custom-scrollbar">
                             {optionPresets.length === 0 && <div className="py-6 text-center text-canvas-600 text-xs italic">No options saved</div>}
                             {optionPresets.map(preset => (
                                <div key={preset.id} className="group border border-transparent hover:border-canvas-700 bg-canvas-800/30 hover:bg-canvas-800 rounded-md p-2 transition-all">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-bold text-canvas-300 group-hover:text-white truncate">{preset.name}</span>
                                        <button onClick={() => setEditingPresetId(preset.id)} className="opacity-0 group-hover:opacity-100 text-canvas-500 hover:text-white"><Edit3 size={10} /></button>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleInsertPreset(preset)} className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] bg-canvas-700 hover:bg-brand-600 text-canvas-300 hover:text-white rounded transition-colors">Add</button>
                                        <button onClick={() => handleReplacePreset(preset)} disabled={!selectedOptionId} className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] bg-canvas-700 hover:bg-brand-600 text-canvas-300 hover:text-white rounded disabled:opacity-30 disabled:hover:bg-canvas-700">Swap</button>
                                        <button onClick={() => handleDeletePreset(preset.id)} className="px-1.5 py-1 bg-canvas-700 hover:bg-red-500 text-canvas-400 hover:text-white rounded"><Trash2 size={10}/></button>
                                    </div>
                                </div>
                             ))}
                         </div>
                     </div>

                     {/* 2. Section Presets */}
                     <div className="flex flex-col lg:flex-1 lg:min-h-0">
                         {/* Library Headers - FIXED: Consistent px-3 py-2 padding */}
                         <div className="px-3 py-2 bg-canvas-950/30 flex items-center justify-between border-t border-canvas-800">
                            <h4 className="text-canvas-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><LayoutTemplate size={12}/> Sections</h4>
                            {/* Save handled via Label Menu */}
                         </div>
                         <div className="p-2 space-y-1 lg:flex-1 lg:overflow-y-auto custom-scrollbar">
                             {sectionPresets.length === 0 && <div className="py-6 text-center text-canvas-600 text-xs italic">No sections saved</div>}
                             {sectionPresets.map(preset => (
                                <div key={preset.id} className="group border border-transparent hover:border-canvas-700 bg-canvas-800/30 hover:bg-canvas-800 rounded-md p-2 transition-all flex items-center justify-between">
                                    <div className="overflow-hidden">
                                        <span className="text-xs font-bold text-canvas-300 group-hover:text-white truncate block">{preset.name}</span>
                                        <span className="text-[10px] text-canvas-500">{preset.data.length} segments</span>
                                    </div>
                                    <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleInsertSectionPreset(preset)} className="p-1.5 bg-canvas-700 hover:bg-brand-600 text-canvas-300 hover:text-white rounded" title="Insert Section"><Plus size={12}/></button>
                                        <button onClick={() => handleDeleteSectionPreset(preset.id)} className="p-1.5 bg-canvas-700 hover:bg-red-500 text-canvas-300 hover:text-white rounded" title="Delete Section"><Trash2 size={12}/></button>
                                    </div>
                                </div>
                             ))}
                         </div>
                     </div>
                 </div>
             )}

             {/* Tab Content: Projects */}
             {activeSidebarTab === 'projects' && (
                 <div className="p-2 space-y-1 lg:flex-1 lg:overflow-y-auto custom-scrollbar">
                     {savedProjects.length === 0 && <div className="flex flex-col items-center justify-center h-full text-canvas-600 space-y-3 text-center p-4"><Package size={32} className="opacity-20"/><p className="text-xs">No projects saved.</p></div>}
                     {savedProjects.map(p => (
                        <div key={p.id} onClick={() => handleLoadProject(p)} className={`group border rounded-md p-3 cursor-pointer ${currentProjectId === p.id ? 'bg-brand-900/10 border-brand-500/40' : 'bg-transparent border-transparent hover:bg-canvas-800 hover:border-canvas-700'}`}>
                            <div className="flex justify-between items-start">
                                <h4 className={`text-sm font-medium truncate pr-2 ${currentProjectId === p.id ? 'text-brand-200' : 'text-canvas-300 group-hover:text-white'}`}>{p.name}</h4>
                                <button onClick={(e) => handleDeleteProject(p.id, e)} className="text-canvas-600 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1 hover:bg-canvas-900 rounded"><X size={12}/></button>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-canvas-500 mt-1.5 font-mono"><Clock size={10}/>{new Date(p.updatedAt).toLocaleDateString()}</div>
                        </div>
                     ))}
                 </div>
             )}
        </div>
      </main>

      <footer className="mt-8 text-canvas-600 text-[10px] font-mono uppercase tracking-widest">Prismaflow Engine v1.1</footer>

      {/* Editor Modal (Used for both Canvas Blocks and Library Presets) */}
      {isEditorOpen && (
        <Modal isOpen={isEditorOpen} onClose={handleCloseEditor} title={editingPresetId ? "Edit Preset Options" : "Edit Block Options"}>
          <div className="space-y-6">
             <RandomizerEditor 
                options={currentEditingData.options} 
                disabledIndices={currentEditingData.disabledIndices}
                onSave={updateRandomOptions} 
             />
             {editingSegmentId && (
                <div className="pt-4 border-t border-canvas-800 flex justify-end">
                    <button onClick={() => deleteSegment(editingSegmentId)} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-xs px-3 py-2 rounded hover:bg-red-900/20 uppercase font-bold tracking-wider"><Trash2 size={14}/> Delete Block</button>
                </div>
             )}
          </div>
        </Modal>
      )}

      {/* Save Preset Modal - Conditionally Rendered */}
      {isSavePresetModalOpen && (
        <Modal isOpen={isSavePresetModalOpen} onClose={() => setIsSavePresetModalOpen(false)} title="Save Option Preset">
           <div className="space-y-4 font-sans">
               <div className="bg-brand-900/20 p-3 rounded border border-brand-500/30 flex items-center gap-3">
                   <FolderPlus className="text-brand-400" size={18} />
                   <p className="text-xs text-brand-200">
                       Save the current options as a reusable preset.
                   </p>
               </div>
               <div className="space-y-2">
                   <label className="text-xs font-bold text-canvas-400 uppercase tracking-wider">Preset Name</label>
                   <input 
                       type="text" 
                       value={presetNameInput}
                       onChange={(e) => setPresetNameInput(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && confirmSavePreset()}
                       placeholder="e.g. Cyberpunk Characters"
                       className="w-full bg-canvas-950 border border-canvas-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                       autoFocus
                   />
               </div>
               <div className="flex justify-end gap-2 pt-2">
                   <button onClick={() => setIsSavePresetModalOpen(false)} className="px-3 py-2 text-xs font-bold text-canvas-400 hover:text-white">Cancel</button>
                   <button onClick={confirmSavePreset} className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-bold shadow-lg shadow-brand-500/20">Save Preset</button>
               </div>
           </div>
        </Modal>
      )}

      {/* Save Section Modal - Conditionally Rendered */}
      {isSaveSectionModalOpen && (
        <Modal isOpen={isSaveSectionModalOpen} onClose={() => setIsSaveSectionModalOpen(false)} title="Save Section to Library">
           <div className="space-y-4 font-sans">
               <div className="bg-brand-900/20 p-3 rounded border border-brand-500/30 flex items-center gap-3">
                   <LayoutTemplate className="text-brand-400" size={18} />
                   <p className="text-xs text-brand-200">
                       Save this section (Label + Content) to your library.
                   </p>
               </div>
               <div className="space-y-2">
                   <label className="text-xs font-bold text-canvas-400 uppercase tracking-wider">Section Name</label>
                   <input 
                       type="text" 
                       value={presetNameInput}
                       onChange={(e) => setPresetNameInput(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && confirmSaveSection()}
                       placeholder="e.g. Lighting Setup"
                       className="w-full bg-canvas-950 border border-canvas-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                       autoFocus
                   />
               </div>
               <div className="flex justify-end gap-2 pt-2">
                   <button onClick={() => setIsSaveSectionModalOpen(false)} className="px-3 py-2 text-xs font-bold text-canvas-400 hover:text-white">Cancel</button>
                   <button onClick={confirmSaveSection} className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-bold shadow-lg shadow-brand-500/20">Save Section</button>
               </div>
           </div>
        </Modal>
      )}

      {/* Help Modal - Conditionally Rendered */}
      {isHelpModalOpen && (
        <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      )}
    </div>
  );
}