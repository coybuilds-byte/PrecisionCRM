import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, pgEnum, json, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const applicationStatusEnum = pgEnum("application_status", [
  "new",
  "screening",
  "interviewed",
  "reference_check",
  "offer_pending",
  "hired",
  "rejected",
  "withdrawn"
]);

export const contactTypeEnum = pgEnum("contact_type", ["phone", "email", "in_person", "video_call"]);

export const emailStatusEnum = pgEnum("email_status", ["sent", "delivered", "opened", "clicked", "bounced", "failed"]);

export const positionStatusEnum = pgEnum("position_status", ["open", "on_hold", "filled", "cancelled"]);

// Recruiters table
export const recruiters = pgTable("recruiters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  address: text("address"),
  website: text("website"),
  notes: text("notes"),
  agreementSigned: timestamp("agreement_signed"),
  signedAgreementUrl: text("signed_agreement_url"),
  createdAt: timestamp("created_at").defaultNow(),
  recruiterId: varchar("recruiter_id").references(() => recruiters.id),
});

// Positions table
export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements"),
  salary: text("salary"),
  location: text("location"),
  status: positionStatusEnum("status").default("open"),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  recruiterId: varchar("recruiter_id").references(() => recruiters.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Candidates table
export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  currentPosition: text("current_position"),
  currentCompany: text("current_company"),
  expectedSalary: text("expected_salary"),
  location: text("location"),
  resumeText: text("resume_text"),
  resumeFilename: text("resume_filename"),
  resumeUrl: text("resume_url"),
  skills: json("skills").$type<string[]>(),
  notes: text("notes"),
  recruiterId: varchar("recruiter_id").references(() => recruiters.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Applications table (linking candidates to positions)
export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id).notNull(),
  positionId: varchar("position_id").references(() => positions.id).notNull(),
  status: applicationStatusEnum("status").default("new"),
  appliedDate: timestamp("applied_date").defaultNow(),
  notes: text("notes"),
  recruiterId: varchar("recruiter_id").references(() => recruiters.id),
});

// Contacts table (tracking communications)
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id),
  clientId: varchar("client_id").references(() => clients.id),
  type: contactTypeEnum("type").notNull(),
  subject: text("subject"),
  notes: text("notes").notNull(),
  followUpDate: timestamp("follow_up_date"),
  contactDate: timestamp("contact_date").defaultNow(),
  recruiterId: varchar("recruiter_id").references(() => recruiters.id).notNull(),
});

// Interviews table
export const interviews = pgTable("interviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").references(() => applications.id).notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  endDate: timestamp("end_date"),
  interviewerName: text("interviewer_name"),
  interviewerEmail: text("interviewer_email"),
  location: text("location"),
  notes: text("notes"),
  feedback: text("feedback"),
  rating: integer("rating"), // 1-5 scale
  status: text("status").default("scheduled"), // scheduled, completed, cancelled, rescheduled
  outlookEventId: text("outlook_event_id"),
  recruiterId: varchar("recruiter_id").references(() => recruiters.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email outreach table
export const emailOutreach = pgTable("email_outreach", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").references(() => candidates.id).notNull(),
  positionId: varchar("position_id").references(() => positions.id),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content").notNull(),
  status: emailStatusEnum("status").default("sent"),
  messageId: text("message_id"),
  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bouncedAt: timestamp("bounced_at"),
  errorMessage: text("error_message"),
  recruiterId: varchar("recruiter_id").references(() => recruiters.id).notNull(),
});

