
import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Layers, Zap, Trash2, Save, HelpCircle, Edit3, Type, Tag,
  FolderPlus, LayoutTemplate,
  LABEL_ICONS // Import label icon map
} from './components/Icons';
import { Segment, SelectionState, SavedProject, SegmentType, OptionPreset, SectionPreset } from './types';
import { normalizeSegments, getRandom, copyToClipboard, groupSegments } from './utils';

// Components
import { Modal } from './components/Modal';
import { RandomizerEditor } from './components/RandomizerEditor';
import { LabelMenu } from './components/LabelMenu';
import { HelpModal } from './components/HelpModal';
import { EditableSpan } from './components/EditableSpan';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { PromptOutput } from './components/PromptOutput';

// Custom MIME type for internal copy/paste
const ALCHEMIST_MIME_TYPE = 'application/x-prismaflow-fragment';

// Colors for labels - Adjusted to 500 scale for reduced eye fatigue (Less Neon)
const LABEL_COLORS = [
  '#0ea5e9', // Sky 500
  '#22c55e', // Green 500
  '#f97316', // Orange 500
  '#a855f7', // Purple 500
  '#ec4899', // Pink 500
  '#14b8a6', // Teal 500
  '#eab308', // Yellow 500
];

const DEFAULT_TEXT_COLOR = '#94a3b8'; // Slate 400 (Muted for default text)

// Updated Storage Keys
const STORAGE_KEY = 'prismaflow_current_workspace';
const PROJECTS_KEY = 'prismaflow_saved_projects';
const OPTION_PRESETS_KEY = 'prismaflow_option_presets';
const SECTION_PRESETS_KEY = 'prismaflow_section_presets';


