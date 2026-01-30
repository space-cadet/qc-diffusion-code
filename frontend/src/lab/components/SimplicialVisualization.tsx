import React, { useRef, useEffect, useState } from 'react';
import { SimplicialComplex } from '../types/simplicial';
import { VertexPosition } from '../simplicial';

interface SimplicialVisualizationProps {
  complex: SimplicialComplex;
  width?: number;
  height?: number;
  responsive?: boolean;
  showVertices?: boolean;
  showEdges?: boolean;
  showFaces?: boolean;
}

export const SimplicialVisualization: React.FC<SimplicialVisualizationProps> = ({
  complex,
  width: propWidth = 600,
  height: propHeight = 400,
  responsive = false,
  showVertices: initialShowVertices = true,
  showEdges: initialShowEdges = true,
  showFaces: initialShowFaces = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(propWidth);

  // Responsive sizing
  useEffect(() => {
    if (!responsive || !containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setContainerWidth(w);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [responsive]);

  const width = responsive ? containerWidth : propWidth;
  const height = responsive ? Math.round(containerWidth * (propHeight / propWidth)) : propHeight;
  const [hoveredSimplex, setHoveredSimplex] = useState<{ id: number; dimension: number; vertices: number[] } | null>(null);
  const [showVertices, setShowVertices] = useState(initialShowVertices);
  const [showEdges, setShowEdges] = useState(initialShowEdges);
  const [showFaces, setShowFaces] = useState(initialShowFaces);

  // Generate vertex positions for visualization
  const generateVertexPositions = (complex: SimplicialComplex): Map<number, VertexPosition> => {
    // Use stored positions if available
    if (complex.geometry.positions.size > 0) {
      // Center the existing positions in the viewport
      const positions = new Map<number, VertexPosition>();
      const allPositions = Array.from(complex.geometry.positions.values());
      
      if (allPositions.length === 0) return positions;
      
      // Calculate bounds
      const minX = Math.min(...allPositions.map(p => p.x));
      const maxX = Math.max(...allPositions.map(p => p.x));
      const minY = Math.min(...allPositions.map(p => p.y));
      const maxY = Math.max(...allPositions.map(p => p.y));
      
      const currentWidth = maxX - minX;
      const currentHeight = maxY - minY;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      // Calculate scale to fit in viewport with padding
      const padding = 50;
      const targetWidth = width - 2 * padding;
      const targetHeight = height - 2 * padding;
      const scale = Math.min(targetWidth / currentWidth, targetHeight / currentHeight, 2); // Max scale 2x
      
      // Transform positions to be centered and scaled
      const viewportCenterX = width / 2;
      const viewportCenterY = height / 2;
      
      for (const [vertexId, pos] of complex.geometry.positions) {
        const newX = viewportCenterX + (pos.x - centerX) * scale;
        const newY = viewportCenterY + (pos.y - centerY) * scale;
        positions.set(vertexId, { x: newX, y: newY, z: pos.z });
      }
      
      return positions;
    }
    
    // Fallback to generated positions for when geometry not available
    const positions: Map<number, VertexPosition> = new Map();
    
    if (complex.topology.dimension === 2) {
      // 2D layout - arrange vertices in a triangular or circular pattern
      const vertexCount = complex.topology.vertices.size;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.3;
      
      const vertexIds = Array.from(complex.topology.vertices.keys());
      
      if (vertexCount === 3) {
        // Single triangle
        positions.set(vertexIds[0], { x: centerX, y: centerY - radius });
        positions.set(vertexIds[1], { x: centerX - radius * 0.866, y: centerY + radius * 0.5 });
        positions.set(vertexIds[2], { x: centerX + radius * 0.866, y: centerY + radius * 0.5 });
      } else {
        // Circular layout for more vertices
        for (let i = 0; i < vertexIds.length; i++) {
          const angle = (2 * Math.PI * i) / vertexIds.length;
          positions.set(vertexIds[i], {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          });
        }
      }
    } else {
      // 3D layout - create tetrahedral arrangement and project onto 2D
      const vertexCount = complex.topology.vertices.size;
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) * 0.15;
      
      const vertexIds = Array.from(complex.topology.vertices.keys());
      
      if (vertexCount === 4) {
        // Single tetrahedron vertices
        const h = scale * Math.sqrt(2/3); // Height of tetrahedron
        positions.set(vertexIds[0], { x: centerX, y: centerY - h }); // Top vertex
        positions.set(vertexIds[1], { x: centerX - scale, y: centerY + h/2 }); // Base vertex 1
        positions.set(vertexIds[2], { x: centerX + scale, y: centerY + h/2 }); // Base vertex 2
        positions.set(vertexIds[3], { x: centerX, y: centerY + h/2 - scale * 0.5 }); // Base vertex 3
      } else {
        // For more vertices, create multiple tetrahedra or extended structure
        for (let i = 0; i < vertexIds.length; i++) {
          const theta = (2 * Math.PI * i) / Math.min(vertexCount, 6);
          const phi = Math.PI / 3 + (i % 2) * Math.PI / 6; // Alternating elevation
          
          const x = centerX + scale * 2 * Math.sin(phi) * Math.cos(theta);
          const y = centerY + scale * 2 * Math.cos(phi);
          const z = scale * 2 * Math.sin(phi) * Math.sin(theta);
          
          positions.set(vertexIds[i], { x, y, z });
        }
      }
    }
    
    return positions;
  };

  // Draw the simplicial complex
  const drawComplex = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Generate vertex positions
    const positions = generateVertexPositions(complex);
    
    // Draw faces (2D triangles or 3D tetrahedron faces)
    if (showFaces) {
      if (complex.topology.dimension === 2) {
        // 2D: draw triangles
        for (const [faceId, face] of complex.topology.faces) {
          const vertices = face.vertices.map(v => positions.get(v)!);
          if (vertices.length === 3) {
            ctx.beginPath();
            ctx.moveTo(vertices[0].x, vertices[0].y);
            vertices.forEach(v => ctx.lineTo(v.x, v.y));
            ctx.closePath();
            
            // Fill with semi-transparent color
            ctx.fillStyle = hoveredSimplex?.id === faceId 
              ? 'rgba(59, 130, 246, 0.4)' 
              : 'rgba(156, 163, 175, 0.2)';
            ctx.fill();
          }
        }
      } else {
        // 3D: draw tetrahedron faces
        for (const [faceId, face] of complex.topology.faces) {
          const vertices = face.vertices.map(v => positions.get(v)!);
          if (vertices.length === 3) {
            ctx.beginPath();
            ctx.moveTo(vertices[0].x, vertices[0].y);
            vertices.forEach(v => ctx.lineTo(v.x, v.y));
            ctx.closePath();
            
            // Fill with semi-transparent color
            ctx.fillStyle = hoveredSimplex?.id === faceId 
              ? 'rgba(59, 130, 246, 0.4)' 
              : 'rgba(156, 163, 175, 0.2)';
            ctx.fill();
          }
        }
      }
    }
    
    // Draw edges
    if (showEdges) {
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 2;
      
      // Collect all unique edges from simplices
      const edges = new Set<string>();
      
      for (const [edgeId, edge] of complex.topology.edges) {
        const edgeKey = `${edge.vertices[0]},${edge.vertices[1]}`;
        edges.add(edgeKey);
      }
      
      // Draw each unique edge
      edges.forEach(edge => {
        const [v1, v2] = edge.split(',').map(Number);
        const pos1 = positions.get(v1);
        const pos2 = positions.get(v2);
        
        if (pos1 && pos2) {
          ctx.beginPath();
          ctx.moveTo(pos1.x, pos1.y);
          ctx.lineTo(pos2.x, pos2.y);
          ctx.stroke();
        }
      });
    }
    
    // Draw vertices
    if (showVertices) {
      positions.forEach((pos, vertexId) => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw vertex labels
        ctx.fillStyle = '#1f2937';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`V${vertexId}`, pos.x, pos.y - 15);
      });
    }
  };

  // Handle mouse interactions
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const positions = generateVertexPositions(complex);
    
    // Check if mouse is over any simplex
    let foundSimplex: { id: number; dimension: number; vertices: number[] } | null = null;
    
    if (complex.topology.dimension === 2) {
      for (const [faceId, face] of complex.topology.faces) {
        const vertices = face.vertices.map(v => positions.get(v)!);
        if (vertices.length === 3) {
          // Simple point-in-triangle test
          if (isPointInTriangle(x, y, vertices[0], vertices[1], vertices[2])) {
            foundSimplex = { id: faceId, dimension: 2, vertices: face.vertices };
            break;
          }
        }
      }
    } else {
      // 3D: check tetrahedron faces
      for (const [faceId, face] of complex.topology.faces) {
        const vertices = face.vertices.map(v => positions.get(v)!);
        if (vertices.length === 3) {
          // Simple point-in-triangle test
          if (isPointInTriangle(x, y, vertices[0], vertices[1], vertices[2])) {
            foundSimplex = { id: faceId, dimension: 2, vertices: face.vertices };
            break;
          }
        }
      }
    }
    
    setHoveredSimplex(foundSimplex);
  };

  // Point in triangle test
  const isPointInTriangle = (
    px: number, py: number,
    v0: { x: number; y: number },
    v1: { x: number; y: number },
    v2: { x: number; y: number }
  ): boolean => {
    const sign = (p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }) => {
      return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    };
    
    const d1 = sign({ x: px, y: py }, v0, v1);
    const d2 = sign({ x: px, y: py }, v1, v2);
    const d3 = sign({ x: px, y: py }, v2, v0);
    
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    
    return !(hasNeg && hasPos);
  };

  useEffect(() => {
    drawComplex();
  }, [complex, showVertices, showEdges, showFaces, hoveredSimplex]);

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-300 rounded-lg bg-white max-w-full"
        style={responsive ? { width: '100%', height: 'auto' } : undefined}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredSimplex(null)}
      />
      
      {/* Info panel */}
      <div className="absolute top-2 right-2 bg-white bg-opacity-90 p-2 rounded border border-gray-200 text-xs">
        <div className="font-semibold">Simplicial Complex</div>
        <div>Dimension: {complex.topology.dimension}D</div>
        <div>Vertices: {complex.topology.vertices.size}</div>
        <div>Simplices: {complex.topology.dimension === 2 ? complex.topology.faces.size : complex.topology.tetrahedra.size}</div>
        <div className="mt-1 pt-1 border-t border-gray-200">
          <div>Simplex #{hoveredSimplex?.id || 'None'}</div>
          <div>Type: {hoveredSimplex?.dimension || 'N/A'}D</div>
          <div>Vertices: {hoveredSimplex?.vertices.join(', ') || 'Hover over simplex'}</div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="absolute bottom-2 left-2 flex gap-2">
        <label className="flex items-center text-xs bg-white bg-opacity-90 px-2 py-1 rounded border border-gray-200">
          <input
            type="checkbox"
            checked={showVertices}
            onChange={(e) => setShowVertices(e.target.checked)}
            className="mr-1"
          />
          Vertices
        </label>
        <label className="flex items-center text-xs bg-white bg-opacity-90 px-2 py-1 rounded border border-gray-200">
          <input
            type="checkbox"
            checked={showEdges}
            onChange={(e) => setShowEdges(e.target.checked)}
            className="mr-1"
          />
          Edges
        </label>
        <label className="flex items-center text-xs bg-white bg-opacity-90 px-2 py-1 rounded border border-gray-200">
          <input
            type="checkbox"
            checked={showFaces}
            onChange={(e) => setShowFaces(e.target.checked)}
            className="mr-1"
          />
          Faces
        </label>
      </div>
    </div>
  );
};
