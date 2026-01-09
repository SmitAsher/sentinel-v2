import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Flow {
  src_ip: string;
  dst_ip: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  [key: string]: any;
}

const GlobeComponent = ({ flows }: { flows: Flow[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 2.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x0a0e27);
    containerRef.current.appendChild(renderer.domElement);

    // Create globe
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      color: 0x1a3a52,
      emissive: 0x0a1f2e,
      shininess: 5,
    });
    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Add lighting
    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(5, 3, 5);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x444444);
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
      const geometry = new THREE.SphereGeometry(0.02, 8, 8);
      const material = new THREE.MeshBasicMaterial({ color });
      const particle = new THREE.Mesh(geometry, material);

      // Position on sphere
      const latSrc = Math.random() * Math.PI;
      const lonSrc = Math.random() * Math.PI * 2;
      particle.position.set(
        Math.sin(latSrc) * Math.cos(lonSrc),
        Math.cos(latSrc),
        Math.sin(latSrc) * Math.sin(lonSrc)
      );

      particle.userData.duration = 0;
      particle.userData.maxDuration = 2;
      particleGroup.add(particle);

      return particle;
    };

    // Update particles
    const animate = () => {
      requestAnimationFrame(animate);

      globe.rotation.y += 0.0002;

      // Update particles
      for (let i = particleGroup.children.length - 1; i >= 0; i--) {
        const particle = particleGroup.children[i];
        particle.userData.duration += 0.016;

        if (particle.userData.duration > particle.userData.maxDuration) {
          particleGroup.remove(particle);
        } else {
          if (particle instanceof THREE.Mesh && particle.material instanceof THREE.Material) {
            (particle.material as THREE.MeshBasicMaterial).opacity = 1 - particle.userData.duration / particle.userData.maxDuration;
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Add flows
    if (flows && flows.length > 0) {
      flows.forEach((flow) => {
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

    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [flows]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default GlobeComponent;
