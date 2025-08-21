import React, { useState, useEffect, useRef, useCallback, Component } from "react";
import RGL, { WidthProvider } from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import { Particles, initParticlesEngine } from "@tsparticles/react";
import type { IParticlesProps } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Container, Engine } from "@tsparticles/engine";
import { SigmaContainer, useRegisterEvents, useSigma } from "@react-sigma/core";
import Graph from "graphology";
import { useAppStore } from "./stores/appStore";

// Define node and edge attribute types
interface NodeAttributes {
  label?: string;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
}

interface EdgeAttributes {
  size?: number;
  color?: string;
}
import { PhysicsRandomWalk } from "./physics/PhysicsRandomWalk";
import type { Particle } from "./physics/types/Particle";
import { DensityCalculator } from "./physics/utils/DensityCalculator";
import { getRandomWalkConfig } from "./config/tsParticlesConfig";

// CSS imports
import "./styles/sigma.css";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ReactGridLayout = WidthProvider(RGL);

// RandomWalkSimulator class for physics integration
class RandomWalkSimulator {
  private physics: PhysicsRandomWalk;
  private particles: Particle[];
  private densityCalculator: DensityCalculator;
  private time: number;
  private animationId: number | null;

  constructor(params: { collisionRate: number; jumpLength: number; velocity: number; particleCount: number }) {
    this.physics = new PhysicsRandomWalk(params);
    this.particles = [];
    this.densityCalculator = new DensityCalculator();
    this.time = 0;
    this.animationId = null;
    this.initializeParticles(params.particleCount);
  }

  private initializeParticles(count: number): void {
    // TODO: Initialize particle array
    this.particles = [];
  }

  step(): void {
    // TODO: Update physics for all particles
    // TODO: Sync with tsParticles
    this.time += 0.016; // 60fps
  }

  start(): void {
    // TODO: Start animation loop
  }

  pause(): void {
    // TODO: Pause animation loop
  }

  reset(): void {
    // TODO: Reset simulation state
    this.time = 0;
  }

  getDensityField() {
    // TODO: Return current density field for telegraph comparison
    return this.densityCalculator.calculateDensity(this.particles);
  }

  updateParameters(params: { collisionRate: number; jumpLength: number; velocity: number; particleCount: number }) {
    // TODO: Update physics parameters
  }
}