export default function App() {
  // --- Initialization ---
  const initialSegments: Segment[] = [
    { id: uuidv4(), type: 'label', content: 'Composition', color: LABEL_COLORS[0], icon: 'Layers' }, 
    { id: uuidv4(), type: 'text', content: 'editorial fashion photography, wide shot, three models standing in a ' },
    { id: uuidv4(), type: 'random', content: ['minimalist concrete hall', 'neon-lit subway', 'industrial warehouse'], activeValue: 'minimalist concrete hall' },
    { id: uuidv4(), type: 'text', content: '. High contrast lighting. \n' },
    
    { id: uuidv4(), type: 'label', content: 'Model_Left', color: LABEL_COLORS[1], icon: 'User' }, 
    { id: uuidv4(), type: 'text', content: 'Left figure wearing ' },
    { id: uuidv4(), type: 'random', content: ['an oversized trench coat', 'a vinyl jacket', 'a denim blazer'], activeValue: 'an oversized trench coat' },
    { id: uuidv4(), type: 'text', content: ' and ' },
    { id: uuidv4(), type: 'random', content: ['baggy cargo trousers', 'wide-leg pants', 'distressed jeans'], activeValue: 'baggy cargo trousers' },
    { id: uuidv4(), type: 'text', content: '. \n' },

    { id: uuidv4(), type: 'label', content: 'Model_Center', color: LABEL_COLORS[3], icon: 'User' },
    { id: uuidv4(), type: 'text', content: 'Center figure in ' },
    { id: uuidv4(), type: 'random', content: ['a metallic silver bodysuit', 'a matte black vest', 'an asymmetric dress'], activeValue: 'a metallic silver bodysuit' },
    { id: uuidv4(), type: 'text', content: ' with ' },
    { id: uuidv4(), type: 'random', content: ['geometric sunglasses', 'a chrome face mask', 'silver chains'], activeValue: 'geometric sunglasses' },
    { id: uuidv4(), type: 'text', content: '. \n' },

    { id: uuidv4(), type: 'label', content: 'Model_Right', color: LABEL_COLORS[2], icon: 'User' },
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
  const [selectedLibraryOptionId, setSelectedLibraryOptionId] = useState<string | null>(null);
  const [selectedSidebarProjectId, setSelectedSidebarProjectId] = useState<string | null>(null);

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
  
  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'option' | 'section', id: string, name: string } | null>(null);
  // Overwrite Confirmation State
  const [overwriteTarget, setOverwriteTarget] = useState<{ id: string, name: string } | null>(null);

  const labelRefs = useRef<{[key: string]: HTMLElement | null}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);


  // --- Actions ---

  // Global click handler to deselect sidebar items
  const handleGlobalClick = () => {
    // Disabled global deselection to persist Library selection while editing on canvas
    // setSelectedLibraryOptionId(null);
    // setSelectedSidebarProjectId(null);
  };
  
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
  const resultPrompt = useMemo(() => {
    let prompt = '';
    // Filter out labels first to see the flow of content for logical comma placement
    const contentSegments = segments.filter(s => s.type !== 'label');
    
    contentSegments.forEach((seg, idx) => {
        let text = '';
        if (seg.type === 'text') {
            text = seg.content as string;
        } else if (seg.type === 'random') {
            const disabled = seg.disabledIndices || [];
            const options = seg.content as string[];
            // Logic for active value
            let val = '';
            if (options.length > 0 && !options.every((_, i) => disabled.includes(i))) {
                val = seg.activeValue || '';
            }
            
            if (val) {
                text = val;
                // Auto-Comma Logic:
                const next = contentSegments[idx + 1];
                let addComma = true;
                
                if (!next) {
                    addComma = false;
                } else if (next.type === 'text') {
                    const nextContent = next.content as string;
                    if (/^\s*[.,;?!]/.test(nextContent)) {
                        addComma = false;
                    }
                }
                
                if (addComma) {
                    text += ', '; 
                }
            }
        }
        prompt += text;
    });
    return prompt;
  }, [segments]);

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
    setSegments(prev => prev.map(s => s.id === id ? { ...s, content: newText } : s));
  };

  const handleSplit = (id: string, index: number) => {
    const segIdx = segments.findIndex(s => s.id === id);
    if (segIdx === -1) return;
    const seg = segments[segIdx];
    const content = seg.content as string;
    
    const pre = content.substring(0, index) + '\n';
    const post = content.substring(index); 

    const newSegs: Segment[] = [
        { ...seg, content: pre },
        { id: uuidv4(), type: 'text', content: post } 
    ];
    
    const result = [...segments];
    result.splice(segIdx, 1, ...newSegs);
    
    const normalized = normalizeSegments(result);
    saveSnapshot(normalized);
    setSegments(normalized);
    
    const newId = newSegs[1].id;
    if (normalized.find(s => s.id === newId)) {
        setFocusRequest({ id: newId, offset: 0 });
    } else {
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
        newSegments[index - 1] = { ...previous, content: newContent };
        newSegments.splice(index, 1);
        focusTarget = { id: previous.id, offset: mergeOffset };

    } else if (previous.type !== 'text') {
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
    const newLabel: Segment = { id: uuidv4(), type: 'label', content: '', color: color, icon: 'Tag' };
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
      setTimeout(() => setSelectedOptionId(newRandomId), 0);
      return normalized;
    });
    
    setSelection({ startId: null, endId: null, startOffset: 0, endOffset: 0, text: '' });
  };

  const handleFlattenOption = (id: string) => {
    const index = segments.findIndex(s => s.id === id);
    if (index === -1) return;
    const seg = segments[index];
    const text = seg.activeValue || '';
    
    const newSegments = [...segments];
    newSegments[index] = { id: uuidv4(), type: 'text', content: text };
    
    updateSegments(newSegments);
    setEditingSegmentId(null);
    setSelectedOptionId(null);
    showNotification("Converted to Text");
  };

  const updateRandomOptions = (newOptions: string[], newDisabledIndices: number[]) => {
    if (editingSegmentId) {
        const newSegments = segments.map(s => {
          if (s.id === editingSegmentId) {
            let newActive = s.activeValue;
            
            const activeIndex = newOptions.indexOf(newActive || '');
            const isActiveDisabled = activeIndex !== -1 && newDisabledIndices.includes(activeIndex);
            const isRemoved = activeIndex === -1;

            if (isRemoved || isActiveDisabled) {
                const firstEnabledIndex = newOptions.findIndex((_, idx) => !newDisabledIndices.includes(idx));
                if (firstEnabledIndex !== -1) {
                    newActive = newOptions[firstEnabledIndex];
                } else {
                    newActive = newOptions.length > 0 ? newOptions[0] : '';
                }
            }
            
            return { ...s, content: newOptions, activeValue: newActive, disabledIndices: newDisabledIndices };
          }
          return s;
        });
        updateSegments(newSegments);
    } else if (editingPresetId) {
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

      if (selectedOptionId) {
          const index = newSegments.findIndex(s => s.id === selectedOptionId);
          if (index !== -1) {
              newSegments.splice(index + 1, 0, newSeg);
              updateSegments(newSegments);
              showNotification(`Inserted "${preset.name}"`);
              return;
          }
      }

      if (selection.startId) {
          const index = newSegments.findIndex(s => s.id === selection.startId);
          if (index !== -1) {
              const seg = newSegments[index];
              if (seg.type === 'text') {
                  const content = seg.content as string;
                  const offset = selection.startOffset;
                  
                  const pre = content.substring(0, offset);
                  const post = content.substring(offset);
                  
                  const preSeg = { ...seg, content: pre };
                  const postSeg = { id: uuidv4(), type: 'text' as SegmentType, content: post };
                  
                  newSegments.splice(index, 1, preSeg, newSeg, postSeg);
              } else {
                  newSegments.splice(index + 1, 0, newSeg);
              }
              updateSegments(newSegments);
              showNotification(`Inserted "${preset.name}"`);
              return;
          }
      }

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
          disabledIndices: [] 
      };
      
      const newSegments = [...segments];
      newSegments[index] = newSeg;
      updateSegments(newSegments);
      showNotification(`Replaced with "${preset.name}"`);
  };

  const handleDeletePreset = (id: string) => {
      const p = optionPresets.find(x => x.id === id);
      if(p) setDeleteTarget({ type: 'option', id, name: p.name });
  };

  // --- Section Preset Actions ---

  const handleOpenSaveSectionModal = () => {
      if (!activeLabelMenuId) return;
      const group = groupSegments(segments).find(g => g.labelSegment?.id === activeLabelMenuId);
      if (!group || !group.labelSegment) return;
      
      setPresetNameInput(group.labelSegment.content as string);
      setSavingSectionId(activeLabelMenuId); 
      setActiveLabelMenuId(null); 
      setIsSaveSectionModalOpen(true);
  };

  const confirmSaveSection = () => {
      if (!savingSectionId || !presetNameInput.trim()) return; 
      
      const name = presetNameInput.trim();
      const existing = sectionPresets.find(p => p.name === name);

      if (existing) {
          setIsSaveSectionModalOpen(false); 
          setOverwriteTarget({ id: existing.id, name: existing.name });
      } else {
          const group = groupSegments(segments).find(g => g.labelSegment?.id === savingSectionId);
          if (!group || !group.labelSegment) return;

          const newPreset: SectionPreset = {
              id: uuidv4(),
              name: name,
              data: [group.labelSegment, ...group.contentSegments]
          };

          setSectionPresets(prev => [...prev, newPreset]);
          setIsSaveSectionModalOpen(false);
          setSavingSectionId(null);
          showNotification("Section Saved to Library");
      }
  };
  
  const executeSectionOverwrite = () => {
      if (!overwriteTarget || !savingSectionId) return;

      const group = groupSegments(segments).find(g => g.labelSegment?.id === savingSectionId);
      if (!group || !group.labelSegment) return;

      setSectionPresets(prev => prev.map(p => {
          if (p.id === overwriteTarget.id) {
              return {
                  ...p,
                  data: [group.labelSegment!, ...group.contentSegments],
              };
          }
          return p;
      }));

      setOverwriteTarget(null);
      setSavingSectionId(null);
      showNotification("Section Overwritten");
  };

  const handleInsertSectionPreset = (preset: SectionPreset) => {
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

      updateSegments([...segments, ...pastedSegments]);
      showNotification(`Inserted Section "${preset.name}"`);
  };

  const handleDeleteSectionPreset = (id: string) => {
      const p = sectionPresets.find(x => x.id === id);
      if(p) setDeleteTarget({ type: 'section', id, name: p.name });
  };


  // --- Reroll & Copy ---
  const handleReroll = useCallback(() => {
    setIsRerolling(true);
    setTimeout(() => {
      const next = segments.map(seg => {
        if (seg.type === 'random' && Array.isArray(seg.content) && seg.content.length > 0) {
          const disabled = seg.disabledIndices || [];
          const enabledOptions = seg.content.filter((_, i) => !disabled.includes(i));
          
          if (enabledOptions.length > 0) {
              return { ...seg, activeValue: getRandom(enabledOptions) };
          }
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
    
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('[contenteditable="false"]')) return;

    const currentSel = window.getSelection();
    if (currentSel && !currentSel.isCollapsed && currentSel.toString().length > 0) {
        return;
    }

    const clickY = e.clientY;
    const spans = Array.from(editorContainerRef.current.querySelectorAll('span[data-segment-id]'));
    
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
        candidates = getCandidates(6);
    }

    if (candidates.length > 0) {
        candidates.sort((a, b) => b.rect.right - a.rect.right);
        const rightMost = candidates[0];

        if (e.clientX > rightMost.rect.right) {
             const span = rightMost.span;
             const text = span.textContent || '';
             
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

        if ((document as any).caretRangeFromPoint) {
            const range = (document as any).caretRangeFromPoint(e.clientX, clickY);
            if (range) {
                const container = editorContainerRef.current;
                if (range.startContainer === container || container.contains(range.startContainer) && range.startContainer.nodeName === 'DIV') {
                     const span = rightMost.span;
                     span.focus();
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

                const rangeRects = range.getClientRects();
                if (rangeRects.length > 0) {
                    const caretRect = rangeRects[0];
                    if (caretRect.top > rightMost.rect.bottom - 2) {
                         if (range.startContainer.nodeType === Node.TEXT_NODE) {
                             const content = range.startContainer.textContent || '';
                             if (range.startOffset > 0 && content[range.startOffset - 1] === '\n') {
                                 range.setStart(range.startContainer, range.startOffset - 1);
                                 range.collapse(true);
                             }
                         }
                    }
                }

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
                
                const containerSpan = range.startContainer.parentElement?.closest('span[data-segment-id]') as HTMLElement;
                containerSpan?.focus();
                return;
            }
        }
    }
  };

  const handleNativeCopy = () => {};
  
  const handlePasteData = async (text: string) => {
      if (!text) return;

      let pastedSegments: Segment[] | null = null;
      
      try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.type === ALCHEMIST_MIME_TYPE && Array.isArray(parsed.data)) {
              pastedSegments = parsed.data.map((s: Segment) => ({ ...s, id: uuidv4() }));
          }
      } catch (e) {
      }

      if (selection.startId) {
          const index = segments.findIndex(s => s.id === selection.startId);
          if (index !== -1) {
              const seg = segments[index];
              
              if (seg.type === 'text') {
                   const content = seg.content as string;
                   const offset = selection.startOffset;
                   let pre = content.substring(0, offset);
                   const post = content.substring(offset);

                   if (pastedSegments && pastedSegments.length > 0 && pastedSegments[0].type === 'label') {
                       if (pre.length > 0 && !pre.endsWith('\n')) {
                           pre += '\n';
                       }
                   }
                   
                   let newSegments = [...segments];
                   if (pastedSegments) {
                       const preSeg = { ...seg, content: pre };
                       const postSeg = { id: uuidv4(), type: 'text' as SegmentType, content: post };
                       newSegments.splice(index, 1, preSeg, ...pastedSegments, postSeg);
                   } else {
                       const lines = text.split(/\r\n|\r|\n/);
                       if (lines.length === 1) {
                            const newContent = pre + text + post;
                            newSegments[index] = {...seg, content: newContent};
                       } else {
                            const segmentsToInsert: Segment[] = [];
                            lines.forEach((line, i) => {
                                const isLastLine = i === lines.length - 1;
                                let lineContent = line;
                                if (!isLastLine) {
                                    lineContent += '\n';
                                }
                                if (i === 0) {
                                    lineContent = pre + lineContent;
                                }
                                if (isLastLine) {
                                    lineContent = lineContent + post;
                                }
                                segmentsToInsert.push({ id: uuidv4(), type: 'text', content: lineContent });
                            });
                            newSegments.splice(index, 1, ...segmentsToInsert);
                       }
                   }
                   updateSegments(newSegments);
                   return;
              } else {
                  let newSegments = [...segments];
                  if (pastedSegments) {
                      newSegments.splice(index + 1, 0, ...pastedSegments);
                  } else {
                       const lines = text.split(/\r\n|\r|\n/);
                       const segmentsToInsert = lines.map((line, i) => {
                           const isLastLine = i === lines.length - 1;
                           return {
                               id: uuidv4(),
                               type: 'text' as SegmentType,
                               content: isLastLine ? line : (line + '\n')
                           };
                       });
                      newSegments.splice(index + 1, 0, ...segmentsToInsert);
                  }
                  updateSegments(newSegments);
                  return;
              }
          }
      }
      
      if (pastedSegments) {
          updateSegments([...segments, ...pastedSegments]);
      } else {
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
  
  const handleDuplicateSavedProject = () => {
    if (!selectedSidebarProjectId) return;
    const p = savedProjects.find(x => x.id === selectedSidebarProjectId);
    if (!p) return;

    const newProject: SavedProject = {
        ...p,
        id: uuidv4(),
        name: `${p.name} (Copy)`,
        updatedAt: Date.now()
    };
    setSavedProjects(prev => [newProject, ...prev]);
    showNotification("Project Duplicated");
  };

  const handleDeleteProject = (id: string) => {
      const p = savedProjects.find(x => x.id === id);
      if (p) setDeleteTarget({ type: 'project', id, name: p.name });
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
  
  const executeDelete = () => {
      if (!deleteTarget) return;
      const { type, id } = deleteTarget;
      
      if (type === 'project') {
          setSavedProjects(prev => prev.filter(p => p.id !== id));
          if (currentProjectId === id) {
              setCurrentProjectId(null);
              showNotification("Project Deleted (Workspace Unsaved)");
          }
          if (selectedSidebarProjectId === id) setSelectedSidebarProjectId(null);
      } else if (type === 'option') {
          setOptionPresets(prev => prev.filter(p => p.id !== id));
          if (selectedLibraryOptionId === id) setSelectedLibraryOptionId(null); 
      } else if (type === 'section') {
          setSectionPresets(prev => prev.filter(p => p.id !== id));
      }
      setDeleteTarget(null);
  };

  if (!segments) return <div className="min-h-screen bg-canvas-950 flex items-center justify-center text-canvas-500 font-mono">Loading Prismaflow...</div>;

  return (
    <div className="min-h-screen bg-canvas-950 flex flex-col items-center py-10 px-4 md:px-8" onClick={handleGlobalClick}>
      <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
      <input type="file" ref={backupFileInputRef} onChange={handleImportBackup} accept=".json" className="hidden" />
      
      {/* Notifications */}
      {notification && notification.trim() !== '' && (
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 bg-canvas-800 border border-brand-500/50 text-brand-100 px-6 py-3 rounded-full shadow-lg z-50 transition-all opacity-100 translate-y-0`}>
          <Zap size={14} className="inline mr-2" />{notification}
      </div>
      )}

      {/* Help Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); setIsHelpModalOpen(true); }}
        className="fixed z-50 p-2 text-canvas-500 hover:text-brand-400 transition-colors bg-canvas-900/50 rounded-full border border-canvas-800 hover:border-brand-500/50 right-4 bottom-6 lg:bottom-auto lg:top-6 lg:right-6"
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

      {/* Main Content Area */}
      <main className="w-full max-w-7xl flex flex-col lg:flex-row gap-6 items-start h-auto lg:h-[calc(100vh-200px)]">
        {/* Left Column (Toolbar + Editor) */}
        <div className="flex-1 w-full min-w-0 flex flex-col h-auto lg:h-full gap-4">
            
            <Toolbar 
              promptName={promptName}
              setPromptName={setPromptName}
              currentProjectId={currentProjectId}
              isDirty={isDirty}
              canRandomize={canRandomize}
              onUndo={handleUndo}
              onAddLabel={addLabel}
              onRandomize={convertToRandom}
              onPaste={handleToolbarPaste}
              onSave={handleSaveProject}
              onSaveAsNew={handleSaveAsNew}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportClick}
              onClear={handleClear}
            />

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
                                onRename={(name) => handleUpdateLabel(seg.id, { content: name })}
                                onColorChange={(color) => handleUpdateLabel(seg.id, { color: color })}
                                onIconChange={(iconKey) => handleUpdateLabel(seg.id, { icon: iconKey })}
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
                                        onClick={(e) => { e.stopPropagation(); handleFlattenOption(seg.id); }}
                                        className="p-1 hover:bg-purple-600 hover:text-white text-canvas-400 transition-colors rounded"
                                        title="Convert to Text"
                                    >
                                        <Type size={14} />
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
            
            <PromptOutput 
              promptText={resultPrompt}
              isRerolling={isRerolling}
              copied={copied}
              onReroll={handleReroll}
              onCopy={handleCopy}
            />

        </div>

        {/* Tabbed Sidebar */}
        <Sidebar 
          activeTab={activeSidebarTab}
          setActiveTab={setActiveSidebarTab}
          optionPresets={optionPresets}
          sectionPresets={sectionPresets}
          savedProjects={savedProjects}
          selectedLibraryOptionId={selectedLibraryOptionId}
          setSelectedLibraryOptionId={setSelectedLibraryOptionId}
          selectedSidebarProjectId={selectedSidebarProjectId}
          setSelectedSidebarProjectId={setSelectedSidebarProjectId}
          currentProjectId={currentProjectId}
          canSaveOption={!!selectedOptionId}
          onOpenSavePresetModal={handleOpenSavePresetModal}
          onInsertPreset={handleInsertPreset}
          onReplacePreset={handleReplacePreset}
          onEditPreset={setEditingPresetId}
          onDeletePreset={handleDeletePreset}
          onInsertSection={handleInsertSectionPreset}
          onDeleteSection={handleDeleteSectionPreset}
          onLoadProject={handleLoadProject}
          onDuplicateProject={handleDuplicateSavedProject}
          onDeleteProject={handleDeleteProject}
        />
      </main>

      <footer className="mt-8 text-canvas-600 text-[10px] font-mono uppercase tracking-widest">Prismaflow Engine v1.2</footer>

      {/* Editor Modal (Used for both Canvas Blocks and Library Presets) */}
      {isEditorOpen && (
        <Modal isOpen={isEditorOpen} onClose={handleCloseEditor} title={editingPresetId ? "Edit Preset Options" : "Edit Block Options"}>
          <div className="space-y-6" onClick={e => e.stopPropagation()}>
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
           <div className="space-y-4 font-sans" onClick={e => e.stopPropagation()}>
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
           <div className="space-y-4 font-sans" onClick={e => e.stopPropagation()}>
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
      
      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
            <div className="space-y-4 font-sans" onClick={e => e.stopPropagation()}>
                <div className="bg-red-900/20 p-3 rounded border border-red-500/30 flex items-center gap-3">
                   <Trash2 className="text-red-400" size={18} />
                   <p className="text-xs text-red-200">
                       Are you sure you want to delete <strong className="text-white">"{deleteTarget.name}"</strong>? This action cannot be undone.
                   </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                   <button onClick={() => setDeleteTarget(null)} className="px-3 py-2 text-xs font-bold text-canvas-400 hover:text-white">Cancel</button>
                   <button onClick={executeDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold shadow-lg shadow-red-500/20">Delete Forever</button>
                </div>
            </div>
        </Modal>
      )}

      {/* Overwrite Confirmation Modal (For Sections) */}
      {overwriteTarget && (
        <Modal isOpen={!!overwriteTarget} onClose={() => { setOverwriteTarget(null); setSavingSectionId(null); }} title="Confirm Overwrite">
            <div className="space-y-4 font-sans" onClick={e => e.stopPropagation()}>
                <div className="bg-amber-900/20 p-3 rounded border border-amber-500/30 flex items-center gap-3">
                   <Save className="text-amber-400" size={18} />
                   <div className="space-y-1">
                       <p className="text-xs text-amber-200 font-bold uppercase tracking-wide">Duplicate Found</p>
                       <p className="text-xs text-amber-200/80">
                           A section named <strong className="text-white">"{overwriteTarget.name}"</strong> already exists in your library.
                       </p>
                   </div>
                </div>
                <p className="text-xs text-canvas-400 text-center">
                    Do you want to overwrite the existing section with this new version?
                </p>
                <div className="flex justify-end gap-2 pt-2">
                   <button onClick={() => { setOverwriteTarget(null); setSavingSectionId(null); }} className="px-3 py-2 text-xs font-bold text-canvas-400 hover:text-white">Cancel</button>
                   <button onClick={executeSectionOverwrite} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold shadow-lg shadow-amber-500/20">Overwrite</button>
                </div>
            </div>
        </Modal>
      )}

      {/* Help Modal */}
      {isHelpModalOpen && (
          <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      )}
    </div>
  );
}
