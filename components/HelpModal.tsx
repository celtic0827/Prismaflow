
import React from 'react';
import { Modal } from './Modal';
import { Layers, Tag, Sliders, Folder, LayoutTemplate, Zap, MousePointer2, Save } from './Icons';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Prismaflow Guide">
      <div className="space-y-6 font-sans text-sm text-canvas-300">
        
        {/* Intro */}
        <div className="bg-brand-900/10 border border-brand-500/20 p-4 rounded-lg">
          <p className="leading-relaxed">
            <strong className="text-brand-400">Prismaflow</strong> is a modular prompt engine designed for controlled variance. 
            Instead of rewriting prompts from scratch, build them using <span className="text-white">Blocks</span> and <span className="text-white">Sections</span> to create flexible, reusable templates.
          </p>
        </div>

        {/* Core Concepts */}
        <div className="space-y-4">
          <h3 className="text-white font-bold uppercase tracking-widest text-xs border-b border-canvas-800 pb-2">Core Building Blocks</h3>
          
          <div className="grid gap-4">
            <div className="flex gap-3">
              <div className="bg-canvas-800 p-2 rounded h-fit text-brand-400"><Sliders size={18}/></div>
              <div>
                <h4 className="text-white font-bold text-xs mb-1">Option Blocks</h4>
                <p className="text-xs text-canvas-400">
                  Containers for multiple variations (e.g., <code className="bg-canvas-900 px-1 rounded">blue | red | green</code>). 
                  Prismaflow randomly picks one value when generating the final prompt.
                  <br/>
                  <span className="text-brand-500/80 italic">Tip: Select text and click the Lightning icon to create one.</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="bg-canvas-800 p-2 rounded h-fit text-brand-400"><Tag size={18}/></div>
              <div>
                <h4 className="text-white font-bold text-xs mb-1">Labels & Sections</h4>
                <p className="text-xs text-canvas-400">
                  Use Labels to organize long prompts into logical sections (e.g., <code className="bg-canvas-900 px-1 rounded">#Lighting</code>).
                  Click a Label to rename, change color, or move the entire section up/down.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Library */}
        <div className="space-y-4">
          <h3 className="text-white font-bold uppercase tracking-widest text-xs border-b border-canvas-800 pb-2">Library & Presets</h3>
          
          <div className="grid gap-4">
             <div className="flex gap-3">
              <div className="bg-canvas-800 p-2 rounded h-fit text-emerald-400"><Folder size={18}/></div>
              <div>
                <h4 className="text-white font-bold text-xs mb-1">Option Presets</h4>
                <p className="text-xs text-canvas-400">
                  Save frequently used lists (like "Camera Angles" or "Artists") to the Library. 
                  Drag or click "Add" to insert them anywhere.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="bg-canvas-800 p-2 rounded h-fit text-purple-400"><LayoutTemplate size={18}/></div>
              <div>
                <h4 className="text-white font-bold text-xs mb-1">Section Presets</h4>
                <p className="text-xs text-canvas-400">
                  Save entire sections (Label + Content) to the Library. 
                  Great for storing complex setups like "Cinematic Lighting" or "Negative Prompts".
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Data & Safety */}
        <div className="space-y-4">
          <h3 className="text-white font-bold uppercase tracking-widest text-xs border-b border-canvas-800 pb-2">Data & Storage</h3>
          
          <div className="grid gap-4">
            <div className="flex gap-3">
              <div className="bg-canvas-800 p-2 rounded h-fit text-sky-400"><Save size={18}/></div>
              <div>
                <h4 className="text-white font-bold text-xs mb-1">Local Storage & Backup</h4>
                <p className="text-xs text-canvas-400 mb-2">
                  All data is stored locally in your browser. 
                  <strong className="text-red-400 block mt-1">Clearing browser cache will permanently delete your projects.</strong>
                </p>
                <p className="text-xs text-canvas-400">
                  To transfer data or ensure safety, use the <strong>Export Backup</strong> (Download icon) button in the toolbar to save a file, and <strong>Import Backup</strong> (Upload icon) to restore it.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Shortcuts / Interaction */}
        <div className="space-y-4">
          <h3 className="text-white font-bold uppercase tracking-widest text-xs border-b border-canvas-800 pb-2">Interaction</h3>
          <ul className="space-y-2 text-xs text-canvas-400 list-disc pl-4">
            <li><span className="text-white">Click</span> an Option Block to select it.</li>
            <li><span className="text-white">Hover</span> an Option Block to Edit or Delete.</li>
            <li><span className="text-white">Double Click</span> text to select words.</li>
            <li>Use the <span className="text-white">Sidebar</span> tabs to switch between your Library and Saved Projects.</li>
          </ul>
        </div>

      </div>
    </Modal>
  );
};
