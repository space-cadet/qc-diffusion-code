/**
 * 3D Simplicial Complex Visualization using Three.js
 *
 * Renders tetrahedra, faces, edges, and vertices in a 3D scene
 * with orbit controls for rotate/zoom/pan.
 */

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SimplicialComplex } from '../types/simplicial';
import { VertexPosition } from '../simplicial';

interface SimplicialVisualization3DProps {
  complex: SimplicialComplex;
  width?: number;
  height?: number;
  responsive?: boolean;
  showVertices?: boolean;
  showEdges?: boolean;
  showFaces?: boolean;
}

export const SimplicialVisualization3D: React.FC<SimplicialVisualization3DProps> = ({
  complex,
  width: propWidth = 600,
  height: propHeight = 400,
  responsive = false,
  showVertices: initialShowVertices = true,
  showEdges: initialShowEdges = true,
  showFaces: initialShowFaces = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(propWidth);

  useEffect(() => {
    if (!responsive || !wrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setMeasuredWidth(w);
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [responsive]);

  const width = responsive ? measuredWidth : propWidth;
  const height = responsive ? Math.round(measuredWidth * (propHeight / propWidth)) : propHeight;
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);

  const [showVertices, setShowVertices] = useState(initialShowVertices);
  const [showEdges, setShowEdges] = useState(initialShowEdges);
  const [showFaces, setShowFaces] = useState(initialShowFaces);

  // Initialize Three.js scene once
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    camera.position.set(0, 0, 300);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controlsRef.current = controls;

    // Ambient + directional light
    scene.add(new THREE.AmbientLight(0x404040, 2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(100, 200, 150);
    scene.add(dirLight);

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    console.debug('[SimplicialVisualization3D] Scene initialized');

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      controls.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [width, height]);

  // Rebuild mesh whenever complex or visibility toggles change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old meshes (keep lights and camera)
    const toRemove: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (obj.userData.simplicial) toRemove.push(obj);
    });
    toRemove.forEach((obj) => scene.remove(obj));

    // Get vertex positions
    const positions = getPositions(complex);
    if (positions.size === 0) return;

    // Compute centroid for centering
    let cx = 0, cy = 0, cz = 0;
    for (const p of positions.values()) {
      cx += p.x; cy += p.y; cz += (p.z ?? 0);
    }
    const n = positions.size;
    cx /= n; cy /= n; cz /= n;

    // Draw faces
    if (showFaces) {
      const faceGeometry = new THREE.BufferGeometry();
      const faceVerts: number[] = [];

      for (const face of complex.topology.faces.values()) {
        const [v0, v1, v2] = face.vertices;
        const p0 = positions.get(v0);
        const p1 = positions.get(v1);
        const p2 = positions.get(v2);
        if (!p0 || !p1 || !p2) continue;

        faceVerts.push(
          p0.x - cx, p0.y - cy, (p0.z ?? 0) - cz,
          p1.x - cx, p1.y - cy, (p1.z ?? 0) - cz,
          p2.x - cx, p2.y - cy, (p2.z ?? 0) - cz,
        );
      }

      if (faceVerts.length > 0) {
        faceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(faceVerts, 3));
        faceGeometry.computeVertexNormals();

        // Front side
        const faceMeshFront = new THREE.Mesh(faceGeometry, new THREE.MeshPhongMaterial({
          color: 0x3b82f6,
          opacity: 0.25,
          transparent: true,
          side: THREE.FrontSide,
          depthWrite: false,
        }));
        faceMeshFront.userData.simplicial = true;
        scene.add(faceMeshFront);

        // Back side
        const faceMeshBack = new THREE.Mesh(faceGeometry, new THREE.MeshPhongMaterial({
          color: 0x6366f1,
          opacity: 0.15,
          transparent: true,
          side: THREE.BackSide,
          depthWrite: false,
        }));
        faceMeshBack.userData.simplicial = true;
        scene.add(faceMeshBack);
      }
    }

    // Draw edges
    if (showEdges) {
      const edgePoints: number[] = [];

      for (const edge of complex.topology.edges.values()) {
        const [v0, v1] = edge.vertices;
        const p0 = positions.get(v0);
        const p1 = positions.get(v1);
        if (!p0 || !p1) continue;

        edgePoints.push(
          p0.x - cx, p0.y - cy, (p0.z ?? 0) - cz,
          p1.x - cx, p1.y - cy, (p1.z ?? 0) - cz,
        );
      }

      if (edgePoints.length > 0) {
        const edgeGeo = new THREE.BufferGeometry();
        edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePoints, 3));
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x374151, linewidth: 2 });
        const lines = new THREE.LineSegments(edgeGeo, edgeMat);
        lines.userData.simplicial = true;
        scene.add(lines);
      }
    }

    // Draw vertices as spheres
    if (showVertices) {
      const sphereGeo = new THREE.SphereGeometry(3, 12, 12);
      const sphereMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6 });

      for (const [vid, pos] of positions) {
        const mesh = new THREE.Mesh(sphereGeo, sphereMat);
        mesh.position.set(pos.x - cx, pos.y - cy, (pos.z ?? 0) - cz);
        mesh.userData.simplicial = true;
        scene.add(mesh);

        // Label using sprite
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 32;
        const ctx = canvas.getContext('2d')!;
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#1f2937';
        ctx.textAlign = 'center';
        ctx.fillText(`V${vid}`, 32, 22);
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(pos.x - cx, pos.y - cy + 8, (pos.z ?? 0) - cz);
        sprite.scale.set(20, 10, 1);
        sprite.userData.simplicial = true;
        scene.add(sprite);
      }
    }

    // Fit camera to scene
    if (cameraRef.current && controlsRef.current) {
      const box = new THREE.Box3();
      scene.traverse((obj) => {
        if (obj.userData.simplicial && (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments)) {
          box.expandByObject(obj);
        }
      });
      if (!box.isEmpty()) {
        const size = box.getSize(new THREE.Vector3()).length();
        const center = box.getCenter(new THREE.Vector3());
        controlsRef.current.target.copy(center);
        cameraRef.current.position.set(center.x, center.y, center.z + size * 1.5);
        cameraRef.current.updateProjectionMatrix();
      }
    }

    console.debug('[SimplicialVisualization3D] Scene updated:', {
      vertices: complex.topology.vertices.size,
      edges: complex.topology.edges.size,
      faces: complex.topology.faces.size,
      tets: complex.topology.tetrahedra.size,
    });
  }, [complex, showVertices, showEdges, showFaces]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        ref={containerRef}
        style={{ width, height }}
        className="border border-gray-300 rounded-lg bg-white overflow-hidden max-w-full"
      />

      {/* Info panel - compact on mobile */}
      <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-white bg-opacity-90 p-1 sm:p-2 rounded border border-gray-200 text-[10px] sm:text-xs leading-tight">
        <div className="font-semibold">Simplicial Complex</div>
        <div>Dimension: {complex.topology.dimension}D</div>
        <div>Vertices: {complex.topology.vertices.size}</div>
        <div>Edges: {complex.topology.edges.size}</div>
        <div>Faces: {complex.topology.faces.size}</div>
        <div>Tetrahedra: {complex.topology.tetrahedra.size}</div>
        <div className="mt-1 pt-1 border-t border-gray-200 text-[8px] sm:text-[10px] text-gray-400">
          Drag to rotate, scroll to zoom
        </div>
      </div>

      {/* Controls - compact on mobile */}
      <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 flex gap-1 sm:gap-2">
        <label className="flex items-center text-[10px] sm:text-xs bg-white bg-opacity-90 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border border-gray-200">
          <input type="checkbox" checked={showVertices} onChange={(e) => setShowVertices(e.target.checked)} className="mr-1" />
          Vertices
        </label>
        <label className="flex items-center text-[10px] sm:text-xs bg-white bg-opacity-90 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border border-gray-200">
          <input type="checkbox" checked={showEdges} onChange={(e) => setShowEdges(e.target.checked)} className="mr-1" />
          Edges
        </label>
        <label className="flex items-center text-[10px] sm:text-xs bg-white bg-opacity-90 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border border-gray-200">
          <input type="checkbox" checked={showFaces} onChange={(e) => setShowFaces(e.target.checked)} className="mr-1" />
          Faces
        </label>
      </div>
    </div>
  );
};

/** Extract vertex positions from the complex, using geometry or fallback layout. */
function getPositions(complex: SimplicialComplex): Map<number, VertexPosition> {
  if (complex.geometry.positions.size > 0) {
    return complex.geometry.positions;
  }

  // Fallback: spherical distribution
  const positions = new Map<number, VertexPosition>();
  const vertexIds = Array.from(complex.topology.vertices.keys());
  const n = vertexIds.length;
  const radius = 80;

  for (let i = 0; i < n; i++) {
    const phi = Math.acos(-1 + (2 * i) / n);
    const theta = Math.sqrt(n * Math.PI) * phi;
    positions.set(vertexIds[i], {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi),
    });
  }
  return positions;
}
