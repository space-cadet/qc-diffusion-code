import React, { useRef, useEffect, useState } from "react";
import { SigmaContainer } from "@react-sigma/core";
import Graph from "graphology";
import { useRegisterEvents, useSigma } from "@react-sigma/core";
import { initializeEngine, createParticleContainer, destroyContainer, } from "../config/tsParticlesConfig";
// Graph visualization subcomponent
const GraphVisualization = ({ gridLayoutParams, graphPhysicsRef }: any) => {
    const sigma = useSigma();
    const registerEvents = useRegisterEvents();
    React.useEffect(() => {
        if (graphPhysicsRef.current) {
            const physicsGraph = graphPhysicsRef.current.getGraph();
            const nodes = physicsGraph.getNodes();
            const edges = physicsGraph.getEdges();
            // Create a new graphology graph
            const graph = new Graph();
            // Add nodes with positions based on graph type
            nodes.forEach((node, index) => {
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
            edges.forEach((edge) => {
                try {
                    graph.addEdge(edge.sourceId, edge.targetId, {
                        size: 2,
                        color: gridLayoutParams.showEdgeWeights ? "#f59e0b" : "#94a3b8",
                    });
                }
                catch (error) {
                    console.warn("Could not add edge:", error);
                }
            });
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
// Particle Canvas component with low-level tsParticles control
const ParticleCanvasComponent = ({ gridLayoutParams, simulationStatus, particlesLoaded, tsParticlesContainerRef, boundaryRect, dimension, }: any) => {
    const canvasRef = useRef(null);
    const [isEngineReady, setIsEngineReady] = useState(false);
    const [container, setContainer] = useState(null);
    const animationFrameRef = useRef();
    // Initialize engine on mount
    useEffect(() => {
        const setupEngine = async () => {
            try {
                await initializeEngine();
                setIsEngineReady(true);
            }
            catch (error) {
                console.error("Failed to initialize tsParticles engine:", error);
            }
        };
        setupEngine();
    }, []);
    // Create container when canvas and engine are ready
    useEffect(() => {
        if (!isEngineReady || !canvasRef.current || container) {
            return;
        }
        const setupContainer = async () => {
            try {
                const newContainer = await createParticleContainer(canvasRef.current, gridLayoutParams.particles);
                setContainer(newContainer);
                console.log("ParticleCanvas: container created", {
                    canvasWidth: newContainer.canvas.size.width,
                    canvasHeight: newContainer.canvas.size.height,
                    initialCount: newContainer.particles.count,
                });
                if (tsParticlesContainerRef &&
                    typeof tsParticlesContainerRef === "object") {
                    tsParticlesContainerRef.current = newContainer;
                }
                // Notify parent that container is ready
                particlesLoaded(newContainer);
                console.log("tsParticles container created with", gridLayoutParams.particles, "particles");
            }
            catch (error) {
                console.error("Failed to create tsParticles container:", error);
            }
        };
        setupContainer();
    }, [
        isEngineReady,
        gridLayoutParams.particles,
        particlesLoaded,
        tsParticlesContainerRef,
    ]);
    // Handle particle count changes
    useEffect(() => {
        if (!container)
            return;
        const currentCount = container.particles.count;
        const targetCount = gridLayoutParams.particles;
        if (currentCount !== targetCount) {
            // Clear and recreate particles
            container.particles.clear();
            for (let i = 0; i < targetCount; i++) {
                container.particles.addParticle({
                    x: Math.random() * container.canvas.size.width,
                    y: dimension === '1D' ? container.canvas.size.height / 2 : Math.random() * container.canvas.size.height,
                });
            }
            console.log(`Updated particle count from ${currentCount} to ${targetCount}`);
            console.log("ParticleCanvas: count after rebuild", {
                count: container.particles.count,
            });
        }
    }, [container, gridLayoutParams.particles]);
    // Rendering is now handled exclusively by useParticlesLoader
    // This component only manages container lifecycle and particle count
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (container) {
                destroyContainer(container);
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [container]);
    return (<>
      <canvas ref={canvasRef} className="w-full h-full" style={{ display: isEngineReady ? "block" : "none" }}/>
      {boundaryRect && (<div style={{
                position: "absolute",
                left: boundaryRect.x,
                top: boundaryRect.y,
                width: boundaryRect.w,
                height: boundaryRect.h,
                border: "2px dashed #f59e0b",
                pointerEvents: "none",
                boxSizing: "border-box",
            }}/>)}
      {!isEngineReady && (<div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <p className="text-gray-500">Initializing particle engine...</p>
        </div>)}
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        Particles: {gridLayoutParams.particles} | Status: {simulationStatus}
      </div>
      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        Strategies: {gridLayoutParams.strategies?.length
            ? gridLayoutParams.strategies.map(s => s.toUpperCase()).join(' + ')
            : 'BALLISTIC'}
      </div>
    </>);
};
export const ParticleCanvas = React.memo(({ gridLayoutParams, simulationStatus, tsParticlesContainerRef, particlesLoaded, graphPhysicsRef, boundaryRect, dimension, }: any) => {
    console.log("ParticleCanvas: Component rendering/re-rendering");
    return (<div className="bg-white border rounded-lg p-4 h-full">
      <h3 className="drag-handle text-lg font-semibold mb-4 cursor-move">
        {gridLayoutParams.simulationType === "continuum"
            ? "Particle Canvas"
            : "Graph Visualization"}
      </h3>
      <div className="h-full border rounded-lg relative overflow-hidden">
        {gridLayoutParams.simulationType === "continuum" ? (<ParticleCanvasComponent gridLayoutParams={gridLayoutParams} simulationStatus={simulationStatus} particlesLoaded={particlesLoaded} tsParticlesContainerRef={tsParticlesContainerRef} boundaryRect={boundaryRect} dimension={dimension}/>) : (<div className="w-full h-full relative min-h-0" id="sigma-container">
            <SigmaContainer style={{ height: "100%", width: "100%", minHeight: "200px" }} settings={{
                renderLabels: true,
                defaultNodeColor: "#3b82f6",
                defaultEdgeColor: "#94a3b8",
                labelSize: 12,
                labelWeight: "bold",
                allowInvalidContainer: true,
            }}>
              <GraphVisualization gridLayoutParams={gridLayoutParams} graphPhysicsRef={graphPhysicsRef}/>
            </SigmaContainer>
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              Graph: {gridLayoutParams.graphType} | Nodes:{" "}
              {graphPhysicsRef.current?.getAvailableNodes().length || 0}
            </div>
          </div>)}
      </div>
    </div>);
});
