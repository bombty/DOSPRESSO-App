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
  YATIRIMCI: "yatirimci", // Branch investor (read-only)
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
  UserRole.YATIRIMCI,
]);

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
  | 'branches'
  | 'users'
  | 'employees'
  | 'training'
  | 'schedules'
  | 'messages'
  | 'announcements';

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
    branches: ['view', 'create', 'edit', 'delete'],
    users: ['view', 'create', 'edit', 'delete'],
    employees: ['view', 'create', 'edit', 'delete', 'approve'],
    training: ['view', 'create', 'edit', 'delete', 'approve'],
    schedules: ['view', 'create', 'edit', 'delete'],
    messages: ['view', 'create', 'delete'],
    announcements: ['view', 'create', 'edit', 'delete'],
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
    branches: ['view'],
    users: [],
    employees: ['view'],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
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
    branches: ['view'],
    users: [],
    employees: ['view'],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
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
    branches: ['view'],
    users: [],
    employees: ['view', 'create', 'edit', 'delete', 'approve'],
    training: ['view', 'create', 'edit', 'delete', 'approve'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view', 'create', 'edit', 'delete'],
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
    branches: ['view'],
    users: [],
    employees: ['view'],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
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
    branches: ['view'],
    users: [],
    employees: ['view'],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view', 'create', 'edit'],
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
    branches: ['view'],
    users: [],
    employees: ['view'],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
  },
  yatirimci_hq: {
    dashboard: ['view'],
    tasks: [],
    checklists: [],
    equipment: [],
    equipment_faults: [],
    knowledge_base: ['view'],
    ai_assistant: [],
    performance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view'],
    training: [],
    schedules: [],
    messages: ['view', 'create'],
    announcements: ['view'],
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
    branches: [],
    users: [],
    employees: ['view', 'create', 'edit', 'approve'],
    training: ['view', 'approve'],
    schedules: ['view', 'create', 'edit'],
    messages: ['view', 'create'],
    announcements: ['view'],
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
    branches: [],
    users: [],
    employees: [],
    training: ['view'],
    schedules: ['view', 'edit'],
    messages: ['view', 'create'],
    announcements: ['view'],
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
    branches: [],
    users: [],
    employees: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
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
    branches: [],
    users: [],
    employees: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
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
    branches: [],
    users: [],
    employees: [],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
  },
  yatirimci: {
    dashboard: ['view'],
    tasks: [],
    checklists: [],
    equipment: [],
    equipment_faults: [],
    knowledge_base: ['view'],
    ai_assistant: [],
    performance: ['view'],
    branches: [],
    users: [],
    employees: [],
    training: [],
    schedules: [],
    messages: ['view'],
    announcements: ['view'],
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
  username: varchar("username", { length: 100 }).notNull().unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
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
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChecklistTaskSchema = createInsertSchema(checklistTasks).omit({
  id: true,
  createdAt: true,
});

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

// Tasks table (actual task instances)
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").references(() => checklists.id, { onDelete: "set null" }),
  checklistTaskId: integer("checklist_task_id").references(() => checklistTasks.id, { onDelete: "set null" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  assignedById: varchar("assigned_by_id").references(() => users.id, { onDelete: "set null" }), // Who assigned the task
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("beklemede"), // beklemede, tamamlandi, gecikmiş
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
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

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
  serialNumber: varchar("serial_number", { length: 255 }),
  purchaseDate: date("purchase_date"),
  warrantyEndDate: date("warranty_end_date"),
  // Routing: Who maintains / handles faults
  maintenanceResponsible: varchar("maintenance_responsible", { length: 20 }).notNull().default("branch"), // 'branch' | 'hq'
  faultProtocol: varchar("fault_protocol", { length: 20 }).notNull().default("branch"), // 'branch' | 'hq_teknik'
  // Maintenance tracking
  lastMaintenanceDate: date("last_maintenance_date"),
  nextMaintenanceDate: date("next_maintenance_date"),
  maintenanceIntervalDays: integer("maintenance_interval_days").default(30),
  // QR code for quick access
  qrCodeUrl: text("qr_code_url"),
  notes: text("notes"),
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
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  branchStageIdx: index("equipment_faults_branch_stage_idx").on(table.branchId, table.currentStage),
  equipmentIdx: index("equipment_faults_equipment_idx").on(table.equipmentId),
}));

