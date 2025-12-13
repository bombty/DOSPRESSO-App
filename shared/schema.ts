import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp,
  date,
  time,
  jsonb,
  index,
  serial,
  boolean,
  integer,
  numeric,
  real,
  customType,
  uniqueIndex,
  unique,
  check
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Custom type for pgvector
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const UserRole = {
  // System Role
  ADMIN: "admin",
  // HQ Roles
  MUHASEBE: "muhasebe",
  SATINALMA: "satinalma", 
  COACH: "coach",
  TEKNIK: "teknik",
  DESTEK: "destek",
  FABRIKA: "fabrika",
  YATIRIMCI_HQ: "yatirimci_hq",
  // Branch Roles (Hierarchical - lowest to highest)
  STAJYER: "stajyer",
  BAR_BUDDY: "bar_buddy",
  BARISTA: "barista",
  SUPERVISOR_BUDDY: "supervisor_buddy",
  SUPERVISOR: "supervisor",
  YATIRIMCI_BRANCH: "yatirimci_branch", // Branch investor (read-only)
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// HQ and Branch role sets
export const HQ_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.ADMIN,
  UserRole.MUHASEBE,
  UserRole.SATINALMA,
  UserRole.COACH,
  UserRole.TEKNIK,
  UserRole.DESTEK,
  UserRole.FABRIKA,
  UserRole.YATIRIMCI_HQ,
]);

export const BRANCH_ROLES: ReadonlySet<UserRoleType> = new Set([
  UserRole.STAJYER,
  UserRole.BAR_BUDDY,
  UserRole.BARISTA,
  UserRole.SUPERVISOR_BUDDY,
  UserRole.SUPERVISOR,
  UserRole.YATIRIMCI_BRANCH,
]);

// ========================================
// SIMPLIFIED SIDEBAR MENU SYSTEM (v2)
// Static menu blueprint - no database required
// Server-side RBAC filtering only
// ========================================

export type SidebarMenuScope = 'branch' | 'hq' | 'both';

export interface SidebarMenuItem {
  id: string;
  titleTr: string;
  path: string;
  icon: string;
  moduleKey: PermissionModule;
  scope: SidebarMenuScope;
  badge?: string; // Badge key for dynamic counts (e.g., 'notifications', 'messages')
}

export interface SidebarMenuSection {
  id: string;
  titleTr: string;
  icon: string;
  scope: SidebarMenuScope;
  items: SidebarMenuItem[];
}

// API response type for frontend consumption
export interface SidebarMenuResponse {
  sections: SidebarMenuSection[];
  badges: Record<string, number>; // Badge counts (notifications, messages, etc.)
  meta: {
    userId: string;
    role: UserRoleType;
    scope: 'branch' | 'hq' | 'admin';
    timestamp: number;
  };
}

// Helper functions for role checking
export function isHQRole(role: UserRoleType): boolean {
  return HQ_ROLES.has(role);
}

export function isBranchRole(role: UserRoleType): boolean {
  return BRANCH_ROLES.has(role);
}

// Permission types
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';
export type PermissionModule = 
  | 'dashboard'
  | 'tasks'
  | 'checklists'
  | 'equipment'
  | 'equipment_faults'
  | 'knowledge_base'
  | 'ai_assistant'
  | 'performance'
  | 'attendance'
  | 'branches'
  | 'users'
  | 'employees'
  | 'hr'
  | 'training'
  | 'schedules'
  | 'messages'
  | 'announcements'
  | 'complaints'
  | 'leave_requests'
  | 'overtime_requests'
  | 'admin_settings';

// Permission Matrix: Define what each role can do
export const PERMISSIONS: Record<UserRoleType, Record<PermissionModule, PermissionAction[]>> = {
  // ADMIN - Full access to everything
  admin: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit', 'delete', 'approve'],
    checklists: ['view', 'create', 'edit', 'delete'],
    equipment: ['view', 'create', 'edit', 'delete'],
    equipment_faults: ['view', 'create', 'edit', 'delete', 'approve'],
    knowledge_base: ['view', 'create', 'edit', 'delete', 'approve'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view', 'edit'],
    branches: ['view', 'create', 'edit', 'delete'],
    users: ['view', 'create', 'edit', 'delete'],
    employees: ['view', 'create', 'edit', 'delete', 'approve'],
    hr: ['view', 'create', 'edit', 'delete', 'approve'],
    training: ['view', 'create', 'edit', 'delete', 'approve'],
    schedules: ['view', 'create', 'edit', 'delete'],
    messages: ['view', 'create', 'delete'],
    announcements: ['view', 'create', 'edit', 'delete'],
    complaints: ['view', 'create', 'edit', 'delete', 'approve'],
    leave_requests: ['view', 'create', 'edit', 'approve'],
    overtime_requests: ['view', 'create', 'edit', 'approve'],
    admin_settings: ['view'],
  },
  // HQ ROLES
  muhasebe: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: ['view'],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view'],
    leave_requests: ['view'],
    overtime_requests: ['view'],
    admin_settings: [],
  },
  satinalma: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit'],
    checklists: ['view'],
    equipment: ['view', 'create', 'edit'],
    equipment_faults: ['view', 'edit', 'approve'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
  },
  coach: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit', 'approve'],
    checklists: ['view', 'create', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view'],
    knowledge_base: ['view', 'create', 'edit', 'approve'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view', 'create', 'edit', 'delete', 'approve'],
    hr: ['view', 'create', 'edit', 'delete', 'approve'],
    training: ['view', 'create', 'edit', 'delete', 'approve'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view', 'create', 'edit', 'delete'],
    complaints: ['view', 'edit'],
    leave_requests: ['view', 'approve'],
    overtime_requests: ['view', 'approve'],
    admin_settings: [],
  },
  teknik: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: ['view', 'edit'],
    equipment_faults: ['view', 'edit', 'approve'],
    knowledge_base: ['view', 'create', 'edit'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
  },
  destek: {
    dashboard: ['view'],
    tasks: ['view', 'create'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view', 'create', 'edit'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view', 'create', 'edit'],
    complaints: [],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
  },
  fabrika: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
  },
  yatirimci_hq: {
    dashboard: ['view'],
    tasks: [],
    checklists: [],
    equipment: [],
    equipment_faults: [],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: [],
    schedules: [],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
  },
  // BRANCH ROLES
  supervisor: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit', 'approve'],
    checklists: ['view', 'create', 'edit', 'approve'],
    equipment: ['view'],
    equipment_faults: ['view', 'create', 'edit'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view', 'edit'],
    branches: [],
    users: [],
    employees: ['view', 'create', 'edit', 'approve'],
    hr: ['view', 'create', 'edit', 'delete'],
    training: ['view', 'approve'],
    schedules: ['view', 'create', 'edit'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view', 'create', 'edit'],
    leave_requests: ['view', 'create', 'approve'],
    overtime_requests: ['view', 'create', 'approve'],
    admin_settings: [],
  },
  supervisor_buddy: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view', 'create', 'edit'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view', 'edit'],
    branches: [],
    users: [],
    employees: [],
    hr: ['view'],
    training: ['view'],
    schedules: ['view', 'edit'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: ['view', 'create'],
    overtime_requests: ['view', 'create'],
    admin_settings: [],
  },
  barista: {
    dashboard: ['view'],
    tasks: ['view', 'edit'],
    checklists: ['view', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view', 'create'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: [],
    users: [],
    employees: [],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: ['view', 'create'],
    overtime_requests: ['view', 'create'],
    admin_settings: [],
  },
  bar_buddy: {
    dashboard: ['view'],
    tasks: ['view', 'edit'],
    checklists: ['view', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view', 'create'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: [],
    attendance: ['view'],
    branches: [],
    users: [],
    employees: [],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: ['view', 'create'],
    overtime_requests: ['view', 'create'],
    admin_settings: [],
  },
  stajyer: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: [],
    equipment_faults: [],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: [],
    attendance: ['view'],
    branches: [],
    users: [],
    employees: [],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: ['view', 'create'],
    overtime_requests: ['view', 'create'],
    admin_settings: [],
  },
  yatirimci_branch: {
    dashboard: ['view'],
    tasks: [],
    checklists: [],
    equipment: [],
    equipment_faults: [],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: [],
    users: [],
    employees: [],
    hr: [],
    training: [],
    schedules: [],
    messages: ['view'],
    announcements: ['view'],
    complaints: [],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
  },
};

// Helper function to check permissions
export function hasPermission(
  role: UserRoleType,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  const modulePermissions = PERMISSIONS[role]?.[module];
  return modulePermissions?.includes(action) ?? false;
}

// Helper function to check if user can access a module at all
export function canAccessModule(role: UserRoleType, module: PermissionModule): boolean {
  const modulePermissions = PERMISSIONS[role]?.[module];
  return (modulePermissions?.length ?? 0) > 0;
}

// Branches table (declared first since users references it)
export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  managerName: varchar("manager_name", { length: 255 }),
  openingHours: time("opening_hours", { precision: 0 }).default(sql`'08:00'::time`),
  closingHours: time("closing_hours", { precision: 0 }).default(sql`'22:00'::time`),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  shiftCornerPhotoUrl: text("shift_corner_photo_url"),
  shiftCornerLatitude: numeric("shift_corner_latitude", { precision: 10, scale: 7 }),
  shiftCornerLongitude: numeric("shift_corner_longitude", { precision: 10, scale: 7 }),
  qrCodeToken: varchar("qr_code_token", { length: 64 }),
  geoRadius: integer("geo_radius").default(50),
  wifiSsid: varchar("wifi_ssid", { length: 100 }),
  checkInMethod: varchar("check_in_method", { length: 20 }).default("both"), // rfid, qr, or both
});

export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
  isActive: true,
});

export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branches.$inferSelect;

// Users table (Username/Password Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default(UserRole.BARISTA),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  // HR/Employee fields
  hireDate: date("hire_date"),
  probationEndDate: date("probation_end_date"),
  birthDate: date("birth_date"),
  phoneNumber: varchar("phone_number", { length: 20 }),
  emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  // AI Photo Analysis Quota (10/day for dress code, task verification, etc.)
  dailyPhotoCount: integer("daily_photo_count").default(0).notNull(),
  lastPhotoDate: date("last_photo_date"),
  // Account approval workflow
  accountStatus: varchar("account_status", { length: 20 }).notNull().default("approved"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  // Employment type and hours for shift planning
  employmentType: varchar("employment_type", { length: 20 }).default("fulltime"), // fulltime, parttime
  weeklyHours: integer("weekly_hours").default(45), // 45 for fulltime, custom for parttime
  skillScore: integer("skill_score").default(50), // 0-100, for AI planning balance
  // Extended HR fields
  tckn: varchar("tckn", { length: 11 }), // Turkish ID number
  gender: varchar("gender", { length: 20 }), // Erkek, Kadın
  maritalStatus: varchar("marital_status", { length: 30 }), // Bekar, Evli, Boşanmış, Dul
  department: varchar("department", { length: 100 }), // BAR, Fabrika, etc.
  address: text("address"), // Home address
  city: varchar("city", { length: 100 }), // City (separate from branch city)
  militaryStatus: varchar("military_status", { length: 30 }), // Tamamlandı, Tecilli, Muaf, Tamamlanmadı
  educationLevel: varchar("education_level", { length: 100 }), // Lise, Ön Lisans, Lisans
  educationStatus: varchar("education_status", { length: 50 }), // Mezun, Öğrenci
  educationInstitution: varchar("education_institution", { length: 255 }), // School/University name
  contractType: varchar("contract_type", { length: 50 }), // Süresiz, Süreli
  homePhone: varchar("home_phone", { length: 20 }), // Home phone number
  numChildren: integer("num_children").default(0), // Number of children
  disabilityLevel: varchar("disability_level", { length: 50 }), // Yok, etc.
  leaveStartDate: date("leave_start_date"), // When employee left
  leaveReason: text("leave_reason"), // Reason for leaving
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  hashedPassword: true, // Password updates handled separately
}).partial();

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Employee Warnings table
export const employeeWarnings = pgTable("employee_warnings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  warningType: varchar("warning_type", { length: 50 }).notNull(), // verbal, written, final
  description: text("description").notNull(),
  issuedBy: varchar("issued_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmployeeWarningSchema = createInsertSchema(employeeWarnings).omit({
  id: true,
  createdAt: true,
});

export type InsertEmployeeWarning = z.infer<typeof insertEmployeeWarningSchema>;
export type EmployeeWarning = typeof employeeWarnings.$inferSelect;

// Checklists table
export const checklists = pgTable("checklists", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  frequency: varchar("frequency", { length: 50 }).notNull(), // daily, weekly, monthly
  category: varchar("category", { length: 100 }), // opening, closing, cleaning, etc.
  isEditable: boolean("is_editable").default(true),
  timeWindowStart: time("time_window_start", { precision: 0 }),
  timeWindowEnd: time("time_window_end", { precision: 0 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChecklistSchema = createInsertSchema(checklists).omit({
  id: true,
  createdAt: true,
}).refine(
  (data) => {
    if (data.timeWindowStart && data.timeWindowEnd) {
      return data.timeWindowStart < data.timeWindowEnd;
    }
    return true;
  },
  { message: "Time window start must be before end" }
);

export type InsertChecklist = z.infer<typeof insertChecklistSchema>;
export type Checklist = typeof checklists.$inferSelect;

// Checklist Tasks (many-to-many between checklists and task templates)
export const checklistTasks = pgTable("checklist_tasks", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
  taskDescription: text("task_description").notNull(),
  requiresPhoto: boolean("requires_photo").default(false),
  taskTimeStart: time("task_time_start", { precision: 0 }),
  taskTimeEnd: time("task_time_end", { precision: 0 }),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChecklistTaskSchema = createInsertSchema(checklistTasks).omit({
  id: true,
  createdAt: true,
}).refine(
  (data) => {
    return data.order > 0;
  },
  { message: "Order must be a positive integer" }
).refine(
  (data) => {
    if (data.taskTimeStart && data.taskTimeEnd) {
      return data.taskTimeStart < data.taskTimeEnd;
    }
    return true;
  },
  { message: "Task time start must be before end" }
);

export type InsertChecklistTask = z.infer<typeof insertChecklistTaskSchema>;
export type ChecklistTask = typeof checklistTasks.$inferSelect;

export const updateChecklistSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  frequency: z.string().optional(),
  category: z.string().nullable().optional(),
  isEditable: z.boolean().optional(),
  timeWindowStart: z.string().nullable().optional(),
  timeWindowEnd: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  tasks: z.array(
    z.object({
      id: z.number().nullable().optional(),
      taskDescription: z.string().min(1),
      requiresPhoto: z.boolean().default(false),
      taskTimeStart: z.string().nullable().optional(),
      taskTimeEnd: z.string().nullable().optional(),
      order: z.number(),
      _action: z.enum(['delete']).optional(),
    })
  ).optional(),
}).refine(
  (data) => {
    if (data.timeWindowStart && data.timeWindowEnd) {
      return data.timeWindowStart < data.timeWindowEnd;
    }
    return true;
  },
  { message: "Time window start must be before end" }
);

export type UpdateChecklist = z.infer<typeof updateChecklistSchema>;

// ========================================
// TASK MANAGEMENT TABLES
// ========================================

// Task status enum
export const taskStatusEnum = ["beklemede", "devam_ediyor", "foto_bekleniyor", "incelemede", "onaylandi", "reddedildi", "gecikmiş"] as const;
export type TaskStatus = typeof taskStatusEnum[number];

// Task priority enum
export const taskPriorityEnum = ["düşük", "orta", "yüksek"] as const;
export type TaskPriority = typeof taskPriorityEnum[number];

// Tasks table (actual task instances)
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").references(() => checklists.id, { onDelete: "set null" }),
  checklistTaskId: integer("checklist_task_id").references(() => checklistTasks.id, { onDelete: "set null" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }), // Nullable for HQ tasks
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  assignedById: varchar("assigned_by_id").references(() => users.id, { onDelete: "set null" }), // Who assigned the task
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("beklemede"), // beklemede, devam_ediyor, foto_bekleniyor, incelemede, onaylandi, reddedildi, gecikmiş
  priority: varchar("priority", { length: 20 }).default("orta"), // düşük, orta, yüksek
  requiresPhoto: boolean("requires_photo").default(false), // Photo mandatory
  photoUrl: text("photo_url"),
  aiAnalysis: text("ai_analysis"),
  aiScore: integer("ai_score"), // 0-100
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date"),
  // Recurring task fields
  isRecurring: boolean("is_recurring").default(false),
  recurrenceType: varchar("recurrence_type", { length: 20 }), // daily, weekly, monthly
  recurrenceInterval: integer("recurrence_interval").default(1), // Every N days/weeks/months
  lastRecurredAt: timestamp("last_recurred_at"),
  nextRunAt: timestamp("next_run_at"), // When the next recurrence should trigger
  // Task lifecycle fields
  acknowledgedAt: timestamp("acknowledged_at"), // When assignee marked as "seen"
  acknowledgedById: varchar("acknowledged_by_id").references(() => users.id, { onDelete: "set null" }),
  failureNote: text("failure_note"), // Required when status is "basarisiz"
  statusUpdatedAt: timestamp("status_updated_at"), // Last status change time
  statusUpdatedById: varchar("status_updated_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  branchStatusIdx: index("tasks_branch_status_idx").on(table.branchId, table.status),
  assignedToIdx: index("tasks_assigned_to_idx").on(table.assignedToId),
}));

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(taskStatusEnum).optional(),
  priority: z.enum(taskPriorityEnum).optional(),
  branchId: z.number().nullable().optional(),
  dueDate: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
});

export const updateTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(taskStatusEnum).optional(),
  priority: z.enum(taskPriorityEnum).optional(),
  branchId: z.number().nullable().optional(),
  dueDate: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
}).partial();

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Task Status History - tracks all status changes
export const taskStatusHistory = pgTable("task_status_history", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }).notNull(),
  changedById: varchar("changed_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  note: text("note"), // Optional note explaining the change
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  taskIdIdx: index("task_status_history_task_idx").on(table.taskId),
}));

export const insertTaskStatusHistorySchema = createInsertSchema(taskStatusHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskStatusHistory = z.infer<typeof insertTaskStatusHistorySchema>;
export type TaskStatusHistory = typeof taskStatusHistory.$inferSelect;

// ========================================
// TASK RATINGS TABLE (Manual rating by assigner)
// ========================================

export const taskRatings = pgTable("task_ratings", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  ratedById: varchar("rated_by_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Assigner who rates
  ratedUserId: varchar("rated_user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Assignee being rated
  rawRating: integer("raw_rating").notNull(), // What assigner submitted (1-5)
  finalRating: integer("final_rating").notNull(), // After penalty applied (1-5)
  penaltyApplied: integer("penalty_applied").default(0), // 0 or 1 (late delivery penalty)
  isLate: boolean("is_late").default(false), // Whether task was completed after deadline
  feedback: text("feedback"), // Optional comment from assigner
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  taskIdUniqueIdx: uniqueIndex("task_ratings_task_id_unique_idx").on(table.taskId), // One rating per task
  ratedUserIdx: index("task_ratings_rated_user_idx").on(table.ratedUserId),
}));

export const insertTaskRatingSchema = createInsertSchema(taskRatings).omit({
  id: true,
  createdAt: true,
}).extend({
  rawRating: z.number().min(1).max(5),
  finalRating: z.number().min(1).max(5),
  penaltyApplied: z.number().min(0).max(1).optional(),
  isLate: z.boolean().optional(),
  feedback: z.string().max(500).optional(),
});

export type InsertTaskRating = z.infer<typeof insertTaskRatingSchema>;
export type TaskRating = typeof taskRatings.$inferSelect;

// ========================================
// CHECKLIST RATINGS TABLE (Automatic rating based on completion)
// ========================================

export const checklistRatings = pgTable("checklist_ratings", {
  id: serial("id").primaryKey(),
  checklistInstanceId: integer("checklist_instance_id").notNull(), // Reference to daily checklist assignment
  checklistId: integer("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Person being rated
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  completionRate: real("completion_rate").notNull(), // 0.0 - 1.0 (percentage of tasks completed)
  isOnTime: boolean("is_on_time").default(true), // Completed before deadline?
  rawScore: integer("raw_score").notNull(), // Score before penalty (1-5)
  finalScore: integer("final_score").notNull(), // After penalty applied (1-5)
  penaltyApplied: integer("penalty_applied").default(0), // 0 or 1 (late penalty)
  totalTasks: integer("total_tasks").notNull(), // How many tasks in checklist
  completedTasks: integer("completed_tasks").notNull(), // How many completed
  checklistDate: date("checklist_date").notNull(), // Which day's checklist
  scoredAt: timestamp("scored_at").defaultNow(),
}, (table) => ({
  userDateIdx: index("checklist_ratings_user_date_idx").on(table.userId, table.checklistDate),
  branchDateIdx: index("checklist_ratings_branch_date_idx").on(table.branchId, table.checklistDate),
}));

export const insertChecklistRatingSchema = createInsertSchema(checklistRatings).omit({
  id: true,
  scoredAt: true,
}).extend({
  completionRate: z.number().min(0).max(1),
  rawScore: z.number().min(1).max(5),
  finalScore: z.number().min(1).max(5),
  penaltyApplied: z.number().min(0).max(1).optional(),
});

export type InsertChecklistRating = z.infer<typeof insertChecklistRatingSchema>;
export type ChecklistRating = typeof checklistRatings.$inferSelect;

// ========================================
// EMPLOYEE SATISFACTION SCORES (Aggregated task/checklist ratings)
// ========================================

export const employeeSatisfactionScores = pgTable("employee_satisfaction_scores", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  // Task satisfaction metrics
  taskRatingCount: integer("task_rating_count").default(0), // Total rated tasks
  taskRatingSum: real("task_rating_sum").default(0), // Sum of finalRatings
  taskSatisfactionAvg: real("task_satisfaction_avg").default(0), // Average 1-5
  taskOnTimeCount: integer("task_on_time_count").default(0), // Tasks completed on time
  taskLateCount: integer("task_late_count").default(0), // Tasks completed late
  // Checklist discipline metrics
  checklistRatingCount: integer("checklist_rating_count").default(0), // Total rated checklists
  checklistRatingSum: real("checklist_rating_sum").default(0), // Sum of finalScores
  checklistScoreAvg: real("checklist_score_avg").default(0), // Average 1-5
  checklistOnTimeCount: integer("checklist_on_time_count").default(0),
  checklistLateCount: integer("checklist_late_count").default(0),
  // Composite score (100 üzerinden)
  onTimeRate: real("on_time_rate").default(0), // Percentage of on-time completions
  compositeScore: real("composite_score").default(0), // 0-100 weighted score
  // Metadata
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdUniqueIdx: uniqueIndex("employee_satisfaction_scores_user_unique_idx").on(table.userId),
  branchIdx: index("employee_satisfaction_scores_branch_idx").on(table.branchId),
  compositeScoreIdx: index("employee_satisfaction_scores_composite_idx").on(table.compositeScore),
}));

