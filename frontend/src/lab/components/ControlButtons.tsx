import React from 'react';

export interface ControlButtonsProps {
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  isRunning: boolean;
}

export const ControlButtons: React.FC<ControlButtonsProps> = ({
  onPlay,
  onPause,
  onStep,
  onReset,
  isRunning,
}) => {
  const handlePlayPause = () => {
    if (isRunning) {
      console.debug('[ControlButtons] Pausing simulation');
      onPause();
    } else {
      console.debug('[ControlButtons] Playing simulation');
      onPlay();
    }
  };

  const handleStep = () => {
    console.debug('[ControlButtons] Step');
    onStep();
  };

  const handleReset = () => {
    console.debug('[ControlButtons] Reset');
    onReset();
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handlePlayPause}
        className={`px-4 py-2 rounded font-medium transition-colors ${
          isRunning
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {isRunning ? 'Pause' : 'Play'}
      </button>
      <button
        onClick={handleStep}
        disabled={isRunning}
        className="px-4 py-2 rounded font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Step
      </button>
      <button
        onClick={handleReset}
        className="px-4 py-2 rounded font-medium bg-gray-500 hover:bg-gray-600 text-white transition-colors"
      >
        Reset
      </button>
    </div>
  );
};
