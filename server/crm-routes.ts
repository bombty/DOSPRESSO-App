import { Express } from "express";
import { db } from "./db";
import { 
  equipmentFaults, 
  users, 
  branches, 
  employeeSatisfactionScores, 
  customerFeedback,
  shiftAttendance,
  leaveRequests,
  userTrainingProgress,
  userQuizAttempts,
  tasks
} from "@shared/schema";
import { eq, and, gte, desc } from "drizzle-orm";

export function registerCRMRoutes(app: Express, isAuthenticated: any) {
  
  // CRM Overview - Aggregated metrics
  app.get('/api/crm/overview', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      // Only HQ roles can access CRM dashboard
      const hqRoles = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];
      if (!hqRoles.includes(user.role)) {
        return res.status(403).json({ message: "CRM Dashboard erişiminiz yok" });
      }

      // Get all faults for metrics
      const allFaults = await db.select().from(equipmentFaults);
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Calculate metrics
      const openTickets = allFaults.filter(f => f.status !== 'çözüldü' && f.status !== 'kapatıldı').length;
      const closedTickets = allFaults.filter(f => 
        (f.status === 'çözüldü' || f.status === 'kapatıldı') && 
        f.resolvedAt && new Date(f.resolvedAt) >= oneWeekAgo
      ).length;
      const unassignedTickets = allFaults.filter(f => !f.assignedTo && f.status !== 'çözüldü' && f.status !== 'kapatıldı').length;

      // Calculate average resolution time (in hours)
      const resolvedFaults = allFaults.filter(f => f.resolvedAt && f.createdAt);
      let avgResolutionTime = 0;
      if (resolvedFaults.length > 0) {
        const totalHours = resolvedFaults.reduce((sum, f) => {
          const created = new Date(f.createdAt!);
          const resolved = new Date(f.resolvedAt!);
          return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
        }, 0);
        avgResolutionTime = Math.round(totalHours / resolvedFaults.length);
      }

      // SLA compliance
      const slaTargets: Record<string, number> = { 'kritik': 4, 'yüksek': 24, 'orta': 48, 'düşük': 72 };
      const slaCompliantCount = resolvedFaults.filter(f => {
        const target = slaTargets[f.priority || 'orta'] || 48;
        const created = new Date(f.createdAt!);
        const resolved = new Date(f.resolvedAt!);
        const hours = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
        return hours <= target;
      }).length;
      const slaCompliance = resolvedFaults.length > 0 ? Math.round((slaCompliantCount / resolvedFaults.length) * 100) : 100;

      // Weekly comparison
      const ticketsThisWeek = allFaults.filter(f => f.createdAt && new Date(f.createdAt) >= oneWeekAgo).length;
      const ticketsLastWeek = allFaults.filter(f => 
        f.createdAt && 
        new Date(f.createdAt) >= twoWeeksAgo && 
        new Date(f.createdAt) < oneWeekAgo
      ).length;

      // Trend data (last 7 days)
      const trendData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const opened = allFaults.filter(f => 
          f.createdAt && f.createdAt.toISOString().split('T')[0] === dateStr
        ).length;
        const closed = allFaults.filter(f => 
          f.resolvedAt && new Date(f.resolvedAt).toISOString().split('T')[0] === dateStr
        ).length;
        trendData.push({ 
          date: date.toLocaleDateString('tr-TR', { weekday: 'short' }), 
          opened, 
          closed 
        });
      }

      // Priority breakdown
      const priorityBreakdown = [
        { priority: 'kritik', count: allFaults.filter(f => f.priority === 'kritik' && f.status !== 'çözüldü').length },
        { priority: 'yüksek', count: allFaults.filter(f => f.priority === 'yüksek' && f.status !== 'çözüldü').length },
        { priority: 'orta', count: allFaults.filter(f => f.priority === 'orta' && f.status !== 'çözüldü').length },
        { priority: 'düşük', count: allFaults.filter(f => f.priority === 'düşük' && f.status !== 'çözüldü').length }
      ];

      // Top agents
      const agentStats: Record<string, { resolved: number; totalTime: number }> = {};
      resolvedFaults.forEach(f => {
        if (f.assignedTo) {
          if (!agentStats[f.assignedTo]) {
            agentStats[f.assignedTo] = { resolved: 0, totalTime: 0 };
          }
          agentStats[f.assignedTo].resolved++;
          if (f.createdAt && f.resolvedAt) {
            agentStats[f.assignedTo].totalTime += (new Date(f.resolvedAt).getTime() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60);
          }
        }
      });

      const allUsers = await db.select().from(users);
      const topAgents = Object.entries(agentStats)
        .map(([id, stats]) => {
          const userInfo = allUsers.find(u => u.id === id);
          return {
            id,
            name: userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : 'Bilinmeyen',
            resolved: stats.resolved,
            avgTime: stats.resolved > 0 ? Math.round(stats.totalTime / stats.resolved) : 0
          };
        })
        .sort((a, b) => b.resolved - a.resolved)
        .slice(0, 5);

      res.json({
        openTickets,
        closedTickets,
        unassignedTickets,
        avgResolutionTime,
        slaCompliance,
        ticketsThisWeek,
        ticketsLastWeek,
        trendData,
        priorityBreakdown,
        topAgents
      });
    } catch (error: any) {
      console.error("Error fetching CRM overview:", error);
      res.status(500).json({ message: "CRM verileri yüklenemedi" });
    }
  });

  // CRM Tickets
  app.get('/api/crm/tickets', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      const hqRoles = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];
      if (!hqRoles.includes(user.role)) {
        return res.status(403).json({ message: "CRM erişiminiz yok" });
      }

      const allFaults = await db.select().from(equipmentFaults);
      const allBranches = await db.select().from(branches);
      const allUsers = await db.select().from(users);
      
      const now = new Date();
      const slaTargets: Record<string, number> = { 'kritik': 4, 'yüksek': 24, 'orta': 48, 'düşük': 72 };

      const tickets = allFaults.map(fault => {
        const branch = allBranches.find(b => b.id === fault.branchId);
        const assignee = fault.assignedTo ? allUsers.find(u => u.id === fault.assignedTo) : null;
        
        const slaHours = slaTargets[fault.priority || 'orta'] || 48;
        const createdAt = fault.createdAt ? new Date(fault.createdAt) : new Date();
        const slaDeadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
        const isSlaBreach = fault.status !== 'çözüldü' && fault.status !== 'kapatıldı' && now > slaDeadline;

        return {
          id: fault.id,
          type: 'fault' as const,
          title: fault.description?.slice(0, 50) || 'Arıza Bildirimi',
          description: fault.description || '',
          priority: fault.priority || 'orta',
          status: fault.status === 'çözüldü' || fault.status === 'kapatıldı' ? 'resolved' : 
                  fault.status === 'beklemede' ? 'pending' : 
                  fault.assignedTo ? 'in_progress' : 'open',
          branchName: branch?.name || 'Bilinmiyor',
          assignedTo: fault.assignedTo,
          assignedToName: assignee ? `${assignee.firstName} ${assignee.lastName}` : null,
          createdAt: fault.createdAt?.toISOString() || new Date().toISOString(),
          slaDeadline: slaDeadline.toISOString(),
          isSlaBreach
        };
      }).sort((a, b) => {
        if (a.isSlaBreach && !b.isSlaBreach) return -1;
        if (!a.isSlaBreach && b.isSlaBreach) return 1;
        const priorityOrder = { 'kritik': 0, 'yüksek': 1, 'orta': 2, 'düşük': 3 };
        return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
      });

      res.json(tickets);
    } catch (error: any) {
      console.error("Error fetching CRM tickets:", error);
      res.status(500).json({ message: "Talepler yüklenemedi" });
    }
  });

  // CRM Performance
  app.get('/api/crm/performance', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      const hqRoles = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];
      if (!hqRoles.includes(user.role)) {
        return res.status(403).json({ message: "CRM erişiminiz yok" });
      }

      const allFaults = await db.select().from(equipmentFaults);
      const allUsers = await db.select().from(users);
      const allBranches = await db.select().from(branches);
      const satisfactionScores = await db.select().from(employeeSatisfactionScores);

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Calculate per-agent stats
      const agentStats: Record<string, any> = {};
      
      allFaults.forEach(fault => {
        if (fault.assignedTo) {
          if (!agentStats[fault.assignedTo]) {
            agentStats[fault.assignedTo] = {
              resolved: 0,
              resolvedThisWeek: 0,
              resolvedLastWeek: 0,
              totalTime: 0,
              slaCompliant: 0
            };
          }
          
          if (fault.status === 'çözüldü' || fault.status === 'kapatıldı') {
            agentStats[fault.assignedTo].resolved++;
            
            if (fault.resolvedAt) {
              const resolvedDate = new Date(fault.resolvedAt);
              if (resolvedDate >= oneWeekAgo) {
                agentStats[fault.assignedTo].resolvedThisWeek++;
              } else if (resolvedDate >= twoWeeksAgo) {
                agentStats[fault.assignedTo].resolvedLastWeek++;
              }
              
              if (fault.createdAt) {
                const hours = (resolvedDate.getTime() - new Date(fault.createdAt).getTime()) / (1000 * 60 * 60);
                agentStats[fault.assignedTo].totalTime += hours;
                
                const slaTargets: Record<string, number> = { 'kritik': 4, 'yüksek': 24, 'orta': 48, 'düşük': 72 };
                if (hours <= (slaTargets[fault.priority || 'orta'] || 48)) {
                  agentStats[fault.assignedTo].slaCompliant++;
                }
              }
            }
          }
        }
      });

      // Build agent performance list
      const agents = Object.entries(agentStats).map(([userId, stats]) => {
        const userInfo = allUsers.find(u => u.id === userId);
        const satisfaction = satisfactionScores.find(s => s.userId === userId);
        const branch = userInfo?.branchId ? allBranches.find(b => b.id === userInfo.branchId) : null;

        return {
          id: userId,
          name: userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : 'Bilinmeyen',
          role: userInfo?.role || '',
          branchName: branch?.name,
          stats: {
            resolved: stats.resolved,
            avgResolutionTime: stats.resolved > 0 ? Math.round(stats.totalTime / stats.resolved) : 0,
            slaCompliance: stats.resolved > 0 ? Math.round((stats.slaCompliant / stats.resolved) * 100) : 100,
            taskRating: satisfaction?.taskSatisfactionAvg || 0,
            checklistCompletion: 0, // Calculated elsewhere
            compositeScore: satisfaction?.compositeScore || 0
          }
        };
      }).sort((a, b) => b.stats.compositeScore - a.stats.compositeScore);

      // Team stats
      const totalResolved = Object.values(agentStats).reduce((sum: number, s: any) => sum + s.resolved, 0);
      const totalTime = Object.values(agentStats).reduce((sum: number, s: any) => sum + s.totalTime, 0);
      const totalSlaCompliant = Object.values(agentStats).reduce((sum: number, s: any) => sum + s.slaCompliant, 0);
      const allTaskRatings = satisfactionScores.filter(s => s.taskSatisfactionAvg && s.taskSatisfactionAvg > 0);
      const avgTaskRating = allTaskRatings.length > 0 
        ? allTaskRatings.reduce((sum, s) => sum + (s.taskSatisfactionAvg || 0), 0) / allTaskRatings.length 
        : 0;

      // Weekly comparison data
      const weeklyComparison = [
        { name: 'Pzt', thisWeek: 0, lastWeek: 0 },
        { name: 'Sal', thisWeek: 0, lastWeek: 0 },
        { name: 'Çar', thisWeek: 0, lastWeek: 0 },
        { name: 'Per', thisWeek: 0, lastWeek: 0 },
        { name: 'Cum', thisWeek: 0, lastWeek: 0 },
        { name: 'Cmt', thisWeek: 0, lastWeek: 0 },
        { name: 'Paz', thisWeek: 0, lastWeek: 0 }
      ];

      allFaults.forEach(fault => {
        if (fault.resolvedAt) {
          const resolved = new Date(fault.resolvedAt);
          const dayIndex = (resolved.getDay() + 6) % 7;
          if (resolved >= oneWeekAgo) {
            weeklyComparison[dayIndex].thisWeek++;
          } else if (resolved >= twoWeeksAgo) {
            weeklyComparison[dayIndex].lastWeek++;
          }
        }
      });

      res.json({
        agents,
        teamStats: {
          totalResolved,
          avgResolutionTime: totalResolved > 0 ? Math.round(totalTime / totalResolved) : 0,
          avgSlaCompliance: totalResolved > 0 ? Math.round((totalSlaCompliant / totalResolved) * 100) : 100,
          avgTaskRating
        },
        weeklyComparison
      });
    } catch (error: any) {
      console.error("Error fetching CRM performance:", error);
      res.status(500).json({ message: "Performans verileri yüklenemedi" });
    }
  });

  // CRM SLA
  app.get('/api/crm/sla', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      const hqRoles = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];
      if (!hqRoles.includes(user.role)) {
        return res.status(403).json({ message: "CRM erişiminiz yok" });
      }

      const allFaults = await db.select().from(equipmentFaults);
      const allBranches = await db.select().from(branches);
      
      const now = new Date();
      const slaTargets: Record<string, number> = { 'kritik': 4, 'yüksek': 24, 'orta': 48, 'düşük': 72 };

      const activeFaults = allFaults.filter(f => f.status !== 'çözüldü' && f.status !== 'kapatıldı');
      
      const items = activeFaults.map(fault => {
        const branch = allBranches.find(b => b.id === fault.branchId);
        const slaHours = slaTargets[fault.priority || 'orta'] || 48;
        const createdAt = fault.createdAt ? new Date(fault.createdAt) : new Date();
        const slaDeadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
        const hoursRemaining = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        let status: 'on_track' | 'warning' | 'breached' = 'on_track';
        if (hoursRemaining < 0) status = 'breached';
        else if (hoursRemaining <= slaHours * 0.25) status = 'warning';

        return {
          id: fault.id,
          type: 'fault',
          title: fault.description?.slice(0, 50) || 'Arıza',
          priority: fault.priority || 'orta',
          branchName: branch?.name || 'Bilinmiyor',
          createdAt: fault.createdAt?.toISOString() || new Date().toISOString(),
          slaDeadline: slaDeadline.toISOString(),
          status,
          hoursRemaining: Math.round(hoursRemaining)
        };
      }).sort((a, b) => a.hoursRemaining - b.hoursRemaining);

      const onTrack = items.filter(i => i.status === 'on_track').length;
      const warning = items.filter(i => i.status === 'warning').length;
      const breached = items.filter(i => i.status === 'breached').length;

      const resolvedFaults = allFaults.filter(f => f.resolvedAt);
      const compliantCount = resolvedFaults.filter(f => {
        const target = slaTargets[f.priority || 'orta'] || 48;
        if (f.createdAt && f.resolvedAt) {
          const hours = (new Date(f.resolvedAt).getTime() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60);
          return hours <= target;
        }
        return true;
      }).length;
      const complianceRate = resolvedFaults.length > 0 ? Math.round((compliantCount / resolvedFaults.length) * 100) : 100;

      const prioritySLA = Object.entries(slaTargets).map(([priority, target]) => {
        const priorityFaults = resolvedFaults.filter(f => f.priority === priority);
        if (priorityFaults.length === 0) return { priority, target, actual: 0 };
        
        const avgTime = priorityFaults.reduce((sum, f) => {
          if (f.createdAt && f.resolvedAt) {
            return sum + (new Date(f.resolvedAt).getTime() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60);
          }
          return sum;
        }, 0) / priorityFaults.length;
        
        return { priority, target, actual: Math.round(avgTime) };
      });

      res.json({
        totalActive: items.length,
        onTrack,
        warning,
        breached,
        complianceRate,
        avgResolutionHours: resolvedFaults.length > 0 ? Math.round(
          resolvedFaults.reduce((sum, f) => {
            if (f.createdAt && f.resolvedAt) {
              return sum + (new Date(f.resolvedAt).getTime() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60);
            }
            return sum;
          }, 0) / resolvedFaults.length
        ) : 0,
        items,
        prioritySLA
      });
    } catch (error: any) {
      console.error("Error fetching CRM SLA:", error);
      res.status(500).json({ message: "SLA verileri yüklenemedi" });
    }
  });

  // CRM Feedback
  app.get('/api/crm/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      
      const hqRoles = ['admin', 'muhasebe', 'satinalma', 'coach', 'teknik', 'destek', 'fabrika', 'yatirimci_hq'];
      if (!hqRoles.includes(user.role)) {
        return res.status(403).json({ message: "CRM erişiminiz yok" });
      }

      let feedbackData: any[] = [];
      try {
        feedbackData = await db.select().from(customerFeedback);
      } catch (e) {
        // Table might not exist
      }

      const allBranches = await db.select().from(branches);

      const totalFeedback = feedbackData.length;
      const ratingsWithValue = feedbackData.filter(f => f.rating && f.rating > 0);
      const averageRating = ratingsWithValue.length > 0 
        ? ratingsWithValue.reduce((sum, f) => sum + (f.rating || 0), 0) / ratingsWithValue.length 
        : 0;
      const positiveRate = ratingsWithValue.length > 0
        ? Math.round((ratingsWithValue.filter(f => (f.rating || 0) >= 4).length / ratingsWithValue.length) * 100)
        : 0;

      const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
        rating,
        count: feedbackData.filter(f => f.rating === rating).length
      }));

      const branchRatings: Record<number, { sum: number; count: number }> = {};
      feedbackData.forEach(f => {
        if (f.branchId && f.rating) {
          if (!branchRatings[f.branchId]) {
            branchRatings[f.branchId] = { sum: 0, count: 0 };
          }
          branchRatings[f.branchId].sum += f.rating;
          branchRatings[f.branchId].count++;
        }
      });

      const branchRankings = Object.entries(branchRatings)
        .map(([branchId, stats]) => {
          const branch = allBranches.find(b => b.id === parseInt(branchId));
          return {
            branchName: branch?.name || 'Bilinmiyor',
            avgRating: stats.count > 0 ? stats.sum / stats.count : 0,
            count: stats.count
          };
        })
        .sort((a, b) => b.avgRating - a.avgRating);

      const recentFeedback = feedbackData
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 10)
        .map(f => {
          const branch = f.branchId ? allBranches.find(b => b.id === f.branchId) : null;
          return {
            id: f.id,
            rating: f.rating || 0,
            comment: f.comment || '',
            branchName: branch?.name || 'Bilinmiyor',
            createdAt: f.createdAt?.toISOString() || new Date().toISOString(),
            source: f.source || 'web'
          };
        });

      res.json({
        averageRating,
        totalFeedback,
        positiveRate,
        ratingDistribution,
        recentFeedback,
        branchRankings
      });
    } catch (error: any) {
      console.error("Error fetching CRM feedback:", error);
      res.status(500).json({ message: "Geri bildirim verileri yüklenemedi" });
    }
  });

  // GET /api/crm/my-stats - Çalışanın kişisel istatistikleri (şube/fabrika personeli için)
  app.get('/api/crm/my-stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user!;
      const userId = user.id;
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // 1. Vardiya/Devam İstatistikleri
      const allAttendance = await db.select()
        .from(shiftAttendance)
        .where(eq(shiftAttendance.userId, userId));
      
      const recentAttendance = allAttendance.filter(a => 
        a.checkInTime && new Date(a.checkInTime) >= oneMonthAgo
      );
      
      const lateArrivals = recentAttendance.filter(a => (a.latenessMinutes || 0) > 0).length;
      const earlyDepartures = recentAttendance.filter(a => (a.earlyLeaveMinutes || 0) > 0).length;
      const totalShifts = recentAttendance.length;
      const onTimeRate = totalShifts > 0 
        ? Math.round(((totalShifts - lateArrivals) / totalShifts) * 100) 
        : 100;

      // 2. İzin Durumu
      const userLeaves = await db.select()
        .from(leaveRequests)
        .where(eq(leaveRequests.userId, userId));
      
      const currentYear = now.getFullYear();
      const thisYearLeaves = userLeaves.filter(l => {
        const start = l.startDate ? new Date(l.startDate) : null;
        return start && start.getFullYear() === currentYear;
      });
      
      const approvedLeaves = thisYearLeaves.filter(l => l.status === 'onaylandı' || l.status === 'approved');
      const pendingLeaves = thisYearLeaves.filter(l => l.status === 'beklemede' || l.status === 'pending');
      const totalLeaveDays = approvedLeaves.reduce((sum, l) => {
        const start = l.startDate ? new Date(l.startDate) : new Date();
        const end = l.endDate ? new Date(l.endDate) : new Date();
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return sum + days;
      }, 0);
      const remainingLeave = Math.max(0, 14 - totalLeaveDays); // Varsayılan yıllık izin: 14 gün

      // 3. Eğitim İlerlemesi
      const trainingProgress = await db.select()
        .from(userTrainingProgress)
        .where(eq(userTrainingProgress.userId, userId));
      
      const completedModules = trainingProgress.filter(p => p.completedAt).length;
      const inProgressModules = trainingProgress.filter(p => !p.completedAt && (p.progressPercentage || 0) > 0).length;
      const totalModules = trainingProgress.length;
      
      // Quiz attempts
      const quizAttempts = await db.select()
        .from(userQuizAttempts)
        .where(eq(userQuizAttempts.userId, userId));
      
      const passedQuizzes = quizAttempts.filter(a => a.isPassed).length;
      const totalQuizAttempts = quizAttempts.length;

      // 4. Görev İstatistikleri
      const userTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.assignedToId, userId));
      
      const recentTasks = userTasks.filter(t => 
        t.createdAt && new Date(t.createdAt) >= threeMonthsAgo
      );
      
      const completedTasks = recentTasks.filter(t => t.status === 'tamamlandı' || t.status === 'completed').length;
      const pendingTasks = recentTasks.filter(t => t.status === 'beklemede' || t.status === 'pending').length;
      const inProgressTasks = recentTasks.filter(t => t.status === 'devam_ediyor' || t.status === 'in_progress').length;
      const taskCompletionRate = recentTasks.length > 0 
        ? Math.round((completedTasks / recentTasks.length) * 100) 
        : 100;

      // 5. Performans Skoru
      const satisfactionScore = await db.select()
        .from(employeeSatisfactionScores)
        .where(eq(employeeSatisfactionScores.userId, userId))
        .limit(1);
      
      const performanceScore = satisfactionScore[0]?.compositeScore || 0;
      const taskRating = satisfactionScore[0]?.taskSatisfactionAvg || 0;

      // 6. Şube bilgisi
      let branchName = 'Bilinmiyor';
      if (user.branchId) {
        const branch = await db.select()
          .from(branches)
          .where(eq(branches.id, user.branchId))
          .limit(1);
        branchName = branch[0]?.name || 'Bilinmiyor';
      }

      res.json({
        user: {
          name: user.name || user.username,
          role: user.role,
          branchName
        },
        attendance: {
          totalShifts,
          lateArrivals,
          earlyDepartures,
          onTimeRate
        },
        leave: {
          usedDays: totalLeaveDays,
          remainingDays: remainingLeave,
          pendingRequests: pendingLeaves.length,
          approvedThisYear: approvedLeaves.length
        },
        training: {
          completedModules,
          inProgressModules,
          totalModules,
          passedQuizzes,
          totalQuizAttempts
        },
        tasks: {
          completed: completedTasks,
          pending: pendingTasks,
          inProgress: inProgressTasks,
          completionRate: taskCompletionRate
        },
        performance: {
          compositeScore: performanceScore,
          taskRating: taskRating
        }
      });
    } catch (error: any) {
      console.error("Error fetching personal CRM stats:", error);
      res.status(500).json({ message: "Kişisel istatistikler yüklenemedi" });
    }
  });
}
