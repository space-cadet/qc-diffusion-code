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
  
  // Create independent initial complex for testing
  const createTestComplex = (): SimplicialComplex => {
    let topology: SimplicialComplexTopology;
    let geometry: SimplicialComplexGeometry;
    
    if (dimension === 2) {
      topology = createInitialTriangleTopology();
      geometry = createTriangleGeometry(140, 100, 60);
    } else {
      topology = createInitialTetrahedronTopology();
      geometry = createTetrahedronGeometry(140, 100, 0, 40);
    }
    
    return { topology, geometry };
  };
  
  const [complex] = useState<SimplicialComplex>(createTestComplex());

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
          if (edgeIds.length > 0) {
            apply2to2(testTopology, testGeometry, edgeIds[0]);
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
          const edgeIds = Array.from(testTopology.edges.keys());
          if (edgeIds.length > 0) {
            apply2to3(testTopology, testGeometry, edgeIds[0]);
          }
          break;
        }
        case '3-2': {
          // 3-2 move: operates on an edge
          const edgeIds = Array.from(testTopology.edges.keys());
          if (edgeIds.length > 0) {
            apply3to2(testTopology, testGeometry, edgeIds[0]);
          }
          break;
        }
        case '4-1': {
          // 4-1 move: operates on a vertex
          const vertexIds = Array.from(testTopology.vertices.keys());
          if (vertexIds.length > 0) {
            apply4to1(testTopology, testGeometry, vertexIds[0]);
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
      onApplyMove(selectedMove);
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

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* Current State */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Current State:</h4>
            <div className="border border-gray-300 rounded p-2 bg-gray-50">
              <SimplicialVisualization
                complex={complex}
                width={280}
                height={200}
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
