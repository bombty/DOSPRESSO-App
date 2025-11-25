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

export function getImageMimeType(buffer: Buffer): string {
  const header = buffer.toString('hex', 0, 4);
  if (header.startsWith('ffd8ff')) return 'image/jpeg';
  if (header.startsWith('89504e47')) return 'image/png';
  if (header.startsWith('52494646')) return 'image/webp';
  return 'image/webp';
}
