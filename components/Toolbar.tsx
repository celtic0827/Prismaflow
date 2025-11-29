import React from 'react';
import { 
  Undo2, Tag, Zap, ClipboardPaste, Save, FilePlus, 
  Upload, Download, Trash2 
} from './Icons';

interface ToolbarProps {
  promptName: string;
  setPromptName: (name: string) => void;
  currentProjectId: string | null;
  isDirty: boolean;
  canRandomize: boolean;
  onUndo: () => void;
  onAddLabel: () => void;
  onRandomize: () => void;
  onPaste: () => void;
  onSave: () => void;
  onSaveAsNew: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onClear: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  promptName,
  setPromptName,
  currentProjectId,
  isDirty,
  canRandomize,
  onUndo,
  onAddLabel,
  onRandomize,
  onPaste,
  onSave,
  onSaveAsNew,
  onExportBackup,
  onImportBackup,
  onClear
}) => {
  return (
    <div className="bg-canvas-900 border border-canvas-800 rounded-lg px-3 py-2 flex flex-col md:flex-row gap-4 justify-between items-center shrink-0" onClick={e => e.stopPropagation()}>
        <div className="flex-1 w-full md:w-auto flex gap-2 items-center">
            <input 
              type="text" 
              value={promptName} 
              onChange={e => setPromptName(e.target.value)} 
              className="bg-transparent text-sm font-bold text-white w-full focus:outline-none" 
              placeholder="Untitled Project" 
            />
            {currentProjectId && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${!isDirty ? 'bg-emerald-950 border-emerald-800 text-emerald-400' : 'bg-amber-950 border-amber-800 text-amber-400'}`}>
                {!isDirty ? 'Synced' : 'Edited'}
              </span>
            )}
        </div>
        <div className="flex items-center gap-1">
            <button onClick={onUndo} className="p-1.5 text-canvas-400 hover:text-white rounded" title="Undo"><Undo2 size={16}/></button>
            <div className="w-px h-4 bg-canvas-800 mx-2"></div>
            <button onClick={onAddLabel} className="p-1.5 text-canvas-400 hover:text-brand-400 rounded" title="Add Label"><Tag size={16}/></button>
            <button onClick={onRandomize} className={`p-1.5 rounded ${canRandomize ? 'text-brand-400' : 'text-canvas-600'}`} title="Randomize"><Zap size={16}/></button>
            <div className="w-px h-4 bg-canvas-800 mx-2"></div>
            <button onClick={onPaste} className="p-1.5 text-canvas-400 hover:text-white rounded" title="Paste"><ClipboardPaste size={16}/></button>
            <div className="w-px h-4 bg-canvas-800 mx-2"></div>
            <button onClick={onSave} className="p-1.5 text-canvas-400 hover:text-white rounded" title="Save"><Save size={16}/></button>
            <button onClick={onSaveAsNew} className="p-1.5 text-canvas-400 hover:text-emerald-400 rounded" title="Save Copy"><FilePlus size={16}/></button>
            
            {/* Backup Controls */}
            <button onClick={onExportBackup} className="p-1.5 text-canvas-400 hover:text-sky-400 rounded" title="Export Backup"><Upload size={16}/></button>
            <button onClick={onImportBackup} className="p-1.5 text-canvas-400 hover:text-purple-400 rounded" title="Import Backup"><Download size={16}/></button>
            
            <div className="w-px h-4 bg-canvas-800 mx-2"></div>
            <button onClick={onClear} className="p-1.5 text-canvas-400 hover:text-red-400 rounded" title="Clear"><Trash2 size={16}/></button>
        </div>
    </div>
  );
};
