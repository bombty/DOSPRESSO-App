import { useState, useCallback, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────

export type BackgroundType = "solid" | "linear" | "radial" | "pattern";
export type AspectRatio = "3:1" | "16:9" | "1:1";
export type GradientDirection = "to-r" | "to-l" | "to-t" | "to-b" | "to-br" | "to-bl";
export type RadialPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  color: string;
  textAlign: "left" | "center" | "right";
  textShadow: boolean;
  maxWidth: number;
}

export interface ImageElement {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
}

export interface IconElement {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

export type CanvasElement =
  | { type: "text"; id: string }
  | { type: "image"; id: string }
  | { type: "icon"; id: string };

export interface CanvasBackground {
  type: BackgroundType;
  solidColor: string;
  gradientFrom: string;
  gradientTo: string;
  gradientDirection: GradientDirection;
  radialPosition: RadialPosition;
  patternId: string | null;
}

// ─── Hook ────────────────────────────────────────────────────────

export function useCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("3:1");

  // Elements
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [imageElements, setImageElements] = useState<ImageElement[]>([]);
  const [iconElements, setIconElements] = useState<IconElement[]>([]);

  // Selection & Drag
  const [selectedElement, setSelectedElement] = useState<CanvasElement | null>(null);
  const [dragging, setDragging] = useState<{
    type: string;
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Background
  const [background, setBackground] = useState<CanvasBackground>({
    type: "linear",
    solidColor: "#1a0f0a",
    gradientFrom: "#1a0f0a",
    gradientTo: "#3d2314",
    gradientDirection: "to-br",
    radialPosition: "center",
    patternId: null,
  });

  // ── Aspect Ratio CSS ──────────────────────────────────────────
  const aspectRatioCSS: Record<AspectRatio, string> = {
    "3:1": "3/1",
    "16:9": "16/9",
    "1:1": "1/1",
  };

  // ── Background Style ──────────────────────────────────────────
  const getBackgroundStyle = useCallback((): React.CSSProperties => {
    const directions: Record<GradientDirection, string> = {
      "to-r": "to right",
      "to-l": "to left",
      "to-t": "to top",
      "to-b": "to bottom",
      "to-br": "to bottom right",
      "to-bl": "to bottom left",
    };

    const radialMap: Record<RadialPosition, string> = {
      center: "circle at center",
      "top-left": "circle at top left",
      "top-right": "circle at top right",
      "bottom-left": "circle at bottom left",
      "bottom-right": "circle at bottom right",
    };

    const { type, solidColor, gradientFrom, gradientTo, gradientDirection, radialPosition, patternId } = background;
    let base = "";

    switch (type) {
      case "solid":
        return { background: solidColor };
      case "linear":
        base = `linear-gradient(${directions[gradientDirection]}, ${gradientFrom}, ${gradientTo})`;
        break;
      case "radial":
        base = `radial-gradient(${radialMap[radialPosition]}, ${gradientFrom}, ${gradientTo})`;
        break;
      case "pattern":
        base = `linear-gradient(${directions[gradientDirection]}, ${gradientFrom}, ${gradientTo})`;
        break;
    }

    // Pattern overlay
    if (type === "pattern" && patternId) {
      const patterns: Record<string, { css: string; size?: string }> = {
        stripes: { css: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.08) 10px, rgba(255,255,255,0.08) 20px)" },
        dots: { css: "radial-gradient(circle, rgba(255,255,255,0.12) 2px, transparent 2px)", size: "20px 20px" },
        grid: { css: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", size: "20px 20px" },
        wave: { css: "repeating-linear-gradient(135deg, transparent, transparent 5px, rgba(255,255,255,0.06) 5px, rgba(255,255,255,0.06) 10px)" },
        "coffee-beans": { css: "radial-gradient(ellipse 4px 6px, rgba(255,255,255,0.1) 50%, transparent 50%)", size: "24px 24px" },
      };
      const p = patterns[patternId];
      if (p) {
        return {
          background: `${p.css}, ${base}`,
          backgroundSize: p.size || "auto",
        };
      }
    }

    return { background: base };
  }, [background]);

  // ── Element CRUD ──────────────────────────────────────────────
  const addText = useCallback((partial?: Partial<TextElement>) => {
    const id = `txt-${Date.now()}`;
    const el: TextElement = {
      id,
      text: "Metin ekle",
      x: 40,
      y: 40,
      fontSize: 32,
      fontFamily: "'Poppins', sans-serif",
      fontWeight: "bold",
      fontStyle: "normal",
      color: "#ffffff",
      textAlign: "left",
      textShadow: true,
      maxWidth: 400,
      ...partial,
    };
    setTextElements((prev) => [...prev, el]);
    setSelectedElement({ type: "text", id });
    return id;
  }, []);

  const addImage = useCallback((src: string, width = 200, height = 200) => {
    const id = `img-${Date.now()}`;
    const el: ImageElement = {
      id,
      src,
      x: 60,
      y: 30,
      width,
      height,
      scale: 100,
      rotation: 0,
      borderWidth: 0,
      borderColor: "#ffffff",
      borderRadius: 8,
    };
    setImageElements((prev) => [...prev, el]);
    setSelectedElement({ type: "image", id });
    return id;
  }, []);

  const addIcon = useCallback((emoji: string) => {
    const id = `ico-${Date.now()}`;
    const el: IconElement = { id, emoji, x: 50, y: 50, size: 48, rotation: 0 };
    setIconElements((prev) => [...prev, el]);
    setSelectedElement({ type: "icon", id });
    return id;
  }, []);

  const updateText = useCallback((id: string, updates: Partial<TextElement>) => {
    setTextElements((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const updateImage = useCallback((id: string, updates: Partial<ImageElement>) => {
    setImageElements((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }, []);

  const updateIcon = useCallback((id: string, updates: Partial<IconElement>) => {
    setIconElements((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedElement) return;
    const { type, id } = selectedElement;
    if (type === "text") setTextElements((p) => p.filter((t) => t.id !== id));
    if (type === "image") setImageElements((p) => p.filter((i) => i.id !== id));
    if (type === "icon") setIconElements((p) => p.filter((i) => i.id !== id));
    setSelectedElement(null);
  }, [selectedElement]);

  // ── Drag & Drop ───────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: string, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDragging({
        type,
        id,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      });
      setSelectedElement({ type: type as CanvasElement["type"], id });
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = Math.max(0, Math.min(rect.width - 50, e.clientX - rect.left - dragging.offsetX));
      const newY = Math.max(0, Math.min(rect.height - 30, e.clientY - rect.top - dragging.offsetY));

      if (dragging.type === "text") updateText(dragging.id, { x: newX, y: newY });
      if (dragging.type === "image") updateImage(dragging.id, { x: newX, y: newY });
      if (dragging.type === "icon") updateIcon(dragging.id, { x: newX, y: newY });
    },
    [dragging, updateText, updateImage, updateIcon]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // ── Template application ──────────────────────────────────────
  const applyTemplate = useCallback(
    (template: {
      background: Partial<CanvasBackground>;
      texts?: Partial<TextElement>[];
      icons?: string[];
    }) => {
      // Clear existing
      setTextElements([]);
      setImageElements([]);
      setIconElements([]);
      setSelectedElement(null);

      // Apply background
      setBackground((prev) => ({ ...prev, ...template.background }));

      // Apply texts
      if (template.texts) {
        const newTexts = template.texts.map((t, i) => ({
          id: `txt-tpl-${Date.now()}-${i}`,
          text: t.text || "Metin",
          x: t.x ?? 40,
          y: t.y ?? 40 + i * 60,
          fontSize: t.fontSize ?? 28,
          fontFamily: t.fontFamily ?? "'Poppins', sans-serif",
          fontWeight: (t.fontWeight ?? "bold") as TextElement["fontWeight"],
          fontStyle: (t.fontStyle ?? "normal") as TextElement["fontStyle"],
          color: t.color ?? "#ffffff",
          textAlign: (t.textAlign ?? "left") as TextElement["textAlign"],
          textShadow: t.textShadow ?? true,
          maxWidth: t.maxWidth ?? 500,
        }));
        setTextElements(newTexts);
      }

      // Apply icons
      if (template.icons) {
        const newIcons = template.icons.map((emoji, i) => ({
          id: `ico-tpl-${Date.now()}-${i}`,
          emoji,
          x: 20 + i * 60,
          y: 10,
          size: 36,
          rotation: 0,
        }));
        setIconElements(newIcons);
      }
    },
    []
  );

  // ── Selected element helpers ──────────────────────────────────
  const selectedText =
    selectedElement?.type === "text" ? textElements.find((t) => t.id === selectedElement.id) ?? null : null;
  const selectedImage =
    selectedElement?.type === "image" ? imageElements.find((i) => i.id === selectedElement.id) ?? null : null;
  const selectedIcon =
    selectedElement?.type === "icon" ? iconElements.find((i) => i.id === selectedElement.id) ?? null : null;

  return {
    // Refs
    canvasRef,
    // Aspect ratio
    aspectRatio,
    setAspectRatio,
    aspectRatioCSS,
    // Background
    background,
    setBackground,
    getBackgroundStyle,
    // Elements
    textElements,
    imageElements,
    iconElements,
    // Selection
    selectedElement,
    setSelectedElement,
    selectedText,
    selectedImage,
    selectedIcon,
    // CRUD
    addText,
    addImage,
    addIcon,
    updateText,
    updateImage,
    updateIcon,
    deleteSelected,
    // Drag & Drop
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    // Template
    applyTemplate,
  };
}
