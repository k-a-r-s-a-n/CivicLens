import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function Particles({ count }: { count: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate random positions in a sphere
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.5 + Math.random() * 0.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;

    // Slow rotation
    pointsRef.current.rotation.y += 0.001;
    pointsRef.current.rotation.x += 0.0005;

    // React to mouse position with gentle tilt
    const { x, y } = state.pointer;
    pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, y * 0.2, 0.1);
    pointsRef.current.rotation.y = THREE.MathUtils.lerp(pointsRef.current.rotation.y, x * 0.2, 0.1);

    // Pulse scale based on time
    const time = state.clock.getElapsedTime();
    const s = 1 + Math.sin(time * 0.5) * 0.05;
    pointsRef.current.scale.set(s, s, s);
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#2dd4bf"
        size={0.008}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

export function CivicSphere() {
  // Mobile optimization: limit particle count
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const particleCount = isMobile ? 1500 : 4000;

  return (
    <div className="absolute inset-0 -z-10 bg-[#09090b]">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 45 }}
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
        gl={{ antialias: false, alpha: true }}
      >
        <Particles count={particleCount} />
      </Canvas>
    </div>
  );
}
