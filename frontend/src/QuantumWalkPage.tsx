import React, { useState, useEffect, useCallback, useRef } from 'react';
import Plot from 'react-plotly.js';
import { useAppStore } from './stores/appStore';
import * as math from 'mathjs';
import {
  StateVector,
  MatrixOperator,
  SparseOperator,
  createSparseMatrix,
  setSparseEntry,
} from '../../packages/ts-quantum/src';

// --- Types ---

type QuantumWalk1DCoin = 'hadamard' | 'grover' | 'rotation';
type QuantumWalk1DBoundary = 'reflecting' | 'periodic';
type ClassicalModelType = 'simple' | 'persistent';
type ViewType = 'visualization' | 'analysis' | 'education';

interface QuantumWalk1DData {
  step: number;
  probabilities: { position: number; probability: number }[];
  centerOfMass: number;
  variance: number;
  totalProbability: number;
  maxProbability: number;
}

interface QuantumWalkState {
  state: StateVector;
  coinOp: MatrixOperator;
  shiftOp: SparseOperator;
  latticeSize: number;
  currentStep: number;
  history: Array<{ step: number; data: QuantumWalk1DData }>;
}

interface ClassicalWalkState {
  probabilities: number[];
  pLeft?: number[]; // For persistent walk
  pRight?: number[]; // For persistent walk
  latticeSize: number;
  currentStep: number;
  persistence: number;
  history: Array<{ step: number; data: QuantumWalk1DData }>;
}

interface VarianceGrowth {
  step: number;
  quantumVariance: number;
  classicalVariance: number;
  advantage: number;
}

// --- Constants ---

const INITIAL_LATTICE_SIZE = 51;
const DEFAULT_PERSISTENCE = 0.9;
const ANIMATION_DELAY = 100;