export const insertEquipmentFaultSchema = createInsertSchema(equipmentFaults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEquipmentFault = z.infer<typeof insertEquipmentFaultSchema>;
export type EquipmentFault = typeof equipmentFaults.$inferSelect;

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
  category: varchar("category", { length: 100 }), // "barista", "supervisor", "hygiene", etc.
  level: varchar("level", { length: 50 }).default("beginner"), // beginner, intermediate, advanced
  estimatedDuration: integer("estimated_duration").default(30), // minutes
  isPublished: boolean("is_published").default(false),
  requiredForRole: varchar("required_for_role", { length: 100 }).array(), // ["barista", "supervisor"]
  prerequisiteModuleIds: integer("prerequisite_module_ids").array(), // Must complete these first
  createdBy: varchar("created_by").references(() => users.id), // VARCHAR - users.id is UUID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  quizId: integer("quiz_id").notNull().references(() => moduleQuizzes.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  questionType: varchar("question_type", { length: 50 }).default("multiple_choice"), // multiple_choice, true_false, short_answer
  options: text("options").array(), // JSON array for multiple choice
  correctAnswer: text("correct_answer").notNull(),
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

export const insertTrainingModuleSchema = createInsertSchema(trainingModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertModuleVideoSchema = createInsertSchema(moduleVideos).omit({
  id: true,
  createdAt: true,
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
export type InsertModuleVideo = z.infer<typeof insertModuleVideoSchema>;
export type ModuleVideo = typeof moduleVideos.$inferSelect;
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

// Messages table - Inter-user and system messaging
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id").references(() => users.id, { onDelete: "cascade" }), // null for role-based broadcast
  recipientRole: varchar("recipient_role", { length: 50 }), // null for specific user messages
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // task_assignment, hq_message, branch_message, notification
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Index for fast inbox queries
  recipientIdx: index("messages_recipient_idx").on(table.recipientId),
  recipientRoleIdx: index("messages_recipient_role_idx").on(table.recipientRole),
  senderIdx: index("messages_sender_idx").on(table.senderId),
}));

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

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

// Equipment Maintenance Logs table
export const equipmentMaintenanceLogs = pgTable("equipment_maintenance_logs", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  performedBy: varchar("performed_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  maintenanceType: varchar("maintenance_type", { length: 50 }).notNull(), // routine, repair, calibration, cleaning
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

// HQ Support Ticket Status
export const HQ_SUPPORT_STATUS = {
  AKTIF: 'aktif',
  KAPATILDI: 'kapatildi',
} as const;

export type HQSupportStatusType = typeof HQ_SUPPORT_STATUS[keyof typeof HQ_SUPPORT_STATUS];

// HQ Support Category (which HQ department)
export const HQ_SUPPORT_CATEGORY = {
  MUHASEBE: 'muhasebe',
  SATINALMA: 'satinalma',
  COACH: 'coach',
  TEKNIK: 'teknik',
  DESTEK: 'destek',
  FABRIKA: 'fabrika',
  GENEL: 'genel',
} as const;

export type HQSupportCategoryType = typeof HQ_SUPPORT_CATEGORY[keyof typeof HQ_SUPPORT_CATEGORY];

// HQ Support Tickets table
export const hqSupportTickets = pgTable("hq_support_tickets", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // muhasebe, satinalma, coach, teknik, destek, fabrika, genel
  status: varchar("status", { length: 20 }).notNull().default(HQ_SUPPORT_STATUS.AKTIF),
  closedAt: timestamp("closed_at"),
  closedBy: varchar("closed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHQSupportTicketSchema = createInsertSchema(hqSupportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHQSupportTicket = z.infer<typeof insertHQSupportTicketSchema>;
export type HQSupportTicket = typeof hqSupportTickets.$inferSelect;

// HQ Support Messages table
export const hqSupportMessages = pgTable("hq_support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => hqSupportTickets.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
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
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueShiftChecklist: unique("unique_shift_checklist").on(table.shiftId, table.checklistId),
  shiftIdx: index("shift_checklists_shift_idx").on(table.shiftId),
  checklistIdx: index("shift_checklists_checklist_idx").on(table.checklistId),
}));

export const insertShiftChecklistSchema = createInsertSchema(shiftChecklists).omit({
  id: true,
  createdAt: true,
});

export type InsertShiftChecklist = z.infer<typeof insertShiftChecklistSchema>;
export type ShiftChecklist = typeof shiftChecklists.$inferSelect;

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
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  breakStartTime: timestamp("break_start_time"),
  breakEndTime: timestamp("break_end_time"),
  totalBreakMinutes: integer("total_break_minutes").default(0),
  totalWorkedMinutes: integer("total_worked_minutes").default(0),
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled, checked_in, on_break, checked_out, absent, late
  notes: text("notes"),
  // Dress Code AI Analysis fields
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
