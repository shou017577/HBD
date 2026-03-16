import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '@/types/christmas';

const generatePlaceholder = (index: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradients = [
      ['#c41e3a', '#8b0000'], ['#228b22', '#006400'], ['#ffd700', '#daa520'],
      ['#1e90ff', '#0066cc'], ['#ff69b4', '#ff1493'], ['#9932cc', '#663399'],
    ];
    const [color1, color2] = gradients[index % gradients.length];
    const gradient = ctx.createLinearGradient(0, 0, 400, 400);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 400);
    const emojis = ['🎂', '⭐', '🎁', '🎈', '💖', '🥳'];
    ctx.font = '120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emojis[index % emojis.length], 200, 200);
  }
  return canvas.toDataURL('image/png');
};

let cachedPlaceholders: string[] | null = null;
const getDefaultPhotos = (): string[] => {
  if (!cachedPlaceholders) {
    cachedPlaceholders = Array.from({ length: 12 }, (_, i) => generatePlaceholder(i));
  }
  return cachedPlaceholders;
};

const blessings = [
  "一家人就是要整整齊齊\n雖然小狗那個表情不知道是啥小",
  "小波散發滿滿的母愛＋貪吃小狗",
  "誒嘿嘿/n以後可不可以好好拍照\n不知道",
  "你知道 我知道 獨眼龍也知道",
  "必須要偷圖一下吧",
  "必須送你進去看權老虎！\n小狗又是各種亂入生日卡片",
  "偷圖再＋1",
  "原來香港已經是一年前的事了...",
  "神秘角度\n突然發現我們變成一個8️⃣",
  "等下可以出發去找你的生日禮物了！！！",
  "永生花終於換個樣式了\n使用次數：無限次",
  "Happy Birthday to you！"
];

const generateDynamicBackTexture = (index: number): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // 1. 維持原本的柔和粉色底色（如果你想改成純白，可以把 '#FFE4E1' 改成 '#FFFFFF'）
    ctx.fillStyle = '#FFE4E1'; 
    ctx.fillRect(0, 0, 400, 500);

    // 🌟 已將外框的程式碼 (strokeStyle, lineWidth, strokeRect) 刪除！

    // 2. 將文字顏色改為黑色 (這裡我用 '#222222'，是一種極深的碳黑色，在螢幕上看比純黑死白更有質感)
    ctx.fillStyle = '#222222';
    
    // 3. 字體大小小一號：從 34px 縮小為 28px
    ctx.font = 'bold 28px "PingFang TC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const text = blessings[index % blessings.length];
    const lines = text.split('\n');
    
    // 🌟 配合變小的字體，我稍微微調了行距 (Y軸座標)，讓兩行字靠得近一點，視覺更置中
    if (lines.length === 2) {
      ctx.fillText(lines[0], 200, 225);
      ctx.fillText(lines[1], 200, 275);
    } else {
      ctx.fillText(text, 200, 250);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const backTextures = Array.from({ length: 12 }, (_, i) => generateDynamicBackTexture(i));

interface PhotoCardsProps {
  state: TreeState;
  photos?: string[];
  focusedIndex: number | null;
  isFlipped?: boolean; 
}

function generateTreePhotoPosition(index: number, total: number): [number, number, number] {
  const height = 7;
  const maxRadius = 2.8;
  const t = (index + 0.5) / total;
  const y = t * height - height / 2 + 0.5;
  const radius = maxRadius * (1 - t * 0.85);
  const angle = t * Math.PI * 10 + index * Math.PI * 0.5;
  return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
}

function generateGalaxyPhotoPosition(): [number, number, number] {
  const radius = 4 + Math.random() * 6;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta) * 0.5,
    radius * Math.cos(phi),
  ];
}

const SPRING_STIFFNESS = 25;
const SPRING_DAMPING = 8;
const SCALE_STIFFNESS = 30;
const SCALE_DAMPING = 10;
const ROTATION_STIFFNESS = 20; 

const cardWidth = 1;
const cardHeight = 1.25;
const photoWidth = 0.94;
const photoHeight = 1.15;
const borderRadius = 0.03;
const photoOffsetY = 0.02; 

const cardGeometry = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(-cardWidth/2 + borderRadius, -cardHeight/2);
  shape.lineTo(cardWidth/2 - borderRadius, -cardHeight/2);
  shape.quadraticCurveTo(cardWidth/2, -cardHeight/2, cardWidth/2, -cardHeight/2 + borderRadius);
  shape.lineTo(cardWidth/2, cardHeight/2 - borderRadius);
  shape.quadraticCurveTo(cardWidth/2, cardHeight/2, cardWidth/2 - borderRadius, cardHeight/2);
  shape.lineTo(-cardWidth/2 + borderRadius, cardHeight/2);
  shape.quadraticCurveTo(-cardWidth/2, cardHeight/2, -cardWidth/2, cardHeight/2 - borderRadius);
  shape.lineTo(-cardWidth/2, -cardHeight/2 + borderRadius);
  shape.quadraticCurveTo(-cardWidth/2, -cardHeight/2, -cardWidth/2 + borderRadius, -cardHeight/2);
  return new THREE.ShapeGeometry(shape);
})();

const photoGeometry = new THREE.PlaneGeometry(photoWidth, photoHeight);
const cardMaterial = new THREE.MeshBasicMaterial({
  color: '#ffffff',
  side: THREE.DoubleSide,
  toneMapped: true,
});

