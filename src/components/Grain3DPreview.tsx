import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getPropellantVisualProfile } from '../lib/types';
import { getFinocylContinuousContour } from '../lib/finocylContour';
import { RotateCcw, Box, Compass } from 'lucide-react';

interface Grain3DPreviewProps {
  grain: any;
  theme?: string;
  t?: any;
}

export function Grain3DPreview({ grain, theme = 'dark', t }: Grain3DPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const autoRotateRef = useRef<boolean>(autoRotate);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Visual appearance based on propellant
  const profile = getPropellantVisualProfile(grain.propellantType);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 180;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(45, 35, 55);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 20;
    controls.maxDistance = 200;
    controls.target.set(0, 0, 0);
    controls.autoRotate = autoRotateRef.current;
    controls.autoRotateSpeed = 2.0;
    controlsRef.current = controls;

    // 5. Studio Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(50, 70, 60);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    fillLight.position.set(-60, -30, -50);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 0.9);
    rimLight.position.set(0, 50, -60);
    scene.add(rimLight);

    // Internal core warm glow light
    const coreLight = new THREE.PointLight(0xf97316, 0.7, 50);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    // 6. Master Mesh Group
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    // 7. Animation Loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotateRef.current;
        controlsRef.current.update();
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // 8. Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h, false);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // Rebuild 3D Mesh when grain properties change
  useEffect(() => {
    if (!meshGroupRef.current) return;
    const group = meshGroupRef.current;

    // Dispose old children
    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }

    const D0 = Math.max(1, grain.D0 || 60);
    const L0 = Math.max(1, grain.L0 || 100);
    const d0 = Math.max(0, grain.d0 || 20);

    // Normalize scale so grain fits comfortably in ~30 units radius
    const maxDim = Math.max(D0, L0);
    const scale = 36 / maxDim;

    const rOuter = (D0 / 2) * scale;
    const length = L0 * scale;
    const rInner = (d0 / 2) * scale;

    const shape = new THREE.Shape();
    shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);

    if (grain.shape === 1) {
      // Tubular: circular hole
      if (rInner > 0.1) {
        const hole = new THREE.Path();
        hole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
        shape.holes.push(hole);
      }
    } else if (grain.shape === 2) {
      // Star: polygon star hole
      const Np = grain.Np || 5;
      const dMayor = Math.max(d0, grain.d0mayor || d0 * 1.5);
      const rTip = rInner;
      const rValley = (dMayor / 2) * scale;
      const hole = new THREE.Path();
      const totalPoints = Np * 2;
      for (let i = 0; i < totalPoints; i++) {
        const a = (i * Math.PI) / Np;
        const r = i % 2 === 0 ? rTip : rValley;
        const x = r * Math.cos(a);
        const y = r * Math.sin(a);
        if (i === 0) hole.moveTo(x, y);
        else hole.lineTo(x, y);
      }
      hole.closePath();
      shape.holes.push(hole);
    } else if (grain.shape === 4) {
      // Finocyl: UNIFIED CONTINUOUS CONTOUR (Core + Fins as a single continuous polygon)
      const numFins = grain.numFins !== undefined ? grain.numFins : (grain.Np > 0 ? grain.Np : 4);
      const finW = (grain.finWidth !== undefined ? grain.finWidth : 10) * scale;
      const finL = (grain.finLength !== undefined ? grain.finLength : 15) * scale;
      const inverted = !!grain.invertedFins;

      const contour = getFinocylContinuousContour(0, 0, rInner, numFins, finW, finL, inverted, false);
      if (contour.points.length > 0) {
        const hole = new THREE.Path();
        contour.points.forEach((pt, idx) => {
          if (idx === 0) hole.moveTo(pt.x, pt.y);
          else hole.lineTo(pt.x, pt.y);
        });
        hole.closePath();
        shape.holes.push(hole);
      }
    }

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: length,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.35,
      bevelThickness: 0.35,
      curveSegments: 36
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();

    // Propellant Grain Material
    const grainColor = profile.grainColorThree;
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: grainColor,
      roughness: profile.category === 'candy' ? 0.38 : 0.52,
      metalness: profile.category === 'candy' ? 0.08 : 0.25,
      side: THREE.DoubleSide
    });

    // End faces material (subtle burn inhibitor or ignition coating tint)
    const endMaterial = new THREE.MeshStandardMaterial({
      color: grain.ei === 1 ? 0xf87171 : grainColor,
      roughness: 0.45,
      metalness: 0.2,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, [bodyMaterial, endMaterial]);
    mesh.rotation.x = Math.PI / 4;
    mesh.rotation.y = Math.PI / 6;
    group.add(mesh);

    // Subtle technical wireframe contour overlay
    const wireframeGeom = new THREE.WireframeGeometry(geometry);
    const wireframeMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12
    });
    const wireframe = new THREE.LineSegments(wireframeGeom, wireframeMat);
    group.add(wireframe);

  }, [grain, profile]);

  const resetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(45, 35, 55);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-full min-h-[170px] select-none overflow-hidden bg-slate-950/70">
      {/* 3D Canvas Container */}
      <div 
        ref={containerRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing"
        title="Arrastra para rotar 360° • Rueda ratón para zoom"
      />

      {/* Top Left: 3D Badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700/60 backdrop-blur-sm font-mono text-[9px] text-slate-300">
        <Box size={11} className="text-purple-400" />
        <span className="font-bold text-slate-100 uppercase tracking-wider">
          {grain.shape === 4 ? 'Finocyl 3D (FMM)' : grain.shape === 2 ? 'Star 3D' : grain.shape === 1 ? 'Tubular 3D' : 'Macizo 3D'}
        </span>
      </div>

      {/* Top Right: Orbit & Reset Controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className={`h-5 px-1.5 rounded text-[8px] font-mono font-bold flex items-center gap-1 transition-all ${
            autoRotate 
              ? 'bg-purple-600/90 text-white shadow-[0_0_6px_rgba(168,85,247,0.5)] border border-purple-400' 
              : 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700'
          }`}
          title="Alternar auto-rotación 360°"
        >
          <RotateCcw size={10} className={autoRotate ? 'animate-spin' : ''} />
          <span>{autoRotate ? 'AUTO' : 'MANUAL'}</span>
        </button>

        <button
          type="button"
          onClick={resetCamera}
          className="h-5 px-1.5 rounded text-[8px] font-mono font-bold bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700 flex items-center gap-1 transition-all"
          title="Restablecer posición de cámara"
        >
          <Compass size={10} />
          <span>RESET</span>
        </button>
      </div>

      {/* Bottom Overlay: Geometry Specs */}
      <div className="absolute bottom-1.5 left-2 right-2 z-10 flex items-center justify-between text-[9px] font-mono text-slate-400 bg-slate-950/75 px-2 py-1 rounded border border-slate-800/80 backdrop-blur-sm pointer-events-none">
        <span>
          Ø{grain.D0} × L{grain.L0} mm {grain.N > 1 ? `(×${grain.N})` : ''}
        </span>
        {grain.shape === 4 && (
          <span className="text-purple-300 font-semibold">
            {grain.numFins || 4} Aletas ({grain.finWidth || 10}×{grain.finLength || 15}mm)
          </span>
        )}
        {grain.shape === 2 && (
          <span className="text-cyan-300 font-semibold">
            {grain.Np || 5} Puntas
          </span>
        )}
        {grain.shape === 1 && (
          <span className="text-emerald-300 font-semibold">
            Core Ø{grain.d0}mm
          </span>
        )}
      </div>
    </div>
  );
}
