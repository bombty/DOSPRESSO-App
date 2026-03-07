import { Router, Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const router = Router();

router.get('/api/setup/status', async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`SELECT count(*)::int as cnt FROM users`);
    const userCount = (result.rows[0] as any)?.cnt || 0;

    const branchResult = await db.execute(sql`SELECT count(*)::int as cnt FROM branches`);
    const branchCount = (branchResult.rows[0] as any)?.cnt || 0;

    const roleResult = await db.execute(sql`SELECT count(*)::int as cnt FROM roles`);
    const roleCount = (roleResult.rows[0] as any)?.cnt || 0;

    res.json({
      isFirstSetup: userCount === 0,
      stats: { users: userCount, branches: branchCount, roles: roleCount },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/setup/initialize', async (req: Request, res: Response) => {
  try {
    const userCountResult = await db.execute(sql`SELECT count(*)::int as cnt FROM users`);
    const userCount = (userCountResult.rows[0] as any)?.cnt || 0;
    if (userCount > 0) {
      return res.status(409).json({ error: 'Sistem zaten kurulmuş. İlk kurulum sadece boş veritabanında çalışır.' });
    }

    const { companyName, adminEmail, adminPassword, branches, loadDefaults, loadDemo } = req.body;

    if (!adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Admin email ve şifre gerekli' });
    }

    if (adminPassword.length < 8) {
      return res.status(400).json({ error: 'Şifre en az 8 karakter olmalı' });
    }

    if (companyName) {
      await db.execute(sql`
        INSERT INTO site_settings (key, value, updated_at) 
        VALUES ('company_name', ${companyName}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${companyName}, updated_at = NOW()
      `).catch(() => {});
    }

    const adminId = randomUUID();
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await db.execute(sql`
      INSERT INTO users (id, username, email, password, role, "firstName", "lastName", "isActive", "accountStatus")
      VALUES (${adminId}, 'admin', ${adminEmail}, ${hashedPassword}, 'admin', 'Admin', 'User', true, 'approved')
    `);

    if (branches && Array.isArray(branches) && branches.length > 0) {
      for (const branch of branches) {
        if (branch.name) {
          await db.execute(sql`
            INSERT INTO branches (name, address, city, phone, email, status)
            VALUES (${branch.name}, ${branch.address || ''}, ${branch.city || ''}, ${branch.phone || ''}, ${branch.email || ''}, 'active')
            ON CONFLICT DO NOTHING
          `).catch(() => {});
        }
      }
    }

    if (loadDefaults) {
      await loadDefaultData();
    }

    if (loadDemo) {
      await loadDemoData();
    }

    res.json({ success: true, adminId });
  } catch (error: any) {
    res.status(500).json({ error: 'Kurulum hatası: ' + error.message });
  }
});

async function loadDefaultData() {
  try {
    const defaultPositions = [
      { name: 'Barista', category: 'branch', description: 'Kahve hazırlama uzmanı' },
      { name: 'Vardiya Sorumlusu', category: 'branch', description: 'Vardiya yönetimi' },
      { name: 'Şube Müdürü', category: 'branch', description: 'Şube operasyonları yönetimi' },
      { name: 'Kasiyer', category: 'branch', description: 'Kasa işlemleri' },
      { name: 'Depocu', category: 'branch', description: 'Depo ve stok yönetimi' },
    ];

    for (const pos of defaultPositions) {
      await db.execute(sql`
        INSERT INTO titles (name, category, description)
        VALUES (${pos.name}, ${pos.category}, ${pos.description})
        ON CONFLICT DO NOTHING
      `).catch(() => {});
    }
  } catch (error) {
    console.error('[Setup] Default data loading error:', error);
  }
}

async function loadDemoData() {
  try {
    const demoUsers = [
      { username: 'demo_barista', firstName: 'Ali', lastName: 'Yılmaz', role: 'barista', email: 'barista@demo.com' },
      { username: 'demo_mudur', firstName: 'Ayşe', lastName: 'Demir', role: 'branch_manager', email: 'mudur@demo.com' },
      { username: 'demo_coach', firstName: 'Mehmet', lastName: 'Kaya', role: 'coach', email: 'coach@demo.com' },
    ];

    const defaultPassword = await bcrypt.hash('Demo123!', 10);

    for (const u of demoUsers) {
      const id = randomUUID();
      await db.execute(sql`
        INSERT INTO users (id, username, email, password, role, "firstName", "lastName", "isActive", "accountStatus")
        VALUES (${id}, ${u.username}, ${u.email}, ${defaultPassword}, ${u.role}, ${u.firstName}, ${u.lastName}, true, 'approved')
        ON CONFLICT DO NOTHING
      `).catch(() => {});
    }
  } catch (error) {
    console.error('[Setup] Demo data loading error:', error);
  }
}

export default router;
