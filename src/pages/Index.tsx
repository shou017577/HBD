import { useState, useCallback, useEffect, lazy, Suspense, useRef } from 'react';
import { GestureIndicator } from '@/components/christmas/GestureIndicator';
import { AudioControl } from '@/components/christmas/AudioControl';
import { PhotoUpload } from '@/components/christmas/PhotoUpload';
import { InstructionsOverlay } from '@/components/christmas/InstructionsOverlay';
import { CameraDebug } from '@/components/christmas/CameraDebug';
import { LoadingScreen } from '@/components/christmas/LoadingScreen';
import { CustomTextOverlay } from '@/components/christmas/CustomTextOverlay';
import { useHandGesture } from '@/hooks/useHandGesture';
import { useMouseFallback } from '@/hooks/useMouseFallback';
import { useChristmasAudio } from '@/hooks/useChristmasAudio';
import { TreeState, GestureType } from '@/types/christmas';


// Lazy load heavy 3D scene
const ChristmasScene = lazy(() => import('@/components/christmas/Scene').then(m => ({ default: m.ChristmasScene })));

const Index = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [treeState, setTreeState] = useState<TreeState>('tree');
  const [photos, setPhotos] = useState<string[]>([
    '/photos/1.JPG',
    '/photos/2.JPG',
    '/photos/3.JPG',
    '/photos/4.JPG',
    '/photos/5.JPG',
    '/photos/6.JPG',
    '/photos/7.JPG',
    '/photos/8.PNG',
    '/photos/9.JPG',
    '/photos/10.JPG',
    '/photos/11.JPG',
  ]);
  const [focusedPhotoIndex, setFocusedPhotoIndex] = useState<number | null>(null);
  const [orbitRotation, setOrbitRotation] = useState({ x: 0, y: 0 });
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied' | 'requesting'>('prompt');
  const [showInstructions, setShowInstructions] = useState(true);
  const [customText, setCustomText] = useState('小波！生日大快樂！！！');
  const [isStarFocused, setIsStarFocused] = useState(false);
  const [isPhotoFlipped, setIsPhotoFlipped] = useState(false);
  
  // Use refs for values accessed in callbacks to prevent re-renders
  const treeStateRef = useRef(treeState);
  const photosRef = useRef(photos);
  treeStateRef.current = treeState;
  photosRef.current = photos;

  // Simulate loading progress - slower interval
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 20;
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  // Mark as loaded when scene is ready
  const handleSceneReady = useCallback(() => {
    setLoadingProgress(100);
  }, []);

  // Audio hook
  const audio = useChristmasAudio();

  const handleGestureChange = useCallback((gesture: GestureType | 'clap') => {
  const currentTreeState = treeStateRef.current;
  const currentPhotos = photosRef.current;

  switch (gesture) {
    case 'clap': // 🌟 新增：擊掌時觸發翻面
      if (currentTreeState === 'focus') {
        setIsPhotoFlipped(prev => !prev);
      }
      break;
    case 'fist':
      setTreeState('tree');
      setFocusedPhotoIndex(null);
      setIsPhotoFlipped(false); // 重置翻面
      break;
    case 'open':
      setTreeState('galaxy');
      setFocusedPhotoIndex(null);
      setIsPhotoFlipped(false); // 重置翻面
      break;
    case 'pinch':
      if (currentTreeState === 'galaxy') {
        const photoCount = currentPhotos.length > 0 ? currentPhotos.length : 12;
        const randomIndex = Math.floor(Math.random() * Math.min(photoCount, 12));
        setFocusedPhotoIndex(randomIndex);
        setTreeState('focus');
        setIsPhotoFlipped(false); // 重置翻面
      } else if (currentTreeState === 'focus') {
        setFocusedPhotoIndex(null);
        setTreeState('galaxy');
        setIsPhotoFlipped(false); // 重置翻面
      }
      break;
  }
}, []);

  // Request camera permission - actually request it now
  const handleRequestCamera = useCallback(async () => {
    console.log('[Index] Requesting camera permission...');
    setCameraPermission('requesting');
    try {
      // Actually request camera permission from the browser
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      console.log('[Index] Camera permission granted!');
      // Keep the stream alive - MediaPipe will use it
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
    } catch (error) {
      console.error('[Index] Camera permission denied:', error);
      setCameraPermission('denied');
    }
  }, []);

  // Hand gesture hook
  const handGesture = useHandGesture({
    enabled: cameraPermission === 'granted',
    onGestureChange: handleGestureChange,
  });

  // Mouse fallback hook
  const mouseFallback = useMouseFallback({
    enabled: !handGesture.isTracking,
    currentState: treeState,
    onStateChange: setTreeState,
    onOrbitChange: setOrbitRotation,
  });

  // Update orbit from hand position
  useEffect(() => {
    if (handGesture.isTracking && handGesture.handPosition && treeState === 'galaxy') {
      setOrbitRotation({
        x: (handGesture.handPosition.y - 0.5) * Math.PI * 0.5,
        y: (handGesture.handPosition.x - 0.5) * Math.PI * 2,
      });
    }
  }, [handGesture.handPosition, handGesture.isTracking, treeState]);

  const handleDismissInstructions = useCallback(() => {
    setShowInstructions(false);
    // Auto-play music after dismissing instructions
    audio.play();
  }, [audio]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Loading Screen */}
      {!isLoaded && (
        <LoadingScreen 
          progress={loadingProgress} 
          onLoaded={() => setIsLoaded(true)} 
        />
      )}

      {/* 3D Scene - Lazy loaded with Suspense */}
      <Suspense fallback={null}>
        <ChristmasScene
          state={treeState}
          photos={photos}
          focusedPhotoIndex={focusedPhotoIndex}
          orbitRotation={orbitRotation}
          handPosition={handGesture.isTracking ? handGesture.handPosition : null}
          onReady={handleSceneReady}
          onStarFocusChange={setIsStarFocused}
          isPhotoFlipped={isPhotoFlipped}
        />
      </Suspense>

      {/* UI Overlays - only show after loaded */}
      {isLoaded && (
        <>
          <GestureIndicator
            gesture={handGesture.gesture}
            isTracking={handGesture.isTracking}
            usingMouse={!handGesture.isTracking}
            cameraPermission={cameraPermission}
            mediapipeStatus={handGesture.status}
            onRequestCamera={handleRequestCamera}
          />

          <AudioControl
            isPlaying={audio.isPlaying}
            isMuted={audio.isMuted}
            onToggle={audio.toggle}
            onMuteToggle={audio.toggleMute}
          />

          <PhotoUpload
            photos={photos}
            onPhotosChange={setPhotos}
          />

          {/* Camera Debug Preview */}
          <CameraDebug enabled={cameraPermission === 'granted'} />

          {/* Instructions Overlay */}
          {showInstructions && (
            <InstructionsOverlay onDismiss={handleDismissInstructions} />
          )}

          

          {/* Custom text overlay and edit button */}
          <CustomTextOverlay
            isVisible={isStarFocused}
            text={customText}
            onTextChange={setCustomText}
          />
        </>
      )}
    </div>
  );
};

export default Index;
