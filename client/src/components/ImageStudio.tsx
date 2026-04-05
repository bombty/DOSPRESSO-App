import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Crop,
  Eraser,
  SunMedium,
  Palette,
  Shapes,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Loader2,
  Undo2,
  Check,
  Square,
  Circle,
  Diamond,
  RectangleHorizontal,
} from "lucide-react";

// ── Aspect Ratio Presets ──────────────────────
const ASPECT_PRESETS = [
  { label: "Serbest", value: undefined, icon: "free" },
  { label: "3:1 Banner", value: 3 / 1, icon: "banner" },
  { label: "4:1 Header", value: 4 / 1, icon: "header" },
  { label: "1:1 Kare", value: 1 / 1, icon: "square" },
  { label: "16:9", value: 16 / 9, icon: "wide" },
  { label: "4:3", value: 4 / 3, icon: "standard" },
  { label: "9:16 Dikey", value: 9 / 16, icon: "portrait" },
] as const;

// ── Filter Presets ──────────────────────
const FILTER_PRESETS = [
  { name: "Orijinal", filter: "none" },
  { name: "Sıcak", filter: "sepia(0.3) saturate(1.2) brightness(1.05)" },
  { name: "Soğuk", filter: "saturate(0.8) hue-rotate(15deg) brightness(1.05)" },
  { name: "S/B", filter: "grayscale(1)" },
  { name: "Vintage", filter: "sepia(0.5) contrast(0.9) brightness(1.1) saturate(0.8)" },
  { name: "Kahve", filter: "sepia(0.6) saturate(0.7) brightness(0.95) contrast(1.1)" },
  { name: "Taze", filter: "saturate(1.3) hue-rotate(-10deg) brightness(1.08)" },
  { name: "Rose", filter: "saturate(1.1) hue-rotate(-20deg) brightness(1.05) contrast(1.05)" },
] as const;

// ── Shape Presets ──────────────────────
const SHAPE_PRESETS = [
  { name: "Dikdörtgen", clipPath: "none", borderRadius: "4px" },
  { name: "Yuvarlatılmış", clipPath: "none", borderRadius: "16px" },
  { name: "Daire", clipPath: "circle(50%)", borderRadius: "0" },
  { name: "Elmas", clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)", borderRadius: "0" },
  { name: "Pill", clipPath: "none", borderRadius: "9999px" },
] as const;

// ── Background Removal Modes ──────────────────────
type BgRemovalMode = "transparent" | "white" | "custom" | "blur";

const BG_REMOVAL_OPTIONS = [
  { mode: "transparent" as BgRemovalMode, label: "Şeffaf arkaplan (PNG)", desc: "Banner editöre eklemek için ideal", color: "warning" },
  { mode: "white" as BgRemovalMode, label: "Beyaz arkaplan", desc: "Temiz ürün görseli", color: "info" },
  { mode: "custom" as BgRemovalMode, label: "Özel renk arkaplan", desc: "DOSPRESSO marka renkleri", color: "success" },
  { mode: "blur" as BgRemovalMode, label: "Bulanık arkaplan", desc: "Ürün odaklı efekt", color: "secondary" },
] as const;

const BRAND_COLORS = [
  { name: "Espresso", color: "#4a2c2a" },
  { name: "Caramel", color: "#d4a574" },
  { name: "Cream", color: "#f5e6d3" },
  { name: "Navy", color: "#192838" },
  { name: "Beyaz", color: "#ffffff" },
  { name: "Kırmızı", color: "#c43a5c" },
  { name: "Yeşil", color: "#228b22" },
  { name: "Altın", color: "#b8860b" },
];

// ── Helpers ──────────────────────
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation: number = 0,
  flipH: boolean = false,
  flipV: boolean = false
): Promise<string> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = imageSrc;

  return new Promise<string>((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context yok"));

      const rotRad = (rotation * Math.PI) / 180;
      const { width: bWidth, height: bHeight } = getRotatedSize(
        image.naturalWidth,
        image.naturalHeight,
        rotation
      );

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      if (flipH) ctx.scale(-1, 1);
      if (flipV) ctx.scale(1, -1);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Canvas boş"));
          resolve(URL.createObjectURL(blob));
        },
        "image/png",
        1
      );
    };
    image.onerror = () => reject(new Error("Görsel yüklenemedi"));
  });
}

