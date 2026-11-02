/**
 * @file IceCrystalCanvas.tsx
 * @description Hardware-accelerated 3D Ice Crystal & Matrix Particle Canvas.
 * Renders an interactive 3D crystalline geometric structure with holographic facets,
 * depth-sorted vertex wireframes, dynamic light refraction, and floating pixel particles.
 * Reacts smoothly to mouse pointer coordinates and scroll position.
 */

import { useRef, useEffect } from 'react';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Face3D {
  indices: [number, number, number];
  color: string;
  glow: number;
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  opacity: number;
  phase: number;
}

export function IceCrystalCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Mouse pointer tracking with smooth damping
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let rotX = 0.2;
    let rotY = 0;
    let rotZ = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      mouseX = (e.clientX - cx) / (rect.width / 2);
      mouseY = (e.clientY - cy) / (rect.height / 2);
      targetRotY = mouseX * 0.8;
      targetRotX = -mouseY * 0.8;
    };

    window.addEventListener('mousemove', onMouseMove);

    // 3D Crystal Vertices (Elongated bi-pyramidal octahedron with interior core)
    const baseVertices: Point3D[] = [
      { x: 0, y: -130, z: 0 },    // 0: Top apex
      { x: 60, y: -15, z: 60 },   // 1: Mid front-right
      { x: -60, y: -15, z: 60 },  // 2: Mid front-left
      { x: -60, y: -15, z: -60 }, // 3: Mid back-left
      { x: 60, y: -15, z: -60 },  // 4: Mid back-right
      { x: 0, y: 130, z: 0 },     // 5: Bottom apex
      // Inner holographic diamond core
      { x: 0, y: -65, z: 0 },     // 6: Inner top
      { x: 30, y: 0, z: 30 },     // 7: Inner front-right
      { x: -30, y: 0, z: 30 },    // 8: Inner front-left
      { x: -30, y: 0, z: -30 },   // 9: Inner back-left
      { x: 30, y: 0, z: -30 },    // 10: Inner back-right
      { x: 0, y: 65, z: 0 },      // 11: Inner bottom
    ];

    // Crystalline faceted polygons
    const faces: Face3D[] = [
      // Outer upper facets
      { indices: [0, 1, 2], color: 'rgba(0, 217, 255, 0.12)', glow: 0.8 },
      { indices: [0, 2, 3], color: 'rgba(40, 123, 255, 0.10)', glow: 0.7 },
      { indices: [0, 3, 4], color: 'rgba(101, 207, 255, 0.14)', glow: 0.9 },
      { indices: [0, 4, 1], color: 'rgba(0, 217, 255, 0.11)', glow: 0.7 },
      // Outer lower facets
      { indices: [5, 2, 1], color: 'rgba(0, 217, 255, 0.13)', glow: 0.85 },
      { indices: [5, 3, 2], color: 'rgba(40, 123, 255, 0.11)', glow: 0.7 },
      { indices: [5, 4, 3], color: 'rgba(101, 207, 255, 0.15)', glow: 0.9 },
      { indices: [5, 1, 4], color: 'rgba(0, 217, 255, 0.12)', glow: 0.8 },
      // Inner core facets
      { indices: [6, 7, 8], color: 'rgba(0, 217, 255, 0.25)', glow: 1.0 },
      { indices: [6, 8, 9], color: 'rgba(101, 207, 255, 0.22)', glow: 0.9 },
      { indices: [6, 9, 10], color: 'rgba(40, 123, 255, 0.20)', glow: 0.8 },
      { indices: [6, 10, 7], color: 'rgba(0, 217, 255, 0.24)', glow: 1.0 },
      { indices: [11, 8, 7], color: 'rgba(0, 217, 255, 0.26)', glow: 1.0 },
      { indices: [11, 9, 8], color: 'rgba(101, 207, 255, 0.22)', glow: 0.9 },
      { indices: [11, 10, 9], color: 'rgba(40, 123, 255, 0.20)', glow: 0.8 },
      { indices: [11, 7, 10], color: 'rgba(0, 217, 255, 0.24)', glow: 1.0 },
    ];

    // Wireframe edges
    const edges: [number, number][] = [
      [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 2], [2, 3], [3, 4], [4, 1],
      [5, 1], [5, 2], [5, 3], [5, 4],
      [6, 7], [6, 8], [6, 9], [6, 10],
      [7, 8], [8, 9], [9, 10], [10, 7],
      [11, 7], [11, 8], [11, 9], [11, 10],
    ];

    // Floating 3D Pixel Particles
    const particleCount = 45;
    const particles: Particle3D[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 360,
        y: (Math.random() - 0.5) * 320,
        z: (Math.random() - 0.5) * 300,
        size: Math.random() > 0.8 ? 3 : 2,
        speed: 0.3 + Math.random() * 0.7,
        opacity: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // 3D Rotation Math
    const rotatePoint = (p: Point3D, rx: number, ry: number, rz: number): Point3D => {
      // Rotate Y
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const x1 = p.x * cosY + p.z * sinY;
      const z1 = -p.x * sinY + p.z * cosY;

      // Rotate X
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);
      const y2 = p.y * cosX - z1 * sinX;
      const z2 = p.y * sinX + z1 * cosX;

      // Rotate Z
      const cosZ = Math.cos(rz);
      const sinZ = Math.sin(rz);
      const x3 = x1 * cosZ - y2 * sinZ;
      const y3 = x1 * sinZ + y2 * cosZ;

      return { x: x3, y: y3, z: z2 };
    };

    const project = (p: Point3D, fov: number = 420): { x: number; y: number; scale: number } => {
      const scale = fov / (fov + p.z);
      return {
        x: p.x * scale + width / 2,
        y: p.y * scale + height / 2,
        scale,
      };
    };

    let time = 0;

    const render = () => {
      time += 0.015;

      // Smooth inertia rotation towards mouse target
      rotY += (targetRotY - rotY) * 0.05 + 0.007;
      rotX += (targetRotX - rotX) * 0.05;
      rotZ = Math.sin(time * 0.5) * 0.06;

      ctx.clearRect(0, 0, width, height);

      // Radial ambient glow behind crystal
      const grad = ctx.createRadialGradient(
        width / 2, height / 2, 20,
        width / 2, height / 2, 180
      );
      grad.addColorStop(0, 'rgba(0, 217, 255, 0.15)');
      grad.addColorStop(0.5, 'rgba(40, 123, 255, 0.06)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render floating pixel particles (orbiting in 3D)
      for (const p of particles) {
        p.y -= p.speed * 0.6;
        if (p.y < -160) p.y = 160;

        const pRot = rotatePoint(p, rotX * 0.5, rotY * 0.8, rotZ * 0.5);
        const proj = project(pRot);

        const flicker = Math.sin(time * 3 + p.phase) * 0.25 + 0.75;
        const alpha = Math.max(0.1, Math.min(1, p.opacity * flicker * (proj.scale * 0.9)));

        ctx.fillStyle = `rgba(0, 217, 255, ${alpha})`;
        // Pixel block shape
        ctx.fillRect(proj.x - p.size / 2, proj.y - p.size / 2, p.size * proj.scale, p.size * proj.scale);

        // Subtle glow halo for larger pixels
        if (p.size > 2) {
          ctx.fillStyle = `rgba(101, 207, 255, ${alpha * 0.4})`;
          ctx.fillRect(proj.x - p.size, proj.y - p.size, p.size * 2 * proj.scale, p.size * 2 * proj.scale);
        }
      }

      // Rotate all crystal vertices
      const transformed = baseVertices.map((v) => rotatePoint(v, rotX, rotY, rotZ));
      const projected = transformed.map((v) => project(v));

      // Calculate face centers for depth sorting
      const sortedFaces = faces
        .map((f) => {
          const v0 = transformed[f.indices[0]];
          const v1 = transformed[f.indices[1]];
          const v2 = transformed[f.indices[2]];
          const avgZ = (v0.z + v1.z + v2.z) / 3;

          // Normal vector for lighting calculation
          const ax = v1.x - v0.x;
          const ay = v1.y - v0.y;
          const az = v1.z - v0.z;
          const bx = v2.x - v0.x;
          const by = v2.y - v0.y;
          const bz = v2.z - v0.z;

          const nx = ay * bz - az * by;
          const ny = az * bx - ax * bz;
          const nz = ax * by - ay * bx;
          const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

          // Light source at front-top-right (0.5, -0.6, -0.8)
          const dot = Math.max(0, (nx * 0.4 - ny * 0.6 - nz * 0.7) / len);

          return { face: f, avgZ, dot };
        })
        .sort((a, b) => b.avgZ - a.avgZ);

      // Render Crystalline Facets
      for (const item of sortedFaces) {
        const { face, dot } = item;
        const p0 = projected[face.indices[0]];
        const p1 = projected[face.indices[1]];
        const p2 = projected[face.indices[2]];

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();

        // Shaded crystalline surface fill
        const shade = Math.min(0.55, 0.12 + dot * 0.35);
        ctx.fillStyle = face.color.replace(/[\d.]+\)$/, `${shade})`);
        ctx.fill();

        // Facet hairline edge
        ctx.strokeStyle = `rgba(0, 217, 255, ${0.15 + dot * 0.35})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Render Wireframe Edges with Glowing Holographic Cyan
      ctx.lineWidth = 1.5;
      for (const [i0, i1] of edges) {
        const p0 = projected[i0];
        const p1 = projected[i1];
        const zMid = (transformed[i0].z + transformed[i1].z) / 2;
        const edgeAlpha = Math.max(0.2, Math.min(0.9, 0.6 - zMid / 300));

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = `rgba(0, 217, 255, ${edgeAlpha})`;
        ctx.stroke();
      }

      // Render Apex & Vertex Pixel Nodes (authentically pixelated)
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const z = transformed[i].z;
        const alpha = Math.max(0.3, Math.min(1, 0.7 - z / 250));
        const nodeSize = i === 0 || i === 5 ? 5 : 3.5;

        // Core cyan pixel
        ctx.fillStyle = `rgba(234, 248, 255, ${alpha})`;
        ctx.fillRect(p.x - nodeSize / 2, p.y - nodeSize / 2, nodeSize, nodeSize);

        // Glow halo
        ctx.fillStyle = `rgba(0, 217, 255, ${alpha * 0.6})`;
        ctx.fillRect(p.x - nodeSize, p.y - nodeSize, nodeSize * 2, nodeSize * 2);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '360px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        className="pixel-art"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'grab',
        }}
      />
    </div>
  );
}
