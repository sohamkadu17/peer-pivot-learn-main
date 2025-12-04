import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pen, Eraser, Square, Circle, Type, Undo, Redo, Trash2, Download, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Point {
  x: number;
  y: number;
}

interface DrawAction {
  type: 'draw' | 'erase' | 'shape';
  tool: string;
  points: Point[];
  color: string;
  lineWidth: number;
  shapeType?: 'rectangle' | 'circle';
}

interface WhiteboardProps {
  sessionId: string;
  isReadOnly?: boolean;
  onDrawingChange?: (actions: DrawAction[]) => void;
}

const COLORS = [
  '#000000', // Black
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFFFFF', // White
];

export default function Whiteboard({ sessionId, isReadOnly = false, onDrawingChange }: WhiteboardProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle' | 'text'>('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [redoStack, setRedoStack] = useState<DrawAction[]>([]);
  const [currentAction, setCurrentAction] = useState<DrawAction | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = Math.max(500, window.innerHeight * 0.6);
        redrawCanvas();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [actions]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw all actions
    actions.forEach(action => {
      drawAction(ctx, action);
    });
  };

  const drawAction = (ctx: CanvasRenderingContext2D, action: DrawAction) => {
    ctx.strokeStyle = action.color;
    ctx.lineWidth = action.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (action.type === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (action.tool === 'pen' || action.tool === 'eraser') {
      if (action.points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(action.points[0].x, action.points[0].y);

      for (let i = 1; i < action.points.length; i++) {
        ctx.lineTo(action.points[i].x, action.points[i].y);
      }

      ctx.stroke();
    } else if (action.tool === 'rectangle' && action.points.length >= 2) {
      const start = action.points[0];
      const end = action.points[action.points.length - 1];
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (action.tool === 'circle' && action.points.length >= 2) {
      const start = action.points[0];
      const end = action.points[action.points.length - 1];
      const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      
      ctx.beginPath();
      ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isReadOnly) return;

    setIsDrawing(true);
    const pos = getMousePos(e);

    const newAction: DrawAction = {
      type: tool === 'eraser' ? 'erase' : tool === 'pen' ? 'draw' : 'shape',
      tool: tool,
      points: [pos],
      color: color,
      lineWidth: tool === 'eraser' ? lineWidth * 3 : lineWidth,
      shapeType: tool === 'rectangle' || tool === 'circle' ? tool : undefined,
    };

    setCurrentAction(newAction);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAction || isReadOnly) return;

    const pos = getMousePos(e);
    const updatedAction = {
      ...currentAction,
      points: [...currentAction.points, pos],
    };

    setCurrentAction(updatedAction);

    // Draw live preview
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    redrawCanvas();
    drawAction(ctx, updatedAction);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentAction) return;

    setIsDrawing(false);
    setActions([...actions, currentAction]);
    setRedoStack([]); // Clear redo stack on new action
    setCurrentAction(null);

    // Notify parent
    if (onDrawingChange) {
      onDrawingChange([...actions, currentAction]);
    }
  };

  const handleUndo = () => {
    if (actions.length === 0) return;

    const lastAction = actions[actions.length - 1];
    setActions(actions.slice(0, -1));
    setRedoStack([...redoStack, lastAction]);

    if (onDrawingChange) {
      onDrawingChange(actions.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const actionToRedo = redoStack[redoStack.length - 1];
    setActions([...actions, actionToRedo]);
    setRedoStack(redoStack.slice(0, -1));

    if (onDrawingChange) {
      onDrawingChange([...actions, actionToRedo]);
    }
  };

  const handleClear = () => {
    if (!confirm('Are you sure you want to clear the whiteboard?')) return;

    setActions([]);
    setRedoStack([]);
    redrawCanvas();

    if (onDrawingChange) {
      onDrawingChange([]);
    }

    toast({
      title: 'Whiteboard Cleared',
      description: 'All drawings have been removed',
    });
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${sessionId}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();

    toast({
      title: 'Downloaded',
      description: 'Whiteboard image saved',
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Collaborative Whiteboard</CardTitle>
            <CardDescription>
              {isReadOnly ? 'View-only mode' : 'Draw and collaborate in real-time'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDownload} title="Download">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar */}
        {!isReadOnly && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
            {/* Drawing Tools */}
            <div className="flex gap-1 border-r pr-2">
              <Button
                size="sm"
                variant={tool === 'pen' ? 'default' : 'ghost'}
                onClick={() => setTool('pen')}
                title="Pen"
              >
                <Pen className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={tool === 'eraser' ? 'default' : 'ghost'}
                onClick={() => setTool('eraser')}
                title="Eraser"
              >
                <Eraser className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={tool === 'rectangle' ? 'default' : 'ghost'}
                onClick={() => setTool('rectangle')}
                title="Rectangle"
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={tool === 'circle' ? 'default' : 'ghost'}
                onClick={() => setTool('circle')}
                title="Circle"
              >
                <Circle className="h-4 w-4" />
              </Button>
            </div>

            {/* Color Picker */}
            <div className="relative border-r pr-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Color"
              >
                <Palette className="h-4 w-4 mr-2" />
                <div
                  className="w-4 h-4 rounded border border-border"
                  style={{ backgroundColor: color }}
                />
              </Button>
              {showColorPicker && (
                <div className="absolute top-full mt-2 left-0 p-2 bg-popover border rounded-lg shadow-lg z-10 grid grid-cols-4 gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: c,
                        borderColor: color === c ? '#000' : 'transparent',
                      }}
                      onClick={() => {
                        setColor(c);
                        setShowColorPicker(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Line Width */}
            <div className="flex items-center gap-2 border-r pr-2">
              <span className="text-xs text-muted-foreground">Size:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-xs font-medium w-6">{lineWidth}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleUndo}
                disabled={actions.length === 0}
                title="Undo"
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                title="Redo"
              >
                <Redo className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClear}
                disabled={actions.length === 0}
                title="Clear All"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="border rounded-lg overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </CardContent>
    </Card>
  );
}