const QuantumWalkPage: React.FC = () => {
  const { activeTab } = useAppStore();
  
  // UI State
  const [currentView, setCurrentView] = useState<ViewType>('visualization');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  
  // Simulation Parameters
  const [latticeSize, setLatticeSize] = useState(INITIAL_LATTICE_SIZE);
  const [coinType, setCoinType] = useState<QuantumWalk1DCoin>('hadamard');
  const [boundaryType, setBoundaryType] = useState<QuantumWalk1DBoundary>('reflecting');
  const [theta, setTheta] = useState(Math.PI / 4);
  const [compareClassical, setCompareClassical] = useState(true);
  const [overlayClassical, setOverlayClassical] = useState(true);
  const [classicalModel, setClassicalModel] = useState<ClassicalModelType>('simple');
  const [persistence, setPersistence] = useState(DEFAULT_PERSISTENCE);
  const [decoherence, setDecoherence] = useState(0);
  const [ensembleSize, setEnsembleSize] = useState(50);
  const [maxSteps, setMaxSteps] = useState(10);
  
  // Simulation Data State
  const [currentStep, setCurrentStep] = useState(0);
  const [quantumData, setQuantumData] = useState<QuantumWalk1DData | null>(null);
  const [classicalData, setClassicalData] = useState<QuantumWalk1DData | null>(null);
  const [varianceAnalysis, setVarianceAnalysis] = useState<VarianceGrowth[]>([]);
  
  // Refs for simulation state buffers
  const quantumStateRef = useRef<QuantumWalkState | null>(null);
  const classicalStateRef = useRef<ClassicalWalkState | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Utility Functions ---

  const calculateSpreadWidth = (probabilities: { position: number; probability: number }[]): number => {
    const activePositions = probabilities.filter(p => p.probability > 0.001);
    if (activePositions.length === 0) return 0;
    const positions = activePositions.map(p => p.position);
    return Math.max(...positions) - Math.min(...positions);
  };

  const determineRegime = (step: number, size: number, variance: number): string => {
    if (step === 0) return 'Initial';
    if (Math.sqrt(variance) > size / 4) return 'Boundary effects';
    if (step < 5) return 'Ballistic';
    return 'Diffusive (Decoherence)';
  };

  const weightedAverage = (values: number[], weights: number[]): number => {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return 0;
    const weightedSum = values.reduce((sum, v, i) => sum + v * weights[i], 0);
    return weightedSum / totalWeight;
  };

  const calculateVariance = (values: number[], weights: number[]): number => {
    if (values.length === 0) return 0;
    const mean = weightedAverage(values, weights);
    const squaredDiffs = values.map(v => (v - mean) ** 2);
    return weightedAverage(squaredDiffs, weights);
  };

  const extractQuantumData = (state: StateVector, size: number, step: number): QuantumWalk1DData => {
    const probabilities: { position: number; probability: number }[] = [];
    const rawProbs: number[] = [];
    const x0 = (size - 1) / 2;
    let maxProb = 0;

    for (let pos = 0; pos < size; pos++) {
      const leftAmp = state.amplitudes[pos];
      const rightAmp = state.amplitudes[size + pos];
      const prob = Math.abs(leftAmp.re) ** 2 + Math.abs(leftAmp.im) ** 2 +
                   Math.abs(rightAmp.re) ** 2 + Math.abs(rightAmp.im) ** 2;
      
      probabilities.push({ position: pos - x0, probability: prob });
      rawProbs.push(prob);
      maxProb = Math.max(maxProb, prob);
    }

    const positions = Array.from({ length: size }, (_, i) => i - x0);
    const centerOfMass = weightedAverage(positions, rawProbs);
    const variance = calculateVariance(positions, rawProbs);

    return {
      step,
      probabilities,
      centerOfMass,
      variance,
      totalProbability: rawProbs.reduce((a, b) => a + b, 0),
      maxProbability: maxProb
    };
  };

  const extractClassicalData = (probs: number[], size: number, step: number): QuantumWalk1DData => {
    const x0 = (size - 1) / 2;
    const probabilities = probs.map((p, i) => ({ position: i - x0, probability: p }));
    const positions = Array.from({ length: size }, (_, i) => i - x0);
    const centerOfMass = weightedAverage(positions, probs);
    const variance = calculateVariance(positions, probs);

    return {
      step,
      probabilities,
      centerOfMass,
      variance,
      totalProbability: probs.reduce((a, b) => a + b, 0),
      maxProbability: Math.max(...probs)
    };
  };

  // --- Operator Builders ---

  const buildCoinOperator = useCallback((type: QuantumWalk1DCoin, angle: number): MatrixOperator => {
    if (type === 'hadamard') {
      const h = 1 / Math.sqrt(2);
      return new MatrixOperator([
        [math.complex(h, 0), math.complex(h, 0)],
        [math.complex(h, 0), math.complex(-h, 0)]
      ], 'unitary');
    }
    if (type === 'grover') {
      return new MatrixOperator([
        [math.complex(0, 0), math.complex(1, 0)],
        [math.complex(1, 0), math.complex(0, 0)]
      ], 'unitary');
    }
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new MatrixOperator([
      [math.complex(c, 0), math.complex(-s, 0)],
      [math.complex(s, 0), math.complex(c, 0)]
    ], 'unitary');
  }, []);

  const buildShiftOperator = useCallback((size: number, boundary: QuantumWalk1DBoundary): SparseOperator => {
    const dim = 2 * size;
    const matrix = createSparseMatrix(dim, dim);

    for (let pos = 0; pos < size; pos++) {
      // Left-moving component
      const leftIdx = pos;
      if (boundary === 'periodic') {
        setSparseEntry(matrix, (pos - 1 + size) % size + size, leftIdx, math.complex(1, 0));
      } else {
        if (pos > 0) setSparseEntry(matrix, pos - 1 + size, leftIdx, math.complex(1, 0));
        else setSparseEntry(matrix, 0 + size, leftIdx, math.complex(1, 0)); // Reflect
      }

      // Right-moving component
      const rightIdx = size + pos;
      if (boundary === 'periodic') {
        setSparseEntry(matrix, (pos + 1) % size, rightIdx, math.complex(1, 0));
      } else {
        if (pos < size - 1) setSparseEntry(matrix, pos + 1, rightIdx, math.complex(1, 0));
        else setSparseEntry(matrix, size - 1, rightIdx, math.complex(1, 0)); // Reflect
      }
    }
    return new SparseOperator(matrix, 'unitary');
  }, []);

  // --- Simulation Control ---

  const initializeWalk = useCallback(() => {
    // Initialize Quantum
    const dim = 2 * latticeSize;
    const center = Math.floor(latticeSize / 2);
    const coinOp = buildCoinOperator(coinType, theta);
    const shiftOp = buildShiftOperator(latticeSize, boundaryType);
    
    const amps = new Array(dim).fill(0).map(() => math.complex(0, 0));
    const invSqrt2 = 1 / Math.sqrt(2);
    amps[center] = math.complex(invSqrt2, 0);
    amps[latticeSize + center] = math.complex(invSqrt2, 0);
    const state = new StateVector(dim, amps);
    
    const qData = extractQuantumData(state, latticeSize, 0);
    quantumStateRef.current = { state, coinOp, shiftOp, latticeSize, currentStep: 0, history: [{ step: 0, data: qData }] };
    setQuantumData(qData);

    // Initialize Classical
    if (compareClassical) {
      const probs = new Array(latticeSize).fill(0);
      probs[center] = 1.0;
      const cData = extractClassicalData(probs, latticeSize, 0);
      
      if (classicalModel === 'simple') {
        classicalStateRef.current = { probabilities: probs, latticeSize, currentStep: 0, persistence: 0.5, history: [{ step: 0, data: cData }] };
      } else {
        const pL = new Array(latticeSize).fill(0);
        const pR = new Array(latticeSize).fill(0);
        pL[center] = 0.5;
        pR[center] = 0.5;
        classicalStateRef.current = { probabilities: probs, pLeft: pL, pRight: pR, latticeSize, currentStep: 0, persistence, history: [{ step: 0, data: cData }] };
      }
      setClassicalData(cData);
    } else {
      classicalStateRef.current = null;
      setClassicalData(null);
    }

    setCurrentStep(0);
    setVarianceAnalysis([]);
  }, [latticeSize, coinType, boundaryType, theta, compareClassical, classicalModel, persistence, buildCoinOperator, buildShiftOperator]);

  const stepWalk = useCallback(() => {
    if (!quantumStateRef.current) return;

    // Step Quantum with Decoherence support
    const qState = quantumStateRef.current;
    const size = qState.latticeSize;
    const identityMatrix = Array.from({ length: size }, (_, i) => 
      Array.from({ length: size }, (_, j) => i === j ? math.complex(1, 0) : math.complex(0, 0))
    );
    const identityOp = new MatrixOperator(identityMatrix, 'unitary');
    const fullCoinOp = qState.coinOp.tensorProduct(identityOp);
    
    let nextQState = fullCoinOp.apply(qState.state);
    nextQState = qState.shiftOp.apply(nextQState);
    
    // Apply Decoherence (Coin Measurement with probability p)
    if (decoherence > 0) {
      if (Math.random() < decoherence) {
        // Measure coin: project onto |0> or |1>
        const amplitudes = nextQState.amplitudes;
        const probLeft = amplitudes.slice(0, size).reduce((sum, amp) => sum + Math.abs(amp.re)**2 + Math.abs(amp.im)**2, 0);
        const probRight = amplitudes.slice(size).reduce((sum, amp) => sum + Math.abs(amp.re)**2 + Math.abs(amp.im)**2, 0);
        const total = probLeft + probRight;
        
        const newAmps = new Array(size * 2).fill(math.complex(0, 0));
        if (Math.random() < probLeft / total) {
          // Collapsed to Left (coin 0)
          for (let i = 0; i < size; i++) newAmps[i] = math.divide(amplitudes[i], Math.sqrt(probLeft / total)) as any;
        } else {
          // Collapsed to Right (coin 1)
          for (let i = 0; i < size; i++) newAmps[size + i] = math.divide(amplitudes[size + i], Math.sqrt(probRight / total)) as any;
        }
        nextQState = new StateVector(size * 2, newAmps);
      }
    }

    nextQState = nextQState.normalize();
    qState.state = nextQState;
    qState.currentStep++;
    const nextQData = extractQuantumData(nextQState, qState.latticeSize, qState.currentStep);
    qState.history.push({ step: qState.currentStep, data: nextQData });
    setQuantumData(nextQData);

    // Step Classical
    if (classicalStateRef.current) {
      const cState = classicalStateRef.current;
      const nextProbs = new Array(cState.latticeSize).fill(0);
      
      if (!cState.pLeft || !cState.pRight) {
        // Simple Walk
        for (let i = 0; i < cState.latticeSize; i++) {
          if (cState.probabilities[i] > 0) {
            nextProbs[i > 0 ? i - 1 : 0] += cState.probabilities[i] * 0.5;
            nextProbs[i < cState.latticeSize - 1 ? i + 1 : cState.latticeSize - 1] += cState.probabilities[i] * 0.5;
          }
        }
        cState.probabilities = nextProbs;
      } else {
        // Persistent Walk
        const nextPL = new Array(cState.latticeSize).fill(0);
        const nextPR = new Array(cState.latticeSize).fill(0);
        const p = cState.persistence;
        
        for (let i = 0; i < cState.latticeSize; i++) {
          if (cState.pLeft[i] > 0) {
            if (i > 0) {
              nextPL[i - 1] += cState.pLeft[i] * p;
              nextPR[i - 1] += cState.pLeft[i] * (1 - p);
            } else nextPR[0] += cState.pLeft[i];
          }
          if (cState.pRight[i] > 0) {
            if (i < cState.latticeSize - 1) {
              nextPR[i + 1] += cState.pRight[i] * p;
              nextPL[i + 1] += cState.pRight[i] * (1 - p);
            } else nextPL[cState.latticeSize - 1] += cState.pRight[i];
          }
        }
        cState.pLeft = nextPL;
        cState.pRight = nextPR;
        cState.probabilities = nextPL.map((l, idx) => l + nextPR[idx]);
      }
      
      cState.currentStep++;
      const nextCData = extractClassicalData(cState.probabilities, cState.latticeSize, cState.currentStep);
      cState.history.push({ step: cState.currentStep, data: nextCData });
      setClassicalData(nextCData);
    }

    setCurrentStep(prev => prev + 1);
    
    // Update Analysis
    if (quantumStateRef.current && classicalStateRef.current) {
      const q = quantumStateRef.current.history[quantumStateRef.current.history.length - 1].data;
      const c = classicalStateRef.current.history[classicalStateRef.current.history.length - 1].data;
      setVarianceAnalysis(prev => [...prev, {
        step: q.step,
        quantumVariance: q.variance,
        classicalVariance: c.variance,
        advantage: c.variance > 0 ? q.variance / c.variance : 0
      }]);
    }
  }, []);

  const seekToStep = (step: number) => {
    if (!quantumStateRef.current) return;
    const qHistory = quantumStateRef.current.history.find(h => h.step === step);
    if (qHistory) setQuantumData(qHistory.data);
    
    if (classicalStateRef.current) {
      const cHistory = classicalStateRef.current.history.find(h => h.step === step);
      if (cHistory) setClassicalData(cHistory.data);
    }
    setCurrentStep(step);
  };

  useEffect(() => {
    if (isRunning) timerRef.current = setInterval(stepWalk, ANIMATION_DELAY);
    else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, stepWalk]);

  useEffect(() => { initializeWalk(); }, [initializeWalk]);

  if (activeTab !== 'quantumwalk' as any) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans overflow-hidden">
      {/* Header - Unified with RandomWalkHeader style */}
      <header className="bg-white border-b border-gray-200 p-4 shadow-sm flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Quantum Random Walk Explorer</h1>
          <p className="text-sm text-gray-500">Investigate quantum spreading behavior and decoherence</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
            <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            <span className="font-medium text-gray-700">{isRunning ? "Running" : "Idle"}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Unified with Analysis/Parameter panel style */}
        <aside className={`${isSidebarCollapsed ? 'w-16' : 'w-72'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col flex-shrink-0`}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between overflow-hidden">
            {!isSidebarCollapsed && <h3 className="font-semibold text-gray-700 uppercase tracking-wider text-xs">Explorer Controls</h3>}
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors">
              {isSidebarCollapsed ? '▶' : '◀'}
            </button>
          </div>

          <nav className="flex-1 py-2 overflow-y-auto">
            <button onClick={() => setCurrentView('visualization')} className={`w-full flex items-center p-3 px-4 gap-3 transition-all ${currentView === 'visualization' ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'hover:bg-gray-50 text-gray-600'}`}>
              <span className="text-lg">📊</span>
              {!isSidebarCollapsed && <span className="font-medium text-sm">Visualization</span>}
            </button>
            <button onClick={() => setCurrentView('analysis')} className={`w-full flex items-center p-3 px-4 gap-3 transition-all ${currentView === 'analysis' ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'hover:bg-gray-50 text-gray-600'}`}>
              <span className="text-lg">📈</span>
              {!isSidebarCollapsed && <span className="font-medium text-sm">Analysis</span>}
            </button>
            <button onClick={() => setCurrentView('education')} className={`w-full flex items-center p-3 px-4 gap-3 transition-all ${currentView === 'education' ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'hover:bg-gray-50 text-gray-600'}`}>
              <span className="text-lg">📚</span>
              {!isSidebarCollapsed && <span className="font-medium text-sm">Education</span>}
            </button>
          </nav>

          {!isSidebarCollapsed && (
            <div className="p-4 border-t border-gray-200 space-y-4">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quick Controls</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={stepWalk} disabled={isRunning} className="py-2 px-3 bg-white border border-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-50 shadow-sm disabled:opacity-50 transition-colors">
                    Step
                  </button>
                  <button onClick={initializeWalk} className="py-2 px-3 bg-white border border-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-50 shadow-sm transition-colors">
                    Reset
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Lattice</label>
                    <select value={latticeSize} onChange={e => setLatticeSize(parseInt(e.target.value))} className="text-xs p-1.5 border border-gray-200 rounded bg-white w-full">
                      {[11, 21, 31, 51, 101].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Coin</label>
                    <select value={coinType} onChange={e => setCoinType(e.target.value as QuantumWalk1DCoin)} className="text-xs p-1.5 border border-gray-200 rounded bg-white w-full">
                      <option value="hadamard">Hadamard</option>
                      <option value="grover">Grover</option>
                      <option value="rotation">Rotation</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Simulation Info</h4>
                <div className="bg-gray-50 rounded p-3 space-y-1.5 border border-gray-100">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Current Step:</span>
                    <span className="font-mono font-bold text-blue-600">{currentStep}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Regime:</span>
                    <span className="font-medium text-gray-700">{quantumData ? determineRegime(currentStep, latticeSize, quantumData.variance) : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Area - Unified Panel Style */}
        <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
          {currentView === 'visualization' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              {/* Parameter Specification Panel - Styled like RandomWalkParameterPanel */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-700 text-sm tracking-wide">PARAMETER SPECIFICATION</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-600">Lattice Size:</label>
                      <input type="number" value={latticeSize} onChange={e => setLatticeSize(parseInt(e.target.value))} className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition-all" />
                      <span className="text-[10px] text-gray-400 font-medium tracking-tight">5-31, odd preferred for symmetric origin</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-600">Boundary Conditions:</label>
                      <select value={boundaryType} onChange={e => setBoundaryType(e.target.value as QuantumWalk1DBoundary)} className="p-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="reflecting">Reflecting (coin flip)</option>
                        <option value="periodic">Periodic (wrap-around)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-600">Classical Model:</label>
                      <select value={classicalModel} onChange={e => setClassicalModel(e.target.value as ClassicalModelType)} className="p-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="simple">Simple (memoryless)</option>
                        <option value="persistent">Persistent (telegraph)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-600">Evolution Steps:</label>
                      <input type="number" value={maxSteps} onChange={e => setMaxSteps(parseInt(e.target.value))} className="p-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      <span className="text-[10px] text-gray-400 font-medium">1-100 maximum recommended</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-600">Decoherence p:</label>
                      <input type="number" value={decoherence} onChange={e => setDecoherence(parseFloat(e.target.value))} className="p-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500" step="0.01" min="0" max="1" />
                      <span className="text-[10px] text-gray-400 font-medium">0 = unitary limit, 1 = classical limit</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-600">Coin Type:</label>
                      <select value={coinType} onChange={e => setCoinType(e.target.value as QuantumWalk1DCoin)} className="p-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="hadamard">Hadamard (standard)</option>
                        <option value="grover">Grover (diffusion)</option>
                        <option value="rotation">Rotation (angle θ)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-600">Ensemble Size:</label>
                      <input type="number" value={ensembleSize} onChange={e => setEnsembleSize(parseInt(e.target.value))} className="p-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      <span className="text-[10px] text-gray-400 font-medium">Measurement sample size for p &gt; 0</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulation Controls & Timeline */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-4">
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <h3 className="font-bold text-gray-700 text-sm uppercase">Timeline</h3>
                        <span className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">Step {currentStep} / {maxSteps}</span>
                      </div>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer select-none">
                          <input type="checkbox" checked={compareClassical} onChange={e => setCompareClassical(e.target.checked)} className="rounded text-blue-600" />
                          Compare Classical
                        </label>
                        {compareClassical && (
                          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer select-none">
                            <input type="checkbox" checked={overlayClassical} onChange={e => setOverlayClassical(e.target.checked)} className="rounded text-blue-600" />
                            Overlay Plots
                          </label>
                        )}
                      </div>
                    </div>
                    <input type="range" min="0" max={quantumStateRef.current?.history.length ? quantumStateRef.current.history.length - 1 : 0} value={currentStep} onChange={e => seekToStep(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>

                  {/* Main Display Container */}
                  <div className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-700 text-sm tracking-wide uppercase">Simulation Output</h3>
                    </div>
                    <div className="p-4 space-y-6">
                      <div className="aspect-[16/9]">
                        {quantumData && (
                          <Plot
                            data={[{
                              x: quantumData.probabilities.map(p => p.position),
                              y: quantumData.probabilities.map(p => p.probability),
                              type: 'bar',
                              name: 'Quantum Probabilities',
                              marker: { color: quantumData.probabilities.map((_, i) => `hsl(${210 + i * 5}, 70%, 50%)`) }
                            } as any,
                            ...(compareClassical && overlayClassical && classicalData ? [{
                              x: classicalData.probabilities.map(p => p.position),
                              y: classicalData.probabilities.map(p => p.probability),
                              type: 'scatter',
                              mode: 'lines',
                              name: 'Classical Probabilities',
                              line: { color: '#ef4444', width: 3 }
                            } as any] : [])]}
                            layout={{
                              autosize: true,
                              margin: { t: 10, r: 10, l: 50, b: 40 },
                              xaxis: { title: 'Position', gridcolor: '#f3f4f6' },
                              yaxis: { title: 'Probability', gridcolor: '#f3f4f6', range: [0, 1] },
                              paper_bgcolor: 'rgba(0,0,0,0)',
                              plot_bgcolor: 'rgba(0,0,0,0)',
                              showlegend: true,
                              legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1.1 }
                            }}
                            useResizeHandler
                            style={{ width: '100%', height: '100%' }}
                          />
                        )}
                      </div>

                      <div className="bg-gray-50 text-gray-600 p-3 rounded font-serif text-center italic border border-gray-100 text-sm">
                        |\u03c8(t+1)\u27e9 = S(C \u2297 I)|\u03c8(t)\u27e9
                      </div>

                      {compareClassical && !overlayClassical && (
                        <div className="border-t border-gray-100 pt-6">
                          <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase">Classical Walk Comparison</h4>
                          <div className="aspect-[16/9]">
                            {classicalData && (
                              <Plot
                                data={[{
                                  x: classicalData.probabilities.map(p => p.position),
                                  y: classicalData.probabilities.map(p => p.probability),
                                  type: 'bar',
                                  name: 'Classical Probabilities',
                                  marker: { color: classicalData.probabilities.map((_, i) => `hsl(${140 + i * 3}, 60%, 50%)`) }
                                } as any]}
                                layout={{
                                  autosize: true,
                                  margin: { t: 10, r: 10, l: 50, b: 40 },
                                  xaxis: { title: 'Position', gridcolor: '#f3f4f6' },
                                  yaxis: { title: 'Probability', gridcolor: '#f3f4f6', range: [0, 1] },
                                  paper_bgcolor: 'rgba(0,0,0,0)',
                                  plot_bgcolor: 'rgba(0,0,0,0)',
                                  showlegend: false
                                }}
                                useResizeHandler
                                style={{ width: '100%', height: '100%' }}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Action Buttons - Unified with RandomWalkParameterPanel */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                    <button onClick={() => setIsRunning(!isRunning)} className={`w-full py-2.5 rounded font-bold text-sm text-white transition-all shadow-sm ${isRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}>
                      {isRunning ? '⏸ Pause' : '▶ Run Walk'}
                    </button>
                    <button onClick={stepWalk} disabled={isRunning} className="w-full py-2.5 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed transition-all">
                      ⏭ Step (single)
                    </button>
                    <button onClick={initializeWalk} className="w-full py-2.5 bg-red-600 text-white rounded font-bold text-sm hover:bg-red-700 shadow-sm transition-all text-center">
                      ↺ Reset Walk
                    </button>
                  </div>

                  {/* Summary Stats Card - Unified with ObservablesPanel style */}
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-blue-600 px-4 py-2 flex items-center gap-2">
                      <span className="text-white">ℹ</span>
                      <h4 className="font-bold text-white text-xs uppercase tracking-widest">Key Metrics</h4>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Quantum Advantage</p>
                        <p className="text-2xl font-bold text-blue-600 tracking-tighter">
                          {(quantumData && classicalData) ? (quantumData.variance / classicalData.variance).toFixed(2) + 'x' : '1.00x'}
                        </p>
                      </div>
                      <div className="h-px bg-gray-100" />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Q-Variance</p>
                          <p className="text-lg font-bold text-gray-700 font-mono tracking-tighter">{quantumData?.variance.toFixed(3) || '0.000'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">C-Variance</p>
                          <p className="text-lg font-bold text-gray-700 font-mono tracking-tighter">{classicalData?.variance.toFixed(3) || '0.000'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparison Statistics Grid - Unified with ObservablesPanel cards */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 uppercase tracking-wide">Comprehensive Observables</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-12">
                  {[
                    { label: 'Quantum σ² (∝ t²)', value: quantumData?.variance.toFixed(4) || '0.0000', color: 'blue' },
                    { label: 'Classical σ² (∝ t)', value: classicalData?.variance.toFixed(4) || 'N/A', color: 'red' },
                    { label: 'Total Probability', value: quantumData?.totalProbability.toFixed(4) || '0.0000', color: 'blue' },
                    { label: 'Center of Mass', value: quantumData?.centerOfMass.toFixed(2) || '0.00', color: 'blue' },
                    { label: 'Max Probability', value: quantumData?.maxProbability.toFixed(4) || '0.0000', color: 'purple' },
                    { label: 'Spread Width', value: quantumData ? calculateSpreadWidth(quantumData.probabilities).toFixed(1) : '0.0', color: 'blue' },
                    { label: 'Current Step', value: currentStep, color: 'gray' },
                    { label: 'Regime', value: quantumData ? determineRegime(currentStep, latticeSize, quantumData.variance) : 'N/A', color: 'emerald' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                      <p className={`text-xl font-bold mt-2 ${
                        stat.color === 'blue' ? 'text-blue-600' : 
                        stat.color === 'red' ? 'text-red-600' : 
                        stat.color === 'purple' ? 'text-purple-600' : 
                        stat.color === 'emerald' ? 'text-emerald-600' : 'text-gray-700'
                      }`}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}


          {currentView === 'analysis' && (
            <div className="space-y-6 max-w-6xl mx-auto pb-12">
              <div className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden flex flex-col">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-700 text-sm tracking-wide uppercase">Variance Growth Analysis</h3>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left bg-white border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">Step</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">Quantum σ² (∝ t²)</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">Classical σ² (∝ t)</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Advantage Factor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {varianceAnalysis.filter((_, i) => i % 5 === 0 || i === varianceAnalysis.length - 1).map((row, i) => (
                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-gray-700 text-sm border-r border-gray-50">{row.step}</td>
                          <td className="px-6 py-4 font-mono text-blue-600 text-sm border-r border-gray-50">{row.quantumVariance.toFixed(4)}</td>
                          <td className="px-6 py-4 font-mono text-red-600 text-sm border-r border-gray-50">{row.classicalVariance.toFixed(4)}</td>
                          <td className="px-6 py-4 font-mono font-bold text-green-600 text-sm">{row.advantage.toFixed(3)}x</td>
                        </tr>
                      ))}
                      {varianceAnalysis.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                            Run simulation to generate analysis data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentView === 'education' && (
            <div className="space-y-8 max-w-4xl mx-auto pb-12">
              <div className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
                <div className="bg-blue-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white tracking-tight">Understanding Quantum Walks</h3>
                </div>
                <div className="p-8 space-y-8">
                  <section className="space-y-4">
                    <p className="text-base text-gray-600 leading-relaxed">
                      Quantum Random Walks (QRW) are the quantum analog of classical random walks. While a classical walker flips a coin and moves to a discrete position, a quantum walker exists in a superposition of positions and directions.
                    </p>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 shadow-sm transition-all hover:shadow-md">
                      <h4 className="text-sm font-bold text-blue-800 uppercase tracking-widest mb-3">Quantum Spreading</h4>
                      <p className="text-blue-900/80 text-sm leading-relaxed">
                        Quantum walks spread quadratically faster than classical walks. The variance grows as 
                        <span className="font-serif italic mx-1">σ² ∝ t²</span> 
                        compared to the classical linear growth 
                        <span className="font-serif italic mx-1">σ² ∝ t</span>.
                      </p>
                    </div>
                    <div className="bg-emerald-50/50 p-6 rounded-xl border border-emerald-100 shadow-sm transition-all hover:shadow-md">
                      <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-widest mb-3">Ballistic vs Diffusive</h4>
                      <p className="text-emerald-900/80 text-sm leading-relaxed">
                        This difference is known as ballistic spreading (quantum) versus diffusive spreading (classical), 
                        representing a fundamental speedup used in quantum algorithms like Grover's search.
                      </p>
                    </div>
                  </div>

                  <section className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-6 shadow-inner">
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest">The Mathematical Framework</h4>
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                        <p className="text-blue-600 font-bold text-xs uppercase mb-1">1. Coin Operation (C)</p>
                        <p className="text-gray-600 text-sm leading-relaxed">Applied to the internal state of the walker to create a superposition of directions (e.g., Left and Right).</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                        <p className="text-blue-600 font-bold text-xs uppercase mb-1">2. Shift Operation (S)</p>
                        <p className="text-gray-600 text-sm leading-relaxed">Entangles the internal coin state with the external position state, moving the walker across the lattice based on the coin's outcome.</p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default QuantumWalkPage;
