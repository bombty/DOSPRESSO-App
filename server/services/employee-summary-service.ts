import { db } from "../db";
import { users, userTrainingProgress, quizResults, branchTaskInstances, pdksRecords, tasks } from "@shared/schema";
import { eq, and, gte, isNull, sql, desc, or, count } from "drizzle-orm";

export interface TrainingMetrics {
  totalAssigned: number;
  completed: number;
  completionRate: number;
  avgQuizScore: number;
  lastActivity: string | null;
}

export interface TaskMetrics {
  totalAssigned: number;
  completed: number;
  completionRate: number;
  overdue: number;
}

export interface BranchTaskMetrics {
  claimed: number;
  completed: number;
  completionRate: number;
}

export interface AttendanceMetrics {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  attendanceRate: number;
}

export interface ScoreBreakdown {
  training: number;
  tasks: number;
  branchTasks: number;
  attendance: number;
}

export interface EmployeeSummary {
  userId: string;
  fullName: string;
  role: string;
  branchId: number | null;
  branchName: string | null;
  training: TrainingMetrics;
  tasks: TaskMetrics;
  branchTasks: BranchTaskMetrics;
  attendance: AttendanceMetrics;
  overallScore: number;
  scoreBreakdown: ScoreBreakdown;
}

async function getTrainingMetrics(userId: string): Promise<TrainingMetrics> {
  try {
    const progress = await db.select().from(userTrainingProgress)
      .where(eq(userTrainingProgress.userId, userId));

    const totalAssigned = progress.length;
    const completed = progress.filter(p => p.status === 'completed').length;
    const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : -1;

    const lastAccessed = progress
      .map(p => p.lastAccessedAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
    const lastActivity = lastAccessed.length > 0 ? lastAccessed[0]!.toISOString() : null;

    const quizScores = await db.select({ score: quizResults.score })
      .from(quizResults)
      .where(eq(quizResults.userId, userId));
    
    const validScores = quizScores.filter(q => q.score != null).map(q => Number(q.score));
    const avgQuizScore = validScores.length > 0 
      ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) 
      : -1;

    return { totalAssigned, completed, completionRate, avgQuizScore, lastActivity };
  } catch {
    return { totalAssigned: 0, completed: 0, completionRate: -1, avgQuizScore: -1, lastActivity: null };
  }
}

async function getTaskMetrics(userId: string, sinceDate: Date): Promise<TaskMetrics> {
  try {
    const allTasks = await db.select({
      status: tasks.status,
      dueDate: tasks.dueDate,
    }).from(tasks)
      .where(and(
        eq(tasks.assignedToId, userId),
        gte(tasks.createdAt, sinceDate)
      ));

    const totalAssigned = allTasks.length;
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const overdue = allTasks.filter(t => 
      t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()
    ).length;
    const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : -1;

    return { totalAssigned, completed, completionRate, overdue };
  } catch {
    return { totalAssigned: 0, completed: 0, completionRate: -1, overdue: 0 };
  }
}

async function getBranchTaskMetrics(userId: string, sinceDate: Date): Promise<BranchTaskMetrics> {
  try {
    const claimed = await db.select({ id: branchTaskInstances.id })
      .from(branchTaskInstances)
      .where(and(
        eq(branchTaskInstances.claimedByUserId, userId),
        gte(branchTaskInstances.createdAt, sinceDate)
      ));

    const completedTasks = await db.select({ id: branchTaskInstances.id })
      .from(branchTaskInstances)
      .where(and(
        eq(branchTaskInstances.completedByUserId, userId),
        gte(branchTaskInstances.createdAt, sinceDate)
      ));

    const claimedCount = claimed.length;
    const completedCount = completedTasks.length;
    const completionRate = claimedCount > 0 ? Math.round((completedCount / claimedCount) * 100) : -1;

    return { claimed: claimedCount, completed: completedCount, completionRate };
  } catch {
    return { claimed: 0, completed: 0, completionRate: -1 };
  }
}

