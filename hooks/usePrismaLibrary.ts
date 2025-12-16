
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SavedProject, OptionPreset, SectionPreset } from '../types';

const PROJECTS_KEY = 'prismaflow_saved_projects';
const OPTION_PRESETS_KEY = 'prismaflow_option_presets';
const SECTION_PRESETS_KEY = 'prismaflow_section_presets';

export function usePrismaLibrary() {
  // --- Load Initial State ---
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() => {
    try {
      const saved = localStorage.getItem(PROJECTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [optionPresets, setOptionPresets] = useState<OptionPreset[]>(() => {
    try {
      const saved = localStorage.getItem(OPTION_PRESETS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [sectionPresets, setSectionPresets] = useState<SectionPreset[]>(() => {
    try {
      const saved = localStorage.getItem(SECTION_PRESETS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(savedProjects));
  }, [savedProjects]);

  useEffect(() => {
    localStorage.setItem(OPTION_PRESETS_KEY, JSON.stringify(optionPresets));
  }, [optionPresets]);

  useEffect(() => {
    localStorage.setItem(SECTION_PRESETS_KEY, JSON.stringify(sectionPresets));
  }, [sectionPresets]);

  // --- Actions ---

  // Projects
  const saveProject = (id: string | null, name: string, segments: any[]) => {
    const now = Date.now();
    let newId = id;
    
    if (id) {
        setSavedProjects(prev => prev.map(p => p.id === id ? { ...p, name, segments, updatedAt: now } : p));
    } else {
        newId = uuidv4();
        setSavedProjects(prev => [{id: newId!, name: name || 'Untitled', segments, updatedAt: now}, ...prev]);
    }
    return newId; // Return ID so App can update currentProjectId
  };

  const deleteProject = (id: string) => {
    setSavedProjects(prev => prev.filter(p => p.id !== id));
  };

  const duplicateProject = (id: string) => {
    const p = savedProjects.find(x => x.id === id);
    if (!p) return;
    const newProject: SavedProject = { ...p, id: uuidv4(), name: `${p.name} (Copy)`, updatedAt: Date.now() };
    setSavedProjects(prev => [newProject, ...prev]);
  };

  // Option Presets
  const addOptionPreset = (name: string, options: string[]) => {
    const newPreset: OptionPreset = { id: uuidv4(), name, options };
    setOptionPresets(prev => [...prev, newPreset]);
  };

  const updateOptionPreset = (id: string, options: string[]) => {
      setOptionPresets(prev => prev.map(p => p.id === id ? { ...p, options } : p));
  };

  const deleteOptionPreset = (id: string) => {
      setOptionPresets(prev => prev.filter(p => p.id !== id));
  };

  // Section Presets
  const addSectionPreset = (name: string, data: any[]) => {
      const newPreset: SectionPreset = { id: uuidv4(), name, data };
      setSectionPresets(prev => [...prev, newPreset]);
  };

  const updateSectionPreset = (id: string, data: any[]) => {
      setSectionPresets(prev => prev.map(p => p.id === id ? { ...p, data } : p));
  };

  const deleteSectionPreset = (id: string) => {
      setSectionPresets(prev => prev.filter(p => p.id !== id));
  };

  // --- Import / Export Logic ---
  const exportBackup = () => {
      const backupData = { version: 1, timestamp: Date.now(), projects: savedProjects, optionPresets, sectionPresets };
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
      return true;
  };

  const parseImportFile = (file: File): Promise<any> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const content = e.target?.result as string;
                  const data = JSON.parse(content);
                  if (!data || !data.version) reject(new Error("Invalid backup file"));
                  else resolve(data);
              } catch (err) {
                  reject(err);
              }
          };
          reader.readAsText(file);
      });
  };

  const executeImport = (data: any, mode: 'merge' | 'replace') => {
      let stats = { projects: 0, options: 0 };
      
      if (mode === 'replace') {
          if (Array.isArray(data.projects)) {
              setSavedProjects(data.projects.map((p: SavedProject) => ({...p, id: uuidv4()})));
              stats.projects = data.projects.length;
          } else setSavedProjects([]);
          
          if (Array.isArray(data.optionPresets)) {
              setOptionPresets(data.optionPresets.map((p: OptionPreset) => ({...p, id: uuidv4()})));
              stats.options = data.optionPresets.length;
          } else setOptionPresets([]);
          
          if (Array.isArray(data.sectionPresets)) {
              setSectionPresets(data.sectionPresets.map((p: SectionPreset) => ({...p, id: uuidv4()})));
          } else setSectionPresets([]);
      } else {
          // Merge
          if (Array.isArray(data.projects)) {
              setSavedProjects(prev => {
                  const existingIds = new Set(prev.map(p => p.id));
                  const newItems = data.projects.map((p: SavedProject) => {
                      if (existingIds.has(p.id)) return { ...p, id: uuidv4(), name: p.name + ' (Imported)' };
                      return p;
                  });
                  stats.projects = newItems.length;
                  return [...prev, ...newItems];
              });
          }
          if (Array.isArray(data.optionPresets)) {
              setOptionPresets(prev => {
                  const existingIds = new Set(prev.map(p => p.id));
                  const newItems = data.optionPresets.map((p: OptionPreset) => {
                       if (existingIds.has(p.id)) return { ...p, id: uuidv4(), name: p.name + ' (Imported)' };
                       return p;
                  });
                  stats.options = newItems.length;
                  return [...prev, ...newItems];
              });
          }
          if (Array.isArray(data.sectionPresets)) {
               setSectionPresets(prev => {
                  const existingIds = new Set(prev.map(p => p.id));
                  const newItems = data.sectionPresets.map((p: SectionPreset) => {
                       if (existingIds.has(p.id)) return { ...p, id: uuidv4(), name: p.name + ' (Imported)' };
                       return p;
                  });
                  return [...prev, ...newItems];
              });
          }
      }
      return stats;
  };

  return {
    savedProjects,
    optionPresets,
    sectionPresets,
    saveProject,
    deleteProject,
    duplicateProject,
    addOptionPreset,
    updateOptionPreset,
    deleteOptionPreset,
    addSectionPreset,
    updateSectionPreset,
    deleteSectionPreset,
    exportBackup,
    parseImportFile,
    executeImport
  };
}
