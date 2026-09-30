import { useCallback, useEffect, useRef, useState } from 'react';
import { GeneralPDE2DSolver, type PDE2DDomain, type PDE2DField } from '../webgl/GeneralPDE2DSolver';

const DEFAULT_FIELDS: PDE2DField[] = [
  { name: 'u', initial: 'exp(-(x^2 + y^2))', rhs: '0.1 * (u_xx + u_yy)' },
];

const CHANNELS = ['r', 'g', 'b', 'a'];

export default function GeneralPDE2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const solverRef = useRef<GeneralPDE2DSolver | null>(null);
  const timeRef = useRef(0);
  const fieldsRef = useRef(DEFAULT_FIELDS);
  const domainRef = useRef<PDE2DDomain>({ xMin: -5, xMax: 5, yMin: -5, yMax: 5 });
  const [fields, setFields] = useState<PDE2DField[]>(DEFAULT_FIELDS);
  const [domain, setDomain] = useState<PDE2DDomain>(domainRef.current);
  const [gridSize, setGridSize] = useState(128);
  const [boundary, setBoundary] = useState<'neumann' | 'periodic' | 'dirichlet'>('neumann');
  const [timeStep, setTimeStep] = useState(0.001);
  const [endTime, setEndTime] = useState(2);
  const [colorMin, setColorMin] = useState(0);
  const [colorMax, setColorMax] = useState(1);
  const [activeField, setActiveField] = useState(0);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [solverReady, setSolverReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  fieldsRef.current = fields;
  domainRef.current = domain;

  const render = useCallback(() => {
    solverRef.current?.render(activeField, colorMin, colorMax);
  }, [activeField, colorMin, colorMax]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsRunning(false);
    setSolverReady(false);
    timeRef.current = 0;
    setTime(0);
    let solver: GeneralPDE2DSolver;
    try {
      solver = new GeneralPDE2DSolver(canvas, gridSize, gridSize, boundary);
      solverRef.current = solver;
      solver.setEquations(fieldsRef.current);
      solver.setInitialState(fieldsRef.current, domainRef.current);
      solver.render(activeField, colorMin, colorMax);
      setSolverReady(true);
      setError(null);
    } catch (cause) {
      solverRef.current = null;
      setSolverReady(false);
      setError(cause instanceof Error ? cause.message : String(cause));
      return;
    }
    return () => {
      solver.dispose();
      if (solverRef.current === solver) {
        solverRef.current = null;
        setSolverReady(false);
      }
    };
  }, [gridSize, boundary]);

  useEffect(() => render(), [render]);

  const applyEquations = () => {
    const solver = solverRef.current;
    if (!solver) return;
    try {
      solver.setEquations(fields);
      solver.setInitialState(fields, domain);
      timeRef.current = 0;
      setTime(0);
      setIsRunning(false);
      setSolverReady(true);
      setError(null);
      solver.render(activeField, colorMin, colorMax);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  useEffect(() => {
    if (!isRunning) return;
    const solver = solverRef.current;
    if (!solver) {
      setIsRunning(false);
      return;
    }
    let frame = 0;
    let lastReportedTime = timeRef.current;
    const advanceFrame = () => {
      for (let i = 0; i < 2 && timeRef.current < endTime; i++) {
        solver.advance(timeStep, domainRef.current, timeRef.current);
        timeRef.current = Math.min(endTime, timeRef.current + timeStep);
      }
      solver.render(activeField, colorMin, colorMax);
      if (Math.abs(timeRef.current - lastReportedTime) >= Math.max(timeStep, 0.03) || timeRef.current >= endTime) {
        lastReportedTime = timeRef.current;
        setTime(timeRef.current);
      }
      if (timeRef.current >= endTime) {
        setIsRunning(false);
        return;
      }
      frame = window.requestAnimationFrame(advanceFrame);
    };
    frame = window.requestAnimationFrame(advanceFrame);
    return () => window.cancelAnimationFrame(frame);
  }, [isRunning, timeStep, endTime, activeField, colorMin, colorMax]);

  const updateField = (index: number, key: keyof PDE2DField, value: string) => {
    setFields(current => current.map((field, fieldIndex) => fieldIndex === index ? { ...field, [key]: value } : field));
  };

  const updateDomain = (key: keyof PDE2DDomain, value: number) => {
    setDomain(current => ({ ...current, [key]: value }));
  };

  const reset = () => {
    setIsRunning(false);
    applyEquations();
  };

  const addField = () => {
    if (fields.length >= 4) return;
    const name = ['u', 'v', 'w', 'q'][fields.length];
    setFields(current => [...current, { name, initial: '0', rhs: '0' }]);
    setActiveField(fields.length);
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto p-3 sm:p-4 lg:overflow-hidden">
      <div className="grid grid-cols-1 gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 sm:p-4 lg:flex lg:min-h-0 lg:flex-col">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">2D solution</h2>
              <p className="text-sm text-gray-600">GPU field view · t = {time.toFixed(3)}</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span>Display field</span>
              <select value={activeField} onChange={event => setActiveField(Number(event.target.value))} className="min-h-11 rounded border border-gray-300 bg-white px-2">
                {fields.map((field, index) => <option key={`${field.name}-${index}`} value={index}>{field.name}</option>)}
              </select>
            </label>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center rounded border border-slate-200 bg-slate-50 p-1">
            <canvas ref={canvasRef} className="aspect-square w-full max-h-[65vh] max-w-full" aria-label={`2D heatmap of ${fields[activeField]?.name ?? 'solution'}`} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex min-h-11 items-center gap-2">
              <span>{colorMin}</span>
              <div className="h-3 w-40 max-w-[45vw] rounded bg-gradient-to-r from-blue-800 via-teal-500 to-amber-300" aria-hidden="true" />
              <span>{colorMax}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1">Min <input aria-label="Heatmap color minimum" type="number" value={colorMin} onChange={event => setColorMin(Number(event.target.value))} className="w-20 rounded border px-2 py-1" /></label>
              <label className="flex items-center gap-1">Max <input aria-label="Heatmap color maximum" type="number" value={colorMax} onChange={event => setColorMax(Number(event.target.value))} className="w-20 rounded border px-2 py-1" /></label>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button type="button" onClick={() => setIsRunning(value => !value)} disabled={!solverReady} className="min-h-11 rounded bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{isRunning ? 'Pause' : 'Start'}</button>
            <button type="button" onClick={() => { const solver = solverRef.current; if (!solver) return; solver.advance(timeStep, domain, timeRef.current); timeRef.current += timeStep; setTime(timeRef.current); render(); }} disabled={isRunning || !solverReady} className="min-h-11 rounded border border-gray-300 px-4 text-sm font-medium disabled:opacity-50">Step</button>
            <button type="button" onClick={reset} className="min-h-11 rounded border border-gray-300 px-4 text-sm font-medium">Reset</button>
          </div>
        </section>

        <aside className="min-w-0 space-y-4 lg:min-h-0 lg:overflow-y-auto">
          <section className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold text-gray-900">Time-dependent equations</h2>
              <button type="button" onClick={addField} disabled={fields.length >= 4} className="min-h-11 rounded border border-gray-300 px-3 text-sm disabled:opacity-50">Add field</button>
            </div>
            <p className="mb-3 text-xs leading-5 text-gray-600">Enter one right-hand side per field: ∂u/∂t = RHS. Use derivatives such as <code>u_x</code>, <code>u_y</code>, <code>u_xx</code>, <code>u_yy</code>, and <code>u_xy</code>. Supported functions include exp, log, sqrt, sin, cos, abs, min, and max.</p>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={`field-${index}`} className="space-y-2 rounded border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm font-medium">Field <input value={field.name} onChange={event => updateField(index, 'name', event.target.value)} className="w-24 rounded border px-2 py-1 font-mono" aria-label={`Field ${index + 1} name`} /></label>
                    {fields.length > 1 && <button type="button" onClick={() => { setFields(current => current.filter((_, fieldIndex) => fieldIndex !== index)); setActiveField(0); }} className="min-h-11 px-2 text-sm text-red-700">Remove</button>}
                  </div>
                  <label className="block text-xs font-medium text-gray-700">Initial condition
                    <input value={field.initial} onChange={event => updateField(index, 'initial', event.target.value)} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-2 font-mono text-sm" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">Right-hand side
                    <input value={field.rhs} onChange={event => updateField(index, 'rhs', event.target.value)} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-2 font-mono text-sm" />
                  </label>
                </div>
              ))}
            </div>
            <button type="button" onClick={applyEquations} className="mt-3 min-h-11 w-full rounded bg-slate-800 px-4 text-sm font-medium text-white hover:bg-slate-900">Apply equations and reset</button>
            {error && <p role="alert" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-800">{error}</p>}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
            <h2 className="mb-3 font-semibold text-gray-900">Grid and time</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['xMin', 'xMax', 'yMin', 'yMax'] as const).map(key => <label key={key} className="text-xs font-medium text-gray-700">{key}
                <input type="number" value={domain[key]} onChange={event => updateDomain(key, Number(event.target.value))} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-2 text-sm" />
              </label>)}
              <label className="text-xs font-medium text-gray-700">Grid points
                <select value={gridSize} onChange={event => setGridSize(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-2 text-sm"><option value={64}>64 × 64</option><option value={128}>128 × 128</option><option value={256}>256 × 256</option></select>
              </label>
              <label className="text-xs font-medium text-gray-700">Boundary
                <select value={boundary} onChange={event => setBoundary(event.target.value as typeof boundary)} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-2 text-sm"><option value="neumann">No-flux (Neumann)</option><option value="periodic">Periodic</option><option value="dirichlet">Fixed zero (Dirichlet)</option></select>
              </label>
              <label className="text-xs font-medium text-gray-700">Time step
                <input type="number" min="0.00001" step="any" value={timeStep} onChange={event => setTimeStep(Math.max(0.00001, Number(event.target.value)))} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-gray-700">End time
                <input type="number" min="0.00001" step="any" value={endTime} onChange={event => setEndTime(Math.max(0.00001, Number(event.target.value)))} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-2 text-sm" />
              </label>
            </div>
          </section>
          <p className="px-1 pb-2 text-xs leading-5 text-gray-500">Forward Euler uses finite differences on the GPU. Stability depends on the chosen equation, grid spacing, and time step.</p>
        </aside>
      </div>
    </div>
  );
}
