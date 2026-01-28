import React, { useRef, useEffect, useState } from 'react';
import { SimplicialComplex, Simplex } from '../types/simplicial';

interface SimplicialVisualizationProps {
  complex: SimplicialComplex;
  width?: number;
  height?: number;
  showVertices?: boolean;
  showEdges?: boolean;
  showFaces?: boolean;
}

export const SimplicialVisualization: React.FC<SimplicialVisualizationProps> = ({
  complex,
  width = 600,
  height = 400,
  showVertices = true,
  showEdges = true,
  showFaces = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredSimplex, setHoveredSimplex] = useState<Simplex | null>(null);

  // Generate vertex positions for visualization
  const generateVertexPositions = (complex: SimplicialComplex) => {
    // Use stored positions if available (for 2D)
    if (complex.vertexPositions && complex.vertexPositions.size > 0) {
      return complex.vertexPositions;
    }
    
    // Fallback to generated positions for 3D or when positions not available
    const positions: Map<number, { x: number; y: number; z?: number }> = new Map();
    
    if (complex.dimension === 2) {
      // 2D layout - arrange vertices in a triangular or circular pattern
      const vertexCount = complex.vertexCount;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.3;
      
      // For 2D, create a more interesting layout
      if (vertexCount === 3) {
        // Single triangle
        positions.set(0, { x: centerX, y: centerY - radius });
        positions.set(1, { x: centerX - radius * 0.866, y: centerY + radius * 0.5 });
        positions.set(2, { x: centerX + radius * 0.866, y: centerY + radius * 0.5 });
      } else {
        // Circular layout for more vertices
        for (let i = 0; i < vertexCount; i++) {
          const angle = (2 * Math.PI * i) / vertexCount;
          positions.set(i, {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          });
        }
      }
    } else {
      // 3D layout - create tetrahedral arrangement and project onto 2D
      const vertexCount = complex.vertexCount;
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) * 0.15;
      
      if (vertexCount === 4) {
        // Single tetrahedron vertices
        const h = scale * Math.sqrt(2/3); // Height of tetrahedron
        positions.set(0, { x: centerX, y: centerY - h/2 }); // Top vertex
        positions.set(1, { x: centerX - scale, y: centerY + h/2 }); // Base vertex 1
        positions.set(2, { x: centerX + scale, y: centerY + h/2 }); // Base vertex 2
        positions.set(3, { x: centerX, y: centerY + h/2 - scale * 0.5 }); // Base vertex 3
      } else {
        // For more vertices, create multiple tetrahedra or extended structure
        for (let i = 0; i < vertexCount; i++) {
          const theta = (2 * Math.PI * i) / Math.min(vertexCount, 6);
          const phi = Math.PI / 3 + (i % 2) * Math.PI / 6; // Alternating elevation
          
          const x = centerX + scale * 2 * Math.sin(phi) * Math.cos(theta);
          const y = centerY + scale * 2 * Math.cos(phi);
          const z = scale * 2 * Math.sin(phi) * Math.sin(theta);
          
          positions.set(i, { x, y, z });
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
      complex.simplices.forEach(simplex => {
        if (simplex.dimension === 2) {
          const vertices = simplex.vertices.map(v => positions.get(v)!);
          if (vertices.length === 3) {
            ctx.beginPath();
            ctx.moveTo(vertices[0].x, vertices[0].y);
            vertices.forEach(v => ctx.lineTo(v.x, v.y));
            ctx.closePath();
            
            // Fill with semi-transparent color
            ctx.fillStyle = hoveredSimplex?.id === simplex.id 
              ? 'rgba(59, 130, 246, 0.4)' 
              : 'rgba(156, 163, 175, 0.2)';
            ctx.fill();
          }
        }
      });
    }
    
    // Draw edges
    if (showEdges) {
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 2;
      
      // Collect all unique edges from simplices
      const edges = new Set<string>();
      
      complex.simplices.forEach(simplex => {
        const vertices = simplex.vertices;
        
        // For triangles (2D) and tetrahedron faces (3D), draw all edges
        if (simplex.dimension === 2 && vertices.length >= 3) {
          for (let i = 0; i < vertices.length; i++) {
            for (let j = i + 1; j < vertices.length; j++) {
              const edge = [vertices[i], vertices[j]].sort().join('-');
              edges.add(edge);
            }
          }
        }
      });
      
      // Draw each unique edge
      edges.forEach(edge => {
        const [v1, v2] = edge.split('-').map(Number);
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
    let foundSimplex: Simplex | null = null;
    
    for (const simplex of complex.simplices) {
      if (simplex.dimension === 2) {
        const vertices = simplex.vertices.map(v => positions.get(v)!);
        if (vertices.length === 3) {
          // Simple point-in-triangle test
          if (isPointInTriangle(x, y, vertices[0], vertices[1], vertices[2])) {
            foundSimplex = simplex;
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
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-300 rounded-lg bg-white"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredSimplex(null)}
      />
      
      {/* Info panel */}
      <div className="absolute top-2 right-2 bg-white bg-opacity-90 p-2 rounded border border-gray-200 text-xs">
        <div className="font-semibold">Simplicial Complex</div>
        <div>Dimension: {complex.dimension}D</div>
        <div>Vertices: {complex.vertexCount}</div>
        <div>Simplices: {complex.simplices.length}</div>
        {hoveredSimplex && (
          <div className="mt-1 pt-1 border-t border-gray-200">
            <div>Simplex #{hoveredSimplex.id}</div>
            <div>Type: {hoveredSimplex.dimension}D</div>
            <div>Vertices: {hoveredSimplex.vertices.join(', ')}</div>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="absolute bottom-2 left-2 flex gap-2">
        <label className="flex items-center text-xs bg-white bg-opacity-90 px-2 py-1 rounded border border-gray-200">
          <input
            type="checkbox"
            checked={showVertices}
            onChange={(e) => {}}
            className="mr-1"
          />
          Vertices
        </label>
        <label className="flex items-center text-xs bg-white bg-opacity-90 px-2 py-1 rounded border border-gray-200">
          <input
            type="checkbox"
            checked={showEdges}
            onChange={(e) => {}}
            className="mr-1"
          />
          Edges
        </label>
        <label className="flex items-center text-xs bg-white bg-opacity-90 px-2 py-1 rounded border border-gray-200">
          <input
            type="checkbox"
            checked={showFaces}
            onChange={(e) => {}}
            className="mr-1"
          />
          Faces
        </label>
      </div>
    </div>
  );
};
