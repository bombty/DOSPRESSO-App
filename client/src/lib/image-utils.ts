import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}

const defaultOptions: CompressionOptions = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1200,
  quality: 0.7,
};

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const mergedOptions = { ...defaultOptions, ...options };
  
  const compressionOptions = {
    maxSizeMB: mergedOptions.maxSizeMB!,
    maxWidthOrHeight: mergedOptions.maxWidthOrHeight!,
    useWebWorker: true,
    initialQuality: mergedOptions.quality!,
  };

  try {
    const compressedFile = await imageCompression(file, compressionOptions);
    
    const originalSizeKB = Math.round(file.size / 1024);
    const compressedSizeKB = Math.round(compressedFile.size / 1024);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(compressedFile);
    });
  } catch (error) {
    console.error('Fotoğraf sıkıştırma hatası:', error);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const mergedOptions = { ...defaultOptions, ...options };
  
  const compressionOptions = {
    maxSizeMB: mergedOptions.maxSizeMB!,
    maxWidthOrHeight: mergedOptions.maxWidthOrHeight!,
    useWebWorker: true,
    initialQuality: mergedOptions.quality!,
  };

  try {
    const compressedFile = await imageCompression(file, compressionOptions);
    return compressedFile;
  } catch (error) {
    console.error('Fotoğraf sıkıştırma hatası:', error);
    return file;
  }
}
