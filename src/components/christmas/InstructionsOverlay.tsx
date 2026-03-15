import { useState, useEffect } from 'react';
import { X, Hand, Grab, MousePointer, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstructionsOverlayProps {
  onDismiss: () => void;
}

export function InstructionsOverlay({ onDismiss }: InstructionsOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has seen instructions before
    const hasSeenInstructions = localStorage.getItem('christmas-tree-instructions-seen');
    if (!hasSeenInstructions) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('christmas-tree-instructions-seen', 'true');
    setShow(false);
    onDismiss();
  };

  if (!show) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="glass-gold rounded-2xl p-8 max-w-md mx-4 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </Button>

        <h2 className="text-2xl font-display font-bold text-christmas-gold mb-6 text-center">
          🪄 歡迎來到魔法劇場
        </h2>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-christmas-green/20">
              <Grab className="w-6 h-6 text-christmas-green" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">握拳</h3>
              <p className="text-sm text-muted-foreground">
                粒子聚合成愛心形狀
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-christmas-gold/20">
              <Hand className="w-6 h-6 text-christmas-gold" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">五指張開</h3>
              <p className="text-sm text-muted-foreground">
                愛心爆炸成浪漫銀河
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-christmas-red/20">
              <MousePointer className="w-6 h-6 text-christmas-red" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">捏合</h3>
              <p className="text-sm text-muted-foreground">
                選擇並放大卡片
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-muted/30">
              <Move className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">移動手勢</h3>
              <p className="text-sm text-muted-foreground">
                在星空模式下環繞背景
              </p>
            </div>
          </div>
        </div>

        
          
          <Button
            onClick={handleDismiss}
            className="w-full bg-christmas-gold hover:bg-christmas-gold/90 text-christmas-deep-blue font-semibold"
          >
            開始！ ✨
          </Button>
        </div>
      </div>
    </div>
  );
}
