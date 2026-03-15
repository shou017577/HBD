import { GestureType } from '@/types/christmas';
import { Hand, Grab, Circle, MousePointer, Camera, AlertCircle } from 'lucide-react';

interface GestureIndicatorProps {
  gesture: GestureType;
  isTracking: boolean;
  usingMouse: boolean;
  cameraPermission: 'prompt' | 'granted' | 'denied' | 'requesting';
  mediapipeStatus: string;
  onRequestCamera: () => void;
}

const gestureIcons: Record<GestureType, React.ReactNode> = {
  none: <Circle className="w-5 h-5" />,
  fist: <Grab className="w-5 h-5" />,
  open: <Hand className="w-5 h-5" />,
  pinch: <MousePointer className="w-5 h-5" />,
  pointing: <MousePointer className="w-5 h-5" />,
};

const gestureLabels: Record<GestureType, string> = {
  none: '偵測中...',
  fist: '握拳 - 愛心',
  open: '張開手掌 - 銀河',
  pinch: '捏合 - 選擇',
  pointing: '指向',
};

export function GestureIndicator({ 
  gesture, 
  isTracking, 
  usingMouse, 
  cameraPermission,
  mediapipeStatus,
  onRequestCamera 
}: GestureIndicatorProps) {
  // Show camera permission prompt
  if (cameraPermission === 'prompt' || cameraPermission === 'requesting') {
    return (
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={onRequestCamera}
          disabled={cameraPermission === 'requesting'}
          className="glass rounded-xl px-4 py-3 flex items-center gap-3 text-foreground 
            hover:scale-105 active:scale-95 transition-all duration-300
            disabled:opacity-70 disabled:cursor-wait"
        >
          <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground">
            <Camera className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-muted-foreground">
              {cameraPermission === 'requesting' ? '請允許視訊鏡頭...' : '👆 點擊啟用手勢控制'}
            </span>
            <span className="text-xs text-muted-foreground">
              {cameraPermission === 'requesting' ? '等待瀏覽器權限' : '需要鏡頭權限'}
            </span>
          </div>
        </button>
      </div>
    );
  }

  // Show denied state with reset instructions
  if (cameraPermission === 'denied') {
    return (
      <div className="absolute top-4 left-4 z-10">
        <div className="glass-gold rounded-xl px-4 py-3 flex flex-col gap-2 text-foreground max-w-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-christmas-red/30 text-christmas-red">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">鏡頭權限被拒绝</span>
              <span className="text-xs text-muted-foreground">
                使用滑鼠點擊兩下切換
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground bg-black/20 rounded-lg p-2">
            <p className="font-medium mb-1">如何重新啟動：</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>點擊網址左邊的🔒圖示</li>
              <li>將鏡頭設為"允許"</li>
              <li>重新整理網頁</li>
            </ol>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-xs bg-christmas-gold/20 hover:bg-christmas-gold/30 rounded-lg py-1.5 transition-colors"
          >
            重新整理網頁
          </button>
        </div>
      </div>
    );
  }

  // Normal gesture status display
  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
      <div className="glass-gold rounded-xl px-4 py-3 flex items-center gap-3 text-foreground">
        <div className={`
          p-2 rounded-lg 
          ${isTracking 
            ? 'bg-christmas-green/30 text-christmas-snow' 
            : 'bg-muted/50 text-muted-foreground'
          }
          transition-colors duration-300
        `}>
          {usingMouse ? <MousePointer className="w-5 h-5" /> : gestureIcons[gesture]}
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {usingMouse ? '滑鼠控制' : isTracking ? '手勢已偵測' : '等待手勢'}
          </span>
          <span className="text-sm font-medium">
            {usingMouse ? '點擊兩下切換模式' : gestureLabels[gesture]}
          </span>
        </div>
        
        {isTracking && (
          <div className="w-2 h-2 rounded-full bg-christmas-green animate-pulse ml-2" />
        )}
      </div>
      
      {/* MediaPipe Status Debug */}
      {cameraPermission === 'granted' && !isTracking && (
        <div className="glass rounded-lg px-3 py-2 text-xs text-muted-foreground">
          <span className="opacity-70">MediaPipe: </span>
          <span className={mediapipeStatus.includes('error') ? 'text-christmas-red' : 'text-christmas-gold'}>
            {mediapipeStatus}
          </span>
        </div>
      )}
    </div>
  );
}
