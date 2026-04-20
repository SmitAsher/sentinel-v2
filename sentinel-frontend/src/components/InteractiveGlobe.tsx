import React, { useEffect, useRef, useContext, useState } from 'react';
import * as THREE from 'three';
import { FlowContext } from '../context/FlowContext';
import '../styles/InteractiveGlobe.css';

interface InteractiveGlobeProps {
  organization: string;
}

export default function InteractiveGlobe({ organization }: InteractiveGlobeProps) {
  const { flows } = useContext(FlowContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const globeRef = useRef<THREE.Group | null>(null);
  const arcsGroupRef = useRef<THREE.Group | null>(null);
  
  // Track offices for interactivity
  const clickableObjects = useRef<THREE.Mesh[]>([]);
  const [hoveredOffice, setHoveredOffice] = useState<string | null>(null);

  // Office locations (Lat/Lon)
  const offices = [
    { id: 'us-west', lat: 37.386, lon: -122.083, name: 'Mountain View' },
    { id: 'us-east', lat: 40.712, lon: -74.006, name: 'New York' },
    { id: 'eu-west', lat: 53.349, lon: -6.260, name: 'Dublin' },
    { id: 'asia-east', lat: 35.676, lon: 139.650, name: 'Tokyo' },
    { id: 'asia-south', lat: 19.076, lon: 72.877, name: 'Mumbai' }
  ];

  // Helper to convert LatLon to 3D Cartesian coordinates
  const getCoordinates = (lat: number, lon: number, radius = 1) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    
    return new THREE.Vector3(
      -(radius * Math.sin(phi) * Math.cos(theta)),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene Setup
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    // Dark space background exactly like Check Point
    scene.background = new THREE.Color(0x0a0a0f);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    // Position camera far enough to see the whole earth
    camera.position.z = 2.8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Clear container and append
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);
    globeRef.current = mainGroup;

    // 2. The Globe Mesh (Lightweight Enterprise wireframe/dots)
    // Create a base dark sphere
    const globeGeo = new THREE.SphereGeometry(1, 64, 64);
    const globeMat = new THREE.MeshBasicMaterial({ 
      color: 0x050510,
      transparent: true,
      opacity: 0.9
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    mainGroup.add(globeMesh);

    // Add a stylized wireframe to look like coordinates
    const wireGeo = new THREE.SphereGeometry(1.001, 32, 32);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x1f2833,
      wireframe: true,
      transparent: true,
      opacity: 0.2
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    mainGroup.add(wireMesh);

    // 3. Add Offices
    clickableObjects.current = [];
    offices.forEach(office => {
      const pos = getCoordinates(office.lat, office.lon, 1.01);
      
      // Office marker
      const markerGeo = new THREE.CircleGeometry(0.02, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      
      marker.position.copy(pos);
      marker.lookAt(new THREE.Vector3(pos.x * 2, pos.y * 2, pos.z * 2));
      marker.userData = { id: office.id, name: office.name };
      
      mainGroup.add(marker);
      clickableObjects.current.push(marker);

      // Add a subtle glowing ring around the office
      const ringGeo = new THREE.RingGeometry(0.03, 0.04, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(pos.x * 2, pos.y * 2, pos.z * 2));
      mainGroup.add(ring);
    });

    // 4. Group for Attack Arcs
    const arcsGroup = new THREE.Group();
    mainGroup.add(arcsGroup);
    arcsGroupRef.current = arcsGroup;

    // 5. Interactivity (Raycaster)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate mouse position for hovering
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Handle spinning the globe
      if (isDragging) {
        const deltaMove = {
          x: e.clientX - previousMousePosition.x,
          y: e.clientY - previousMousePosition.y
        };

        if (mainGroup) {
          mainGroup.rotation.y += deltaMove.x * 0.005;
          mainGroup.rotation.x += deltaMove.y * 0.005;
        }

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const domElement = renderer.domElement;
    domElement.style.touchAction = 'none';
    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 6. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Auto rotate very slowly if not dragging
      if (!isDragging && mainGroup) {
        mainGroup.rotation.y += 0.0005;
      }

      // Check intersections for hovering
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(clickableObjects.current);
      
      if (intersects.length > 0) {
        setHoveredOffice(intersects[0].object.userData.name);
        document.body.style.cursor = 'pointer';
      } else {
        setHoveredOffice(null);
        document.body.style.cursor = isDragging ? 'grabbing' : 'grab';
      }

      // Animate Arcs
      const time = clock.getElapsedTime();
      if (arcsGroupRef.current) {
        arcsGroupRef.current.children.forEach((arc: any) => {
          if (arc.material.dashOffset !== undefined) {
            // Move dash along the line
            arc.material.dashOffset -= 0.02;
            // Fade out old arcs
            const age = time - arc.userData.createdAt;
            if (age > 3) {
              arc.material.opacity = Math.max(0, 1 - (age - 3) * 2);
            }
          }
        });
        
        // Remove dead arcs
        for (let i = arcsGroupRef.current.children.length - 1; i >= 0; i--) {
          const arc = arcsGroupRef.current.children[i] as any;
          if (time - arc.userData.createdAt > 4) {
            arcsGroupRef.current.remove(arc);
            arc.geometry.dispose();
            arc.material.dispose();
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 7. Handle Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current && domElement.parentNode) {
        containerRef.current.removeChild(domElement);
      }
      renderer.dispose();
    };
  }, []); // Only run once on mount

  // Draw 3D Arcs when a new attack flow arrives
  useEffect(() => {
    if (!flows || flows.length === 0 || !globeRef.current || !arcsGroupRef.current) return;

    const latestFlow = flows[0];
    
    // Pick a random office as the target
    const target = offices[Math.floor(Math.random() * offices.length)];
    const targetPos = getCoordinates(target.lat, target.lon);

    // Random global origin
    const srcLat = (Math.random() - 0.5) * 160; 
    const srcLon = (Math.random() - 0.5) * 360;
    const srcPos = getCoordinates(srcLat, srcLon);

    // Calculate arc control point (bulge out from globe center)
    const midPoint = new THREE.Vector3().addVectors(srcPos, targetPos).multiplyScalar(0.5);
    const distance = srcPos.distanceTo(targetPos);
    midPoint.normalize().multiplyScalar(1 + distance * 0.3); // Curve height

    // Create curved line
    const curve = new THREE.QuadraticBezierCurve3(srcPos, midPoint, targetPos);
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    let color = 0x00bcd4; // low
    if (latestFlow.severity === 'critical') color = 0xe91e63;
    else if (latestFlow.severity === 'high') color = 0xff5722;
    else if (latestFlow.severity === 'medium') color = 0xffeb3b;

    const material = new THREE.LineDashedMaterial({
      color: color,
      linewidth: 2,
      scale: 1,
      dashSize: 0.1,
      gapSize: 0.1,
      transparent: true,
      opacity: 1
    });

    const arcLine = new THREE.Line(geometry, material);
    arcLine.computeLineDistances();
    arcLine.userData = { createdAt: new THREE.Clock().getElapsedTime() }; // Simplified age tracking

    arcsGroupRef.current.add(arcLine);

  }, [flows]); 

  return (
    <div className="interactive-globe-wrapper">
      <div 
        ref={containerRef} 
        className="interactive-globe-container"
      />
      
      {/* Tooltip for hovering over offices */}
      {hoveredOffice && (
        <div className="office-tooltip">
          🏢 {organization} | {hoveredOffice} Office
        </div>
      )}
      
      <div className="organization-watermark">
        {organization} GLOBE VIEW
      </div>
    </div>
  );
}