export const insertEmployeeSatisfactionScoreSchema = createInsertSchema(employeeSatisfactionScores).omit({
  id: true,
  lastCalculatedAt: true,
  updatedAt: true,
});

export type InsertEmployeeSatisfactionScore = z.infer<typeof insertEmployeeSatisfactionScoreSchema>;
export type EmployeeSatisfactionScore = typeof employeeSatisfactionScores.$inferSelect;

// ========================================
// EQUIPMENT MANAGEMENT TABLES
// ========================================

// Equipment Types (8 types)
export const EQUIPMENT_TYPES = {
  ESPRESSO: "espresso",          // Thermoplan Espresso Machine
  KREMA: "krema",                // Krema Machine
  MIXER: "mixer",                // Artemis Mixer
  BLENDER: "blender",            // Blendtech Blender
  CASH: "cash",                  // Cash System
  KIOSK: "kiosk",                // Kiosk System
  TEA: "tea",                    // Tea Machine
  ICE: "ice",                    // Manitowock Ice Machine
} as const;

export type EquipmentType = typeof EQUIPMENT_TYPES[keyof typeof EQUIPMENT_TYPES];

// Equipment static metadata (Turkish names, maintenance intervals, routing)
export const EQUIPMENT_METADATA: Record<EquipmentType, {
  nameTr: string;
  category: string;
  maintenanceInterval: number; // days
  maintenanceResponsible: 'branch' | 'hq';
  faultProtocol: 'branch' | 'hq_teknik';
}> = {
  espresso: {
    nameTr: "Thermoplan Espresso Makinesi",
    category: "kahve",
    maintenanceInterval: 30, // Monthly
    maintenanceResponsible: "branch",
    faultProtocol: "hq_teknik", // HQ technical team handles espresso machine faults
  },
  krema: {
    nameTr: "Krema Makinesi",
    category: "kahve",
    maintenanceInterval: 30,
    maintenanceResponsible: "branch",
    faultProtocol: "hq_teknik",
  },
  mixer: {
    nameTr: "Artemis Karıştırıcı",
    category: "mutfak",
    maintenanceInterval: 90, // Quarterly
    maintenanceResponsible: "branch",
    faultProtocol: "branch", // Branch can handle mixer issues
  },
  blender: {
    nameTr: "Blendtech Blender",
    category: "mutfak",
    maintenanceInterval: 60, // Bi-monthly
    maintenanceResponsible: "branch",
    faultProtocol: "branch",
  },
  cash: {
    nameTr: "Kasa Sistemi",
    category: "sistem",
    maintenanceInterval: 180, // Semi-annual
    maintenanceResponsible: "hq",
    faultProtocol: "hq_teknik",
  },
  kiosk: {
    nameTr: "Kiosk Sistemi",
    category: "sistem",
    maintenanceInterval: 90,
    maintenanceResponsible: "hq",
    faultProtocol: "hq_teknik",
  },
  tea: {
    nameTr: "Çay Makinesi",
    category: "mutfak",
    maintenanceInterval: 90,
    maintenanceResponsible: "branch",
    faultProtocol: "branch",
  },
  ice: {
    nameTr: "Manitowock Buz Makinesi",
    category: "mutfak",
    maintenanceInterval: 60,
    maintenanceResponsible: "branch",
    faultProtocol: "branch",
  },
};

// Equipment table
export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  equipmentType: varchar("equipment_type", { length: 50 }).notNull(), // espresso, krema, mixer, etc.
  modelNo: varchar("model_no", { length: 255 }), // Model numarası
  serialNumber: varchar("serial_number", { length: 255 }),
  imageUrl: text("image_url"), // Ekipman banner/görseli
  purchaseDate: date("purchase_date"),
  warrantyEndDate: date("warranty_end_date"),
  // Routing: Who maintains / handles faults
  maintenanceResponsible: varchar("maintenance_responsible", { length: 20 }).notNull().default("branch"), // 'branch' | 'hq'
  faultProtocol: varchar("fault_protocol", { length: 20 }).notNull().default("branch"), // 'branch' | 'hq_teknik'
  // Service contact info (HQ managed)
  serviceContactName: varchar("service_contact_name", { length: 255 }), // Servis firma adı
  serviceContactPhone: varchar("service_contact_phone", { length: 50 }), // Servis telefon
  serviceContactEmail: varchar("service_contact_email", { length: 255 }), // Servis email
  serviceContactAddress: text("service_contact_address"), // Servis adres
  serviceHandledBy: varchar("service_handled_by", { length: 20 }).default("hq"), // 'branch' (şube servisle iletişim kurar) | 'hq' (HQ yönetir)
  // Maintenance tracking
  lastMaintenanceDate: date("last_maintenance_date"),
  nextMaintenanceDate: date("next_maintenance_date"),
  maintenanceIntervalDays: integer("maintenance_interval_days").default(30),
  // QR code for quick access
  qrCodeUrl: text("qr_code_url"),
  notes: text("notes"),
  // Service scope: who services this equipment
  servicingScope: varchar("servicing_scope", { length: 20 }).notNull().default("branch"), // 'branch' | 'hq'
  // Maximum acceptable service time in hours before alarm
  maxServiceTimeHours: integer("max_service_time_hours").default(48), // Alert threshold
  // Alarm threshold in hours - send notification when exceeded
  alertThresholdHours: integer("alert_threshold_hours").default(36),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipment.$inferSelect;

// Fault Stage enum for tracking workflow
export const FAULT_STAGES = {
  BEKLIYOR: 'bekliyor',              // Waiting (just reported)
  ISLEME_ALINDI: 'isleme_alindi',    // Acknowledged by branch/HQ
  SERVIS_CAGRILDI: 'servis_cagrildi', // Service called (external repair)
  KARGOYA_VERILDI: 'kargoya_verildi', // Shipped to manufacturer
  TESLIM_ALINDI: 'teslim_alindi',    // Delivered back from repair
  TAKIP_EDILIYOR: 'takip_ediliyor',  // In progress (internal tracking)
  KAPATILDI: 'kapatildi',            // Closed (resolved)
} as const;

export type FaultStageType = typeof FAULT_STAGES[keyof typeof FAULT_STAGES];

// Priority levels for faults
export const PRIORITY_LEVELS = {
  GREEN: 'green',   // Low priority (can wait)
  YELLOW: 'yellow', // Medium priority (needs attention)
  RED: 'red',       // High priority (urgent, production impact)
} as const;

export type PriorityLevel = typeof PRIORITY_LEVELS[keyof typeof PRIORITY_LEVELS];

// Equipment Faults table
export const equipmentFaults = pgTable("equipment_faults", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  equipmentId: integer("equipment_id").references(() => equipment.id, { onDelete: "set null" }), // Link to equipment table
  reportedById: varchar("reported_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  equipmentName: varchar("equipment_name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  photoUrl: text("photo_url"),
  aiAnalysis: text("ai_analysis"),
  aiSeverity: varchar("ai_severity", { length: 50 }), // low, medium, high, critical
  aiRecommendations: text("ai_recommendations").array(),
  status: varchar("status", { length: 50 }).notNull().default("acik"), // acik, devam_ediyor, cozuldu (legacy)
  priority: varchar("priority", { length: 50 }).default("orta"), // dusuk, orta, yuksek (legacy)
  // New multi-stage fault tracking
  priorityLevel: varchar("priority_level", { length: 20 }).notNull().default(PRIORITY_LEVELS.YELLOW), // green, yellow, red
  currentStage: varchar("current_stage", { length: 50 }).notNull().default(FAULT_STAGES.BEKLIYOR),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }), // Assigned user (branch or HQ teknik)
  stageHistory: jsonb("stage_history").$type<Array<{
    stage: FaultStageType;
    changedBy: string;
    changedAt: string;
    notes?: string;
  }>>().default([]),
  // Cost tracking
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: numeric("actual_cost", { precision: 10, scale: 2 }),
  // Troubleshooting requirement
  troubleshootingCompleted: boolean("troubleshooting_completed").notNull().default(false),
  completedTroubleshootingSteps: jsonb("completed_troubleshooting_steps").$type<Array<{
    stepId: number;
    completedAt: string;
    photoUrl?: string;
    notes?: string;
  }>>().default([]),
  // Detailed fault report (checkbox selections)
  faultReportDetails: jsonb("fault_report_details").$type<{
    symptoms: string[]; // Selected symptom checkboxes
    affectedAreas: string[];
    immediateImpact: boolean; // Production affected
    safetyHazard: boolean; // Safety concern
    partsIdentified: string[];
    notes: string;
  }>(),
  // Service time tracking
  serviceRequestedAt: timestamp("service_requested_at"),
  serviceAlarmSent: boolean("service_alarm_sent").default(false),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  branchStageIdx: index("equipment_faults_branch_stage_idx").on(table.branchId, table.currentStage),
  equipmentIdx: index("equipment_faults_equipment_idx").on(table.equipmentId),
  troubleshootingIdx: index("equipment_faults_troubleshooting_idx").on(table.troubleshootingCompleted),
}));

export const insertEquipmentFaultSchema = createInsertSchema(equipmentFaults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEquipmentFault = z.infer<typeof insertEquipmentFaultSchema>;
export type EquipmentFault = typeof equipmentFaults.$inferSelect;

// Equipment Troubleshooting Completion table - Track completed steps per fault
export const equipmentTroubleshootingCompletion = pgTable("equipment_troubleshooting_completion", {
  id: serial("id").primaryKey(),
  faultId: integer("fault_id").notNull().references(() => equipmentFaults.id, { onDelete: "cascade" }),
  stepId: integer("step_id").notNull().references(() => equipmentTroubleshootingSteps.id, { onDelete: "cascade" }),
  completedById: varchar("completed_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url"), // If step required photo
  notes: text("notes"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("troubleshooting_completion_fault_idx").on(table.faultId),
  index("troubleshooting_completion_step_idx").on(table.stepId),
  unique("unique_fault_step").on(table.faultId, table.stepId),
]);

export const insertEquipmentTroubleshootingCompletionSchema = createInsertSchema(equipmentTroubleshootingCompletion).omit({
  id: true,
  completedAt: true,
  createdAt: true,
});

export type InsertEquipmentTroubleshootingCompletion = z.infer<typeof insertEquipmentTroubleshootingCompletionSchema>;
export type EquipmentTroubleshootingCompletion = typeof equipmentTroubleshootingCompletion.$inferSelect;

// Fault Stage Transitions table (audit log for stage changes)
export const faultStageTransitions = pgTable("fault_stage_transitions", {
  id: serial("id").primaryKey(),
  faultId: integer("fault_id").notNull().references(() => equipmentFaults.id, { onDelete: "cascade" }),
  fromStage: varchar("from_stage", { length: 50 }), // null for initial creation
  toStage: varchar("to_stage", { length: 50 }).notNull(),
  changedBy: varchar("changed_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  notes: text("notes"),
});

export const insertFaultStageTransitionSchema = createInsertSchema(faultStageTransitions).omit({
  id: true,
  changedAt: true,
});

export type InsertFaultStageTransition = z.infer<typeof insertFaultStageTransitionSchema>;
export type FaultStageTransition = typeof faultStageTransitions.$inferSelect;

// Knowledge Base Articles table
export const knowledgeBaseArticles = pgTable("knowledge_base_articles", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // sop, recipe, maintenance, training
  content: text("content").notNull(),
  tags: text("tags").array(),
  attachmentUrls: text("attachment_urls").array(),
  isPublished: boolean("is_published").default(false),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKnowledgeBaseArticleSchema = createInsertSchema(knowledgeBaseArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertKnowledgeBaseArticle = z.infer<typeof insertKnowledgeBaseArticleSchema>;
export type KnowledgeBaseArticle = typeof knowledgeBaseArticles.$inferSelect;

// Knowledge Base Embeddings table (for RAG/semantic search)
export const knowledgeBaseEmbeddings = pgTable("knowledge_base_embeddings", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => knowledgeBaseArticles.id, { onDelete: "cascade" }),
  chunkText: text("chunk_text").notNull(),
  chunkIndex: integer("chunk_index").notNull(), // For ordering chunks within an article
  embedding: vector("embedding").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("kb_embeddings_article_idx").on(table.articleId),
]);

export const insertKnowledgeBaseEmbeddingSchema = createInsertSchema(knowledgeBaseEmbeddings).omit({
  id: true,
  createdAt: true,
});

export type InsertKnowledgeBaseEmbedding = z.infer<typeof insertKnowledgeBaseEmbeddingSchema>;
export type KnowledgeBaseEmbedding = typeof knowledgeBaseEmbeddings.$inferSelect;

// Reminders table
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reminderCount: integer("reminder_count").default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  nextReminderAt: timestamp("next_reminder_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
});

export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

// Performance Metrics table
export const performanceMetrics = pgTable("performance_metrics", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  tasksCompleted: integer("tasks_completed").default(0),
  tasksTotal: integer("tasks_total").default(0),
  completionRate: integer("completion_rate").default(0), // percentage
  averageAiScore: integer("average_ai_score").default(0),
  taskScore: integer("task_score").default(0), // 0-100 (task completion rate)
  photoScore: integer("photo_score").default(0), // 0-100 (AI photo analysis average)
  timeScore: integer("time_score").default(0), // 0-100 (on-time completion rate)
  supervisorScore: integer("supervisor_score").default(0), // 0-100 (manual supervisor rating)
  totalScore: integer("total_score").default(0), // Weighted: task 40% + photo 25% + time 25% + supervisor 10%
  faultsReported: integer("faults_reported").default(0),
  faultsResolved: integer("faults_resolved").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  branchDateIdx: index("performance_metrics_branch_date_idx").on(table.branchId, table.date),
  userDateIdx: index("performance_metrics_user_date_idx").on(table.userId, table.date),
  ownershipCheck: check("ownership_check", sql`branch_id IS NOT NULL OR user_id IS NOT NULL`),
}));

export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({
  id: true,
  createdAt: true,
  totalScore: true, // Calculated field
}).refine(
  (data) => data.branchId !== undefined || data.userId !== undefined,
  { message: "Either branchId or userId must be provided" }
).refine(
  (data) => {
    const scores = [data.taskScore, data.photoScore, data.timeScore, data.supervisorScore];
    return scores.every(s => s === undefined || s === null || (s >= 0 && s <= 100));
  },
  { message: "All scores must be between 0 and 100" }
);

export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;

// ========================================
// TRAINING SYSTEM TABLES
// ========================================

