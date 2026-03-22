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

import { branches, checklistTasks, checklists, equipment, equipmentFaults, tasks, users } from './schema-02';
import { equipmentComments, equipmentMaintenanceLogs, equipmentServiceRequests, performanceMetrics, reminders } from './schema-03';
import { maintenanceLogs, menuItems, menuSections, menuVisibilityRules, pageContent } from './schema-04';

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