export default function RandomWalkSim() {
  // Get parameters from Zustand store (persistent)
  const { gridLayoutParams, setGridLayoutParams } = useAppStore();
  
  // Physics simulation ref
  const simulatorRef = useRef<RandomWalkSimulator | null>(null);
  const tsParticlesContainerRef = useRef<any>(null);
  
  // Keep layout and runtime state local (non-persistent)
  const [layouts, setLayouts] = useState<Layout[]>([
    { i: "parameters", x: 0, y: 0, w: 3, h: 8, minW: 3, minH: 6 },
    { i: "canvas", x: 3, y: 0, w: 9, h: 8, minW: 6, minH: 6 },
    { i: "density", x: 0, y: 8, w: 12, h: 4, minW: 8, minH: 3 },
    { i: "history", x: 0, y: 12, w: 12, h: 4, minW: 6, minH: 2 },
    { i: "replay", x: 0, y: 16, w: 8, h: 3, minW: 6, minH: 2 },
    { i: "export", x: 8, y: 16, w: 4, h: 3, minW: 4, minH: 2 },
  ]);

  const [simulationState, setSimulationState] = useState({
    isRunning: false,
    time: 0,
    collisions: 0,
    status: 'Stopped',
  });

  // Graph physics reference
  const graphPhysicsRef = useRef<PhysicsRandomWalk | null>(null);

  // Initialize physics simulator
  useEffect(() => {
    simulatorRef.current = new RandomWalkSimulator({
      collisionRate: gridLayoutParams.collisionRate,
      jumpLength: gridLayoutParams.jumpLength,
      velocity: gridLayoutParams.velocity,
      particleCount: gridLayoutParams.particles,
    });

    // Initialize graph physics when in graph mode
    if (gridLayoutParams.simulationType === 'graph') {
      graphPhysicsRef.current = new PhysicsRandomWalk({
        collisionRate: gridLayoutParams.collisionRate,
        jumpLength: gridLayoutParams.jumpLength,
        velocity: gridLayoutParams.velocity,
        simulationType: 'graph',
        graphType: gridLayoutParams.graphType,
        graphSize: gridLayoutParams.graphSize,
      });
    }
  }, [gridLayoutParams.simulationType, gridLayoutParams.graphType, gridLayoutParams.graphSize]);

  // Graph visualization component
  const GraphVisualization = () => {
    const sigma = useSigma();
    const registerEvents = useRegisterEvents();
    
    useEffect(() => {
      if (graphPhysicsRef.current) {
        const physicsGraph = graphPhysicsRef.current.getGraph();
        const nodes = physicsGraph.getNodes();
        const edges = physicsGraph.getEdges();
        
        // Create a new graphology graph
        const graph = new Graph<NodeAttributes, EdgeAttributes>();
        
        // Add nodes with positions based on graph type
        const graphType = gridLayoutParams.graphType;
        const graphSize = gridLayoutParams.graphSize;
        
        nodes.forEach((node: { id: string }, index: number) => {
          let x = 0;
          let y = 0;
          
          // Position nodes based on graph type
          switch (graphType) {
            case 'lattice1D':
              // Linear layout for 1D lattice
              x = (index - nodes.length / 2) * 30;
              y = 0;
              break;
              
            case 'lattice2D':
              // Grid layout for 2D lattice
              const size = graphSize;
              const row = Math.floor(index / size);
              const col = index % size;
              // Only place nodes within the grid bounds
              x = (col - size / 2) * 30;
              y = (row - size / 2) * 30;
              // Skip this node if outside grid bounds by moving it far away
              if (row >= size || col >= size) {
                x = 10000; // Move far away
                y = 10000;
              }
              break;
              
            case 'path':
              // Path layout in a line
              x = (index - nodes.length / 2) * 20;
              y = 0;
              break;
              
            case 'complete':
              // Circular layout for complete graph
              const angle = (index / nodes.length) * 2 * Math.PI;
              const radius = Math.min(200, nodes.length * 5);
              x = Math.cos(angle) * radius;
              y = Math.sin(angle) * radius;
              break;
              
            default:
              // Default circular layout
              const defaultAngle = (index / nodes.length) * 2 * Math.PI;
              x = Math.cos(defaultAngle) * 150;
              y = Math.sin(defaultAngle) * 150;
          }
          
          graph.addNode(node.id, {
            label: node.id,
            x,
            y,
            size: 8,
            color: '#3b82f6',
          });
        });
        
        // Add edges
        edges.forEach((edge: { id: string, sourceId: string, targetId: string }) => {
          try {
            graph.addEdge(edge.sourceId, edge.targetId, {
              size: 2,
              color: gridLayoutParams.showEdgeWeights ? '#f59e0b' : '#94a3b8',
            });
          } catch (error) {
            console.warn('Could not add edge:', error);
          }
        });
        
        // Set the graph to sigma
        sigma.setGraph(graph);
        
        // Register events
        registerEvents({
          clickNode: (event) => console.log('Node clicked:', event.node),
          clickEdge: (event) => console.log('Edge clicked:', event.edge),
        });
      }
      
      return () => {
        // Cleanup if needed
      };
    }, [sigma, registerEvents, gridLayoutParams]);

    return null;
  };

  // Update physics parameters when store changes
  useEffect(() => {
    if (simulatorRef.current) {
      simulatorRef.current.updateParameters({
        collisionRate: gridLayoutParams.collisionRate,
        jumpLength: gridLayoutParams.jumpLength,
        velocity: gridLayoutParams.velocity,
        particleCount: gridLayoutParams.particles,
      });
    }
  }, [gridLayoutParams]);

  const onLayoutChange = (layout: Layout[]) => {
    setLayouts(layout);
  };

  const handleStart = () => {
    if (simulatorRef.current) {
      simulatorRef.current.start();
      setSimulationState(prev => ({ ...prev, isRunning: true, status: 'Running' }));
    }
  };

  const handlePause = () => {
    if (simulatorRef.current) {
      if (simulationState.isRunning) {
        simulatorRef.current.pause();
      } else {
        simulatorRef.current.start();
      }
      setSimulationState(prev => ({ 
        ...prev, 
        isRunning: !prev.isRunning, 
        status: prev.isRunning ? 'Paused' : 'Running' 
      }));
    }
  };

  const handleReset = () => {
    if (simulatorRef.current) {
      simulatorRef.current.reset();
      setSimulationState({ isRunning: false, time: 0, collisions: 0, status: 'Stopped' });
    }
  };

  // tsParticles initialization and integration
  useEffect(() => {
    const initEngine = async () => {
      await initParticlesEngine(async (engine) => {
        await loadSlim(engine);
      });
    };
    initEngine();
  }, []);

  const particlesLoaded = useCallback(async (container?: Container) => {
    if (container) {
      tsParticlesContainerRef.current = container;
      console.log("tsParticles container loaded:", container);
    }
  }, []);

  const ParameterPanel = () => (
    <div className="bg-white border rounded-lg p-4 h-full overflow-auto">
      <h3 className="drag-handle text-lg font-semibold mb-4 cursor-move">Parameters</h3>
      
      <div className="space-y-6">
        {/* Simulation Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Simulation Type:</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="simulationType"
                value="continuum"
                checked={gridLayoutParams.simulationType === 'continuum'}
                onChange={(e) => setGridLayoutParams({...gridLayoutParams, simulationType: e.target.value as 'continuum' | 'graph'})}
                className="mr-2"
              />
              Continuum
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="simulationType"
                value="graph"
                checked={gridLayoutParams.simulationType === 'graph'}
                onChange={(e) => setGridLayoutParams({...gridLayoutParams, simulationType: e.target.value as 'continuum' | 'graph'})}
                className="mr-2"
              />
              Graph
            </label>
          </div>
        </div>

        {/* Graph Parameters (only show when graph is selected) */}
        {gridLayoutParams.simulationType === 'graph' && (
          <div className="border rounded p-3 bg-gray-50">
            <h4 className="font-medium mb-2">Graph Parameters</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Graph Type:</label>
                <select
                  value={gridLayoutParams.graphType}
                  onChange={(e) => setGridLayoutParams({...gridLayoutParams, graphType: e.target.value as any})}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="lattice1D">1D Chain</option>
                  <option value="lattice2D">2D Lattice</option>
                  <option value="path">Path Graph</option>
                  <option value="complete">Complete Graph</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Size:</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={gridLayoutParams.graphSize}
                  onChange={(e) => setGridLayoutParams({...gridLayoutParams, graphSize: parseInt(e.target.value)})}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5</span>
                  <span className="font-medium">{gridLayoutParams.graphSize}</span>
                  <span>50</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={gridLayoutParams.isPeriodic}
                    onChange={(e) => setGridLayoutParams({...gridLayoutParams, isPeriodic: e.target.checked})}
                    className="mr-2"
                  />
                  Periodic Boundaries
                </label>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={gridLayoutParams.showEdgeWeights}
                    onChange={(e) => setGridLayoutParams({...gridLayoutParams, showEdgeWeights: e.target.checked})}
                    className="mr-2"
                  />
                  Show Edge Weights
                </label>
              </div>
            </div>
          </div>
        )}
        {/* Particle Count */}
        <div>
          <label className="block text-sm font-medium mb-2">Particles:</label>
          <input
            type="range"
            min="50"
            max="2000"
            step="1"
            value={gridLayoutParams.particles}
            onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, particles: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>50</span>
            <span className="font-medium">{gridLayoutParams.particles}</span>
            <span>2000</span>
          </div>
        </div>

        {/* Collision Rate */}
        <div>
          <label className="block text-sm font-medium mb-2">λ (Collision Rate):</label>
          <input
            type="range"
            min="0.1"
            max="10.0"
            step="0.1"
            value={gridLayoutParams.collisionRate}
            onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, collisionRate: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.1</span>
            <span className="font-medium">{gridLayoutParams.collisionRate}</span>
            <span>10.0</span>
          </div>
        </div>

        {/* Jump Length */}
        <div>
          <label className="block text-sm font-medium mb-2">a (Jump Length):</label>
          <input
            type="range"
            min="0.01"
            max="1.0"
            step="0.01"
            value={gridLayoutParams.jumpLength}
            onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, jumpLength: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.01</span>
            <span className="font-medium">{gridLayoutParams.jumpLength}</span>
            <span>1.0</span>
          </div>
        </div>

        {/* Velocity */}
        <div>
          <label className="block text-sm font-medium mb-2">v (Velocity):</label>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={gridLayoutParams.velocity}
            onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, velocity: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.1</span>
            <span className="font-medium">{gridLayoutParams.velocity}</span>
            <span>5.0</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleStart}
              disabled={simulationState.isRunning}
              className="flex-1 px-3 py-2 bg-green-500 text-white rounded disabled:bg-gray-300"
            >
              ▶️ Start
            </button>
            <button
              onClick={handlePause}
              className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded"
            >
              {simulationState.isRunning ? '⏸️ Pause' : '▶️ Resume'}
            </button>
          </div>
          <button
            onClick={handleReset}
            className="w-full px-3 py-2 bg-red-500 text-white rounded"
          >
            🔄 Reset
          </button>
        </div>

        {/* Status Display */}
        <div className="border-t pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={`font-medium ${
              simulationState.status === 'Running' ? 'text-green-600' : 
              simulationState.status === 'Paused' ? 'text-yellow-600' : 'text-gray-600'
            }`}>
              ● {simulationState.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <span>{simulationState.time.toFixed(1)}s</span>
          </div>
          <div className="flex justify-between">
            <span>Collisions:</span>
            <span>{simulationState.collisions.toLocaleString()}</span>
          </div>
        </div>

        {/* Derived Parameters */}
        <div className="border-t pt-4 space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>D (Diffusion):</span>
            <span>{(gridLayoutParams.velocity ** 2 / (2 * gridLayoutParams.collisionRate)).toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span>Mean Free Path:</span>
            <span>{(gridLayoutParams.velocity / gridLayoutParams.collisionRate).toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span>Mean Wait Time:</span>
            <span>{(1 / gridLayoutParams.collisionRate).toFixed(3)}s</span>
          </div>
        </div>
      </div>
    </div>
  );

  const ParticleCanvas = () => (
    <div className="bg-white border rounded-lg p-4 h-full">
      <h3 className="drag-handle text-lg font-semibold mb-4 cursor-move">
        {gridLayoutParams.simulationType === 'continuum' ? 'Particle Canvas' : 'Graph Visualization'}
      </h3>
      <div className="h-full border rounded-lg relative overflow-hidden">
        {gridLayoutParams.simulationType === 'continuum' ? (
          <>
            <Particles
              id="randomWalkParticles"
              options={getRandomWalkConfig(gridLayoutParams.particles)}
              particlesLoaded={particlesLoaded}
              className="w-full h-full"
            />
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              Particles: {gridLayoutParams.particles} | Status: {simulationState.status}
            </div>
          </>
        ) : (
          <div className="w-full h-full relative" id="sigma-container">
            <SigmaContainer 
              style={{ height: "100%", width: "100%" }}
              settings={{
                renderLabels: true,
                defaultNodeColor: "#3b82f6",
                defaultEdgeColor: "#94a3b8",
                labelSize: 12,
                labelWeight: "bold"
              }}>
              <GraphVisualization />
            </SigmaContainer>
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              Graph: {gridLayoutParams.graphType} | Nodes: {graphPhysicsRef.current?.getAvailableNodes().length || 0}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const DensityComparison = () => (
    <div className="bg-white border rounded-lg p-4 h-full">
      <h3 className="drag-handle text-lg font-semibold mb-4 cursor-move">Density Comparison</h3>
      <div className="h-full border rounded-lg bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">📈</div>
          <div>ρ(x,t) Random Walk vs Telegraph Equation</div>
          <div className="text-sm mt-2 flex gap-4 justify-center">
            <span>Convergence Error: 0.023</span>
            <span>D_eff: 0.89</span>
            <span>v_eff: 1.02</span>
          </div>
        </div>
      </div>
    </div>
  );

  const HistoryPanel = () => (
    <div className="bg-white border rounded-lg p-4 h-full overflow-auto">
      <h3 className="drag-handle text-lg font-semibold mb-4 flex items-center cursor-move">
        📖 Simulation History
      </h3>
      
      {/* History table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Time Range</th>
              <th className="text-left p-2">Parameters</th>
              <th className="text-left p-2">Actions</th>
              <th className="text-left p-2">Preview</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b bg-blue-50">
              <td className="p-2">
                <div className="flex items-center gap-2">
                  ⏰ 0.0s - 5.2s
                  <span className="text-xs bg-green-200 px-1 rounded">● Current</span>
                </div>
              </td>
              <td className="p-2 text-xs">
                λ=2.5, a=0.1<br/>
                v=1.0, N=1000
              </td>
              <td className="p-2">
                <div className="flex gap-1">
                  <button className="text-xs bg-blue-100 px-2 py-1 rounded">👁️</button>
                  <button className="text-xs bg-green-100 px-2 py-1 rounded">📊</button>
                  <button className="text-xs bg-red-100 px-2 py-1 rounded">🗑️</button>
                </div>
              </td>
              <td className="p-2">
                <div className="w-16 h-8 border text-center text-xs flex items-center justify-center">
                  ╱╲<br/>╱__╲
                </div>
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2">
                <div className="flex items-center gap-2">
                  ⏰ 5.2s - 12.8s
                  <span className="text-xs bg-gray-200 px-1 rounded">○ Saved</span>
                </div>
              </td>
              <td className="p-2 text-xs">
                λ=3.0, a=0.1<br/>
                v=1.2, N=1000
              </td>
              <td className="p-2">
                <div className="flex gap-1">
                  <button className="text-xs bg-blue-100 px-2 py-1 rounded">👁️</button>
                  <button className="text-xs bg-green-100 px-2 py-1 rounded">📊</button>
                  <button className="text-xs bg-red-100 px-2 py-1 rounded">🗑️</button>
                </div>
              </td>
              <td className="p-2">
                <div className="w-16 h-8 border text-center text-xs flex items-center justify-center">
                  ╱╲<br/>╱__╲
                </div>
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2">
                <div className="flex items-center gap-2">
                  ⏰ 0.0s - 8.1s
                  <span className="text-xs bg-gray-200 px-1 rounded">○ Saved</span>
                </div>
              </td>
              <td className="p-2 text-xs">
                λ=1.5, a=0.2<br/>
                v=0.8, N=500
              </td>
              <td className="p-2">
                <div className="flex gap-1">
                  <button className="text-xs bg-blue-100 px-2 py-1 rounded">👁️</button>
                  <button className="text-xs bg-green-100 px-2 py-1 rounded">📊</button>
                  <button className="text-xs bg-red-100 px-2 py-1 rounded">🗑️</button>
                </div>
              </td>
              <td className="p-2">
                <div className="w-16 h-8 border text-center text-xs flex items-center justify-center">
                  ╱╲<br/>╱__╲
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const ReplayControls = () => (
    <div className="bg-white border rounded-lg p-4 h-full">
      <h3 className="drag-handle text-lg font-semibold mb-4 flex items-center cursor-move">
        🔄 Replay Controls
      </h3>
      
      <div className="space-y-4">
        <div className="text-sm">
          <strong>Selected Run:</strong> ⏰ 5.2s - 12.8s (λ=3.0, a=0.1, v=1.2)
        </div>
        
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 bg-gray-100 rounded">⏮️</button>
          <button className="px-3 py-1 bg-gray-100 rounded">⏪</button>
          <button className="px-3 py-1 bg-blue-500 text-white rounded">▶️</button>
          <button className="px-3 py-1 bg-gray-100 rounded">⏸️</button>
          <button className="px-3 py-1 bg-gray-100 rounded">⏩</button>
          <button className="px-3 py-1 bg-gray-100 rounded">⏭️</button>
          
          <select className="ml-4 px-2 py-1 border rounded text-sm">
            <option>1x</option>
            <option>0.5x</option>
            <option>2x</option>
            <option>5x</option>
          </select>
          
          <span className="ml-4 text-sm">Time: 7.4s / 12.8s</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '58%' }}></div>
        </div>
        
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input type="checkbox" />
            🔄 Loop
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" />
            📊 Show Metrics
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" />
            ⚖️ Compare Mode
          </label>
        </div>
      </div>
    </div>
  );

  const ExportPanel = () => (
    <div className="bg-white border rounded-lg p-4 h-full">
      <h3 className="drag-handle text-lg font-semibold mb-4 flex items-center cursor-move">
        📊 Data Export
      </h3>
      
      <div className="space-y-4 text-sm">
        <div>
          <label className="block mb-1">Export Format:</label>
          <div className="flex gap-2">
            <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs">CSV</button>
            <button className="px-2 py-1 bg-gray-100 rounded text-xs">JSON</button>
            <button className="px-2 py-1 bg-gray-100 rounded text-xs">HDF5</button>
          </div>
        </div>
        
        <div>
          <label className="block mb-2">Data to Export:</label>
          <div className="space-y-1 text-xs">
            <label className="flex items-center gap-1">
              <input type="checkbox" defaultChecked />
              Particle positions
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" defaultChecked />
              Density field ρ(x,t)
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" defaultChecked />
              Velocity field u(x,t)
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" defaultChecked />
              Collision events
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" defaultChecked />
              Parameters & metadata
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" />
              Individual trajectories
            </label>
          </div>
        </div>
        
        <div>
          <label className="block mb-1">Time Range:</label>
          <select className="w-full px-2 py-1 border rounded text-xs">
            <option>Full Run</option>
            <option>Custom: 2.0s - 8.5s</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-green-500 text-white rounded text-xs">📥 Download</button>
          <button className="px-2 py-1 bg-gray-100 rounded text-xs">📋</button>
          <button className="px-2 py-1 bg-gray-100 rounded text-xs">🔗</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-2">Random Walk → Telegraph Equation</h1>
        <p className="text-gray-600">Interactive simulation showing stochastic particle motion converging to telegraph equation</p>
      </div>
      
      <div className="flex-1 p-4">
        <ReactGridLayout
          className="layout"
          layout={layouts}
          onLayoutChange={onLayoutChange}
          cols={12}
          rowHeight={60}
          isDraggable={true}
          isResizable={true}
          margin={[10, 10]}
          containerPadding={[0, 0]}
          draggableHandle=".drag-handle"
        >
          <div key="parameters" className="bg-gray-100">
            <ParameterPanel />
          </div>
          <div key="canvas" className="bg-gray-100">
            <ParticleCanvas />
          </div>
          <div key="density" className="bg-gray-100">
            <DensityComparison />
          </div>
          <div key="history" className="bg-gray-100">
            <HistoryPanel />
          </div>
          <div key="replay" className="bg-gray-100">
            <ReplayControls />
          </div>
          <div key="export" className="bg-gray-100">
            <ExportPanel />
          </div>
        </ReactGridLayout>
      </div>
    </div>
  );
}
