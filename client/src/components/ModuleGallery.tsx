import { useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ModuleGalleryProps {
  moduleId: number;
  images: Array<{ url: string; alt?: string; uploadedAt: number }>;
  onImagesChange: (images: any[]) => void;
  disabled?: boolean;
}

export function ModuleGallery({
  moduleId,
  images,
  onImagesChange,
  disabled
}: ModuleGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/training/modules/${moduleId}/upload-image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Resim yüklenemedi");
      }

      const data = await response.json();
      onImagesChange([...images, { url: data.url, alt: file.name, uploadedAt: Date.now() }]);
      toast({ title: "✓ Resim yüklendi", description: "Resim modül galerisine eklendi" });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (index: number) => {
    try {
      const response = await fetch(`/api/training/modules/${moduleId}/gallery/${index}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Silinemedi");

      const updated = images.filter((_, i) => i !== index);
      onImagesChange(updated);
      toast({ title: "✓ Resim silindi" });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Modül Galerisi</h3>

      {/* Upload Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Resim Yükle</label>
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={disabled || uploading}
            className="flex-1"
            data-testid="input-module-image"
          />
          <Button
            disabled={disabled || uploading}
            size="sm"
            variant="outline"
            data-testid="button-upload-image"
          >
            <Upload className="w-4 h-4 mr-1" />
            {uploading ? "Yükleniyor..." : "Yükle"}
          </Button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((image, idx) => (
          <div
            key={idx}
            className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900"
            data-testid={`gallery-image-${idx}`}
          >
            {/* Banner-style image container: 600x400 aspect ratio */}
            <div className="aspect-[600/400] overflow-hidden">
              <img
                src={image.url}
                alt={image.alt || "Modül resmi"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Delete Button - visible on hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                onClick={() => handleDeleteImage(idx)}
                variant="destructive"
                size="sm"
                disabled={disabled}
                data-testid={`button-delete-image-${idx}`}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Sil
              </Button>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Henüz resim yok. Yükleyin veya yapay zeka ile oluşturun.
        </p>
      )}
    </div>
  );
}
