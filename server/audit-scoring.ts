/**
 * DOSPRESSO Audit Scoring Engine
 * Pure functions for calculating audit scores, grades, and CAPA triggers
 */

import auditRules from '../seeds/audit_rules.json';

export interface AuditItemScore {
  itemId: number;
  itemCode: string;
  score: number;
  maxPoints: number;
  isCritical: boolean;
  notes?: string;
}

export interface SectionScore {
  sectionId: number;
  sectionName: string;
  weight: number;
  earnedPoints: number;
  maxPoints: number;
  percentage: number;
  items: AuditItemScore[];
}

export interface AuditScoreResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  gradeLabel: string;
  gradeColor: string;
  passed: boolean;
  criticalFailure: boolean;
  failedCriticalItems: AuditItemScore[];
  sections: SectionScore[];
  strengths: string[];
  weaknesses: string[];
  capaItems: CAPAItem[];
}

export interface CAPAItem {
  itemId: number;
  itemCode: string;
  question: string;
  score: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  slaHours: number;
  isCritical: boolean;
}

export interface GradeInfo {
  grade: string;
  label: string;
  minScore: number;
  maxScore: number;
  color: string;
}

/**
 * Get grade information based on percentage score
 */
export function getGrade(percentage: number): GradeInfo {
  const grades = auditRules.scoring.grades;
  for (const g of grades) {
    if (percentage >= g.minScore && percentage <= g.maxScore) {
      return g;
    }
  }
  return grades[grades.length - 1]; // Return lowest grade as fallback
}

/**
 * Determine CAPA priority based on score
 */
export function getCAPAPriority(score: number, isCritical: boolean): { priority: 'critical' | 'high' | 'medium' | 'low'; slaHours: number } {
  if (isCritical && score === 0) {
    return { 
      priority: auditRules.capaRules.criticalItemPriority as 'critical', 
      slaHours: auditRules.capaRules.criticalItemSlaHours 
    };
  }
  
  const mapping = auditRules.capaRules.priorityMapping.find(m => m.score === score);
  if (mapping) {
    return { priority: mapping.priority as 'critical' | 'high' | 'medium' | 'low', slaHours: mapping.slaHours };
  }
  
  return { priority: 'low', slaHours: 168 }; // 1 week default
}

/**
 * Check if score triggers CAPA creation
 */
export function shouldCreateCAPA(score: number, maxPoints: number): boolean {
  return score <= auditRules.capaRules.autoCreateThreshold;
}

/**
 * Compute comprehensive audit score with weighted sections
 */