// Training Modules (e.g., "Espresso Basics", "Latte Art", "Customer Service")
export const trainingModules = pgTable("training_modules", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  code: varchar("code", { length: 50 }), // e.g., "S1", "BB2", for JSON mapping
  slug: varchar("slug", { length: 100 }), // URL-friendly slug
  category: varchar("category", { length: 100 }), // "barista", "supervisor", "hygiene", etc.
  moduleType: varchar("module_type", { length: 50 }).default("skill"), // skill, recipe, onboarding, general
  recipeCategoryId: integer("recipe_category_id"), // Link to recipe_categories for recipe modules
  level: varchar("level", { length: 50 }).default("beginner"), // beginner, intermediate, advanced
  estimatedDuration: integer("estimated_duration").default(30), // minutes
  isPublished: boolean("is_published").default(false),
  isRequired: boolean("is_required").default(false), // Zorunlu modül mü?
  requiredForRole: varchar("required_for_role", { length: 100 }).array(), // ["barista", "supervisor"]
  prerequisiteModuleIds: integer("prerequisite_module_ids").array(), // Must complete these first
  heroImageUrl: text("hero_image_url"), // Module banner image
  galleryImages: jsonb("gallery_images").$type<Array<{url: string; alt?: string; uploadedAt: number}>>().default([]), // Module gallery images (optimized)
  learningObjectives: jsonb("learning_objectives").$type<string[]>().default([]), // ["Objective 1", "Objective 2"]
  steps: jsonb("steps").$type<Array<{stepNumber: number; title: string; content: string; mediaSuggestions?: string[]}>>().default([]),
  scenarioTasks: jsonb("scenario_tasks").$type<Array<{scenarioId: string; title: string; description: string; expectedActions: string[]}>>().default([]),
  supervisorChecklist: jsonb("supervisor_checklist").$type<string[]>().default([]), // Supervisor review items
  quiz: jsonb("quiz").$type<Array<{questionId: string; questionType: string; questionText: string; options: string[]; correctOptionIndex: number}>>().default([]), // Quiz questions
  tags: varchar("tags", { length: 100 }).array(), // ["kültür", "disiplin", "stajyer"]
  generatedByAi: boolean("generated_by_ai").default(false), // AI generation metadata
  xpReward: integer("xp_reward").default(50), // XP points for completing module
  mainVideoUrl: text("main_video_url"), // Primary video URL (YouTube/S3)
  mindmapData: jsonb("mindmap_data").$type<{nodes: {id: string; label: string; level: number}[]; edges: {source: string; target: string}[]}>(), // AI-generated knowledge map
  aiSummary: text("ai_summary"), // AI-generated module summary
  examPassingScore: integer("exam_passing_score").default(70), // Passing score for final exam
  maxRetries: integer("max_retries").default(3), // Max exam retry attempts
  isActive: boolean("is_active").default(true), // Active/inactive status
  createdBy: varchar("created_by").references(() => users.id), // VARCHAR - users.id is UUID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Module Media (Images, videos, documents)
export const moduleMedia = pgTable("module_media", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  mediaType: varchar("media_type", { length: 50 }).notNull(), // "image", "video", "pdf", "document"
  objectKey: text("object_key").notNull(), // Cloud storage object key
  url: text("url").notNull(), // Public/signed URL
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"), // bytes
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Module Videos
export const moduleVideos = pgTable("module_videos", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  videoUrl: text("video_url").notNull(), // S3 URL or YouTube embed
  duration: integer("duration").default(0), // seconds
  orderIndex: integer("order_index").default(0),
  transcript: text("transcript"), // For AI assistant context
  createdAt: timestamp("created_at").defaultNow(),
});

// Module Lessons (Step-by-step content)
export const moduleLessons = pgTable("module_lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // Rich text content (Markdown or HTML)
  orderIndex: integer("order_index").default(0),
  estimatedDuration: integer("estimated_duration").default(5), // minutes
  lessonType: varchar("lesson_type", { length: 50 }).default("reading"), // reading, video, interactive, practice
  videoUrl: text("video_url"), // Optional embedded video
  imageUrl: text("image_url"), // Optional image
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Module Quizzes
export const moduleQuizzes = pgTable("module_quizzes", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  passingScore: integer("passing_score").default(70), // percentage
  timeLimit: integer("time_limit"), // minutes, null = unlimited
  isExam: boolean("is_exam").default(false), // Requires supervisor approval
  randomizeQuestions: boolean("randomize_questions").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quiz Questions
export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => moduleQuizzes.id, { onDelete: "cascade" }),
  careerQuizId: integer("career_quiz_id").references(() => quizzes.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  questionType: varchar("question_type", { length: 50 }).default("multiple_choice"), // multiple_choice, true_false, short_answer
  options: text("options").array(), // JSON array for multiple choice
  correctAnswer: text("correct_answer").notNull(),
  correctAnswerIndex: integer("correct_answer_index").default(0),
  explanation: text("explanation"),
  points: integer("points").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Flashcards (AI-generated and cached for cost optimization)
export const flashcards = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  front: text("front").notNull(), // Question/term
  back: text("back").notNull(), // Answer/definition
  category: varchar("category", { length: 100 }),
  difficulty: varchar("difficulty", { length: 50 }).default("medium"),
  isAiGenerated: boolean("is_ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Training Progress
export const userTrainingProgress = pgTable("user_training_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // VARCHAR - users.id is UUID
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).default("not_started"), // not_started, in_progress, completed
  progressPercentage: integer("progress_percentage").default(0),
  videosWatched: integer("videos_watched").array().default([]), // Array of video IDs
  lastAccessedAt: timestamp("last_accessed_at"),
  completedAt: timestamp("completed_at"),
  certificateIssued: boolean("certificate_issued").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint for upsert on (userId, moduleId)
  uniqueUserModule: uniqueIndex("user_training_progress_user_module_idx").on(table.userId, table.moduleId),
}));

// User Quiz Attempts
export const userQuizAttempts = pgTable("user_quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // VARCHAR - users.id is UUID
  quizId: integer("quiz_id").notNull().references(() => moduleQuizzes.id, { onDelete: "cascade" }),
  score: integer("score").default(0), // percentage
  answers: text("answers"), // JSON storing question_id -> user_answer
  isPassed: boolean("is_passed").default(false),
  timeSpent: integer("time_spent"), // seconds
  attemptNumber: integer("attempt_number").default(1),
  isExamAttempt: boolean("is_exam_attempt").default(false),
  approvedBy: varchar("approved_by").references(() => users.id), // VARCHAR - Supervisor/coach approval
  approvalStatus: varchar("approval_status", { length: 50 }).default("pending"), // pending, approved, rejected
  feedback: text("feedback"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertModuleMediaSchema = createInsertSchema(moduleMedia).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingModuleSchema = createInsertSchema(trainingModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertModuleVideoSchema = createInsertSchema(moduleVideos).omit({
  id: true,
  createdAt: true,
});

export const insertModuleLessonSchema = createInsertSchema(moduleLessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertModuleQuizSchema = createInsertSchema(moduleQuizzes).omit({
  id: true,
  createdAt: true,
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertFlashcardSchema = createInsertSchema(flashcards).omit({
  id: true,
  createdAt: true,
});

export const insertUserTrainingProgressSchema = createInsertSchema(userTrainingProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserQuizAttemptSchema = createInsertSchema(userQuizAttempts).omit({
  id: true,
  startedAt: true,
});

export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;
export type TrainingModule = typeof trainingModules.$inferSelect;
export type InsertModuleMedia = z.infer<typeof insertModuleMediaSchema>;
export type ModuleMedia = typeof moduleMedia.$inferSelect;
export type InsertModuleVideo = z.infer<typeof insertModuleVideoSchema>;
export type ModuleVideo = typeof moduleVideos.$inferSelect;
export type InsertModuleLesson = z.infer<typeof insertModuleLessonSchema>;
export type ModuleLesson = typeof moduleLessons.$inferSelect;
export type InsertModuleQuiz = z.infer<typeof insertModuleQuizSchema>;
export type ModuleQuiz = typeof moduleQuizzes.$inferSelect;
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcards.$inferSelect;
export type InsertUserTrainingProgress = z.infer<typeof insertUserTrainingProgressSchema>;
export type UserTrainingProgress = typeof userTrainingProgress.$inferSelect;
export type InsertUserQuizAttempt = z.infer<typeof insertUserQuizAttemptSchema>;
export type UserQuizAttempt = typeof userQuizAttempts.$inferSelect;

// Messages table - Inter-user and system messaging with thread support
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: varchar("thread_id").notNull(), // Group messages into conversations
  parentMessageId: integer("parent_message_id").references((): any => messages.id), // For reply chains
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id").references(() => users.id, { onDelete: "cascade" }), // null for role-based broadcast
  recipientRole: varchar("recipient_role", { length: 50 }), // null for specific user messages
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // task_assignment, hq_message, branch_message, notification
  attachments: jsonb("attachments").$type<{id: string, url: string, type: string, name: string, size: number}[]>().default([]),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Index for fast inbox queries
  recipientIdx: index("messages_recipient_idx").on(table.recipientId),
  recipientRoleIdx: index("messages_recipient_role_idx").on(table.recipientRole),
  senderIdx: index("messages_sender_idx").on(table.senderId),
  threadIdx: index("messages_thread_idx").on(table.threadId),
}));

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Thread Participants - Track users in each conversation thread
export const threadParticipants = pgTable("thread_participants", {
  id: serial("id").primaryKey(),
  threadId: varchar("thread_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastReadAt: timestamp("last_read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  threadUserIdx: uniqueIndex("thread_participants_thread_user_idx").on(table.threadId, table.userId),
}));

export const insertThreadParticipantSchema = createInsertSchema(threadParticipants).omit({
  id: true,
  createdAt: true,
});

export type InsertThreadParticipant = z.infer<typeof insertThreadParticipantSchema>;
export type ThreadParticipant = typeof threadParticipants.$inferSelect;

// Message Reads - Junction table for tracking read status per user (supports broadcasts)
export const messageReads = pgTable("message_reads", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserMessage: uniqueIndex("message_reads_user_message_idx").on(table.messageId, table.userId),
}));

export const insertMessageReadSchema = createInsertSchema(messageReads).omit({
  id: true,
  readAt: true,
});

export type InsertMessageRead = z.infer<typeof insertMessageReadSchema>;
export type MessageRead = typeof messageReads.$inferSelect;

// Equipment Maintenance Logs table
export const equipmentMaintenanceLogs = pgTable("equipment_maintenance_logs", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  performedBy: varchar("performed_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  maintenanceType: varchar("maintenance_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }),
  performedAt: timestamp("performed_at").notNull().defaultNow(),
  nextScheduledDate: date("next_scheduled_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEquipmentMaintenanceLogSchema = createInsertSchema(equipmentMaintenanceLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertEquipmentMaintenanceLog = z.infer<typeof insertEquipmentMaintenanceLogSchema>;
export type EquipmentMaintenanceLog = typeof equipmentMaintenanceLogs.$inferSelect;

// Equipment Comments table
export const equipmentComments = pgTable("equipment_comments", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEquipmentCommentSchema = createInsertSchema(equipmentComments).omit({
  id: true,
  createdAt: true,
});

export type InsertEquipmentComment = z.infer<typeof insertEquipmentCommentSchema>;
export type EquipmentComment = typeof equipmentComments.$inferSelect;

// Equipment Service Request Status enum
export const SERVICE_REQUEST_STATUS = {
  CREATED: 'created',
  SERVICE_CALLED: 'service_called',
  IN_PROGRESS: 'in_progress',
  FIXED: 'fixed',
  NOT_FIXED: 'not_fixed',
  WARRANTY_CLAIMED: 'warranty_claimed',
  DEVICE_SHIPPED: 'device_shipped',
  CLOSED: 'closed',
} as const;

export type ServiceRequestStatusType = typeof SERVICE_REQUEST_STATUS[keyof typeof SERVICE_REQUEST_STATUS];

// Service Decision enum
export const SERVICE_DECISION = {
  HQ: 'hq',
  BRANCH: 'branch',
} as const;

export type ServiceDecisionType = typeof SERVICE_DECISION[keyof typeof SERVICE_DECISION];

// Equipment Service Requests table
export const equipmentServiceRequests = pgTable("equipment_service_requests", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  faultId: integer("fault_id").references(() => equipmentFaults.id, { onDelete: "set null" }),
  serviceDecision: varchar("service_decision", { length: 20 }).notNull(),
  serviceProvider: text("service_provider"),
  contactInfo: text("contact_info"),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: numeric("actual_cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).notNull().default(SERVICE_REQUEST_STATUS.CREATED),
  timeline: jsonb("timeline").$type<Array<{
    id: string;
    timestamp: string;
    status: ServiceRequestStatusType;
    actorId: string;
    notes?: string;
    meta?: Record<string, any>;
  }>>().default([]),
  photo1Url: text("photo1_url"),
  photo2Url: text("photo2_url"),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  equipmentIdx: index("equipment_service_requests_equipment_idx").on(table.equipmentId),
  statusIdx: index("equipment_service_requests_status_idx").on(table.status),
  faultIdx: index("equipment_service_requests_fault_idx").on(table.faultId),
}));

export const insertEquipmentServiceRequestSchema = createInsertSchema(equipmentServiceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  timeline: true,
});

export type InsertEquipmentServiceRequest = z.infer<typeof insertEquipmentServiceRequestSchema>;
export type EquipmentServiceRequest = typeof equipmentServiceRequests.$inferSelect;

// Relations (defined after all tables to avoid temporal dead zone)
export const branchesRelations = relations(branches, ({ many }) => ({
  users: many(users),
  tasks: many(tasks),
  faults: many(equipmentFaults),
  metrics: many(performanceMetrics),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  branch: one(branches, {
    fields: [users.branchId],
    references: [branches.id],
  }),
  tasksCreated: many(tasks),
  faultsReported: many(equipmentFaults),
  pageContentCreated: many(pageContent, { relationName: "pageContentCreatedBy" }),
  pageContentUpdated: many(pageContent, { relationName: "pageContentUpdatedBy" }),
}));

export const checklistsRelations = relations(checklists, ({ many }) => ({
  checklistTasks: many(checklistTasks),
}));

export const checklistTasksRelations = relations(checklistTasks, ({ one }) => ({
  checklist: one(checklists, {
    fields: [checklistTasks.checklistId],
    references: [checklists.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  checklist: one(checklists, {
    fields: [tasks.checklistId],
    references: [checklists.id],
  }),
  checklistTask: one(checklistTasks, {
    fields: [tasks.checklistTaskId],
    references: [checklistTasks.id],
  }),
  branch: one(branches, {
    fields: [tasks.branchId],
    references: [branches.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
  }),
}));

export const equipmentFaultsRelations = relations(equipmentFaults, ({ one }) => ({
  branch: one(branches, {
    fields: [equipmentFaults.branchId],
    references: [branches.id],
  }),
  reportedBy: one(users, {
    fields: [equipmentFaults.reportedById],
    references: [users.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  task: one(tasks, {
    fields: [reminders.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [reminders.userId],
    references: [users.id],
  }),
}));

export const performanceMetricsRelations = relations(performanceMetrics, ({ one }) => ({
  branch: one(branches, {
    fields: [performanceMetrics.branchId],
    references: [branches.id],
  }),
}));

export const equipmentRelations = relations(equipment, ({ one, many }) => ({
  branch: one(branches, {
    fields: [equipment.branchId],
    references: [branches.id],
  }),
  faults: many(equipmentFaults),
  maintenanceLogs: many(equipmentMaintenanceLogs),
  comments: many(equipmentComments),
  serviceRequests: many(equipmentServiceRequests),
}));

export const equipmentServiceRequestsRelations = relations(equipmentServiceRequests, ({ one }) => ({
  equipment: one(equipment, {
    fields: [equipmentServiceRequests.equipmentId],
    references: [equipment.id],
  }),
  fault: one(equipmentFaults, {
    fields: [equipmentServiceRequests.faultId],
    references: [equipmentFaults.id],
  }),
  createdBy: one(users, {
    fields: [equipmentServiceRequests.createdById],
    references: [users.id],
  }),
}));

// HQ Support Ticket Status
export const HQ_SUPPORT_STATUS = {
  AKTIF: 'aktif',
  KAPATILDI: 'kapatildi',
} as const;

export type HQSupportStatusType = typeof HQ_SUPPORT_STATUS[keyof typeof HQ_SUPPORT_STATUS];

// HQ Support Category (which HQ department)
export const HQ_SUPPORT_CATEGORY = {
  ARIZA: 'ariza',           // Equipment/machine issues
  TEKNIK: 'teknik',         // Technical support
  MUHASEBE: 'muhasebe',     // Accounting/finance
  LOJISTIK: 'lojistik',     // Logistics/supply chain
  FABRIKA: 'fabrika',       // Factory/production
  URUN_URETIM: 'urun_uretim', // Product/production
  SATINALMA: 'satinalma',   // Purchasing
  COACH: 'coach',           // Training/coaching
  DESTEK: 'destek',         // General support
  GENEL: 'genel',           // General inquiries
} as const;

export type HQSupportCategoryType = typeof HQ_SUPPORT_CATEGORY[keyof typeof HQ_SUPPORT_CATEGORY];

// Support ticket priority
export const TICKET_PRIORITY = {
  DUSUK: 'dusuk',
  NORMAL: 'normal',
  YUKSEK: 'yuksek',
  ACIL: 'acil',
} as const;

export type TicketPriorityType = typeof TICKET_PRIORITY[keyof typeof TICKET_PRIORITY];

// HQ Support Tickets table
export const hqSupportTickets = pgTable("hq_support_tickets", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  priority: varchar("priority", { length: 20 }).notNull().default(TICKET_PRIORITY.NORMAL),
  status: varchar("status", { length: 20 }).notNull().default(HQ_SUPPORT_STATUS.AKTIF),
  closedAt: timestamp("closed_at"),
  closedBy: varchar("closed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("hq_support_tickets_branch_idx").on(table.branchId),
  index("hq_support_tickets_category_idx").on(table.category),
  index("hq_support_tickets_status_idx").on(table.status),
  index("hq_support_tickets_priority_idx").on(table.priority),
  index("hq_support_tickets_assigned_idx").on(table.assignedToId),
]);

export const insertHQSupportTicketSchema = createInsertSchema(hqSupportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHQSupportTicket = z.infer<typeof insertHQSupportTicketSchema>;
export type HQSupportTicket = typeof hqSupportTickets.$inferSelect;

// HQ Support Messages table (with attachments support)
export const hqSupportMessages = pgTable("hq_support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => hqSupportTickets.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  attachments: jsonb("attachments").$type<{id: string, url: string, type: string, name: string, size: number}[]>().default([]),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  ticketCreatedIdx: index("hq_support_messages_ticket_created_idx").on(table.ticketId, table.createdAt),
}));

export const insertHQSupportMessageSchema = createInsertSchema(hqSupportMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertHQSupportMessage = z.infer<typeof insertHQSupportMessageSchema>;
export type HQSupportMessage = typeof hqSupportMessages.$inferSelect;

// Ticket activity log for timeline tracking
export const ticketActivityLogs = pgTable("ticket_activity_logs", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => hqSupportTickets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ticket_activity_logs_ticket_idx").on(table.ticketId),
  index("ticket_activity_logs_created_idx").on(table.createdAt),
]);

export const insertTicketActivityLogSchema = createInsertSchema(ticketActivityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertTicketActivityLog = z.infer<typeof insertTicketActivityLogSchema>;
export type TicketActivityLog = typeof ticketActivityLogs.$inferSelect;

// HQ Support Category Assignments - Which HQ users can view which ticket categories
export const hqSupportCategoryAssignments = pgTable("hq_support_category_assignments", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 50 }).notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  canAssign: boolean("can_assign").default(false),
  canClose: boolean("can_close").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  index("hq_support_cat_assign_category_idx").on(table.category),
  index("hq_support_cat_assign_user_idx").on(table.userId),
  unique("hq_support_cat_assign_unique").on(table.category, table.userId),
]);

export const insertHQSupportCategoryAssignmentSchema = createInsertSchema(hqSupportCategoryAssignments).omit({
  id: true,
  createdAt: true,
});

export type InsertHQSupportCategoryAssignment = z.infer<typeof insertHQSupportCategoryAssignmentSchema>;
export type HQSupportCategoryAssignment = typeof hqSupportCategoryAssignments.$inferSelect;

// Notification types enum
export const NotificationType = {
  TASK_ASSIGNED: "task_assigned",
  TASK_COMPLETE: "task_complete",
  FAULT_REPORTED: "fault_reported",
  FAULT_RESOLVED: "fault_resolved",
  TRAINING_ASSIGNED: "training_assigned",
  ANNOUNCEMENT: "announcement",
  SYSTEM: "system",
} as const;

export type NotificationTypeType = typeof NotificationType[keyof typeof NotificationType];

// Notifications table - User-specific notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userReadCreatedIdx: index("notifications_user_read_created_idx").on(table.userId, table.isRead, table.createdAt),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Announcement priority enum
export const AnnouncementPriority = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type AnnouncementPriorityType = typeof AnnouncementPriority[keyof typeof AnnouncementPriority];

// Announcements table - HQ broadcasts to branches/roles
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  targetRoles: text("target_roles").array(),
  targetBranches: integer("target_branches").array(),
  priority: text("priority").notNull().default("normal"),
  attachments: text("attachments").array().default(sql`ARRAY[]::text[]`),
  publishedAt: timestamp("published_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  publishedIdx: index("announcements_published_idx").on(table.publishedAt),
}));

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  publishedAt: true,
}).extend({
  attachments: z.array(z.string()).default([]),
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

// Announcement Read Status table - Track who has read each announcement
export const announcementReadStatus = pgTable("announcement_read_status", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").defaultNow(),
}, (table) => [
  index("announcement_read_user_idx").on(table.userId),
  index("announcement_read_announcement_idx").on(table.announcementId),
  unique("unique_announcement_read").on(table.announcementId, table.userId),
]);

export const insertAnnouncementReadStatusSchema = createInsertSchema(announcementReadStatus).omit({
  id: true,
  readAt: true,
});

export type InsertAnnouncementReadStatus = z.infer<typeof insertAnnouncementReadStatusSchema>;
export type AnnouncementReadStatus = typeof announcementReadStatus.$inferSelect;

// Daily Cash Reports table - Supervisor daily cash summary for accounting
export const dailyCashReports = pgTable("daily_cash_reports", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  reportedById: varchar("reported_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportDate: date("report_date").notNull(),
  openingCash: numeric("opening_cash", { precision: 10, scale: 2 }).notNull(),
  closingCash: numeric("closing_cash", { precision: 10, scale: 2 }).notNull(),
  totalSales: numeric("total_sales", { precision: 10, scale: 2 }).notNull(),
  cashSales: numeric("cash_sales", { precision: 10, scale: 2 }),
  cardSales: numeric("card_sales", { precision: 10, scale: 2 }),
  expenses: numeric("expenses", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  branchDateIdx: index("daily_cash_reports_branch_date_idx").on(table.branchId, table.reportDate),
  uniqueBranchDate: unique("unique_branch_date").on(table.branchId, table.reportDate),
}));

export const insertDailyCashReportSchema = createInsertSchema(dailyCashReports).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyCashReport = z.infer<typeof insertDailyCashReportSchema>;
export type DailyCashReport = typeof dailyCashReports.$inferSelect;

// Shifts table - Employee shift scheduling for supervisors and HR
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  checklistId: integer("checklist_id").references(() => checklists.id, { onDelete: "set null" }),
  checklist2Id: integer("checklist2_id").references(() => checklists.id, { onDelete: "set null" }),
  checklist3Id: integer("checklist3_id").references(() => checklists.id, { onDelete: "set null" }),
  shiftDate: date("shift_date").notNull(),
  startTime: time("start_time", { precision: 0 }).notNull(),
  endTime: time("end_time", { precision: 0 }).notNull(),
  shiftType: varchar("shift_type", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  workloadScore: numeric("workload_score", { precision: 5, scale: 2 }),
  aiPlanId: varchar("ai_plan_id", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  branchDateIdx: index("shifts_branch_date_idx").on(table.branchId, table.shiftDate),
  assignedToIdx: index("shifts_assigned_to_idx").on(table.assignedToId),
  createdByIdx: index("shifts_created_by_idx").on(table.createdById),
  checklistIdx: index("shifts_checklist_idx").on(table.checklistId),
}));

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  shiftType: z.enum(["morning", "evening", "night"]),
  status: z.enum(["draft", "pending_hq", "confirmed", "completed", "cancelled"]).default("draft"),
});

export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;
export type ShiftType = "morning" | "evening" | "night";
export type ShiftStatus = "draft" | "pending_hq" | "confirmed" | "completed" | "cancelled";

// Shift Checklists (many-to-many) - Assign checklists to shifts
export const shiftChecklists = pgTable("shift_checklists", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  checklistId: integer("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueShiftChecklist: unique("unique_shift_checklist").on(table.shiftId, table.checklistId),
  shiftIdx: index("shift_checklists_shift_idx").on(table.shiftId),
  checklistIdx: index("shift_checklists_checklist_idx").on(table.checklistId),
}));

export const insertShiftChecklistSchema = createInsertSchema(shiftChecklists).omit({
  id: true,
  createdAt: true,
  isCompleted: true,
  completedAt: true,
});

export type InsertShiftChecklist = z.infer<typeof insertShiftChecklistSchema>;
export type ShiftChecklist = typeof shiftChecklists.$inferSelect;

// Shift Tasks (many-to-many) - Assign tasks to shifts
export const shiftTasks = pgTable("shift_tasks", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueShiftTask: unique("unique_shift_task").on(table.shiftId, table.taskId),
  shiftIdx: index("shift_tasks_shift_idx").on(table.shiftId),
  taskIdx: index("shift_tasks_task_idx").on(table.taskId),
}));

export const insertShiftTaskSchema = createInsertSchema(shiftTasks).omit({
  id: true,
  createdAt: true,
  isCompleted: true,
  completedAt: true,
});

export type InsertShiftTask = z.infer<typeof insertShiftTaskSchema>;
export type ShiftTask = typeof shiftTasks.$inferSelect;

// Bulk shift creation schema for shift planning
export const bulkCreateShiftsSchema = z.object({
  branchId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  period: z.enum(['weekly', '2weekly', 'monthly']),
  checklistId: z.number().int().positive().optional().nullable(),
  openingHour: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM
  closingHour: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM
  shiftType: z.string().min(1).default('regular'),
});

export type BulkCreateShifts = z.infer<typeof bulkCreateShiftsSchema>;

// Leave Requests table - Employee leave/time-off management
export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  leaveType: varchar("leave_type", { length: 20 }).notNull(), // annual, sick, personal, unpaid
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: integer("total_days").notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("leave_requests_user_idx").on(table.userId),
  statusIdx: index("leave_requests_status_idx").on(table.status),
  dateIdx: index("leave_requests_date_idx").on(table.startDate, table.endDate),
}));

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;

