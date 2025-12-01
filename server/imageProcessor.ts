import sharp from "sharp";

// Image size constants (pixel) - banner-style gallery images
export const GALLERY_IMAGE_CONFIG = {
  width: 600,
  height: 400,
  quality: 75, // Lower quality for file size optimization
};

/**
 * Optimize image: resize, compress, convert to WebP
 * Input: any image format (JPEG, PNG, HEIC, etc.)
 * Output: WebP optimized buffer
 */
export async function optimizeGalleryImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<Buffer> {
  try {
    let pipeline = sharp(imageBuffer);

    // Convert to appropriate format and resize with object-fit: cover behavior
    const optimized = await pipeline
      .resize(GALLERY_IMAGE_CONFIG.width, GALLERY_IMAGE_CONFIG.height, {
        fit: "cover", // Fills area without distortion
        position: "center", // Center crop
      })
      .webp({ quality: GALLERY_IMAGE_CONFIG.quality })
      .toBuffer();

    console.log(`📸 Image optimized: ${imageBuffer.length} → ${optimized.length} bytes`);
    return optimized;
  } catch (error: any) {
    console.error("Image optimization error:", error);
    throw new Error("Fotoğraf optimize edilemedi: " + error.message);
  }
}

/**
 * Get image thumbnail for preview
 */
export async function generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const thumbnail = await sharp(imageBuffer)
      .resize(200, 150, { fit: "cover", position: "center" })
      .webp({ quality: 60 })
      .toBuffer();
    return thumbnail;
  } catch (error: any) {
    console.error("Thumbnail generation error:", error);
    throw new Error("Küçük resim oluşturulamadı");
  }
}