function getRotatedSize(width: number, height: number, rotation: number) {
  const rotRad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

async function applyFiltersToCanvas(
  imageSrc: string,
  filters: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    filterPreset: string;
  },
  shape: { clipPath: string; borderRadius: string }
): Promise<string> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = imageSrc;

  return new Promise<string>((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context yok"));

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      // Apply CSS filters via canvas
      const filterParts: string[] = [];
      if (filters.brightness !== 100) filterParts.push(`brightness(${filters.brightness}%)`);
      if (filters.contrast !== 100) filterParts.push(`contrast(${filters.contrast}%)`);
      if (filters.saturation !== 100) filterParts.push(`saturate(${filters.saturation}%)`);
      if (filters.blur > 0) filterParts.push(`blur(${filters.blur}px)`);

      // Apply filter preset
      if (filters.filterPreset !== "none") {
        filterParts.push(filters.filterPreset);
      }

      ctx.filter = filterParts.length > 0 ? filterParts.join(" ") : "none";

      // Apply shape clipping
      if (shape.clipPath === "circle(50%)") {
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2, 0, Math.PI * 2);
        ctx.clip();
      }

      ctx.drawImage(image, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Canvas boş"));
          resolve(URL.createObjectURL(blob));
        },
        "image/png",
        1
      );
    };
    image.onerror = () => reject(new Error("Görsel yüklenemedi"));
  });
}

// ── Component ──────────────────────
interface ImageStudioProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onComplete: (resultImageUrl: string) => void;
  defaultAspect?: number;
}

