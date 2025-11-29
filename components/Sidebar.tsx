import React, { useMemo } from 'react';
import { 
  Library, Book, Folder, FolderPlus, ClipboardPaste, 
  ArrowRightLeft, Edit3, Trash2, LayoutTemplate, 
  FolderOpen, Copy, Package, Clock
} from './Icons';
import { SavedProject, OptionPreset, SectionPreset } from '../types';

interface SidebarProps {
  activeTab: 'library' | 'projects';
  setActiveTab: (tab: 'library' | 'projects') => void;
  
  // Data
  optionPresets: OptionPreset[];
  sectionPresets: SectionPreset[];
  savedProjects: SavedProject[];
  
  // Selection State
  selectedLibraryOptionId: string | null;
  setSelectedLibraryOptionId: (id: string | null) => void;
  selectedSidebarProjectId: string | null;
  setSelectedSidebarProjectId: (id: string | null) => void;
  currentProjectId: string | null;
  
  // Option Actions
  canSaveOption: boolean; // True if an option block is selected on canvas
  onOpenSavePresetModal: () => void;
  onInsertPreset: (p: OptionPreset) => void;
  onReplacePreset: (p: OptionPreset) => void;
  onEditPreset: (id: string) => void;
  onDeletePreset: (id: string) => void;

  // Section Actions
  onInsertSection: (p: SectionPreset) => void;
  onDeleteSection: (id: string) => void;