interface CardData {
  treePosition: [number, number, number];
  galaxyPosition: [number, number, number];
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  scale: number;
  scaleVelocity: number;
  rotationY: number;        
  rotationVelocity: number; 
  texture: THREE.Texture | null;
  textureUrl: string;
  time: number;
}

export function PhotoCards({ state, photos, focusedIndex, isFlipped = false }: PhotoCardsProps) {
  const photoUrls = photos && photos.length > 0 ? photos : getDefaultPhotos();
  const meshRefs = useRef<(THREE.Group | null)[]>([]);
  const { camera } = useThree();
  const cardDataRef = useRef<CardData[]>([]);
  
  const photoData = useMemo(() => {
    return photoUrls.slice(0, 12).map((url, i) => ({
      url,
      treePosition: generateTreePhotoPosition(i, Math.min(photoUrls.length, 12)),
      galaxyPosition: generateGalaxyPhotoPosition(),
    }));
  }, [photoUrls]);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    
    cardDataRef.current = photoData.map((photo, i) => {
      const existing = cardDataRef.current[i];
      const urlChanged = existing?.textureUrl !== photo.url;
      
      const initialScale = i === 11 ? 0.8 : 0.4;
      
      const data: CardData = {
        treePosition: photo.treePosition,
        galaxyPosition: photo.galaxyPosition,
        position: existing?.position || new THREE.Vector3(...photo.treePosition),
        velocity: existing?.velocity || new THREE.Vector3(0, 0, 0),
        scale: existing?.scale || initialScale,
        scaleVelocity: existing?.scaleVelocity || 0,
        rotationY: existing?.rotationY || 0,
        rotationVelocity: existing?.rotationVelocity || 0,
        texture: urlChanged ? null : (existing?.texture || null),
        textureUrl: photo.url,
        time: existing?.time || Math.random() * Math.PI * 2,
      };
      
      if (!data.texture) {
        loader.load(photo.url, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          if (cardDataRef.current[i]) {
            cardDataRef.current[i].texture = tex;
            cardDataRef.current[i].textureUrl = photo.url;
          }
        });
      }
      return data;
    });
  }, [photoData]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.033);
    const hasFocus = focusedIndex !== null;
    
    for (let i = 0; i < cardDataRef.current.length; i++) {
      const card = cardDataRef.current[i];
      const meshGroup = meshRefs.current[i];
      if (!meshGroup || !card) continue;
      
      card.time += dt;
      const isFocused = focusedIndex === i;
      
      const targetPos = isFocused ? new THREE.Vector3(0, 0, 0.08) : new THREE.Vector3(...(state === 'tree' ? card.treePosition : card.galaxyPosition));
      
      const isSpecialPhoto = i === 11;
      
      // 🌟 分別設定「背景平時大小」與「捏合聚焦大小」
      const baseScale = isSpecialPhoto ? 0.8 : 0.4;
      const focusedScale = isSpecialPhoto ? 12.0 : 8.5; // <--- 第 12 張放大到 12.0 倍！
      
      const targetScale = hasFocus 
        ? (isFocused ? focusedScale : 0) // 如果被聚焦，就套用對應的放大倍率
        : baseScale;
        
      const targetRotationY = (isFocused && isFlipped) ? Math.PI : 0;
      
      // 位置彈簧
      const displacement = card.position.clone().sub(targetPos);
      card.velocity.add(displacement.multiplyScalar(-SPRING_STIFFNESS).add(card.velocity.clone().multiplyScalar(-SPRING_DAMPING)).multiplyScalar(dt));
      card.position.add(card.velocity.clone().multiplyScalar(dt));
      
      // 縮放彈簧
      card.scaleVelocity += (-SCALE_STIFFNESS * (card.scale - targetScale) - SCALE_DAMPING * card.scaleVelocity) * dt;
      card.scale += card.scaleVelocity * dt;

      // 旋轉彈簧
      card.rotationVelocity += (-ROTATION_STIFFNESS * (card.rotationY - targetRotationY) - SCALE_DAMPING * card.rotationVelocity) * dt;
      card.rotationY += card.rotationVelocity * dt;
      
      meshGroup.position.copy(card.position);
      if (!isFocused) meshGroup.position.y += Math.sin(card.time * 0.5) * 0.005;
      
      const renderScale = Math.max(0, card.scale);
      meshGroup.visible = renderScale > 0.05;
      meshGroup.scale.set(renderScale, renderScale, 1);
      meshGroup.lookAt(camera.position);
      meshGroup.rotateY(card.rotationY);
    }
  });

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(n => n + 1);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <group>
      {photoData.map((photo, i) => {
        const initialScale = i === 11 ? 0.8 : 0.4;
        
        return (
          <group 
            key={i} 
            ref={el => { meshRefs.current[i] = el; }}
            scale={[initialScale, initialScale, 1]}
          >
            <mesh geometry={cardGeometry} position={[0, 0, -0.002]} material={cardMaterial} />
            {cardDataRef.current[i]?.texture && (
              <mesh geometry={photoGeometry} position={[0, photoOffsetY, 0.001]}>
                <meshBasicMaterial map={cardDataRef.current[i].texture} side={THREE.FrontSide} />
              </mesh>
            )}
            <mesh geometry={photoGeometry} position={[0, photoOffsetY, -0.003]} rotation={[0, Math.PI, 0]}>
              <meshBasicMaterial map={backTextures[i % 12]} side={THREE.FrontSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}