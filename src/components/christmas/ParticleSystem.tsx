import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { TreeState } from '@/types/christmas';

interface ParticleSystemProps {
  state: TreeState;
  particleCount?: number;
}

// Generate heart-shaped positions (3D heart shape for love theme)
// 使用 Fibonacci 球面变形算法创建心形
function generateHeartPosition(index: number, total: number): [number, number, number] {
  // 1. Fibonacci 球面分布 - 均匀分布点在球面上
  const phi = Math.acos(1 - 2 * (index + 0.5) / total);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  
  // 2. 球面坐标转笛卡尔坐标
  let ux = Math.sin(phi) * Math.cos(theta);
  let uy = Math.sin(phi) * Math.sin(theta);
  let uz = Math.cos(phi);
  
  // 3. 变形逻辑 - 将球体变形为心形
  uz *= 0.4; // 压扁 Z 轴,创造心形的厚度
  const r = Math.sqrt(ux * ux + uz * uz); // XZ 平面的径向距离
  let vy = uy + (r * -0.6); // 创建心形的中央凹陷
  
  // 条件缩放以塑造心形的顶部和底部
  if (vy < 0) vy *= 1.2; // 尖锐的底部尖端
  if (vy > 0) vy *= 1.1; // 圆润的顶部凸起
  
  // 4. 缩放到合适大小
  const scale = 3.33; // 心形整体大小 (已放大 1/3)
  let x = ux * scale * 1.5; // X 轴稍微拉伸
  let y = vy * scale;
  let z = uz * scale;
  
  // 5. 位置调整
  y += 1.0; // 向上移动心形中心
  y = -y;   // 翻转 Y 轴使心形正立
  
  // 6. 添加微小随机偏移，使排布更自然
  // 使用基于 index 的伪随机，确保每次渲染结果一致
  const randomSeed = (index * 12345 + 67890) % 10000;
  const randomOffsetScale = 0.08; // 偏移大小（相对于心形大小的 8%）
  
  x += (((randomSeed * 7) % 1000) / 1000 - 0.5) * 2 * randomOffsetScale;
  y += (((randomSeed * 13) % 1000) / 1000 - 0.5) * 2 * randomOffsetScale;
  z += (((randomSeed * 17) % 1000) / 1000 - 0.5) * 2 * randomOffsetScale;
  
  return [x, y, z];
}

// Generate galaxy positions
function generateGalaxyPosition(): [number, number, number] {
  const radius = 5 + Math.random() * 10;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta) * 0.5,
    radius * Math.cos(phi),
  ];
}

// Generate ornament positions on the heart
// 使用与主心形相同的算法,但只选择表面点
function generateOrnamentPosition(index: number, total: number): [number, number, number] {
  // 使用与 generateHeartPosition 相同的算法
  const phi = Math.acos(1 - 2 * (index + 0.5) / total);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  
  let ux = Math.sin(phi) * Math.cos(theta);
  let uy = Math.sin(phi) * Math.sin(theta);
  let uz = Math.cos(phi);
  
  uz *= 0.4;
  const r = Math.sqrt(ux * ux + uz * uz);
  let vy = uy + (r * -0.6);
  
  if (vy < 0) vy *= 1.2;
  if (vy > 0) vy *= 1.1;
  
  // 装饰品稍微小一点,在心形表面内侧
  const scale = 3.06; // 比主心形稍微小一点 (3.33 * 0.92)
  let x = ux * scale * 1.5;
  let y = vy * scale;
  let z = uz * scale;
  
  y += 1.0;
  y = -y;
  
  return [x, y, z];
}

