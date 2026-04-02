import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { users } from "./schema-02";

export const workshopNotes = pgTable("workshop_notes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  section: varchar("section", { length: 50 }).notNull().default("genel"), // vizyon, teknik, surec, karar, genel
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWorkshopNoteSchema = createInsertSchema(workshopNotes).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});
