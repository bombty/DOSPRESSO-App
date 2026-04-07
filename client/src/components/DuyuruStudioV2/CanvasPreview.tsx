import type { TextElement, ImageElement, IconElement, CanvasElement } from "./hooks/useCanvas";

interface CanvasPreviewProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  aspectRatio: string;
  backgroundStyle: React.CSSProperties;
  textElements: TextElement[];
  imageElements: ImageElement[];
  iconElements: IconElement[];
  selectedElement: CanvasElement | null;
  onMouseDown: (e: React.MouseEvent, type: string, id: string) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onDeselect: () => void;
}

export function CanvasPreview({
  canvasRef,
  aspectRatio,
  backgroundStyle,
  textElements,
  imageElements,
  iconElements,
  selectedElement,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onDeselect,
}: CanvasPreviewProps) {
  return (
    <div className="relative w-full flex items-center justify-center bg-[var(--canvas-area-bg,#0a0a0a)] rounded-xl p-4 sm:p-6">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full rounded-lg overflow-hidden cursor-crosshair shadow-2xl"
        style={{
          ...backgroundStyle,
          aspectRatio,
          maxWidth: "min(900px, 100%)",
        }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={(e) => {
          if (e.target === e.currentTarget) onDeselect();
        }}
        data-testid="studio-canvas"
      >
        {/* Image Elements */}
        {imageElements.map((img) => {
          const w = (img.width * img.scale) / 100;
          const h = (img.height * img.scale) / 100;
          const isSelected = selectedElement?.id === img.id;
          return (
            <div
              key={img.id}
              className={`absolute cursor-move transition-shadow ${isSelected ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent" : "hover:ring-1 hover:ring-white/30"}`}
              style={{
                left: img.x,
                top: img.y,
                width: w,
                height: h,
                transform: `rotate(${img.rotation}deg)`,
                border: img.borderWidth > 0 ? `${img.borderWidth}px solid ${img.borderColor}` : "none",
                borderRadius: img.borderRadius,
              }}
              onMouseDown={(e) => onMouseDown(e, "image", img.id)}
              data-testid={`canvas-image-${img.id}`}
            >
              <img
                src={img.src}
                alt=""
                className="w-full h-full object-cover"
                style={{ borderRadius: Math.max(0, img.borderRadius - img.borderWidth) }}
                loading="lazy"
                draggable={false}
              />
            </div>
          );
        })}

        {/* Icon Elements */}
        {iconElements.map((icon) => {
          const isSelected = selectedElement?.id === icon.id;
          return (
            <div
              key={icon.id}
              className={`absolute cursor-move select-none ${isSelected ? "ring-2 ring-blue-400 rounded" : ""}`}
              style={{
                left: icon.x,
                top: icon.y,
                fontSize: icon.size,
                transform: `rotate(${icon.rotation}deg)`,
                lineHeight: 1,
              }}
              onMouseDown={(e) => onMouseDown(e, "icon", icon.id)}
              data-testid={`canvas-icon-${icon.id}`}
            >
              {icon.emoji}
            </div>
          );
        })}

        {/* Text Elements */}
        {textElements.map((txt) => {
          const isSelected = selectedElement?.id === txt.id;
          return (
            <div
              key={txt.id}
              className={`absolute cursor-move ${isSelected ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-transparent rounded px-1" : ""}`}
              style={{
                left: txt.x,
                top: txt.y,
                maxWidth: txt.maxWidth,
              }}
              onMouseDown={(e) => onMouseDown(e, "text", txt.id)}
              data-testid={`canvas-text-${txt.id}`}
            >
              <span
                style={{
                  fontFamily: txt.fontFamily,
                  fontSize: txt.fontSize,
                  fontWeight: txt.fontWeight,
                  fontStyle: txt.fontStyle,
                  color: txt.color,
                  textAlign: txt.textAlign,
                  display: "block",
                  textShadow: txt.textShadow
                    ? "0 2px 8px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)"
                    : "none",
                  lineHeight: 1.3,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {txt.text}
              </span>
            </div>
          );
        })}

        {/* Empty state */}
        {textElements.length === 0 && imageElements.length === 0 && iconElements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-white/30 select-none">
              <p className="text-lg font-medium">Duyuru Stüdyosu</p>
              <p className="text-sm mt-1">Sağdaki araçlarla tasarlamaya başlayın</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
