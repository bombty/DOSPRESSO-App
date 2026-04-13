import { Router } from "express";
import { db } from "../db";
import { isAuthenticated } from "../localAuth";
import { eq, or, sql, count, max } from "drizzle-orm";
import {
  users,
  inventory,
  inventoryCounts,
  inventoryCountAssignments,
  inventoryCountEntries,
} from "@shared/schema";

const router = Router();

  // ========================================
  // STOK SAYIM (INVENTORY COUNT) ROUTES
  // ========================================

  // Get all inventory counts
  router.get('/api/inventory-counts', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as string;
      if (!['admin', 'ceo', 'cgo', 'fabrika_mudur', 'fabrika', 'satinalma', 'muhasebe'].includes(role)) {
        return res.status(403).json({ message: "Yetkisiz erişim" });
      }
      const { year, month } = req.query;
      let conditions = [];
      if (year) conditions.push(sql`ic.year = ${parseInt(year as string)}`);
      if (month) conditions.push(sql`ic.month = ${parseInt(month as string)}`);
      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
      
      const result = await db.execute(sql`
        SELECT ic.*, 
          u.first_name || ' ' || u.last_name as created_by_name,
          (SELECT count(*) FROM inventory_count_assignments WHERE count_id = ic.id)::int as total_items,
          (SELECT count(*) FROM inventory_count_assignments WHERE count_id = ic.id AND status = 'completed')::int as completed_items,
          (SELECT count(*) FROM inventory_count_assignments WHERE count_id = ic.id AND status = 'discrepancy')::int as discrepancy_items
        FROM inventory_counts ic
        LEFT JOIN users u ON u.id = ic.created_by_id
        ${whereClause}
        ORDER BY ic.year DESC, ic.month DESC, ic.id DESC
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      res.json(rows);
    } catch (error: unknown) {
      console.error("Error fetching inventory counts:", error);
      res.status(500).json({ message: "Sayım listesi alınamadı" });
    }
  });

  // Create new inventory count session
  router.post('/api/inventory-counts', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as string;
      if (role !== 'fabrika_mudur' && role !== 'admin') {
        return res.status(403).json({ message: "Sadece fabrika yoneticisi sayim olusturabilir" });
      }
      const { month, year, scheduledDate, notes, countType } = req.body;
      const cType = countType || 'tam_sayim';
      
      const scheduled = scheduledDate ? new Date(scheduledDate) : new Date();

      const [newCount] = await db.insert(inventoryCounts).values({
        month, year, countType: cType, scheduledDate: scheduled, notes, createdById: user.id, status: 'in_progress'
      }).returning();

      const categoryMap: Record<string, string[]> = {
        bitimis_urun: ['bitimis_urun', 'donut', 'tatli', 'tuzlu'],
        hammadde: ['hammadde', 'kahve', 'konsantre', 'cay_grubu', 'toz_topping'],
        ambalaj: ['ambalaj'],
        ekipman: ['ekipman', 'sube_ekipman'],
        tam_sayim: [],
      };

      let activeItems: any[];
      if (cType === 'tam_sayim') {
        const result = await db.execute(sql`SELECT id FROM inventory WHERE is_active = true ORDER BY category, name`);
        activeItems = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      } else {
        const cats = categoryMap[cType] || [cType];
        const result = await db.execute(sql`SELECT id FROM inventory WHERE is_active = true AND category IN (${sql.join(cats.map(c => sql`${c}`), sql`, `)}) ORDER BY category, name`);
        activeItems = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      }
      
      for (const item of activeItems) {
        await db.insert(inventoryCountAssignments).values({
          countId: newCount.id, inventoryId: (item as any).id, status: 'pending'
        });
      }

      res.status(201).json({ ...newCount, itemCount: activeItems.length });
    } catch (error: unknown) {
      console.error("Error creating inventory count:", error);
      res.status(500).json({ message: "Sayim olusturulamadi" });
    }
  });
  router.get('/api/inventory-counts/:id', isAuthenticated, async (req, res) => {
    try {
      const countId = parseInt(req.params.id);
      const result = await db.execute(sql`
        SELECT ic.*, u.first_name || ' ' || u.last_name as created_by_name
        FROM inventory_counts ic
        LEFT JOIN users u ON u.id = ic.created_by_id
        WHERE ic.id = ${countId}
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      if (rows.length === 0) return res.status(404).json({ message: "Sayım bulunamadı" });

      const assignments = await db.execute(sql`
        SELECT ica.*, 
          inv.name as inventory_name, inv.code as inventory_code, inv.unit as inventory_unit, 
          inv.current_stock as system_quantity, inv.category as inventory_category,
          inv.sub_category as inventory_sub_category, inv.qr_code,
          c1.first_name || ' ' || c1.last_name as counter1_name,
          c2.first_name || ' ' || c2.last_name as counter2_name,
          (SELECT count(*) FROM inventory_count_entries WHERE assignment_id = ica.id AND is_recount = false)::int as entry_count,
          (SELECT AVG(counted_quantity::numeric) FROM inventory_count_entries WHERE assignment_id = ica.id AND is_recount = false) as counted_avg,
          CASE WHEN (SELECT count(*) FROM inventory_count_entries WHERE assignment_id = ica.id AND is_recount = false) >= 2
            THEN (SELECT AVG(counted_quantity::numeric) - inv.current_stock::numeric FROM inventory_count_entries WHERE assignment_id = ica.id AND is_recount = false)
            ELSE NULL END as difference_display
        FROM inventory_count_assignments ica
        JOIN inventory inv ON inv.id = ica.inventory_id
        LEFT JOIN users c1 ON c1.id = ica.counter_1_id
        LEFT JOIN users c2 ON c2.id = ica.counter_2_id
        WHERE ica.count_id = ${countId}
        ORDER BY inv.category, inv.name
      `);
      const assignRows = Array.isArray(assignments) ? assignments : ((assignments as any)?.rows ?? []);

      res.json({ ...rows[0], assignments: assignRows });
    } catch (error: unknown) {
      console.error("Error fetching inventory count:", error);
      res.status(500).json({ message: "Sayım detayı alınamadı" });
    }
  });

  // Assign counters to inventory items
  router.put('/api/inventory-counts/:id/assign', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const role = user.role as string;
      if (role !== 'fabrika_mudur' && role !== 'admin') {
        return res.status(403).json({ message: "Sadece fabrika yöneticisi sayımcı atayabilir" });
      }
      const countId = parseInt(req.params.id);
      const { assignments } = req.body; // [{assignmentId, counter1Id, counter2Id}]

      for (const a of assignments) {
        if (a.counter1Id === a.counter2Id) {
          return res.status(400).json({ message: "İki sayımcı aynı kişi olamaz" });
        }
        await db.update(inventoryCountAssignments)
          .set({ counter1Id: a.counter1Id, counter2Id: a.counter2Id })
          .where(eq(inventoryCountAssignments.id, a.assignmentId));
      }

      // Update count status
      await db.update(inventoryCounts)
        .set({ status: 'in_progress', updatedAt: new Date() })
        .where(eq(inventoryCounts.id, countId));

      res.json({ message: "Sayımcılar atandı" });
    } catch (error: unknown) {
      console.error("Error assigning counters:", error);
      res.status(500).json({ message: "Sayımcı atanamadı" });
    }
  });


  // Submit count entry (by counter)
  router.post('/api/inventory-count-entries', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { assignmentId, countedQuantity, notes, photoUrl } = req.body;

      // Get assignment
      const assignResult = await db.execute(sql`
        SELECT ica.*, inv.current_stock 
        FROM inventory_count_assignments ica
        JOIN inventory inv ON inv.id = ica.inventory_id
        WHERE ica.id = ${assignmentId}
      `);
      const assignRows = Array.isArray(assignResult) ? assignResult : ((assignResult as any)?.rows ?? []);
      if (assignRows.length === 0) return res.status(404).json({ message: "Sayım ataması bulunamadı" });
      
      const assignment = assignRows[0] as any;
      
      // Verify this user is assigned as counter1 or counter2
      if (assignment.counter_1_id !== user.id && assignment.counter_2_id !== user.id) {
        return res.status(403).json({ message: "Bu sayıma atanmadınız" });
      }

      // Check if already counted by this user (non-recount)
      const existingResult = await db.execute(sql`
        SELECT id FROM inventory_count_entries 
        WHERE assignment_id = ${assignmentId} AND counter_id = ${user.id} AND is_recount = false
      `);
      const existingRows = Array.isArray(existingResult) ? existingResult : ((existingResult as any)?.rows ?? []);
      if (existingRows.length > 0) {
        return res.status(400).json({ message: "Bu kalem için zaten sayım girdiniz" });
      }

      const systemQty = parseFloat(assignment.current_stock || '0');
      const counted = parseFloat(countedQuantity);
      const difference = counted - systemQty;

      const [entry] = await db.insert(inventoryCountEntries).values({
        assignmentId, counterId: user.id, countedQuantity: countedQuantity.toString(),
        systemQuantity: systemQty.toString(), difference: difference.toString(),
        isRecount: false, notes, photoUrl
      }).returning();

      // Check if BOTH assigned counters have submitted
      const allEntriesResult = await db.execute(sql`
        SELECT counter_id, counted_quantity FROM inventory_count_entries 
        WHERE assignment_id = ${assignmentId} AND is_recount = false
        AND counter_id IN (${assignment.counter_1_id}, ${assignment.counter_2_id})
      `);
      const allEntries = Array.isArray(allEntriesResult) ? allEntriesResult : ((allEntriesResult as any)?.rows ?? []);
      
      const entryCounterIds = new Set(allEntries.map((e) => e.counter_id));
      if (entryCounterIds.has(assignment.counter_1_id) && entryCounterIds.has(assignment.counter_2_id)) {
        const e1 = allEntries.find((e) => e.counter_id === assignment.counter_1_id);
        const e2 = allEntries.find((e) => e.counter_id === assignment.counter_2_id);
        const qty1 = parseFloat(e1.counted_quantity);
        const qty2 = parseFloat(e2.counted_quantity);
        const discrepancyThreshold = Math.max(systemQty * 0.02, 0.5); // 2% or 0.5 min
        
        if (Math.abs(qty1 - qty2) > discrepancyThreshold) {
          await db.update(inventoryCountAssignments)
            .set({ status: 'discrepancy' })
            .where(eq(inventoryCountAssignments.id, assignmentId));
        } else {
          await db.update(inventoryCountAssignments)
            .set({ status: 'completed' })
            .where(eq(inventoryCountAssignments.id, assignmentId));
          
          // Update inventory stock with average of both counts
          const avgQty = ((qty1 + qty2) / 2).toFixed(3);
          const invId = assignment.inventory_id;
          await db.update(inventory)
            .set({ currentStock: avgQty, updatedAt: new Date() })
            .where(eq(inventory.id, invId));
        }
      } else {
        await db.update(inventoryCountAssignments)
          .set({ status: 'counting' })
          .where(eq(inventoryCountAssignments.id, assignmentId));
      }

      // Check if all assignments are done for this count
      const countId = assignment.count_id;
      const pendingResult = await db.execute(sql`
        SELECT count(*) as cnt FROM inventory_count_assignments 
        WHERE count_id = ${countId} AND status NOT IN ('completed')
      `);
      const pendingRows = Array.isArray(pendingResult) ? pendingResult : ((pendingResult as any)?.rows ?? []);
      const pendingCount = parseInt((pendingRows[0] as any)?.cnt || '0');
      
      if (pendingCount === 0) {
        await db.update(inventoryCounts)
          .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
          .where(eq(inventoryCounts.id, countId));
      }

      res.status(201).json(entry);
    } catch (error: unknown) {
      console.error("Error submitting count entry:", error);
      res.status(500).json({ message: "Sayım girişi kaydedilemedi" });
    }
  });

  // Submit recount entry
  router.post('/api/inventory-count-entries/recount', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { assignmentId, countedQuantity, notes, photoUrl } = req.body;

      const assignResult = await db.execute(sql`
        SELECT ica.*, inv.current_stock
        FROM inventory_count_assignments ica
        JOIN inventory inv ON inv.id = ica.inventory_id
        WHERE ica.id = ${assignmentId} AND ica.status = 'discrepancy'
      `);
      const assignRows = Array.isArray(assignResult) ? assignResult : ((assignResult as any)?.rows ?? []);
      if (assignRows.length === 0) return res.status(404).json({ message: "Tutarsızlık olan sayım bulunamadı" });
      
      const assignment = assignRows[0] as any;
      if (assignment.counter_1_id !== user.id && assignment.counter_2_id !== user.id) {
        return res.status(403).json({ message: "Bu sayıma atanmadınız" });
      }

      // Prevent duplicate recount by same user
      const existingRecountResult = await db.execute(sql`
        SELECT id FROM inventory_count_entries 
        WHERE assignment_id = ${assignmentId} AND counter_id = ${user.id} AND is_recount = true
      `);
      const existingRecountRows = Array.isArray(existingRecountResult) ? existingRecountResult : ((existingRecountResult as any)?.rows ?? []);
      if (existingRecountRows.length > 0) {
        return res.status(400).json({ message: "Bu kalem için zaten tekrar sayım girdiniz" });
      }

      const systemQty = parseFloat(assignment.current_stock || '0');
      const counted = parseFloat(countedQuantity);
      const difference = counted - systemQty;

      const [entry] = await db.insert(inventoryCountEntries).values({
        assignmentId, counterId: user.id, countedQuantity: countedQuantity.toString(),
        systemQuantity: systemQty.toString(), difference: difference.toString(),
        isRecount: true, notes, photoUrl
      }).returning();

      // Check recount entries - both assigned counters must submit
      const recountResult = await db.execute(sql`
        SELECT counter_id, counted_quantity FROM inventory_count_entries 
        WHERE assignment_id = ${assignmentId} AND is_recount = true
        AND counter_id IN (${assignment.counter_1_id}, ${assignment.counter_2_id})
      `);
      const recountEntries = Array.isArray(recountResult) ? recountResult : ((recountResult as any)?.rows ?? []);
      
      const recountCounterIds = new Set(recountEntries.map((e) => e.counter_id));
      if (recountCounterIds.has(assignment.counter_1_id) && recountCounterIds.has(assignment.counter_2_id)) {
        const e1 = recountEntries.find((e) => e.counter_id === assignment.counter_1_id);
        const e2 = recountEntries.find((e) => e.counter_id === assignment.counter_2_id);
        const qty1 = parseFloat(e1.counted_quantity);
        const qty2 = parseFloat(e2.counted_quantity);
        // After recount, accept the average regardless
        await db.update(inventoryCountAssignments)
          .set({ status: 'completed' })
          .where(eq(inventoryCountAssignments.id, assignmentId));
        
        const avgQty = ((qty1 + qty2) / 2).toFixed(3);
        const invId = assignment.inventory_id;
        await db.update(inventory)
          .set({ currentStock: avgQty, updatedAt: new Date() })
          .where(eq(inventory.id, invId));
      }

      res.status(201).json(entry);
    } catch (error: unknown) {
      console.error("Error submitting recount:", error);
      res.status(500).json({ message: "Tekrar sayım kaydedilemedi" });
    }
  });

  // Get count entries for an assignment
  router.get('/api/inventory-count-entries/:assignmentId', isAuthenticated, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId);
      const result = await db.execute(sql`
        SELECT ice.*, u.first_name || ' ' || u.last_name as counter_name
        FROM inventory_count_entries ice
        LEFT JOIN users u ON u.id = ice.counter_id
        WHERE ice.assignment_id = ${assignmentId}
        ORDER BY ice.counted_at
      `);
      const rows = Array.isArray(result) ? result : ((result as any)?.rows ?? []);
      res.json(rows);
    } catch (error: unknown) {
      console.error("Error fetching count entries:", error);
      res.status(500).json({ message: "Sayım girişleri alınamadı" });
    }
  });


export default router;
