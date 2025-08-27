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
}) => {
  // Allow both controlled and uncontrolled log scale
  const [internalLog, setInternalLog] = useState(defaultLogScale);
  const isLog = logScale ?? internalLog;

  const setLog = useCallback((b: boolean) => {
    if (onToggleLogScale) onToggleLogScale(b);
    else setInternalLog(b);
  }, [onToggleLogScale]);

  const clamp = useCallback((v: number) => Math.max(min, Math.min(max, v)), [min, max]);
  const toLog = useCallback((p: number) => Math.log10((p ?? 0) + 1), []);
  const fromLog = useCallback((s: number) => Math.round(Math.pow(10, s) - 1), []);

  const sliderMin = useMemo(() => (isLog ? Math.log10(min + 1) : min), [isLog, min]);
  const sliderMax = useMemo(() => (isLog ? Math.log10(max + 1) : max), [isLog, max]);
  const sliderValue = useMemo(() => (isLog ? toLog(value) : value), [isLog, toLog, value]);

  const onSliderChange = useCallback((raw: string) => {
    const v = isLog ? fromLog(parseFloat(raw)) : parseFloat(raw);
    const next = clamp(Number.isFinite(v) ? Math.round(v) : min);
    onChange(next);
  }, [isLog, fromLog, clamp, onChange, min]);

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
    const next = clamp(Math.round(v));
    onChange(next);
  }, [parser, clamp, onChange]);

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
            value={formatter(value)}
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
        <span>{min}</span>
        <span className="font-medium">{value}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};
