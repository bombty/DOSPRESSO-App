import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import imageCompression from "browser-image-compression";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  maxWidthOrHeight?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: Array<{ uploadURL: string }> }) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxFileSize = 10485760,
  maxWidthOrHeight = 800,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - images only
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Hata",
        description: "Sadece resim dosyaları yüklenebilir",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Compress and resize image before upload
      const compressedFile = await imageCompression(file, {
        maxSizeMB: maxFileSize / (1024 * 1024),
        maxWidthOrHeight: maxWidthOrHeight,
        useWebWorker: true,
        fileType: "image/jpeg",
      });
      
      const { url } = await onGetUploadParameters();
      
      const response = await fetch(url, {
        method: "PUT",
        body: compressedFile,
        headers: {
          "Content-Type": compressedFile.type || "image/jpeg",
        },
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      // Finalize the upload - normalize URL and set ACL to public
      const rawUrl = url.split("?")[0];
      const finalizeRes = await fetch("/api/objects/finalize", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: rawUrl, visibility: "public" }),
      });
      
      if (!finalizeRes.ok) {
        throw new Error("Dosya işlenirken hata oluştu");
      }
      
      const { normalizedUrl } = await finalizeRes.json();
      if (!normalizedUrl || !normalizedUrl.startsWith("/objects/")) {
        throw new Error("Dosya yolu oluşturulamadı");
      }
      
      onComplete?.({ successful: [{ uploadURL: normalizedUrl }] });
      
      toast({
        title: "Başarılı",
        description: "Dosya başarıyla yüklendi",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Hata",
        description: "Dosya yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-file-upload"
        onClick={(e) => e.stopPropagation()}
      />
      <Button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={buttonClassName}
        disabled={isUploading}
        data-testid="button-upload-file"
      >
        {isUploading ? "Yükleniyor..." : children}
      </Button>
    </div>
  );
}
