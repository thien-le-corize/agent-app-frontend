'use client';

import { X } from 'lucide-react';
import { MouseEvent } from 'react';

interface NodeWrapperProps {
  children: React.ReactNode;
  onDelete?: () => void;
  className?: string;
}

export default function NodeWrapper({ children, onDelete, className = '' }: NodeWrapperProps) {
  // Stop propagation on interactive elements inside nodes
  // This prevents React Flow from capturing clicks on buttons/inputs
  const handlePointerDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    // If clicking on interactive elements, stop propagation so React Flow doesn't drag
    if (tag === 'button' || tag === 'textarea' || tag === 'input' || tag === 'select' || tag === 'a' || target.closest('button') || target.closest('a')) {
      e.stopPropagation();
    }
  };

  return (
    <div className={`relative group ${className}`} onPointerDown={handlePointerDown}>
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onPointerDown={e => e.stopPropagation()}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600 shadow-sm"
          title="Xóa node"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      {children}
    </div>
  );
}
