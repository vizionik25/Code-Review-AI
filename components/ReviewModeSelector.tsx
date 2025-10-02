import React from 'react';
import { REVIEW_MODES } from '../constants';

interface ReviewModeSelectorProps {
  selectedMode: string;
  onModeChange: (mode: string) => void;
}

export const ReviewModeSelector: React.FC<ReviewModeSelectorProps> = ({ selectedMode, onModeChange }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-400 mb-2">
        Review Mode
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
        {REVIEW_MODES.map(mode => (
          <button
            key={mode.value}
            type="button"
            onClick={() => onModeChange(mode.value)}
            className={`text-center p-2 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${
              selectedMode === mode.value
                ? 'bg-indigo-600 text-white font-semibold shadow'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={mode.description}
            aria-pressed={selectedMode === mode.value}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};
