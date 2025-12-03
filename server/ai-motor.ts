import { generateFlashcardsFromLesson, generateQuizQuestionsFromLesson, generateAISummary } from "./ai";
import { storage } from "./storage";

/**
 * AI Motor: Converts Knowledge Base articles into multi-format training materials
 * Supports: flashcard_set, quiz, multi_step_guide, mindmap
 */

export async function generateMultiStepGuideFromArticle(articleContent: string, articleTitle: string): Promise<unknown> {
  try {
    const steps = articleContent.split('\n\n').filter(p => p.trim()).map((paragraph, idx) => ({
      stepNumber: idx + 1,
      title: `Adım ${idx + 1}`,
      content: paragraph.trim(),
      tips: [`İpucu: ${paragraph.split('.')[0]}`],
      timeEstimate: '2-3 dakika'
    }));

    return {
      type: 'multi_step_guide',
      steps: steps.slice(0, 8), // Max 8 steps
      totalSteps: Math.min(steps.length, 8),
      estimatedTime: `${Math.min(steps.length, 8) * 3}-${Math.min(steps.length, 8) * 5} dakika`
    };
  } catch (error) {
    console.error("Multi-step guide generation error:", error);
    return { type: 'multi_step_guide', steps: [], totalSteps: 0 };
  }
}

export async function generateScenarioFromArticle(articleContent: string): Promise<unknown> {
  try {
    const sentences = articleContent.split('.').filter(s => s.trim());
    const mainPoint = sentences[0]?.trim() || "Senaryo";
    
    return {
      type: 'scenario',
      title: mainPoint.substring(0, 60),
      scenario: `Senaryoya göz atınız: ${mainPoint}`,
      question: `Bu durumda sizin yapmanız gereken nedir? ${sentences[1]?.trim() || 'Adımları sırayla gerçekleştiriniz.'}`,
      correctAnswer: `${sentences[2]?.trim() || 'Protokolü izleyiniz'}`,
      timeLimit: 300 // 5 minutes
    };
  } catch (error) {
    console.error("Scenario generation error:", error);
    return { type: 'scenario', title: 'Senaryo', scenario: '', question: '', correctAnswer: '' };
  }
}

export async function generateTrainingMaterialBundle(articleId: number, articleContent: string, articleTitle: string) {
  try {
    // Generate all content types in parallel
    const [flashcards, quizzes, multiStep, scenario] = await Promise.all([
      generateFlashcardsFromLesson(articleContent, 10),
      generateQuizQuestionsFromLesson(articleContent, 5),
      generateMultiStepGuideFromArticle(articleContent, articleTitle),
      generateScenarioFromArticle(articleContent)
    ]);

    return {
      articleId,
      materialType: 'comprehensive_bundle',
      title: `${articleTitle} - Kapsamlı Eğitim Seti`,
      description: `${articleTitle} için çok formatı eğitim materyali`,
      content: {
        flashcards: flashcards || [],
        quizzes: quizzes || [],
        multiStepGuide: multiStep,
        scenario: scenario
      },
      status: 'draft',
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Training material bundle generation error:", error);
    throw error;
  }
}
