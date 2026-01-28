import React, { useCallback } from 'react';

export interface TimelineSliderProps {
  currentStep: number;
  maxStep: number;
  onSeek: (step: number) => void;
  label?: string;
}

export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  currentStep,
  maxStep,
  onSeek,
  label = 'Timeline',
}) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const step = parseInt(e.target.value, 10);
      console.debug(`[TimelineSlider] Seeking to step ${step}/${maxStep}`);
      onSeek(step);
    },
    [maxStep, onSeek]
  );

  const progress = maxStep > 0 ? (currentStep / maxStep) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm text-gray-600">
          {currentStep} / {maxStep}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max={maxStep}
        value={currentStep}
        onChange={handleChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div className="text-xs text-gray-500 mt-1">
        {progress.toFixed(1)}% complete
      </div>
    </div>
  );
};