export function ImageStudio({ open, imageSrc, onClose, onComplete, defaultAspect }: ImageStudioProps) {
  const { toast } = useToast();

  // ── Active tab ──
  const [activeTab, setActiveTab] = useState("crop");

  // ── Crop state ──
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [aspect, setAspect] = useState<number | undefined>(defaultAspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // ── Background removal state ──
  const [bgRemoving, setBgRemoving] = useState(false);
  const [bgRemovedSrc, setBgRemovedSrc] = useState<string | null>(null);
  const [bgMode, setBgMode] = useState<BgRemovalMode>("transparent");
  const [bgCustomColor, setBgCustomColor] = useState("#4a2c2a");
  const [bgProgress, setBgProgress] = useState(0);

  // ── Adjustments state ──
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);

  // ── Filter state ──
  const [selectedFilter, setSelectedFilter] = useState("none");

  // ── Shape state ──
  const [selectedShape, setSelectedShape] = useState(0);

  // ── Processing ──
  const [isProcessing, setIsProcessing] = useState(false);

  // The working image (after bg removal, it changes)
  const workingImage = bgRemovedSrc || imageSrc;

  // Computed CSS filter for live preview
  const previewFilter = useMemo(() => {
    const parts: string[] = [];
    if (brightness !== 100) parts.push(`brightness(${brightness}%)`);
    if (contrast !== 100) parts.push(`contrast(${contrast}%)`);
    if (saturation !== 100) parts.push(`saturate(${saturation}%)`);
    if (blur > 0) parts.push(`blur(${blur}px)`);
    if (selectedFilter !== "none") parts.push(selectedFilter);
    return parts.length > 0 ? parts.join(" ") : "none";
  }, [brightness, contrast, saturation, blur, selectedFilter]);

  // Shape clip
  const shapeStyle = SHAPE_PRESETS[selectedShape];

  // Reset states when dialog opens with new image
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setAspect(defaultAspect);
      setCroppedAreaPixels(null);
      setBgRemovedSrc(null);
      setBgRemoving(false);
      setBgProgress(0);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setBlur(0);
      setSelectedFilter("none");
      setSelectedShape(0);
      setActiveTab("crop");
    }
  }, [open, imageSrc, defaultAspect]);

  // ── Crop callbacks ──
  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // ── Background Removal ──
  const handleRemoveBackground = useCallback(async (mode: BgRemovalMode) => {
    setBgRemoving(true);
    setBgProgress(0);
    setBgMode(mode);

    try {
      const { removeBackground } = await import("@imgly/background-removal");

      // Fetch the image as a blob
      const response = await fetch(workingImage);
      const blob = await response.blob();

      const resultBlob = await removeBackground(blob, {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            setBgProgress(Math.round((current / total) * 100));
          }
        },
      });

      // Process based on mode
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context yok");

      const img = new Image();
      img.src = URL.createObjectURL(resultBlob);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          if (mode === "transparent") {
            // Just draw the transparent result
            ctx.drawImage(img, 0, 0);
          } else if (mode === "white") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          } else if (mode === "custom") {
            ctx.fillStyle = bgCustomColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          } else if (mode === "blur") {
            // Draw original with heavy blur as background
            const origImg = new Image();
            origImg.crossOrigin = "anonymous";
            origImg.src = workingImage;
            origImg.onload = () => {
              ctx.filter = "blur(20px) brightness(0.7)";
              ctx.drawImage(origImg, -20, -20, canvas.width + 40, canvas.height + 40);
              ctx.filter = "none";
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((blob) => {
                if (blob) {
                  setBgRemovedSrc(URL.createObjectURL(blob));
                }
                resolve();
              }, "image/png", 1);
            };
            return;
          }

          canvas.toBlob((blob) => {
            if (blob) {
              setBgRemovedSrc(URL.createObjectURL(blob));
            }
            resolve();
          }, "image/png", 1);
        };
        img.onerror = () => reject(new Error("Sonuç görsel yüklenemedi"));
      });

      toast({
        title: "Arkaplan silindi",
        description: "Görsel başarıyla işlendi",
      });
    } catch (error) {
      console.error("Background removal error:", error);
      toast({
        title: "Hata",
        description: "Arkaplan silinemedi. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setBgRemoving(false);
      setBgProgress(0);
    }
  }, [workingImage, bgCustomColor, toast]);

  // ── Reset adjustments ──
  const resetAdjustments = useCallback(() => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setSelectedFilter("none");
    setSelectedShape(0);
  }, []);

  // ── Final apply ──
  const handleApply = useCallback(async () => {
    setIsProcessing(true);
    try {
      let resultUrl = workingImage;

      // Step 1: Apply crop if cropped area exists
      if (croppedAreaPixels) {
        resultUrl = await getCroppedImg(resultUrl, croppedAreaPixels, rotation, flipH, flipV);
      }

      // Step 2: Apply filters, adjustments, and shape
      const hasAdjustments = brightness !== 100 || contrast !== 100 || saturation !== 100 || blur > 0;
      const hasFilter = selectedFilter !== "none";
      const hasShape = selectedShape > 0;

      if (hasAdjustments || hasFilter || hasShape) {
        resultUrl = await applyFiltersToCanvas(
          resultUrl,
          { brightness, contrast, saturation, blur, filterPreset: selectedFilter },
          SHAPE_PRESETS[selectedShape]
        );
      }

      onComplete(resultUrl);
      onClose();
    } catch (error) {
      console.error("Image processing error:", error);
      toast({
        title: "Hata",
        description: "Görsel işlenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    workingImage, croppedAreaPixels, rotation, flipH, flipV,
    brightness, contrast, saturation, blur, selectedFilter, selectedShape,
    onComplete, onClose, toast,
  ]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden" data-testid="dialog-image-studio">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DialogHeader className="p-0 space-y-0">
            <DialogTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Görsel Stüdyo
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} data-testid="button-studio-cancel">
              İptal
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={isProcessing}
              data-testid="button-studio-apply"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  İşleniyor...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Uygula
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row" style={{ height: "calc(95vh - 120px)" }}>
          {/* Preview Area */}
          <div className="flex-1 bg-neutral-900 dark:bg-neutral-950 relative flex items-center justify-center min-h-[250px] overflow-hidden">
            {activeTab === "crop" ? (
              <Cropper
                image={workingImage}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                cropShape="rect"
                showGrid={true}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                restrictPosition={true}
                style={{
                  containerStyle: { width: "100%", height: "100%" },
                  mediaStyle: {
                    transform: `${flipH ? "scaleX(-1)" : ""} ${flipV ? "scaleY(-1)" : ""}`,
                  },
                }}
              />
            ) : (
              <div
                className="max-w-full max-h-full p-4"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={workingImage}
                  alt="Önizleme"
                  className="max-w-full max-h-full object-contain transition-all duration-200"
                  style={{
                    filter: previewFilter,
                    clipPath: shapeStyle.clipPath !== "none" ? shapeStyle.clipPath : undefined,
                    borderRadius: shapeStyle.borderRadius,
                    maxHeight: "400px",
                  }}
                />
              </div>
            )}

            {/* BG removal progress overlay */}
            {bgRemoving && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
                <p className="text-white text-sm">
                  Arkaplan siliniyor... {bgProgress > 0 ? `${bgProgress}%` : "Model yükleniyor"}
                </p>
                <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${bgProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-5 mx-2 mt-2 h-9">
                <TabsTrigger value="crop" className="text-xs gap-1 px-1" data-testid="tab-crop">
                  <Crop className="h-3 w-3" />
                  <span className="hidden sm:inline">Kırp</span>
                </TabsTrigger>
                <TabsTrigger value="bg" className="text-xs gap-1 px-1" data-testid="tab-bg">
                  <Eraser className="h-3 w-3" />
                  <span className="hidden sm:inline">Arkaplan</span>
                </TabsTrigger>
                <TabsTrigger value="adjust" className="text-xs gap-1 px-1" data-testid="tab-adjust">
                  <SunMedium className="h-3 w-3" />
                  <span className="hidden sm:inline">Ayar</span>
                </TabsTrigger>
                <TabsTrigger value="filter" className="text-xs gap-1 px-1" data-testid="tab-filter">
                  <Palette className="h-3 w-3" />
                  <span className="hidden sm:inline">Filtre</span>
                </TabsTrigger>
                <TabsTrigger value="shape" className="text-xs gap-1 px-1" data-testid="tab-shape">
                  <Shapes className="h-3 w-3" />
                  <span className="hidden sm:inline">Şekil</span>
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                {/* ── CROP TAB ── */}
                <TabsContent value="crop" className="p-3 space-y-4 mt-0">
                  <div>
                    <p className="text-sm font-medium mb-2">Kırpma oranı</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ASPECT_PRESETS.map((preset) => (
                        <Badge
                          key={preset.label}
                          variant={aspect === preset.value ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                          onClick={() => setAspect(preset.value)}
                          data-testid={`badge-aspect-${preset.icon}`}
                        >
                          {preset.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Yakınlaştırma</p>
                    <div className="flex items-center gap-2">
                      <ZoomOut className="h-3 w-3 text-muted-foreground" />
                      <Slider
                        value={[zoom]}
                        onValueChange={([v]) => setZoom(v)}
                        min={1}
                        max={3}
                        step={0.05}
                        className="flex-1"
                        data-testid="slider-zoom"
                      />
                      <ZoomIn className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {Math.round(zoom * 100)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Döndürme</p>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[rotation]}
                        onValueChange={([v]) => setRotation(v)}
                        min={0}
                        max={360}
                        step={1}
                        className="flex-1"
                        data-testid="slider-rotation"
                      />
                      <span className="text-xs text-muted-foreground w-10 text-right">{rotation}°</span>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        className="text-xs gap-1"
                        data-testid="button-rotate-90"
                      >
                        <RotateCw className="h-3 w-3" />
                        90°
                      </Button>
                      <Button
                        variant={flipH ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFlipH(!flipH)}
                        className="text-xs gap-1"
                        data-testid="button-flip-h"
                      >
                        <FlipHorizontal className="h-3 w-3" />
                        Yatay
                      </Button>
                      <Button
                        variant={flipV ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFlipV(!flipV)}
                        className="text-xs gap-1"
                        data-testid="button-flip-v"
                      >
                        <FlipVertical className="h-3 w-3" />
                        Dikey
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* ── BACKGROUND REMOVAL TAB ── */}
                <TabsContent value="bg" className="p-3 space-y-3 mt-0">
                  <p className="text-sm font-medium">Arkaplan işlemleri</p>
                  <p className="text-xs text-muted-foreground">
                    AI ile arkaplanı otomatik algılar ve kaldırır. İlk kullanımda model
                    indirilir (~40MB), sonraki kullanımlarda önbellekten çalışır.
                  </p>

                  <div className="space-y-2">
                    {BG_REMOVAL_OPTIONS.map((opt) => (
                      <button
                        key={opt.mode}
                        className="w-full flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
                        onClick={() => {
                          if (opt.mode === "custom") {
                            setBgMode("custom");
                            // Don't start removal yet, let user pick color first
                          } else {
                            handleRemoveBackground(opt.mode);
                          }
                        }}
                        disabled={bgRemoving}
                        data-testid={`button-bg-${opt.mode}`}
                      >
                        <Eraser className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Custom color picker */}
                  {bgMode === "custom" && (
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-xs font-medium">Arkaplan rengi seç</p>
                      <div className="flex flex-wrap gap-2">
                        {BRAND_COLORS.map((c) => (
                          <button
                            key={c.color}
                            className="flex flex-col items-center gap-1"
                            onClick={() => setBgCustomColor(c.color)}
                            data-testid={`button-bg-color-${c.name}`}
                          >
                            <div
                              className="w-8 h-8 rounded-md border transition-all"
                              style={{
                                backgroundColor: c.color,
                                borderColor: bgCustomColor === c.color ? "#3b82f6" : "transparent",
                                borderWidth: bgCustomColor === c.color ? "2px" : "1px",
                              }}
                            />
                            <span className="text-[10px] text-muted-foreground">{c.name}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={bgCustomColor}
                          onChange={(e) => setBgCustomColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                          data-testid="input-bg-custom-color"
                        />
                        <span className="text-xs text-muted-foreground">{bgCustomColor}</span>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleRemoveBackground("custom")}
                        disabled={bgRemoving}
                        data-testid="button-bg-apply-custom"
                      >
                        <Eraser className="h-3 w-3 mr-1" />
                        Bu renkle uygula
                      </Button>
                    </div>
                  )}

                  {/* Reset bg removal */}
                  {bgRemovedSrc && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setBgRemovedSrc(null)}
                      data-testid="button-bg-reset"
                    >
                      <Undo2 className="h-3 w-3 mr-1" />
                      Orijinale dön
                    </Button>
                  )}
                </TabsContent>

                {/* ── ADJUSTMENTS TAB ── */}
                <TabsContent value="adjust" className="p-3 space-y-4 mt-0">
                  <p className="text-sm font-medium">Görsel ayarları</p>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-muted-foreground">Parlaklık</label>
                        <span className="text-xs text-muted-foreground">{brightness}%</span>
                      </div>
                      <Slider
                        value={[brightness]}
                        onValueChange={([v]) => setBrightness(v)}
                        min={20}
                        max={200}
                        step={1}
                        data-testid="slider-brightness"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-muted-foreground">Kontrast</label>
                        <span className="text-xs text-muted-foreground">{contrast}%</span>
                      </div>
                      <Slider
                        value={[contrast]}
                        onValueChange={([v]) => setContrast(v)}
                        min={20}
                        max={200}
                        step={1}
                        data-testid="slider-contrast"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-muted-foreground">Doygunluk</label>
                        <span className="text-xs text-muted-foreground">{saturation}%</span>
                      </div>
                      <Slider
                        value={[saturation]}
                        onValueChange={([v]) => setSaturation(v)}
                        min={0}
                        max={200}
                        step={1}
                        data-testid="slider-saturation"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-muted-foreground">Bulanıklık</label>
                        <span className="text-xs text-muted-foreground">{blur}px</span>
                      </div>
                      <Slider
                        value={[blur]}
                        onValueChange={([v]) => setBlur(v)}
                        min={0}
                        max={20}
                        step={0.5}
                        data-testid="slider-blur"
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetAdjustments}
                    data-testid="button-adjust-reset"
                  >
                    <Undo2 className="h-3 w-3 mr-1" />
                    Sıfırla
                  </Button>
                </TabsContent>

                {/* ── FILTER TAB ── */}
                <TabsContent value="filter" className="p-3 space-y-3 mt-0">
                  <p className="text-sm font-medium">Hazır filtreler</p>

                  <div className="grid grid-cols-4 gap-2">
                    {FILTER_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        className="flex flex-col items-center gap-1"
                        onClick={() => setSelectedFilter(preset.filter)}
                        data-testid={`button-filter-${preset.name}`}
                      >
                        <div
                          className="w-full aspect-square rounded-md overflow-hidden border-2 transition-all"
                          style={{
                            borderColor:
                              selectedFilter === preset.filter
                                ? "hsl(var(--primary))"
                                : "transparent",
                          }}
                        >
                          <img
                            src={workingImage}
                            alt={preset.name}
                            className="w-full h-full object-cover"
                            style={{ filter: preset.filter }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </TabsContent>

                {/* ── SHAPE TAB ── */}
                <TabsContent value="shape" className="p-3 space-y-3 mt-0">
                  <p className="text-sm font-medium">Görsel şekli</p>

                  <div className="flex flex-wrap gap-2">
                    {SHAPE_PRESETS.map((shape, idx) => (
                      <button
                        key={shape.name}
                        className="flex flex-col items-center gap-1"
                        onClick={() => setSelectedShape(idx)}
                        data-testid={`button-shape-${shape.name}`}
                      >
                        <div
                          className="w-12 h-12 border-2 transition-all bg-muted/50"
                          style={{
                            borderColor:
                              selectedShape === idx
                                ? "hsl(var(--primary))"
                                : "var(--border)",
                            clipPath: shape.clipPath !== "none" ? shape.clipPath : undefined,
                            borderRadius: shape.clipPath === "none" ? shape.borderRadius : "0",
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground">{shape.name}</span>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
