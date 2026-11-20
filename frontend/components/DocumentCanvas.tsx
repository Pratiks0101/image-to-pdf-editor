// Manual Snipping Tool with Multiple Edits & Font Matching
import { useRef, useEffect, useState } from 'react';

interface DocumentCanvasProps {
  imagePreview: string | null;
  img_width: number;
  img_height: number;
  setRenderedSize: (size: { width: number; height: number }) => void;
}

interface EditBlock {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  font: string; // 'serif' or 'sans-serif'
}

export default function DocumentCanvas({
  imagePreview,
  img_width,
  img_height,
  setRenderedSize,
}: DocumentCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [renderedSize, setRenderedSizeState] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (imgRef.current) {
        const w = imgRef.current.clientWidth;
        const h = imgRef.current.clientHeight;
        setRenderedSizeState({ width: w, height: h });
        setRenderedSize({ width: w, height: h });
      }
    };

    window.addEventListener('resize', updateSize);
    const timer = setTimeout(updateSize, 100);
    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timer);
    };
  }, [imagePreview, setRenderedSize]);

  const [isSelecting, setIsSelecting] = useState(false);
  const [clickStart, setClickStart] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  
  const [edits, setEdits] = useState<EditBlock[]>([]);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [inputText, setInputText] = useState<string>('');

  const scaleX = img_width / Math.max(renderedSize.width, 1);
  const scaleY = img_height / Math.max(renderedSize.height, 1);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setClickStart({ x, y });
    setCurrentRect({ x, y, w: 0, h: 0 });
    setActiveEditId(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !clickStart || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setCurrentRect({
      x: Math.min(clickStart.x, currentX),
      y: Math.min(clickStart.y, currentY),
      w: Math.abs(currentX - clickStart.x),
      h: Math.abs(currentY - clickStart.y),
    });
  };

  const handleMouseUp = async () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    if (!currentRect || currentRect.w < 5 || currentRect.h < 5) {
      setCurrentRect(null);
      return;
    }

    const origX = currentRect.x * scaleX;
    const origY = currentRect.y * scaleY;
    const origW = currentRect.w * scaleX;
    const origH = currentRect.h * scaleY;

    const newId = Date.now().toString();
    const newBlock: EditBlock = {
      id: newId,
      x: origX,
      y: origY,
      w: origW,
      h: origH,
      text: '',
      font: 'serif', // Default to certificate serif
    };

    setEdits((prev) => [...prev, newBlock]);
    setActiveEditId(newId);
    setInputText('');

    await handleRegionOCR(origX, origY, origW, origH, newId);
  };

  const handleRegionOCR = async (sx: number, sy: number, sw: number, sh: number, editId: string) => {
    const canvas = hiddenCanvasRef.current;
    if (!canvas || !imagePreview) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img_width;
    canvas.height = img_height;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imagePreview;

    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
    });

    ctx.drawImage(img, 0, 0);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = Math.max(1, sw);
    croppedCanvas.height = Math.max(1, sh);
    const cropCtx = croppedCanvas.getContext('2d');
    if (!cropCtx) return;

    cropCtx.drawImage(img, Math.max(0, sx), Math.max(0, sy), Math.max(1, sw), Math.max(1, sh), 0, 0, Math.max(1, sw), Math.max(1, sh));

    croppedCanvas.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append('file', blob, 'selection.png');

      try {
        const response = await fetch('http://localhost:8000/api/extract-region', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.success && data.text) {
          const trimmed = data.text.trim();
          setInputText(trimmed);
          setEdits((prev) =>
            prev.map((item) => (item.id === editId ? { ...item, text: trimmed } : item))
          );
        }
      } catch (error) {
        console.error('Region OCR error:', error);
      }
    }, 'image/png');
  };

  const handleTextChange = (val: string) => {
    setInputText(val);
    if (activeEditId) {
      setEdits((prev) =>
        prev.map((item) => (item.id === activeEditId ? { ...item, text: val } : item))
      );
    }
  };

  const removeEdit = (id: string) => {
    setEdits((prev) => prev.filter((item) => item.id !== id));
    if (activeEditId === id) {
      setActiveEditId(null);
      setInputText('');
    }
  };

  // Apply all edits cumulatively with matching fonts
  const applyPatchedText = () => {
    if (!imagePreview) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imagePreview;

    img.onload = () => {
      const patchCanvas = document.createElement('canvas');
      patchCanvas.width = img_width;
      patchCanvas.height = img_height;
      const c = patchCanvas.getContext('2d');
      if (!c) return;

      // 1. Draw original base image
      c.drawImage(img, 0, 0);

      // 2. Loop through all edits and patch sequentially
      edits.forEach(({ x, y, w, h, text }) => {
        if (!text.trim()) return;

        try {
          const sampleX = Math.max(0, x - 6);
          const sampleY = Math.max(0, y - 6);
          const pixelData = c.getImageData(sampleX, sampleY, 5, 5).data;

          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < pixelData.length; i += 4) {
            r += pixelData[i];
            g += pixelData[i + 1];
            b += pixelData[i + 2];
            count++;
          }
          const dynamicBgColor = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;

          // --- REVISED FILLRECT FOR SEAMLESS BLENDING ---
          c.save(); // Save current canvas state
          c.fillStyle = dynamicBgColor;
          
          // Soften the rectangle edges using a tiny shadowBlur so the box doesn't look harsh
          c.globalAlpha = 0.75;
          c.shadowColor = dynamicBgColor;
          c.shadowBlur = 2; 

          // Draw the patch slightly tighter (-1 padding) to avoid clipping neighboring letters
          c.fillRect(x - 1, y - 1, w + 2, h + 2);
          c.restore(); // Restore state so fillRect shadow doesn't affect the text
          // ----------------------------------------------

          // Typewriter Font & Realistic Ink Rendering
          const fontSize = Math.max(14, h * 1.15);
          c.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
          
          // Faded dark ink for organic typewriter feel
          c.fillStyle = 'rgba(25, 25, 25, 0.88)';
          
          // Subtle ink bleed effect
          c.shadowColor = 'rgba(0, 0, 0, 0.4)';
          c.shadowBlur = 0.6;
          c.shadowOffsetX = 0.4;
          c.shadowOffsetY = 0.4;

          c.textBaseline = 'alphabetic';
          c.fillText(text.trim(), x, y + h * 0.8);

          // Reset text shadows
          c.shadowBlur = 0;
          c.shadowOffsetX = 0;
          c.shadowOffsetY = 0;
        } catch (e) {
          console.error('Patch item error:', e);
        }
      });

      // 3. Trigger download
      const dataUrl = patchCanvas.toDataURL('image/png');
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = dataUrl;
      downloadAnchor.download = 'snipped_edited_document.png';
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    };
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 space-y-3 flex flex-col justify-between">
      <div>
        <h2 className="text-lg font-semibold text-violet-400 mb-3">
          Manual Text Selection Canvas ({edits.length} regions)
        </h2>

        <div
          ref={containerRef}
          className="relative inline-block w-full overflow-hidden rounded-lg bg-black select-none cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {imagePreview && (
            <img
              ref={imgRef}
              src={imagePreview}
              alt="uploaded document"
              className="w-full h-auto object-contain select-none pointer-events-none"
              draggable={false}
            />
          )}

          {currentRect && isSelecting && (
            <div
              style={{
                position: 'absolute',
                left: `${currentRect.x}px`,
                top: `${currentRect.y}px`,
                width: `${currentRect.w}px`,
                height: `${currentRect.h}px`,
                border: '2px dashed #a855f7',
                backgroundColor: 'rgba(168, 85, 247, 0.2)',
                pointerEvents: 'none',
              }}
            />
          )}

          {edits.map((item) => {
            const rx = item.x / scaleX;
            const ry = item.y / scaleY;
            const rw = item.w / scaleX;
            const rh = item.h / scaleY;
            const isActive = activeEditId === item.id;

            return (
              <div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveEditId(item.id);
                  setInputText(item.text);
                }}
                style={{
                  position: 'absolute',
                  left: `${rx}px`,
                  top: `${ry}px`,
                  width: `${rw}px`,
                  height: `${rh}px`,
                  border: isActive ? '2px solid #22c55e' : '2px solid #a855f7',
                  backgroundColor: isActive ? 'rgba(34, 197, 94, 0.25)' : 'rgba(168, 85, 247, 0.15)',
                  cursor: 'pointer',
                }}
              >
                <span className="absolute -top-5 left-0 bg-violet-600 text-white text-[10px] px-1 rounded">
                  {item.text || 'Edit'}
                </span>
              </div>
            );
          })}

          <canvas ref={hiddenCanvasRef} className="hidden" />
        </div>

        {activeEditId && (
          <div className="mt-3 p-3 bg-gray-800 border border-violet-500 rounded-lg flex items-center gap-3">
            <span className="text-xs text-violet-300 font-medium">Edit Region:</span>
            <input
              type="text"
              value={inputText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="flex-1 bg-gray-900 text-white px-3 py-1.5 rounded border border-gray-700 text-sm focus:outline-none focus:border-violet-500"
              placeholder="Type replacement text..."
              autoFocus
            />
            <button
              onClick={() => removeEdit(activeEditId)}
              className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-xs font-semibold text-white transition"
            >
              Delete
            </button>
            <button
              onClick={() => setActiveEditId(null)}
              className="bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded text-xs font-semibold text-white transition"
            >
              Done
            </button>
          </div>
        )}
      </div>

      <button
        onClick={applyPatchedText}
        className="w-full bg-green-600 hover:bg-green-700 py-2.5 rounded-lg font-semibold text-sm transition mt-4 cursor-pointer text-white"
      >
        📥 Download Edited Document ({edits.length} Changes)
      </button>
    </div>
  );
}