// Generate ribbon/garland spiral positions on heart
// 使用旋转变换在心形表面创建螺旋效果
function generateRibbonPosition(index: number, total: number): [number, number, number] {
  const t = index / total;
  
  // 基于心形算法,但添加螺旋旋转
  // 使用时间参数 t 创建统一的分布
  const spiralRotations = 4; // 4 圈螺旋
  const spiralAngle = t * Math.PI * 2 * spiralRotations;
  
  // 使用统一的 phi 分布沿着心形表面
  const phi = Math.acos(1 - 2 * t);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index + spiralAngle;
  
  let ux = Math.sin(phi) * Math.cos(theta);
  let uy = Math.sin(phi) * Math.sin(theta);
  let uz = Math.cos(phi);
  
  uz *= 0.4;
  const r = Math.sqrt(ux * ux + uz * uz);
  let vy = uy + (r * -0.6);
  
  if (vy < 0) vy *= 1.2;
  if (vy > 0) vy *= 1.1;
  
  // 丝带在心形表面上
  const scale = 3.2; // 略小于主心形 (3.33 * 0.96)
  let x = ux * scale * 1.5;
  let y = vy * scale;
  let z = uz * scale;
  
  y += 1.0;
  y = -y;
  
  return [x, y, z];
}

// Main tree particles using THREE.Points for maximum performance
export function ParticleSystem({ state, particleCount = 15000 }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);
  const transitionRef = useRef({ progress: 0 });
  
  // Pre-compute all particle data
  const { positions, colors, particleData } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const data: Array<{
      treePos: [number, number, number];
      galaxyPos: [number, number, number];
      phase: number;
      speed: number;
      delay: number;
      size: number;
    }> = [];
    
    for (let i = 0; i < particleCount; i++) {
      const heartPos = generateHeartPosition(i, particleCount);
      const galaxyPos = generateGalaxyPosition();

      // Set initial positions
      positions[i * 3] = heartPos[0];
      positions[i * 3 + 1] = heartPos[1];
      positions[i * 3 + 2] = heartPos[2];

      // 爱心主题：70% 红色/粉色，30% 白色闪光
      const colorRand = Math.random();
      if (colorRand < 0.7) {
        // 红色到粉色渐变
        const hue = 0.95 + Math.random() * 0.08; // 红色到粉色范围 (340-360度)
        const saturation = 0.7 + Math.random() * 0.3;
        const lightness = 0.35 + Math.random() * 0.3; // 偏亮的红粉色
        const color = new THREE.Color().setHSL(hue, saturation, lightness);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      } else {
        // 白色闪光粒子
        colors[i * 3] = 0.95;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 0.95;
      }

      data.push({
        treePos: heartPos,
        galaxyPos,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        delay: Math.random(),
        size: 2 + Math.random() * 3,
      });
    }
    
    return { positions, colors, particleData: data };
  }, [particleCount]);

  // Track if transition is active
  const isTransitioningRef = useRef(false);
  const lastProgressRef = useRef(0);

  // Single GSAP tween for transition
  useEffect(() => {
    isTransitioningRef.current = true;
    gsap.to(transitionRef.current, {
      progress: state === 'tree' ? 0 : 1,
      duration: 1.8,
      ease: 'power2.inOut',
      onComplete: () => {
        isTransitioningRef.current = false;
      },
    });
  }, [state]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    
    const progress = transitionRef.current.progress;
    
    // Skip heavy computation if not transitioning and progress hasn't changed
    // Only update every 3rd frame for breathing animation when idle
    const isIdle = !isTransitioningRef.current && Math.abs(progress - lastProgressRef.current) < 0.001;
    lastProgressRef.current = progress;
    
    timeRef.current += delta;
    
    // When idle, only update breathing animation every few frames
    if (isIdle && Math.floor(timeRef.current * 30) % 3 !== 0) return;
    
    const positionAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positionAttr.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      const p = particleData[i];
      
      // Staggered smoothstep transition
      const staggered = Math.max(0, Math.min(1, progress * 1.5 - p.delay * 0.5));
      const smooth = staggered * staggered * (3 - 2 * staggered);
      
      // Interpolate position
      const x = p.treePos[0] + (p.galaxyPos[0] - p.treePos[0]) * smooth;
      const y = p.treePos[1] + (p.galaxyPos[1] - p.treePos[1]) * smooth;
      const z = p.treePos[2] + (p.galaxyPos[2] - p.treePos[2]) * smooth;
      
      // Subtle breathing - only when idle for performance
      const breathe = Math.sin(timeRef.current * p.speed + p.phase) * 0.02;
      
      posArray[i * 3] = x;
      posArray[i * 3 + 1] = y + breathe;
      posArray[i * 3 + 2] = z;
    }
    
    positionAttr.needsUpdate = true;
  });

  // Create sizes array for variable particle sizes
  const sizes = useMemo(() => {
    const arr = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      arr[i] = particleData[i].size;
    }
    return arr;
  }, [particleCount, particleData]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
}

