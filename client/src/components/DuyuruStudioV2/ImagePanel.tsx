import { useRef } from "react";
import type { ImageElement } from "./hooks/useCanvas";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  Trash2,
  RotateCw,
  ZoomIn,
  Image as ImageIcon,
} from "lucide-react";

interface ImagePanelProps {
  selectedImage: ImageElement | null;
  onAddImage: (src: string, width: number, height: number) => void;
  onUpdateImage: (id: string, updates: Partial<ImageElement>) => void;
  onDelete: () => void;
  hasSelection: boolean;
}

export function ImagePanel({
  selectedImage,
  onAddImage,
  onUpdateImage,
  onDelete,
  hasSelection,
}: ImagePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Scale down if too big, keeping aspect ratio
        const maxW = 300;
        const scale = img.width > maxW ? maxW / img.width : 1;
        onAddImage(src, img.width * scale, img.height * scale);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        {/* Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          data-testid="file-input-image"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          size="sm"
          className="w-full gap-2"
          data-testid="btn-upload-image"
        >
          <Upload className="h-4 w-4" />
          Görsel Yükle
        </Button>

        {/* No selection */}
        {!selectedImage && (
          <div className="text-center py-6 text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">
              {hasSelection
                ? "Seçili öğe görsel değil"
                : "Canvas'ta bir görsel seçin veya yeni yükleyin"}
            </p>
          </div>
        )}

        {/* Image Editor */}
        {selectedImage && (
          <div className="space-y-3">
            {/* Preview thumbnail */}
            <div className="rounded-lg overflow-hidden border bg-muted/30">
              <img
                src={selectedImage.src}
                alt="Seçili görsel"
                className="w-full h-24 object-contain"
              />
            </div>

            {/* Scale */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <ZoomIn className="h-3 w-3" />
                  Ölçek
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">%{selectedImage.scale}</span>
              </div>
              <Slider
                value={[selectedImage.scale]}
                onValueChange={([v]) => onUpdateImage(selectedImage.id, { scale: v })}
                min={20}
                max={300}
                step={5}
              />
            </div>

            {/* Rotation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <RotateCw className="h-3 w-3" />
                  Döndürme
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">{selectedImage.rotation}°</span>
              </div>
              <Slider
                value={[selectedImage.rotation]}
                onValueChange={([v]) => onUpdateImage(selectedImage.id, { rotation: v })}
                min={0}
                max={360}
                step={5}
              />
            </div>

            {/* Border Width */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Kenarlık</Label>
                <span className="text-[10px] text-muted-foreground font-mono">{selectedImage.borderWidth}px</span>
              </div>
              <Slider
                value={[selectedImage.borderWidth]}
                onValueChange={([v]) => onUpdateImage(selectedImage.id, { borderWidth: v })}
                min={0}
                max={10}
                step={1}
              />
            </div>

            {/* Border Color */}
            {selectedImage.borderWidth > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground shrink-0">Kenarlık Rengi</Label>
                <Input
                  type="color"
                  value={selectedImage.borderColor}
                  onChange={(e) => onUpdateImage(selectedImage.id, { borderColor: e.target.value })}
                  className="w-8 h-7 p-0 border-0 cursor-pointer"
                />
              </div>
            )}

            {/* Border Radius */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Köşe Yuvarlaklığı</Label>
                <span className="text-[10px] text-muted-foreground font-mono">{selectedImage.borderRadius}px</span>
              </div>
              <Slider
                value={[selectedImage.borderRadius]}
                onValueChange={([v]) => onUpdateImage(selectedImage.id, { borderRadius: v })}
                min={0}
                max={50}
                step={2}
              />
            </div>

            {/* Delete */}
            <Button
              onClick={onDelete}
              variant="destructive"
              size="sm"
              className="w-full gap-2 mt-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Görseli Sil
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