// Shift Attendance table - Employee check-in/out and break tracking
export const shiftAttendance = pgTable("shift_attendance", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Scheduled times (planned shift hours)
  scheduledStartTime: timestamp("scheduled_start_time"),
  scheduledEndTime: timestamp("scheduled_end_time"),
  // Actual check-in/out times
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  // Break tracking
  breakStartTime: timestamp("break_start_time"),
  breakEndTime: timestamp("break_end_time"),
  breakPlannedMinutes: integer("break_planned_minutes").default(60), // Default 1 hour break
  breakTakenMinutes: integer("break_taken_minutes").default(0),
  totalBreakMinutes: integer("total_break_minutes").default(0),
  // Work time calculations
  totalWorkedMinutes: integer("total_worked_minutes").default(0),
  effectiveWorkMinutes: integer("effective_work_minutes").default(0), // After penalties
  penaltyMinutes: integer("penalty_minutes").default(0),
  // Compliance & punctuality
  latenessMinutes: integer("lateness_minutes").default(0),
  earlyLeaveMinutes: integer("early_leave_minutes").default(0),
  breakOverageMinutes: integer("break_overage_minutes").default(0), // Break time exceeded planned break
  complianceScore: integer("compliance_score").default(100), // 0-100
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled, checked_in, on_break, checked_out, absent, late
  notes: text("notes"),
  // Check-in Method & Verification
  checkInMethod: varchar("check_in_method", { length: 20 }).default("manual"),
  locationConfidenceScore: integer("location_confidence_score"),
  // Check-in Photo & Location Verification fields
  checkInPhotoUrl: text("check_in_photo_url"),
  checkInLatitude: numeric("check_in_latitude", { precision: 10, scale: 7 }),
  checkInLongitude: numeric("check_in_longitude", { precision: 10, scale: 7 }),
  // Check-out Photo & Location Verification fields
  checkOutPhotoUrl: text("check_out_photo_url"),
  checkOutLatitude: numeric("check_out_latitude", { precision: 10, scale: 7 }),
  checkOutLongitude: numeric("check_out_longitude", { precision: 10, scale: 7 }),
  // Break Photo & Location fields
  breakStartPhotoUrl: text("break_start_photo_url"),
  breakStartLatitude: numeric("break_start_latitude", { precision: 10, scale: 7 }),
  breakStartLongitude: numeric("break_start_longitude", { precision: 10, scale: 7 }),
  breakEndPhotoUrl: text("break_end_photo_url"),
  breakEndLatitude: numeric("break_end_latitude", { precision: 10, scale: 7 }),
  breakEndLongitude: numeric("break_end_longitude", { precision: 10, scale: 7 }),
  // AI Background Verification (Shift Corner matching)
  aiBackgroundCheckInStatus: varchar("ai_background_check_in_status", { length: 20 }).default("pending"), // pending, verified, rejected, error
  aiBackgroundCheckInScore: integer("ai_background_check_in_score"), // 0-100 similarity score
  aiBackgroundCheckInDetails: jsonb("ai_background_check_in_details"),
  aiBackgroundCheckOutStatus: varchar("ai_background_check_out_status", { length: 20 }).default("pending"),
  aiBackgroundCheckOutScore: integer("ai_background_check_out_score"),
  aiBackgroundCheckOutDetails: jsonb("ai_background_check_out_details"),
  aiBackgroundBreakStartStatus: varchar("ai_background_break_start_status", { length: 20 }).default("pending"),
  aiBackgroundBreakStartScore: integer("ai_background_break_start_score"),
  aiBackgroundBreakEndStatus: varchar("ai_background_break_end_status", { length: 20 }).default("pending"),
  aiBackgroundBreakEndScore: integer("ai_background_break_end_score"),
  // AI Dress Code Analysis fields (check-in)
  aiDressCodeScore: integer("ai_dress_code_score"), // 0-100
  aiDressCodeAnalysis: jsonb("ai_dress_code_analysis"), // Detailed analysis object
  aiDressCodeStatus: varchar("ai_dress_code_status", { length: 20 }).default("pending"), // pending, approved, rejected, error
  aiDressCodeWarnings: text("ai_dress_code_warnings").array(), // Turkish warnings
  aiDressCodeTimestamp: timestamp("ai_dress_code_timestamp"),
  // Legacy fields (keeping for backward compatibility)
  photoUrl: text("photo_url"),
  analysisStatus: varchar("analysis_status", { length: 20 }).default("pending"), // pending, completed, error
  analysisDetails: jsonb("analysis_details"), // Structured AI response
  analysisTimestamp: timestamp("analysis_timestamp"),
  aiWarnings: text("ai_warnings").array(), // Turkish warnings array
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueShiftUser: unique("unique_shift_user_attendance").on(table.shiftId, table.userId),
  shiftIdx: index("shift_attendance_shift_idx").on(table.shiftId),
  userIdx: index("shift_attendance_user_idx").on(table.userId),
  statusIdx: index("shift_attendance_status_idx").on(table.status),
}));

export const insertShiftAttendanceSchema = createInsertSchema(shiftAttendance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShiftAttendance = z.infer<typeof insertShiftAttendanceSchema>;
export type ShiftAttendance = typeof shiftAttendance.$inferSelect;

// Shift Trade Requests table - Employee shift swapping with approval workflow
export const shiftTradeRequests = pgTable("shift_trade_requests", {
  id: serial("id").primaryKey(),
  requesterId: varchar("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  responderId: varchar("responder_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requesterShiftId: integer("requester_shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  responderShiftId: integer("responder_shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("taslak"), // taslak, calisan_onayi, yonetici_onayi, reddedildi, iptal
  notes: text("notes"),
  responderConfirmedAt: timestamp("responder_confirmed_at"),
  supervisorApprovedAt: timestamp("supervisor_approved_at"),
  supervisorId: varchar("supervisor_id").references(() => users.id, { onDelete: "set null" }),
  supervisorNotes: text("supervisor_notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  requesterIdx: index("shift_trade_requests_requester_idx").on(table.requesterId),
  responderIdx: index("shift_trade_requests_responder_idx").on(table.responderId),
  statusIdx: index("shift_trade_requests_status_idx").on(table.status),
  uniqueOpenTrade: unique("unique_open_shift_trade").on(table.requesterShiftId, table.responderShiftId, table.status),
}));

export const insertShiftTradeRequestSchema = createInsertSchema(shiftTradeRequests).omit({
  id: true,
  createdAt: true,
}).extend({
  status: z.enum(["taslak", "calisan_onayi", "yonetici_onayi", "reddedildi", "iptal"]).default("taslak"),
});

export type InsertShiftTradeRequest = z.infer<typeof insertShiftTradeRequestSchema>;
export type ShiftTradeRequest = typeof shiftTradeRequests.$inferSelect;
export type ShiftTradeStatus = "taslak" | "calisan_onayi" | "yonetici_onayi" | "reddedildi" | "iptal";

// ========================================
// DYNAMIC MENU CONFIGURATION TABLES
// ========================================

// Menu Sections table
export const menuSections = pgTable("menu_sections", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  titleTr: varchar("title_tr", { length: 200 }).notNull(),
  scope: varchar("scope", { length: 20 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertMenuSectionSchema = createInsertSchema(menuSections).omit({
  id: true,
});

export type InsertMenuSection = z.infer<typeof insertMenuSectionSchema>;
export type MenuSection = typeof menuSections.$inferSelect;

// Menu Items table
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => menuSections.id, { onDelete: "cascade" }),
  titleTr: varchar("title_tr", { length: 200 }).notNull(),
  path: varchar("path", { length: 200 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  moduleKey: varchar("module_key", { length: 100 }),
  scope: varchar("scope", { length: 20 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
});

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

// Menu Visibility Rules table
export const menuVisibilityRules = pgTable("menu_visibility_rules", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  ruleType: varchar("rule_type", { length: 20 }).notNull(),
  role: varchar("role", { length: 50 }),
  userId: varchar("user_id").references(() => users.id),
  branchId: integer("branch_id").references(() => branches.id),
  allow: boolean("allow").notNull().default(true),
});

export const insertMenuVisibilityRuleSchema = createInsertSchema(menuVisibilityRules).omit({
  id: true,
});

export type InsertMenuVisibilityRule = z.infer<typeof insertMenuVisibilityRuleSchema>;
export type MenuVisibilityRule = typeof menuVisibilityRules.$inferSelect;

// Menu Relations
export const menuSectionsRelations = relations(menuSections, ({ many }) => ({
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  section: one(menuSections, {
    fields: [menuItems.sectionId],
    references: [menuSections.id],
  }),
  visibilityRules: many(menuVisibilityRules),
}));

export const menuVisibilityRulesRelations = relations(menuVisibilityRules, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [menuVisibilityRules.menuItemId],
    references: [menuItems.id],
  }),
  user: one(users, {
    fields: [menuVisibilityRules.userId],
    references: [users.id],
  }),
  branch: one(branches, {
    fields: [menuVisibilityRules.branchId],
    references: [branches.id],
  }),
}));

// Page Content (Markdown-based CMS)
export const pageContent = pgTable("page_content", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  version: integer("version").notNull().default(1),
  publishedAt: timestamp("published_at"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  updatedById: varchar("updated_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("page_content_slug_idx").on(table.slug),
]);

export const insertPageContentSchema = createInsertSchema(pageContent).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  slug: z.string()
    .min(1, "Slug gerekli")
    .max(255, "Slug çok uzun")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug sadece küçük harf, sayı ve tire içermeli"),
  title: z.string().min(1, "Başlık gerekli").max(500, "Başlık çok uzun"),
  content: z.string().min(1, "İçerik gerekli"),
  publishedAt: z.string().datetime().optional().nullable(),
});

export type InsertPageContent = z.infer<typeof insertPageContentSchema>;
export type PageContent = typeof pageContent.$inferSelect;

export const pageContentRelations = relations(pageContent, ({ one }) => ({
  createdBy: one(users, {
    fields: [pageContent.createdById],
    references: [users.id],
    relationName: "pageContentCreatedBy",
  }),
  updatedBy: one(users, {
    fields: [pageContent.updatedById],
    references: [users.id],
    relationName: "pageContentUpdatedBy",
  }),
}));

// AI Summary types for HQ Dashboard
export const SummaryCategory = z.enum(["personel", "cihazlar", "gorevler"]);
export type SummaryCategoryType = z.infer<typeof SummaryCategory>;

export const aiSummaryRequestSchema = z.object({
  category: SummaryCategory,
});

export type AISummaryRequest = z.infer<typeof aiSummaryRequestSchema>;

export const aiSummaryResponseSchema = z.object({
  summary: z.string(),
  cached: z.boolean(),
  generatedAt: z.string(), // ISO timestamp
  category: SummaryCategory,
  scope: z.object({
    branchId: z.number().optional(),
    branchName: z.string().optional(),
  }).optional(),
});

export type AISummaryResponse = z.infer<typeof aiSummaryResponseSchema>;

// ========================================
// AI USAGE LOGS - Cost Monitoring
// ========================================

export const AIFeature = z.enum([
  "task_photo", 
  "fault_photo", 
  "cleanliness", 
  "dress_code", 
  "rag_chat", 
  "summary"
]);
export type AIFeatureType = z.infer<typeof AIFeature>;

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  feature: varchar("feature", { length: 50 }).notNull(), // task_photo, fault_photo, cleanliness, dress_code, rag_chat, summary
  model: varchar("model", { length: 100 }).notNull(), // gpt-4o, gpt-4o-mini, text-embedding-3-small
  operation: varchar("operation", { length: 100 }).notNull(), // e.g., "analyzeTaskPhoto", "generateEmbedding"
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  costUsd: numeric("cost_usd", { precision: 10, scale: 4 }).notNull().default('0'),
  requestLatencyMs: integer("request_latency_ms").notNull().default(0),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  cachedHit: boolean("cached_hit").default(false).notNull(),
  metadata: jsonb("metadata"),
}, (table) => [
  index("ai_usage_logs_created_at_idx").on(table.createdAt),
  index("ai_usage_logs_feature_idx").on(table.feature),
  index("ai_usage_logs_user_id_idx").on(table.userId),
  index("ai_usage_logs_branch_id_idx").on(table.branchId),
]);

export const insertAiUsageLogSchema = createInsertSchema(aiUsageLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAiUsageLog = z.infer<typeof insertAiUsageLogSchema>;
export type AiUsageLog = typeof aiUsageLogs.$inferSelect;

// ========================================
// BRANDING CONFIGURATION
// ========================================

// Branding table - Company logo and branding assets (singleton pattern)
export const branding = pgTable("branding", {
  id: serial("id").primaryKey(),
  logoUrl: text("logo_url"), // Public S3 URL for company logo
  updatedById: varchar("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBrandingSchema = createInsertSchema(branding).omit({
  id: true,
  updatedAt: true,
});

export type InsertBranding = z.infer<typeof insertBrandingSchema>;
export type Branding = typeof branding.$inferSelect;

// ========================================
// QUALITY AUDITS (Kalite Denetimi) - Enhanced unified system
// ========================================

// Audit Templates - Reusable audit checklists for both branch and personnel
export const auditTemplates = pgTable("audit_templates", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(), // Keeping old column name for compatibility
  description: text("description"),
  auditType: varchar("audit_type", { length: 20 }), // nullable for backward compat, 'branch' or 'personnel'
  category: varchar("category", { length: 50 }).notNull(), // cleanliness, service, knowledge, dress_code, etc.
  isActive: boolean("is_active").notNull().default(true),
  requiresPhoto: boolean("requires_photo").notNull().default(false),
  aiAnalysisEnabled: boolean("ai_analysis_enabled").notNull().default(false),
  createdById: varchar("created_by_id").notNull().references(() => users.id), // Keeping old column name
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("audit_templates_type_idx").on(table.auditType),
  index("audit_templates_category_idx").on(table.category),
]);

export const insertAuditTemplateSchema = createInsertSchema(auditTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAuditTemplate = z.infer<typeof insertAuditTemplateSchema>;
export type AuditTemplate = typeof auditTemplates.$inferSelect;

// Audit Template Items - Individual checklist items
export const auditTemplateItems = pgTable("audit_template_items", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => auditTemplates.id, { onDelete: "cascade" }),
  itemText: text("item_text").notNull(),
  maxPoints: integer("max_points").notNull().default(10), // Legacy field kept for backward compat
  sortOrder: integer("sort_order").notNull().default(0),
  // NEW fields for enhanced audit system
  itemType: varchar("item_type", { length: 20 }), // checkbox, rating, text, photo, multiple_choice - nullable for backwards compat
  weight: integer("weight"), // Scoring weight - nullable
  requiresPhoto: boolean("requires_photo"), // nullable
  aiCheckEnabled: boolean("ai_check_enabled"), // nullable
  aiPrompt: text("ai_prompt"), // Custom AI analysis prompt for this item
  // For multiple choice questions (personnel audits)
  options: text("options").array(), // Multiple choice options - nullable
  correctAnswer: text("correct_answer"), // Correct answer for test questions - nullable
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audit_template_items_template_idx").on(table.templateId),
]);

export const insertAuditTemplateItemSchema = createInsertSchema(auditTemplateItems).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditTemplateItem = z.infer<typeof insertAuditTemplateItemSchema>;
export type AuditTemplateItem = typeof auditTemplateItems.$inferSelect;

// Quality Audits - Legacy table kept for backward compatibility, links to new audit instances
export const qualityAudits = pgTable("quality_audits", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  templateId: integer("template_id").notNull().references(() => auditTemplates.id),
  auditorId: varchar("auditor_id").notNull().references(() => users.id),
  auditDate: timestamp("audit_date").notNull(),
  totalScore: integer("total_score").notNull().default(0),
  maxPossibleScore: integer("max_possible_score").notNull().default(0),
  percentageScore: integer("percentage_score").notNull().default(0), // 0-100
  status: varchar("status", { length: 20 }).notNull().default("completed"),
  notes: text("notes"),
  photoUrls: text("photo_urls").array(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("quality_audits_branch_idx").on(table.branchId),
  index("quality_audits_auditor_idx").on(table.auditorId),
  index("quality_audits_date_idx").on(table.auditDate),
]);

export const insertQualityAuditSchema = createInsertSchema(qualityAudits, {
  auditDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
}).omit({
  id: true,
  createdAt: true,
  auditorId: true,
});

export type InsertQualityAudit = z.infer<typeof insertQualityAuditSchema>;
export type QualityAudit = typeof qualityAudits.$inferSelect;

// Audit Item Scores - Legacy table
export const auditItemScores = pgTable("audit_item_scores", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").notNull().references(() => qualityAudits.id, { onDelete: "cascade" }),
  templateItemId: integer("template_item_id").notNull().references(() => auditTemplateItems.id),
  scoreGiven: integer("score_given").notNull(),
  notes: text("notes"),
}, (table) => [
  index("audit_item_scores_audit_idx").on(table.auditId),
]);

export const insertAuditItemScoreSchema = createInsertSchema(auditItemScores).omit({
  id: true,
});

export type InsertAuditItemScore = z.infer<typeof insertAuditItemScoreSchema>;
export type AuditItemScore = typeof auditItemScores.$inferSelect;

// NEW: Audit Instances - Unified audit execution for both branch and personnel
export const auditInstances = pgTable("audit_instances", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => auditTemplates.id),
  auditType: varchar("audit_type", { length: 20 }).notNull(), // 'branch' or 'personnel'
  
  // Target (either branch or personnel)
  branchId: integer("branch_id").references(() => branches.id),
  userId: varchar("user_id").references(() => users.id), // For personnel audits
  
  // Audit metadata
  auditorId: varchar("auditor_id").notNull().references(() => users.id),
  auditDate: timestamp("audit_date").notNull().defaultNow(),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"), // in_progress, completed, cancelled
  
  // Scoring
  totalScore: integer("total_score"), // Calculated from items (0-100)
  maxScore: integer("max_score"), // Maximum possible score
  
  // Overall notes
  notes: text("notes"),
  actionItems: text("action_items"), // JSON array
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  followUpDate: date("follow_up_date"),
  
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("audit_instances_template_idx").on(table.templateId),
  index("audit_instances_branch_idx").on(table.branchId),
  index("audit_instances_user_idx").on(table.userId),
  index("audit_instances_auditor_idx").on(table.auditorId),
  index("audit_instances_date_idx").on(table.auditDate),
]);

export const insertAuditInstanceSchema = createInsertSchema(auditInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAuditInstance = z.infer<typeof insertAuditInstanceSchema>;
export type AuditInstance = typeof auditInstances.$inferSelect;

// NEW: Audit Instance Items - Individual responses in an audit
export const auditInstanceItems = pgTable("audit_instance_items", {
  id: serial("id").primaryKey(),
  instanceId: integer("instance_id").notNull().references(() => auditInstances.id, { onDelete: "cascade" }),
  templateItemId: integer("template_item_id").notNull().references(() => auditTemplateItems.id),
  
  // Response data
  response: text("response"), // Checkbox: 'yes'/'no', Rating: '1-5', Text: actual text
  score: integer("score"), // 0-100 for this item
  
  // Notes and photos
  notes: text("notes"),
  photoUrl: text("photo_url"),
  
  // AI analysis results
  aiAnalysisStatus: varchar("ai_analysis_status", { length: 20 }), // pending, completed, failed
  aiScore: integer("ai_score"), // 0-100 from AI
  aiInsights: text("ai_insights"), // AI-generated feedback
  aiConfidence: integer("ai_confidence"), // 0-100
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("audit_instance_items_instance_idx").on(table.instanceId),
  index("audit_instance_items_template_item_idx").on(table.templateItemId),
]);

export const insertAuditInstanceItemSchema = createInsertSchema(auditInstanceItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAuditInstanceItem = z.infer<typeof insertAuditInstanceItemSchema>;
export type AuditInstanceItem = typeof auditInstanceItems.$inferSelect;

// NEW: Personnel Files - Comprehensive employee records
export const personnelFiles = pgTable("personnel_files", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  
  // Performance metrics (aggregated)
  overallPerformanceScore: integer("overall_performance_score"), // 0-100
  attendanceScore: integer("attendance_score"), // 0-100
  knowledgeScore: integer("knowledge_score"), // 0-100 from audits
  behaviorScore: integer("behavior_score"), // 0-100 from audits
  
  // Audit history summary
  lastAuditDate: timestamp("last_audit_date"),
  totalAuditsCompleted: integer("total_audits_completed").notNull().default(0),
  averageAuditScore: integer("average_audit_score"), // 0-100
  
  // Notes
  strengthsNotes: text("strengths_notes"),
  improvementNotes: text("improvement_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("personnel_files_user_idx").on(table.userId),
]);

export const insertPersonnelFileSchema = createInsertSchema(personnelFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPersonnelFile = z.infer<typeof insertPersonnelFileSchema>;
export type PersonnelFile = typeof personnelFiles.$inferSelect;

// ========================================
// GUEST FEEDBACK (Misafir Geri Bildirimi)
// ========================================

export const customerFeedback = pgTable("customer_feedback", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5 yıldız
  comment: text("comment"),
  feedbackDate: timestamp("feedback_date").defaultNow(),
  customerName: varchar("customer_name", { length: 100 }), // Opsiyonel
  customerEmail: varchar("customer_email", { length: 200 }), // Opsiyonel
  isAnonymous: boolean("is_anonymous").notNull().default(true),
  status: varchar("status", { length: 20 }).notNull().default("new"), // new, reviewed, resolved
  reviewedById: varchar("reviewed_by_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
}, (table) => [
  index("customer_feedback_branch_idx").on(table.branchId),
  index("customer_feedback_date_idx").on(table.feedbackDate),
  index("customer_feedback_rating_idx").on(table.rating),
]);

export const insertCustomerFeedbackSchema = createInsertSchema(customerFeedback).omit({
  id: true,
  feedbackDate: true,
}).extend({
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().max(1000, "Comment too long").optional().transform(val => val?.trim() || null),
});

export type InsertCustomerFeedback = z.infer<typeof insertCustomerFeedbackSchema>;
export type CustomerFeedback = typeof customerFeedback.$inferSelect;

// ========================================
// MAINTENANCE SCHEDULES (Proaktif Bakım)
// ========================================

export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  maintenanceType: varchar("maintenance_type", { length: 50 }).notNull(), // routine, deep_clean, calibration, part_replacement
  frequencyDays: integer("frequency_days").notNull(), // Kaç günde bir (örn: 180 = 6 ayda bir)
  lastMaintenanceDate: date("last_maintenance_date"),
  nextMaintenanceDate: date("next_maintenance_date").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("maintenance_schedules_equipment_idx").on(table.equipmentId),
  index("maintenance_schedules_next_date_idx").on(table.nextMaintenanceDate),
]);

export const insertMaintenanceScheduleSchema = createInsertSchema(maintenanceSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMaintenanceSchedule = z.infer<typeof insertMaintenanceScheduleSchema>;
export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;

// Maintenance Logs - Bakım geçmişi
export const maintenanceLogs = pgTable("maintenance_logs", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").references(() => maintenanceSchedules.id, { onDelete: "set null" }),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  performedById: varchar("performed_by_id").notNull().references(() => users.id),
  performedDate: timestamp("performed_date").notNull(),
  maintenanceType: varchar("maintenance_type", { length: 50 }).notNull(),
  workDescription: text("work_description").notNull(),
  partsReplaced: text("parts_replaced").array(), // Değiştirilen parçalar
  cost: numeric("cost", { precision: 10, scale: 2 }),
  nextMaintenanceDue: date("next_maintenance_due"),
  photoUrls: text("photo_urls").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("maintenance_logs_equipment_idx").on(table.equipmentId),
  index("maintenance_logs_schedule_idx").on(table.scheduleId),
  index("maintenance_logs_date_idx").on(table.performedDate),
]);

export const insertMaintenanceLogSchema = createInsertSchema(maintenanceLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertMaintenanceLog = z.infer<typeof insertMaintenanceLogSchema>;
export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;

// ========================================
// CAMPAIGNS (Kampanya Yönetimi)
// ========================================

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  campaignType: varchar("campaign_type", { length: 50 }).notNull(), // promotion, seasonal, new_product, discount
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  targetRoles: text("target_roles").array(), // Hedef roller (opsiyonel)
  imageUrls: text("image_urls").array(), // Kampanya görselleri
  pdfUrl: text("pdf_url"), // PDF döküman
  priority: varchar("priority", { length: 20 }).notNull().default("normal"), // low, normal, high, urgent
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, active, paused, completed
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("campaigns_status_idx").on(table.status),
  index("campaigns_start_date_idx").on(table.startDate),
  index("campaigns_end_date_idx").on(table.endDate),
]);

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

