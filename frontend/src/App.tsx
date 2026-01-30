import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import PdeParameterPanel from "./PdeParameterPanel";
const PlotComponent = lazy(() => import("./PlotComponent"));
const RandomWalkSim = lazy(() => import("./RandomWalkSim"));
const QuantumWalkPage = lazy(() => import("./QuantumWalkPage"));
const QuantumWalkPageRefactored = lazy(() => import("./QuantumWalkPageRefactored"));
const AnalysisPage = lazy(() => import("./components/AnalysisPage"));
const LabDemoPage = lazy(() => import("./lab/LabDemoPage"));
const SimplicialGrowthPage = lazy(() => import("./SimplicialGrowthPage"));
const MemoryBankPage = lazy(() => import("./memoryBank").then(module => ({ default: module.MemoryBankPage })));
import { useWebGLSolver } from "./hooks/useWebGLSolver";
import { generateInitialConditions } from "./utils/initialConditions";
import { useAppStore } from "./stores/appStore";

// ---- Tab definitions ----

const ALL_TABS = [
  { id: 'simulation', label: 'PDE Simulation', shortLabel: 'PDE', icon: '📊' },
  { id: 'randomwalksim', label: 'Random Walk Sim', shortLabel: 'RW', icon: '🚶' },
  { id: 'quantumwalk', label: 'Quantum Walk', shortLabel: 'QW', icon: '⚛️' },
  { id: 'quantumwalk-refactored', label: 'Quantum Walk (Framework)', shortLabel: 'QWF', icon: '🔬' },
  { id: 'analysis', label: 'Analysis', shortLabel: 'Anal', icon: '📈' },
  { id: 'labdemo', label: 'Lab Demo', shortLabel: 'Lab', icon: '🧪' },
  { id: 'simplicialgrowth', label: 'Simplicial Growth', shortLabel: 'Simp', icon: '🔺' },
  { id: 'memorybank', label: 'Memory Bank', shortLabel: 'Mem', icon: '📚' },
] as const;

// Bottom bar shows first 4 tabs + "More" button
const BOTTOM_BAR_TABS = ALL_TABS.slice(0, 4);
const OVERFLOW_TABS = ALL_TABS.slice(4);

// ---- Mobile bottom nav + hamburger ----

