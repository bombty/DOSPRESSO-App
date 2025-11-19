// GCS Download Debug Script
import { objectStorageClient } from './server/objectStorage';

const photoUrl = "https://storage.googleapis.com/replit-objstore-8d46a745-6e30-4f2e-b482-808e3d81d7a2/.private/uploads/725152bf-acdc-4212-b19b-2c42f07dd9d3";

async function testGCSDownload() {
  console.log('[DEBUG] Starting GCS download test');
  console.log('[DEBUG] Photo URL:', photoUrl);
  
  try {
    // Parse URL
    const url = new URL(photoUrl);
    console.log('[DEBUG] Parsed URL pathname:', url.pathname);
    
    const pathParts = url.pathname.split('/').filter(p => p.length > 0);
    console.log('[DEBUG] Path parts:', pathParts);
    
    const bucketName = pathParts[0];
    const objectPath = pathParts.slice(1).join('/');
    
    console.log('[DEBUG] Bucket name:', bucketName);
    console.log('[DEBUG] Object path:', objectPath);
    
    // Download file
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectPath);
    
    // Check existence
    console.log('[DEBUG] Checking if file exists...');
    const [exists] = await file.exists();
    console.log('[DEBUG] File exists:', exists);
    
    if (!exists) {
      console.error('[DEBUG] File does not exist!');
      return;
    }
    
    // Download
    console.log('[DEBUG] Downloading file...');
    const [fileBuffer] = await file.download();
    console.log('[DEBUG] Downloaded buffer length:', fileBuffer.length, 'bytes');
    console.log('[DEBUG] Downloaded buffer size:', Math.round(fileBuffer.length / 1024), 'KB');
    
    // Convert to base64
    const base64 = fileBuffer.toString('base64');
    console.log('[DEBUG] Base64 length:', base64.length);
    console.log('[DEBUG] Base64 preview (first 100 chars):', base64.substring(0, 100));
    
    console.log('[DEBUG] ✅ Download successful!');
  } catch (error) {
    console.error('[DEBUG] ❌ Error:', error);
    if (error instanceof Error) {
      console.error('[DEBUG] Error message:', error.message);
      console.error('[DEBUG] Error stack:', error.stack);
    }
  }
}

testGCSDownload();