// Client employees table (for multiple contacts per client)
export const clientEmployees = pgTable("client_employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  title: text("title"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const recruitersRelations = relations(recruiters, ({ many }) => ({
  candidates: many(candidates),
  clients: many(clients),
  positions: many(positions),
  contacts: many(contacts),
  interviews: many(interviews),
  users: many(users),
  emailOutreach: many(emailOutreach),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  recruiter: one(recruiters, {
    fields: [clients.recruiterId],
    references: [recruiters.id],
  }),
  positions: many(positions),
  contacts: many(contacts),
  employees: many(clientEmployees),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  client: one(clients, {
    fields: [positions.clientId],
    references: [clients.id],
  }),
  recruiter: one(recruiters, {
    fields: [positions.recruiterId],
    references: [recruiters.id],
  }),
  applications: many(applications),
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  recruiter: one(recruiters, {
    fields: [candidates.recruiterId],
    references: [recruiters.id],
  }),
  applications: many(applications),
  contacts: many(contacts),
  emailOutreach: many(emailOutreach),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  candidate: one(candidates, {
    fields: [applications.candidateId],
    references: [candidates.id],
  }),
  position: one(positions, {
    fields: [applications.positionId],
    references: [positions.id],
  }),
  recruiter: one(recruiters, {
    fields: [applications.recruiterId],
    references: [recruiters.id],
  }),
  interviews: many(interviews),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  candidate: one(candidates, {
    fields: [contacts.candidateId],
    references: [candidates.id],
  }),
  client: one(clients, {
    fields: [contacts.clientId],
    references: [clients.id],
  }),
  recruiter: one(recruiters, {
    fields: [contacts.recruiterId],
    references: [recruiters.id],
  }),
}));

export const interviewsRelations = relations(interviews, ({ one }) => ({
  application: one(applications, {
    fields: [interviews.applicationId],
    references: [applications.id],
  }),
  recruiter: one(recruiters, {
    fields: [interviews.recruiterId],
    references: [recruiters.id],
  }),
}));

export const emailOutreachRelations = relations(emailOutreach, ({ one }) => ({
  candidate: one(candidates, {
    fields: [emailOutreach.candidateId],
    references: [candidates.id],
  }),
  position: one(positions, {
    fields: [emailOutreach.positionId],
    references: [positions.id],
  }),
  recruiter: one(recruiters, {
    fields: [emailOutreach.recruiterId],
    references: [recruiters.id],
  }),
}));

export const clientEmployeesRelations = relations(clientEmployees, ({ one }) => ({
  client: one(clients, {
    fields: [clientEmployees.clientId],
    references: [clients.id],
  }),
}));

// Insert schemas
export const insertRecruiterSchema = createInsertSchema(recruiters).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  appliedDate: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  contactDate: true,
});

export const insertInterviewSchema = createInsertSchema(interviews).omit({
  id: true,
  createdAt: true,
});

export const insertEmailOutreachSchema = createInsertSchema(emailOutreach).omit({
  id: true,
  sentAt: true,
  deliveredAt: true,
  openedAt: true,
  clickedAt: true,
  bouncedAt: true,
});

export const insertClientEmployeeSchema = createInsertSchema(clientEmployees).omit({
  id: true,
  createdAt: true,
});

// Types
export type Recruiter = typeof recruiters.$inferSelect;
export type InsertRecruiter = z.infer<typeof insertRecruiterSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Position = typeof positions.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;

export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = z.infer<typeof insertInterviewSchema>;

export type EmailOutreach = typeof emailOutreach.$inferSelect;
export type InsertEmailOutreach = z.infer<typeof insertEmailOutreachSchema>;

export type ClientEmployee = typeof clientEmployees.$inferSelect;
export type InsertClientEmployee = z.infer<typeof insertClientEmployeeSchema>;

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  recruiterId: varchar("recruiter_id").references(() => recruiters.id).notNull(),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  lastLoginAt: timestamp("last_login_at"),
  resetToken: text("reset_token"),
  resetTokenExpires: timestamp("reset_token_expires"),
  twoFactorCode: text("two_factor_code"),
  twoFactorCodeExpiry: timestamp("two_factor_code_expiry"),
  twoFactorEnabled: boolean("two_factor_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sessions table for secure session management
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// User and session relations
export const usersRelations = relations(users, ({ one, many }) => ({
  recruiter: one(recruiters, {
    fields: [users.recruiterId],
    references: [recruiters.id],
  }),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  failedLoginAttempts: true,
  lockedUntil: true,
  lastLoginAt: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  lastActiveAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;