async function getAttendanceMetrics(userId: string, sinceDate: Date): Promise<AttendanceMetrics> {
  try {
    const records = await db.select({
      recordDate: pdksRecords.recordDate,
      recordType: pdksRecords.recordType,
    }).from(pdksRecords)
      .where(and(
        eq(pdksRecords.userId, userId),
        gte(pdksRecords.recordDate, sinceDate)
      ));

    const uniqueDates = new Set(records.map(r => r.recordDate?.toString()));
    const totalDays = uniqueDates.size;
    const lateDays = records.filter(r => r.recordType === 'late' || r.recordType === 'gec_giris').length;
    const presentDays = totalDays;
    const attendanceRate = totalDays > 0 ? Math.min(100, Math.round((presentDays / 30) * 100)) : -1;

    return { totalDays, presentDays, lateDays, attendanceRate };
  } catch {
    return { totalDays: 0, presentDays: 0, lateDays: 0, attendanceRate: -1 };
  }
}

function computeOverallScore(
  training: TrainingMetrics,
  taskMetrics: TaskMetrics,
  branchTasks: BranchTaskMetrics,
  attendance: AttendanceMetrics
): { overallScore: number; scoreBreakdown: ScoreBreakdown } {
  const weights = { training: 0.25, tasks: 0.25, branchTasks: 0.20, attendance: 0.30 };
  let totalWeight = 0;
  let weightedSum = 0;

  const trainingScore = training.completionRate >= 0
    ? (training.completionRate * 0.6 + (training.avgQuizScore >= 0 ? training.avgQuizScore * 0.4 : training.completionRate * 0.4))
    : -1;

  const taskScore = taskMetrics.completionRate >= 0 ? taskMetrics.completionRate : -1;
  const branchTaskScore = branchTasks.completionRate >= 0 ? branchTasks.completionRate : -1;
  const attendanceScore = attendance.attendanceRate >= 0
    ? Math.max(0, attendance.attendanceRate - (attendance.lateDays * 2))
    : -1;

  if (trainingScore >= 0) { weightedSum += trainingScore * weights.training; totalWeight += weights.training; }
  if (taskScore >= 0) { weightedSum += taskScore * weights.tasks; totalWeight += weights.tasks; }
  if (branchTaskScore >= 0) { weightedSum += branchTaskScore * weights.branchTasks; totalWeight += weights.branchTasks; }
  if (attendanceScore >= 0) { weightedSum += attendanceScore * weights.attendance; totalWeight += weights.attendance; }

  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return {
    overallScore,
    scoreBreakdown: {
      training: trainingScore >= 0 ? Math.round(trainingScore) : 0,
      tasks: taskScore >= 0 ? Math.round(taskScore) : 0,
      branchTasks: branchTaskScore >= 0 ? Math.round(branchTaskScore) : 0,
      attendance: attendanceScore >= 0 ? Math.round(attendanceScore) : 0,
    }
  };
}

export async function getEmployeeSummary(userId: string, days: number = 30): Promise<EmployeeSummary | null> {
  const [user] = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    role: users.role,
    branchId: users.branchId,
  }).from(users)
    .where(and(eq(users.id, userId), eq(users.isActive, true)));

  if (!user) return null;

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const [training, taskMetrics, branchTasks, attendance] = await Promise.all([
    getTrainingMetrics(userId),
    getTaskMetrics(userId, sinceDate),
    getBranchTaskMetrics(userId, sinceDate),
    getAttendanceMetrics(userId, sinceDate),
  ]);

  const { overallScore, scoreBreakdown } = computeOverallScore(training, taskMetrics, branchTasks, attendance);

  return {
    userId: user.id,
    fullName: `${user.firstName} ${user.lastName}`,
    role: user.role || 'barista',
    branchId: user.branchId,
    branchName: null,
    training,
    tasks: taskMetrics,
    branchTasks,
    attendance,
    overallScore,
    scoreBreakdown,
  };
}

export async function getBranchEmployeeSummaries(branchId: number, days: number = 30): Promise<EmployeeSummary[]> {
  const branchUsers = await db.select({
    id: users.id,
  }).from(users)
    .where(and(
      eq(users.branchId, branchId),
      eq(users.isActive, true),
      isNull(users.deletedAt)
    ));

  const summaries = await Promise.all(
    branchUsers.map(u => getEmployeeSummary(u.id, days))
  );

  return summaries
    .filter((s): s is EmployeeSummary => s !== null)
    .sort((a, b) => b.overallScore - a.overallScore);
}