// Campaign Branches - Kampanyanın hedef şubeleri
export const campaignBranches = pgTable("campaign_branches", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
}, (table) => [
  index("campaign_branches_campaign_idx").on(table.campaignId),
  index("campaign_branches_branch_idx").on(table.branchId),
  unique("unique_campaign_branch").on(table.campaignId, table.branchId),
]);

export const insertCampaignBranchSchema = createInsertSchema(campaignBranches).omit({
  id: true,
});

export type InsertCampaignBranch = z.infer<typeof insertCampaignBranchSchema>;
export type CampaignBranch = typeof campaignBranches.$inferSelect;

// Campaign Metrics - Kampanya başarı ölçümü (manuel girilen metrikler)
export const campaignMetrics = pgTable("campaign_metrics", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  salesIncrease: numeric("sales_increase", { precision: 10, scale: 2 }), // Satış artışı %
  customerCount: integer("customer_count"), // Müşteri sayısı
  revenue: numeric("revenue", { precision: 12, scale: 2 }), // Gelir
  notes: text("notes"),
  reportedById: varchar("reported_by_id").notNull().references(() => users.id),
  reportDate: timestamp("report_date").defaultNow(),
}, (table) => [
  index("campaign_metrics_campaign_idx").on(table.campaignId),
  index("campaign_metrics_branch_idx").on(table.branchId),
]);

export const insertCampaignMetricSchema = createInsertSchema(campaignMetrics).omit({
  id: true,
  reportDate: true,
});

export type InsertCampaignMetric = z.infer<typeof insertCampaignMetricSchema>;
export type CampaignMetric = typeof campaignMetrics.$inferSelect;

// ========================================
// FRANCHISE ONBOARDING (Franchise Açılış)
// ========================================

export const franchiseOnboarding = pgTable("franchise_onboarding", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("planning"), // planning, in_progress, completed
  expectedOpeningDate: date("expected_opening_date"),
  actualOpeningDate: date("actual_opening_date"),
  completionPercentage: integer("completion_percentage").notNull().default(0), // 0-100
  assignedCoachId: varchar("assigned_coach_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("franchise_onboarding_branch_idx").on(table.branchId),
  index("franchise_onboarding_status_idx").on(table.status),
]);

export const insertFranchiseOnboardingSchema = createInsertSchema(franchiseOnboarding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFranchiseOnboarding = z.infer<typeof insertFranchiseOnboardingSchema>;
export type FranchiseOnboarding = typeof franchiseOnboarding.$inferSelect;

// Onboarding Documents - Gerekli belgeler
export const onboardingDocuments = pgTable("onboarding_documents", {
  id: serial("id").primaryKey(),
  onboardingId: integer("onboarding_id").notNull().references(() => franchiseOnboarding.id, { onDelete: "cascade" }),
  documentType: varchar("document_type", { length: 100 }).notNull(), // license, contract, insurance, permits
  documentName: varchar("document_name", { length: 200 }).notNull(),
  fileUrl: text("file_url"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, uploaded, approved, rejected
  uploadedById: varchar("uploaded_by_id").references(() => users.id),
  uploadedAt: timestamp("uploaded_at"),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  expiryDate: date("expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("onboarding_documents_onboarding_idx").on(table.onboardingId),
  index("onboarding_documents_status_idx").on(table.status),
]);

export const insertOnboardingDocumentSchema = createInsertSchema(onboardingDocuments).omit({
  id: true,
  createdAt: true,
});

export type InsertOnboardingDocument = z.infer<typeof insertOnboardingDocumentSchema>;
export type OnboardingDocument = typeof onboardingDocuments.$inferSelect;

// License Renewals - Lisans yenileme hatırlatıcıları
export const licenseRenewals = pgTable("license_renewals", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  licenseType: varchar("license_type", { length: 100 }).notNull(), // franchise, health, business
  licenseNumber: varchar("license_number", { length: 100 }),
  issueDate: date("issue_date").notNull(),
  expiryDate: date("expiry_date").notNull(),
  renewalStatus: varchar("renewal_status", { length: 20 }).notNull().default("active"), // active, expiring_soon, expired, renewed
  reminderDaysBefore: integer("reminder_days_before").notNull().default(30), // Kaç gün önce hatırlat
  notes: text("notes"),
  documentUrl: text("document_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("license_renewals_branch_idx").on(table.branchId),
  index("license_renewals_expiry_idx").on(table.expiryDate),
  index("license_renewals_status_idx").on(table.renewalStatus),
]);

export const insertLicenseRenewalSchema = createInsertSchema(licenseRenewals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLicenseRenewal = z.infer<typeof insertLicenseRenewalSchema>;
export type LicenseRenewal = typeof licenseRenewals.$inferSelect;

// ========================================
// SHIFT TEMPLATES - Vardiya Şablonları
// ========================================

// Shift Templates table - Reusable shift patterns for easy scheduling
export const shiftTemplates = pgTable("shift_templates", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Hafta İçi Sabah", "Hafta Sonu Akşam"
  description: text("description"),
  shiftType: varchar("shift_type", { length: 20 }).notNull(), // morning, evening, night
  startTime: time("start_time", { precision: 0 }).notNull(),
  endTime: time("end_time", { precision: 0 }).notNull(),
  daysOfWeek: integer("days_of_week").array(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  isActive: boolean("is_active").notNull().default(true),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("shift_templates_branch_idx").on(table.branchId),
  index("shift_templates_active_idx").on(table.isActive),
]);

export const insertShiftTemplateSchema = createInsertSchema(shiftTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  shiftType: z.enum(["morning", "evening", "night"]),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
});

export type InsertShiftTemplate = z.infer<typeof insertShiftTemplateSchema>;
export type ShiftTemplate = typeof shiftTemplates.$inferSelect;

// ========================================
// EMPLOYEE AVAILABILITY - Çalışan Müsaitlik
// ========================================

// Employee Availability table - Track when employees are unavailable
export const employeeAvailability = pgTable("employee_availability", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: varchar("reason", { length: 50 }).notNull(), // unavailable, vacation, sick, personal, other
  notes: text("notes"),
  isAllDay: boolean("is_all_day").notNull().default(true),
  startTime: time("start_time", { precision: 0 }), // If not all day
  endTime: time("end_time", { precision: 0 }), // If not all day
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_availability_user_idx").on(table.userId),
  index("employee_availability_date_idx").on(table.startDate, table.endDate),
  index("employee_availability_status_idx").on(table.status),
]);

export const insertEmployeeAvailabilitySchema = createInsertSchema(employeeAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  reason: z.enum(["unavailable", "vacation", "sick", "personal", "other"]),
  status: z.enum(["active", "cancelled"]).default("active"),
});

export type InsertEmployeeAvailability = z.infer<typeof insertEmployeeAvailabilitySchema>;
export type EmployeeAvailability = typeof employeeAvailability.$inferSelect;
export type AvailabilityReason = "unavailable" | "vacation" | "sick" | "personal" | "other";

// ========================================
// RBAC SYSTEM - Role-Based Access Control
// ========================================

// Roles - Dynamic role management (separate from hard-coded UserRole enum)
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  isSystemRole: boolean("is_system_role").notNull().default(false), // Built-in roles cannot be deleted
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("roles_name_idx").on(table.name),
]);

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

// Permissions - Define what actions can be performed
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(), // e.g., "tasks.create", "equipment.delete"
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  module: varchar("module", { length: 50 }).notNull(), // tasks, equipment, users, etc.
  action: varchar("action", { length: 20 }).notNull(), // view, create, edit, delete, approve
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("permissions_module_idx").on(table.module),
  index("permissions_name_idx").on(table.name),
]);

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissions.$inferSelect;

// Role Permissions - Many-to-many relationship
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("role_permissions_role_idx").on(table.roleId),
  index("role_permissions_permission_idx").on(table.permissionId),
  unique("role_permission_unique").on(table.roleId, table.permissionId),
]);

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
});

export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

// ========================================
// SITE SETTINGS - Global configuration
// ========================================

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  type: varchar("type", { length: 20 }).notNull().default("string"), // string, number, boolean, json, file
  category: varchar("category", { length: 50 }).notNull().default("general"), // general, branding, theme, email
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(false), // Can be accessed by non-admin users
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("site_settings_key_idx").on(table.key),
  index("site_settings_category_idx").on(table.category),
]);

export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;
export type SiteSetting = typeof siteSettings.$inferSelect;

// ========================================
// PASSWORD RESET TOKENS
// ========================================

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("password_reset_tokens_token_idx").on(table.token),
  index("password_reset_tokens_user_idx").on(table.userId),
]);

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// ========================================
// AUDIT LOGS - Activity tracking
// ========================================

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(), // user.created, role.updated, setting.changed
  resource: varchar("resource", { length: 100 }).notNull(), // users, roles, settings, etc.
  resourceId: varchar("resource_id", { length: 100 }), // ID of the affected resource
  details: jsonb("details"), // Additional context (old value, new value, etc.)
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audit_logs_user_idx").on(table.userId),
  index("audit_logs_action_idx").on(table.action),
  index("audit_logs_resource_idx").on(table.resource),
  index("audit_logs_created_idx").on(table.createdAt),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ========================================
// OVERTIME REQUESTS - Employee overtime management
// ========================================

export const overtimeRequests = pgTable("overtime_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  shiftAttendanceId: integer("shift_attendance_id").references(() => shiftAttendance.id, { onDelete: "set null" }),
  requestedMinutes: integer("requested_minutes").notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approverId: varchar("approver_id").references(() => users.id, { onDelete: "set null" }),
  approvedMinutes: integer("approved_minutes"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  appliedToPeriod: varchar("applied_to_period", { length: 7 }), // YYYY-MM format
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("overtime_requests_user_idx").on(table.userId),
  index("overtime_requests_status_idx").on(table.status),
  index("overtime_requests_period_idx").on(table.appliedToPeriod),
]);

