import React from 'react';
import { HistoryIcon } from './icons/HistoryIcon';

interface HeaderProps {
    onToggleHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleHistory }) => {
  return (
    <header className="bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-100">
            AI Code Reviewer
            </h1>
        </div>
        <button
            onClick={onToggleHistory}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            aria-label="View history"
        >
            <HistoryIcon />
        </button>
      </div>
    </header>
  );
};
