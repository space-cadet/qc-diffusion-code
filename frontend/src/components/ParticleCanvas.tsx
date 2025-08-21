import React from "react";
import { Particles } from "@tsparticles/react";
import { useAppStore } from "../stores/appStore";
import { getRandomWalkConfig } from "../config/tsParticlesConfig";
import { SigmaContainer } from "@react-sigma/core";
import Graph from "graphology";
import { useRegisterEvents, useSigma } from "@react-sigma/core";
import type { Container } from "@tsparticles/engine";
import type { PhysicsRandomWalk } from "../physics/PhysicsRandomWalk";

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

interface GridLayoutParams {
  simulationType: "continuum" | "graph";
  showAnimation: boolean;
  graphType: "lattice1D" | "lattice2D" | "path" | "complete";
  graphSize: number;
  isPeriodic: boolean;
  showEdgeWeights: boolean;
  particles: number;
  collisionRate: number;
  jumpLength: number;
  velocity: number;
}

interface SimulationState {
  isRunning: boolean;
  time: number;
  collisions: number;
  status: "Running" | "Paused" | "Stopped";
}

interface ParticleCanvasProps {
  gridLayoutParams: GridLayoutParams;
  simulationState: SimulationState;
  tsParticlesContainerRef: React.RefObject<Container>;
  particlesLoaded: (container?: Container) => Promise<void>;
  graphPhysicsRef: React.RefObject<PhysicsRandomWalk>;
}

// Graph visualization subcomponent
const GraphVisualization: React.FC<{
  gridLayoutParams: GridLayoutParams;
  graphPhysicsRef: React.RefObject<PhysicsRandomWalk>;
}> = ({ gridLayoutParams, graphPhysicsRef }) => {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();

  React.useEffect(() => {
    if (graphPhysicsRef.current) {
      const physicsGraph = graphPhysicsRef.current.getGraph();
      const nodes = physicsGraph.getNodes();
      const edges = physicsGraph.getEdges();

      // Create a new graphology graph
      const graph = new Graph<NodeAttributes, EdgeAttributes>();

      // Add nodes with positions based on graph type
      nodes.forEach((node: { id: string }, index: number) => {
        let x = 0;
        let y = 0;

        // Position nodes based on graph type
        switch (gridLayoutParams.graphType) {
          case "lattice1D":
            x = (index - nodes.length / 2) * 30;
            y = 0;
            break;

          case "lattice2D":
            const size = gridLayoutParams.graphSize;
            const row = Math.floor(index / size);
            const col = index % size;
            x = (col - size / 2) * 30;
            y = (row - size / 2) * 30;
            if (row >= size || col >= size) {
              x = 10000;
              y = 10000;
            }
            break;

          case "path":
            x = (index - nodes.length / 2) * 20;
            y = 0;
            break;

          case "complete":
            const angle = (index / nodes.length) * 2 * Math.PI;
            const radius = Math.min(200, nodes.length * 5);
            x = Math.cos(angle) * radius;
            y = Math.sin(angle) * radius;
            break;

          default:
            const defaultAngle = (index / nodes.length) * 2 * Math.PI;
            x = Math.cos(defaultAngle) * 150;
            y = Math.sin(defaultAngle) * 150;
        }

        graph.addNode(node.id, {
          label: node.id,
          x,
          y,
          size: 8,
          color: "#3b82f6",
        });
      });

      // Add edges
      edges.forEach(
        (edge: { id: string; sourceId: string; targetId: string }) => {
          try {
            graph.addEdge(edge.sourceId, edge.targetId, {
              size: 2,
              color: gridLayoutParams.showEdgeWeights ? "#f59e0b" : "#94a3b8",
            });
          } catch (error) {
            console.warn("Could not add edge:", error);
          }
        }
      );

      // Set the graph to sigma
      sigma.setGraph(graph);

      // Register events
      registerEvents({
        clickNode: (event) => console.log("Node clicked:", event.node),
        clickEdge: (event) => console.log("Edge clicked:", event.edge),
      });
    }
  }, [sigma, registerEvents, gridLayoutParams]);

  return null;
};

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({
  gridLayoutParams,
  simulationState,
  tsParticlesContainerRef,
  particlesLoaded,
  graphPhysicsRef,
}) => {
  return (
    <div className="bg-white border rounded-lg p-4 h-full">
      <h3 className="drag-handle text-lg font-semibold mb-4 cursor-move">
        {gridLayoutParams.simulationType === "continuum"
          ? "Particle Canvas"
          : "Graph Visualization"}
      </h3>
      <div className="h-full border rounded-lg relative overflow-hidden">
        {gridLayoutParams.simulationType === "continuum" ? (
          <>
            <Particles
              id="randomWalkParticles"
              options={getRandomWalkConfig(
                gridLayoutParams.particles,
                gridLayoutParams.showAnimation
              )}
              particlesLoaded={particlesLoaded}
              className="w-full h-full"
            />
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              Particles: {gridLayoutParams.particles} | Status:{" "}
              {simulationState.status}
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
                labelWeight: "bold",
              }}
            >
              <GraphVisualization
                gridLayoutParams={gridLayoutParams}
                graphPhysicsRef={graphPhysicsRef}
              />
            </SigmaContainer>
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              Graph: {gridLayoutParams.graphType} | Nodes:{" "}
              {graphPhysicsRef.current?.getAvailableNodes().length || 0}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
