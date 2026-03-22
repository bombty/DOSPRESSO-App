import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { handleApiError } from "./helpers";
import { eq, max } from "drizzle-orm";
import {
  users,
  shiftAttendance,
  employeeLeaves,
  publicHolidays,
} from "@shared/schema";

const router = Router();

  // ==========================================
  // TEST VERİLERİ OLUŞTURMA API'SI
  // ==========================================

  // POST /api/seed-attendance-test - Test için mesai verileri oluştur (sadece admin)
  router.post('/api/seed-attendance-test', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Erişim yetkiniz yok' });
      }

      // Tüm aktif çalışanları al
      const allUsers = await db.select().from(users).where(eq(users.isActive, true));
      const branchUsers = allUsers.filter(u => ['supervisor', 'supervisor_buddy', 'barista', 'bar_buddy', 'stajyer'].includes(u.role || ''));

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth(); // 0-indexed

      // Her çalışan için izin bakiyesi oluştur
      const leaveData = branchUsers.map((u, idx) => ({
        userId: u.id,
        year: currentYear,
        leaveType: 'annual',
        totalDays: 14,
        usedDays: Math.floor(Math.random() * 8), // 0-7 gün kullanılmış
        remainingDays: 14 - Math.floor(Math.random() * 8),
        carriedOver: idx % 3 === 0 ? 2 : 0, // Bazılarına geçen yıldan aktarma
      }));

      // Mevcut izin bakiyelerini temizle ve yenilerini ekle
      await db.delete(employeeLeaves).where(eq(employeeLeaves.year, currentYear));
      if (leaveData.length > 0) {
        await db.insert(employeeLeaves).values(leaveData);
      }

      // 2025 Türkiye resmi tatilleri
      const turkeyHolidays = [
        { name: "Yılbaşı", date: "2025-01-01", year: 2025, isHalfDay: false },
        { name: "Ulusal Egemenlik ve Çocuk Bayramı", date: "2025-04-23", year: 2025, isHalfDay: false },
        { name: "Emek ve Dayanışma Günü", date: "2025-05-01", year: 2025, isHalfDay: false },
        { name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", date: "2025-05-19", year: 2025, isHalfDay: false },
        { name: "Ramazan Bayramı 1. Gün", date: "2025-03-30", year: 2025, isHalfDay: false },
        { name: "Ramazan Bayramı 2. Gün", date: "2025-03-31", year: 2025, isHalfDay: false },
        { name: "Ramazan Bayramı 3. Gün", date: "2025-04-01", year: 2025, isHalfDay: false },
        { name: "Kurban Bayramı 1. Gün", date: "2025-06-06", year: 2025, isHalfDay: false },
        { name: "Kurban Bayramı 2. Gün", date: "2025-06-07", year: 2025, isHalfDay: false },
        { name: "Kurban Bayramı 3. Gün", date: "2025-06-08", year: 2025, isHalfDay: false },
        { name: "Kurban Bayramı 4. Gün", date: "2025-06-09", year: 2025, isHalfDay: false },
        { name: "Demokrasi ve Milli Birlik Günü", date: "2025-07-15", year: 2025, isHalfDay: false },
        { name: "Zafer Bayramı", date: "2025-08-30", year: 2025, isHalfDay: false },
        { name: "Cumhuriyet Bayramı", date: "2025-10-29", year: 2025, isHalfDay: false },
      ];

      // Mevcut tatilleri temizle ve yenilerini ekle
      await db.delete(publicHolidays).where(eq(publicHolidays.year, 2025));
      await db.insert(publicHolidays).values(turkeyHolidays);

      // Her çalışan için rastgele mesai verileri oluştur
      const attendanceData: any[] = [];
      const startDate = new Date(currentYear, currentMonth - 1, 1); // Geçen ayın başı
      const endDate = new Date(currentYear, currentMonth + 1, 0); // Bu ayın sonu

      for (const u of branchUsers) {
        // Her çalışan için farklı özellikler
        const isLateOften = Math.random() > 0.7; // %30 sıklıkla geç kalıyor
        const worksOvertime = Math.random() > 0.5; // %50 fazla mesai yapıyor
        const hasAbsences = Math.random() > 0.8; // %20 devamsızlık var

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          // Hafta sonu çalışma yok (bazıları hariç)
          if (d.getDay() === 0) continue; // Pazar
          if (d.getDay() === 6 && Math.random() > 0.3) continue; // Cumartesi %70 çalışmıyor

          // Devamsızlık kontrolü
          if (hasAbsences && Math.random() > 0.9) continue; // %10 ihtimalle devamsız

          // Vardiya saatleri (normal: 09:00-18:00)
          const baseCheckIn = 9 * 60; // 09:00 dakika cinsinden
          const baseCheckOut = 18 * 60; // 18:00 dakika cinsinden

          // Geç kalma
          let checkInMinutes = baseCheckIn;
          if (isLateOften && Math.random() > 0.6) {
            checkInMinutes += Math.floor(Math.random() * 30) + 5; // 5-35 dk geç
          }

          // Fazla mesai
          let checkOutMinutes = baseCheckOut;
          if (worksOvertime && Math.random() > 0.5) {
            checkOutMinutes += Math.floor(Math.random() * 120) + 30; // 30-150 dk fazla
          }

          const checkInTime = `${Math.floor(checkInMinutes / 60).toString().padStart(2, '0')}:${(checkInMinutes % 60).toString().padStart(2, '0')}`;
          const checkOutTime = `${Math.floor(checkOutMinutes / 60).toString().padStart(2, '0')}:${(checkOutMinutes % 60).toString().padStart(2, '0')}`;
          
          const workedMinutes = checkOutMinutes - checkInMinutes - 60; // 1 saat mola
          const overtime = workedMinutes > 480 ? workedMinutes - 480 : 0; // 8 saatten fazlası

          attendanceData.push({
            date: d.toISOString().split('T')[0],
            userId: u.id,
            branchId: u.branchId,
            checkInTime,
            checkOutTime,
            status: checkInMinutes > baseCheckIn + 5 ? 'late' : 'present',
            latenessMinutes: checkInMinutes > baseCheckIn ? checkInMinutes - baseCheckIn : 0,
            workedMinutes,
            overtimeMinutes: overtime,
            complianceScore: checkInMinutes <= baseCheckIn + 5 ? 100 : Math.max(60, 100 - (checkInMinutes - baseCheckIn)),
            notes: overtime > 60 ? 'Fazla mesai yapıldı' : null,
          });
        }
      }

      // Mevcut mesai kayıtlarını temizle ve yenilerini ekle
      if (attendanceData.length > 0) {
        // Sadece test verilerini ekle (mevcut verileri silme)
        await db.insert(shiftAttendance).values(attendanceData).onConflictDoNothing();
      }

      res.json({
        success: true,
        message: "Test verileri oluşturuldu",
        stats: {
          employeeLeaves: leaveData.length,
          publicHolidays: turkeyHolidays.length,
          attendanceRecords: attendanceData.length,
          branchUsers: branchUsers.length,
        }
      });
    } catch (error: unknown) {
      handleApiError(res, error, "SeedTestData");
    }
  });


export default router;
