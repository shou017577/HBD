import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onLoaded: () => void;
  progress: number;
}

export function LoadingScreen({ onLoaded, progress }: LoadingScreenProps) {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(onLoaded, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, onLoaded]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#0a1628] via-[#1a0a28] to-[#0a1628]">
      {/* Animated Heart Icon */}
      {/* 动画爱心图标 */}
      <div className="relative mb-8">
        <div className="text-8xl animate-pulse">💖</div>
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-3xl animate-bounce">❤️</div>
      </div>

      {/* Loading Text */}
      {/* 加载文字 */}
      <h2 className="text-2xl font-bold text-white mb-4">
        粉紅愛心加載中{dots}
      </h2>

      {/* Progress Bar */}
      {/* 進度條 */}
      <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-[#FFB6C1] via-[#FF69B4] to-[#FFB6C1] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Progress Percentage */}
      <p className="text-white/60 text-sm">
        {Math.round(progress)}%
      </p>
      
      {/* Loading Tips */}
      <p className="text-white/40 text-xs mt-8 max-w-xs text-center">
        {progress < 30 && '正在初始化3D場景...'}
        {progress >= 30 && progress < 60 && '正在生成粒子效果...'}
        {progress >= 60 && progress < 90 && '正在準備裝飾物...'}
        {progress >= 90 && '即將完成...'}
      </p>
    </div>
  );
}
