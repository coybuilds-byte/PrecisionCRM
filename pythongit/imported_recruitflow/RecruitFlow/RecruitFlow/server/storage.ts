import { 
  type User, type InsertUser,
  type Session, type InsertSession,
  type Recruiter, type InsertRecruiter,
  type Candidate, type InsertCandidate,
  type Client, type InsertClient,
  type Position, type InsertPosition,
  type Contact, type InsertContact,
  type Interview, type InsertInterview,
  type Application, type InsertApplication,
  type EmailOutreach, type InsertEmailOutreach,
  type ClientEmployee, type InsertClientEmployee,
  users, sessions, recruiters, candidates, clients, positions, contacts, interviews, applications, emailOutreach, clientEmployees
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gte, lt } from "drizzle-orm";

export interface IStorage {
  // Authentication
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: InsertUser & { passwordHash: string }): Promise<User>;
  updateUserLoginAttempts(id: string, attempts: number, lockedUntil?: Date): Promise<void>;
  updateUserLastLogin(id: string): Promise<void>;
  setPasswordResetToken(userId: string, token: string, expires: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(userId: string): Promise<void>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  setTwoFactorCode(userId: string, code: string, expiry: Date): Promise<void>;
  clearTwoFactorCode(userId: string): Promise<void>;
  getUserByTwoFactorCode(userId: string, code: string): Promise<User | undefined>;
  
  // Session management
  createSession(session: InsertSession): Promise<Session>;
  getSessionByTokenHash(tokenHash: string): Promise<Session | undefined>;
  updateSessionActivity(id: string): Promise<void>;
  revokeSession(id: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
  listSessionsForUser(userId: string): Promise<Session[]>;
  cleanupExpiredSessions(): Promise<void>;
  
  // User management (legacy)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  
  // Recruiter management
  getRecruiter(id: string): Promise<Recruiter | undefined>;
  getRecruiterByEmail(email: string): Promise<Recruiter | undefined>;
  createRecruiter(recruiter: InsertRecruiter): Promise<Recruiter>;
  listRecruiters(): Promise<Recruiter[]>;
  
  // Candidate management
  getCandidate(id: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  createCandidatesBulk(candidates: InsertCandidate[]): Promise<Candidate[]>;
  updateCandidate(id: string, updates: Partial<InsertCandidate>): Promise<Candidate | undefined>;
  listCandidates(recruiterId?: string): Promise<Candidate[]>;
  deleteCandidate(id: string): Promise<boolean>;
  
  // Client management
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  createClientsBulk(clients: InsertClient[]): Promise<Client[]>;
  updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined>;
  listClients(recruiterId?: string): Promise<Client[]>;
  deleteClient(id: string): Promise<boolean>;
  
  // Client employee management
  createClientEmployee(employee: InsertClientEmployee): Promise<ClientEmployee>;
  updateClientEmployee(id: string, updates: Partial<InsertClientEmployee>): Promise<ClientEmployee | undefined>;
  listClientEmployees(clientId: string): Promise<ClientEmployee[]>;
  deleteClientEmployee(id: string): Promise<boolean>;
  
  // Position management
  getPosition(id: string): Promise<Position | undefined>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: string, updates: Partial<InsertPosition>): Promise<Position | undefined>;
  listPositions(clientId?: string): Promise<Position[]>;
  deletePosition(id: string): Promise<boolean>;
  
  // Contact management
  createContact(contact: InsertContact): Promise<Contact>;
  listContactsForCandidate(candidateId: string): Promise<Contact[]>;
  listContactsForClient(clientId: string): Promise<Contact[]>;
  
  // Interview management
  getInterview(id: string): Promise<Interview | undefined>;
  createInterview(interview: InsertInterview): Promise<Interview>;
  updateInterview(id: string, updates: Partial<InsertInterview>): Promise<Interview | undefined>;
  listInterviews(recruiterId?: string): Promise<Interview[]>;
  listInterviewsForApplication(applicationId: string): Promise<Interview[]>;
  deleteInterview(id: string): Promise<boolean>;
  
  // Application management
  createApplication(application: InsertApplication): Promise<Application>;
  getApplicationById(id: string): Promise<Application | undefined>;
  updateApplication(id: string, application: Partial<InsertApplication>): Promise<Application | undefined>;
  updateApplicationStatus(id: string, status: string): Promise<Application | undefined>;
  deleteApplication(id: string): Promise<void>;
  listApplications(recruiterId?: string): Promise<Application[]>;
  listApplicationsForPosition(positionId: string): Promise<Array<Application & { candidate: Candidate }>>;
  listApplicationsForCandidate(candidateId: string): Promise<Application[]>;
  
  // Dashboard statistics
  getDashboardStats(recruiterId?: string): Promise<{
    totalCandidates: number;
    activeCandidates: number;
    totalClients: number;
    openPositions: number;
    scheduledInterviews: number;
    placementsThisMonth: number;
  }>;
  
  // Email outreach management
  sendEmailToCandidate(emailData: InsertEmailOutreach): Promise<{ success: boolean; email?: EmailOutreach; error?: string }>;
  getCandidateEmails(candidateId: string, recruiterId: string): Promise<EmailOutreach[]>;
  getAllEmails(recruiterId: string): Promise<EmailOutreach[]>;
}

export class DatabaseStorage implements IStorage {
  // Legacy user methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  // createUser method moved to authentication section
  
  // Recruiter methods
  async getRecruiter(id: string): Promise<Recruiter | undefined> {
    const [recruiter] = await db.select().from(recruiters).where(eq(recruiters.id, id));
    return recruiter || undefined;
  }
  
  async getRecruiterByEmail(email: string): Promise<Recruiter | undefined> {
    const [recruiter] = await db.select().from(recruiters).where(eq(recruiters.email, email));
    return recruiter || undefined;
  }
  
  async createRecruiter(insertRecruiter: InsertRecruiter): Promise<Recruiter> {
    const [recruiter] = await db
      .insert(recruiters)
      .values(insertRecruiter)
      .returning();
    return recruiter;
  }
  
  async listRecruiters(): Promise<Recruiter[]> {
    return await db.select().from(recruiters).orderBy(recruiters.name);
  }
  
  // Candidate methods
  async getCandidate(id: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate || undefined;
  }
  
  async createCandidate(insertCandidate: InsertCandidate): Promise<Candidate> {
    const [candidate] = await db
      .insert(candidates)
      .values(insertCandidate)
      .returning();
    return candidate;
  }

  async createCandidatesBulk(insertCandidates: InsertCandidate[]): Promise<Candidate[]> {
    if (insertCandidates.length === 0) {
      return [];
    }
    
    const newCandidates = await db
      .insert(candidates)
      .values(insertCandidates as any)
      .returning();
    return newCandidates;
  }
  
  async updateCandidate(id: string, updates: Partial<InsertCandidate>): Promise<Candidate | undefined> {
    const [candidate] = await db
      .update(candidates)
      .set(updates as any)
      .where(eq(candidates.id, id))
      .returning();
    return candidate || undefined;
  }
  
  async listCandidates(recruiterId?: string): Promise<Candidate[]> {
    if (recruiterId) {
      return await db.select().from(candidates)
        .where(eq(candidates.recruiterId, recruiterId))
        .orderBy(desc(candidates.createdAt));
    }
    return await db.select().from(candidates).orderBy(desc(candidates.createdAt));
  }
  
  async deleteCandidate(id: string): Promise<boolean> {
    const result = await db.delete(candidates).where(eq(candidates.id, id));
    return (result.rowCount || 0) > 0;
  }
  
  // Client methods
  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }
  
  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values(insertClient)
      .returning();
    return client;
  }

  async createClientsBulk(insertClients: InsertClient[]): Promise<Client[]> {
    if (insertClients.length === 0) {
      return [];
    }
    
    const newClients = await db
      .insert(clients)
      .values(insertClients as any)
      .returning();
    return newClients;
  }
  
  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set(updates)
      .where(eq(clients.id, id))
      .returning();
    return client || undefined;
  }
  
  async listClients(recruiterId?: string): Promise<Client[]> {
    if (recruiterId) {
      return await db.select().from(clients)
        .where(eq(clients.recruiterId, recruiterId))
        .orderBy(clients.companyName);
    }
    return await db.select().from(clients).orderBy(clients.companyName);
  }
  
  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return (result.rowCount || 0) > 0;
  }
  
  // Client employee methods
  async createClientEmployee(insertEmployee: InsertClientEmployee): Promise<ClientEmployee> {
    const [employee] = await db
      .insert(clientEmployees)
      .values(insertEmployee)
      .returning();
    return employee;
  }
  
  async updateClientEmployee(id: string, updates: Partial<InsertClientEmployee>): Promise<ClientEmployee | undefined> {
    const [employee] = await db
      .update(clientEmployees)
      .set(updates)
      .where(eq(clientEmployees.id, id))
      .returning();
    return employee || undefined;
  }
  
  async listClientEmployees(clientId: string): Promise<ClientEmployee[]> {
    return await db.select().from(clientEmployees)
      .where(eq(clientEmployees.clientId, clientId))
      .orderBy(clientEmployees.firstName, clientEmployees.lastName);
  }
  
  async deleteClientEmployee(id: string): Promise<boolean> {
    const result = await db.delete(clientEmployees).where(eq(clientEmployees.id, id));
    return (result.rowCount || 0) > 0;
  }
  
  // Position methods
  async getPosition(id: string): Promise<Position | undefined> {
    const [position] = await db.select().from(positions).where(eq(positions.id, id));
    return position || undefined;
  }
  
  async createPosition(insertPosition: InsertPosition): Promise<Position> {
    const [position] = await db
      .insert(positions)
      .values(insertPosition)
      .returning();
    return position;
  }
  
  async updatePosition(id: string, updates: Partial<InsertPosition>): Promise<Position | undefined> {
    const [position] = await db
      .update(positions)
      .set(updates)
      .where(eq(positions.id, id))
      .returning();
    return position || undefined;
  }
  
  async listPositions(clientId?: string): Promise<Position[]> {
    if (clientId) {
      return await db.select().from(positions)
        .where(eq(positions.clientId, clientId))
        .orderBy(desc(positions.createdAt));
    }
    return await db.select().from(positions).orderBy(desc(positions.createdAt));
  }
  
  async deletePosition(id: string): Promise<boolean> {
    const result = await db.delete(positions).where(eq(positions.id, id));
    return (result.rowCount || 0) > 0;
  }
  
  // Contact methods
  async createContact(insertContact: InsertContact): Promise<Contact> {
    const [contact] = await db
      .insert(contacts)
      .values(insertContact)
      .returning();
    return contact;
  }
  
  async listContactsForCandidate(candidateId: string): Promise<Contact[]> {
    return await db.select().from(contacts)
      .where(eq(contacts.candidateId, candidateId))
      .orderBy(desc(contacts.contactDate));
  }
  
  async listContactsForClient(clientId: string): Promise<Contact[]> {
    return await db.select().from(contacts)
      .where(eq(contacts.clientId, clientId))
      .orderBy(desc(contacts.contactDate));
  }
  
  // Interview methods
  async getInterview(id: string): Promise<Interview | undefined> {
    const [interview] = await db.select().from(interviews).where(eq(interviews.id, id));
    return interview || undefined;
  }
  
  async createInterview(insertInterview: InsertInterview): Promise<Interview> {
    const [interview] = await db
      .insert(interviews)
      .values(insertInterview)
      .returning();
    return interview;
  }
  
  async updateInterview(id: string, updates: Partial<InsertInterview>): Promise<Interview | undefined> {
    const [interview] = await db
      .update(interviews)
      .set(updates)
      .where(eq(interviews.id, id))
      .returning();
    return interview || undefined;
  }
  
  async listInterviews(recruiterId?: string): Promise<Interview[]> {
    if (recruiterId) {
      return await db.select().from(interviews)
        .where(eq(interviews.recruiterId, recruiterId))
        .orderBy(interviews.scheduledDate);
    }
    return await db.select().from(interviews).orderBy(interviews.scheduledDate);
  }
  
  async listInterviewsForApplication(applicationId: string): Promise<Interview[]> {
    return await db.select().from(interviews)
      .where(eq(interviews.applicationId, applicationId))
      .orderBy(interviews.scheduledDate);
  }
  
  async deleteInterview(id: string): Promise<boolean> {
    const result = await db.delete(interviews).where(eq(interviews.id, id));
    return (result.rowCount || 0) > 0;
  }
  
  // Application methods
  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const [application] = await db
      .insert(applications)
      .values(insertApplication)
      .returning();
    return application;
  }
  
  async updateApplicationStatus(id: string, status: string): Promise<Application | undefined> {
    const [application] = await db
      .update(applications)
      .set({ status: status as any })
      .where(eq(applications.id, id))
      .returning();
    return application || undefined;
  }
  
  async listApplicationsForPosition(positionId: string): Promise<Array<Application & { candidate: Candidate }>> {
    const results = await db
      .select({
        application: applications,
        candidate: candidates,
      })
      .from(applications)
      .leftJoin(candidates, eq(applications.candidateId, candidates.id))
      .where(eq(applications.positionId, positionId))
      .orderBy(desc(applications.appliedDate));
    
    // Flatten the results to match the expected type
    return results.map(row => ({
      ...row.application,
      candidate: row.candidate!,
    })) as Array<Application & { candidate: Candidate }>;
  }
  
  async listApplicationsForCandidate(candidateId: string): Promise<Application[]> {
    return await db.select().from(applications)
      .where(eq(applications.candidateId, candidateId))
      .orderBy(desc(applications.appliedDate));
  }
  
  async getApplicationById(id: string): Promise<Application | undefined> {
    const [application] = await db.select().from(applications)
      .where(eq(applications.id, id));
    return application || undefined;
  }

  async updateApplication(id: string, application: Partial<InsertApplication>): Promise<Application | undefined> {
    const [updatedApplication] = await db
      .update(applications)
      .set(application)
      .where(eq(applications.id, id))
      .returning();
    return updatedApplication || undefined;
  }

  async deleteApplication(id: string): Promise<void> {
    await db.delete(applications).where(eq(applications.id, id));
  }

  async listApplications(recruiterId?: string): Promise<Application[]> {
    if (recruiterId) {
      return await db.select().from(applications)
        .where(eq(applications.recruiterId, recruiterId))
        .orderBy(desc(applications.appliedDate));
    }
    return await db.select().from(applications).orderBy(desc(applications.appliedDate));
  }
  
  async getDashboardStats(recruiterId?: string): Promise<{
    totalCandidates: number;
    activeCandidates: number;
    totalClients: number;
    openPositions: number;
    scheduledInterviews: number;
    placementsThisMonth: number;
  }> {
    const baseCondition = recruiterId ? eq : undefined;
    
    // Get total candidates
    const candidatesQuery = db.select({ count: sql<number>`count(*)` }).from(candidates);
    const candidatesResult = recruiterId 
      ? await candidatesQuery.where(eq(candidates.recruiterId, recruiterId))
      : await candidatesQuery;
    
    // Get active candidates (with recent applications)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeCandidatesConditions = [gte(applications.appliedDate, thirtyDaysAgo)];
    if (recruiterId) {
      activeCandidatesConditions.push(eq(candidates.recruiterId, recruiterId));
    }
    const activeCandidatesResult = await db.select({ count: sql<number>`count(distinct ${candidates.id})` })
      .from(candidates)
      .innerJoin(applications, eq(applications.candidateId, candidates.id))
      .where(and(...activeCandidatesConditions));
    
    // Get total clients
    const clientsQuery = db.select({ count: sql<number>`count(*)` }).from(clients);
    const clientsResult = recruiterId 
      ? await clientsQuery.where(eq(clients.recruiterId, recruiterId))
      : await clientsQuery;
    
    // Get open positions
    const positionsConditions = [eq(positions.status, 'open')];
    if (recruiterId) {
      positionsConditions.push(eq(positions.recruiterId, recruiterId));
    }
    const positionsResult = await db.select({ count: sql<number>`count(*)` })
      .from(positions)
      .where(and(...positionsConditions));
    
    // Get scheduled interviews (interviews with future dates)
    const now = new Date();
    const interviewsConditions = [
      gte(interviews.scheduledDate, now)
    ];
    if (recruiterId) {
      interviewsConditions.push(eq(interviews.recruiterId, recruiterId));
    }
    const interviewsResult = await db.select({ count: sql<number>`count(*)` })
      .from(interviews)
      .where(and(...interviewsConditions));
    
    // Get placements this month (assuming completed applications)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const placementsConditions = [
      eq(applications.status, 'hired'),
      gte(applications.appliedDate, startOfMonth)
    ];
    if (recruiterId) {
      placementsConditions.push(eq(applications.recruiterId, recruiterId));
    }
    const placementsResult = await db.select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(and(...placementsConditions));
    
    return {
      totalCandidates: candidatesResult[0]?.count || 0,
      activeCandidates: activeCandidatesResult[0]?.count || 0,
      totalClients: clientsResult[0]?.count || 0,
      openPositions: positionsResult[0]?.count || 0,
      scheduledInterviews: interviewsResult[0]?.count || 0,
      placementsThisMonth: placementsResult[0]?.count || 0,
    };
  }

  // Authentication methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    // Make email comparison case-insensitive
    const [user] = await db.select().from(users).where(eq(sql`LOWER(${users.email})`, email.toLowerCase()));
    return user || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createUser(user: InsertUser & { passwordHash: string }): Promise<User> {
    const { password, ...userData } = user;
    const [newUser] = await db.insert(users).values({
      ...userData,
      passwordHash: user.passwordHash
    } as any).returning();
    return newUser;
  }

  async updateUserLoginAttempts(id: string, attempts: number, lockedUntil?: Date): Promise<void> {
    await db.update(users)
      .set({ 
        failedLoginAttempts: attempts,
        lockedUntil: lockedUntil
      })
      .where(eq(users.id, id));
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db.update(users)
      .set({ 
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null
      })
      .where(eq(users.id, id));
  }

  async setPasswordResetToken(userId: string, token: string, expires: Date): Promise<void> {
    await db.update(users)
      .set({ 
        resetToken: token,
        resetTokenExpires: expires
      })
      .where(eq(users.id, userId));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(and(
        eq(users.resetToken, token),
        gte(users.resetTokenExpires, new Date())
      ));
    return user || undefined;
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db.update(users)
      .set({ 
        resetToken: null,
        resetTokenExpires: null,
        failedLoginAttempts: 0,  // Clear login lockouts when password is reset
        lockedUntil: null
      })
      .where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db.update(users)
      .set({ 
        passwordHash: passwordHash
      })
      .where(eq(users.id, userId));
  }

  async setTwoFactorCode(userId: string, code: string, expiry: Date): Promise<void> {
    await db.update(users)
      .set({ 
        twoFactorCode: code,
        twoFactorCodeExpiry: expiry
      })
      .where(eq(users.id, userId));
  }

  async clearTwoFactorCode(userId: string): Promise<void> {
    await db.update(users)
      .set({ 
        twoFactorCode: null,
        twoFactorCodeExpiry: null
      })
      .where(eq(users.id, userId));
  }

  async getUserByTwoFactorCode(userId: string, code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.twoFactorCode, code),
        gte(users.twoFactorCodeExpiry, new Date())
      ));
    return user || undefined;
  }

  // Session management methods
  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
  }

  async getSessionByTokenHash(tokenHash: string): Promise<Session | undefined> {
    const [session] = await db.select()
      .from(sessions)
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          sql`${sessions.revokedAt} IS NULL`,
          gte(sessions.expiresAt, new Date())
        )
      );
    return session || undefined;
  }

  async updateSessionActivity(id: string): Promise<void> {
    await db.update(sessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(sessions.id, id));
  }

  async revokeSession(id: string): Promise<void> {
    await db.update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, id));
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await db.update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessions.userId, userId),
          sql`${sessions.revokedAt} IS NULL`
        )
      );
  }

  async listSessionsForUser(userId: string): Promise<Session[]> {
    return await db.select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt));
  }

  async cleanupExpiredSessions(): Promise<void> {
    await db.delete(sessions)
      .where(
        and(
          lt(sessions.expiresAt, new Date()),
          sql`${sessions.revokedAt} IS NULL`
        )
      );
  }

  async sendEmailToCandidate(emailData: InsertEmailOutreach): Promise<{ success: boolean; email?: EmailOutreach; error?: string }> {
    try {
      const { sendEmail, getJobOpportunityTemplate, getFollowUpTemplate } = await import('./email');
      
      const template = emailData.positionId 
        ? await (async () => {
            const candidate = await this.getCandidate(emailData.candidateId);
            const position = emailData.positionId ? await this.getPosition(emailData.positionId) : null;
            if (!candidate || !position) {
              throw new Error('Candidate or position not found');
            }
            const client = await this.getClient(position.clientId);
            if (!client) {
              throw new Error('Client not found');
            }
            return getJobOpportunityTemplate(
              `${candidate.firstName} ${candidate.lastName}`,
              position.title,
              client.companyName,
              position.description
            );
          })()
        : getFollowUpTemplate(
            await (async () => {
              const candidate = await this.getCandidate(emailData.candidateId);
              return `${candidate?.firstName} ${candidate?.lastName}`;
            })(),
            emailData.subject
          );

      const result = await sendEmail(emailData.recipientEmail, template);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      const [email] = await db.insert(emailOutreach).values({
        ...emailData,
        subject: template.subject,
        htmlContent: template.html,
        textContent: template.text,
        messageId: result.messageId,
        status: 'sent'
      }).returning();

      return { success: true, email };
    } catch (error) {
      console.error('[Storage] Error sending email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getCandidateEmails(candidateId: string, recruiterId: string): Promise<EmailOutreach[]> {
    return await db.select()
      .from(emailOutreach)
      .where(
        and(
          eq(emailOutreach.candidateId, candidateId),
          eq(emailOutreach.recruiterId, recruiterId)
        )
      )
      .orderBy(desc(emailOutreach.sentAt));
  }

  async getAllEmails(recruiterId: string): Promise<EmailOutreach[]> {
    return await db.select()
      .from(emailOutreach)
      .where(eq(emailOutreach.recruiterId, recruiterId))
      .orderBy(desc(emailOutreach.sentAt));
  }
}

export const storage = new DatabaseStorage();
