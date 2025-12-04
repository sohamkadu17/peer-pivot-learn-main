import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Eraser, Square, Circle, Download, Trash2, Undo, Redo, Minus, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CollaborativeWhiteboardProps {
  roomId: string;
}

interface DrawAction {
  type: 'draw' | 'erase' | 'shape';
  tool: string;
  points?: { x: number; y: number }[];
  shape?: { type: string; start: { x: number; y: number }; end: { x: number; y: number } };
  color: string;
  lineWidth: number;
  userId: string;
  timestamp: number;
}

const COLORS = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'];

export default function CollaborativeWhiteboard({ roomId }: CollaborativeWhiteboardProps) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const channelRef = useRef<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle'>('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [currentAction, setCurrentAction] = useState<DrawAction | null>(null);
  const [redoStack, setRedoStack] = useState<DrawAction[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    console.log('🎨 Setting up whiteboard channel for room:', roomId);

    // Subscribe to drawing actions
    const channel = supabase.channel(`whiteboard:${roomId}`)
      .on('broadcast', { event: 'draw' }, ({ payload }) => {
        console.log('📡 Received drawing action:', payload);
        if (payload.userId !== user?.id) {
          executeAction(ctx, payload as DrawAction);
          setActions(prev => [...prev, payload as DrawAction]);
        }
      })
      .subscribe((status) => {
        console.log('🔌 Whiteboard channel status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 Unsubscribing from whiteboard channel');
      channel.unsubscribe();
    };
  }, [roomId, user?.id]);

  useEffect(() => {
    redrawCanvas();
  }, [actions]);

  const executeAction = (ctx: CanvasRenderingContext2D, action: DrawAction) => {
    ctx.strokeStyle = action.color;
    ctx.lineWidth = action.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (action.type === 'draw' && action.points) {
      ctx.beginPath();
      action.points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
    } else if (action.type === 'erase' && action.points) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      action.points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    } else if (action.type === 'shape' && action.shape) {
      const { type, start, end } = action.shape;
      ctx.beginPath();
      if (type === 'rectangle') {
        ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (type === 'circle') {
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
      }
      ctx.stroke();
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    actions.forEach(action => executeAction(ctx, action));
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'pen' || tool === 'eraser') {
      setCurrentAction({
        type: tool === 'pen' ? 'draw' : 'erase',
        tool,
        points: [{ x, y }],
        color,
        lineWidth,
        userId: user?.id || '',
        timestamp: Date.now()
      });
    } else {
      setCurrentAction({
        type: 'shape',
        tool,
        shape: { type: tool, start: { x, y }, end: { x, y } },
        color,
        lineWidth,
        userId: user?.id || '',
        timestamp: Date.now()
      });
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAction) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if ((tool === 'pen' || tool === 'eraser') && currentAction.points) {
      const updatedAction = {
        ...currentAction,
        points: [...currentAction.points, { x, y }]
      };
      setCurrentAction(updatedAction);

      const ctx = canvas.getContext('2d');
      if (ctx) executeAction(ctx, updatedAction);
    } else if (currentAction.shape) {
      setCurrentAction({
        ...currentAction,
        shape: { ...currentAction.shape, end: { x, y } }
      });
    }
  };

  const stopDrawing = async () => {
    if (currentAction) {
      const finalAction = currentAction;
      setActions(prev => [...prev, finalAction]);
      setRedoStack([]);

      // Broadcast action to other users using the subscribed channel
      if (channelRef.current) {
        console.log('📤 Broadcasting drawing action:', finalAction.type);
        await channelRef.current.send({
          type: 'broadcast',
          event: 'draw',
          payload: finalAction
        });
      }
    }

    setIsDrawing(false);
    setCurrentAction(null);
  };

  const undo = () => {
    if (actions.length > 0) {
      const lastAction = actions[actions.length - 1];
      setActions(prev => prev.slice(0, -1));
      setRedoStack(prev => [...prev, lastAction]);
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const actionToRedo = redoStack[redoStack.length - 1];
      setActions(prev => [...prev, actionToRedo]);
      setRedoStack(prev => prev.slice(0, -1));
    }
  };

  const clearCanvas = () => {
    setActions([]);
    setRedoStack([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `whiteboard-${Date.now()}.png`;
      link.href = url;
      link.click();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-2 flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-100 rounded-lg">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={tool === 'pen' ? 'default' : 'outline'}
              onClick={() => setTool('pen')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={tool === 'eraser' ? 'default' : 'outline'}
              onClick={() => setTool('eraser')}
            >
              <Eraser className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={tool === 'rectangle' ? 'default' : 'outline'}
              onClick={() => setTool('rectangle')}
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={tool === 'circle' ? 'default' : 'outline'}
              onClick={() => setTool('circle')}
            >
              <Circle className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-1">
            {COLORS.map(c => (
              <button
                key={c}
                className={`w-6 h-6 rounded border-2 ${color === c ? 'border-blue-500' : 'border-gray-300'}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          <div className="flex gap-1 items-center">
            <Button size="sm" variant="outline" onClick={() => setLineWidth(Math.max(1, lineWidth - 1))}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-sm px-2">{lineWidth}px</span>
            <Button size="sm" variant="outline" onClick={() => setLineWidth(Math.min(20, lineWidth + 1))}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex gap-1 ml-auto">
            <Button size="sm" variant="outline" onClick={undo} disabled={actions.length === 0}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={redo} disabled={redoStack.length === 0}>
              <Redo className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={clearCanvas}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={downloadCanvas}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="flex-1 border rounded cursor-crosshair bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </CardContent>
    </Card>
  );
}
