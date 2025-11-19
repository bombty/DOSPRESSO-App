// Retry AI analysis for existing task with GCS photo URL
import { db } from './server/db';
import { tasks } from './shared/schema';
import { eq } from 'drizzle-orm';
import { analyzeTaskPhoto } from './server/ai';

async function retryTask5() {
  console.log('[RETRY] Fetching task 5...');
  const [task] = await db.select().from(tasks).where(eq(tasks.id, 5));
  
  if (!task) {
    console.error('[RETRY] Task 5 not found');
    return;
  }
  
  console.log('[RETRY] Task:', task.description);
  console.log('[RETRY] Photo URL:', task.photoUrl);
  
  if (!task.photoUrl) {
    console.error('[RETRY] No photo URL');
    return;
  }
  
  console.log('[RETRY] Starting AI analysis with GCS URL...');
  const result = await analyzeTaskPhoto(
    task.photoUrl,
    task.description,
    task.assignedToId || undefined,
    true, // Skip cache
    task.branchId || undefined
  );
  
  console.log('[RETRY] ✅ AI Analysis Result:');
  console.log('Score:', result.score);
  console.log('Passed:', result.passed);
  console.log('Analysis:', result.analysis);
  
  // Update task with AI results
  await db.update(tasks)
    .set({
      aiScore: result.score,
      aiAnalysis: result.analysis,
      status: 'incelemede'
    })
    .where(eq(tasks.id, 5));
    
  console.log('[RETRY] ✅ Task updated in database');
}

retryTask5();
