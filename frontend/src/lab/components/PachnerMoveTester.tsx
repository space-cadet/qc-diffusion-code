import React, { useState } from 'react';
import { SimplicialComplex, MoveType, Dimension } from '../types/simplicial';
import { SimplicialVisualization } from './SimplicialVisualization';

interface PachnerMoveTesterProps {
  complex: SimplicialComplex;
  onApplyMove: (moveType: MoveType) => void;
}

export const PachnerMoveTester: React.FC<PachnerMoveTesterProps> = ({
  complex,
  onApplyMove,
}) => {
  const [selectedMove, setSelectedMove] = useState<MoveType | null>(null);
  const [previewComplex, setPreviewComplex] = useState<SimplicialComplex | null>(null);

  const getAvailableMoves = (dimension: Dimension): MoveType[] => {
    if (dimension === 2) {
      return ['1-3', '2-2', '3-1'];
    } else {
      return ['1-4', '2-3', '3-2', '4-1'];
    }
  };

  const simulateMove = (moveType: MoveType): SimplicialComplex => {
    // Create a copy of the complex to simulate the move
    const testComplex = {
      simplices: [...complex.simplices],
      vertexCount: complex.vertexCount,
      dimension: complex.dimension,
      vertexPositions: new Map(complex.vertexPositions),
    };

    // Simplified simulation of the move for preview
    if (complex.dimension === 2) {
      switch (moveType) {
        case '1-3':
          return simulate1to3Move(testComplex);
        case '2-2':
          return simulate2to2Move(testComplex);
        case '3-1':
          return simulate3to1Move(testComplex);
      }
    } else {
      switch (moveType) {
        case '1-4':
          return simulate1to4Move(testComplex);
        case '2-3':
          return simulate2to3Move(testComplex);
        case '3-2':
          return simulate3to2Move(testComplex);
        case '4-1':
          return simulate4to1Move(testComplex);
      }
    }

    return testComplex;
  };

  const simulate1to3Move = (testComplex: SimplicialComplex): SimplicialComplex => {
    const triangles = testComplex.simplices.filter(s => s.dimension === 2);
    if (triangles.length === 0) return testComplex;

    // Take first triangle for preview
    const triangle = triangles[0];
    const [v0, v1, v2] = triangle.vertices;

    // Calculate centroid
    const pos0 = testComplex.vertexPositions.get(v0);
    const pos1 = testComplex.vertexPositions.get(v1);
    const pos2 = testComplex.vertexPositions.get(v2);

    if (!pos0 || !pos1 || !pos2) return testComplex;

    const centroidX = (pos0.x + pos1.x + pos2.x) / 3;
    const centroidY = (pos0.y + pos1.y + pos2.y) / 3;

    // Add new vertex at centroid
    const newVertexId = Math.max(...Array.from(testComplex.vertexPositions.keys()), 0) + 1;
    testComplex.vertexPositions.set(newVertexId, { x: centroidX, y: centroidY });

    // Create three new triangles
    const newTriangles = [
      { id: 999, vertices: [v0, v1, newVertexId], dimension: 2 },
      { id: 998, vertices: [v1, v2, newVertexId], dimension: 2 },
      { id: 997, vertices: [v2, v0, newVertexId], dimension: 2 },
    ];

    testComplex.simplices = testComplex.simplices.filter(s => s.id !== triangle.id);
    testComplex.simplices.push(...newTriangles);
    testComplex.vertexCount++;

    return testComplex;
  };

  const simulate2to2Move = (testComplex: SimplicialComplex): SimplicialComplex => {
    const triangles = testComplex.simplices.filter(s => s.dimension === 2);
    if (triangles.length < 2) return testComplex;

    // Find adjacent triangles (simplified for preview)
    for (let i = 0; i < triangles.length; i++) {
      for (let j = i + 1; j < triangles.length; j++) {
        const t1 = triangles[i];
        const t2 = triangles[j];

        const commonVertices = t1.vertices.filter(v => t2.vertices.includes(v));
        if (commonVertices.length === 2) {
          const [vA, vB] = commonVertices;
          const vC = t1.vertices.find(v => v !== vA && v !== vB)!;
          const vD = t2.vertices.find(v => v !== vA && v !== vB)!;

          if (vC !== vD) {
            // Create flipped triangles
            const newTriangles = [
              { id: 999, vertices: [vA, vC, vD], dimension: 2 },
              { id: 998, vertices: [vB, vC, vD], dimension: 2 },
            ];

            testComplex.simplices = testComplex.simplices.filter(s => s.id !== t1.id && s.id !== t2.id);
            testComplex.simplices.push(...newTriangles);
            return testComplex;
          }
        }
      }
    }

    return testComplex;
  };

  const simulate3to1Move = (testComplex: SimplicialComplex): SimplicialComplex => {
    const triangles = testComplex.simplices.filter(s => s.dimension === 2);
    if (triangles.length < 3) return testComplex;

    // Simplified: take first three triangles and merge them
    const t1 = triangles[0];
    const t2 = triangles[1];
    const t3 = triangles[2];

    const outerVertices = [
      t1.vertices[0],
      t2.vertices[1],
      t3.vertices[2],
    ];

    const newTriangle = { id: 999, vertices: outerVertices, dimension: 2 };
    testComplex.simplices = testComplex.simplices.filter(s => 
      s.id !== t1.id && s.id !== t2.id && s.id !== t3.id
    );
    testComplex.simplices.push(newTriangle);

    return testComplex;
  };

  const simulate1to4Move = (testComplex: SimplicialComplex): SimplicialComplex => {
    // 1-4 move: Subdivide one tetrahedron into four tetrahedra
    // For 3D, we need to work with the actual tetrahedral structure
    if (testComplex.dimension !== 3) return testComplex;
    
    // Find a tetrahedron (represented by 4 triangular faces sharing vertices)
    const faces = testComplex.simplices.filter(s => s.dimension === 2);
    if (faces.length < 4) return testComplex;

    // Group faces by shared vertices to find tetrahedra
    const tetrahedronGroups: number[][] = [];
    const usedFaces = new Set<number>();
    
    for (let i = 0; i < faces.length && usedFaces.size < faces.length; i++) {
      if (usedFaces.has(faces[i].id)) continue;
      
      const currentGroup = [faces[i].id];
      const vertices = new Set(faces[i].vertices);
      
      // Find other faces that share vertices
      for (let j = i + 1; j < faces.length; j++) {
        if (usedFaces.has(faces[j].id)) continue;
        
        const sharedVertices = faces[j].vertices.filter(v => vertices.has(v));
        if (sharedVertices.length >= 2) {
          currentGroup.push(faces[j].id);
          usedFaces.add(faces[j].id);
          faces[j].vertices.forEach(v => vertices.add(v));
        }
      }
      
      if (currentGroup.length >= 3) {
        tetrahedronGroups.push(currentGroup);
        currentGroup.forEach(id => usedFaces.add(id));
      }
    }

    if (tetrahedronGroups.length === 0) return testComplex;

    // Take first tetrahedron group for subdivision
    const tetrahedronFaces = tetrahedronGroups[0].map(id => faces.find(f => f.id === id)!);
    const uniqueVertices = [...new Set(tetrahedronFaces.flatMap(f => f.vertices))];
    
    if (uniqueVertices.length !== 4) return testComplex;

    // Calculate centroid of the tetrahedron
    const positions = uniqueVertices.map(v => testComplex.vertexPositions.get(v)!);
    const centroidX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
    const centroidY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;

    // Add new vertex at centroid
    const newVertexId = Math.max(...Array.from(testComplex.vertexPositions.keys()), 0) + 1;
    testComplex.vertexPositions.set(newVertexId, { x: centroidX, y: centroidY });

    // Create four new tetrahedra (each represented by 4 triangular faces)
    const [v0, v1, v2, v3] = uniqueVertices;
    const newFaces = [
      // Tetrahedron 1: v0, v1, v2, newVertex
      { id: 999, vertices: [v0, v1, v2], dimension: 2 },
      { id: 998, vertices: [v0, v1, newVertexId], dimension: 2 },
      { id: 997, vertices: [v0, v2, newVertexId], dimension: 2 },
      { id: 996, vertices: [v1, v2, newVertexId], dimension: 2 },
      // Tetrahedron 2: v0, v1, v3, newVertex  
      { id: 995, vertices: [v0, v1, v3], dimension: 2 },
      { id: 994, vertices: [v0, v3, newVertexId], dimension: 2 },
      { id: 993, vertices: [v1, v3, newVertexId], dimension: 2 },
      // Add remaining faces from other tetrahedra...
    ];

    // Remove original tetrahedron faces and add new ones
    testComplex.simplices = testComplex.simplices.filter(s => !tetrahedronGroups[0].includes(s.id));
    testComplex.simplices.push(...newFaces);
    testComplex.vertexCount++;

    return testComplex;
  };

  const simulate2to3Move = (testComplex: SimplicialComplex): SimplicialComplex => {
    // 2-3 move: Transform between 2 and 3 tetrahedra
    if (testComplex.dimension !== 3) return testComplex;
    
    const faces = testComplex.simplices.filter(s => s.dimension === 2);
    if (faces.length < 2) return testComplex;

    // Find adjacent faces that share an edge
    for (let i = 0; i < faces.length; i++) {
      for (let j = i + 1; j < faces.length; j++) {
        const f1 = faces[i];
        const f2 = faces[j];

        const commonVertices = f1.vertices.filter(v => f2.vertices.includes(v));
        if (commonVertices.length === 2) {
          const [vA, vB] = commonVertices;
          const vC = f1.vertices.find(v => v !== vA && v !== vB)!;
          const vD = f2.vertices.find(v => v !== vA && v !== vB)!;

          if (vC !== vD) {
            // Create three new faces representing the 3 tetrahedra
            const newFaces = [
              { id: 999, vertices: [vA, vC, vD], dimension: 2 },
              { id: 998, vertices: [vB, vC, vD], dimension: 2 },
              { id: 997, vertices: [vA, vB, vC], dimension: 2 },
            ];

            testComplex.simplices = testComplex.simplices.filter(s => s.id !== f1.id && s.id !== f2.id);
            testComplex.simplices.push(...newFaces);
            return testComplex;
          }
        }
      }
    }

    return testComplex;
  };

  const simulate3to2Move = (testComplex: SimplicialComplex): SimplicialComplex => {
    // 3-2 move: Transform between 3 and 2 tetrahedra (inverse of 2-3)
    if (testComplex.dimension !== 3) return testComplex;
    
    const faces = testComplex.simplices.filter(s => s.dimension === 2);
    if (faces.length < 3) return testComplex;

    // Find three faces around a common vertex
    for (let vertexId = 0; vertexId < testComplex.vertexCount; vertexId++) {
      const facesAroundVertex = faces.filter(f => f.vertices.includes(vertexId));
      
      if (facesAroundVertex.length === 3) {
        const [f1, f2, f3] = facesAroundVertex;
        
        // Get the other vertices (not the central one)
        const outerVertices = [
          f1.vertices.find(v => v !== vertexId)!,
          f2.vertices.find(v => v !== vertexId)!,
          f3.vertices.find(v => v !== vertexId)!,
        ];
        
        // Ensure we have three distinct other vertices
        const uniqueOthers = [...new Set(outerVertices)];
        if (uniqueOthers.length === 3) {
          // Create two new faces representing the 2 tetrahedra
          const newFaces = [
            { id: 999, vertices: [vertexId, uniqueOthers[0], uniqueOthers[1]], dimension: 2 },
            { id: 998, vertices: [vertexId, uniqueOthers[1], uniqueOthers[2]], dimension: 2 },
          ];

          testComplex.simplices = testComplex.simplices.filter(s => 
            s.id !== f1.id && s.id !== f2.id && s.id !== f3.id
          );
          testComplex.simplices.push(...newFaces);
          return testComplex;
        }
      }
    }

    return testComplex;
  };

  const simulate4to1Move = (testComplex: SimplicialComplex): SimplicialComplex => {
    // 4-1 move: Coarsen four tetrahedra into one
    if (testComplex.dimension !== 3) return testComplex;
    
    const faces = testComplex.simplices.filter(s => s.dimension === 2);
    if (faces.length < 4) return testComplex;

    // Find a tetrahedron (same logic as 1-4 move)
    const tetrahedronGroups: number[][] = [];
    const usedFaces = new Set<number>();
    
    for (let i = 0; i < faces.length && usedFaces.size < faces.length; i++) {
      if (usedFaces.has(faces[i].id)) continue;
      
      const currentGroup = [faces[i].id];
      const vertices = new Set(faces[i].vertices);
      
      for (let j = i + 1; j < faces.length; j++) {
        if (usedFaces.has(faces[j].id)) continue;
        
        const sharedVertices = faces[j].vertices.filter(v => vertices.has(v));
        if (sharedVertices.length >= 2) {
          currentGroup.push(faces[j].id);
          usedFaces.add(faces[j].id);
          faces[j].vertices.forEach(v => vertices.add(v));
        }
      }
      
      if (currentGroup.length >= 3) {
        tetrahedronGroups.push(currentGroup);
        currentGroup.forEach(id => usedFaces.add(id));
      }
    }

    if (tetrahedronGroups.length === 0) return testComplex;

    // Take first tetrahedron group for coarsening
    const tetrahedronFaces = tetrahedronGroups[0].map(id => faces.find(f => f.id === id)!);
    const uniqueVertices = [...new Set(tetrahedronFaces.flatMap(f => f.vertices))];
    
    if (uniqueVertices.length !== 4) return testComplex;

    // Create one simplified face representing the coarsened tetrahedron
    const newFace = { id: 999, vertices: uniqueVertices.slice(0, 3), dimension: 2 };

    testComplex.simplices = testComplex.simplices.filter(s => 
      !tetrahedronGroups[0].includes(s.id)
    );
    testComplex.simplices.push(newFace);

    return testComplex;
  };

  const handleMoveSelect = (moveType: MoveType) => {
    setSelectedMove(moveType);
    const preview = simulateMove(moveType);
    setPreviewComplex(preview);
  };

  const handleApplyMove = () => {
    if (selectedMove) {
      onApplyMove(selectedMove);
      setSelectedMove(null);
      setPreviewComplex(null);
    }
  };

  const handleCancel = () => {
    setSelectedMove(null);
    setPreviewComplex(null);
  };

  const availableMoves = getAvailableMoves(complex.dimension as Dimension);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Pachner Move Tester</h3>
      
      <div className="grid grid-cols-1 gap-4">
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

        {/* Preview */}
        {selectedMove && previewComplex && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Preview: {selectedMove} Move
            </h4>
            <div className="border border-gray-300 rounded p-2 bg-gray-50">
              <SimplicialVisualization
                complex={previewComplex}
                width={300}
                height={200}
                showVertices={true}
                showEdges={true}
                showFaces={true}
              />
            </div>
            <div className="mt-2 text-xs text-gray-600">
              <div className="font-medium">Move Description:</div>
              {selectedMove === '1-3' && 'Subdivide one triangle into three triangles'}
              {selectedMove === '2-2' && 'Flip an edge between two adjacent triangles'}
              {selectedMove === '3-1' && 'Merge three triangles into one triangle'}
              {selectedMove === '1-4' && 'Subdivide one tetrahedron into four tetrahedra'}
              {selectedMove === '2-3' && 'Transform between 2 and 3 tetrahedra'}
              {selectedMove === '3-2' && 'Transform between 3 and 2 tetrahedra'}
              {selectedMove === '4-1' && 'Coarsen four tetrahedra into one'}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {selectedMove && (
          <div className="flex gap-2">
            <button
              onClick={handleApplyMove}
              className="px-4 py-2 bg-green-500 text-white rounded font-medium hover:bg-green-600 transition-colors"
            >
              Apply {selectedMove} Move
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-500 text-white rounded font-medium hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Current State Comparison */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current State:</h4>
          <div className="border border-gray-300 rounded p-2 bg-gray-50">
            <SimplicialVisualization
              complex={complex}
              width={300}
              height={200}
              showVertices={true}
              showEdges={true}
              showFaces={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