  // Project Actions
  onLoadProject: (p: SavedProject) => void;
  onDuplicateProject: () => void;
  onDeleteProject: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  optionPresets,
  sectionPresets,
  savedProjects,
  selectedLibraryOptionId,
  setSelectedLibraryOptionId,
  selectedSidebarProjectId,
  setSelectedSidebarProjectId,
  currentProjectId,
  canSaveOption,
  onOpenSavePresetModal,
  onInsertPreset,
  onReplacePreset,
  onEditPreset,
  onDeletePreset,
  onInsertSection,
  onDeleteSection,
  onLoadProject,
  onDuplicateProject,
  onDeleteProject
}) => {

  const sortedOptionPresets = useMemo(() => {
    return [...optionPresets].sort((a, b) => a.name.localeCompare(b.name));
  }, [optionPresets]);

  const sortedSectionPresets = useMemo(() => {
    return [...sectionPresets].sort((a, b) => a.name.localeCompare(b.name));
  }, [sectionPresets]);

  return (
    <div 
        className="w-full lg:w-72 flex-shrink-0 h-auto lg:h-full flex flex-col bg-canvas-900 border border-canvas-800 rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()} 
    >
         
         {/* Tab Header */}
         <div className="flex shrink-0 border-b border-canvas-800">
            <button 
                onClick={() => setActiveTab('library')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'library' ? 'bg-canvas-800 text-brand-400 border-b-2 border-brand-500' : 'bg-canvas-900 text-canvas-500 hover:text-canvas-300 hover:bg-canvas-800/50'}`}
            >
                <Library size={14}/> Library
            </button>
            <button 
                onClick={() => setActiveTab('projects')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'projects' ? 'bg-canvas-800 text-brand-400 border-b-2 border-brand-500' : 'bg-canvas-900 text-canvas-500 hover:text-canvas-300 hover:bg-canvas-800/50'}`}
            >
                <Book size={14}/> Projects
            </button>
         </div>

         {/* Tab Content: Library */}
         {activeTab === 'library' && (
             <div className="flex flex-col lg:flex-1 lg:overflow-hidden">
                 {/* 1. Option Presets */}
                 <div className="flex flex-col lg:flex-1 lg:min-h-0 border-b border-canvas-800">
                     {/* Library Headers */}
                     <div className="px-3 py-2 bg-canvas-950/30 flex items-center justify-between border-b border-canvas-800">
                        <div className="flex items-center gap-2">
                            <h4 className="text-canvas-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><Folder size={12}/> Options</h4>
                        </div>
                        <div className="flex items-center gap-0.5">
                            {/* Save New (From Canvas) */}
                            <button 
                                onClick={onOpenSavePresetModal}
                                disabled={!canSaveOption}
                                className="p-1.5 rounded hover:bg-brand-600/20 text-brand-400 hover:text-brand-300 disabled:opacity-20 transition-colors"
                                title="Save selected Block to Library"
                            >
                                <FolderPlus size={14}/>
                            </button>
                            
                            <div className="w-px h-3 bg-canvas-800 mx-1"></div>

                            {/* Actions for Selected Preset */}
                            <button 
                                onClick={() => { const p = sortedOptionPresets.find(x => x.id === selectedLibraryOptionId); if(p) onInsertPreset(p); }}
                                disabled={!selectedLibraryOptionId}
                                className="p-1.5 rounded hover:bg-canvas-700 text-canvas-400 hover:text-white disabled:opacity-20 transition-colors"
                                title="Insert Selected"
                            >
                                <ClipboardPaste size={14}/>
                            </button>
                            <button 
                                onClick={() => { const p = sortedOptionPresets.find(x => x.id === selectedLibraryOptionId); if(p) onReplacePreset(p); }}
                                disabled={!selectedLibraryOptionId || !canSaveOption}
                                className="p-1.5 rounded hover:bg-canvas-700 text-canvas-400 hover:text-white disabled:opacity-20 transition-colors"
                                title="Swap with Selected Block"
                            >
                                <ArrowRightLeft size={14}/>
                            </button>
                            <button 
                                onClick={() => selectedLibraryOptionId && onEditPreset(selectedLibraryOptionId)}
                                disabled={!selectedLibraryOptionId}
                                className="p-1.5 rounded hover:bg-canvas-700 text-canvas-400 hover:text-white disabled:opacity-20 transition-colors"
                                title="Edit Preset"
                            >
                                <Edit3 size={14}/>
                            </button>
                            <button 
                                onClick={() => selectedLibraryOptionId && onDeletePreset(selectedLibraryOptionId)}
                                disabled={!selectedLibraryOptionId}
                                className="p-1.5 rounded hover:bg-red-900/30 text-canvas-400 hover:text-red-400 disabled:opacity-20 transition-colors"
                                title="Delete Preset"
                            >
                                <Trash2 size={14}/>
                            </button>
                        </div>
                     </div>

                     {/* Options List */}
                     <div 
                         className="p-2 space-y-1 lg:flex-1 lg:overflow-y-auto custom-scrollbar"
                         onClick={() => setSelectedLibraryOptionId(null)}
                     >
                         {sortedOptionPresets.length === 0 && <div className="py-6 text-center text-canvas-600 text-xs italic">No options saved</div>}
                         {sortedOptionPresets.map(preset => (
                            <div 
                                key={preset.id} 
                                onClick={(e) => { e.stopPropagation(); setSelectedLibraryOptionId(preset.id === selectedLibraryOptionId ? null : preset.id); }}
                                className={`group border cursor-pointer rounded-md px-3 py-2 transition-all flex items-center justify-between
                                    ${selectedLibraryOptionId === preset.id 
                                        ? 'bg-brand-900/20 border-brand-500/50' 
                                        : 'border-transparent hover:border-canvas-700 bg-canvas-800/30 hover:bg-canvas-800'
                                    }`}
                            >
                                <span className="text-xs font-bold truncate text-canvas-300 group-hover:text-white">
                                    {preset.name}
                                </span>
                                {selectedLibraryOptionId === preset.id && <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>}
                            </div>
                         ))}
                     </div>
                 </div>

                 {/* 2. Section Presets */}
                 <div className="flex flex-col lg:flex-1 lg:min-h-0">
                     <div className="px-3 py-2 bg-canvas-950/30 flex items-center justify-between border-t border-canvas-800">
                        <h4 className="text-canvas-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><LayoutTemplate size={12}/> Sections</h4>
                     </div>
                     <div className="p-2 space-y-1 lg:flex-1 lg:overflow-y-auto custom-scrollbar">
                         {sortedSectionPresets.length === 0 && <div className="py-6 text-center text-canvas-600 text-xs italic">No sections saved</div>}
                         {sortedSectionPresets.map(preset => (
                            <div key={preset.id} className="group border border-transparent hover:border-canvas-700 bg-canvas-800/30 hover:bg-canvas-800 rounded-md p-2 transition-all flex items-center justify-between">
                                <div className="overflow-hidden">
                                    <span className="text-xs font-bold text-canvas-300 group-hover:text-white truncate block">{preset.name}</span>
                                    <span className="text-[10px] text-canvas-500">{preset.data.length} segments</span>
                                </div>
                                <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onInsertSection(preset)} className="p-1.5 bg-canvas-700 hover:bg-brand-600 text-canvas-300 hover:text-white rounded" title="Insert Section"><ClipboardPaste size={12}/></button>
                                    <button onClick={() => onDeleteSection(preset.id)} className="p-1.5 bg-canvas-700 hover:bg-red-500 text-canvas-300 hover:text-white rounded" title="Delete Section"><Trash2 size={12}/></button>
                                </div>
                            </div>
                         ))}
                     </div>
                 </div>
             </div>
         )}

         {/* Tab Content: Projects */}
         {activeTab === 'projects' && (
             <div className="flex flex-col lg:flex-1 lg:overflow-hidden relative">
                 <div className="px-3 py-2 flex items-center justify-end border-b border-canvas-800 shrink-0 relative z-20 overflow-hidden">
                    
                    <div className="flex items-center gap-0.5 relative z-10">
                        <button 
                            onClick={() => { const p = savedProjects.find(x => x.id === selectedSidebarProjectId); if(p) onLoadProject(p); }}
                            disabled={!selectedSidebarProjectId}
                            className="p-1.5 rounded hover:bg-canvas-700 text-canvas-400 hover:text-white disabled:opacity-20 transition-colors"
                            title="Open Project"
                        >
                            <FolderOpen size={14}/>
                        </button>
                        
                        <button 
                            onClick={onDuplicateProject}
                            disabled={!selectedSidebarProjectId}
                            className="p-1.5 rounded hover:bg-canvas-700 text-canvas-400 hover:text-white disabled:opacity-20 transition-colors"
                            title="Duplicate Project"
                        >
                            <Copy size={14}/>
                        </button>
                        
                        <button 
                            onClick={() => selectedSidebarProjectId && onDeleteProject(selectedSidebarProjectId)}
                            disabled={!selectedSidebarProjectId}
                            className="p-1.5 rounded hover:bg-red-900/30 text-canvas-400 hover:text-red-400 disabled:opacity-20 transition-colors"
                            title="Delete Project"
                        >
                            <Trash2 size={14}/>
                        </button>
                    </div>
                 </div>
                 
                 <div 
                     className={`p-2 space-y-1 lg:flex-1 lg:overflow-y-auto custom-scrollbar relative z-10 flex flex-col ${savedProjects.length > 0 ? 'pb-32' : ''}`}
                     onClick={() => setSelectedSidebarProjectId(null)}
                 >
                     {savedProjects.length === 0 && <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-canvas-600 space-y-3 text-center p-4"><Package size={32} className="opacity-20"/><p className="text-xs">No projects saved.</p></div>}
                     {savedProjects.map(p => (
                        <div 
                            key={p.id} 
                            onClick={(e) => { e.stopPropagation(); setSelectedSidebarProjectId(p.id === selectedSidebarProjectId ? null : p.id); }}
                            className={`group border rounded-md p-3 cursor-pointer transition-all relative z-20 backdrop-blur-sm shrink-0
                                ${selectedSidebarProjectId === p.id
                                    ? 'bg-brand-900/40 border-brand-500/50'
                                    : 'bg-canvas-900/40 border-canvas-800/50 hover:bg-canvas-800 hover:border-canvas-700'
                                }
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <h4 className={`text-sm font-medium truncate pr-2 ${currentProjectId === p.id ? 'text-emerald-400' : selectedSidebarProjectId === p.id ? 'text-brand-200' : 'text-canvas-300 group-hover:text-white'}`}>{p.name}</h4>
                                {currentProjectId === p.id && <span className="text-[9px] uppercase tracking-widest text-emerald-500 font-bold border border-emerald-500/30 px-1.5 rounded">Active</span>}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-canvas-500 mt-1.5 font-mono"><Clock size={10}/>{new Date(p.updatedAt).toLocaleDateString()}</div>
                        </div>
                     ))}
                 </div>
             </div>
         )}
    </div>
  );
};
