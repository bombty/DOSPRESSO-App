import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
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

    if (file.size > maxFileSize) {
      toast({
        title: "Hata",
        description: `Dosya boyutu çok büyük. Maksimum ${Math.floor(maxFileSize / 1024 / 1024)}MB olmalıdır.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const { url } = await onGetUploadParameters();
      
      const response = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const uploadURL = url.split("?")[0];
      onComplete?.({ successful: [{ uploadURL }] });
      
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