export const insertOvertimeRequestSchema = createInsertSchema(overtimeRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOvertimeRequest = z.infer<typeof insertOvertimeRequestSchema>;
export type OvertimeRequest = typeof overtimeRequests.$inferSelect;

// ========================================
// ATTENDANCE PENALTIES - Track all penalties and deductions
// ========================================

export const attendancePenalties = pgTable("attendance_penalties", {
  id: serial("id").primaryKey(),
  shiftAttendanceId: integer("shift_attendance_id").notNull().references(() => shiftAttendance.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // lateness, early_leave, break_overage, manual
  minutes: integer("minutes").notNull(),
  reason: text("reason").notNull(),
  autoGenerated: boolean("auto_generated").notNull().default(true),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("attendance_penalties_shift_idx").on(table.shiftAttendanceId),
  index("attendance_penalties_type_idx").on(table.type),
]);

export const insertAttendancePenaltySchema = createInsertSchema(attendancePenalties).omit({
  id: true,
  createdAt: true,
});

export type InsertAttendancePenalty = z.infer<typeof insertAttendancePenaltySchema>;
export type AttendancePenalty = typeof attendancePenalties.$inferSelect;

// ========================================
// MONTHLY ATTENDANCE SUMMARIES - Pre-aggregated monthly reports
// ========================================

export const monthlyAttendanceSummaries = pgTable("monthly_attendance_summaries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodMonth: varchar("period_month", { length: 7 }).notNull(), // YYYY-MM format
  totalScheduledMinutes: integer("total_scheduled_minutes").default(0).notNull(),
  totalWorkedMinutes: integer("total_worked_minutes").default(0).notNull(),
  totalPenaltyMinutes: integer("total_penalty_minutes").default(0).notNull(),
  totalOvertimeMinutes: integer("total_overtime_minutes").default(0).notNull(),
  latenessCount: integer("lateness_count").default(0).notNull(),
  earlyLeaveCount: integer("early_leave_count").default(0).notNull(),
  complianceScoreAvg: integer("compliance_score_avg").default(100).notNull(), // 0-100
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_user_period").on(table.userId, table.periodMonth),
  index("monthly_summaries_user_idx").on(table.userId),
  index("monthly_summaries_period_idx").on(table.periodMonth),
]);

export const insertMonthlyAttendanceSummarySchema = createInsertSchema(monthlyAttendanceSummaries).omit({
  id: true,
  generatedAt: true,
  updatedAt: true,
});

export type InsertMonthlyAttendanceSummary = z.infer<typeof insertMonthlyAttendanceSummarySchema>;
export type MonthlyAttendanceSummary = typeof monthlyAttendanceSummaries.$inferSelect;

// ========================================
// GUEST COMPLAINTS - Enhanced customer complaint tracking with SLA
// ========================================

export const guestComplaints = pgTable("guest_complaints", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  // Complaint details
  complaintSource: varchar("complaint_source", { length: 50 }).notNull(), // phone, email, google, instagram, facebook, in_person
  complaintCategory: varchar("complaint_category", { length: 100 }).notNull(), // product, staff, cleanliness, service_speed, temperature, noise, other
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  photoUrl: text("photo_url"),
  complaintDate: timestamp("complaint_date").defaultNow().notNull(),
  complaintTime: varchar("complaint_time", { length: 5 }), // HH:MM format
  // Customer info (optional)
  customerName: varchar("customer_name", { length: 100 }),
  customerEmail: varchar("customer_email", { length: 200 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  // Assignment & SLA
  assignedToType: varchar("assigned_to_type", { length: 50 }), // branch, hq_tech, hq_admin, accounting
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at"),
  responseDeadline: timestamp("response_deadline"), // Calculated from priority
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
  // Status & Resolution
  status: varchar("status", { length: 20 }).notNull().default("new"), // new, assigned, in_progress, resolved, closed
  slaBreached: boolean("sla_breached").notNull().default(false),
  resolvedById: varchar("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  customerSatisfaction: integer("customer_satisfaction"), // 1-5 rating after resolution
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("guest_complaints_branch_idx").on(table.branchId),
  index("guest_complaints_status_idx").on(table.status),
  index("guest_complaints_priority_idx").on(table.priority),
  index("guest_complaints_date_idx").on(table.complaintDate),
  index("guest_complaints_deadline_idx").on(table.responseDeadline),
]);

export const insertGuestComplaintSchema = createInsertSchema(guestComplaints).omit({
  id: true,
  complaintDate: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGuestComplaint = z.infer<typeof insertGuestComplaintSchema>;
export type GuestComplaint = typeof guestComplaints.$inferSelect;

// ========================================
// EQUIPMENT TROUBLESHOOTING STEPS - Guided self-service before fault reporting
// ========================================

export const equipmentTroubleshootingSteps = pgTable("equipment_troubleshooting_steps", {
  id: serial("id").primaryKey(),
  equipmentType: varchar("equipment_type", { length: 100 }).notNull(), // espresso_machine, grinder, refrigerator
  order: integer("order").notNull(), // Display order
  description: text("description").notNull(), // "Cihazı kapatıp 30 saniye bekleyin"
  requiresPhoto: boolean("requires_photo").notNull().default(false),
  isRequired: boolean("is_required").notNull().default(true), // Must complete before fault reporting
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("troubleshooting_equipment_type_idx").on(table.equipmentType),
  index("troubleshooting_order_idx").on(table.order),
]);

export const insertEquipmentTroubleshootingStepSchema = createInsertSchema(equipmentTroubleshootingSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEquipmentTroubleshootingStep = z.infer<typeof insertEquipmentTroubleshootingStepSchema>;
export type EquipmentTroubleshootingStep = typeof equipmentTroubleshootingSteps.$inferSelect;

// ========================================
// EMPLOYEE PERFORMANCE SCORES - Personel Performans Skorları  
// ========================================

export const employeePerformanceScores = pgTable("employee_performance_scores", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  week: varchar("week", { length: 10 }).notNull(), // 2025-W47
  // Attendance & Punctuality scores
  attendanceScore: integer("attendance_score").notNull().default(100), // 0-100
  latenessScore: integer("lateness_score").notNull().default(100), // 0-100, decreased by lateness
  earlyLeaveScore: integer("early_leave_score").notNull().default(100), // 0-100
  breakComplianceScore: integer("break_compliance_score").notNull().default(100), // 0-100
  // Shift compliance
  shiftComplianceScore: integer("shift_compliance_score").notNull().default(100), // 0-100
  overtimeComplianceScore: integer("overtime_compliance_score").notNull().default(100), // 0-100
  // Totals
  dailyTotalScore: integer("daily_total_score").notNull().default(100), // Weighted average
  weeklyTotalScore: integer("weekly_total_score").notNull().default(100), // Week average
  // Penalties applied
  totalPenaltyMinutes: integer("total_penalty_minutes").notNull().default(0),
  // Metadata
  latenessMinutes: integer("lateness_minutes").notNull().default(0),
  earlyLeaveMinutes: integer("early_leave_minutes").notNull().default(0),
  breakOverageMinutes: integer("break_overage_minutes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("performance_scores_user_idx").on(table.userId),
  index("performance_scores_branch_idx").on(table.branchId),
  index("performance_scores_date_idx").on(table.date),
  index("performance_scores_week_idx").on(table.week),
  unique("unique_user_date_performance").on(table.userId, table.date),
]);

export const insertEmployeePerformanceScoreSchema = createInsertSchema(employeePerformanceScores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeePerformanceScore = z.infer<typeof insertEmployeePerformanceScoreSchema>;
export type EmployeePerformanceScore = typeof employeePerformanceScores.$inferSelect;

// ========================================
// BRANCH QUALITY AUDITS - Şube Kalite Denetim Puanlama
// ========================================

export const branchQualityAudits = pgTable("branch_quality_audits", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  auditDate: date("audit_date").notNull(),
  auditorId: varchar("auditor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Audit Categories (0-100 each)
  cleanlinessScore: integer("cleanliness_score").notNull(), // Temizlik skoru
  serviceQualityScore: integer("service_quality_score").notNull(), // Hizmet kalitesi
  productQualityScore: integer("product_quality_score").notNull(), // Ürün kalitesi
  staffBehaviorScore: integer("staff_behavior_score").notNull(), // Personel davranışı
  safetyComplianceScore: integer("safety_compliance_score").notNull(), // Güvenlik uyumu
  equipmentMaintenanceScore: integer("equipment_maintenance_score").notNull(), // Ekipman bakım
  
  // Overall
  overallScore: integer("overall_score").notNull(), // Weighted average
  
  // Notes and actions
  notes: text("notes"),
  actionItems: text("action_items"), // JSON array of required actions
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  followUpDate: date("follow_up_date"),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("completed"), // draft, completed, follow_up_pending
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("branch_quality_audits_branch_idx").on(table.branchId),
  index("branch_quality_audits_date_idx").on(table.auditDate),
  index("branch_quality_audits_auditor_idx").on(table.auditorId),
]);

export const insertBranchQualityAuditSchema = createInsertSchema(branchQualityAudits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  cleanlinessScore: z.number().int().min(0).max(100),
  serviceQualityScore: z.number().int().min(0).max(100),
  productQualityScore: z.number().int().min(0).max(100),
  staffBehaviorScore: z.number().int().min(0).max(100),
  safetyComplianceScore: z.number().int().min(0).max(100),
  equipmentMaintenanceScore: z.number().int().min(0).max(100),
  overallScore: z.number().int().min(0).max(100),
});

export type InsertBranchQualityAudit = z.infer<typeof insertBranchQualityAuditSchema>;
export type BranchQualityAudit = typeof branchQualityAudits.$inferSelect;

// ========================================
// EMPLOYEE DOCUMENTS - Özlük Dosyası Belgeleri
// ========================================

export const employeeDocuments = pgTable("employee_documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  documentType: varchar("document_type", { length: 100 }).notNull(), // id_card, diploma, health_report, contract, bank_info, insurance, certificate
  documentName: varchar("document_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  description: text("description"),
  expiryDate: date("expiry_date"),
  uploadedById: varchar("uploaded_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedById: varchar("verified_by_id").references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_documents_user_idx").on(table.userId),
  index("employee_documents_type_idx").on(table.documentType),
  index("employee_documents_expiry_idx").on(table.expiryDate),
]);

export const insertEmployeeDocumentSchema = createInsertSchema(employeeDocuments).omit({
  id: true,
  uploadedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeDocument = z.infer<typeof insertEmployeeDocumentSchema>;
export type EmployeeDocument = typeof employeeDocuments.$inferSelect;

// ========================================
// DISCIPLINARY REPORTS - Tutanaklar, Disiplin İşlemleri, Yazılı Savunmalar
// ========================================

export const disciplinaryReports = pgTable("disciplinary_reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  reportType: varchar("report_type", { length: 50 }).notNull(), // warning, investigation, defense, meeting_minutes
  severity: varchar("severity", { length: 20 }).notNull().default("low"), // low, medium, high, critical
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  incidentDate: date("incident_date").notNull(),
  incidentTime: varchar("incident_time", { length: 5 }), // HH:MM format
  location: varchar("location", { length: 255 }),
  witnessIds: text("witness_ids").array(), // Array of user IDs
  attachmentUrls: text("attachment_urls").array(), // Fotoğraflar ve belgeler
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  employeeResponse: text("employee_response"), // Yazılı savunma
  employeeResponseDate: timestamp("employee_response_date"),
  employeeResponseAttachments: text("employee_response_attachments").array(),
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, under_review, resolved, closed
  resolution: text("resolution"),
  resolvedById: varchar("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  actionTaken: varchar("action_taken", { length: 100 }), // verbal_warning, written_warning, suspension, termination, cleared
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  followUpDate: date("follow_up_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("disciplinary_reports_user_idx").on(table.userId),
  index("disciplinary_reports_branch_idx").on(table.branchId),
  index("disciplinary_reports_type_idx").on(table.reportType),
  index("disciplinary_reports_status_idx").on(table.status),
  index("disciplinary_reports_date_idx").on(table.incidentDate),
]);

export const insertDisciplinaryReportSchema = createInsertSchema(disciplinaryReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDisciplinaryReport = z.infer<typeof insertDisciplinaryReportSchema>;
export type DisciplinaryReport = typeof disciplinaryReports.$inferSelect;

// ========================================
// EMPLOYEE ONBOARDING - Yeni Personel Onboarding Süreci
// ========================================

export const employeeOnboarding = pgTable("employee_onboarding", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("not_started"), // not_started, in_progress, completed
  startDate: date("start_date").notNull(),
  expectedCompletionDate: date("expected_completion_date"),
  actualCompletionDate: date("actual_completion_date"),
  completionPercentage: integer("completion_percentage").notNull().default(0), // 0-100
  assignedMentorId: varchar("assigned_mentor_id").references(() => users.id, { onDelete: "set null" }),
  supervisorNotes: text("supervisor_notes"),
  employeeNotes: text("employee_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_onboarding_user_idx").on(table.userId),
  index("employee_onboarding_branch_idx").on(table.branchId),
  index("employee_onboarding_status_idx").on(table.status),
]);

export const insertEmployeeOnboardingSchema = createInsertSchema(employeeOnboarding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeOnboarding = z.infer<typeof insertEmployeeOnboardingSchema>;
export type EmployeeOnboarding = typeof employeeOnboarding.$inferSelect;

// ========================================
// EMPLOYEE ONBOARDING TASKS - Onboarding Görevleri
// ========================================

export const employeeOnboardingTasks = pgTable("employee_onboarding_tasks", {
  id: serial("id").primaryKey(),
  onboardingId: integer("onboarding_id").notNull().references(() => employeeOnboarding.id, { onDelete: "cascade" }),
  taskType: varchar("task_type", { length: 100 }).notNull(), // document_upload, training, orientation, system_access, meet_team
  taskName: varchar("task_name", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed, skipped
  completedById: varchar("completed_by_id").references(() => users.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at"),
  verifiedById: varchar("verified_by_id").references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at"),
  attachmentUrls: text("attachment_urls").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("onboarding_tasks_onboarding_idx").on(table.onboardingId),
  index("onboarding_tasks_status_idx").on(table.status),
  index("onboarding_tasks_due_date_idx").on(table.dueDate),
]);

export const insertEmployeeOnboardingTaskSchema = createInsertSchema(employeeOnboardingTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeOnboardingTask = z.infer<typeof insertEmployeeOnboardingTaskSchema>;
export type EmployeeOnboardingTask = typeof employeeOnboardingTasks.$inferSelect;

// ========================================
// PERMISSION MODULES - Yetki Modülleri Tanımları
// ========================================

export const permissionModules = pgTable("permission_modules", {
  id: serial("id").primaryKey(),
  moduleKey: varchar("module_key", { length: 50 }).notNull().unique(), // dashboard, tasks, checklists, etc.
  moduleName: varchar("module_name", { length: 100 }).notNull(), // "Panel", "Görevler", etc.
  description: text("description"),
  category: varchar("category", { length: 50 }), // hq, branch, factory, shared
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("permission_modules_module_key_idx").on(table.moduleKey),
  index("permission_modules_category_idx").on(table.category),
]);

export const insertPermissionModuleSchema = createInsertSchema(permissionModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPermissionModule = z.infer<typeof insertPermissionModuleSchema>;
export type PermissionModule_DB = typeof permissionModules.$inferSelect;

// ========================================
// ROLE MODULE PERMISSIONS - Rol-Modül-Aksiyon İlişkileri  
// ========================================

export const roleModulePermissions = pgTable("role_module_permissions", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 50 }).notNull(), // admin, muhasebe, barista, etc.
  module: varchar("module", { length: 50 }).notNull(), // dashboard, tasks, etc.
  actions: text("actions").array().notNull().default(sql`ARRAY[]::text[]`), // ['view', 'create', 'edit', 'delete', 'approve']
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("role_module_permissions_role_idx").on(table.role),
  index("role_module_permissions_module_idx").on(table.module),
  unique("role_module_permissions_role_module_unique").on(table.role, table.module),
]);

export const insertRoleModulePermissionSchema = createInsertSchema(roleModulePermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateRoleModulePermissionSchema = insertRoleModulePermissionSchema.partial();

export type InsertRoleModulePermission = z.infer<typeof insertRoleModulePermissionSchema>;
export type UpdateRoleModulePermission = z.infer<typeof updateRoleModulePermissionSchema>;
export type RoleModulePermission = typeof roleModulePermissions.$inferSelect;

// ========================================
// BACKUP RECORDS - Yedekleme Kayıtları
// ========================================

export const backupRecords = pgTable("backup_records", {
  id: serial("id").primaryKey(),
  backupId: varchar("backup_id", { length: 100 }).notNull().unique(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  success: boolean("success").notNull().default(false),
  tablesBackedUp: text("tables_backed_up").array().notNull().default(sql`ARRAY[]::text[]`),
  recordCounts: jsonb("record_counts").notNull().default('{}'),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms").notNull().default(0),
  backupType: varchar("backup_type", { length: 20 }).notNull().default('daily'), // daily, manual
}, (table) => [
  index("backup_records_timestamp_idx").on(table.timestamp),
  index("backup_records_success_idx").on(table.success),
]);

export const insertBackupRecordSchema = createInsertSchema(backupRecords).omit({
  id: true,
  timestamp: true,
});

export type InsertBackupRecord = z.infer<typeof insertBackupRecordSchema>;
export type BackupRecord = typeof backupRecords.$inferSelect;

// ========================================
// TRAINING MATERIALS - AI Eğitim Materyalleri
// ========================================

// Training Materials - Knowledge Base makalesinden AI tarafından oluşturulan eğitim içeriği
export const trainingMaterials = pgTable("training_materials", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => knowledgeBaseArticles.id, { onDelete: "cascade" }),
  materialType: varchar("material_type", { length: 50 }).notNull(), // flashcard_set, quiz, multi_step_guide, mindmap
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  content: jsonb("content").notNull(), // { flashcards: [], quizzes: [], steps: [], mindmap: {} }
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, published, archived
  targetRoles: text("target_roles").array(), // Hedef roller
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("training_materials_article_idx").on(table.articleId),
  index("training_materials_status_idx").on(table.status),
  index("training_materials_type_idx").on(table.materialType),
]);

export const insertTrainingMaterialSchema = createInsertSchema(trainingMaterials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainingMaterial = z.infer<typeof insertTrainingMaterialSchema>;
export type TrainingMaterial = typeof trainingMaterials.$inferSelect;

// Training Assignments - Eğitim atamaları (kullanıcı/rol gruplarına)
export const trainingAssignments = pgTable("training_assignments", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").notNull().references(() => trainingMaterials.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  targetRole: varchar("target_role", { length: 50 }), // Rol grubuna atama
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  assignedById: varchar("assigned_by_id").notNull().references(() => users.id),
  dueDate: date("due_date"),
  isRequired: boolean("is_required").default(true),
  status: varchar("status", { length: 20 }).notNull().default("assigned"), // assigned, in_progress, completed, overdue, expired
  remindersSent: integer("reminders_sent").default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("training_assignments_material_idx").on(table.materialId),
  index("training_assignments_user_idx").on(table.userId),
  index("training_assignments_status_idx").on(table.status),
  index("training_assignments_due_date_idx").on(table.dueDate),
]);

export const insertTrainingAssignmentSchema = createInsertSchema(trainingAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainingAssignment = z.infer<typeof insertTrainingAssignmentSchema>;
export type TrainingAssignment = typeof trainingAssignments.$inferSelect;

// Training Completions - Tamamlama kayıtları (skor, süre, durumlar)
export const trainingCompletions = pgTable("training_completions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => trainingAssignments.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  materialId: integer("material_id").notNull().references(() => trainingMaterials.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"), // in_progress, passed, failed, abandoned
  score: integer("score"), // 0-100
  timeSpentSeconds: integer("time_spent_seconds").default(0),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("training_completions_user_idx").on(table.userId),
  index("training_completions_material_idx").on(table.materialId),
  index("training_completions_status_idx").on(table.status),
  index("training_completions_completed_idx").on(table.completedAt),
]);

export const insertTrainingCompletionSchema = createInsertSchema(trainingCompletions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainingCompletion = z.infer<typeof insertTrainingCompletionSchema>;
export type TrainingCompletion = typeof trainingCompletions.$inferSelect;

// ========================================
// CAREER PROGRESSION - Kariyer İlerleme Sistemi
// ========================================

// Career Levels - 5 seviye
export const careerLevels = pgTable("career_levels", {
  id: serial("id").primaryKey(),
  roleId: varchar("role_id", { length: 50 }).notNull().unique(), // stajyer, bar_buddy, barista, supervisor_buddy, supervisor
  levelNumber: integer("level_number").notNull(), // 1-5
  titleTr: varchar("title_tr", { length: 100 }).notNull(), // "Stajyer", "Bar Buddy", vb
  descriptionTr: text("description_tr"),
  requiredModuleIds: integer("required_module_ids").array().default(sql`ARRAY[]::integer[]`), // Zorunlu modül ID'leri
  prerequisiteRoles: text("prerequisite_roles").array(), // Önceki roller
  successRateThreshold: integer("success_rate_threshold").default(80), // Sınav geçiş notu (%)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("career_levels_role_idx").on(table.roleId),
  index("career_levels_level_idx").on(table.levelNumber),
]);

export const insertCareerLevelSchema = createInsertSchema(careerLevels).omit({
  id: true,
  createdAt: true,
});

export type InsertCareerLevel = z.infer<typeof insertCareerLevelSchema>;
export type CareerLevel = typeof careerLevels.$inferSelect;

// Exam Requests - Supervisor tarafından başlatılan sınav talepleri
export const examRequests = pgTable("exam_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetRoleId: varchar("target_role_id", { length: 50 }).notNull(), // Hangi role'e terfi (e.g., "barista")
  supervisorId: varchar("supervisor_id").notNull().references(() => users.id),
  supervisorNotes: text("supervisor_notes"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected, exam_in_progress, passed, failed
  approvedById: varchar("approved_by_id").references(() => users.id), // HQ onaylayan
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  examStartedAt: timestamp("exam_started_at"),
  examCompletedAt: timestamp("exam_completed_at"),
  examScore: integer("exam_score"), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("exam_requests_user_idx").on(table.userId),
  index("exam_requests_status_idx").on(table.status),
  index("exam_requests_target_role_idx").on(table.targetRoleId),
]);

export const insertExamRequestSchema = createInsertSchema(examRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExamRequest = z.infer<typeof insertExamRequestSchema>;
export type ExamRequest = typeof examRequests.$inferSelect;

// User Career Progress - Her kullanıcının kariyer durumu
export const userCareerProgress = pgTable("user_career_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  currentCareerLevelId: integer("current_career_level_id").notNull().references(() => careerLevels.id),
  completedModuleIds: integer("completed_module_ids").array().default(sql`ARRAY[]::integer[]`),
  averageQuizScore: real("average_quiz_score").default(0),
  totalQuizzesAttempted: integer("total_quizzes_attempted").default(0),
  lastExamRequestId: integer("last_exam_request_id").references(() => examRequests.id),
  promotionEligibleAt: timestamp("promotion_eligible_at"), // Ne zaman terfi için hazır olacak
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_career_progress_user_idx").on(table.userId),
  index("user_career_progress_level_idx").on(table.currentCareerLevelId),
]);

export const insertUserCareerProgressSchema = createInsertSchema(userCareerProgress).omit({
  id: true,
  lastUpdatedAt: true,
  createdAt: true,
});

export type InsertUserCareerProgress = z.infer<typeof insertUserCareerProgressSchema>;
export type UserCareerProgress = typeof userCareerProgress.$inferSelect;

// Quiz Results - Sınav sonuçları ve leaderboard verileri
export const quizResults = pgTable("quiz_results", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  quizId: varchar("quiz_id", { length: 100 }).notNull(),
  score: integer("score").notNull(),
  answers: jsonb("answers"),
  completedAt: timestamp("completed_at").defaultNow(),
}, (table) => [
  index("quiz_results_user_idx").on(table.userId),
  index("quiz_results_score_idx").on(table.score),
]);

export const insertQuizResultSchema = createInsertSchema(quizResults).omit({
  id: true,
  completedAt: true,
});

export type InsertQuizResult = z.infer<typeof insertQuizResultSchema>;
export type QuizResult = typeof quizResults.$inferSelect;

// ========================================
// QUIZ METADATA - Sınav Metaveri
// ========================================

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  quizId: varchar("quiz_id", { length: 100 }).notNull().unique(), // e.g., "espresso-101"
  titleTr: varchar("title_tr", { length: 200 }).notNull(),
  descriptionTr: text("description_tr"),
  careerLevelId: integer("career_level_id").notNull().references(() => careerLevels.id),
  difficulty: varchar("difficulty", { length: 20 }).default("medium"), // easy, medium, hard
  estimatedMinutes: integer("estimated_minutes").default(30),
  passingScore: integer("passing_score").default(70),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("quizzes_career_level_idx").on(table.careerLevelId),
  index("quizzes_difficulty_idx").on(table.difficulty),
]);

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
});

export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzes.$inferSelect;

// ========================================
// BADGE SYSTEM - Başarı ve Rozetler
// ========================================

// Available Badges
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  badgeKey: varchar("badge_key", { length: 50 }).notNull().unique(), // first_quiz, top_10, expert_barista, etc
  titleTr: varchar("title_tr", { length: 100 }).notNull(),
  descriptionTr: text("description_tr"),
  iconName: varchar("icon_name", { length: 50 }), // lucide-react icon name
  category: varchar("category", { length: 20 }).notNull(), // achievement, skill, milestone, leadership
  condition: jsonb("condition"), // {type: "quiz_score", minScore: 90, count: 3}
  points: integer("points").default(10), // Gamification points
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("badges_category_idx").on(table.category),
]);

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;

// User Badge Progress
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeId: integer("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  progress: integer("progress").default(0), // 0-100% toward badge
}, (table) => [
  index("user_badges_user_idx").on(table.userId),
  index("user_badges_badge_idx").on(table.badgeId),
  unique("user_badges_unique").on(table.userId, table.badgeId),
]);

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  unlockedAt: true,
});

export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;

// ========================================
// BRANCH FEEDBACK SYSTEM - Şubelerden Geribildirim
// ========================================

export const branchFeedbacks = pgTable("branch_feedbacks", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  submittedById: varchar("submitted_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // "order", "invoice", "logistics", "other"
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("yeni"), // yeni, okundu, yanıtlandı
  response: text("response"),
  respondedById: varchar("responded_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
}, (table) => [
  index("branch_feedbacks_branch_idx").on(table.branchId),
  index("branch_feedbacks_status_idx").on(table.status),
  index("branch_feedbacks_created_idx").on(table.createdAt),
]);

export const insertBranchFeedbackSchema = createInsertSchema(branchFeedbacks).omit({
  id: true,
  createdAt: true,
  status: true,
  respondedAt: true,
});

export type InsertBranchFeedback = z.infer<typeof insertBranchFeedbackSchema>;
export type BranchFeedback = typeof branchFeedbacks.$inferSelect;

// ========================================
// LOST & FOUND SYSTEM - Kayıp Eşya Takibi
// ========================================

export const lostFoundStatusEnum = ["bulunan", "teslim_edildi"] as const;
export type LostFoundStatusType = typeof lostFoundStatusEnum[number];

export const lostFoundItems = pgTable("lost_found_items", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  foundById: varchar("found_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  foundDate: date("found_date").notNull(),
  foundTime: time("found_time").notNull(),
  foundArea: varchar("found_area", { length: 100 }).notNull(),
  itemDescription: text("item_description").notNull(),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("bulunan").notNull(),
  ownerName: varchar("owner_name", { length: 100 }),
  ownerPhone: varchar("owner_phone", { length: 20 }),
  handoverDate: timestamp("handover_date"),
  handoveredById: varchar("handovered_by_id").references(() => users.id, { onDelete: "set null" }),
  handoverNotes: text("handover_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("lost_found_branch_idx").on(table.branchId),
  index("lost_found_status_idx").on(table.status),
  index("lost_found_found_date_idx").on(table.foundDate),
  index("lost_found_created_idx").on(table.createdAt),
]);

export const insertLostFoundItemSchema = createInsertSchema(lostFoundItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  ownerName: true,
  ownerPhone: true,
  handoverDate: true,
  handoveredById: true,
  handoverNotes: true,
  branchId: true,
  foundById: true,
});

export const handoverLostFoundItemSchema = z.object({
  ownerName: z.string().min(2, "Sahip adı en az 2 karakter olmalı"),
  ownerPhone: z.string().min(10, "Telefon numarası geçersiz"),
  handoverNotes: z.string().optional(),
});

export type InsertLostFoundItem = z.infer<typeof insertLostFoundItemSchema>;
export type HandoverLostFoundItem = z.infer<typeof handoverLostFoundItemSchema>;
export type LostFoundItem = typeof lostFoundItems.$inferSelect;

// ========================================
// RECIPE MANAGEMENT SYSTEM - Reçete Yönetimi
// ========================================

// Recipe Categories (HOT, ICED, CREAMICE, FRESHESS, etc.)
export const recipeCategories = pgTable("recipe_categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 50 }).notNull().unique(), // hot, iced, creamice, freshess
  titleTr: varchar("title_tr", { length: 100 }).notNull(), // Sıcak Kahve
  titleEn: varchar("title_en", { length: 100 }), // Hot Coffee
  description: text("description"),
  iconName: varchar("icon_name", { length: 50 }), // lucide-react icon name
  colorHex: varchar("color_hex", { length: 7 }), // #FF5733
  displayOrder: integer("display_order").default(0),
  bannerImageUrl: text("banner_image_url"), // Category banner
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("recipe_categories_slug_idx").on(table.slug),
  index("recipe_categories_order_idx").on(table.displayOrder),
]);

export const insertRecipeCategorySchema = createInsertSchema(recipeCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRecipeCategory = z.infer<typeof insertRecipeCategorySchema>;
export type RecipeCategory = typeof recipeCategories.$inferSelect;

// Recipes - Ana reçete tablosu
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => recipeCategories.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull(), // A, L, FW, BL, etc.
  nameTr: varchar("name_tr", { length: 150 }).notNull(), // Iced Americano
  nameEn: varchar("name_en", { length: 150 }), // Iced Americano
  description: text("description"),
  coffeeType: varchar("coffee_type", { length: 50 }), // espresso, filter, none
  hasCoffee: boolean("has_coffee").default(true),
  hasMilk: boolean("has_milk").default(false),
  difficulty: varchar("difficulty", { length: 20 }).default("easy"), // easy, medium, hard
  estimatedMinutes: integer("estimated_minutes").default(3),
  requiredRole: varchar("required_role", { length: 50 }), // Minimum rol gereksinimi
  photoUrl: text("photo_url"), // Reçete fotoğrafı
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false), // Öne çıkan reçete
  displayOrder: integer("display_order").default(0),
  tags: varchar("tags", { length: 50 }).array(), // ["seasonal", "signature", "new"]
  currentVersionId: integer("current_version_id"), // En güncel versiyon
  aiEmbedding: vector("ai_embedding"), // pgvector for AI search
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("recipes_category_idx").on(table.categoryId),
  index("recipes_code_idx").on(table.code),
  index("recipes_active_idx").on(table.isActive),
  unique("recipes_category_code_unique").on(table.categoryId, table.code),
]);

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  aiEmbedding: true,
  currentVersionId: true,
});

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;

// Recipe Versions - Versiyon takibi
export const recipeVersions = pgTable("recipe_versions", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull().default(1),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  updatedById: varchar("updated_by_id").references(() => users.id),
  changeLog: text("change_log"), // Değişiklik açıklaması
  changedFields: jsonb("changed_fields").$type<string[]>().default([]), // ["steps", "syrups"] - highlighted fields
  // Size variants
  sizes: jsonb("sizes").$type<{
    massivo?: {
      cupMl: number;
      steps: string[];
      liquids?: Record<string, number>;
      syrups?: Record<string, number>;
      powders?: Record<string, number>;
      garnish?: string[];
      ice?: string;
    };
    longDiva?: {
      cupMl: number;
      steps: string[];
      liquids?: Record<string, number>;
      syrups?: Record<string, number>;
      powders?: Record<string, number>;
      garnish?: string[];
      ice?: string;
    };
  }>(),
  // Common fields
  ingredients: jsonb("ingredients").$type<Array<{name: string; amount: string; unit?: string}>>().default([]),
  notes: text("notes"),
  seasonInfo: varchar("season_info", { length: 100 }), // "Sonbahar-Kış sezon ürünü"
  isApproved: boolean("is_approved").default(false),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("recipe_versions_recipe_idx").on(table.recipeId),
  index("recipe_versions_version_idx").on(table.versionNumber),
  unique("recipe_versions_unique").on(table.recipeId, table.versionNumber),
]);

