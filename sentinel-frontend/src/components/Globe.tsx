import { useEffect, useRef, useContext } from 'react';
import * as THREE from 'three';
import { FlowContext } from '../context/FlowContext';

const GlobeComponent = () => {
  const { flows } = useContext(FlowContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e27);
    
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;
    
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 2.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Create globe with gradient material
    const geometry = new THREE.SphereGeometry(1, 128, 128);
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#1a3a52');
      grad.addColorStop(0.5, '#0d2a3f');
      grad.addColorStop(1, '#051a2b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add grid pattern (longitude/latitude)
      ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 128) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 128) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshPhongMaterial({
      map: texture,
      emissive: 0x0a1f2e,
      shininess: 10,
      wireframe: false,
    });
    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);
    globeRef.current = globe;

    // Add lighting
    const light = new THREE.PointLight(0xffffff, 1.2);
    light.position.set(5, 3, 5);
    scene.add(light);

    const light2 = new THREE.PointLight(0x6699ff, 0.6);
    light2.position.set(-5, -3, 3);
    scene.add(light2);

    const ambientLight = new THREE.AmbientLight(0x555577, 0.8);
    scene.add(ambientLight);

    // Animate flows as particles
    const particleGroup = new THREE.Group();
    scene.add(particleGroup);

    const createFlowParticle = (_src: string, _dst: string, severity: string) => {
      const colorMap: Record<string, number> = {
        critical: 0xff3232,
        high: 0xffc800,
        medium: 0xffeb3b,
        low: 0x00ff64,
      };

      const color = colorMap[severity] || 0x00d4ff;
      const geometry = new THREE.SphereGeometry(0.025, 16, 16);
      const material = new THREE.MeshBasicMaterial({ color });
      const particle = new THREE.Mesh(geometry, material);

      // Position on sphere surface
      const latSrc = Math.random() * Math.PI;
      const lonSrc = Math.random() * Math.PI * 2;
      particle.position.set(
        Math.sin(latSrc) * Math.cos(lonSrc) * 1.05,
        Math.cos(latSrc) * 1.05,
        Math.sin(latSrc) * Math.sin(lonSrc) * 1.05
      );

      particle.userData.duration = 0;
      particle.userData.maxDuration = 3;
      particleGroup.add(particle);

      return particle;
    };

    // Update particles
    const animate = () => {
      requestAnimationFrame(animate);

      if (globeRef.current) {
        globeRef.current.rotation.y += 0.0003;
      }

      // Update particles
      for (let i = particleGroup.children.length - 1; i >= 0; i--) {
        const particle = particleGroup.children[i];
        particle.userData.duration += 0.016;

        if (particle.userData.duration > particle.userData.maxDuration) {
          particleGroup.remove(particle);
        } else {
          if (particle instanceof THREE.Mesh && particle.material instanceof THREE.MeshBasicMaterial) {
            particle.material.opacity = 1 - particle.userData.duration / particle.userData.maxDuration;
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Add incoming flows as particles
    if (flows && flows.length > 0) {
      flows.slice(0, 10).forEach((flow) => {
        createFlowParticle(flow.src_ip, flow.dst_ip, flow.severity || 'medium');
      });
    }

    sceneRef.current = scene;
    rendererRef.current = renderer;

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Copy ref to local variable for stable cleanup (avoids eslint warning)
    const container = containerRef.current;

    return () => {
      window.removeEventListener('resize', handleResize);
      if (container && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [flows]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '500px',
        position: 'relative',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        overflow: 'hidden',
      }}
    />
  );
};

export default GlobeComponent;

