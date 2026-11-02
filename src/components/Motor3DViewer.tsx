import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SimulationResults, MotorInput, NozzleInput, getPropellantVisualProfile } from '../lib/types';
import { getFinocylContinuousContour } from '../lib/finocylContour';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Scissors, 
  Eye, 
  Box, 
  Flame, 
  Activity, 
  Layers, 
  Maximize2,
  Sparkles
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Motor3DViewerProps {
  results: SimulationResults;
  timeIndex: number;
  motor?: MotorInput;
  nozzle?: NozzleInput;
  onTimeChange?: (index: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  speed?: number;
  onSpeedChange?: (speed: number) => void;
  t?: any;
}

export function Motor3DViewer({
  results,
  timeIndex,
  motor,
  nozzle,
  onTimeChange,
  isPlaying = false,
  onTogglePlay,
  speed = 1,
  onSpeedChange,
  t
}: Motor3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Groups and object references
  const motorGroupRef = useRef<THREE.Group | null>(null);
  const grainsGroupRef = useRef<THREE.Group | null>(null);
  const plumeGroupRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const particlePhysicsRef = useRef<{ velocities: Float32Array; ages: Float32Array; lifetimes: Float32Array; baseRadius: Float32Array } | null>(null);
  const chamberGlowRef = useRef<THREE.PointLight | null>(null);
  const flameLightRef = useRef<THREE.PointLight | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<'cutaway' | 'solid' | 'transparent'>('cutaway');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [selectedGrainIndex, setSelectedGrainIndex] = useState<number | null>(null);
  const [showWireframe, setShowWireframe] = useState<boolean>(false);

  // Synchronize autoRotate with OrbitControls via ref
  const autoRotateRef = useRef<boolean>(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Current simulation values at timeIndex
  const currentT = results.t[timeIndex] || 0;
  const currentThrust = results.F_N[timeIndex] || 0;
  const maxThrust = Math.max(1, results.summary.Fmax_N || 1);
  const normThrust = Math.min(1, Math.max(0, currentThrust / maxThrust));
  const currentP = results.P0_gage[timeIndex] || 0;
  const maxP = Math.max(0.1, results.summary.Pmax_MPa || 1);
  const normP = Math.min(1, Math.max(0, currentP / maxP));

  // Propellant visual profile & physics
  const profile = useMemo(() => {
    return getPropellantVisualProfile(results.propellantType);
  }, [results.propellantType]);

  const propellantAppearance = useMemo(() => {
    return {
      grainColor: profile.grainColorThree,
      emissive: profile.category === 'candy' ? 0x78350f : (profile.category === 'rnx' ? 0x0f172a : 0x334155),
      roughness: profile.category === 'candy' ? 0.35 : (profile.category === 'rnx' ? 0.6 : 0.45),
      metalness: profile.category === 'candy' ? 0.1 : (profile.category === 'rnx' ? 0.2 : 0.35),
      flameColor: profile.flameColorThree,
      smokeColor: profile.smokeColorThree,
      hasFlame: profile.hasFlame,
      hasDiamonds: profile.hasDiamonds,
      isSmoky: profile.isSmoky,
      name: profile.displayName
    };
  }, [profile]);

  const Dc = motor?.Dc || Math.max(...(results.grains?.map(g => g.D0) || [60]), 60);
  const totalGrainLength = results.grains ? results.grains.reduce((acc, g) => acc + g.L0 * g.N, 0) : 260;
  const Lc = motor?.Lc || totalGrainLength + 40;
  const Dt0 = nozzle?.Dt0 || Math.round(Dc * 0.25);
  const Ds = nozzle?.Ds || Math.round(Dc * 0.6);
  const alpha = nozzle?.alpha || 12;

  // Build Star Core 2D Shape Helper (Supports Cutaway / Half Slicing)
  const createCutStarShape = (rOuter: number, rTip: number, rValley: number, nPoints: number, cutAngle: number = Math.PI * 2) => {
    const shape = new THREE.Shape();
    if (cutAngle >= Math.PI * 2 - 0.01) {
      shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
      const holePath = new THREE.Path();
      const totalPoints = nPoints * 2;
      for (let i = 0; i < totalPoints; i++) {
        const angle = (i * Math.PI) / nPoints;
        const r = (i % 2 === 0 ? rTip : rValley);
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        if (i === 0) holePath.moveTo(x, y);
        else holePath.lineTo(x, y);
      }
      holePath.closePath();
      shape.holes.push(holePath);
    } else {
      // Cut in half (Math.PI / 180 degrees)
      shape.moveTo(rTip, 0);
      shape.lineTo(rOuter, 0);
      shape.absarc(0, 0, rOuter, 0, cutAngle, false);
      
      const steps = Math.max(16, nPoints * 4);
      for (let s = steps; s >= 0; s--) {
        const t = s / steps;
        const angle = t * cutAngle;
        const pointIdx = (angle / Math.PI) * nPoints;
        const mod = pointIdx % 2;
        const blend = mod > 1 ? 2 - mod : mod;
        const r = rTip + (rValley - rTip) * blend;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        shape.lineTo(x, y);
      }
      shape.closePath();
    }
    return shape;
  };

  // Build Tubular Hollow Cylinder Shape Helper (Supports Cutaway / Half Slicing)
  const createTubularShape = (rOuter: number, rInner: number, cutAngle: number = Math.PI * 2) => {
    const shape = new THREE.Shape();
    if (cutAngle >= Math.PI * 2 - 0.01) {
      shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
      if (rInner > 0.05) {
        const hole = new THREE.Path();
        hole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
        shape.holes.push(hole);
      }
    } else {
      // Cut in half along centerline
      shape.moveTo(rInner, 0);
      shape.lineTo(rOuter, 0);
      shape.absarc(0, 0, rOuter, 0, cutAngle, false);
      const endX_out = rOuter * Math.cos(cutAngle);
      const endY_out = rOuter * Math.sin(cutAngle);
      const endX_in = rInner * Math.cos(cutAngle);
      const endY_in = rInner * Math.sin(cutAngle);
      shape.lineTo(endX_out, endY_out);
      shape.lineTo(endX_in, endY_in);
      shape.absarc(0, 0, rInner, cutAngle, 0, true);
      shape.closePath();
    }
    return shape;
  };

  // Build Finocyl Shape Helper (Supports Cutaway / Half Slicing)
  const createFinocylShape = (
    rOuter: number,
    rInner: number,
    numFins: number,
    finWidth: number,
    finLength: number,
    inverted: boolean,
    cutAngle: number = Math.PI * 2
  ) => {
    const shape = new THREE.Shape();
    if (cutAngle >= Math.PI * 2 - 0.01) {
      shape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
      const contour = getFinocylContinuousContour(0, 0, rInner, numFins, finWidth, finLength, inverted, false);
      if (contour.points.length > 0) {
        const hole = new THREE.Path();
        contour.points.forEach((pt, idx) => {
          if (idx === 0) hole.moveTo(pt.x, pt.y);
          else hole.lineTo(pt.x, pt.y);
        });
        hole.closePath();
        shape.holes.push(hole);
      }
    } else {
      shape.moveTo(rInner, 0);
      shape.lineTo(rOuter, 0);
      shape.absarc(0, 0, rOuter, 0, cutAngle, false);
      const endX_out = rOuter * Math.cos(cutAngle);
      const endY_out = rOuter * Math.sin(cutAngle);
      const endX_in = rInner * Math.cos(cutAngle);
      const endY_in = rInner * Math.sin(cutAngle);
      shape.lineTo(endX_out, endY_out);
      shape.lineTo(endX_in, endY_in);
      shape.absarc(0, 0, rInner, cutAngle, 0, true);
      shape.closePath();
    }
    return shape;
  };

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth || 600;
    const height = containerRef.current.clientHeight || 450;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e17);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 1, 3000);
    camera.position.set(220, 140, 260);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 40;
    controls.maxDistance = 800;
    controls.target.set(0, 0, 0);
    controls.autoRotate = autoRotateRef.current;
    controls.autoRotateSpeed = 2.5;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(160, 220, 160);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.9);
    dirLight2.position.set(-160, -100, -160);
    scene.add(dirLight2);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 1.0);
    rimLight.position.set(0, 200, -220);
    scene.add(rimLight);

    // Internal combustion chamber point light
    const chamberGlow = new THREE.PointLight(0xf97316, 0, 300);
    chamberGlow.position.set(0, 0, 0);
    scene.add(chamberGlow);
    chamberGlowRef.current = chamberGlow;

    // Exhaust nozzle flame point light
    const flameLight = new THREE.PointLight(0xf59e0b, 0, 450);
    flameLight.position.set(Lc / 20 + 20, 0, 0);
    scene.add(flameLight);
    flameLightRef.current = flameLight;

    // 6. Floor Grid & Technical Axes
    const gridHelper = new THREE.GridHelper(500, 50, 0x334155, 0x1e293b);
    gridHelper.position.y = -Dc / 20 - 15;
    scene.add(gridHelper);

    // 7. Master Group for Motor Assembly
    const motorGroup = new THREE.Group();
    scene.add(motorGroup);
    motorGroupRef.current = motorGroup;

    // Sub-groups
    const grainsGroup = new THREE.Group();
    motorGroup.add(grainsGroup);
    grainsGroupRef.current = grainsGroup;

    const plumeGroup = new THREE.Group();
    motorGroup.add(plumeGroup);
    plumeGroupRef.current = plumeGroup;

    // 8. High-Fidelity Particle System for Exhaust Smoke & Supersonic Sparks
    const particleCount = 450;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const ages = new Float32Array(particleCount);
    const lifetimes = new Float32Array(particleCount);
    const baseRadius = new Float32Array(particleCount);

    const nozzleExitX = Lc / 20 + 15;

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = nozzleExitX;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 3;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 3;

      particleColors[i * 3] = 0.95;
      particleColors[i * 3 + 1] = 0.95;
      particleColors[i * 3 + 2] = 0.95;

      velocities[i * 3] = 40 + Math.random() * 80;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 12;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 12;

      ages[i] = Math.random() * 1.5;
      lifetimes[i] = 1.0 + Math.random() * 1.2;
      baseRadius[i] = Math.random() * 4;
    }

    particlePhysicsRef.current = { velocities, ages, lifetimes, baseRadius };

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.visible = false;
    plumeGroup.add(particles);
    particlesRef.current = particles;

    // 9. Resize Observer with requestAnimationFrame debounce
    let resizeRafId: number | null = null;
    const handleResize = () => {
      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
      }
      resizeRafId = requestAnimationFrame(() => {
        if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w <= 0 || h <= 0) return;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h, false);
      });
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // 10. Animation Loop with realistic turbulence & aerodynamics
    let lastTime = performance.now();
    const animate = (now: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotateRef.current;
        controlsRef.current.autoRotateSpeed = 2.5;
        controlsRef.current.update();
      }

      // Dynamic Particle Simulation
      if (particlesRef.current && particlesRef.current.visible && particlePhysicsRef.current) {
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        const colors = particlesRef.current.geometry.attributes.color.array as Float32Array;
        const { velocities: vels, ages: particleAges, lifetimes: pLifetimes } = particlePhysicsRef.current;
        
        const exitX = (Lc / 20) + 15;

        for (let i = 0; i < particleCount; i++) {
          particleAges[i] += delta * 1.5;

          if (particleAges[i] >= pLifetimes[i]) {
            // Respawn at nozzle throat exit
            particleAges[i] = 0;
            positions[i * 3] = exitX;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 3;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
            
            vels[i * 3] = 45 + Math.random() * 85;
            const spreadAngle = (Math.random() * Math.PI * 2);
            const spreadMag = (Math.random() * 8);
            vels[i * 3 + 1] = Math.cos(spreadAngle) * spreadMag;
            vels[i * 3 + 2] = Math.sin(spreadAngle) * spreadMag;
          } else {
            const ageRatio = particleAges[i] / pLifetimes[i];
            // Aerodynamic drag + expanding turbulence
            const turbulence = Math.sin(now * 0.005 + i) * 6 * ageRatio;
            positions[i * 3] += vels[i * 3] * delta;
            positions[i * 3 + 1] += (vels[i * 3 + 1] + turbulence) * delta;
            positions[i * 3 + 2] += (vels[i * 3 + 2] + Math.cos(now * 0.005 + i) * 6 * ageRatio) * delta;
          }
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate(performance.now());

    return () => {
      if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Update Motor Geometry (Casing, Bulkhead, Nozzle, Retainers)
  useEffect(() => {
    if (!motorGroupRef.current) return;
    const motorGroup = motorGroupRef.current;

    // Remove static casing elements, retain grains and plume sub-groups
    const childrenToRemove = motorGroup.children.filter(
      c => c !== grainsGroupRef.current && c !== plumeGroupRef.current
    );
    childrenToRemove.forEach(c => motorGroup.remove(c));

    const casingRadius = Dc / 20; // 3D units
    const casingLength = Lc / 10; // 3D units
    const wallThick = 1.2; // mm scaled

    // Cutaway mode:
    // When performing 3D cut:
    // 1. Cut the angle in half: Math.PI (180 degrees)
    // 2. Set the casing material to transparent/translucent acrylic so the grain inside is clearly visible!
    const cutAngle = viewMode === 'cutaway' ? Math.PI : Math.PI * 2;

    // Outer Casing Material
    let casingMaterial: THREE.Material;
    if (viewMode === 'solid') {
      // Solid Machined Aerospace Aluminum
      casingMaterial = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.88,
        roughness: 0.22,
        wireframe: showWireframe,
        side: THREE.DoubleSide
      });
    } else if (viewMode === 'cutaway') {
      // 3D Cutaway: Transparent Acrylic + Cut Open Casing to clearly showcase the interior grain
      casingMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x93c5fd,
        metalness: 0.08,
        roughness: 0.12,
        transmission: 0.88,
        transparent: true,
        opacity: 0.35,
        ior: 1.5,
        reflectivity: 0.65,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        side: THREE.DoubleSide,
        wireframe: showWireframe,
        depthWrite: false
      });
    } else {
      // Fully Transparent Glass / Aerospace Acrylic
      casingMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x93c5fd,
        metalness: 0.05,
        roughness: 0.05,
        transmission: 0.95,
        transparent: true,
        opacity: 0.22,
        ior: 1.5,
        reflectivity: 0.6,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        side: THREE.DoubleSide,
        wireframe: showWireframe,
        depthWrite: false
      });
    }

    // Metallic End Bulks Material
    const aluminumMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25,
      wireframe: showWireframe,
      side: THREE.DoubleSide
    });

    // Graphite / Phenolic Nozzle Throat Material
    const graphiteMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.4,
      roughness: 0.5,
      wireframe: showWireframe,
      side: THREE.DoubleSide
    });

    // Gold/Brass Retaining Rings Material
    const goldRingMaterial = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.2,
      wireframe: showWireframe,
      side: THREE.DoubleSide
    });

    // 1. Casing Tube (Cut in half in cutaway mode)
    const casingGeom = new THREE.CylinderGeometry(
      casingRadius + wallThick,
      casingRadius + wallThick,
      casingLength,
      48,
      1,
      viewMode === 'solid' ? false : true,
      0,
      cutAngle
    );
    casingGeom.rotateZ(Math.PI / 2);
    const casingMesh = new THREE.Mesh(casingGeom, casingMaterial);
    motorGroup.add(casingMesh);

    // 2. Forward Bulkhead (Head End Closure at -X)
    const fwdGroup = new THREE.Group();
    fwdGroup.position.x = -casingLength / 2;

    const fwdCapGeom = new THREE.CylinderGeometry(
      casingRadius + wallThick + 0.5,
      casingRadius + wallThick + 0.5,
      4,
      32,
      1,
      false,
      0,
      cutAngle
    );
    fwdCapGeom.rotateZ(Math.PI / 2);
    const fwdCap = new THREE.Mesh(fwdCapGeom, aluminumMaterial);
    fwdGroup.add(fwdCap);

    // Pressure tap port nipple
    const tapGeom = new THREE.CylinderGeometry(1.5, 1.5, 6, 16);
    tapGeom.rotateZ(Math.PI / 2);
    tapGeom.translate(-4, 0, 0);
    const tapMesh = new THREE.Mesh(tapGeom, goldRingMaterial);
    fwdGroup.add(tapMesh);

    motorGroup.add(fwdGroup);

    // 3. Aft Retaining Ring (at +X before nozzle)
    const aftRingGeom = new THREE.CylinderGeometry(
      casingRadius + wallThick + 0.8,
      casingRadius + wallThick + 0.8,
      3,
      32,
      1,
      false,
      0,
      cutAngle
    );
    aftRingGeom.rotateZ(Math.PI / 2);
    const aftRing = new THREE.Mesh(aftRingGeom, goldRingMaterial);
    aftRing.position.x = casingLength / 2;
    motorGroup.add(aftRing);

    // 4. Convergent-Divergent De Laval Nozzle (at +X, cut in half in cutaway mode)
    const nozzleGroup = new THREE.Group();
    nozzleGroup.position.x = casingLength / 2;

    const rChamber = casingRadius;
    const rThroat = (Dt0 / 20);
    const rExit = (Ds / 20);
    const lConv = (rChamber - rThroat) / Math.tan(30 * Math.PI / 180);
    const lDiv = (rExit - rThroat) / Math.tan(alpha * Math.PI / 180);

    // Convergent Cone
    const convGeom = new THREE.CylinderGeometry(rThroat, rChamber, lConv, 32, 1, true, 0, cutAngle);
    convGeom.rotateZ(-Math.PI / 2);
    convGeom.translate(lConv / 2, 0, 0);
    const convMesh = new THREE.Mesh(convGeom, graphiteMaterial);
    nozzleGroup.add(convMesh);

    // Divergent Bell / Cone
    const divGeom = new THREE.CylinderGeometry(rExit, rThroat, lDiv, 32, 1, true, 0, cutAngle);
    divGeom.rotateZ(-Math.PI / 2);
    divGeom.translate(lConv + lDiv / 2, 0, 0);
    const divMesh = new THREE.Mesh(divGeom, aluminumMaterial);
    nozzleGroup.add(divMesh);

    // Throat Graphite Insert Ring
    const throatRingGeom = new THREE.TorusGeometry(rThroat + 0.6, 0.6, 16, 32, cutAngle);
    throatRingGeom.rotateY(Math.PI / 2);
    throatRingGeom.translate(lConv, 0, 0);
    const throatRingMesh = new THREE.Mesh(throatRingGeom, graphiteMaterial);
    nozzleGroup.add(throatRingMesh);

    motorGroup.add(nozzleGroup);

  }, [Dc, Lc, Dt0, Ds, alpha, viewMode, showWireframe]);

  // Update Propellant Grains in 3D (Burn Regression in Real-Time & Cut in Half in Cutaway Mode)
  useEffect(() => {
    if (!grainsGroupRef.current) return;
    const grainsGroup = grainsGroupRef.current;

    // Clear old grain meshes
    while (grainsGroup.children.length > 0) {
      const obj = grainsGroup.children[0];
      grainsGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }

    // Cut in half when in cutaway mode (180 degrees = Math.PI)
    const cutAngle = viewMode === 'cutaway' ? Math.PI : Math.PI * 2;

    // Calculate total propellant length to position grains centrally
    const totalGrainsLength = results.grains.reduce((acc, g) => acc + (g.L0 * g.N) / 10, 0);
    let currentX = -totalGrainsLength / 2;

    results.grains.forEach((grain, grainIdx) => {
      // Burn distance for this grain at timeIndex
      const xBurn = results.grains_x && results.grains_x[grainIdx] ? (results.grains_x[grainIdx][timeIndex] || 0) : 0;

      const initialL = grain.L0 / 10;
      const initialDOuter = grain.D0 / 10;
      const initialDInner = (grain.d0 || 0) / 10;
      const initialDStarValley = (grain.d0mayor || 0) / 10;
      const Np = grain.Np || 5;

      // Current regressed dimensions (scaled 1 unit = 10mm)
      const currentL = Math.max(0, initialL - (grain.ei * xBurn * 2) / 10);
      const currentROuter = Math.max(0, (initialDOuter / 2) - (grain.osi * xBurn) / 10);
      const currentRInner = (initialDInner / 2) + (grain.ci * xBurn) / 10;
      const currentRValley = (initialDStarValley / 2) + (grain.ci * xBurn) / 10;

      // Is grain consumed?
      const isConsumed = currentL <= 0.05 || (grain.shape !== 3 && currentRInner >= currentROuter) || currentROuter <= 0.05;

      // Propellant grain material
      const isSelected = selectedGrainIndex === grainIdx;
      const grainMaterial = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xec4899 : propellantAppearance.grainColor,
        emissive: isSelected ? 0x831843 : propellantAppearance.emissive,
        roughness: propellantAppearance.roughness,
        metalness: propellantAppearance.metalness,
        wireframe: showWireframe,
        side: THREE.DoubleSide
      });

      // Internal glowing flame material on burning faces
      const burningFaceMaterial = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        wireframe: showWireframe,
        side: THREE.DoubleSide
      });

      for (let n = 0; n < grain.N; n++) {
        const segCenterX = currentX + initialL / 2;
        currentX += initialL + 0.3; // 0.3 units space between segments

        if (isConsumed) continue;

        let grainGeom: THREE.BufferGeometry | null = null;

        if (grain.shape === 1) {
          // Shape 1: Tubular Hollow Grain (Cut in half in cutaway mode)
          const rIn = Math.max(0.01, currentRInner);
          const rOut = Math.max(rIn + 0.05, currentROuter);

          const shape = createTubularShape(rOut, rIn, cutAngle);
          grainGeom = new THREE.ExtrudeGeometry(shape, {
            depth: currentL,
            bevelEnabled: false,
            curveSegments: 36
          });
          grainGeom.translate(0, 0, -currentL / 2);
          grainGeom.rotateY(Math.PI / 2);

        } else if (grain.shape === 2) {
          // Shape 2: Star / Finocyl Core (Cut in half in cutaway mode)
          const rTip = Math.min(currentROuter - 0.05, currentRInner);
          const rValley = Math.min(currentROuter - 0.05, currentRValley);
          const rOut = Math.max(rValley + 0.05, currentROuter);

          const shape = createCutStarShape(rOut, rTip, rValley, Np, cutAngle);
          grainGeom = new THREE.ExtrudeGeometry(shape, {
            depth: currentL,
            bevelEnabled: false,
            curveSegments: 36
          });
          grainGeom.translate(0, 0, -currentL / 2);
        } else if (grain.shape === 4) {
          // Shape 4: Finocyl Grain (Fast Marching Method)
          const numFins = grain.numFins !== undefined ? grain.numFins : (grain.Np > 0 ? grain.Np : 4);
          const finW = grain.finWidth !== undefined ? grain.finWidth : 10;
          const finL = grain.finLength !== undefined ? grain.finLength : 15;
          const rIn = Math.max(0.01, currentRInner);
          const rOut = Math.max(rIn + 0.05, currentROuter);

          const shape = createFinocylShape(rOut, rIn, numFins, finW, finL, !!grain.invertedFins, cutAngle);
          grainGeom = new THREE.ExtrudeGeometry(shape, {
            depth: currentL,
            bevelEnabled: false,
            curveSegments: 36
          });
          grainGeom.translate(0, 0, -currentL / 2);
          grainGeom.rotateY(Math.PI / 2);

        } else {
          // Shape 3: Solid Grain / Macizo (Cut in half in cutaway mode)
          const rOut = Math.max(0.05, currentROuter);
          grainGeom = new THREE.CylinderGeometry(rOut, rOut, currentL, 36, 1, false, 0, cutAngle);
          grainGeom.rotateZ(Math.PI / 2);
        }

        if (grainGeom) {
          const mesh = new THREE.Mesh(grainGeom, grainMaterial);
          mesh.position.x = segCenterX;
          grainsGroup.add(mesh);

          // Add glowing combustion flame core if motor is firing
          if (normThrust > 0.05 && grain.shape !== 3 && currentRInner < currentROuter) {
            const flameCoreGeom = new THREE.CylinderGeometry(
              currentRInner * 0.9,
              currentRInner * 0.9,
              currentL * 0.98,
              24,
              1,
              true,
              0,
              cutAngle
            );
            flameCoreGeom.rotateZ(Math.PI / 2);
            const flameCoreMesh = new THREE.Mesh(flameCoreGeom, burningFaceMaterial);
            flameCoreMesh.position.x = segCenterX;
            grainsGroup.add(flameCoreMesh);
          }
        }
      }
    });

  }, [results, timeIndex, viewMode, selectedGrainIndex, showWireframe, propellantAppearance, Lc, normThrust]);

  // Update Dynamic Lights, Plume, Smoke Billows, and Supersonic Shock Diamonds
  useEffect(() => {
    const casingLength = Lc / 10;
    const nozzleExitX = casingLength / 2 + 15;

    // 1. Chamber Glow
    if (chamberGlowRef.current) {
      chamberGlowRef.current.intensity = normP * 4.5;
      chamberGlowRef.current.color.setHex(normThrust > 0.1 ? 0xf97316 : 0x000000);
    }

    // 2. Flame Point Light
    if (flameLightRef.current) {
      flameLightRef.current.position.set(nozzleExitX, 0, 0);
      flameLightRef.current.intensity = propellantAppearance.hasFlame ? normThrust * 9.0 : normThrust * 2.5;
      flameLightRef.current.color.setHex(propellantAppearance.flameColor);
    }

    // 3. 3D Exhaust Plume Mesh
    if (plumeGroupRef.current) {
      const plumeGroup = plumeGroupRef.current;
      // Remove old plume meshes (except particles)
      const oldPlumes = plumeGroup.children.filter(c => c !== particlesRef.current);
      oldPlumes.forEach(c => plumeGroup.remove(c));

      // Update particle colors based on propellant
      if (particlesRef.current) {
        const particleColors = particlesRef.current.geometry.attributes.color.array as Float32Array;
        const count = particleColors.length / 3;
        
        let r = 0.9, g = 0.9, b = 0.9;
        if (profile.category === 'rnx') {
          r = 0.08; g = 0.08; b = 0.10; // Pitch black charcoal smoke for RNX
        } else if (profile.category === 'candy') {
          r = 0.94; g = 0.95; b = 0.98; // Dense puffy white smoke for Candy
        } else {
          r = 0.38; g = 0.78; b = 1.00; // Supersonic ionized sparks for APCP
        }

        for (let i = 0; i < count; i++) {
          particleColors[i * 3] = r + (Math.random() - 0.5) * 0.08;
          particleColors[i * 3 + 1] = g + (Math.random() - 0.5) * 0.08;
          particleColors[i * 3 + 2] = b + (Math.random() - 0.5) * 0.08;
        }
        particlesRef.current.geometry.attributes.color.needsUpdate = true;
      }

      if (normThrust > 0.02) {
        // High-temperature Supersonic Flame & Shock Diamonds for APCP
        if (propellantAppearance.hasFlame) {
          const flameLen = (55 + normThrust * 110) * 1.5;
          const flameR = (Ds / 20) * (0.8 + normThrust * 0.65);

          // 1. Outer Flame Plume Mantle
          const flameGeom = new THREE.ConeGeometry(flameR * 1.5, flameLen, 32, 1, true);
          flameGeom.rotateZ(-Math.PI / 2);
          flameGeom.translate(nozzleExitX + flameLen / 2, 0, 0);

          const flameMat = new THREE.MeshBasicMaterial({
            color: propellantAppearance.flameColor,
            transparent: true,
            opacity: 0.75 * normThrust,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          const flameMesh = new THREE.Mesh(flameGeom, flameMat);
          plumeGroup.add(flameMesh);

          // 2. Supersonic Shock Diamonds (Mach Discs)
          if (propellantAppearance.hasDiamonds) {
            const numDiamonds = Math.max(2, Math.floor(normThrust * 6));
            for (let d = 0; d < numDiamonds; d++) {
              const dX = nozzleExitX + (d + 1) * (flameLen / (numDiamonds + 1));
              const dScale = 1 - (d / numDiamonds) * 0.55;
              const diamondGeom = new THREE.OctahedronGeometry(flameR * 0.65 * dScale, 0);
              diamondGeom.scale(2.2, 0.85, 0.85);
              diamondGeom.translate(dX, 0, 0);

              const diamondMat = new THREE.MeshBasicMaterial({
                color: 0x93c5fd,
                transparent: true,
                opacity: 0.9 * normThrust * dScale,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false
              });
              const diamondMesh = new THREE.Mesh(diamondGeom, diamondMat);
              plumeGroup.add(diamondMesh);
            }
          }

          // 3. Ultra-Bright Inner Core Plume
          const coreGeom = new THREE.ConeGeometry(flameR * 0.65, flameLen * 0.45, 24, 1, true);
          coreGeom.rotateZ(-Math.PI / 2);
          coreGeom.translate(nozzleExitX + flameLen * 0.22, 0, 0);

          const coreMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.95 * normThrust,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          const coreMesh = new THREE.Mesh(coreGeom, coreMat);
          plumeGroup.add(coreMesh);
        }

        // Turn on particles (smoke puffs / sparks)
        if (particlesRef.current) {
          particlesRef.current.visible = true;
        }
      } else {
        if (particlesRef.current) {
          particlesRef.current.visible = false;
        }
      }
    }
  }, [normThrust, normP, Lc, Ds, propellantAppearance, profile]);

  // Camera Presets
  const setCameraView = (view: 'iso' | 'side' | 'front' | 'top') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (view) {
      case 'iso':
        camera.position.set(220, 140, 260);
        break;
      case 'side':
        camera.position.set(0, 0, 320);
        break;
      case 'front':
        camera.position.set(320, 0, 0);
        break;
      case 'top':
        camera.position.set(0, 320, 0);
        break;
    }
    controls.target.set(0, 0, 0);
    controls.update();
  };

  return (
    <div className="flex flex-col w-full h-full bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative select-none">
      
      {/* TOP HUD BAR: Title, Telemetry, and Mode Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
          <div>
            <span className="font-bold text-xs uppercase tracking-widest text-white font-mono flex items-center gap-2">
              <Flame size={14} className="text-orange-500" />
              {t?.motor_3d_title || 'Motor 3D Interactivo • Regresión de Granos'}
            </span>
            <div className="text-[10px] text-slate-300 font-mono flex items-center gap-1.5 mt-0.5">
              <span className="text-purple-300 font-semibold">{propellantAppearance.name}</span>
              <span>•</span>
              <span>{results.grains.length} {t?.grains_types || 'tipos de granos'}</span>
            </div>
          </div>
        </div>

        {/* Live Gauges in HUD */}
        <div className="flex items-center gap-4 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase">{t?.thrust || 'Thrust'}:</span>
            <span className="font-bold text-orange-400">{currentThrust.toFixed(1)} N</span>
          </div>
          <div className="h-3 w-px bg-slate-700"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase">{t?.pressure || 'Pressure'}:</span>
            <span className="font-bold text-sky-400">{(currentP * 10).toFixed(2)} bar</span>
          </div>
          <div className="h-3 w-px bg-slate-700"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase">{t?.axis_time?.split(' ')[0] || 'Time'}:</span>
            <span className="font-bold text-purple-300">T+ {currentT.toFixed(3)}s</span>
          </div>
        </div>

        {/* View Mode Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewMode(viewMode === 'cutaway' ? 'solid' : viewMode === 'solid' ? 'transparent' : 'cutaway')}
            className="h-7 text-[11px] px-2.5 bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200 gap-1.5 font-mono"
            title="Cambiar modo: Corte 3D (Cutaway) / Sólido Metálico / Transparente"
          >
            <Scissors size={13} className="text-purple-400" />
            <span className="uppercase font-semibold">
              {viewMode === 'solid' ? (t?.view_mode_solid || 'Sólido') : viewMode === 'cutaway' ? (t?.view_mode_cutaway || 'Corte 3D') : (t?.view_mode_transparent || 'Transparente')}
            </span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`h-7 text-[11px] px-2.5 border-slate-700 font-mono gap-1.5 transition-all ${
              autoRotate 
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)] border-purple-400' 
                : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
            }`}
            title={t?.auto_rotate || 'Auto-rotación 360°'}
          >
            <RotateCcw size={13} className={autoRotate ? 'animate-spin' : ''} />
            <span>360° {autoRotate ? 'ON' : 'OFF'}</span>
          </Button>

          <Select onValueChange={(v) => setCameraView(v as any)} defaultValue="iso">
            <SelectTrigger className="h-7 w-24 text-[10px] bg-slate-800/80 border-slate-700 text-slate-200 font-mono">
              <SelectValue placeholder={t?.camera_view || 'Cámara'} />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 font-mono text-[11px]">
              <SelectItem value="iso">{t?.camera_iso || 'Iso 3D'}</SelectItem>
              <SelectItem value="side">{t?.camera_side || 'Lateral'}</SelectItem>
              <SelectItem value="front">{t?.camera_front || 'Frontal'}</SelectItem>
              <SelectItem value="top">{t?.camera_top || 'Superior'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3D CANVAS CONTAINER */}
      <div className="flex-1 relative min-h-[380px] w-full cursor-grab active:cursor-grabbing" ref={containerRef}>
        
        {/* Floating Quick Tips & Overlay */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none flex flex-col gap-1.5 font-mono text-[10px] text-slate-300 bg-slate-950/85 p-2.5 rounded-lg border border-slate-800/80 backdrop-blur-md shadow-md">
          <div className="flex items-center gap-1.5 text-slate-100 font-bold">
            <Activity size={13} className="text-emerald-400" />
            <span>{t?.motor_status || 'ESTADO DEL MOTOR'}: {normThrust > 0.05 ? `🔥 ${t?.motor_firing || 'EN COMBUSTIÓN'}` : (timeIndex >= results.t.length - 1 ? `🏁 ${t?.motor_exhausted || 'AGOTADO'}` : `⏸ ${t?.motor_standby || 'EN ESPERA'}`)}</span>
          </div>
          <div className="text-slate-400">
            • {t?.tip_rotate || 'Haz clic y arrastra para rotar 360°'}
          </div>
          <div className="text-slate-400">
            • {t?.tip_zoom || 'Rueda del ratón para Zoom in/out'}
          </div>
          <div className="text-purple-300 font-semibold mt-0.5">
            • {t?.propellant_label || 'Propulsante'}: {profile.category === 'candy' ? (t?.candy_white_smoke || profile.description) : profile.category === 'rnx' ? (t?.rnx_black_smoke || profile.description) : (t?.apcp_supersonic || profile.description)}
          </div>
        </div>

        {/* Grain Selection Pills (Bottom Left) */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-slate-400 uppercase font-bold mr-1">{t?.grains || 'Granos'}:</span>
          {results.grains.map((g, idx) => {
            const xBurn = results.grains_x && results.grains_x[idx] ? results.grains_x[idx][timeIndex] || 0 : 0;
            const currentL = Math.max(0, g.L0 - g.ei * xBurn * 2);
            const burnPct = Math.min(100, Math.max(0, (1 - currentL / g.L0) * 100));

            return (
              <button
                key={g.id || idx}
                onClick={() => setSelectedGrainIndex(selectedGrainIndex === idx ? null : idx)}
                className={`px-2 py-1 rounded border text-[10px] font-bold transition-all ${
                  selectedGrainIndex === idx 
                    ? 'bg-pink-600 border-pink-400 text-white shadow-lg' 
                    : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
                title={`Grano ${idx + 1}: ${g.shape === 1 ? 'Tubular' : g.shape === 2 ? 'Estrella' : g.shape === 4 ? 'Finocyl' : 'Macizo'} (${burnPct.toFixed(0)}% consumido)`}
              >
                G{idx + 1} ({burnPct.toFixed(0)}%)
              </button>
            );
          })}
        </div>
      </div>

      {/* BOTTOM PLAYBACK CONTROLS BAR */}
      <div className="flex items-center gap-4 px-4 py-3 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md z-10 shrink-0">
        
        {/* Play/Pause Button */}
        <Button
          onClick={onTogglePlay}
          className={`w-24 h-8 font-mono text-xs font-bold gap-1.5 transition-all shadow-md ${
            isPlaying 
              ? 'bg-amber-600 hover:bg-amber-500 text-white' 
              : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
          }`}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          {isPlaying ? (t?.pause || 'Pausar') : (timeIndex >= results.t.length - 1 ? (t?.restart || 'Reiniciar') : (t?.play || 'Play'))}
        </Button>

        {/* Timeline Slider */}
        <div className="flex-1 flex flex-col justify-center px-2">
          <input
            type="range"
            min="0"
            max={results.t.length - 1}
            value={timeIndex}
            onChange={(e) => onTimeChange && onTimeChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
            <span>0.000s</span>
            <span className="font-bold text-white text-xs drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]">
              T+ {currentT.toFixed(3)}s / {(results.summary.t_quemado || results.t[results.t.length - 1]).toFixed(3)}s
            </span>
            <span>{(results.summary.t_quemado || results.t[results.t.length - 1]).toFixed(3)}s</span>
          </div>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1.5 w-[110px]">
          <span className="text-[10px] text-slate-400 font-mono uppercase">{t?.speed_label || t?.playback_speed || 'Vel:'}</span>
          <Select value={String(speed)} onValueChange={(v) => onSpeedChange && onSpeedChange(Number(v))}>
            <SelectTrigger className="h-7 text-[10px] border-slate-700 bg-slate-950 text-purple-300 font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 text-purple-200 font-mono text-[10px] border-slate-700">
              <SelectItem value="0.25">0.25x</SelectItem>
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="1">1.0x ({t?.real_time || 'Real'})</SelectItem>
              <SelectItem value="2">2.0x</SelectItem>
              <SelectItem value="4">4.0x</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
