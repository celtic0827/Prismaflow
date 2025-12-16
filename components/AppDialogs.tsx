
import React from 'react';
import { Modal } from './Modal';
import { FolderPlus, LayoutTemplate, Trash2, Save, File, AlertTriangle, ArrowRightLeft } from './Icons';

// --- Save Preset Modal ---
interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  setName: (name: string) => void;
  onConfirm: () => void;
}

export const SavePresetModal: React.FC<SavePresetModalProps> = ({ isOpen, onClose, name, setName, onConfirm }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Save Option Preset">
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
                placeholder="e.g. Cyberpunk Characters"
                className="w-full bg-canvas-950 border border-canvas-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                autoFocus
            />
        </div>
        <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-2 text-xs font-bold text-canvas-400 hover:text-white">Cancel</button>
            <button onClick={onConfirm} className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-bold shadow-lg shadow-brand-500/20">Save Preset</button>
        </div>
    </div>
  </Modal>
);

// --- Save Section Modal ---
interface SaveSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  setName: (name: string) => void;
  onConfirm: () => void;
}

export const SaveSectionModal: React.FC<SaveSectionModalProps> = ({ isOpen, onClose, name, setName, onConfirm }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Save Section to Library">
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
                placeholder="e.g. Lighting Setup"
                className="w-full bg-canvas-950 border border-canvas-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                autoFocus
            />
        </div>
        <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-2 text-xs font-bold text-canvas-400 hover:text-white">Cancel</button>
            <button onClick={onConfirm} className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-bold shadow-lg shadow-brand-500/20">Save Section</button>
        </div>
    </div>
  </Modal>
);

// --- Delete Confirm Modal ---
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, onClose, itemName, onConfirm }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Confirm Deletion">
    <div className="space-y-4 font-sans" onClick={e => e.stopPropagation()}>
        <div className="bg-red-900/20 p-3 rounded border border-red-500/30 flex items-center gap-3">
            <Trash2 className="text-red-400" size={18} />
            <p className="text-xs text-red-200">
                Are you sure you want to delete <strong className="text-white">"{itemName}"</strong>? This action cannot be undone.
            </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-2 text-xs font-bold text-canvas-400 hover:text-white">Cancel</button>
            <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold shadow-lg shadow-red-500/20">Delete Forever</button>
        </div>
    </div>
  </Modal>
);

// --- New Project Confirm Modal ---
interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onConfirm: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, projectName, onConfirm }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="New Project">
    <div className="space-y-4 font-sans" onClick={e => e.stopPropagation()}>
        <div className="bg-brand-900/20 p-3 rounded border border-brand-500/30 flex items-center gap-3">
            <File className="text-brand-400" size={18} />
            <div className="space-y-1">
                <p className="text-xs text-brand-200 font-bold uppercase tracking-wide">Unsaved Changes</p>
                <p className="text-xs text-brand-200/80">
                    You have unsaved changes in <strong className="text-white">"{projectName}"</strong>.
                </p>
            </div>
        </div>
        <p className="text-xs text-canvas-400 text-center">
            Starting a new project will clear the current workspace. Are you sure?
        </p>
        <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-2 text-xs font-bold text-canvas-400 hover:text-white">Cancel</button>
            <button onClick={onConfirm} className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-bold shadow-lg shadow-brand-500/20">Start New Project</button>
        </div>
    </div>
  </Modal>
);

// --- Overwrite Confirm Modal ---
interface OverwriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  onConfirm: () => void;
}

export const OverwriteModal: React.FC<OverwriteModalProps> = ({ isOpen, onClose, itemName, onConfirm }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Confirm Overwrite">
    <div className="space-y-4 font-sans" onClick={e => e.stopPropagation()}>
        <div className="bg-amber-900/20 p-3 rounded border border-amber-500/30 flex items-center gap-3">
            <Save className="text-amber-400" size={18} />
            <div className="space-y-1">
                <p className="text-xs text-amber-200 font-bold uppercase tracking-wide">Duplicate Found</p>
                <p className="text-xs text-amber-200/80">
                    A section named <strong className="text-white">"{itemName}"</strong> already exists in your library.
                </p>
            </div>
        </div>
        <p className="text-xs text-canvas-400 text-center">
            Do you want to overwrite the existing section with this new version?
        </p>
        <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-2 text-xs font-bold text-canvas-400 hover:text-white">Cancel</button>
            <button onClick={onConfirm} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold shadow-lg shadow-amber-500/20">Overwrite</button>
        </div>
    </div>
  </Modal>
);

// --- Import Backup Modal ---
interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMerge: () => void;
  onReplace: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onMerge, onReplace }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Import Backup">
    <div className="space-y-6 font-sans" onClick={e => e.stopPropagation()}>
        <div className="bg-brand-900/20 p-4 rounded-lg border border-brand-500/30 flex gap-4">
            <AlertTriangle className="text-brand-400 shrink-0" size={24} />
            <div className="space-y-2">
                <h3 className="text-white font-bold text-sm">Backup Detected</h3>
                <p className="text-xs text-canvas-300 leading-relaxed">
                    You are about to import data. How would you like to handle existing projects and settings?
                </p>
            </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={onMerge}
                className="flex flex-col items-center gap-3 p-4 bg-canvas-800 border border-canvas-700 hover:border-brand-500 hover:bg-canvas-750 rounded-lg transition-all group text-center"
            >
                <div className="p-3 bg-canvas-900 rounded-full group-hover:bg-brand-900/30 transition-colors">
                    <FolderPlus size={24} className="text-canvas-400 group-hover:text-brand-400" />
                </div>
                <div>
                    <span className="block text-sm font-bold text-white mb-1">Merge</span>
                    <span className="block text-[10px] text-canvas-500">Keep current data, add new items.</span>
                </div>
            </button>

            <button 
                    onClick={onReplace}
                    className="flex flex-col items-center gap-3 p-4 bg-canvas-800 border border-canvas-700 hover:border-red-500 hover:bg-red-950/10 rounded-lg transition-all group text-center"
            >
                <div className="p-3 bg-canvas-900 rounded-full group-hover:bg-red-900/30 transition-colors">
                    <ArrowRightLeft size={24} className="text-canvas-400 group-hover:text-red-400" />
                </div>
                <div>
                    <span className="block text-sm font-bold text-white mb-1">Replace</span>
                    <span className="block text-[10px] text-canvas-500">Wipe current data, restore backup.</span>
                </div>
            </button>
        </div>

        <button onClick={onClose} className="w-full py-2 text-xs font-bold text-canvas-500 hover:text-white uppercase tracking-wider">Cancel Import</button>
    </div>
  </Modal>
);