// Christmas gift boxes (replacing ornament balls) - OPTIMIZED
export function GiftBoxes({ state }: { state: TreeState }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const ribbonRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorsSetRef = useRef({ box: false, ribbon: false });
  const transitionRef = useRef({ progress: 0 });
  const giftCount = 15;
  
  const giftData = useMemo(() => {
    const giftStyles = [
      { box: '#FF1744', ribbon: '#FFD700' },  // 深粉红 + 金色丝带
      { box: '#F50057', ribbon: '#FFFFFF' },  // 粉红 + 白色丝带
      { box: '#E91E63', ribbon: '#FFD700' },  // 玫红 + 金色丝带
      { box: '#FF4081', ribbon: '#FFFFFF' },  // 浅粉红 + 白色丝带
    ];
    
    return Array.from({ length: giftCount }, (_, i) => {
      const style = giftStyles[i % giftStyles.length];
      return {
        treePosition: generateOrnamentPosition(i, giftCount),
        galaxyPosition: generateGalaxyPosition(),
        color: new THREE.Color(style.box),
        ribbonColor: new THREE.Color(style.ribbon),
        scale: 0.22 + Math.random() * 0.1,
        rotation: Math.random() * Math.PI * 2,
        delay: Math.random(),
      };
    });
  }, []);

  const isTransitioningRef = useRef(false);
  const lastProgressRef = useRef(0);

  useEffect(() => {
    isTransitioningRef.current = true;
    gsap.to(transitionRef.current, {
      progress: state === 'tree' ? 0 : 1,
      duration: 1.5,
      ease: 'power2.inOut',
      onComplete: () => { isTransitioningRef.current = false; },
    });
  }, [state]);

  useEffect(() => {
    if (meshRef.current && !colorsSetRef.current.box) {
      giftData.forEach((g, i) => meshRef.current!.setColorAt(i, g.color));
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
      colorsSetRef.current.box = true;
    }
    if (ribbonRef.current && !colorsSetRef.current.ribbon) {
      giftData.forEach((g, i) => ribbonRef.current!.setColorAt(i, g.ribbonColor));
      if (ribbonRef.current.instanceColor) ribbonRef.current.instanceColor.needsUpdate = true;
      colorsSetRef.current.ribbon = true;
    }
  }, [giftData]);

  useFrame(() => {
    if (!meshRef.current || !ribbonRef.current) return;
    
    const progress = transitionRef.current.progress;
    
    if (!isTransitioningRef.current && Math.abs(progress - lastProgressRef.current) < 0.001) return;
    lastProgressRef.current = progress;
    
    giftData.forEach((gift, i) => {
      const p = Math.max(0, Math.min(1, progress * 1.3 - gift.delay * 0.3));
      const smooth = p * p * (3 - 2 * p);
      
      const x = gift.treePosition[0] + (gift.galaxyPosition[0] - gift.treePosition[0]) * smooth;
      const y = gift.treePosition[1] + (gift.galaxyPosition[1] - gift.treePosition[1]) * smooth;
      const z = gift.treePosition[2] + (gift.galaxyPosition[2] - gift.treePosition[2]) * smooth;
      
      // Gift box
      dummy.position.set(x, y, z);
      dummy.rotation.y = gift.rotation;
      dummy.scale.setScalar(gift.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      
      // Ribbon cross on top
      dummy.scale.set(gift.scale * 0.3, gift.scale * 1.1, gift.scale * 1.1);
      dummy.updateMatrix();
      ribbonRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    ribbonRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {/* Gift boxes */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, giftCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {/* Gold ribbons */}
      <instancedMesh ref={ribbonRef} args={[undefined, undefined, giftCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#FFD700" toneMapped={false} />
      </instancedMesh>
    </>
  );
}

// Gem-like cubes and icosahedrons (high reflective) - OPTIMIZED
export function GemOrnaments({ state }: { state: TreeState }) {
  const cubeRef = useRef<THREE.InstancedMesh>(null);
  const icoRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const colorsSetRef = useRef({ cube: false, ico: false });
  const transitionRef = useRef({ progress: 0 });
  const cubeCount = 25;
  const icoCount = 20;
  
  const cubeData = useMemo(() => {
    return Array.from({ length: cubeCount }, (_, i) => {
      // 粉红色和金色宝石
      const hue = Math.random() > 0.5 ? 0.95 + Math.random() * 0.05 : 0.13; // 粉红或金色
      return {
        treePosition: generateOrnamentPosition(i, cubeCount),
        galaxyPosition: generateGalaxyPosition(),
        color: new THREE.Color().setHSL(hue, hue > 0.5 ? 0.7 : 0.8, 0.6 + Math.random() * 0.2),
        scale: 0.05 + Math.random() * 0.04,
        rotSpeed: 0.3 + Math.random() * 0.5,
        delay: Math.random(),
      };
    });
  }, []);

  const icoData = useMemo(() => {
    return Array.from({ length: icoCount }, (_, i) => {
      // 粉红色和玫瑰金宝石
      const hue = Math.random() > 0.5 ? 0.96 + Math.random() * 0.03 : 0.05;
      return {
        treePosition: generateOrnamentPosition(i + cubeCount, icoCount + cubeCount),
        galaxyPosition: generateGalaxyPosition(),
        color: new THREE.Color().setHSL(hue, hue > 0.5 ? 0.75 : 0.6, 0.65 + Math.random() * 0.2),
        scale: 0.06 + Math.random() * 0.05,
        rotSpeed: 0.2 + Math.random() * 0.4,
        delay: Math.random(),
      };
    });
  }, []);

  const isTransitioningRef = useRef(false);
  const lastProgressRef = useRef(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    isTransitioningRef.current = true;
    gsap.to(transitionRef.current, { 
      progress: state === 'tree' ? 0 : 1, 
      duration: 1.5, 
      ease: 'power2.inOut',
      onComplete: () => { isTransitioningRef.current = false; },
    });
  }, [state]);

  // Set colors once
  useEffect(() => {
    if (cubeRef.current && !colorsSetRef.current.cube) {
      cubeData.forEach((c, i) => cubeRef.current!.setColorAt(i, c.color));
      if (cubeRef.current.instanceColor) cubeRef.current.instanceColor.needsUpdate = true;
      colorsSetRef.current.cube = true;
    }
    if (icoRef.current && !colorsSetRef.current.ico) {
      icoData.forEach((c, i) => icoRef.current!.setColorAt(i, c.color));
      if (icoRef.current.instanceColor) icoRef.current.instanceColor.needsUpdate = true;
      colorsSetRef.current.ico = true;
    }
  }, [cubeData, icoData]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    frameCountRef.current++;
    
    const progress = transitionRef.current.progress;
    const isIdle = !isTransitioningRef.current && Math.abs(progress - lastProgressRef.current) < 0.001;
    lastProgressRef.current = progress;
    
    // When idle, only update rotation every 2nd frame
    if (isIdle && frameCountRef.current % 2 !== 0) return;
    
    if (cubeRef.current) {
      cubeData.forEach((cube, i) => {
        const p = Math.max(0, Math.min(1, progress * 1.3 - cube.delay * 0.3));
        const smooth = p * p * (3 - 2 * p);
        
        dummy.position.set(
          cube.treePosition[0] + (cube.galaxyPosition[0] - cube.treePosition[0]) * smooth,
          cube.treePosition[1] + (cube.galaxyPosition[1] - cube.treePosition[1]) * smooth,
          cube.treePosition[2] + (cube.galaxyPosition[2] - cube.treePosition[2]) * smooth
        );
        dummy.rotation.x = timeRef.current * cube.rotSpeed;
        dummy.rotation.y = timeRef.current * cube.rotSpeed * 1.3;
        dummy.scale.setScalar(cube.scale);
        dummy.updateMatrix();
        cubeRef.current!.setMatrixAt(i, dummy.matrix);
      });
      cubeRef.current.instanceMatrix.needsUpdate = true;
    }
    
    if (icoRef.current) {
      icoData.forEach((ico, i) => {
        const p = Math.max(0, Math.min(1, progress * 1.3 - ico.delay * 0.3));
        const smooth = p * p * (3 - 2 * p);
        
        dummy.position.set(
          ico.treePosition[0] + (ico.galaxyPosition[0] - ico.treePosition[0]) * smooth,
          ico.treePosition[1] + (ico.galaxyPosition[1] - ico.treePosition[1]) * smooth,
          ico.treePosition[2] + (ico.galaxyPosition[2] - ico.treePosition[2]) * smooth
        );
        dummy.rotation.x = timeRef.current * ico.rotSpeed * 0.7;
        dummy.rotation.z = timeRef.current * ico.rotSpeed;
        dummy.scale.setScalar(ico.scale);
        dummy.updateMatrix();
        icoRef.current!.setMatrixAt(i, dummy.matrix);
      });
      icoRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={cubeRef} args={[undefined, undefined, cubeCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#f8f8ff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={icoRef} args={[undefined, undefined, icoCount]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#f8f8ff" toneMapped={false} />
      </instancedMesh>
    </>
  );
}

// Heart surface ribbon decoration (replacing tree spiral) - OPTIMIZED
// 心形表面丝带装饰（替换圣诞树螺旋灯带）
export function TetrahedronSpiral({ state }: { state: TreeState }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const colorsSetRef = useRef(false);
  const transitionRef = useRef({ progress: 0 });
  const tetraCount = 180;
  const pinkColor = useMemo(() => new THREE.Color('#FFB6C1'), []); // 浅粉色
  
  const tetraData = useMemo(() => {
    return Array.from({ length: tetraCount }, (_, i) => {
      // 使用心形螺旋路径替代圆锥螺旋
      const heartPos = generateRibbonPosition(i, tetraCount);
      
      return {
        treePosition: heartPos,
        galaxyPosition: generateGalaxyPosition(),
        angle: (i / tetraCount) * Math.PI * 8, // 螺旋角度
        delay: i / tetraCount, // Sequential delay based on position
      };
    });
  }, []);

  const isTransitioningRef = useRef(false);
  const lastProgressRef = useRef(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    isTransitioningRef.current = true;
    gsap.to(transitionRef.current, { 
      progress: state === 'tree' ? 0 : 1, 
      duration: 1.5, 
      ease: 'power2.inOut',
      onComplete: () => { isTransitioningRef.current = false; },
    });
  }, [state]);

  // Set colors once
  useEffect(() => {
    if (!meshRef.current || colorsSetRef.current) return;
    tetraData.forEach((_, i) => meshRef.current!.setColorAt(i, pinkColor));
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    colorsSetRef.current = true;
  }, [tetraData, pinkColor]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta;
    frameCountRef.current++;
    
    const progress = transitionRef.current.progress;
    const isIdle = !isTransitioningRef.current && Math.abs(progress - lastProgressRef.current) < 0.001;
    lastProgressRef.current = progress;
    
    // When idle, only update rotation every 2nd frame
    if (isIdle && frameCountRef.current % 2 !== 0) return;
    
    tetraData.forEach((tetra, i) => {
      // Wave effect: particles at top transition earlier
      const p = Math.max(0, Math.min(1, progress * 1.5 - tetra.delay * 0.5));
      const smooth = p * p * (3 - 2 * p);
      
      dummy.position.set(
        tetra.treePosition[0] + (tetra.galaxyPosition[0] - tetra.treePosition[0]) * smooth,
        tetra.treePosition[1] + (tetra.galaxyPosition[1] - tetra.treePosition[1]) * smooth,
        tetra.treePosition[2] + (tetra.galaxyPosition[2] - tetra.treePosition[2]) * smooth
      );
      dummy.rotation.y = tetra.angle + timeRef.current * 0.2;
      dummy.rotation.x = Math.PI * 0.15;
      dummy.rotation.z = tetra.angle * 0.5;
      dummy.scale.setScalar(0.06);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, tetraCount]}>
      <tetrahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#FF69B4" toneMapped={false} /> {/* 粉红色 */}
    </instancedMesh>
  );
}
