import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { or, sql, count, max } from "drizzle-orm";
import {
  inventory,
} from "@shared/schema";

const router = Router();

  // ========================================
  // SUPPLIER PERFORMANCE SCORES API
  // ========================================
  
  router.get('/api/supplier-performance-scores', isAuthenticated, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT sps.*, s.name as supplier_name, s.code as supplier_code
        FROM supplier_performance_scores sps
        JOIN suppliers s ON s.id = sps.supplier_id
        ORDER BY sps.year DESC, sps.month DESC, sps.overall_score DESC
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      res.json(rows);
    } catch (error: unknown) {
      console.error("Error fetching supplier performance:", error);
      res.status(500).json({ message: "Tedarikçi puanları alınamadı" });
    }
  });

  // Calculate supplier performance (triggered manually or via cron)
  router.post('/api/supplier-performance-scores/calculate', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as string;
      if (!['fabrika_mudur', 'admin', 'ceo', 'satinalma'].includes(role)) {
        return res.status(403).json({ message: "Yetkiniz yok" });
      }
      
      const month = req.body.month || new Date().getMonth() + 1;
      const year = req.body.year || new Date().getFullYear();
      
      // Get all active suppliers
      const suppResult = await db.execute(sql`SELECT id, name FROM suppliers WHERE status = 'aktif'`);
      const suppRows = Array.isArray(suppResult) ? suppResult : ((suppResult as any)?.rows ?? []);
      
      const scores = [];
      for (const supp of suppRows) {
        // Calculate delivery score from goods receipts
        const deliveryResult = await db.execute(sql`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN receipt_date <= expected_delivery_date OR expected_delivery_date IS NULL THEN 1 ELSE 0 END) as on_time
          FROM goods_receipts
          WHERE supplier_id = ${supp.id}
          AND EXTRACT(MONTH FROM receipt_date) = ${month}
          AND EXTRACT(YEAR FROM receipt_date) = ${year}
        `);
        const delRows = Array.isArray(deliveryResult) ? deliveryResult : ((deliveryResult as any)?.rows ?? []);
        const totalDel = parseInt(delRows[0]?.total || 0);
        const onTimeDel = parseInt(delRows[0]?.on_time || 0);
        const deliveryScore = totalDel > 0 ? (onTimeDel / totalDel) * 100 : 100;
        
        // Quality score based on returns/complaints
        const qualityResult = await db.execute(sql`
          SELECT COUNT(*) as complaint_count
          FROM product_complaints
          WHERE supplier_id = ${supp.id}
          AND EXTRACT(MONTH FROM created_at) = ${month}
          AND EXTRACT(YEAR FROM created_at) = ${year}
        `);
        const qualRows = Array.isArray(qualityResult) ? qualityResult : ((qualityResult as any)?.rows ?? []);
        const complaints = parseInt(qualRows[0]?.complaint_count || 0);
        const qualityScore = Math.max(0, 100 - (complaints * 15));
        
        // Price performance - stable pricing gets higher score
        const priceScore = 80; // Default baseline
        
        const overallScore = (deliveryScore * 0.4 + qualityScore * 0.35 + priceScore * 0.25);
        
        // Upsert score
        await db.execute(sql`
          INSERT INTO supplier_performance_scores (supplier_id, month, year, delivery_score, price_performance_score, quality_score, overall_score, total_deliveries, on_time_deliveries, complaint_count)
          VALUES (${supp.id}, ${month}, ${year}, ${deliveryScore.toFixed(2)}, ${priceScore.toFixed(2)}, ${qualityScore.toFixed(2)}, ${overallScore.toFixed(2)}, ${totalDel}, ${onTimeDel}, ${complaints})
          ON CONFLICT DO NOTHING
        `);
        
        // Update supplier main record
        await db.execute(sql`
          UPDATE suppliers SET performance_score = ${overallScore.toFixed(1)}, on_time_delivery_rate = ${deliveryScore.toFixed(2)} WHERE id = ${supp.id}
        `);
        
        scores.push({ supplierId: supp.id, name: supp.name, overallScore });
      }
      
      res.json({ message: `${scores.length} tedarikçi puanı hesaplandı`, scores });
    } catch (error: unknown) {
      console.error("Error calculating supplier scores:", error);
      res.status(500).json({ message: "Puanlar hesaplanamadı" });
    }
  });

  // QR Code lookup for inventory items
  router.get('/api/inventory/qr/:qrCode', isAuthenticated, async (req, res) => {
    try {
      const qrCode = req.params.qrCode;
      const result = await db.execute(sql`
        SELECT id, code, name, category, sub_category, unit, current_stock, qr_code
        FROM inventory
        WHERE qr_code = ${qrCode} OR code = ${qrCode.replace('INV-', '')}
        AND is_active = true
        LIMIT 1
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      if (rows.length === 0) return res.status(404).json({ message: "Ürün bulunamadı" });
      res.json(rows[0]);
    } catch (error: unknown) {
      console.error("Error QR lookup:", error);
      res.status(500).json({ message: "QR arama başarısız" });
    }
  });

  // Generate QR codes for all inventory items
  router.post('/api/inventory/generate-qr-codes', isAuthenticated, async (req, res) => {
    try {
      const result = await db.execute(sql`
        UPDATE inventory SET qr_code = 'INV-' || code WHERE qr_code IS NULL AND is_active = true
        RETURNING id, code, qr_code
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      res.json({ message: `${rows.length} ürün için QR kod oluşturuldu`, updated: rows.length });
    } catch (error: unknown) {
      console.error("Error generating QR codes:", error);
      res.status(500).json({ message: "QR kodlar oluşturulamadı" });
    }
  });

  // Get inventory items by category (for counting UI)
  router.get('/api/inventory/by-category', isAuthenticated, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT id, code, name, category, sub_category, unit, current_stock, qr_code
        FROM inventory
        WHERE is_active = true
        ORDER BY category, name
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      
      // Group by category
      const grouped: Record<string, any[]> = {};
      for (const row of rows) {
        const cat = row.category || 'diger';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(row);
      }
      
      res.json({ items: rows, grouped, totalCount: rows.length });
    } catch (error: unknown) {
      console.error("Error fetching inventory by category:", error);
      res.status(500).json({ message: "Stok listesi alınamadı" });
    }
  });

  // Count discrepancy summary for dashboard
  router.get('/api/inventory-count-summary', isAuthenticated, async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
      
      const result = await db.execute(sql`
        SELECT 
          (SELECT count(*) FROM inventory_count_reports icr JOIN inventory_counts ic ON ic.id = icr.count_id WHERE ic.year = ${year} AND severity IN ('critical', 'high'))::int as critical_count,
          (SELECT count(*) FROM inventory_count_reports icr JOIN inventory_counts ic ON ic.id = icr.count_id WHERE ic.year = ${year} AND severity = 'medium')::int as medium_count,
          (SELECT count(*) FROM inventory_count_reports icr JOIN inventory_counts ic ON ic.id = icr.count_id WHERE ic.year = ${year} AND severity = 'low')::int as low_count,
          (SELECT count(*) FROM inventory_counts WHERE year = ${year} AND status = 'completed')::int as completed_counts,
          (SELECT count(*) FROM inventory WHERE is_active = true AND current_stock::numeric < minimum_stock::numeric)::int as below_minimum_count
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      res.json(rows[0] || {});
    } catch (error: unknown) {
      console.error("Error fetching count summary:", error);
      res.status(500).json({ message: "Özet alınamadı" });
    }
  });



export default router;
