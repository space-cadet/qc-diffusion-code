import React, { useState } from 'react';
import { SimplicialComplex, MoveType, Dimension } from '../types/simplicial';
import {
  SimplicialComplexTopology,
  SimplicialComplexGeometry,
  createEmptyTopology,
  createEmptyGeometry,
  createInitialTriangleTopology,
  createInitialTetrahedronTopology,
  createTriangleGeometry,
  createTetrahedronGeometry,
  apply1to3,
  apply2to2,
  apply3to1,
  apply1to4,
  apply2to3,
  apply3to2,
  apply4to1,
  addVertex,
  addEdge,
  addFace,
  addTetrahedron,
  faceKey,
} from '../simplicial';
import { SimplicialVisualization } from './SimplicialVisualization';

interface PachnerMoveTesterProps {
  dimension?: Dimension;
  onApplyMove?: (moveType: MoveType) => void;
}

export const PachnerMoveTester: React.FC<PachnerMoveTesterProps> = ({
  dimension = 3,
  onApplyMove,
}) => {
  const [selectedMove, setSelectedMove] = useState<MoveType | null>(null);
  const [previewComplex, setPreviewComplex] = useState<SimplicialComplex | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<Dimension>(dimension);
  const [simplexCount, setSimplexCount] = useState<number>(1);
  
  // Create independent initial complex for testing
  const createTestComplex = (dim: Dimension, count: number): SimplicialComplex => {
    let topology: SimplicialComplexTopology;
    let geometry: SimplicialComplexGeometry;
    
    if (dim === 2) {
      if (count === 1) {
        topology = createInitialTriangleTopology();
        geometry = createTriangleGeometry(140, 100, 60);
      } else if (count === 3) {
        // Create 3 triangles sharing a center vertex (enables 3-1 move)
        topology = createEmptyTopology(2);
        geometry = createEmptyGeometry();
        
        const centerX = 140;
        const centerY = 100;
        const size = 80;
        
        // Center vertex (will have 3 incident faces)
        const centerV = addVertex(topology);
        geometry.positions.set(centerV, { x: centerX, y: centerY });
        
        // 3 outer vertices
        const v0 = addVertex(topology);
        const v1 = addVertex(topology);
        const v2 = addVertex(topology);
        
        geometry.positions.set(v0, { x: centerX, y: centerY - size });
        geometry.positions.set(v1, { x: centerX + size * 0.866, y: centerY + size * 0.5 });
        geometry.positions.set(v2, { x: centerX - size * 0.866, y: centerY + size * 0.5 });
        
        // Create 3 triangles sharing the center
        addFace(topology, v0, v1, centerV);
        addFace(topology, v1, v2, centerV);
        addFace(topology, v2, v0, centerV);
        
        // Create edges
        addEdge(topology, v0, v1);
        addEdge(topology, v1, v2);
        addEdge(topology, v2, v0);
        addEdge(topology, v0, centerV);
        addEdge(topology, v1, centerV);
        addEdge(topology, v2, centerV);
      } else {
        // Create a triangulated square with shared edges (enables 2-2 move)
        topology = createEmptyTopology(2);
        geometry = createEmptyGeometry();
        
        const centerX = 140;
        const centerY = 100;
        const size = 80;
        
        // Create 4 corner vertices
        const v0 = addVertex(topology);
        const v1 = addVertex(topology);
        const v2 = addVertex(topology);
        const v3 = addVertex(topology);
        
        geometry.positions.set(v0, { x: centerX - size, y: centerY - size });
        geometry.positions.set(v1, { x: centerX + size, y: centerY - size });
        geometry.positions.set(v2, { x: centerX + size, y: centerY + size });
        geometry.positions.set(v3, { x: centerX - size, y: centerY + size });
        
        // Create 4 triangles sharing the center - each edge is shared by 2 faces
        // Top-left triangle
        addFace(topology, v0, v1, v2);
        // Bottom-right triangle  
        addFace(topology, v0, v2, v3);
        
        // Create edges
        addEdge(topology, v0, v1);
        addEdge(topology, v1, v2);
        addEdge(topology, v2, v3);
        addEdge(topology, v3, v0);
        addEdge(topology, v0, v2);  // Shared diagonal edge
      }
    } else {
      if (count === 1) {
        topology = createInitialTetrahedronTopology();
        geometry = createTetrahedronGeometry(140, 100, 0, 40);
      } else if (count === 2) {
        // Create 2 tetrahedra sharing a face (enables 2-3 move)
        topology = createEmptyTopology(3);
        geometry = createEmptyGeometry();
        
        const centerX = 140;
        const centerY = 100;
        const centerZ = 0;
        const size = 60;
        
        // Create 5 vertices: 3 shared + 2 opposite
        const v0 = addVertex(topology);
        const v1 = addVertex(topology);
        const v2 = addVertex(topology);
        const v3 = addVertex(topology);
        const v4 = addVertex(topology);

        geometry.positions.set(v0, { x: centerX - size, y: centerY - size, z: centerZ });
        geometry.positions.set(v1, { x: centerX + size, y: centerY - size, z: centerZ });
        geometry.positions.set(v2, { x: centerX, y: centerY + size, z: centerZ });
        geometry.positions.set(v3, { x: centerX, y: centerY, z: centerZ - size });
        geometry.positions.set(v4, { x: centerX, y: centerY, z: centerZ + size });

        // All edges
        for (const [a, b] of [[v0,v1],[v0,v2],[v0,v3],[v0,v4],[v1,v2],[v1,v3],[v1,v4],[v2,v3],[v2,v4]] as [number,number][]) {
          addEdge(topology, a, b);
        }

        // All faces
        addFace(topology, v0, v1, v2); // shared face
        addFace(topology, v0, v1, v3);
        addFace(topology, v0, v2, v3);
        addFace(topology, v1, v2, v3);
        addFace(topology, v0, v1, v4);
        addFace(topology, v0, v2, v4);
        addFace(topology, v1, v2, v4);

        // 2 tetrahedra sharing face (v0, v1, v2)
        addTetrahedron(topology, v0, v1, v2, v3);
        addTetrahedron(topology, v0, v1, v2, v4);
      } else {
        // Create 8 tetrahedra sharing a center point (enables 3-2 and 4-1 moves)
        topology = createEmptyTopology(3);
        geometry = createEmptyGeometry();
        
        const centerX = 140;
        const centerY = 100;
        const centerZ = 0;
        const size = 60;
        
        // Create 8 tetrahedra sharing a center point
        const centerV = addVertex(topology);
        geometry.positions.set(centerV, { x: centerX, y: centerY, z: centerZ });
        
        // Corner vertices of a cube
        const corners = [
          [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
          [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
        ].map(([dx, dy, dz]) => {
          const v = addVertex(topology);
          geometry.positions.set(v, { 
            x: centerX + dx * size, 
            y: centerY + dy * size, 
            z: centerZ + dz * size 
          });
          return v;
        });
        
        // Create tetrahedra from center to each face of the cube
        // Bottom face tetrahedra
        addTetrahedron(topology, corners[0], corners[1], corners[2], centerV);
        addTetrahedron(topology, corners[0], corners[2], corners[3], centerV);
        // Top face tetrahedra
        addTetrahedron(topology, corners[4], corners[5], corners[6], centerV);
        addTetrahedron(topology, corners[4], corners[6], corners[7], centerV);
        // Side tetrahedra
        addTetrahedron(topology, corners[0], corners[1], corners[5], centerV);
        addTetrahedron(topology, corners[0], corners[4], corners[5], centerV);
        addTetrahedron(topology, corners[2], corners[3], corners[7], centerV);
        addTetrahedron(topology, corners[2], corners[6], corners[7], centerV);
      }
    }
    
    return { topology, geometry };
  };
  
  const [complex, setComplex] = useState<SimplicialComplex>(createTestComplex(selectedDimension, simplexCount));

  // Reset complex when dimension or simplex count changes
  const handleDimensionChange = (newDimension: Dimension) => {
    setSelectedDimension(newDimension);
    setSelectedMove(null);
    setPreviewComplex(null);
    setComplex(createTestComplex(newDimension, simplexCount));
  };

  const handleSimplexCountChange = (newCount: number) => {
    setSimplexCount(newCount);
    setSelectedMove(null);
    setPreviewComplex(null);
    setComplex(createTestComplex(selectedDimension, newCount));
  };

  const getAvailableMoves = (dimension: Dimension): MoveType[] => {
    if (dimension === 2) {
      return ['1-3', '2-2', '3-1'];
    } else {
      return ['1-4', '2-3', '3-2', '4-1'];
    }
  };

  const simulateMove = (moveType: MoveType): SimplicialComplex => {
    // Create deep copies of topology and geometry for preview
    const testTopology: SimplicialComplexTopology = {
      vertices: new Map(complex.topology.vertices),
      edges: new Map(complex.topology.edges),
      faces: new Map(complex.topology.faces),
      tetrahedra: new Map(complex.topology.tetrahedra),
      halfEdges: new Map(complex.topology.halfEdges),
      faceToTets: new Map(complex.topology.faceToTets),
      edgeIndex: new Map(complex.topology.edgeIndex),
      faceIndex: new Map(complex.topology.faceIndex),
      vertexToHalfEdges: complex.topology.vertexToHalfEdges ? new Map(complex.topology.vertexToHalfEdges) : undefined,
      faceToHalfEdges: complex.topology.faceToHalfEdges ? new Map(complex.topology.faceToHalfEdges) : undefined,
      dimension: complex.topology.dimension,
      nextVertexId: complex.topology.nextVertexId,
      nextEdgeId: complex.topology.nextEdgeId,
      nextFaceId: complex.topology.nextFaceId,
      nextTetId: complex.topology.nextTetId,
      nextHalfEdgeId: complex.topology.nextHalfEdgeId,
    };

    const testGeometry: SimplicialComplexGeometry = {
      positions: new Map(complex.geometry.positions),
    };

    // Apply move based on dimension
    if (complex.topology.dimension === 2) {
      switch (moveType) {
        case '1-3': {
          const faceIds = Array.from(testTopology.faces.keys());
          if (faceIds.length > 0) {
            apply1to3(testTopology, testGeometry, faceIds[0]);
          }
          break;
        }
        case '2-2': {
          const edgeIds = Array.from(testTopology.edges.keys());
          // Find an edge shared by exactly 2 faces
          for (const edgeId of edgeIds) {
            const edge = testTopology.edges.get(edgeId)!;
            const [v0, v1] = edge.vertices;
            let adjacentFaceCount = 0;
            for (const [fId, f] of testTopology.faces) {
              if (f.vertices.includes(v0) && f.vertices.includes(v1)) {
                adjacentFaceCount++;
              }
            }
            if (adjacentFaceCount === 2) {
              apply2to2(testTopology, testGeometry, edgeId);
              break;
            }
          }
          break;
        }
        case '3-1': {
          const vertexIds = Array.from(testTopology.vertices.keys());
          for (const vertexId of vertexIds) {
            const incidentFaces: number[] = [];
            for (const [fId, f] of testTopology.faces) {
              if (f.vertices.includes(vertexId)) {
                incidentFaces.push(fId);
              }
            }
            if (incidentFaces.length === 3) {
              apply3to1(testTopology, testGeometry, vertexId);
              break;
            }
          }
          break;
        }
      }
    } else {
      switch (moveType) {
        case '1-4': {
          const tetIds = Array.from(testTopology.tetrahedra.keys());
          if (tetIds.length > 0) {
            apply1to4(testTopology, testGeometry, tetIds[0]);
          }
          break;
        }
        case '2-3': {
          const faceIds = Array.from(testTopology.faces.keys());
          // Find a face shared by exactly 2 tetrahedra
          for (const faceId of faceIds) {
            const face = testTopology.faces.get(faceId)!;
            const key = faceKey(face.vertices[0], face.vertices[1], face.vertices[2]);
            const tets = testTopology.faceToTets.get(key);
            if (tets && tets.length === 2) {
              apply2to3(testTopology, testGeometry, faceId);
              break;
            }
          }
          break;
        }
        case '3-2': {
          // 3-2 move: operates on an edge shared by exactly 3 tetrahedra
          const edgeIds = Array.from(testTopology.edges.keys());
          for (const edgeId of edgeIds) {
            const edge = testTopology.edges.get(edgeId)!;
            const [v0, v1] = edge.vertices;
            let incidentTets = 0;
            for (const [tId, tet] of testTopology.tetrahedra) {
              if (tet.vertices.includes(v0) && tet.vertices.includes(v1)) {
                incidentTets++;
              }
            }
            if (incidentTets === 3) {
              apply3to2(testTopology, testGeometry, edgeId);
              break;
            }
          }
          break;
        }
        case '4-1': {
          // 4-1 move: operates on a vertex with exactly 4 incident tetrahedra
          const vertexIds = Array.from(testTopology.vertices.keys());
          for (const vertexId of vertexIds) {
            let incidentTets = 0;
            for (const [tId, tet] of testTopology.tetrahedra) {
              if (tet.vertices.includes(vertexId)) {
                incidentTets++;
              }
            }
            if (incidentTets === 4) {
              apply4to1(testTopology, testGeometry, vertexId);
              break;
            }
          }
          break;
        }
      }
    }

    return { topology: testTopology, geometry: testGeometry };
  };


  const handleMoveSelect = (moveType: MoveType) => {
    setSelectedMove(moveType);
    const preview = simulateMove(moveType);
    setPreviewComplex(preview);
  };

  const handleApplyMove = () => {
    if (selectedMove) {
      onApplyMove?.(selectedMove);
      setSelectedMove(null);
      setPreviewComplex(null);
    }
  };

  const handleCancel = () => {
    setSelectedMove(null);
    setPreviewComplex(null);
  };

  const availableMoves = getAvailableMoves(complex.topology.dimension);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4">Pachner Move Tester</h3>
      
      <div className="grid grid-cols-1 gap-4">
        {/* Dimension Selection */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Dimension:</h4>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="dimension"
                value="2"
                checked={selectedDimension === 2}
                onChange={() => handleDimensionChange(2)}
                className="mr-2"
              />
              <span className="text-sm">2D (Triangles)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="dimension"
                value="3"
                checked={selectedDimension === 3}
                onChange={() => handleDimensionChange(3)}
                className="mr-2"
              />
              <span className="text-sm">3D (Tetrahedra)</span>
            </label>
          </div>
        </div>

        {/* Simplex Count Selection */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Initial Simplices:</h4>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="simplexCount"
                value="1"
                checked={simplexCount === 1}
                onChange={() => handleSimplexCountChange(1)}
                className="mr-2"
              />
              <span className="text-sm">1 simplex</span>
            </label>
            {selectedDimension === 2 && (
              <label className="flex items-center">
                <input
                  type="radio"
                  name="simplexCount"
                  value="3"
                  checked={simplexCount === 3}
                  onChange={() => handleSimplexCountChange(3)}
                  className="mr-2"
                />
                <span className="text-sm">3 simplices (enables 3-1 move)</span>
              </label>
            )}
            <label className="flex items-center">
              <input
                type="radio"
                name="simplexCount"
                value={selectedDimension === 2 ? "2" : "2"}
                checked={simplexCount === 2}
                onChange={() => handleSimplexCountChange(2)}
                className="mr-2"
              />
              <span className="text-sm">
                {selectedDimension === 2 ? "2 simplices (enables 2-2 move)" : "2 simplices (enables 2-3 move)"}
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="simplexCount"
                value="8"
                checked={simplexCount === 8}
                onChange={() => handleSimplexCountChange(8)}
                className="mr-2"
              />
              <span className="text-sm">8 simplices (enables 3-2 and 4-1 moves)</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {selectedDimension === 2 
              ? "3 simplices create a vertex with exactly 3 incident faces for 3-1 move. 2 simplices create shared edge for 2-2 move."
              : "2 simplices create shared face for 2-3 move. 8 simplices create center vertex with 4 incident tetrahedra for 4-1 move."
            }
          </p>
        </div>

        {/* Move Selection */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Available Moves:</h4>
          <div className="flex flex-wrap gap-2">
            {availableMoves.map(moveType => (
              <button
                key={moveType}
                onClick={() => handleMoveSelect(moveType)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedMove === moveType
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {moveType}
              </button>
            ))}
          </div>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Current State */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Current State:</h4>
            <div className="border border-gray-300 rounded p-2 bg-gray-50">
              <SimplicialVisualization
                complex={complex}
                width={280}
                height={200}
                responsive
                showVertices={true}
                showEdges={true}
                showFaces={true}
              />
            </div>
          </div>

          {/* Preview */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {selectedMove ? `Preview: ${selectedMove} Move` : 'Preview: Select a move'}
            </h4>
            <div className="border border-gray-300 rounded p-2 bg-gray-50">
              <SimplicialVisualization
                complex={previewComplex || complex}
                width={280}
                height={200}
                responsive
                showVertices={true}
                showEdges={true}
                showFaces={true}
              />
            </div>
            <div className="mt-2 text-xs text-gray-600">
              <div className="font-medium">Move Description:</div>
              {selectedMove ? (
                complex.topology.dimension === 2 ? (
                  <>
                    {selectedMove === '1-3' && 'Subdivide one triangle into three triangles'}
                    {selectedMove === '2-2' && 'Flip an edge between two adjacent triangles'}
                    {selectedMove === '3-1' && 'Merge three triangles into one triangle'}
                  </>
                ) : (
                  <>
                    {selectedMove === '1-4' && 'Subdivide one tetrahedron into four tetrahedra'}
                    {selectedMove === '2-3' && 'Transform between 2 and 3 tetrahedra'}
                    {selectedMove === '3-2' && 'Transform between 3 and 2 tetrahedra'}
                    {selectedMove === '4-1' && 'Coarsen four tetrahedra into one'}
                  </>
                )
              ) : (
                <span className="text-gray-400">Select a move to see description</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleApplyMove}
            disabled={!selectedMove}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              selectedMove
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Apply {selectedMove || 'Select a Move'}
          </button>
          <button
            onClick={handleCancel}
            disabled={!selectedMove}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              selectedMove
                ? 'bg-gray-500 text-white hover:bg-gray-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
