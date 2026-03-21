import sharp from 'sharp';

export async function compressAndConvertImage(base64Data: string): Promise<Buffer> {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    
    const compressed = await sharp(buffer)
      .resize(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
    
    return compressed;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
}

// Checklist photo compression - optimized for minimum file size while maintaining AI readability
export const CHECKLIST_PHOTO_CONFIG = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 70,
};

export async function compressChecklistPhoto(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const compressed = await sharp(imageBuffer)
      .resize(CHECKLIST_PHOTO_CONFIG.maxWidth, CHECKLIST_PHOTO_CONFIG.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: CHECKLIST_PHOTO_CONFIG.quality })
      .toBuffer();
    
    return compressed;
  } catch (error) {
    console.error('Error compressing checklist photo:', error);
    throw error;
  }
}

// Compress base64 checklist photo
export async function compressChecklistPhotoBase64(base64Data: string): Promise<Buffer> {
  const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  return compressChecklistPhoto(buffer);
}

export function getImageMimeType(buffer: Buffer): string {
  const header = buffer.toString('hex', 0, 4);
  if (header.startsWith('ffd8ff')) return 'image/jpeg';
  if (header.startsWith('89504e47')) return 'image/png';
  if (header.startsWith('52494646')) return 'image/webp';
  return 'image/webp';
}
