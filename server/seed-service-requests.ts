import { db } from "./db";
import { equipmentServiceRequests, users, equipment, branches } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export async function seedServiceRequests() {
  try {
    const [existing] = await db.select({ cnt: sql`count(*)::int` }).from(equipmentServiceRequests);
    if (existing && (existing as any).cnt > 0) {
      console.log(`✅ Service requests already seeded (${(existing as any).cnt} records). Skipping.`);
      return;
    }
    console.log("🌱 Seeding service requests...");

    // Get users for createdById and updatedById
    const adminUser = await db.select().from(users).where(eq(users.username, "admin"));
    const allUsers = await db.select().from(users).limit(10);
    
    if (adminUser.length === 0 || allUsers.length < 2) {
      console.log("⚠ Insufficient users for seeding service requests");
      return;
    }

    // Get equipment from different branches
    const equipmentList = await db.select().from(equipment).limit(10);
    if (equipmentList.length === 0) {
      console.log("⚠ No equipment found for seeding service requests");
      return;
    }

    const now = new Date();
    const requests = [
      {
        equipmentId: equipmentList[0]?.id || 1,
        serviceDecision: "branch",
        serviceProvider: "ACS Teknik Servis",
        contactInfo: "+90 542 111 1111",
        estimatedCost: "1500.00",
        actualCost: null,
        notes: "Espresso makinesi basınç problemi",
        status: "talep_edildi",
        createdById: adminUser[0].id,
        updatedById: adminUser[0].id,
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        equipmentId: equipmentList[1]?.id || 2,
        serviceDecision: "hq",
        serviceProvider: "Reparex Elektrik",
        contactInfo: "+90 542 222 2222",
        estimatedCost: "3500.00",
        actualCost: "3750.00",
        notes: "Kahve değirmeni motor arızası - değiştirildi",
        status: "tamamlandi",
        createdById: allUsers[0]?.id || adminUser[0].id,
        updatedById: allUsers[1]?.id || adminUser[0].id,
        createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        equipmentId: equipmentList[2]?.id || 3,
        serviceDecision: "branch",
        serviceProvider: "Bulaşık Makinesi Servis Ltd",
        contactInfo: "+90 542 333 3333",
        estimatedCost: "2000.00",
        actualCost: null,
        notes: "Bulaşık makinesi filtreleri temizleniyor",
        status: "devam_ediyor",
        createdById: allUsers[2]?.id || adminUser[0].id,
        updatedById: allUsers[3]?.id || allUsers[2]?.id || adminUser[0].id,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      },
      {
        equipmentId: equipmentList[3]?.id || 4,
        serviceDecision: "hq",
        serviceProvider: "Yazıcı Türk Servis",
        contactInfo: "+90 542 444 4444",
        estimatedCost: "800.00",
        actualCost: "800.00",
        notes: "Yazıcı toneri değiştirildi - kalite testi yapıldı",
        status: "tamamlandi",
        createdById: adminUser[0].id,
        updatedById: allUsers[0]?.id || adminUser[0].id,
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        equipmentId: equipmentList[4]?.id || 5,
        serviceDecision: "branch",
        serviceProvider: "Su Arıtma Sistemleri A.Ş",
        contactInfo: "+90 542 555 5555",
        estimatedCost: "2500.00",
        actualCost: null,
        notes: "Su filtresi değiştirilmesi ve sistem kontrol edilecek",
        status: "planlandi",
        createdById: allUsers[1]?.id || adminUser[0].id,
        updatedById: allUsers[1]?.id || adminUser[0].id,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        equipmentId: equipmentList[5]?.id || 6,
        serviceDecision: "hq",
        serviceProvider: "Soğutma Sistemleri Pro",
        contactInfo: "+90 542 666 6666",
        estimatedCost: "4000.00",
        actualCost: null,
        notes: "Buzdolabı kompresörü arızalı - yedek sipariş edildi",
        status: "devam_ediyor",
        createdById: allUsers[2]?.id || adminUser[0].id,
        updatedById: allUsers[3]?.id || allUsers[2]?.id || adminUser[0].id,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
    ];

    for (const req of requests) {
      await db.insert(equipmentServiceRequests).values(req);
    }

    console.log(`✅ Service requests seed completed: ${requests.length} requests created`);
  } catch (error) {
    console.error("Error seeding service requests:", error);
  }
}
