import React, { useMemo, useCallback, useState } from "react";

export interface LogNumberSliderProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label?: string;
  logScale?: boolean; // controlled
  onToggleLogScale?: (v: boolean) => void; // controlled
  defaultLogScale?: boolean; // used only if uncontrolled
  showNumberInput?: boolean;
  step?: number | "any"; // used in linear mode; log uses "any"
  precision?: number;
  disabled?: boolean;
  format?: (v: number) => string;
  parse?: (s: string) => number;
  className?: string;
  id?: string;
  dataTestId?: string;
  /** When true, emitted values are rounded to integers (useful for counts). */
  discrete?: boolean;
}

export const LogNumberSlider: React.FC<LogNumberSliderProps> = ({
  value,
  onChange,
  min,
  max,
  label,
  logScale,
  onToggleLogScale,
  defaultLogScale = false,
  showNumberInput = true,
  step = 1,
  precision = 0,
  disabled = false,
  format,
  parse,
  className,
  id,
  dataTestId,
  discrete = false,
}) => {
  // Allow both controlled and uncontrolled log scale
  const [internalLog, setInternalLog] = useState(defaultLogScale);
  const isLog = logScale ?? internalLog;

  const setLog = useCallback((b: boolean) => {
    if (onToggleLogScale) onToggleLogScale(b);
    else setInternalLog(b);
  }, [onToggleLogScale]);

  const clamp = useCallback((v: number) => Math.max(min, Math.min(max, v)), [min, max]);
  // Map between value space [min,max] and slider space [log10(min), log10(max)]
  const toLog = useCallback((p: number) => Math.log10(Math.max(min, p)), [min]);
  const fromLog = useCallback((s: number) => Math.pow(10, s), []);

  const sliderMin = useMemo(() => (isLog ? Math.log10(min) : min), [isLog, min]);
  const sliderMax = useMemo(() => (isLog ? Math.log10(max) : max), [isLog, max]);
  const sliderValue = useMemo(() => (isLog ? toLog(value) : value), [isLog, toLog, value]);

  const onSliderChange = useCallback((raw: string) => {
    const rawNum = parseFloat(raw);
    const v = isLog ? fromLog(rawNum) : rawNum;
    const base = Number.isFinite(v) ? v : min;
    const next = clamp(discrete ? Math.round(base) : base);
    onChange(next);
  }, [isLog, fromLog, clamp, onChange, min, discrete]);

  const formatter = useCallback((v: number) => {
    if (format) return format(v);
    return precision > 0 ? v.toFixed(precision) : String(v);
  }, [format, precision]);

  const parser = useCallback((s: string) => {
    if (parse) return parse(s);
    const v = Number(s);
    return Number.isFinite(v) ? v : min;
  }, [parse, min]);

  const onNumberChange = useCallback((raw: string) => {
    const v = parser(raw);
    const next = clamp(discrete ? Math.round(v) : v);
    onChange(next);
  }, [parser, clamp, onChange, discrete]);

  const isDisabled = disabled || !(max > min);

  return (
    <div className={className} id={id} data-testid={dataTestId}>
      {label && <label className="block text-sm font-medium mb-2">{label}</label>}
      <div className="flex items-center justify-between gap-2 mb-2">
        <label className="flex items-center text-xs gap-2">
          <input
            type="checkbox"
            checked={isLog}
            onChange={(e) => setLog(e.target.checked)}
            disabled={isDisabled}
          />
          Log scale
        </label>
        {showNumberInput && (
          <input
            type="number"
            min={min}
            max={max}
            step={discrete ? 1 : (step === 'any' ? 'any' : step)}
            value={value}
            onChange={(e) => onNumberChange(e.target.value)}
            className="w-28 border rounded px-2 py-1 text-sm"
            disabled={isDisabled}
          />
        )}
      </div>

      <input
        type="range"
        min={sliderMin}
        max={sliderMax}
        step={isLog ? "any" : step}
        value={sliderValue}
        onChange={(e) => onSliderChange(e.target.value)}
        className="w-full"
        disabled={isDisabled}
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{precision > 0 ? min.toFixed(precision) : String(min)}</span>
        <span className="font-medium">{formatter(value)}</span>
        <span>{precision > 0 ? max.toFixed(precision) : String(max)}</span>
      </div>
    </div>
  );
};
