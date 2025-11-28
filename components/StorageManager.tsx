import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SavedProject, Segment } from '../types';
import { Save, Trash2, Folder, Upload } from './Icons';

const STORAGE_KEY_PROJECTS = 'alchemist_saved_projects';

interface StorageManagerProps {
  currentSegments: Segment[];
  onLoad: (segments: Segment[]) => void;
}

export const StorageManager: React.FC<StorageManagerProps> = ({ currentSegments, onLoad }) => {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (saved) {
        setProjects(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load projects", e);
    }
  }, []);

  const saveProjects = (newProjects: SavedProject[]) => {
    setProjects(newProjects);
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(newProjects));
  };

  const handleSave = () => {
    if (!newName.trim()) return;
    
    const newProject: SavedProject = {
      id: uuidv4(),
      name: newName.trim(),
      segments: currentSegments,
      updatedAt: Date.now()
    };

    const updated = [newProject, ...projects];
    saveProjects(updated);
    setNewName('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this spell forever?')) {
      const updated = projects.filter(p => p.id !== id);
      saveProjects(updated);
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Save Section */}
      <div className="bg-void-950/50 p-4 rounded border border-magick-500/20 space-y-3">
        <div className="flex items-center gap-2 text-magick-400 text-sm font-bold uppercase tracking-wider">
          <Save size={16} /> Scribe Current Spell
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Enter spell name..."
            className="flex-1 bg-void-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-magick-500 focus:outline-none"
          />
          <button
            onClick={handleSave}
            disabled={!newName.trim()}
            className="bg-magick-600 hover:bg-magick-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-bold text-sm transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {/* List Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider px-1">
          <Folder size={14} /> Grimoire Library ({projects.length})
        </div>
        
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
          {projects.length === 0 && (
            <div className="text-center py-8 text-slate-600 text-sm italic border border-dashed border-slate-800 rounded">
              No spells scribed yet.
            </div>
          )}
          
          {projects.map(p => (
            <div key={p.id} className="group bg-void-800 hover:bg-void-750 border border-white/5 hover:border-magick-500/30 rounded p-3 transition-all flex items-center justify-between">
              <div className="overflow-hidden">
                <h3 className="text-slate-200 font-medium truncate">{p.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{formatDate(p.updatedAt)} • {p.segments.length} segments</p>
              </div>
              
              <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onLoad(p.segments)}
                  className="p-2 bg-magick-600/10 hover:bg-magick-600 hover:text-white text-magick-400 rounded transition-colors"
                  title="Load Spell"
                >
                  <Upload size={16} className="rotate-90" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-2 hover:bg-red-900/30 text-slate-500 hover:text-red-400 rounded transition-colors"
                  title="Destroy Spell"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};