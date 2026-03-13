import { useState, useRef, useEffect, useCallback } from "react";
import { RotateCw, FlipHorizontal, Crop, X, Check, Undo2 } from "lucide-react";

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedFile: File, editedUrl: string) => void;
  onCancel: () => void;
}

const ImageEditor = ({ imageUrl, onSave, onCancel }: ImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [flippedH, setFlippedH] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

  // Crop state (in canvas pixel coordinates)
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // History for undo
  const [history, setHistory] = useState<ImageData[]>([]);

  // Load image
  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      setImg(image);
    };
    image.src = imageUrl;
  }, [imageUrl]);

  // Draw canvas whenever state changes
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate dimensions considering rotation
    const isRotated = rotation % 180 !== 0;
    const srcW = isRotated ? img.height : img.width;
    const srcH = isRotated ? img.width : img.height;

    // Fit into container
    const maxW = container.clientWidth - 32;
    const maxH = container.clientHeight - 32;
    const scale = Math.min(maxW / srcW, maxH / srcH, 1);
    const drawW = Math.floor(srcW * scale);
    const drawH = Math.floor(srcH * scale);

    canvas.width = drawW;
    canvas.height = drawH;

    ctx.save();
    ctx.clearRect(0, 0, drawW, drawH);

    // Apply transforms
    ctx.translate(drawW / 2, drawH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flippedH) ctx.scale(-1, 1);

    const imgDrawW = isRotated ? drawH : drawW;
    const imgDrawH = isRotated ? drawW : drawH;
    ctx.drawImage(img, -imgDrawW / 2, -imgDrawH / 2, imgDrawW, imgDrawH);
    ctx.restore();
  }, [img, rotation, flippedH]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Also redraw on window resize
  useEffect(() => {
    const handleResize = () => drawCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawCanvas]);

  // Draw crop overlay
  useEffect(() => {
    if (!isCropping || !cropStart || !cropEnd) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Redraw image first
    drawCanvas();

    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x);
    const h = Math.abs(cropEnd.y - cropStart.y);

    // Darken outside crop area
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, y);
    ctx.fillRect(0, y + h, canvas.width, canvas.height - y - h);
    ctx.fillRect(0, y, x, h);
    ctx.fillRect(x + w, y, canvas.width - x - w, h);

    // Crop border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Corner handles
    const handleSize = 8;
    ctx.fillStyle = "#fff";
    [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([cx, cy]) => {
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    });
  }, [cropStart, cropEnd, isCropping, drawCanvas]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width, ((e.clientX - rect.left) / rect.width) * canvas.width)),
      y: Math.max(0, Math.min(canvas.height, ((e.clientY - rect.top) / rect.height) * canvas.height)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping) return;
    const coords = getCanvasCoords(e);
    setCropStart(coords);
    setCropEnd(coords);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !isCropping) return;
    setCropEnd(getCanvasCoords(e));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    // Reset crop when rotating
    setCropStart(null);
    setCropEnd(null);
  };

  const handleMirror = () => {
    setFlippedH((prev) => !prev);
    setCropStart(null);
    setCropEnd(null);
  };

  const handleCropToggle = () => {
    if (isCropping) {
      // Cancel crop
      setCropStart(null);
      setCropEnd(null);
    }
    setIsCropping(!isCropping);
  };

  const handleApplyCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas || !cropStart || !cropEnd) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Save current state for undo
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, currentData]);

    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x);
    const h = Math.abs(cropEnd.y - cropStart.y);

    if (w < 10 || h < 10) return; // Too small

    // Get cropped data
    const croppedData = ctx.getImageData(x, y, w, h);

    // Create a temp canvas with the cropped result
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;
    tempCtx.putImageData(croppedData, 0, 0);

    // Create new image from the cropped canvas
    const croppedImg = new Image();
    croppedImg.onload = () => {
      setImg(croppedImg);
      setRotation(0);
      setFlippedH(false);
      setIsCropping(false);
      setCropStart(null);
      setCropEnd(null);
    };
    croppedImg.src = tempCanvas.toDataURL("image/png");
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prevData = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = prevData.width;
    canvas.height = prevData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(prevData, 0, 0);

    // Convert back to image to maintain state properly
    const restoredImg = new Image();
    restoredImg.onload = () => {
      setImg(restoredImg);
      setRotation(0);
      setFlippedH(false);
    };
    restoredImg.src = canvas.toDataURL("image/png");
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Redraw clean (no crop overlay)
    drawCanvas();

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `edited_${Date.now()}.png`, { type: "image/png" });
      const url = URL.createObjectURL(file);
      onSave(file, url);
    }, "image/png");
  };

  return (
    <div className="absolute inset-0 z-[60] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <h3 className="text-sm font-semibold text-foreground">Edit Image</h3>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Check className="w-4 h-4" />
          Done
        </button>
      </div>

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center bg-black/20 overflow-hidden p-4"
      >
        <canvas
          ref={canvasRef}
          className={`rounded-lg shadow-2xl ${isCropping ? "cursor-crosshair" : ""}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Crop action bar (shown when crop selection exists) */}
      {isCropping && cropStart && cropEnd && Math.abs(cropEnd.x - cropStart.x) > 10 && (
        <div className="flex items-center justify-center gap-3 py-2 bg-secondary/30">
          <button
            onClick={() => { setCropStart(null); setCropEnd(null); }}
            className="px-4 py-1.5 rounded-lg bg-secondary/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset Selection
          </button>
          <button
            onClick={handleApplyCrop}
            className="px-4 py-1.5 rounded-lg gradient-primary text-xs font-medium text-primary-foreground hover:opacity-90 transition-colors"
          >
            Apply Crop
          </button>
        </div>
      )}

      {/* Tools */}
      <div className="p-4 border-t border-white/[0.05]">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleCropToggle}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              isCropping
                ? "bg-primary/15 text-primary"
                : "bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Crop className="w-5 h-5" />
            <span className="text-[10px] font-medium">Crop</span>
          </button>
          <button
            onClick={handleRotate}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
          >
            <RotateCw className="w-5 h-5" />
            <span className="text-[10px] font-medium">Rotate</span>
          </button>
          <button
            onClick={handleMirror}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              flippedH
                ? "bg-primary/15 text-primary"
                : "bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <FlipHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">Mirror</span>
          </button>
          {history.length > 0 && (
            <button
              onClick={handleUndo}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
            >
              <Undo2 className="w-5 h-5" />
              <span className="text-[10px] font-medium">Undo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
