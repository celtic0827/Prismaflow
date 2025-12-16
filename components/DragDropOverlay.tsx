
import React from 'react';
import { Upload } from './Icons';

interface DragDropOverlayProps {
  isDragging: boolean;
}

export const DragDropOverlay: React.FC<DragDropOverlayProps> = ({ isDragging }) => {
  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-canvas-950/80 backdrop-blur-sm border-2 border-dashed border-brand-500 m-4 rounded-xl flex items-center justify-center pointer-events-none animate-in fade-in duration-200">
        <div className="flex flex-col items-center gap-4 p-8 bg-canvas-900 rounded-lg shadow-2xl border border-canvas-700">
            <Upload size={64} className="text-brand-400 animate-bounce" />
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">Drop to Import Backup</h2>
                <p className="text-canvas-400 font-mono text-sm">Release the .json file to restore your projects.</p>
            </div>
        </div>
    </div>
  );
};