export const insertRecipeVersionSchema = createInsertSchema(recipeVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertRecipeVersion = z.infer<typeof insertRecipeVersionSchema>;
export type RecipeVersion = typeof recipeVersions.$inferSelect;

// Recipe Notifications - Güncelleme bildirimleri
export const recipeNotifications = pgTable("recipe_notifications", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  versionId: integer("version_id").notNull().references(() => recipeVersions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("recipe_notifications_user_idx").on(table.userId),
  index("recipe_notifications_recipe_idx").on(table.recipeId),
  unique("recipe_notifications_unique").on(table.recipeId, table.versionId, table.userId),
]);

export const insertRecipeNotificationSchema = createInsertSchema(recipeNotifications).omit({
  id: true,
  createdAt: true,
});

export type InsertRecipeNotification = z.infer<typeof insertRecipeNotificationSchema>;
export type RecipeNotification = typeof recipeNotifications.$inferSelect;

// ========================================
// GAMIFICATION EXTENSIONS - Oyunlaştırma
// ========================================

// Daily Missions - Günlük görevler
export const dailyMissions = pgTable("daily_missions", {
  id: serial("id").primaryKey(),
  missionKey: varchar("mission_key", { length: 50 }).notNull(), // learn_recipe, complete_quiz, etc.
  titleTr: varchar("title_tr", { length: 150 }).notNull(),
  descriptionTr: text("description_tr"),
  xpReward: integer("xp_reward").default(10),
  targetCount: integer("target_count").default(1), // Kaç kez yapılmalı
  missionType: varchar("mission_type", { length: 30 }).notNull(), // daily, weekly, special
  condition: jsonb("condition"), // {type: "quiz_complete", categoryId: 1}
  iconName: varchar("icon_name", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("daily_missions_type_idx").on(table.missionType),
  index("daily_missions_active_idx").on(table.isActive),
]);

export const insertDailyMissionSchema = createInsertSchema(dailyMissions).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyMission = z.infer<typeof insertDailyMissionSchema>;
export type DailyMission = typeof dailyMissions.$inferSelect;

// User Mission Progress - Kullanıcı görev ilerlemesi
export const userMissionProgress = pgTable("user_mission_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  missionId: integer("mission_id").notNull().references(() => dailyMissions.id, { onDelete: "cascade" }),
  currentCount: integer("current_count").default(0),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  xpEarned: integer("xp_earned").default(0),
  missionDate: date("mission_date").notNull(), // Hangi gün için
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_mission_progress_user_idx").on(table.userId),
  index("user_mission_progress_date_idx").on(table.missionDate),
  unique("user_mission_progress_unique").on(table.userId, table.missionId, table.missionDate),
]);

export const insertUserMissionProgressSchema = createInsertSchema(userMissionProgress).omit({
  id: true,
  createdAt: true,
});

export type InsertUserMissionProgress = z.infer<typeof insertUserMissionProgressSchema>;
export type UserMissionProgress = typeof userMissionProgress.$inferSelect;

// Leaderboard Snapshots - Liderlik tablosu anlık görüntüleri
export const leaderboardSnapshots = pgTable("leaderboard_snapshots", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodType: varchar("period_type", { length: 20 }).notNull(), // weekly, monthly, all_time
  periodKey: varchar("period_key", { length: 20 }).notNull(), // 2025-W01, 2025-01
  totalXp: integer("total_xp").default(0),
  quizCount: integer("quiz_count").default(0),
  perfectQuizCount: integer("perfect_quiz_count").default(0),
  streakDays: integer("streak_days").default(0),
  rank: integer("rank"),
  branchId: integer("branch_id").references(() => branches.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("leaderboard_snapshots_user_idx").on(table.userId),
  index("leaderboard_snapshots_period_idx").on(table.periodType, table.periodKey),
  index("leaderboard_snapshots_rank_idx").on(table.rank),
  unique("leaderboard_snapshots_unique").on(table.userId, table.periodType, table.periodKey),
]);

export const insertLeaderboardSnapshotSchema = createInsertSchema(leaderboardSnapshots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLeaderboardSnapshot = z.infer<typeof insertLeaderboardSnapshotSchema>;
export type LeaderboardSnapshot = typeof leaderboardSnapshots.$inferSelect;

// User Practice Sessions - Pratik oturum takibi
export const userPracticeSessions = pgTable("user_practice_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionDate: date("session_date").notNull(),
  quizzesCompleted: integer("quizzes_completed").default(0),
  recipesViewed: integer("recipes_viewed").default(0),
  modulesCompleted: integer("modules_completed").default(0),
  xpEarned: integer("xp_earned").default(0),
  timeSpentMinutes: integer("time_spent_minutes").default(0),
  streakDay: integer("streak_day").default(1), // Seri günü
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_practice_sessions_user_idx").on(table.userId),
  index("user_practice_sessions_date_idx").on(table.sessionDate),
  unique("user_practice_sessions_unique").on(table.userId, table.sessionDate),
]);

export const insertUserPracticeSessionSchema = createInsertSchema(userPracticeSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPracticeSession = z.infer<typeof insertUserPracticeSessionSchema>;
export type UserPracticeSession = typeof userPracticeSessions.$inferSelect;

// Academy Hub Categories - Akademi ana sayfa kategorileri
export const academyHubCategories = pgTable("academy_hub_categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 50 }).notNull().unique(), // career, recipes, general, practice
  titleTr: varchar("title_tr", { length: 100 }).notNull(),
  titleEn: varchar("title_en", { length: 100 }),
  description: text("description"),
  iconName: varchar("icon_name", { length: 50 }), // lucide-react icon
  colorHex: varchar("color_hex", { length: 7 }),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("academy_hub_categories_order_idx").on(table.displayOrder),
]);

export const insertAcademyHubCategorySchema = createInsertSchema(academyHubCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertAcademyHubCategory = z.infer<typeof insertAcademyHubCategorySchema>;
export type AcademyHubCategory = typeof academyHubCategories.$inferSelect;

// ========================================
// HQ PROJECT MANAGEMENT SYSTEM
// Proje yönetimi, görev atama, iş birliği
// ========================================

// Project Types
export const projectTypeEnum = ["standard", "new_shop"] as const;
export type ProjectTypeType = typeof projectTypeEnum[number];

// Projects - Ana proje tablosu
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  projectType: varchar("project_type", { length: 30 }).default("standard"), // standard, new_shop
  status: varchar("status", { length: 30 }).default("planning"), // planning, in_progress, completed, on_hold, cancelled
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }), // Yeni şube için oluşturulacak branch
  startDate: date("start_date"),
  targetDate: date("target_date"),
  completedAt: timestamp("completed_at"),
  tags: text("tags").array(),
  // New Shop specific fields
  cityName: varchar("city_name", { length: 100 }), // Şube şehri
  locationAddress: text("location_address"), // Şube adresi
  estimatedBudget: integer("estimated_budget"), // Tahmini bütçe (TL)
  actualBudget: integer("actual_budget"), // Gerçekleşen bütçe (TL)
  franchiseeName: varchar("franchisee_name", { length: 200 }), // Bayi adı
  franchiseePhone: varchar("franchisee_phone", { length: 20 }),
  franchiseeEmail: varchar("franchisee_email", { length: 255 }),
  contractSignedAt: timestamp("contract_signed_at"), // Sözleşme imza tarihi
  targetOpeningDate: date("target_opening_date"), // Hedef açılış tarihi
  actualOpeningDate: date("actual_opening_date"), // Gerçek açılış tarihi
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("projects_owner_idx").on(table.ownerId),
  index("projects_status_idx").on(table.status),
  index("projects_active_idx").on(table.isActive),
  index("projects_type_idx").on(table.projectType),
]);

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Project Members - Proje ekip üyeleri
// Roller: editor (düzenleme), contributor (görev ekleme), viewer (sadece görüntüleme), owner (tam yetki)
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 30 }).default("contributor"), // owner, editor, contributor, viewer
  canManageTeam: boolean("can_manage_team").default(false), // Ekip yönetim yetkisi
  canDeleteTasks: boolean("can_delete_tasks").default(false), // Görev silme yetkisi
  joinedAt: timestamp("joined_at").defaultNow(),
  removedAt: timestamp("removed_at"),
}, (table) => [
  index("project_members_project_idx").on(table.projectId),
  index("project_members_user_idx").on(table.userId),
  unique("project_members_unique").on(table.projectId, table.userId),
]);

export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  id: true,
  joinedAt: true,
  removedAt: true,
});

export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;

// Project Milestones - Kilometre taşları
export const projectMilestones = pgTable("project_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  status: varchar("status", { length: 30 }).default("pending"), // pending, in_progress, completed
  completedAt: timestamp("completed_at"),
  colorHex: varchar("color_hex", { length: 7 }).default("#6366f1"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("project_milestones_project_idx").on(table.projectId),
  index("project_milestones_status_idx").on(table.status),
]);

export const insertProjectMilestoneSchema = createInsertSchema(projectMilestones).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertProjectMilestone = z.infer<typeof insertProjectMilestoneSchema>;
export type ProjectMilestone = typeof projectMilestones.$inferSelect;

// Project Tasks - Proje görevleri (enhanced with subtask & milestone support)
export const projectTasks = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentTaskId: integer("parent_task_id"), // Alt görev için üst görev ID'si
  milestoneId: integer("milestone_id").references(() => projectMilestones.id, { onDelete: "set null" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).default("todo"), // todo, in_progress, review, done
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  dueDate: date("due_date"),
  startDate: date("start_date"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  completedAt: timestamp("completed_at"),
  orderIndex: integer("order_index").default(0),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_tasks_project_idx").on(table.projectId),
  index("project_tasks_assigned_idx").on(table.assignedToId),
  index("project_tasks_status_idx").on(table.status),
  index("project_tasks_parent_idx").on(table.parentTaskId),
  index("project_tasks_milestone_idx").on(table.milestoneId),
]);

export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;
export type ProjectTask = typeof projectTasks.$inferSelect;

// Project Task Dependencies - Görev bağımlılıkları
export const projectTaskDependencies = pgTable("project_task_dependencies", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => projectTasks.id, { onDelete: "cascade" }),
  dependsOnTaskId: integer("depends_on_task_id").notNull().references(() => projectTasks.id, { onDelete: "cascade" }),
  dependencyType: varchar("dependency_type", { length: 30 }).default("finish_to_start"), // finish_to_start, start_to_start, finish_to_finish
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("task_dependencies_task_idx").on(table.taskId),
  index("task_dependencies_depends_on_idx").on(table.dependsOnTaskId),
  unique("task_dependencies_unique").on(table.taskId, table.dependsOnTaskId),
]);

export const insertProjectTaskDependencySchema = createInsertSchema(projectTaskDependencies).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectTaskDependency = z.infer<typeof insertProjectTaskDependencySchema>;
export type ProjectTaskDependency = typeof projectTaskDependencies.$inferSelect;

// Project Comments - Proje timeline/yorumları
export const projectComments = pgTable("project_comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => projectTasks.id, { onDelete: "cascade" }), // null = project-level comment
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  isSystemMessage: boolean("is_system_message").default(false), // For auto-generated activity logs
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("project_comments_project_idx").on(table.projectId),
  index("project_comments_task_idx").on(table.taskId),
  index("project_comments_user_idx").on(table.userId),
  index("project_comments_created_idx").on(table.createdAt),
]);

export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectComment = z.infer<typeof insertProjectCommentSchema>;
export type ProjectComment = typeof projectComments.$inferSelect;

// ========================================
// NEW SHOP OPENING - Yeni Şube Açılış Sistemi
// ========================================

// Project Phases - Proje Fazları (Yeni Şube için 7 ana faz)
export const projectPhaseTypeEnum = [
  "company_setup",      // Şirket Kurulum
  "contract_legal",     // Sözleşme & Hukuki
  "construction",       // İnşaat & Dekorasyon
  "equipment",          // Ekipman Yönetimi
  "payments",           // Ödemeler & Bütçe
  "staffing",           // Personel & İşe Alım
  "training_opening"    // Eğitim & Açılış
] as const;
export type ProjectPhaseType = typeof projectPhaseTypeEnum[number];

export const projectPhases = pgTable("project_phases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phaseType: varchar("phase_type", { length: 50 }).notNull(), // company_setup, contract_legal, construction, equipment, payments, staffing, training_opening
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).default("not_started"), // not_started, in_progress, completed, blocked
  progress: integer("progress").default(0), // 0-100 percentage
  orderIndex: integer("order_index").default(0),
  startDate: date("start_date"),
  targetDate: date("target_date"),
  completedAt: timestamp("completed_at"),
  colorHex: varchar("color_hex", { length: 7 }).default("#6366f1"),
  isCustom: boolean("is_custom").default(false), // Özel eklenen faz mı?
  iconName: varchar("icon_name", { length: 50 }), // lucide icon name
  responsibleUserId: varchar("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_phases_project_idx").on(table.projectId),
  index("project_phases_type_idx").on(table.phaseType),
  index("project_phases_status_idx").on(table.status),
]);

export const insertProjectPhaseSchema = createInsertSchema(projectPhases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertProjectPhase = z.infer<typeof insertProjectPhaseSchema>;
export type ProjectPhase = typeof projectPhases.$inferSelect;

// Budget Categories for New Shop
export const budgetCategoryEnum = [
  "franchise_fee",      // Franchise Ücreti
  "rent_deposit",       // Kira & Depozito
  "construction",       // İnşaat
  "decoration",         // Dekorasyon
  "furniture",          // Mobilya
  "equipment",          // Ekipman
  "signage",            // Tabela & Reklam
  "permits",            // İzin & Ruhsat
  "staffing",           // Personel
  "training",           // Eğitim
  "marketing",          // Pazarlama
  "inventory",          // Stok
  "contingency",        // Beklenmedik Giderler
  "other"               // Diğer
] as const;
export type BudgetCategoryType = typeof budgetCategoryEnum[number];

// Project Budget Lines - Bütçe Kalemleri
export const projectBudgetLines = pgTable("project_budget_lines", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phaseId: integer("phase_id").references(() => projectPhases.id, { onDelete: "set null" }),
  category: varchar("category", { length: 50 }).notNull(), // From budgetCategoryEnum
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  plannedAmount: integer("planned_amount").default(0), // TL
  actualAmount: integer("actual_amount").default(0), // TL
  paidAmount: integer("paid_amount").default(0), // Ödenen tutar
  paymentStatus: varchar("payment_status", { length: 30 }).default("pending"), // pending, partial, paid, overdue
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at"),
  vendorId: integer("vendor_id"), // Project vendor reference
  invoiceNo: varchar("invoice_no", { length: 100 }),
  notes: text("notes"),
  isContingency: boolean("is_contingency").default(false), // Acil durum tamponu mu?
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_budget_project_idx").on(table.projectId),
  index("project_budget_phase_idx").on(table.phaseId),
  index("project_budget_category_idx").on(table.category),
  index("project_budget_status_idx").on(table.paymentStatus),
]);

