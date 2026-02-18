-- =================================================================
-- DOSPRESSO P0 Index Pack — 17 Indexes
-- Generated: 2026-02-18
-- Purpose: Cover top 25 highest-traffic query patterns
-- Safety: All IF NOT EXISTS — idempotent, safe to re-run
-- Note: notifications index EXCLUDED (already covered by
--        notifications_user_read_created_idx)
-- =================================================================

-- 1. users: branchId + isActive (92 query refs, no existing branch_id index)
CREATE INDEX IF NOT EXISTS idx_users_branch_active
  ON users (branch_id, is_active);

-- 2. tasks: assignedToId + status + createdAt DESC (13 query refs, "my tasks")
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status_created
  ON tasks (assigned_to_id, status, created_at DESC);

-- 3. tasks: branchId + status + createdAt DESC (extends existing 2-col index)
CREATE INDEX IF NOT EXISTS idx_tasks_branch_status_created
  ON tasks (branch_id, status, created_at DESC);

-- 4. checklist_completions: branchId + scheduledDate DESC (19 refs, 4916 rows)
CREATE INDEX IF NOT EXISTS idx_checklist_comp_branch_date
  ON checklist_completions (branch_id, scheduled_date DESC);

-- 5. checklist_completions: userId + scheduledDate DESC ("my daily checklist")
CREATE INDEX IF NOT EXISTS idx_checklist_comp_user_date
  ON checklist_completions (user_id, scheduled_date DESC);

-- 6. shift_attendance: userId + checkInTime DESC (12 refs, attendance history)
CREATE INDEX IF NOT EXISTS idx_shift_attendance_user_checkin
  ON shift_attendance (user_id, check_in_time DESC);

-- 7. staff_evaluations: employeeId + createdAt DESC (9 refs, no existing index)
CREATE INDEX IF NOT EXISTS idx_staff_eval_employee_created
  ON staff_evaluations (employee_id, created_at DESC);

-- 8. staff_evaluations: branchId (7 refs, no existing index)
CREATE INDEX IF NOT EXISTS idx_staff_eval_branch
  ON staff_evaluations (branch_id);

-- 9. equipment: branchId (15 refs, no existing index)
CREATE INDEX IF NOT EXISTS idx_equipment_branch
  ON equipment (branch_id);

-- 10. leave_requests: userId + status (18 refs, active leave checks)
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_status
  ON leave_requests (user_id, status);

-- 11. overtime_requests: userId + status + createdAt DESC (7 refs)
CREATE INDEX IF NOT EXISTS idx_overtime_user_status_created
  ON overtime_requests (user_id, status, created_at DESC);

-- 12. monthly_employee_performance: branchId + year + month (8 refs)
CREATE INDEX IF NOT EXISTS idx_monthly_perf_branch_period
  ON monthly_employee_performance (branch_id, year, month);

-- 13. guest_complaints: branchId + status (6 refs)
CREATE INDEX IF NOT EXISTS idx_guest_complaints_branch_status
  ON guest_complaints (branch_id, status);

-- 14. corrective_actions: assignedToId + status (11 refs)
CREATE INDEX IF NOT EXISTS idx_corrective_actions_assigned_status
  ON corrective_actions (assigned_to_id, status);

-- 15. hq_support_tickets: assignedToId + status (5 refs)
CREATE INDEX IF NOT EXISTS idx_hq_tickets_assigned_status
  ON hq_support_tickets (assigned_to_id, status);

-- 16. training_assignments: branchId + userId (5 refs)
CREATE INDEX IF NOT EXISTS idx_training_assign_branch_user
  ON training_assignments (branch_id, user_id);

-- 17. shifts: assignedToId + shiftDate DESC (9 refs, 13347 rows)
CREATE INDEX IF NOT EXISTS idx_shifts_assigned_date
  ON shifts (assigned_to_id, shift_date DESC);
