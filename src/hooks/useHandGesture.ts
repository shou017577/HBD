import { useState, useEffect, useRef, useCallback } from 'react';
import { GestureType, HandGestureState } from '@/types/christmas';

// --- 💡 小提醒：請確保 '@/types/christmas.ts' 裡的 GestureType 有包含 'clap' ---
// 例如：export type GestureType = 'none' | 'fist' | 'open' | 'pinch' | 'pointing' | 'clap';

interface UseHandGestureOptions {
  enabled: boolean;
  onGestureChange?: (gesture: GestureType | 'clap') => void;
}

export function useHandGesture({ enabled, onGestureChange }: UseHandGestureOptions) {
  const [state, setState] = useState<HandGestureState>({
    gesture: 'none',
    handPosition: null,
    pinchDistance: 1,
    isTracking: false,
  });
  const [status, setStatus] = useState<string>('idle');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handsRef = useRef<any>(null);
  const lastGestureRef = useRef<GestureType | 'clap'>('none');
  
  // 記錄上一次擊掌的時間，避免連續觸發 (Cooldown)
  const lastClapTimeRef = useRef<number>(0);

  const onGestureChangeRef = useRef(onGestureChange);
  onGestureChangeRef.current = onGestureChange;

  const calculateFingerDistance = useCallback((landmarks: any[], finger1: number, finger2: number) => {
    const p1 = landmarks[finger1];
    const p2 = landmarks[finger2];
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) +
      Math.pow(p1.y - p2.y, 2) +
      Math.pow(p1.z - p2.z, 2)
    );
  }, []);

  // 計算兩手掌心距離的函式
  const calculateHandsDistance = useCallback((hand1Landmarks: any[], hand2Landmarks: any[]) => {
    // 節點 9 通常代表掌心 (Middle Finger MCP)
    const p1 = hand1Landmarks[9];
    const p2 = hand2Landmarks[9];
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) +
      Math.pow(p1.y - p2.y, 2) +
      Math.pow(p1.z - p2.z, 2)
    );
  }, []);

  const detectGesture = useCallback((landmarks: any[]): GestureType => {
    if (!landmarks || landmarks.length < 21) return 'none';

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
   
    const indexMcp = landmarks[5];
    const middleMcp = landmarks[9];
    const ringMcp = landmarks[13];
    const pinkyMcp = landmarks[17];

    const pinchDist = calculateFingerDistance(landmarks, 4, 8);
    if (pinchDist < 0.06) {
      return 'pinch';
    }

    const indexExtended = indexTip.y < indexMcp.y;
    const middleExtended = middleTip.y < middleMcp.y;
    const ringExtended = ringTip.y < ringMcp.y;
    const pinkyExtended = pinkyTip.y < pinkyMcp.y;

    const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

    if (extendedCount >= 3) return 'open';
    if (extendedCount <= 1) return 'fist';
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) return 'pointing';

    return 'none';
  }, [calculateFingerDistance]);

  const onResults = useCallback((results: any) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      
      let finalGesture: GestureType | 'clap' = 'none';
      let handPosition = null;
      let pinchDistance = 1;

      // 檢查是否偵測到兩隻手，並判定「擊掌」
      if (results.multiHandLandmarks.length >= 2) {
        const dist = calculateHandsDistance(results.multiHandLandmarks[0], results.multiHandLandmarks[1]);
        const now = Date.now();
        
        // 距離小於 0.15 視為擊掌，且加上 1.5 秒冷卻時間防連擊
        if (dist < 0.15 && (now - lastClapTimeRef.current > 1500)) {
          finalGesture = 'clap';
          lastClapTimeRef.current = now;
        }
      }

      // 如果不是擊掌，就走原本的單手判定邏輯（以第一隻手為主）
      if (finalGesture !== 'clap') {
        const landmarks = results.multiHandLandmarks[0];
        finalGesture = detectGesture(landmarks);
        
        const palmCenter = landmarks[9];
        handPosition = {
          x: 1 - palmCenter.x,
          y: palmCenter.y,
        };
        pinchDistance = calculateFingerDistance(landmarks, 4, 8);
      } else {
        // 擊掌時，將手勢座標設在兩手之間
        const p1 = results.multiHandLandmarks[0][9];
        const p2 = results.multiHandLandmarks[1][9];
        handPosition = {
          x: 1 - ((p1.x + p2.x) / 2),
          y: (p1.y + p2.y) / 2,
        };
      }

      if (finalGesture !== lastGestureRef.current) {
        // 只有非擊掌狀態才會記錄，因為擊掌是一瞬間的事件
        if(finalGesture !== 'clap') lastGestureRef.current = finalGesture as GestureType;
        onGestureChangeRef.current?.(finalGesture);
      }

      setState({
        gesture: finalGesture as GestureType,
        handPosition,
        pinchDistance,
        isTracking: true,
      });
    } else {
      setState(prev => {
        return {
          ...prev,
          isTracking: false,
          handPosition: null,
        };
      });
    }
  }, [detectGesture, calculateFingerDistance, calculateHandsDistance]);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    let animationFrameId: number | null = null;
    let stream: MediaStream | null = null;

    const initMediaPipe = async () => {
      try {
        setStatus('loading-mediapipe');
       
        const loadScript = (src: string, timeout = 10000): Promise<void> => {
          return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
              resolve();
              return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.crossOrigin = 'anonymous';
           
            const timeoutId = setTimeout(() => { reject(new Error('Script load timeout')); }, timeout);
           
            script.onload = () => { clearTimeout(timeoutId); resolve(); };
            script.onerror = () => { clearTimeout(timeoutId); reject(new Error('Script load failed')); };
            document.head.appendChild(script);
          });
        };

        const cdnSources = [
          'https://fastly.jsdelivr.net/npm/@mediapipe/hands/hands.js',
          'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
          'https://unpkg.com/@mediapipe/hands/hands.js',
        ];
       
        let loaded = false;
        let successfulCdn = 'cdn.jsdelivr.net';
        for (const src of cdnSources) {
          if (!mounted) return;
          try {
            await loadScript(src, 12000);
            loaded = true;
            const match = src.match(/https:\/\/([^/]+)/);
            if (match) successfulCdn = match[1];
            break;
          } catch (e) {
            console.warn('[Gesture] Failed to load from:', src, e);
          }
        }

        if (!loaded) throw new Error('無法載入手勢庫');
        (window as any).__mediapipeCdn = successfulCdn;
        if (!mounted) return;

        const Hands = (window as any).Hands;
        if (!Hands) throw new Error('MediaPipe Hands not loaded');

        setStatus('requesting-camera');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia not supported');
        }

        const isAndroid = /Android/i.test(navigator.userAgent);
        const constraints = {
          video: isAndroid
            ? { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }
            : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        };
       
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (camError) {
          throw new Error('Camera access failed');
        }

        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

        const video = document.createElement('video');
        video.style.display = 'none';
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('autoplay', 'true');
        video.setAttribute('muted', 'true');
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        document.body.appendChild(video);
        videoRef.current = video;
       
        try { await video.play(); } catch (playError) {}
       
        let retries = 0;
        const maxRetries = isAndroid ? 50 : 30;
        while ((video.videoWidth === 0 || video.videoHeight === 0) && retries < maxRetries) {
          await new Promise(r => setTimeout(r, 100));
          retries++;
        }
       
        setStatus('initializing-hands');
        if (video.videoWidth === 0 || video.videoHeight === 0) throw new Error('Video stream has no dimensions');

        const cdnHost = (window as any).__mediapipeCdn || 'cdn.jsdelivr.net';
        const modelCdnBase = `https://${cdnHost}/npm/@mediapipe/hands`;
       
        const hands = new Hands({
          locateFile: (file: string) => `${modelCdnBase}/${file}`,
        });

        // 🌟 關鍵修改：將 maxNumHands 設為 2，這樣才能偵測雙手擊掌
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: isAndroid ? 0 : 1,
          minDetectionConfidence: isAndroid ? 0.6 : 0.5,
          minTrackingConfidence: isAndroid ? 0.4 : 0.3,
        });

        hands.onResults(onResults);
        handsRef.current = hands;
        setStatus('processing-frames');

        let lastTime = 0;
        const processFrame = async (currentTime: number) => {
          if (!mounted || !handsRef.current || !videoRef.current) return;
          if (currentTime - lastTime > 33) {
            lastTime = currentTime;
            try {
              if (videoRef.current.readyState >= 2) {
                await handsRef.current.send({ image: videoRef.current });
              }
            } catch (e) {}
          }
          animationFrameId = requestAnimationFrame(processFrame);
        };
        animationFrameId = requestAnimationFrame(processFrame);

      } catch (error) {
        setStatus('error: ' + (error as Error).message);
        setState(prev => ({ ...prev, isTracking: false }));
      }
    };

    initMediaPipe();

    return () => {
      mounted = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.remove();
        videoRef.current = null;
      }
      handsRef.current = null;
    };
  }, [enabled, onResults]);

  return { ...state, status };
}