export const insertProjectBudgetLineSchema = createInsertSchema(projectBudgetLines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectBudgetLine = z.infer<typeof insertProjectBudgetLineSchema>;
export type ProjectBudgetLine = typeof projectBudgetLines.$inferSelect;

// Vendor Types
export const vendorTypeEnum = [
  "contractor",         // Müteahhit
  "architect",          // Mimar
  "interior_designer",  // İç Mimar
  "furniture_supplier", // Mobilya Tedarikçisi
  "equipment_supplier", // Ekipman Tedarikçisi
  "signage_company",    // Tabela Firması
  "marketing_agency",   // Reklam Ajansı
  "legal_advisor",      // Hukuk Danışmanı
  "accountant",         // Mali Müşavir
  "consultant",         // Danışman
  "other"               // Diğer
] as const;
export type VendorType = typeof vendorTypeEnum[number];

// Project Vendors - Tedarikçi/Firma Yönetimi
export const projectVendors = pgTable("project_vendors", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  vendorType: varchar("vendor_type", { length: 50 }).notNull(), // From vendorTypeEnum
  companyName: varchar("company_name", { length: 200 }).notNull(),
  contactName: varchar("contact_name", { length: 200 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  address: text("address"),
  taxNumber: varchar("tax_number", { length: 50 }),
  contractStatus: varchar("contract_status", { length: 30 }).default("pending"), // pending, signed, completed, cancelled
  contractAmount: integer("contract_amount"), // TL
  contractStartDate: date("contract_start_date"),
  contractEndDate: date("contract_end_date"),
  responsibilityArea: text("responsibility_area"), // Sorumluluk alanı açıklaması
  notes: text("notes"),
  rating: integer("rating"), // 1-5 performance rating
  isActive: boolean("is_active").default(true),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_vendors_project_idx").on(table.projectId),
  index("project_vendors_type_idx").on(table.vendorType),
  index("project_vendors_status_idx").on(table.contractStatus),
]);

export const insertProjectVendorSchema = createInsertSchema(projectVendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectVendor = z.infer<typeof insertProjectVendorSchema>;
export type ProjectVendor = typeof projectVendors.$inferSelect;

// Risk Severity Levels
export const riskSeverityEnum = ["low", "medium", "high", "critical"] as const;
export type RiskSeverityType = typeof riskSeverityEnum[number];

// Project Risks - Risk Yönetimi
export const projectRisks = pgTable("project_risks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phaseId: integer("phase_id").references(() => projectPhases.id, { onDelete: "set null" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  probability: integer("probability").default(3), // 1-5 (1=düşük, 5=yüksek)
  impact: integer("impact").default(3), // 1-5 (1=düşük, 5=yüksek)
  severity: varchar("severity", { length: 20 }).default("medium"), // Calculated: low, medium, high, critical
  status: varchar("status", { length: 30 }).default("identified"), // identified, mitigating, resolved, occurred
  mitigationPlan: text("mitigation_plan"), // Risk azaltma planı
  contingencyPlan: text("contingency_plan"), // Alternatif plan
  responsibleUserId: varchar("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
  identifiedAt: timestamp("identified_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("project_risks_project_idx").on(table.projectId),
  index("project_risks_phase_idx").on(table.phaseId),
  index("project_risks_severity_idx").on(table.severity),
  index("project_risks_status_idx").on(table.status),
]);

export const insertProjectRiskSchema = createInsertSchema(projectRisks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectRisk = z.infer<typeof insertProjectRiskSchema>;
export type ProjectRisk = typeof projectRisks.$inferSelect;

// ========================================
// PHASE MANAGEMENT SYSTEM - Faz Yönetim Sistemi
// ========================================

// RACI Enum
export const raciRoleEnum = ["responsible", "accountable", "consulted", "informed"] as const;
export type RaciRoleType = typeof raciRoleEnum[number];

// Phase Assignments - Faz Ekip Atamaları (RACI)
export const phaseAssignments = pgTable("phase_assignments", {
  id: serial("id").primaryKey(),
  phaseId: integer("phase_id").notNull().references(() => projectPhases.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Internal user
  externalUserId: integer("external_user_id").references(() => externalUsers.id, { onDelete: "cascade" }), // External user
  raciRole: varchar("raci_role", { length: 20 }).notNull(), // responsible, accountable, consulted, informed
  canEditPhase: boolean("can_edit_phase").default(false),
  canManageTasks: boolean("can_manage_tasks").default(false),
  assignedById: varchar("assigned_by_id").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => [
  index("phase_assignments_phase_idx").on(table.phaseId),
  index("phase_assignments_user_idx").on(table.userId),
  index("phase_assignments_external_idx").on(table.externalUserId),
]);

export const insertPhaseAssignmentSchema = createInsertSchema(phaseAssignments).omit({
  id: true,
  assignedAt: true,
});

export type InsertPhaseAssignment = z.infer<typeof insertPhaseAssignmentSchema>;
export type PhaseAssignment = typeof phaseAssignments.$inferSelect;

// Sub Task Status
export const subTaskStatusEnum = ["not_started", "in_progress", "blocked", "done"] as const;
export type SubTaskStatusType = typeof subTaskStatusEnum[number];

// Phase Sub Tasks - Faz Alt Görevleri
export const phaseSubTasks = pgTable("phase_sub_tasks", {
  id: serial("id").primaryKey(),
  phaseId: integer("phase_id").notNull().references(() => projectPhases.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"), // Self-reference for nested categories - will add .references in table config
  isCategory: boolean("is_category").default(false), // True if this is a category, false if task
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("not_started"),
  sortOrder: integer("sort_order").default(0),
  dueDate: date("due_date"),
  assigneeUserId: varchar("assignee_user_id").references(() => users.id, { onDelete: "set null" }),
  assigneeExternalId: integer("assignee_external_id").references(() => externalUsers.id, { onDelete: "set null" }),
  requiresBidding: boolean("requires_bidding").default(false), // Teklif gerektirir mi?
  completedAt: timestamp("completed_at"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("phase_sub_tasks_phase_idx").on(table.phaseId),
  index("phase_sub_tasks_parent_idx").on(table.parentId),
  index("phase_sub_tasks_status_idx").on(table.status),
]);

export const insertPhaseSubTaskSchema = createInsertSchema(phaseSubTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertPhaseSubTask = z.infer<typeof insertPhaseSubTaskSchema>;
export type PhaseSubTask = typeof phaseSubTasks.$inferSelect;

// Procurement Status
export const procurementStatusEnum = ["draft", "open", "under_review", "awarded", "closed", "cancelled"] as const;
export type ProcurementStatusType = typeof procurementStatusEnum[number];

// Procurement Items - Tedarik Kalemleri
export const procurementItems = pgTable("procurement_items", {
  id: serial("id").primaryKey(),
  subTaskId: integer("sub_task_id").notNull().references(() => phaseSubTasks.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  specifications: text("specifications"), // Teknik özellikler
  quantity: integer("quantity").default(1),
  unit: varchar("unit", { length: 50 }), // adet, kg, metre vb.
  estimatedBudget: integer("estimated_budget"), // TL
  status: varchar("status", { length: 30 }).default("draft"),
  biddingDeadline: timestamp("bidding_deadline"),
  selectedProposalId: integer("selected_proposal_id"), // Will reference proposals
  awardedAt: timestamp("awarded_at"),
  awardedById: varchar("awarded_by_id").references(() => users.id),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("procurement_items_subtask_idx").on(table.subTaskId),
  index("procurement_items_status_idx").on(table.status),
]);

export const insertProcurementItemSchema = createInsertSchema(procurementItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  awardedAt: true,
});

export type InsertProcurementItem = z.infer<typeof insertProcurementItemSchema>;
export type ProcurementItem = typeof procurementItems.$inferSelect;

// Proposal Status
export const proposalStatusEnum = ["submitted", "under_review", "selected", "rejected", "withdrawn"] as const;
export type ProposalStatusType = typeof proposalStatusEnum[number];

// Procurement Proposals - Teklifler
export const procurementProposals = pgTable("procurement_proposals", {
  id: serial("id").primaryKey(),
  procurementItemId: integer("procurement_item_id").notNull().references(() => procurementItems.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").references(() => externalUsers.id, { onDelete: "set null" }), // External vendor
  vendorName: varchar("vendor_name", { length: 200 }), // If no external user record
  vendorPhone: varchar("vendor_phone", { length: 30 }),
  vendorEmail: varchar("vendor_email", { length: 255 }),
  vendorCompany: varchar("vendor_company", { length: 200 }),
  proposedPrice: integer("proposed_price").notNull(), // TL
  currency: varchar("currency", { length: 10 }).default("TRY"),
  deliveryDays: integer("delivery_days"), // Teslimat süresi (gün)
  warrantyMonths: integer("warranty_months"), // Garanti süresi (ay)
  specifications: text("specifications"), // Teklif detayları
  notes: text("notes"),
  attachmentUrls: text("attachment_urls").array(), // Teklif dosyaları
  status: varchar("status", { length: 30 }).default("submitted"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedById: varchar("reviewed_by_id").references(() => users.id),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("procurement_proposals_item_idx").on(table.procurementItemId),
  index("procurement_proposals_vendor_idx").on(table.vendorId),
  index("procurement_proposals_status_idx").on(table.status),
]);

export const insertProcurementProposalSchema = createInsertSchema(procurementProposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  reviewedAt: true,
});

export type InsertProcurementProposal = z.infer<typeof insertProcurementProposalSchema>;
export type ProcurementProposal = typeof procurementProposals.$inferSelect;

// ========================================
// EXTERNAL USERS - Dış Kullanıcı Erişim Sistemi
// ========================================

// External Users - Proje bazlı dış kullanıcılar (mimar, müteahhit vb.)
export const externalUsers = pgTable("external_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  companyName: varchar("company_name", { length: 200 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  specialty: varchar("specialty", { length: 100 }), // Mobilyacı, Mimar, Elektrikçi, Avukat vb.
  accessToken: varchar("access_token", { length: 255 }), // Magic link token
  tokenExpiresAt: timestamp("token_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  isActive: boolean("is_active").default(true),
  invitedById: varchar("invited_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("external_users_email_idx").on(table.email),
  index("external_users_token_idx").on(table.accessToken),
]);

export const insertExternalUserSchema = createInsertSchema(externalUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExternalUser = z.infer<typeof insertExternalUserSchema>;
export type ExternalUser = typeof externalUsers.$inferSelect;

// External User Project Access - Dış kullanıcıların proje erişimleri
export const externalUserProjects = pgTable("external_user_projects", {
  id: serial("id").primaryKey(),
  externalUserId: integer("external_user_id").notNull().references(() => externalUsers.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 30 }).default("viewer"), // viewer, contributor
  canViewBudget: boolean("can_view_budget").default(false),
  canViewTasks: boolean("can_view_tasks").default(true),
  canComment: boolean("can_comment").default(true),
  canUploadFiles: boolean("can_upload_files").default(false),
  grantedById: varchar("granted_by_id").references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // null = no expiration
  revokedAt: timestamp("revoked_at"),
}, (table) => [
  index("external_user_projects_user_idx").on(table.externalUserId),
  index("external_user_projects_project_idx").on(table.projectId),
  unique("external_user_projects_unique").on(table.externalUserId, table.projectId),
]);

export const insertExternalUserProjectSchema = createInsertSchema(externalUserProjects).omit({
  id: true,
  grantedAt: true,
});

export type InsertExternalUserProject = z.infer<typeof insertExternalUserProjectSchema>;
export type ExternalUserProject = typeof externalUserProjects.$inferSelect;

// External User Audit Log - Dış kullanıcı aktivite logları
export const externalUserAuditLog = pgTable("external_user_audit_log", {
  id: serial("id").primaryKey(),
  externalUserId: integer("external_user_id").notNull().references(() => externalUsers.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(), // login, view_project, add_comment, upload_file, etc.
  details: text("details"), // JSON details
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("external_audit_user_idx").on(table.externalUserId),
  index("external_audit_project_idx").on(table.projectId),
  index("external_audit_created_idx").on(table.createdAt),
]);

export const insertExternalUserAuditLogSchema = createInsertSchema(externalUserAuditLog).omit({
  id: true,
  createdAt: true,
});

export type InsertExternalUserAuditLog = z.infer<typeof insertExternalUserAuditLogSchema>;
export type ExternalUserAuditLog = typeof externalUserAuditLog.$inferSelect;


// ============================================
// ADMIN PANEL - E-posta Ayarları
// ============================================
export const emailSettings = pgTable("email_settings", {
  id: serial("id").primaryKey(),
  smtpHost: varchar("smtp_host", { length: 255 }),
  smtpPort: integer("smtp_port").default(587),
  smtpUser: varchar("smtp_user", { length: 255 }),
  smtpPassword: varchar("smtp_password", { length: 255 }), // Encrypted
  smtpFromEmail: varchar("smtp_from_email", { length: 255 }),
  smtpFromName: varchar("smtp_from_name", { length: 255 }).default("DOSPRESSO"),
  smtpSecure: boolean("smtp_secure").default(false), // TLS
  isActive: boolean("is_active").default(true),
  updatedById: varchar("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailSettingsSchema = createInsertSchema(emailSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertEmailSettings = z.infer<typeof insertEmailSettingsSchema>;
export type EmailSettings = typeof emailSettings.$inferSelect;

// ============================================
// ADMIN PANEL - Servis Email Ayarları (Arıza/Bakım için ayrı SMTP)
// ============================================
export const serviceEmailSettings = pgTable("service_email_settings", {
  id: serial("id").primaryKey(),
  smtpHost: varchar("smtp_host", { length: 255 }),
  smtpPort: integer("smtp_port").default(587),
  smtpUser: varchar("smtp_user", { length: 255 }),
  smtpPassword: varchar("smtp_password", { length: 255 }),
  smtpFromEmail: varchar("smtp_from_email", { length: 255 }),
  smtpFromName: varchar("smtp_from_name", { length: 255 }).default("DOSPRESSO Teknik"),
  smtpSecure: boolean("smtp_secure").default(false),
  isActive: boolean("is_active").default(true),
  updatedById: varchar("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServiceEmailSettingsSchema = createInsertSchema(serviceEmailSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertServiceEmailSettings = z.infer<typeof insertServiceEmailSettingsSchema>;
export type ServiceEmailSettings = typeof serviceEmailSettings.$inferSelect;

// ============================================
// ADMIN PANEL - Banner Yönetimi
// ============================================
export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  targetRoles: text("target_roles").array(), // null = all roles
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  orderIndex: integer("order_index").default(0),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("banners_active_idx").on(table.isActive),
  index("banners_dates_idx").on(table.startDate, table.endDate),
]);

export const insertBannerSchema = createInsertSchema(banners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof banners.$inferSelect;

// ============================================
// ADMIN PANEL - AI Sağlayıcı Ayarları
// ============================================
export const AI_PROVIDERS = {
  OPENAI: "openai",
  GEMINI: "gemini",
  ANTHROPIC: "anthropic",
} as const;

export type AIProviderType = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  // Aktif sağlayıcı
  provider: varchar("provider", { length: 30 }).notNull().default("openai"), // openai, gemini, anthropic
  isActive: boolean("is_active").default(true),
  // OpenAI ayarları
  openaiApiKey: text("openai_api_key"), // Şifreli
  openaiChatModel: varchar("openai_chat_model", { length: 100 }).default("gpt-4o-mini"),
  openaiEmbeddingModel: varchar("openai_embedding_model", { length: 100 }).default("text-embedding-3-small"),
  openaiVisionModel: varchar("openai_vision_model", { length: 100 }).default("gpt-4o"),
  // Gemini ayarları
  geminiApiKey: text("gemini_api_key"), // Şifreli
  geminiChatModel: varchar("gemini_chat_model", { length: 100 }).default("gemini-1.5-pro"),
  geminiEmbeddingModel: varchar("gemini_embedding_model", { length: 100 }).default("text-embedding-004"),
  geminiVisionModel: varchar("gemini_vision_model", { length: 100 }).default("gemini-1.5-pro"),
  // Anthropic (Claude) ayarları
  anthropicApiKey: text("anthropic_api_key"), // Şifreli
  anthropicChatModel: varchar("anthropic_chat_model", { length: 100 }).default("claude-3-5-sonnet-20241022"),
  anthropicVisionModel: varchar("anthropic_vision_model", { length: 100 }).default("claude-3-5-sonnet-20241022"),
  // Genel ayarlar
  temperature: real("temperature").default(0.7),
  maxTokens: integer("max_tokens").default(2000),
  rateLimitPerMinute: integer("rate_limit_per_minute").default(60),
  // Metadata
  updatedById: varchar("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAISettingsSchema = createInsertSchema(aiSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAISettings = z.infer<typeof insertAISettingsSchema>;
export type AISettings = typeof aiSettings.$inferSelect;

// Phase Status Constants
export const PHASE_STATUS = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  BLOCKED: "blocked",
  COMPLETED: "completed",
} as const;

export type PhaseStatusType = typeof PHASE_STATUS[keyof typeof PHASE_STATUS];
export const NEW_SHOP_PHASE_TEMPLATE: Array<{
  phaseType: ProjectPhaseType;
  title: string;
  description: string;
  iconName: string;
  colorHex: string;
  orderIndex: number;
  targetDays: number;
}> = [
  {
    phaseType: "company_setup",
    title: "Şirket Kurulumu",
    description: "Şirket tescili, vergi mükellefiyet kaydı, banka hesabı açılışı, imza sirküleri",
    iconName: "Building2",
    colorHex: "#8b5cf6",
    orderIndex: 0,
    targetDays: 30,
  },
  {
    phaseType: "contract_legal",
    title: "Sözleşmeler & Hukuki",
    description: "Franchise sözleşmesi, kira sözleşmesi, sigorta poliçeleri, yasal izinler",
    iconName: "FileSignature",
    colorHex: "#6366f1",
    orderIndex: 1,
    targetDays: 45,
  },
  {
    phaseType: "construction",
    title: "İnşaat & Dekorasyon",
    description: "Mekan tadilat, elektrik/tesisat, dekorasyon, dış cephe, tabela",
    iconName: "Hammer",
    colorHex: "#f59e0b",
    orderIndex: 2,
    targetDays: 120,
  },
  {
    phaseType: "equipment",
    title: "Ekipman Yönetimi",
    description: "Kahve makineleri, mutfak ekipmanları, mobilya, POS sistemi, güvenlik",
    iconName: "Coffee",
    colorHex: "#10b981",
    orderIndex: 3,
    targetDays: 150,
  },
  {
    phaseType: "payments",
    title: "Ödemeler & Bütçe",
    description: "Franchise ücreti, depozito, tedarikçi ödemeleri, bütçe takibi",
    iconName: "Wallet",
    colorHex: "#ef4444",
    orderIndex: 4,
    targetDays: 165,
  },
  {
    phaseType: "staffing",
    title: "Personel & İşe Alım",
    description: "İşe alım, mülakat, sözleşme, SGK kaydı, oryantasyon",
    iconName: "Users",
    colorHex: "#3b82f6",
    orderIndex: 5,
    targetDays: 175,
  },
  {
    phaseType: "training_opening",
    title: "Eğitim & Açılış",
    description: "Barista eğitimi, operasyon eğitimi, hijyen sertifikası, açılış öncesi pratik",
    iconName: "GraduationCap",
    colorHex: "#ec4899",
    orderIndex: 6,
    targetDays: 180,
  },
];

// ============================================
// İŞE ALIM MODÜLÜ - Job Positions, Applications, Interviews
// ============================================

// Pozisyon durumları
export const JOB_POSITION_STATUS = {
  OPEN: "open",
  PAUSED: "paused",
  FILLED: "filled",
  CANCELLED: "cancelled",
} as const;

export type JobPositionStatusType = typeof JOB_POSITION_STATUS[keyof typeof JOB_POSITION_STATUS];

// Başvuru durumları
export const APPLICATION_STATUS = {
  NEW: "new",
  SCREENING: "screening",
  INTERVIEW_SCHEDULED: "interview_scheduled",
  INTERVIEW_COMPLETED: "interview_completed",
  OFFERED: "offered",
  HIRED: "hired",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
} as const;

export type ApplicationStatusType = typeof APPLICATION_STATUS[keyof typeof APPLICATION_STATUS];

// Mülakat durumları
export const INTERVIEW_STATUS = {
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
} as const;

export type InterviewStatusType = typeof INTERVIEW_STATUS[keyof typeof INTERVIEW_STATUS];

// Mülakat sonuçları
export const INTERVIEW_RESULT = {
  PASSED: "passed",
  FAILED: "failed",
  PENDING: "pending",
} as const;

export type InterviewResultType = typeof INTERVIEW_RESULT[keyof typeof INTERVIEW_RESULT];

// Açık Pozisyonlar Tablosu
export const jobPositions = pgTable("job_positions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(), // Pozisyon adı: Barista, Supervisor vb.
  targetRole: varchar("target_role", { length: 50 }).notNull(), // UserRoleType
  branchId: integer("branch_id").references(() => branches.id), // Null ise HQ pozisyonu
  department: varchar("department", { length: 100 }), // HQ için departman
  description: text("description"), // Pozisyon açıklaması
  requirements: text("requirements"), // Gereksinimler
  salaryMin: integer("salary_min"), // Minimum maaş
  salaryMax: integer("salary_max"), // Maximum maaş
  employmentType: varchar("employment_type", { length: 50 }).default("fulltime"), // fulltime, parttime, intern
  headcount: integer("headcount").default(1), // Kaç kişi alınacak
  hiredCount: integer("hired_count").default(0), // Kaç kişi alındı
  status: varchar("status", { length: 30 }).notNull().default("open"), // open, paused, filled, cancelled
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  deadline: date("deadline"), // Son başvuru tarihi
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  assignedToId: varchar("assigned_to_id").references(() => users.id), // İşe alımdan sorumlu kişi
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("job_positions_status_idx").on(table.status),
  index("job_positions_branch_idx").on(table.branchId),
]);

export const insertJobPositionSchema = createInsertSchema(jobPositions).omit({
  id: true,
  hiredCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJobPosition = z.infer<typeof insertJobPositionSchema>;
export type JobPosition = typeof jobPositions.$inferSelect;

// Başvurular Tablosu
export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  positionId: integer("position_id").notNull().references(() => jobPositions.id),
  // Aday bilgileri
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }).notNull(),
  tckn: varchar("tckn", { length: 11 }), // TC Kimlik No (opsiyonel başvuru aşamasında)
  birthDate: date("birth_date"),
  address: text("address"),
  // Başvuru bilgileri
  resumeUrl: text("resume_url"), // CV dosyası
  coverLetter: text("cover_letter"), // Ön yazı
  source: varchar("source", { length: 100 }), // Nereden geldi: kariyer.net, referans, yürüyen vb.
  referredBy: varchar("referred_by_id").references(() => users.id), // Referans veren personel
  experience: text("experience"), // Deneyim özeti
  education: varchar("education", { length: 200 }), // Eğitim durumu
  expectedSalary: integer("expected_salary"), // Beklenen maaş
  availableFrom: date("available_from"), // Ne zaman başlayabilir
  // Durum ve değerlendirme
  status: varchar("status", { length: 30 }).notNull().default("new"), // ApplicationStatusType
  rating: integer("rating"), // 1-5 arası puanlama
  notes: text("notes"), // Değerlendirme notları
  rejectionReason: text("rejection_reason"), // Red nedeni
  // Tracking
  createdById: varchar("created_by_id").references(() => users.id), // Kim ekledi (null = online başvuru)
  assignedToId: varchar("assigned_to_id").references(() => users.id), // Kim takip ediyor
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("job_applications_position_idx").on(table.positionId),
  index("job_applications_status_idx").on(table.status),
]);

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;

// Mülakatlar Tablosu
export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => jobApplications.id),
  // Mülakat bilgileri
  interviewType: varchar("interview_type", { length: 50 }).notNull(), // phone, video, onsite, trial_day
  scheduledDate: timestamp("scheduled_date").notNull(),
  duration: integer("duration").default(30), // Dakika cinsinden
  location: text("location"), // Şube adresi veya online link
  // Mülakatçı bilgileri
  interviewerId: varchar("interviewer_id").notNull().references(() => users.id),
  additionalInterviewers: text("additional_interviewers"), // JSON: [userId1, userId2]
  // Sonuç
  status: varchar("status", { length: 30 }).notNull().default("scheduled"), // InterviewStatusType
  result: varchar("result", { length: 30 }), // InterviewResultType
  feedback: text("feedback"), // Mülakat geri bildirimi
  rating: integer("rating"), // 1-5 arası değerlendirme
  strengths: text("strengths"), // Güçlü yönler
  weaknesses: text("weaknesses"), // Gelişim alanları
  recommendation: text("recommendation"), // İşe al/alma önerisi
  // Metadata
  notes: text("notes"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("interviews_application_idx").on(table.applicationId),
  index("interviews_date_idx").on(table.scheduledDate),
  index("interviews_interviewer_idx").on(table.interviewerId),
]);

export const insertInterviewSchema = createInsertSchema(interviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInterview = z.infer<typeof insertInterviewSchema>;
export type Interview = typeof interviews.$inferSelect;

// Standart Mülakat Soruları (HQ yönetimli)
export const interviewQuestions = pgTable("interview_questions", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // behavioral, technical, situational, star, general
  isActive: boolean("is_active").default(true),
  orderIndex: integer("order_index").default(0),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInterviewQuestionSchema = createInsertSchema(interviewQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInterviewQuestion = z.infer<typeof insertInterviewQuestionSchema>;
export type InterviewQuestion = typeof interviewQuestions.$inferSelect;

// İşten Çıkarma ve Ayrılış Kayıtları
export const employeeTerminations = pgTable("employee_terminations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  terminationType: varchar("termination_type", { length: 50 }).notNull(), // resignation, termination, retirement, mutual_agreement, contract_end
  terminationDate: date("termination_date").notNull(),
  reason: text("reason"), // Ayrılış sebebi
  lastWorkDay: date("last_work_day"), // Son çalışma günü
  noticeGiven: integer("notice_given"), // Gün cinsinden uyarı süresi
  finalSalary: integer("final_salary"), // Son maaş tutarı
  severancePayment: integer("severance_payment"), // Kıdem tazminatı
  otherPayments: integer("other_payments"), // Diğer ödemeler
  totalPayment: integer("total_payment"), // Toplam ödeme
  returnedItems: text("returned_items"), // Teslim edilen işletme malları (JSON array)
  exitInterview: text("exit_interview"), // Çıkış görüşmesi notları
  performanceRating: integer("performance_rating"), // Son performans puanı (1-5)
  recommendation: text("recommendation"), // Yeniden işe alım önerisi
  processedById: varchar("processed_by_id").notNull().references(() => users.id), // İK tarafından işlem gören
  approvedById: varchar("approved_by_id").references(() => users.id), // Onay yapan (genellikle HQ)
  documents: text("documents").array(), // Sözleşme, tazminat formu vb. URL'ler
  notes: text("notes"), // Genel notlar
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_terminations_user_idx").on(table.userId),
  index("employee_terminations_date_idx").on(table.terminationDate),
  index("employee_terminations_type_idx").on(table.terminationType),
]);

export const insertEmployeeTerminationSchema = createInsertSchema(employeeTerminations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeTermination = z.infer<typeof insertEmployeeTerminationSchema>;
export type EmployeeTermination = typeof employeeTerminations.$inferSelect;

// Çalışan İzin Bakiyeleri
export const employeeLeaves = pgTable("employee_leaves", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  year: integer("year").notNull(), // İzin yılı
  leaveType: varchar("leave_type", { length: 50 }).notNull(), // annual, sick, unpaid, maternity, paternity, marriage, bereavement
  totalDays: integer("total_days").notNull().default(14), // Toplam izin hakkı
  usedDays: integer("used_days").notNull().default(0), // Kullanılan gün
  remainingDays: integer("remaining_days").notNull().default(14), // Kalan izin
  carriedOver: integer("carried_over").default(0), // Geçen yıldan aktarılan
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_leaves_user_idx").on(table.userId),
  index("employee_leaves_year_idx").on(table.year),
  index("employee_leaves_type_idx").on(table.leaveType),
]);

export const insertEmployeeLeaveSchema = createInsertSchema(employeeLeaves).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeLeave = z.infer<typeof insertEmployeeLeaveSchema>;
export type EmployeeLeave = typeof employeeLeaves.$inferSelect;

// Resmi Tatiller
export const publicHolidays = pgTable("public_holidays", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(), // Tatil adı
  date: date("date").notNull(), // Tatil tarihi
  year: integer("year").notNull(), // Yıl
  isHalfDay: boolean("is_half_day").default(false), // Yarım gün mü
  isActive: boolean("is_active").default(true), // Aktif mi
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("public_holidays_date_idx").on(table.date),
  index("public_holidays_year_idx").on(table.year),
]);

export const insertPublicHolidaySchema = createInsertSchema(publicHolidays).omit({
  id: true,
  createdAt: true,
});

export type InsertPublicHoliday = z.infer<typeof insertPublicHolidaySchema>;
export type PublicHoliday = typeof publicHolidays.$inferSelect;

// İzin Kayıtları (kullanılan izinler)
export const leaveRecords = pgTable("leave_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  leaveType: varchar("leave_type", { length: 50 }).notNull(), // annual, sick, unpaid, etc.
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: integer("total_days").notNull(), // Toplam gün sayısı
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, approved, rejected
  reason: text("reason"), // İzin nedeni
  approvedById: varchar("approved_by_id").references(() => users.id), // Onaylayan
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("leave_records_user_idx").on(table.userId),
  index("leave_records_date_idx").on(table.startDate),
  index("leave_records_status_idx").on(table.status),
]);
