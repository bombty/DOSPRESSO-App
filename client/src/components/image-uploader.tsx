import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  purpose?: string;
  label?: string;
  className?: string;
  compact?: boolean;
}

export function ImageUploader({ value, onChange, purpose = "general", label, className, compact }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [sizeInfo, setSizeInfo] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Geçersiz dosya", description: "Lütfen bir görsel dosyası seçin.", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Dosya çok büyük", description: "Maksimum dosya boyutu 10MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setSizeInfo("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", purpose);

      const res = await fetch("/api/training/upload-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Yükleme başarısız");
      }

      const data = await res.json();
      onChange(data.url);

      if (data.optimizedSize) {
        setSizeInfo(`${(data.optimizedSize / 1024).toFixed(0)} KB`);
      } else if (file.size) {
        setSizeInfo(`${(file.size / 1024).toFixed(0)} KB`);
      }
    } catch (error: any) {
      toast({ title: "Yükleme hatası", description: error.message || "Görsel yüklenirken hata oluştu.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }, [purpose, onChange, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          uploadFile(file);
          return;
        }
      }
    }
  }, [uploadFile]);

  const handleRemove = useCallback(() => {
    onChange("");
    setSizeInfo("");
  }, [onChange]);

  if (value) {
    return (
      <div className={cn("space-y-1", className)}>
        {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
        <div className={cn("relative group", compact ? "inline-block" : "")}>
          <img
            src={value}
            alt={label || "Uploaded image"}
            className={cn(
              "rounded-md object-cover border",
              compact ? "max-h-32 max-w-48" : "max-h-48 w-full max-w-md"
            )}
            data-testid="img-preview"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            style={{ visibility: "visible" }}
            onClick={handleRemove}
            data-testid="button-remove-image"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
        {sizeInfo && <p className="text-xs text-muted-foreground" data-testid="text-size-info">{sizeInfo}</p>}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        tabIndex={0}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-md cursor-pointer transition-colors flex items-center justify-center gap-2",
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30",
          compact ? "p-3" : "p-6 flex-col",
          isUploading && "pointer-events-none opacity-60"
        )}
        data-testid="dropzone-image-upload"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            {!compact && <span className="text-sm text-muted-foreground">Yükleniyor...</span>}
          </>
        ) : (
          <>
            {compact ? (
              <>
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Görsel yükle veya yapıştır</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground text-center">
                  Tıklayın, sürükleyin veya yapıştırın (Ctrl+V)
                </span>
                <span className="text-xs text-muted-foreground">PNG, JPG, WebP - Maks 10MB</span>
              </>
            )}
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        data-testid="input-file-upload"
      />
    </div>
  );
}
