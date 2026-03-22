import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { eq, sql, count } from "drizzle-orm";
import {
  users,
  notifications,
  inventory,
  inventoryCounts,
} from "@shared/schema";

const router = Router();

  // ========================================
  // FACTORY MANAGEMENT SCORE ROUTES
  // ========================================



  // ========================================
  // INVENTORY COUNT REPORTS API
  // ========================================
  
  router.get('/api/inventory-count-reports', isAuthenticated, async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const result = await db.execute(sql`
        SELECT icr.*, inv.name as inventory_name, inv.code as inventory_code, inv.category as inventory_category
        FROM inventory_count_reports icr
        JOIN inventory inv ON inv.id = icr.inventory_id
        JOIN inventory_counts ic ON ic.id = icr.count_id
        WHERE ic.year = ${year}
        ORDER BY icr.severity DESC, icr.created_at DESC
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      res.json(rows);
    } catch (error: unknown) {
      console.error("Error fetching inventory count reports:", error);
      res.status(500).json({ message: "Raporlar alınamadı" });
    }
  });

  // Generate discrepancy reports when count is completed
  router.post('/api/inventory-counts/:id/finalize', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as string;
      if (role !== 'fabrika_mudur' && role !== 'admin' && role !== 'ceo') {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      const countId = parseInt(req.params.id);
      
      // Get all completed assignments with their averages
      const assignResult = await db.execute(sql`
        SELECT ica.id, ica.inventory_id, inv.current_stock,
          AVG(ice.counted_quantity::numeric) as avg_counted,
          inv.current_stock::numeric as sys_qty,
          inv.name as inventory_name
        FROM inventory_count_assignments ica
        JOIN inventory inv ON inv.id = ica.inventory_id
        JOIN inventory_count_entries ice ON ice.assignment_id = ica.id AND ice.is_recount = false
        WHERE ica.count_id = ${countId}
        GROUP BY ica.id, ica.inventory_id, inv.current_stock, inv.name
      `);
      const assignRows = Array.isArray(assignResult) ? assignResult : ((assignResult as any)?.rows ?? []);
      
      let reportCount = 0;
      const notificationTargets: string[] = [];
      
      for (const row of assignRows) {
        const sysQty = parseFloat(row.sys_qty || 0);
        const counted = parseFloat(row.avg_counted || 0);
        const diff = counted - sysQty;
        const diffPercent = sysQty > 0 ? Math.abs(diff / sysQty) * 100 : (diff !== 0 ? 100 : 0);
        
        let severity = 'low';
        if (diffPercent >= 20) severity = 'critical';
        else if (diffPercent >= 10) severity = 'high';
        else if (diffPercent >= 5) severity = 'medium';
        
        if (Math.abs(diff) > 0.01) {
          const notifiedRoles = [];
          if (severity === 'critical' || severity === 'high') {
            notifiedRoles.push('fabrika_mudur', 'ceo', 'cgo', 'muhasebe', 'satinalma');
          } else if (severity === 'medium') {
            notifiedRoles.push('fabrika_mudur', 'muhasebe');
          } else {
            notifiedRoles.push('fabrika_mudur');
          }
          
          await db.execute(sql`
            INSERT INTO inventory_count_reports (count_id, inventory_id, system_quantity, counted_quantity, difference, difference_percent, severity, notified_roles)
            VALUES (${countId}, ${row.inventory_id}, ${sysQty.toString()}, ${counted.toString()}, ${diff.toString()}, ${diffPercent.toFixed(2)}, ${severity}, ${notifiedRoles})
          `);
          reportCount++;
          
          // Create notifications for high/critical discrepancies
          if (severity === 'critical' || severity === 'high') {
            notificationTargets.push(row.inventory_name);
          }
        }
      }
      
      // Update count status to completed
      await db.update(inventoryCounts)
        .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(inventoryCounts.id, countId));
      
      // Send notifications if there are critical discrepancies
      if (notificationTargets.length > 0) {
        const targetRoles = ['fabrika_mudur', 'ceo', 'cgo', 'muhasebe', 'satinalma'];
        const notifUsers = await db.execute(sql`
          SELECT id FROM users WHERE role = ANY(${targetRoles}) AND is_active = true
        `);
        const notifRows = Array.isArray(notifUsers) ? notifUsers : ((notifUsers as any)?.rows ?? []);
        
        for (const nu of notifRows) {
          await db.execute(sql`
            INSERT INTO notifications (user_id, title, message, type, created_at)
            VALUES (${nu.id}, 'Sayim Tutarsizlik Uyarisi', 
              ${'Kritik stok tutarsizligi tespit edildi: ' + notificationTargets.slice(0, 3).join(', ')}, 
              'warning', NOW())
          `);
        }
      }
      
      res.json({ message: `${reportCount} tutarsızlık raporu oluşturuldu`, reportCount });
    } catch (error: unknown) {
      console.error("Error finalizing count:", error);
      res.status(500).json({ message: "Sayım sonlandırılamadı" });
    }
  });


export default router;
