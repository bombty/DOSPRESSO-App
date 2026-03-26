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
  check,
  pgEnum
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

import { PermissionAction, PermissionModule, UserRole, UserRoleType } from './schema-01';

// Permission Matrix: Define what each role can do
export const PERMISSIONS: Record<UserRoleType, Record<PermissionModule, PermissionAction[]>> = {
  // ADMIN - Full access to everything
  admin: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit', 'delete', 'approve'],
    checklists: ['view', 'create', 'edit', 'delete'],
    equipment: ['view', 'create', 'edit', 'delete'],
    equipment_faults: ['view', 'create', 'edit', 'delete', 'approve'],
    faults: ['view', 'create', 'edit', 'delete', 'approve'],
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
    bulk_data: ['view', 'edit'],
    accounting: ['view', 'create', 'edit', 'delete'],
    customer_satisfaction: ['view', 'create', 'edit', 'delete', 'approve'],
    // New modules
    lost_found: ['view', 'create', 'edit', 'delete'],
    lost_found_hq: ['view', 'create', 'edit', 'delete'],
    projects: ['view', 'create', 'edit', 'delete', 'approve'],
    reports: ['view'],
    support: ['view', 'create', 'edit', 'delete'],
    notifications: ['view'],
    quality_audit: ['view', 'create', 'edit', 'delete', 'approve'],
    shifts: ['view', 'create', 'edit', 'delete'],
    settings: ['view', 'edit'],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view', 'create', 'edit', 'delete', 'approve'],
    factory_analytics: ['view'],
    factory_stations: ['view', 'create', 'edit', 'delete'],
    factory_compliance: ['view', 'edit', 'approve'],
    factory_production: ['view', 'create', 'edit', 'delete'],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view', 'create', 'edit', 'delete'],
    factory_food_safety: ['view', 'create', 'edit', 'approve'],
    branch_shift_tracking: ['view', 'edit'],
    // Satinalma modules
    satinalma: ['view', 'create', 'edit', 'delete'],
    inventory: ['view', 'create', 'edit', 'delete'],
    suppliers: ['view', 'create', 'edit', 'delete'],
    purchase_orders: ['view', 'create', 'edit', 'delete', 'approve'],
    goods_receipt: ['view', 'create', 'edit', 'delete'],
    cost_management: ['view', 'create', 'edit', 'delete'],
    branch_inspection: ['view', 'create', 'edit', 'delete', 'approve'],
    product_complaints: ['view', 'create', 'edit', 'delete', 'approve'],
    food_safety: ['view', 'create', 'edit', 'delete', 'approve'],
    // Academy modules - Admin full access
    academy: ['view', 'create', 'edit', 'delete'],
    academy_admin: ['view', 'create', 'edit', 'delete'],
    badges: ['view', 'create', 'edit', 'delete'],
    certificates: ['view', 'create', 'edit', 'delete'],
    leaderboard: ['view'],
    achievements: ['view', 'create', 'edit'],
    team_competitions: ['view', 'create', 'edit'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view', 'create', 'edit'],
    adaptive_engine: ['view', 'edit'],
    social_groups: ['view', 'create', 'edit'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: ['view', 'create', 'edit', 'delete', 'approve'],
      crm_feedback: ['view', 'create', 'edit', 'delete', 'approve'],
      crm_complaints: ['view', 'create', 'edit', 'delete', 'approve'],
      crm_campaigns: ['view', 'create', 'edit', 'delete', 'approve'],
      crm_analytics: ['view'],
      crm_settings: ['view', 'edit'],
    ajanda: ['view', 'create', 'edit', 'delete'],
  },
  // HQ ROLES
  muhasebe: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
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
    bulk_data: ['view', 'edit'],
    accounting: ['view', 'create', 'edit', 'delete'],
    customer_satisfaction: ['view'],
    // New modules
    lost_found: ['view'],
    lost_found_hq: ['view'],
    projects: ['view'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: ['view'],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    // Academy modules - HQ full access
    academy: ['view', 'create', 'edit', 'delete'],
    academy_admin: ['view', 'create', 'edit', 'delete'],
    badges: ['view', 'create', 'edit', 'delete'],
    certificates: ['view', 'create', 'edit', 'delete'],
    leaderboard: ['view'],
    achievements: ['view', 'create', 'edit'],
    team_competitions: ['view', 'create', 'edit'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view', 'create', 'edit'],
    adaptive_engine: ['view', 'edit'],
    social_groups: ['view', 'create', 'edit'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    // Satinalma modules - Read access for muhasebe
    satinalma: ['view'],
    inventory: ['view'],
    suppliers: ['view'],
    purchase_orders: ['view'],
    goods_receipt: ['view'],
    cost_management: ['view'],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  satinalma: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit'],
    checklists: ['view'],
    equipment: ['view', 'create', 'edit'],
    equipment_faults: ['view', 'edit', 'approve'],
    faults: ['view', 'edit', 'approve'],
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
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    // New modules
    lost_found: [],
    lost_found_hq: [],
    projects: ['view'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: [],

    // Academy modules - HQ access
    academy: ['view', 'create', 'edit'],
    academy_admin: ['view', 'edit'],
    badges: ['view', 'create', 'edit'],
    certificates: ['view', 'create', 'edit'],
    leaderboard: ['view'],
    achievements: ['view', 'create', 'edit'],
    team_competitions: ['view', 'create', 'edit'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view', 'create', 'edit'],
    adaptive_engine: ['view', 'edit'],
    social_groups: ['view', 'create', 'edit'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    // Satinalma modules - Full access for satinalma role
    satinalma: ['view', 'create', 'edit', 'delete'],
    inventory: ['view', 'create', 'edit', 'delete'],
    suppliers: ['view', 'create', 'edit', 'delete'],
    purchase_orders: ['view', 'create', 'edit', 'delete', 'approve'],
    goods_receipt: ['view', 'create', 'edit', 'delete'],
    cost_management: ['view', 'create', 'edit', 'delete'],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
    ajanda: ['view', 'create', 'edit', 'delete'],
  },
  coach: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit', 'approve'],
    checklists: ['view', 'create', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
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
    bulk_data: ['view', 'edit'],
    accounting: [],
    customer_satisfaction: ['view', 'create', 'edit', 'approve'],
    branch_inspection: ['view', 'create', 'edit', 'approve'],
    product_complaints: ['view'],
    // New modules
    lost_found: ['view', 'create', 'edit'],
    lost_found_hq: ['view'],
    projects: ['view', 'create', 'edit', 'approve'],
    reports: ['view'],
    support: ['view', 'create', 'edit'],
    notifications: ['view'],
    quality_audit: ['view', 'create', 'edit', 'approve'],
    shifts: ['view', 'create', 'edit'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: ['view'],
    factory_quality: ['view'],
    factory_analytics: ['view'],
    factory_stations: [],
    factory_compliance: ['view'],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view'],
    factory_food_safety: ['view'],
    branch_shift_tracking: ['view', 'edit'],

    // Academy modules - HQ access
    academy: ['view', 'create', 'edit'],
    academy_admin: ['view', 'edit'],
    badges: ['view', 'create', 'edit'],
    certificates: ['view', 'create', 'edit'],
    leaderboard: ['view'],
    achievements: ['view', 'create', 'edit'],
    team_competitions: ['view', 'create', 'edit'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view', 'create', 'edit'],
    adaptive_engine: ['view', 'edit'],
    social_groups: ['view', 'create', 'edit'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: ['view'],
      crm_feedback: ['view'],
      crm_complaints: ['view'],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    // Satinalma modules - No access
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    food_safety: [],
    ajanda: ['view', 'create', 'edit', 'delete'],
  },
  teknik: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: ['view', 'edit'],
    equipment_faults: ['view', 'edit', 'approve'],
    faults: ['view', 'edit', 'approve'],
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
    bulk_data: ['view', 'edit'],
    accounting: [],
    customer_satisfaction: [],
    // New modules
    lost_found: ['view'],
    lost_found_hq: ['view'],
    projects: ['view'],
    reports: ['view'],
    support: ['view', 'create', 'edit'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: [],
    // Satinalma modules - No access for teknik
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
    // Academy modules - HQ access
    academy: ['view'],
    academy_admin: ['view'],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
  },
  destek: {
    dashboard: ['view'],
    tasks: ['view', 'create'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view', 'create', 'edit'],
    faults: ['view', 'create', 'edit'],
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
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view', 'create', 'edit'],
    // New modules
    lost_found: ['view', 'create', 'edit'],
    lost_found_hq: ['view'],
    projects: ['view'],
    reports: ['view'],
    support: ['view', 'create', 'edit', 'approve'],
    notifications: ['view'],
    quality_audit: ['view'],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    // Satinalma modules - No access for destek
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
    // Academy modules - destek access
    academy: ['view'],
    academy_admin: ['view'],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
  },
  fabrika: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
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
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    // New modules - Factory roles have full factory access
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: ['view', 'create'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: ['view', 'create', 'edit'],
    factory_dashboard: ['view'],
    factory_quality: ['view', 'create', 'edit'],
    factory_analytics: ['view'],
    factory_stations: ['view'],
    factory_compliance: ['view'],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view'],
    factory_food_safety: ['view'],
    branch_shift_tracking: [],
    // Satinalma modules - No access for fabrika
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],

    // Academy modules - HQ access
    academy: ['view', 'create', 'edit'],
    academy_admin: ['view', 'edit'],
    badges: ['view', 'create', 'edit'],
    certificates: ['view', 'create', 'edit'],
    leaderboard: ['view'],
    achievements: ['view', 'create', 'edit'],
    team_competitions: ['view', 'create', 'edit'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view', 'create', 'edit'],
    adaptive_engine: ['view', 'edit'],
    social_groups: ['view', 'create', 'edit'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
  },
  yatirimci_hq: {
    dashboard: ['view'],
    tasks: [],
    checklists: [],
    equipment: [],
    equipment_faults: [],
    faults: [],
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
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view'],
    // New modules
    lost_found: [],
    lost_found_hq: ['view'],
    projects: ['view'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: [],
    shifts: [],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: ['view'],
    factory_quality: [],
    factory_analytics: ['view'],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: [],
    // Satinalma modules - No access
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
    // Academy modules - HQ read access
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
  },
  // BRANCH ROLES
  supervisor: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit', 'approve'],
    checklists: ['view', 'create', 'edit', 'approve'],
    equipment: ['view'],
    equipment_faults: ['view', 'create', 'edit'],
    faults: ['view', 'create', 'edit'],
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
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view', 'create', 'edit'],
    branch_inspection: ['view'],
    product_complaints: ['view', 'create'],
    food_safety: [],
    // New modules
    lost_found: ['view', 'create', 'edit'],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: ['view', 'create'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view', 'create', 'edit'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view', 'edit'],
    // Satinalma modules - No access
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],

    // Academy modules - Branch view
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: ['view'],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    ajanda: ['view', 'create', 'edit', 'delete'],
  },
  supervisor_buddy: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view', 'create', 'edit'],
    faults: ['view', 'create', 'edit'],
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
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view'],
    // New modules
    lost_found: ['view', 'create'],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: ['view', 'create'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    // Satinalma modules - No access
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
    // Academy modules
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
  },
  barista: {
    dashboard: ['view'],
    tasks: ['view', 'edit'],
    checklists: ['view', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view', 'create'],
    faults: ['view', 'create'],
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
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    // New modules
    lost_found: ['view', 'create'],
    lost_found_hq: [],
    projects: [],
    reports: [],
    support: ['view', 'create'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    // Academy modules - Şube personeli eğitime erişebilir
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    // Satinalma modules - No access
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  bar_buddy: {
    dashboard: ['view'],
    tasks: ['view', 'edit'],
    checklists: ['view', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view', 'create'],
    faults: ['view', 'create'],
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
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    // New modules
    lost_found: ['view', 'create'],
    lost_found_hq: [],
    projects: [],
    reports: [],
    support: ['view', 'create'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    // Academy modules - Şube personeli eğitime erişebilir
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    // Satinalma modules - No access
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  stajyer: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: [],
    equipment_faults: [],
    faults: [],
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
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    // New modules
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: [],
    support: ['view'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    // Academy modules - Stajyer eğitime erişebilir
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    // Satinalma modules - No access
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  mudur: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit', 'delete', 'approve'],
    checklists: ['view', 'create', 'edit', 'approve'],
    equipment: ['view', 'edit'],
    equipment_faults: ['view', 'create', 'edit'],
    faults: ['view', 'create', 'edit', 'delete'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view', 'edit'],
    attendance: ['view', 'edit'],
    branches: [],
    users: [],
    employees: ['view', 'create', 'edit', 'delete', 'approve'],
    hr: ['view', 'create', 'edit', 'delete'],
    training: ['view', 'approve'],
    schedules: ['view', 'create', 'edit', 'delete'],
    messages: ['view', 'create'],
    announcements: ['view', 'create'],
    complaints: ['view', 'create', 'edit'],
    leave_requests: ['view', 'create', 'edit', 'approve'],
    overtime_requests: ['view', 'create', 'edit', 'approve'],
    admin_settings: [],
    bulk_data: [],
    accounting: ['view'],
    customer_satisfaction: ['view', 'create', 'edit'],
    branch_inspection: ['view'],
    product_complaints: ['view', 'create', 'edit'],
    food_safety: [],
    lost_found: ['view', 'create', 'edit', 'delete'],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: ['view', 'create'],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view', 'create', 'edit', 'delete'],
    settings: ['view', 'edit'],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view', 'edit'],
    satinalma: [],
    inventory: ['view'],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: ['view'],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: ['view'],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    ajanda: ['view', 'create', 'edit', 'delete'],
  },
  yatirimci_branch: {
    dashboard: ['view'],
    tasks: [],
    checklists: [],
    equipment: [],
    equipment_faults: [],
    faults: [],
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
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view'],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: [],
    shifts: [],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  // CEO - Full read access
  ceo: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view'],
    branches: ['view'],
    users: ['view'],
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
    bulk_data: ['view'],
    accounting: ['view'],
    customer_satisfaction: ['view'],
    lost_found: ['view'],
    lost_found_hq: ['view'],
    projects: ['view'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: ['view'],
    shifts: ['view'],
    settings: [],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view'],
    factory_analytics: ['view'],
    factory_stations: ['view'],
    factory_compliance: ['view'],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view'],
    factory_food_safety: ['view'],
    branch_shift_tracking: ['view'],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: ['view'],
      crm_feedback: ['view'],
      crm_complaints: ['view'],
      crm_campaigns: ['view'],
      crm_analytics: ['view'],
      crm_settings: ['view'],
    satinalma: ['view'],
    inventory: ['view'],
    suppliers: ['view'],
    purchase_orders: ['view'],
    goods_receipt: ['view'],
    cost_management: ['view'],
    branch_inspection: ['view'],
    product_complaints: ['view'],
    food_safety: ['view'],
    ajanda: ['view', 'create', 'edit', 'delete'],
  },
  // CGO - Chief Growth Officer
  cgo: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit', 'approve'],
    checklists: ['view', 'create', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view', 'edit'],
    attendance: ['view'],
    branches: ['view', 'edit'],
    users: ['view'],
    employees: ['view'],
    hr: ['view'],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view', 'create', 'edit'],
    complaints: ['view'],
    leave_requests: ['view'],
    overtime_requests: ['view'],
    admin_settings: [],
    bulk_data: ['view'],
    accounting: ['view'],
    customer_satisfaction: ['view'],
    lost_found: ['view'],
    lost_found_hq: ['view'],
    projects: ['view', 'create', 'edit'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: ['view'],
    shifts: ['view'],
    settings: [],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view'],
    factory_analytics: ['view'],
    factory_stations: ['view'],
    factory_compliance: ['view'],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view'],
    factory_food_safety: ['view'],
    branch_shift_tracking: ['view'],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: ['view', 'create', 'edit', 'approve'],
      crm_feedback: ['view', 'create', 'edit', 'approve'],
      crm_complaints: ['view', 'create', 'edit', 'approve'],
      crm_campaigns: ['view', 'create', 'edit', 'approve'],
      crm_analytics: ['view'],
      crm_settings: ['view', 'edit'],
    satinalma: ['view'],
    inventory: ['view'],
    suppliers: ['view'],
    purchase_orders: ['view'],
    goods_receipt: ['view'],
    cost_management: ['view'],
    branch_inspection: ['view'],
    product_complaints: ['view'],
    food_safety: [],
    ajanda: ['view', 'create', 'edit', 'delete'],
  },
  // MUHASEBE_IK - Muhasebe & İK
  muhasebe_ik: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view', 'edit'],
    branches: ['view'],
    users: ['view'],
    employees: ['view', 'create', 'edit'],
    hr: ['view', 'create', 'edit'],
    training: ['view'],
    schedules: ['view'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view'],
    leave_requests: ['view', 'edit', 'approve'],
    overtime_requests: ['view', 'edit', 'approve'],
    admin_settings: [],
    bulk_data: ['view', 'edit'],
    accounting: ['view', 'create', 'edit', 'delete'],
    customer_satisfaction: ['view'],
    lost_found: ['view'],
    lost_found_hq: ['view'],
    projects: ['view'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: ['view'],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: ['view'],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view'],
    adaptive_engine: ['view'],
    social_groups: ['view'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: ['view'],
    inventory: ['view'],
    suppliers: ['view'],
    purchase_orders: ['view'],
    goods_receipt: ['view'],
    cost_management: ['view', 'create', 'edit'],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
    ajanda: ['view', 'create', 'edit', 'delete'],
  },
  // MARKETING - Pazarlama
  marketing: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: [],
    equipment_faults: [],
    faults: [],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: [],
    attendance: [],
    branches: ['view'],
    users: [],
    employees: [],
    hr: [],
    training: ['view'],
    schedules: [],
    messages: ['view', 'create'],
    announcements: ['view', 'create', 'edit', 'delete'],
    complaints: ['view'],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view'],
    lost_found: [],
    lost_found_hq: [],
    projects: ['view'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: [],
    shifts: [],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: ['view'],
      crm_feedback: ['view'],
      crm_complaints: ['view'],
      crm_campaigns: ['view', 'create', 'edit'],
      crm_analytics: ['view'],
      crm_settings: [],
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  // TRAINER - Eğitim Sorumlusu
  trainer: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view'],
    equipment: [],
    equipment_faults: [],
    faults: [],
    knowledge_base: ['view', 'create', 'edit'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: [],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: ['view', 'create', 'edit', 'delete'],
    schedules: [],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: [],
    notifications: ['view'],
    quality_audit: [],
    shifts: [],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: [],
    academy: ['view', 'create', 'edit', 'delete'],
    academy_admin: ['view', 'create', 'edit'],
    badges: ['view', 'create', 'edit'],
    certificates: ['view', 'create', 'edit'],
    leaderboard: ['view'],
    achievements: ['view', 'create', 'edit'],
    team_competitions: ['view', 'create', 'edit'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: ['view'],
    branch_analytics: ['view'],
    learning_paths: ['view', 'create', 'edit'],
    adaptive_engine: ['view', 'edit'],
    social_groups: ['view', 'create', 'edit'],
    academy_supervisor: ['view'],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: [],
    inventory: [],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
    ajanda: ['view', 'create', 'edit', 'delete'],
  },
  // KALITE_KONTROL - Kalite Kontrol
  kalite_kontrol: {
    dashboard: ['view'],
    tasks: ['view'],
    checklists: ['view', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: [],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: ['view'],
    schedules: [],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view', 'create', 'edit'],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view', 'edit'],
    branch_inspection: ['view'],
    product_complaints: ['view', 'create', 'edit', 'approve'],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: ['view', 'create', 'edit'],
    shifts: [],
    settings: [],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view', 'create', 'edit'],
    factory_analytics: ['view'],
    factory_stations: ['view'],
    factory_compliance: ['view'],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view'],
    factory_food_safety: ['view'],
    branch_shift_tracking: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: ['view'],
      crm_feedback: ['view'],
      crm_complaints: ['view'],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: [],
    inventory: ['view'],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: ['view'],
    cost_management: ['view'],
    food_safety: ['view'],
  },
  // GIDA_MUHENDISI - Gıda Mühendisi (Gıda Güvenliği & Kalite)
  gida_muhendisi: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit'],
    checklists: ['view', 'create', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view'],
    faults: ['view'],
    knowledge_base: ['view', 'create', 'edit'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: [],
    branches: ['view'],
    users: [],
    employees: ['view'],
    hr: [],
    training: ['view', 'create', 'edit'],
    schedules: [],
    messages: ['view', 'create'],
    announcements: ['view', 'create'],
    complaints: ['view', 'create', 'edit'],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: ['view', 'edit'],
    branch_inspection: ['view', 'create', 'edit'],
    product_complaints: ['view', 'create', 'edit', 'approve'],
    lost_found: [],
    lost_found_hq: [],
    projects: ['view'],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: ['view', 'create', 'edit', 'approve'],
    shifts: [],
    settings: [],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view', 'create', 'edit', 'approve'],
    factory_analytics: ['view'],
    factory_stations: ['view'],
    factory_compliance: ['view', 'create', 'edit'],
    factory_production: ['view', 'create', 'edit'],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view'],
    factory_food_safety: ['view', 'create', 'edit', 'approve'],
    branch_shift_tracking: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: [],
    inventory: ['view'],
    suppliers: ['view'],
    purchase_orders: [],
    goods_receipt: ['view'],
    cost_management: ['view'],
    food_safety: ['view', 'create', 'edit', 'approve'],
  },
  // FABRIKA_MUDUR - Fabrika Müdürü
  fabrika_mudur: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit', 'approve'],
    checklists: ['view', 'create', 'edit'],
    equipment: ['view', 'edit'],
    equipment_faults: ['view', 'create', 'edit'],
    faults: ['view', 'create', 'edit'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view', 'edit'],
    attendance: ['view', 'edit'],
    branches: ['view'],
    users: [],
    employees: ['view', 'edit'],
    hr: ['view'],
    training: ['view'],
    schedules: ['view', 'edit'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: ['view'],
    leave_requests: ['view', 'approve'],
    overtime_requests: ['view', 'approve'],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: ['view'],
    shifts: ['view', 'edit'],
    settings: [],
    factory_kiosk: ['view', 'edit'],
    factory_dashboard: ['view', 'edit'],
    factory_quality: ['view', 'create', 'edit'],
    factory_analytics: ['view'],
    factory_stations: ['view', 'create', 'edit'],
    factory_compliance: ['view', 'edit'],
    factory_production: ['view', 'create', 'edit'],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view', 'create', 'edit'],
    factory_food_safety: ['view', 'create', 'edit'],
    branch_shift_tracking: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: ['view'],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: ['view'],
    inventory: ['view', 'edit'],
    suppliers: ['view'],
    purchase_orders: ['view'],
    goods_receipt: ['view', 'create', 'edit'],
    cost_management: ['view', 'create', 'edit'],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
    ajanda: ['view', 'create', 'edit', 'delete'],
  },
  uretim_sefi: {
    dashboard: ['view'],
    tasks: ['view', 'create', 'edit'],
    checklists: ['view', 'create', 'edit'],
    equipment: ['view', 'edit'],
    equipment_faults: ['view', 'create', 'edit'],
    faults: ['view', 'create', 'edit'],
    knowledge_base: ['view'],
    ai_assistant: ['view'],
    performance: ['view'],
    attendance: ['view', 'edit'],
    branches: [],
    users: [],
    employees: ['view'],
    hr: ['view'],
    training: ['view'],
    schedules: ['view', 'edit'],
    messages: ['view', 'create'],
    announcements: ['view'],
    complaints: [],
    leave_requests: ['view'],
    overtime_requests: ['view'],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: ['view'],
    notifications: ['view'],
    quality_audit: ['view'],
    shifts: ['view', 'edit'],
    settings: [],
    factory_kiosk: ['view', 'edit'],
    factory_dashboard: ['view', 'edit'],
    factory_quality: ['view', 'create', 'edit'],
    factory_analytics: ['view'],
    factory_stations: ['view', 'create', 'edit'],
    factory_compliance: ['view'],
    factory_production: ['view', 'create', 'edit'],
    branch_orders: ['view'],
    branch_inventory: ['view'],
    factory_shipments: ['view', 'create', 'edit'],
    factory_food_safety: ['view', 'create', 'edit'],
    branch_shift_tracking: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: [],
    academy_supervisor: [],
    academy_ai: [],
    crm_dashboard: [],
    crm_feedback: [],
    crm_complaints: [],
    crm_campaigns: [],
    crm_analytics: [],
    crm_settings: [],
    satinalma: ['view'],
    inventory: ['view'],
    suppliers: ['view'],
    purchase_orders: ['view'],
    goods_receipt: ['view'],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
    ajanda: ['view', 'create', 'edit', 'delete'],
  },
  // FABRIKA_OPERATOR - Fabrika Operatör
  fabrika_operator: {
    dashboard: ['view'],
    tasks: ['view', 'edit'],
    checklists: ['view', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view', 'create'],
    faults: ['view', 'create'],
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
    complaints: ['view', 'create'],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: [],
    support: [],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view', 'edit'],
    factory_analytics: [],
    factory_stations: ['view'],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: [],
    inventory: ['view'],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: ['view'],
    cost_management: ['view'],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  fabrika_sorumlu: {
    dashboard: ['view'],
    tasks: ['view', 'edit'],
    checklists: ['view', 'edit'],
    equipment: ['view', 'edit'],
    equipment_faults: ['view', 'create'],
    faults: ['view', 'create'],
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
    complaints: ['view', 'create'],
    leave_requests: ['view', 'create'],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: ['view'],
    support: [],
    notifications: ['view'],
    quality_audit: ['view'],
    shifts: ['view'],
    settings: [],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view', 'edit'],
    factory_analytics: ['view'],
    factory_stations: ['view', 'edit'],
    factory_compliance: ['view'],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: ['view'],
    factory_food_safety: ['view'],
    branch_shift_tracking: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: [],
    inventory: ['view'],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: ['view'],
    cost_management: ['view'],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  fabrika_personel: {
    dashboard: ['view'],
    tasks: ['view', 'edit'],
    checklists: ['view', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view', 'create'],
    faults: ['view', 'create'],
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
    complaints: ['view', 'create'],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: [],
    support: [],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: ['view'],
    factory_dashboard: ['view'],
    factory_quality: ['view'],
    factory_analytics: [],
    factory_stations: ['view'],
    factory_compliance: [],
    factory_production: [],
    branch_orders: ['view', 'create', 'edit', 'delete'],
    branch_inventory: ['view', 'create', 'edit'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: [],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: ['view'],
    crm_dashboard: [],
      crm_feedback: [],
      crm_complaints: [],
      crm_campaigns: [],
      crm_analytics: [],
      crm_settings: [],
    satinalma: [],
    inventory: ['view'],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: ['view'],
    cost_management: ['view'],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
  },
  sube_kiosk: {
    dashboard: ['view'],
    tasks: ['view', 'edit'],
    checklists: ['view', 'edit'],
    equipment: ['view'],
    equipment_faults: ['view', 'create'],
    faults: ['view', 'create'],
    knowledge_base: ['view'],
    ai_assistant: [],
    performance: [],
    attendance: ['view'],
    branches: [],
    users: [],
    employees: [],
    hr: [],
    training: ['view'],
    schedules: ['view'],
    messages: [],
    announcements: ['view'],
    complaints: [],
    leave_requests: [],
    overtime_requests: [],
    admin_settings: [],
    bulk_data: [],
    accounting: [],
    customer_satisfaction: [],
    lost_found: [],
    lost_found_hq: [],
    projects: [],
    reports: [],
    support: [],
    notifications: ['view'],
    quality_audit: [],
    shifts: ['view'],
    settings: [],
    factory_kiosk: [],
    factory_dashboard: [],
    factory_quality: [],
    factory_analytics: [],
    factory_stations: [],
    factory_compliance: [],
    factory_production: [],
    branch_orders: [],
    branch_inventory: ['view'],
    factory_shipments: [],
    factory_food_safety: [],
    branch_shift_tracking: ['view'],
    academy: ['view'],
    academy_admin: [],
    badges: ['view'],
    certificates: ['view'],
    leaderboard: ['view'],
    achievements: ['view'],
    team_competitions: ['view'],
    streak_tracker: ['view'],
    academy_analytics: [],
    progress_overview: ['view'],
    cohort_analytics: [],
    branch_analytics: [],
    learning_paths: ['view'],
    adaptive_engine: [],
    social_groups: ['view'],
    academy_supervisor: [],
    academy_ai: [],
    crm_dashboard: [],
    crm_feedback: [],
    crm_complaints: [],
    crm_campaigns: [],
    crm_analytics: [],
    crm_settings: [],
    satinalma: [],
    inventory: ['view'],
    suppliers: [],
    purchase_orders: [],
    goods_receipt: [],
    cost_management: [],
    branch_inspection: [],
    product_complaints: [],
    food_safety: [],
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
  // Customer Feedback QR & Social Media Integration
  feedbackQrToken: varchar("feedback_qr_token", { length: 64 }), // Unique token for customer feedback QR
  googleMapsUrl: text("google_maps_url"), // Google Maps/Business URL for review aggregation
  instagramHandle: varchar("instagram_handle", { length: 100 }), // Instagram handle for review tracking
  // Kiosk Authentication
  kioskUsername: varchar("kiosk_username", { length: 50 }), // Şube kiosk giriş kullanıcı adı
  kioskPassword: varchar("kiosk_password", { length: 100 }),
  ownershipType: varchar("ownership_type", { length: 20 }).default("franchise"),
  setupComplete: boolean("setup_complete").default(false),
  deletedAt: timestamp("deleted_at"),
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
  // Salary/Compensation fields (kuruş cinsinden)
  netSalary: integer("net_salary").default(0), // Aylık net maaş
  mealAllowance: integer("meal_allowance").default(0), // Yemek yardımı
  transportAllowance: integer("transport_allowance").default(0), // Ulaşım yardımı
  bonusBase: integer("bonus_base").default(0), // Prim matrahı
  bonusType: varchar("bonus_type", { length: 30 }).default("normal"),
  bonusPercentage: numeric("bonus_percentage").default("0"),
  language: varchar("language", { length: 5 }).default("tr"),
  notificationPreferences: jsonb("notification_preferences").$type<Record<string, boolean>>(),
  dashboardPreferences: jsonb("dashboard_preferences").$type<{ mode: string; layout?: any }>().default({ mode: "classic" }),
  mustChangePassword: boolean("must_change_password").default(false),
  onboardingComplete: boolean("onboarding_complete").default(false),
  titleId: integer("title_id"),
  employeeTypeId: integer("employee_type_id"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
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
export const checklistScopeEnum = ["branch", "factory"] as const;
export type ChecklistScope = typeof checklistScopeEnum[number];

export const checklists = pgTable("checklists", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  frequency: varchar("frequency", { length: 50 }).notNull(), // daily, weekly, monthly
  category: varchar("category", { length: 100 }), // opening, closing, cleaning, etc.
  scope: varchar("scope", { length: 20 }).notNull().default("branch"), // branch or factory
  isEditable: boolean("is_editable").default(true),
  editableFields: text("editable_fields").array(), // which fields branches can edit
  timeWindowStart: time("time_window_start", { precision: 0 }),
  timeWindowEnd: time("time_window_end", { precision: 0 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
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

// AI verification types for checklist tasks
export const aiVerificationTypeEnum = ["none", "cleanliness", "arrangement", "machine_settings", "general"] as const;
export type AiVerificationType = typeof aiVerificationTypeEnum[number];

// Checklist Tasks (many-to-many between checklists and task templates)
export const checklistTasks = pgTable("checklist_tasks", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
  taskDescription: text("task_description").notNull(),
  requiresPhoto: boolean("requires_photo").default(false),
  // AI verification settings
  referencePhotoUrl: text("reference_photo_url"), // Reference photo for AI comparison
  tolerancePercent: integer("tolerance_percent").default(80), // Minimum acceptable similarity (0-100)
  aiVerificationType: varchar("ai_verification_type", { length: 50 }).default("none"), // none, cleanliness, arrangement, machine_settings, general
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
      // AI verification settings
      referencePhotoUrl: z.string().nullable().optional(),
      tolerancePercent: z.number().min(0).max(100).default(80),
      aiVerificationType: z.enum(["none", "cleanliness", "arrangement", "machine_settings", "general"]).default("none"),
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
// CHECKLIST ASSIGNMENTS TABLE
// ========================================

// Assignment scope enum: user = specific user, branch = all users in branch, role = all users with specific role in branch
export const checklistAssignmentScopeEnum = ["user", "branch", "role"] as const;
export type ChecklistAssignmentScope = typeof checklistAssignmentScopeEnum[number];

// Checklist assignments table - links checklists to users/branches/roles
export const checklistAssignments = pgTable("checklist_assignments", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
  scope: varchar("scope", { length: 20 }).notNull(), // 'user' | 'branch' | 'role'
  assignedUserId: varchar("assigned_user_id").references(() => users.id, { onDelete: "cascade" }), // For scope='user'
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }), // For scope='branch' or 'role'
  role: varchar("role", { length: 50 }), // For scope='role' - specific role in branch
  shiftId: integer("shift_id").references(() => shifts.id, { onDelete: "set null" }), // Optional: link to specific shift
  effectiveFrom: date("effective_from"), // Optional: when assignment starts
  effectiveTo: date("effective_to"), // Optional: when assignment ends (null = permanent)
  isActive: boolean("is_active").default(true),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  checklistIdx: index("checklist_assignments_checklist_idx").on(table.checklistId),
  userIdx: index("checklist_assignments_user_idx").on(table.assignedUserId),
  branchIdx: index("checklist_assignments_branch_idx").on(table.branchId),
  activeIdx: index("checklist_assignments_active_idx").on(table.isActive),
}));

export const insertChecklistAssignmentSchema = createInsertSchema(checklistAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChecklistAssignment = z.infer<typeof insertChecklistAssignmentSchema>;
export type ChecklistAssignment = typeof checklistAssignments.$inferSelect;

// ========================================
// CHECKLIST COMPLETION TRACKING
// ========================================

// Checklist completion status enum
export const checklistCompletionStatusEnum = ["pending", "in_progress", "completed", "incomplete", "late"] as const;
export type ChecklistCompletionStatus = typeof checklistCompletionStatusEnum[number];

// Checklist completions - tracks each instance of a user completing a checklist
export const checklistCompletions = pgTable("checklist_completions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => checklistAssignments.id, { onDelete: "cascade" }),
  checklistId: integer("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
  shiftId: integer("shift_id").references(() => shifts.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed, incomplete, late
  scheduledDate: date("scheduled_date").notNull(), // The date this completion is for
  timeWindowStart: time("time_window_start", { precision: 0 }), // Copied from checklist template
  timeWindowEnd: time("time_window_end", { precision: 0 }), // Copied from checklist template
  startedAt: timestamp("started_at"), // When user started the checklist
  completedAt: timestamp("completed_at"), // When user finished all tasks
  submittedAt: timestamp("submitted_at"), // When user submitted for review
  isLate: boolean("is_late").default(false), // Started or completed after time window
  lateMinutes: integer("late_minutes").default(0), // How many minutes late
  totalTasks: integer("total_tasks").notNull().default(0),
  completedTasks: integer("completed_tasks").notNull().default(0),
  score: integer("score").default(0), // 0-100 based on completion quality
  reviewedById: varchar("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  assignmentIdx: index("checklist_completions_assignment_idx").on(table.assignmentId),
  userIdx: index("checklist_completions_user_idx").on(table.userId),
  dateIdx: index("checklist_completions_date_idx").on(table.scheduledDate),
  statusIdx: index("checklist_completions_status_idx").on(table.status),
}));

export const insertChecklistCompletionSchema = createInsertSchema(checklistCompletions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChecklistCompletion = z.infer<typeof insertChecklistCompletionSchema>;
export type ChecklistCompletion = typeof checklistCompletions.$inferSelect;

// AI verification result types
export const aiVerificationResultEnum = ["passed", "failed", "pending", "skipped"] as const;
export type AiVerificationResult = typeof aiVerificationResultEnum[number];

// Checklist task completions - tracks each task completion within a checklist
export const checklistTaskCompletions = pgTable("checklist_task_completions", {
  id: serial("id").primaryKey(),
  completionId: integer("completion_id").notNull().references(() => checklistCompletions.id, { onDelete: "cascade" }),
  taskId: integer("task_id").notNull().references(() => checklistTasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  photoUrl: text("photo_url"), // Photo evidence if required
  notes: text("notes"), // Optional notes from staff
  isLate: boolean("is_late").default(false), // Completed after task time window
  taskOrder: integer("task_order").notNull(), // Order in which this task should be completed
  // AI verification results (stored permanently even after photo deletion)
  aiVerificationResult: varchar("ai_verification_result", { length: 20 }).default("skipped"), // passed, failed, pending, skipped
  aiSimilarityScore: integer("ai_similarity_score"), // 0-100 similarity percentage
  aiVerificationNote: text("ai_verification_note"), // AI analysis explanation
  photoExpiresAt: timestamp("photo_expires_at"), // When photo will be auto-deleted (2 weeks from upload)
  photoDeleted: boolean("photo_deleted").default(false), // Flag to indicate photo was auto-deleted
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  completionIdx: index("checklist_task_completions_completion_idx").on(table.completionId),
  taskIdx: index("checklist_task_completions_task_idx").on(table.taskId),
  photoExpiresIdx: index("checklist_task_completions_photo_expires_idx").on(table.photoExpiresAt),
}));

export const insertChecklistTaskCompletionSchema = createInsertSchema(checklistTaskCompletions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChecklistTaskCompletion = z.infer<typeof insertChecklistTaskCompletionSchema>;
export type ChecklistTaskCompletion = typeof checklistTaskCompletions.$inferSelect;

// ========================================
// TASK MANAGEMENT TABLES
// ========================================

// Task status enum
export const taskStatusEnum = ["beklemede", "goruldu", "devam_ediyor", "foto_bekleniyor", "incelemede", "kontrol_bekliyor", "onaylandi", "reddedildi", "gecikmiş", "ek_bilgi_bekleniyor", "tamamlandi", "basarisiz", "cevap_bekliyor", "onay_bekliyor", "sure_uzatma_talebi", "zamanlanmis"] as const;
export type TaskStatus = typeof taskStatusEnum[number];

// Task priority enum
export const taskPriorityEnum = ["düşük", "orta", "yüksek", "acil", "kritik"] as const;
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
  startedAt: timestamp("started_at"), // When task was started
  // Onboarding checker fields
  isOnboarding: boolean("is_onboarding").default(false), // Is this an onboarding task
  checkerId: varchar("checker_id").references(() => users.id, { onDelete: "set null" }), // Who will verify completion
  checkedAt: timestamp("checked_at"), // When checker verified
  checkerNote: text("checker_note"), // Checker's verification note
  // Scheduled delivery fields
  scheduledDeliveryAt: timestamp("scheduled_delivery_at"), // When task should be delivered/visible
  isDelivered: boolean("is_delivered").default(true), // false = scheduled but not yet delivered
  // Assignee-Assigner approval workflow fields
  questionText: text("question_text"), // Question from assignee to assigner
  questionAnswerText: text("question_answer_text"), // Answer from assigner
  extensionReason: text("extension_reason"), // Why assignee requests deadline extension
  requestedDueDate: timestamp("requested_due_date"), // New deadline requested by assignee
  approvedByAssignerId: varchar("approved_by_assigner_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"), // When assigner approved closure
  approverNote: text("approver_note"), // Note from assigner when approving
  triggerId: integer("trigger_id"),
  occurrenceKey: varchar("occurrence_key", { length: 100 }),
  autoGenerated: boolean("auto_generated").default(false),
  evidenceType: varchar("evidence_type", { length: 20 }).default("none"),
  evidenceData: text("evidence_data"),
  taskScope: varchar("task_scope", { length: 20 }).default("branch"),
  targetDepartment: varchar("target_department", { length: 50 }),
  targetBranchIds: integer("target_branch_ids").array(),
  isGroupTask: boolean("is_group_task").default(false),
  acceptanceRequired: boolean("acceptance_required").default(false),
  allowExtension: boolean("allow_extension").default(true),
  parentTaskId: integer("parent_task_id"),
  source: varchar("source", { length: 30 }).default("manual"),
  sourceId: varchar("source_id", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  branchStatusIdx: index("tasks_branch_status_idx").on(table.branchId, table.status),
  assignedToIdx: index("tasks_assigned_to_idx").on(table.assignedToId),
  triggerIdempotentIdx: uniqueIndex("tasks_trigger_idempotent_idx").on(table.assignedToId, table.triggerId, table.occurrenceKey),
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
  // Onboarding checker fields
  isOnboarding: z.boolean().optional(),
  checkerId: z.string().nullable().optional(),
  // Scheduled delivery
  scheduledDeliveryAt: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
  isDelivered: z.boolean().optional(),
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
  // Onboarding checker fields
  isOnboarding: z.boolean().optional(),
  checkerId: z.string().nullable().optional(),
  checkerNote: z.string().nullable().optional(),
  checkedAt: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
  startedAt: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
  // Approval workflow fields
  questionText: z.string().nullable().optional(),
  questionAnswerText: z.string().nullable().optional(),
  extensionReason: z.string().nullable().optional(),
  requestedDueDate: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
  approvedByAssignerId: z.string().nullable().optional(),
  approvedAt: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
  approverNote: z.string().nullable().optional(),
  // Scheduled delivery
  scheduledDeliveryAt: z.preprocess(
    (val) => (val ? new Date(val as string | Date) : null),
    z.date().nullable().optional()
  ),
  isDelivered: z.boolean().optional(),
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
// TASK ASSIGNEES TABLE (Multiple assignees per task)
// ========================================

export const taskAssignees = pgTable("task_assignees", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).notNull().default("beklemede"),
  acknowledgedAt: timestamp("acknowledged_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  acceptanceStatus: varchar("acceptance_status", { length: 20 }).default("pending"),
  acceptedAt: timestamp("accepted_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  extensionRequestedAt: timestamp("extension_requested_at"),
  extensionReason: text("extension_reason"),
  extensionDays: integer("extension_days"),
  extensionApproved: boolean("extension_approved"),
  completionRate: integer("completion_rate").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  taskUserIdx: uniqueIndex("task_assignees_task_user_idx").on(table.taskId, table.userId),
  taskIdx: index("task_assignees_task_idx").on(table.taskId),
  userIdx: index("task_assignees_user_idx").on(table.userId),
}));

export const insertTaskAssigneeSchema = createInsertSchema(taskAssignees).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskAssignee = z.infer<typeof insertTaskAssigneeSchema>;
export type TaskAssignee = typeof taskAssignees.$inferSelect;

// ========================================
// TASK COMMENTS TABLE (Chat/comments on tasks)
// ========================================

export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  commentType: varchar("comment_type", { length: 20 }).default("message"),
  attachmentUrl: text("attachment_url"),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  taskCreatedIdx: index("idx_task_comments_task_created").on(table.taskId, table.createdAt),
}));

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type TaskComment = typeof taskComments.$inferSelect;

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
  catalogId: integer("catalog_id"),
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
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  branchIdx: index("equipment_branch_idx").on(table.branchId),
  typeIdx: index("equipment_type_idx").on(table.equipmentType),
}));

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
  serviceNotificationDate: timestamp("service_notification_date"),
  serviceNotificationMethod: varchar("service_notification_method", { length: 50 }),
  responsibleParty: varchar("responsible_party", { length: 20 }).default("branch"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  branchStageIdx: index("equipment_faults_branch_stage_idx").on(table.branchId, table.currentStage),
  equipmentIdx: index("equipment_faults_equipment_idx").on(table.equipmentId),
  troubleshootingIdx: index("equipment_faults_troubleshooting_idx").on(table.troubleshootingCompleted),
  statusIdx: index("equipment_faults_status_idx").on(table.status),
  createdIdx: index("equipment_faults_created_idx").on(table.createdAt),
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
