// Manual AI Analysis Test with Realistic Image
import { analyzeTaskPhoto } from './server/ai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testAIAnalysis() {
  console.log('[TEST] Starting AI analysis test with realistic coffee machine image');
  
  try {
    // Read realistic coffee machine image from stock images
    const imagePath = join(__dirname, 'attached_assets/stock_images/professional_coffee__f250dc69.jpg');
    const imageBuffer = readFileSync(imagePath);
    
    console.log('[TEST] Image loaded:', imagePath);
    console.log('[TEST] Image size:', Math.round(imageBuffer.length / 1024), 'KB');
    
    // Convert to base64 data URL
    const base64 = imageBuffer.toString('base64');
    const imageDataUrl = `data:image/jpeg;base64,${base64}`;
    
    console.log('[TEST] Calling AI analysis...');
    const result = await analyzeTaskPhoto(
      imageDataUrl, // Use base64 directly (not GCS URL)
      'Espresso makinesi temizliği ve bakımı - Makine parlatıldı, su filtresi değiştirildi, grup başlığı temizlendi',
      'test-user-id',
      true, // Skip cache
      4 // Branch ID
    );
    
    console.log('[TEST] ✅ AI Analysis Result:');
    console.log('Score:', result.score);
    console.log('Passed:', result.passed);
    console.log('Analysis:', result.analysis);
    
  } catch (error) {
    console.error('[TEST] ❌ Error:', error);
    if (error instanceof Error) {
      console.error('[TEST] Error message:', error.message);
    }
  }
}

testAIAnalysis();
