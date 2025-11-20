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
  | 'attendance'
  | 'branches'
  | 'users'
  | 'employees'
  | 'training'
  | 'schedules'
  | 'messages'
  | 'announcements'
  | 'complaints';

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
    training: ['view', 'create', 'edit', 'delete', 'approve'],
    schedules: ['view', 'create', 'edit', 'delete'],
    messages: ['view', 'create', 'delete'],
    announcements: ['view', 'create', 'edit', 'delete'],
    complaints: ['view', 'create', 'edit', 'delete', 'approve'],
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
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view'],
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
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
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
    training: ['view', 'create', 'edit', 'delete', 'approve'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view', 'create', 'edit', 'delete'],
    complaints: ['view', 'edit'],
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
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
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
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view', 'create', 'edit'],
    complaints: [],
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
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
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
    attendance: ['view'],
    branches: ['view'],
    users: [],
    employees: ['view'],
    training: [],
    schedules: [],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
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
    training: ['view', 'approve'],
    schedules: ['view', 'create', 'edit'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view', 'create', 'edit'],
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
    training: ['view'],
    schedules: ['view', 'edit'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
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
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
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
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
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
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
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
    attendance: ['view'],
    branches: [],
    users: [],
    employees: [],
    training: [],
    schedules: [],
    messages: ['view'],
    announcements: ['view'],
    complaints: [],
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
});

export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
  isActive: true,
});

export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branches.$inferSelect;

// Users table (Username/Password Auth)
export const users: ReturnType<typeof pgTable<"users", any>> = pgTable("users", {
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
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
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
});

export const updateTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(taskStatusEnum).optional(),
  priority: z.enum(taskPriorityEnum).optional(),
}).partial();

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
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
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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

export const insertQualityAuditSchema = createInsertSchema(qualityAudits).omit({
  id: true,
  createdAt: true,
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