export function computeAuditScore(
  sections: Array<{
    sectionId: number;
    sectionName: string;
    weight: number;
    items: Array<{
      itemId: number;
      itemCode: string;
      question: string;
      score: number;
      maxPoints: number;
      isCritical: boolean;
      notes?: string;
    }>;
  }>
): AuditScoreResult {
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const failedCriticalItems: AuditItemScore[] = [];
  const capaItems: CAPAItem[] = [];
  const processedSections: SectionScore[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Process each section
  for (const section of sections) {
    let sectionEarned = 0;
    let sectionMax = 0;
    const sectionItems: AuditItemScore[] = [];

    for (const item of section.items) {
      sectionEarned += item.score;
      sectionMax += item.maxPoints;

      sectionItems.push({
        itemId: item.itemId,
        itemCode: item.itemCode,
        score: item.score,
        maxPoints: item.maxPoints,
        isCritical: item.isCritical,
        notes: item.notes,
      });

      // Check for critical failures
      if (item.isCritical && item.score === 0) {
        failedCriticalItems.push({
          itemId: item.itemId,
          itemCode: item.itemCode,
          score: item.score,
          maxPoints: item.maxPoints,
          isCritical: true,
          notes: item.notes,
        });
      }

      // Check for CAPA triggers
      if (shouldCreateCAPA(item.score, item.maxPoints)) {
        const { priority, slaHours } = getCAPAPriority(item.score, item.isCritical);
        capaItems.push({
          itemId: item.itemId,
          itemCode: item.itemCode,
          question: item.question,
          score: item.score,
          priority,
          slaHours,
          isCritical: item.isCritical,
        });
      }

      // Track strengths (full score on critical items)
      if (item.score === item.maxPoints && item.isCritical) {
        strengths.push(`${item.itemCode}: ${item.question}`);
      }

      // Track weaknesses (50% or less)
      if (item.score <= item.maxPoints * 0.5 && item.maxPoints > 0) {
        weaknesses.push(`${item.itemCode}: ${item.question} (${item.score}/${item.maxPoints})`);
      }
    }

    const sectionPercentage = sectionMax > 0 ? (sectionEarned / sectionMax) * 100 : 0;
    
    processedSections.push({
      sectionId: section.sectionId,
      sectionName: section.sectionName,
      weight: section.weight,
      earnedPoints: sectionEarned,
      maxPoints: sectionMax,
      percentage: sectionPercentage,
      items: sectionItems,
    });

    // Calculate weighted contribution
    if (auditRules.scoring.weightedSections) {
      totalWeightedScore += (sectionPercentage / 100) * section.weight;
      totalWeight += section.weight;
    } else {
      totalWeightedScore += sectionEarned;
      totalWeight += sectionMax;
    }
  }

  // Calculate final percentage
  let percentage: number;
  if (auditRules.scoring.weightedSections) {
    percentage = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
  } else {
    percentage = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
  }

  // Check for critical failure override
  const criticalFailure = failedCriticalItems.length > 0 && auditRules.scoring.criticalItemRule.enabled;
  
  let finalPercentage = percentage;
  let gradeInfo: GradeInfo;
  
  if (criticalFailure) {
    finalPercentage = auditRules.scoring.criticalItemRule.failureScore;
    gradeInfo = {
      grade: auditRules.scoring.criticalItemRule.failureGrade,
      label: 'Kritik Başarısızlık',
      minScore: 0,
      maxScore: 0,
      color: '#ef4444',
    };
  } else {
    gradeInfo = getGrade(finalPercentage);
  }

  const passed = finalPercentage >= auditRules.scoring.passingScore && !criticalFailure;

  return {
    totalScore: Math.round(finalPercentage),
    maxScore: 100,
    percentage: Math.round(percentage * 10) / 10,
    grade: gradeInfo.grade,
    gradeLabel: gradeInfo.label,
    gradeColor: gradeInfo.color,
    passed,
    criticalFailure,
    failedCriticalItems,
    sections: processedSections,
    strengths: strengths.slice(0, 5), // Top 5 strengths
    weaknesses: weaknesses.slice(0, 5), // Top 5 weaknesses
    capaItems,
  };
}

/**
 * Validate CAPA status transition
 */
export function isValidCAPATransition(currentStatus: string, newStatus: string): boolean {
  const transitions = auditRules.statusFlow.allowedTransitions as Record<string, string[]>;
  const allowed = transitions[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
}

/**
 * Get CAPA status info
 */
export function getCAPAStatusInfo(status: string): { label: string; color: string } | null {
  const statusInfo = auditRules.statusFlow.capaStatuses.find(s => s.status === status);
  return statusInfo ? { label: statusInfo.label, color: statusInfo.color } : null;
}

/**
 * Get audit status info
 */
export function getAuditStatusInfo(status: string): { label: string; color: string } | null {
  const statusInfo = auditRules.statusFlow.auditStatuses.find(s => s.status === status);
  return statusInfo ? { label: statusInfo.label, color: statusInfo.color } : null;
}

/**
 * Calculate SLA deadline
 */
export function calculateSLADeadline(createdAt: Date, slaHours: number): Date {
  return new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
}

/**
 * Check if SLA is breached
 */
export function isSLABreached(dueDate: Date, completedDate?: Date): boolean {
  const checkDate = completedDate || new Date();
  return checkDate > dueDate;
}

/**
 * Get SLA status
 */
export function getSLAStatus(dueDate: Date, completedDate?: Date): 'on_track' | 'warning' | 'breached' {
  const now = completedDate || new Date();
  const hoursRemaining = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursRemaining < 0) return 'breached';
  if (hoursRemaining <= auditRules.notifications.onCapaSlaWarning.warningHoursBefore) return 'warning';
  return 'on_track';
}