function MobileBottomNav({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (t: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Hamburger menu overlay */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-30 z-40" onClick={() => setMenuOpen(false)} />
          <div className="fixed bottom-14 left-2 right-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 p-2">
            {OVERFLOW_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { console.debug('[App] Mobile menu tab:', tab.id); setActiveTab(tab.id); setMenuOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 ${
                  activeTab === tab.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 flex items-center justify-around px-1 py-1 safe-area-bottom">
        {BOTTOM_BAR_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { console.debug('[App] Bottom nav tab:', tab.id); setActiveTab(tab.id); }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg min-w-0 flex-1 ${
              activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[9px] leading-tight truncate">{tab.shortLabel}</span>
          </button>
        ))}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg min-w-0 flex-1 ${
            OVERFLOW_TABS.some(t => t.id === activeTab) ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-[9px] leading-tight">More</span>
        </button>
      </div>
    </>
  );
}

// ---- Desktop tab bar ----

function DesktopTabBar({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (t: string) => void }) {
  return (
    <div className="hidden md:block border-b border-gray-200">
      <nav className="flex space-x-1 px-4 overflow-x-auto">
        {ALL_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ---- Main App ----

export default function App() {
    const { activeTab, simulationParams, setActiveTab, setSimulationParams, pdeState, setPdeState } = useAppStore();
    const [currentFrame, setCurrentFrame] = useState(null);
    const canvasRef = useRef(null);
    const { initSolver, runAnimation, stop } = useWebGLSolver();
    const isWebGL = simulationParams.solver_type === 'webgl';

    console.debug('[App] Render, activeTab:', activeTab);

    const initializeConditions = useCallback((params) => {
        console.log("Generating initial conditions with params:", params);
        const initialFrame = generateInitialConditions(params);
        console.log("Generated initial conditions:", initialFrame);
        setCurrentFrame(initialFrame);
        setPdeState({ lastFrame: initialFrame, time: 0, isRunning: false });
    }, []);
    useEffect(() => {
        initializeConditions(simulationParams);
    }, [
        simulationParams.distribution,
        simulationParams.x_min,
        simulationParams.x_max,
        simulationParams.mesh_size,
        simulationParams.selectedEquations,
        simulationParams.dist_center,
        simulationParams.dist_sigma,
        simulationParams.step_left,
        simulationParams.step_right,
        simulationParams.step_height,
        simulationParams.sine_freq,
        simulationParams.sine_amp,
        simulationParams.cos_freq,
        simulationParams.cos_amp,
        simulationParams.dg_center1,
        simulationParams.dg_sigma1,
        simulationParams.dg_center2,
        simulationParams.dg_sigma2,
        simulationParams.dg_weight,
        initializeConditions
    ]);
    const [ws, setWs] = useState(null);
    const connectWebSocket = useCallback(() => {
        if (!isWebGL) {
            const websocket = new WebSocket("ws://localhost:8000/ws/simulate");
            websocket.onopen = () => {
                console.log("WebSocket connected");
                setWs(websocket);
            };
            websocket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === "animation_frame" &&
                    message.data &&
                    "time" in message.data) {
                    const frame = message.data;
                    setCurrentFrame(frame);
                    setPdeState({ lastFrame: frame, time: frame.time });
                }
                else if (message.type === "pause_state" && message.data && typeof message.data === 'object' && 'isRunning' in message.data && typeof message.data.isRunning === 'boolean') {
                    setPdeState({ isRunning: message.data.isRunning });
                }
                else if (message.type === "error") {
                    console.error("Simulation error:", message.message);
                    setPdeState({ isRunning: false });
                }
            };
            websocket.onclose = () => {
                console.log("WebSocket disconnected");
                setWs(null);
                setPdeState({ isRunning: false });
            };
            return websocket;
        }
        return null;
    }, [isWebGL]);
    useEffect(() => {
        if (!isWebGL) {
            const websocket = connectWebSocket();
            return () => websocket?.close();
        }
    }, [connectWebSocket, isWebGL]);
    const handleStart = () => {
        console.log("Starting simulation with params:", simulationParams);
        setPdeState({ isRunning: true });
        if (isWebGL && canvasRef.current) {
            initSolver(canvasRef.current, simulationParams);
            runAnimation(simulationParams, (data) => {
                const frame = data;
                setCurrentFrame(frame);
                setPdeState({ lastFrame: frame, time: data.time });
            }, pdeState.time || 0);
        }
        else if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "start", params: simulationParams }));
        }
    };
    const handleStop = () => {
        console.log("Stopping simulation");
        setPdeState({ isRunning: false, time: 0 });
        if (isWebGL) {
            stop();
        }
        else if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "stop" }));
        }
        setCurrentFrame(null);
        setPdeState({ lastFrame: null });
    };
    const handlePause = () => {
        const newRunningState = !pdeState.isRunning;
        console.log(pdeState.isRunning ? "Pausing simulation" : "Resuming simulation");
        setPdeState({ isRunning: newRunningState });
        if (isWebGL) {
            if (newRunningState) {
                runAnimation(simulationParams, (data) => {
                    const frame = data;
                    setCurrentFrame(frame);
                    setPdeState({ lastFrame: frame, time: data.time });
                }, pdeState.time || 0);
            }
            else {
                stop();
            }
        }
        else if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "pause" }));
        }
    };
    const handleReset = () => {
        console.log("Resetting simulation");
        setPdeState({ isRunning: false, time: 0 });
        if (isWebGL) {
            stop();
        }
        else if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "stop" }));
        }
        initializeConditions(simulationParams);
    };
    return (<div className="h-screen flex flex-col">
      {/* Desktop Tab Navigation */}
      <DesktopTabBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Content - add bottom padding on mobile for the bottom nav */}
      <div className="flex-1 overflow-hidden pb-14 md:pb-0">
        {activeTab === 'simulation' ? (<div className="h-full flex">
            <div className="w-80 hidden md:block">
              <PdeParameterPanel params={simulationParams} onChange={setSimulationParams}/>
            </div>
            <div className="flex-1 relative">
              <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                <PlotComponent frame={pdeState.lastFrame ?? currentFrame} isRunning={pdeState.isRunning} params={simulationParams} onChange={setSimulationParams} onStart={handleStart} onStop={handleStop} onPause={handlePause} onReset={handleReset}/>
              </Suspense>
              {isWebGL && (<canvas ref={canvasRef} width={simulationParams.mesh_size} height={1} style={{ display: 'none' }}/>)}
            </div>
          </div>) : activeTab === 'randomwalksim' ? (<Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}><RandomWalkSim /></Suspense>) : activeTab === 'quantumwalk' ? (<Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}><QuantumWalkPage /></Suspense>) : activeTab === 'quantumwalk-refactored' ? (<Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}><QuantumWalkPageRefactored /></Suspense>) : activeTab === 'analysis' ? (<Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}><AnalysisPage /></Suspense>) : activeTab === 'labdemo' ? (<Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}><LabDemoPage /></Suspense>) : activeTab === 'memorybank' ? (<Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}><MemoryBankPage /></Suspense>) : (<Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}><SimplicialGrowthPage /></Suspense>)}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>);
}
