import { useEffect, useRef, useContext } from 'react';
import * as THREE from 'three';
import { FlowContext } from '../context/FlowContext';

// Shaders for atmosphere glow
const vertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
    gl_FragColor = vec4(0.1, 0.5, 1.0, 1.0) * intensity * 1.8;
  }
`;

const GlobeComponent = () => {
  const { flows } = useContext(FlowContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000814);
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);
    globeGroupRef.current = mainGroup;

    // === EARTH GLOBE WITH REAL TEXTURE ===
    const loader = new THREE.TextureLoader();
    
    // Load Earth texture (continents visible)
    loader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
      (texture) => {
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        
        // Main Earth sphere
        const earthMaterial = new THREE.MeshPhongMaterial({
          map: texture,
          color: 0x2a9fd6,
          emissive: 0x112244,
          emissiveIntensity: 0.1,
          shininess: 5,
        });
        
        const earthMesh = new THREE.Mesh(geometry, earthMaterial);
        mainGroup.add(earthMesh);
      },
      undefined,
      () => {
        // Fallback: Wireframe globe
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshBasicMaterial({
          color: 0x2a9fd6,
          wireframe: true,
          transparent: true,
          opacity: 0.6,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mainGroup.add(mesh);
      }
    );

    // === ATMOSPHERE GLOW ===
    const atmosphereGeo = new THREE.SphereGeometry(1.15, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphere);

    // === GRID LINES (like the image) ===
    const gridGroup = new THREE.Group();
    
    // Latitude lines
    for (let lat = -80; lat <= 80; lat += 20) {
      const curve = new THREE.EllipseCurve(
        0, 0,
        Math.cos((lat * Math.PI) / 180), Math.cos((lat * Math.PI) / 180),
        0, 2 * Math.PI,
        false,
        0
      );
      const points = curve.getPoints(100);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.15,
      });
      const line = new THREE.Line(geometry, material);
      line.rotation.x = Math.PI / 2;
      line.position.y = Math.sin((lat * Math.PI) / 180);
      line.scale.setScalar(1.005);
      gridGroup.add(line);
    }
    
    // Longitude lines
    for (let lon = 0; lon < 360; lon += 20) {
      const curve = new THREE.EllipseCurve(
        0, 0, 1, 1,
        0, 2 * Math.PI,
        false, 0
      );
      const points = curve.getPoints(100);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.15,
      });
      const line = new THREE.Line(geometry, material);
      line.rotation.y = (lon * Math.PI) / 180;
      line.scale.setScalar(1.005);
      gridGroup.add(line);
    }
    
    mainGroup.add(gridGroup);

    // === STARS BACKGROUND ===
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 2000;
    const posArray = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 50;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starsMat = new THREE.PointsMaterial({
      size: 0.02,
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
    });
    const starMesh = new THREE.Points(starsGeo, starsMat);
    scene.add(starMesh);

    // === LIGHTS ===
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(5, 3, 5);
    scene.add(pointLight);

    // === ATTACK FLOW PARTICLES (from your data) ===
    const particleGroup = new THREE.Group();
    mainGroup.add(particleGroup);

    const createAttackParticle = (severity: string) => {
      const colorMap: Record<string, number> = {
        critical: 0xff0044,
        high: 0xff8800,
        medium: 0xffcc00,
        low: 0x00ff88,
      };
      const color = colorMap[severity.toLowerCase()] || 0x00aaff;

      const geometry = new THREE.SphereGeometry(0.02, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
      });
      const particle = new THREE.Mesh(geometry, material);

      // Random position on globe surface
      const r = 1.08;
      const lat = (Math.random() - 0.5) * Math.PI * 0.8;
      const lon = Math.random() * Math.PI * 2;

      particle.position.set(
        r * Math.cos(lat) * Math.cos(lon),
        r * Math.sin(lat),
        r * Math.cos(lat) * Math.sin(lon)
      );

      particle.userData = {
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.02,
      };

      particleGroup.add(particle);
    };

    // Create particles from actual flow data
    if (flows && flows.length > 0) {
      flows.slice(0, 30).forEach((flow) => {
        createAttackParticle(flow.severity || 'medium');
      });
    } else {
      // Default particles if no flows yet
      for (let i = 0; i < 20; i++) {
        createAttackParticle(['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)]);
      }
    }

    // === MOUSE INTERACTION ===
    const handleMouseMove = (event: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      mouseRef.current = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
      };

      targetRotationRef.current = {
        x: mouseRef.current.y * 0.3,
        y: mouseRef.current.x * 0.5,
      };
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);

    // === ANIMATION LOOP ===
    const animate = () => {
      requestAnimationFrame(animate);

      // Smooth rotation towards mouse
      if (mainGroup) {
        mainGroup.rotation.x += (targetRotationRef.current.x - mainGroup.rotation.x) * 0.05;
        mainGroup.rotation.y += (targetRotationRef.current.y - mainGroup.rotation.y) * 0.05;
        mainGroup.rotation.y += 0.001; // Slow auto-rotation
      }

      // Animate attack particles (pulsing)
      particleGroup.children.forEach((p: any) => {
        p.userData.phase += p.userData.speed;
        const scale = 1 + Math.sin(p.userData.phase) * 0.5;
        p.scale.set(scale, scale, scale);

        // Fade in/out
        if (p.material.opacity) {
          p.material.opacity = 0.5 + Math.sin(p.userData.phase) * 0.3;
        }
      });

      // Slow star rotation
      starMesh.rotation.y += 0.0002;

      renderer.render(scene, camera);
    };

    animate();

    // === RESIZE HANDLER ===
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // === CLEANUP ===
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      
      mainGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      
      renderer.dispose();
    };
  }, [flows]); // Re-render when flows change

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '500px',
        position: 'relative',
        backgroundColor: '#000814',
        overflow: 'hidden',
        cursor: 'grab',
      }}
    />
  );
};

export default GlobeComponent;