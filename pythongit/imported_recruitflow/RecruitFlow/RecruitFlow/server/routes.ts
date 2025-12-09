import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCandidateSchema, insertClientSchema, insertPositionSchema, insertContactSchema, insertInterviewSchema, insertApplicationSchema, insertEmailOutreachSchema, insertClientEmployeeSchema } from "@shared/schema";
import { PrecisionSourceIntegration } from "./external-integration";
import multer from "multer";
import express from "express";
import { parse } from "csv-parse/sync";
import authRoutes from "./auth-routes";
import { requireAuth } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { parseResume } from "./openai";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || 
        file.mimetype.startsWith('text/') ||
        file.mimetype === 'text/csv' ||
        file.mimetype === 'application/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, text, and CSV files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Note: express.json() is already called in server/index.ts
  // Calling it again here can cause issues

  // Authentication routes
  console.log('[ROUTES] Registering auth routes at /api/auth');
  app.use('/api/auth', authRoutes);
  console.log('[ROUTES] Auth routes registered successfully');

  // Object storage routes for protected file uploading
  // Endpoint for serving private objects with ACL check
  app.get("/objects/:objectPath(*)", requireAuth, async (req, res) => {
    const userId = (req as any).user?.id;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Endpoint for getting upload URL
  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Endpoint for getting presigned URL for file uploads
  app.post("/api/upload/presigned-url", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ url: uploadURL });
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      res.status(500).json({ error: 'Failed to generate presigned URL' });
    }
  });

  // Endpoint for resume upload with parsing
  app.post("/api/candidates/resume-upload", requireAuth, async (req, res) => {
    if (!req.body.resumeURL) {
      return res.status(400).json({ error: "resumeURL is required" });
    }

    const userId = (req as any).user?.id;

    try {
      const objectStorageService = new ObjectStorageService();
      
      // Set ACL policy for the uploaded resume
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.resumeURL,
        {
          owner: userId,
          visibility: "private", // Resumes are private
        },
      );

      // Get metadata
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      const [metadata] = await objectFile.getMetadata();
      
      console.log('[RESUME UPLOAD] File uploaded successfully:', {
        path: objectPath,
        type: metadata.contentType,
        name: metadata.name
      });
      
      // Try to parse PDF (optional - will fallback gracefully if fails)
      let parseResult = {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        location: '',
        skills: [] as string[],
        resumeText: ''
      };
      
      try {
        // Download file content as buffer
        const [fileBuffer] = await objectFile.download();
        
        console.log('[RESUME PARSE] Attempting resume parse, file size:', fileBuffer.length);
        
        // Save file temporarily for Python service
        const fs = require('fs');
        // Extract just the filename from the full path
        const fileName = metadata.name?.split('/').pop() || 'resume.pdf';
        const tempFilePath = `/tmp/resume_${Date.now()}_${fileName}`;
        fs.writeFileSync(tempFilePath, fileBuffer);
        
        try {
          // Call Python service for parsing
          const fetch = (await import('node-fetch')).default;
          const pythonServiceUrl = `http://localhost:8001/parse?file_path=${encodeURIComponent(tempFilePath)}`;
          
          console.log('[RESUME PARSE] Calling Python service...');
          const pythonResponse = await fetch(pythonServiceUrl);
          
          if (!pythonResponse.ok) {
            const errorText = await pythonResponse.text();
            throw new Error(`Python service error: ${errorText}`);
          }
          
          const pythonData = await pythonResponse.json();
          console.log('[RESUME PARSE] Python service response:', pythonData);
          
          // Use extracted text for OpenAI enhancement if available
          let resumeText = pythonData.text || '';
          
          // Try OpenAI enhancement if we have text
          if (resumeText && resumeText.length > 0) {
            try {
              const aiParseResult = await parseResume(resumeText);
              
              // Merge Python extraction with OpenAI enhancement
              parseResult = {
                firstName: aiParseResult.firstName || pythonData.name?.split(' ')[0] || '',
                lastName: aiParseResult.lastName || pythonData.name?.split(' ').slice(1).join(' ') || '',
                email: aiParseResult.email || pythonData.email || '',
                phone: aiParseResult.phone || pythonData.phone || '',
                location: aiParseResult.location || pythonData.address || '',
                skills: aiParseResult.skills && aiParseResult.skills.length > 0 ? 
                        aiParseResult.skills : (pythonData.skills || []),
                resumeText: resumeText
              };
            } catch (openAiError) {
              console.warn('[RESUME PARSE] OpenAI enhancement failed, using Python results only:', openAiError);
              // Fallback to Python-only results
              parseResult = {
                firstName: pythonData.name?.split(' ')[0] || '',
                lastName: pythonData.name?.split(' ').slice(1).join(' ') || '',
                email: pythonData.email || '',
                phone: pythonData.phone || '',
                location: pythonData.address || '',
                skills: pythonData.skills || [],
                resumeText: resumeText
              };
            }
          } else {
            // No text extracted, use Python results directly
            parseResult = {
              firstName: pythonData.name?.split(' ')[0] || '',
              lastName: pythonData.name?.split(' ').slice(1).join(' ') || '',
              email: pythonData.email || '',
              phone: pythonData.phone || '',
              location: pythonData.address || '',
              skills: pythonData.skills || [],
              resumeText: ''
            };
          }
          
          console.log('[RESUME PARSE] Final extraction successful:', {
            firstName: parseResult.firstName,
            lastName: parseResult.lastName,
            email: parseResult.email,
            skillsCount: parseResult.skills?.length || 0
          });
          
        } finally {
          // Clean up temp file
          try {
            fs.unlinkSync(tempFilePath);
          } catch (e) {
            console.warn('[RESUME PARSE] Failed to delete temp file:', e);
          }
        }
      } catch (parseError) {
        console.warn('[RESUME PARSE] Resume parsing failed (will return empty fields):', parseError);
        // Continue without parsing - user can manually fill in fields
      }
      
      // Build the proper view URL for accessing the resume
      const viewUrl = `/objects/${objectPath}`;
      
      res.status(200).json({
        objectPath,
        viewUrl,  // Add this for proper resume viewing
        firstName: parseResult.firstName || '',
        lastName: parseResult.lastName || '',
        email: parseResult.email || '',
        phone: parseResult.phone || '',
        location: parseResult.location || '',
        skills: parseResult.skills || [],
        resumeText: parseResult.resumeText || '',
        filename: metadata.name,
      });
    } catch (error) {
      console.error("Error processing resume upload:", error);
      res.status(500).json({ error: "Failed to upload resume" });
    }
  });

  // Candidate routes
  app.get('/api/candidates', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const candidates = await storage.listCandidates(user.recruiterId);
      res.json(candidates);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      res.status(500).json({ error: 'Failed to fetch candidates' });
    }
  });

  app.get('/api/candidates/:id', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      // Verify candidate belongs to authenticated recruiter
      if (candidate.recruiterId !== user.recruiterId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      res.json(candidate);
    } catch (error) {
      console.error('Error fetching candidate:', error);
      res.status(500).json({ error: 'Failed to fetch candidate' });
    }
  });

  app.post('/api/candidates', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const candidateData = { ...req.body, recruiterId: user.recruiterId };
      
      // Validate the data
      const validatedData = insertCandidateSchema.parse(candidateData);
      
      const candidate = await storage.createCandidate(validatedData);
      res.json(candidate);
    } catch (error) {
      console.error('Error creating candidate:', error);
      res.status(400).json({ error: 'Failed to create candidate', details: String(error) });
    }
  });

  // Bulk upload candidates - supports both JSON and CSV
  app.post('/api/candidates/bulk', requireAuth, upload.single('csv'), async (req, res) => {
    try {
      let records: any[] = [];
      
      // Handle JSON payload (from CSVUpload component)
      if (req.body.candidates && Array.isArray(req.body.candidates)) {
        records = req.body.candidates;
        if (records.length > 5000) {
          return res.status(400).json({ error: 'Too many records. Maximum 5000 records allowed.' });
        }
      }
      // Handle CSV file upload
      else if (req.file) {
        if (!req.file.mimetype.includes('csv')) {
          return res.status(400).json({ error: 'Only CSV files are allowed for file upload' });
        }
        
        const csvData = req.file.buffer.toString('utf-8');
        const parsedRecords = parse(csvData, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
        
        if (parsedRecords.length > 5000) {
          return res.status(400).json({ error: 'CSV file too large. Maximum 5000 records allowed.' });
        }
        
        records = parsedRecords;
      } else {
        return res.status(400).json({ error: 'Either CSV file or candidates array is required' });
      }

      if (records.length === 0) {
        return res.status(400).json({ error: 'No valid data provided' });
      }

      // Use authenticated user's recruiterId
      const user = (req as any).user;
      const recruiterId = user.recruiterId;

      // Validate recruiter exists
      const recruiter = await storage.getRecruiter(recruiterId);
      if (!recruiter) {
        return res.status(400).json({ error: 'Invalid recruiterId provided' });
      }

      // Validate and transform each record
      const validatedCandidates = [];
      const errors = [];

      for (let i = 0; i < records.length; i++) {
        try {
          const record = records[i] as any;
          
          // Transform data to match schema with required fields validation
          const candidateData = {
            firstName: (record.firstName || record.first_name || '').trim(),
            lastName: (record.lastName || record.last_name || '').trim(), 
            email: (record.email || '').trim(),
            phone: record.phone || '',
            location: record.location || '',
            skills: record.skills ? 
              (Array.isArray(record.skills) ? record.skills : record.skills.split(',').map((s: string) => s.trim())) 
              : [],
            experience: record.experience ? parseInt(record.experience) : undefined,
            summary: record.summary || '',
            currentPosition: record.currentPosition || record.current_position || '',
            currentCompany: record.currentCompany || record.current_company || '',
            recruiterId: recruiterId
          };

          // Enhanced validation
          if (!candidateData.firstName) {
            throw new Error('First name is required');
          }
          if (!candidateData.lastName) {
            throw new Error('Last name is required');  
          }
          if (!candidateData.email) {
            throw new Error('Email is required');
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateData.email)) {
            throw new Error('Invalid email format');
          }

          // Validate the data
          const validatedData = insertCandidateSchema.parse(candidateData);
          validatedCandidates.push(validatedData);
        } catch (error: any) {
          errors.push({ row: i + 1, error: error.message || String(error) });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ 
          message: 'Validation errors in data', 
          details: errors 
        });
      }

      // Create candidates in bulk
      const createdCandidates = await storage.createCandidatesBulk(validatedCandidates);
      
      res.json({ 
        count: createdCandidates.length,
        candidates: createdCandidates
      });
    } catch (error) {
      console.error('Error bulk uploading candidates:', error);
      res.status(500).json({ error: 'Failed to process bulk upload' });
    }
  });

  app.put('/api/candidates/:id', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      // First check if candidate exists and belongs to user's recruiter
      const existingCandidate = await storage.getCandidate(req.params.id);
      if (!existingCandidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      if (existingCandidate.recruiterId !== user.recruiterId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const updates = req.body;
      const candidate = await storage.updateCandidate(req.params.id, updates);
      res.json(candidate);
    } catch (error) {
      console.error('Error updating candidate:', error);
      res.status(400).json({ error: 'Failed to update candidate' });
    }
  });

  app.delete('/api/candidates/:id', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      // First check if candidate exists and belongs to user's recruiter
      const existingCandidate = await storage.getCandidate(req.params.id);
      if (!existingCandidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      if (existingCandidate.recruiterId !== user.recruiterId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const deleted = await storage.deleteCandidate(req.params.id);
      res.json({ success: true, message: 'Candidate deleted successfully' });
    } catch (error) {
      console.error('Error deleting candidate:', error);
      res.status(500).json({ error: 'Failed to delete candidate' });
    }
  });

  // Contact routes
  app.get('/api/candidates/:id/contacts', requireAuth, async (req, res) => {
    try {
      const contacts = await storage.listContactsForCandidate(req.params.id);
      res.json(contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  app.post('/api/contacts', requireAuth, async (req, res) => {
    try {
      const validatedData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(validatedData);
      res.json(contact);
    } catch (error) {
      console.error('Error creating contact:', error);
      res.status(400).json({ error: 'Failed to create contact', details: String(error) });
    }
  });

  // Client routes
  app.get('/api/clients', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      console.log('[LIST CLIENTS] Fetching clients for recruiterId:', user.recruiterId);
      const clients = await storage.listClients(user.recruiterId);
      console.log('[LIST CLIENTS] Found', clients.length, 'clients');
      res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  });

  app.post('/api/clients', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const clientData = { ...req.body, recruiterId: user.recruiterId };
      
      console.log('[CREATE CLIENT] User recruiterId:', user.recruiterId);
      console.log('[CREATE CLIENT] Client data:', clientData);
      
      // Validate the data
      const validatedData = insertClientSchema.parse(clientData);
      
      console.log('[CREATE CLIENT] Validated data:', validatedData);
      
      const client = await storage.createClient(validatedData);
      
      console.log('[CREATE CLIENT] Created client:', client);
      
      res.json(client);
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(400).json({ error: 'Failed to create client', details: String(error) });
    }
  });

  // Bulk upload clients - supports both JSON and CSV
  app.post('/api/clients/bulk', upload.single('csv'), async (req, res) => {
    try {
      let records: any[] = [];
      
      // Handle JSON payload (from CSVUpload component)
      if (req.body.clients && Array.isArray(req.body.clients)) {
        records = req.body.clients;
        if (records.length > 5000) {
          return res.status(400).json({ error: 'Too many records. Maximum 5000 records allowed.' });
        }
      }
      // Handle CSV file upload
      else if (req.file) {
        if (!req.file.mimetype.includes('csv')) {
          return res.status(400).json({ error: 'Only CSV files are allowed for file upload' });
        }
        
        const csvData = req.file.buffer.toString('utf-8');
        const parsedRecords = parse(csvData, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
        
        if (parsedRecords.length > 5000) {
          return res.status(400).json({ error: 'CSV file too large. Maximum 5000 records allowed.' });
        }
        
        records = parsedRecords;
      } else {
        return res.status(400).json({ error: 'Either CSV file or clients array is required' });
      }

      if (records.length === 0) {
        return res.status(400).json({ error: 'No valid data provided' });
      }

      // Use authenticated user's recruiterId
      const user = (req as any).user;
      const recruiterId = user.recruiterId;

      // Validate recruiter exists
      const recruiter = await storage.getRecruiter(recruiterId);
      if (!recruiter) {
        return res.status(400).json({ error: 'Invalid recruiterId provided' });
      }

      // Validate and transform each record
      const validatedClients = [];
      const errors = [];

      for (let i = 0; i < records.length; i++) {
        try {
          const record = records[i] as any;
          
          // Transform data to match schema with required fields validation
          const clientData = {
            companyName: (record.name || record.company_name || record.companyName || '').trim(),
            contactName: (record.contactName || record.contact_name || '').trim(),
            contactEmail: (record.contactEmail || record.contact_email || record.email || '').trim(),
            contactPhone: record.contactPhone || record.contact_phone || record.phone || '',
            address: record.address || '',
            website: record.website || '',
            notes: record.notes || '',
            recruiterId: recruiterId
          };

          // Enhanced validation
          if (!clientData.companyName) {
            throw new Error('Company name is required');
          }
          if (!clientData.contactName) {
            throw new Error('Contact name is required');  
          }
          if (!clientData.contactEmail) {
            throw new Error('Contact email is required');
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.contactEmail)) {
            throw new Error('Invalid email format');
          }

          // Validate the data
          const validatedData = insertClientSchema.parse(clientData);
          validatedClients.push(validatedData);
        } catch (error: any) {
          errors.push({ row: i + 1, error: error.message || String(error) });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ 
          message: 'Validation errors in data', 
          details: errors 
        });
      }

      // Create clients in bulk
      const createdClients = await storage.createClientsBulk(validatedClients);
      
      res.json({ 
        count: createdClients.length,
        clients: createdClients
      });
    } catch (error) {
      console.error('Error bulk uploading clients:', error);
      res.status(500).json({ error: 'Failed to process bulk upload' });
    }
  });

  app.put('/api/clients/:id', async (req, res) => {
    try {
      const updates = req.body;
      
      // If uploading a signed agreement, set the signed date automatically
      if (updates.signedAgreementUrl && !updates.agreementSigned) {
        updates.agreementSigned = new Date();
      }
      
      const client = await storage.updateClient(req.params.id, updates);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json(client);
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(400).json({ error: 'Failed to update client' });
    }
  });

  app.delete('/api/clients/:id', async (req, res) => {
    try {
      const deleted = await storage.deleteClient(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json({ success: true, message: 'Client deleted successfully' });
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({ error: 'Failed to delete client' });
    }
  });

  // Client employees routes
  app.get('/api/clients/:clientId/employees', requireAuth, async (req, res) => {
    try {
      const employees = await storage.listClientEmployees(req.params.clientId);
      res.json(employees);
    } catch (error) {
      console.error('Error fetching client employees:', error);
      res.status(500).json({ error: 'Failed to fetch client employees' });
    }
  });

  app.post('/api/clients/:clientId/employees', requireAuth, async (req, res) => {
    try {
      const employeeData = { ...req.body, clientId: req.params.clientId };
      const validatedData = insertClientEmployeeSchema.parse(employeeData);
      const employee = await storage.createClientEmployee(validatedData);
      res.json(employee);
    } catch (error) {
      console.error('Error creating client employee:', error);
      res.status(400).json({ error: 'Failed to create client employee', details: String(error) });
    }
  });

  app.put('/api/clients/:clientId/employees/:id', requireAuth, async (req, res) => {
    try {
      const employee = await storage.updateClientEmployee(req.params.id, req.body);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json(employee);
    } catch (error) {
      console.error('Error updating client employee:', error);
      res.status(400).json({ error: 'Failed to update client employee' });
    }
  });

  app.delete('/api/clients/:clientId/employees/:id', requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteClientEmployee(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (error) {
      console.error('Error deleting client employee:', error);
      res.status(500).json({ error: 'Failed to delete client employee' });
    }
  });

  // Position routes
  app.get('/api/positions', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const clientId = req.query.clientId as string;
      const positions = await storage.listPositions(clientId);
      res.json(positions);
    } catch (error) {
      console.error('Error fetching positions:', error);
      res.status(500).json({ error: 'Failed to fetch positions' });
    }
  });

  app.post('/api/positions', async (req, res) => {
    try {
      const validatedData = insertPositionSchema.parse(req.body);
      const position = await storage.createPosition(validatedData);
      res.json(position);
    } catch (error) {
      console.error('Error creating position:', error);
      res.status(400).json({ error: 'Failed to create position', details: String(error) });
    }
  });

  app.put('/api/positions/:id', async (req, res) => {
    try {
      const updates = req.body;
      const position = await storage.updatePosition(req.params.id, updates);
      if (!position) {
        return res.status(404).json({ error: 'Position not found' });
      }
      res.json(position);
    } catch (error) {
      console.error('Error updating position:', error);
      res.status(400).json({ error: 'Failed to update position' });
    }
  });

  app.delete('/api/positions/:id', async (req, res) => {
    try {
      const deleted = await storage.deletePosition(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Position not found' });
      }
      res.json({ success: true, message: 'Position deleted successfully' });
    } catch (error) {
      console.error('Error deleting position:', error);
      res.status(500).json({ error: 'Failed to delete position' });
    }
  });

  // Application routes
  app.get('/api/applications', async (req, res) => {
    try {
      const recruiterId = req.query.recruiterId as string;
      const positionId = req.query.positionId as string;
      
      if (positionId) {
        // Fetch applications for a specific position with candidate data
        const applications = await storage.listApplicationsForPosition(positionId);
        res.json(applications);
      } else {
        // Fetch all applications (optionally filtered by recruiter)
        const applications = await storage.listApplications(recruiterId);
        res.json(applications);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({ error: 'Failed to fetch applications' });
    }
  });

  app.get('/api/applications/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const application = await storage.getApplicationById(id);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      res.json(application);
    } catch (error) {
      console.error('Error fetching application:', error);
      res.status(500).json({ error: 'Failed to fetch application' });
    }
  });

  app.post('/api/applications', async (req, res) => {
    try {
      const result = insertApplicationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: result.error.errors
        });
      }
      const application = await storage.createApplication(result.data);
      res.status(201).json(application);
    } catch (error) {
      console.error('Error creating application:', error);
      res.status(500).json({ error: 'Failed to create application' });
    }
  });

  app.put('/api/applications/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = insertApplicationSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: result.error.errors
        });
      }
      const application = await storage.updateApplication(id, result.data);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      res.json(application);
    } catch (error) {
      console.error('Error updating application:', error);
      res.status(500).json({ error: 'Failed to update application' });
    }
  });

  app.put('/api/applications/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      const application = await storage.updateApplicationStatus(id, status);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      res.json(application);
    } catch (error) {
      console.error('Error updating application status:', error);
      res.status(500).json({ error: 'Failed to update application status' });
    }
  });

  app.delete('/api/applications/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteApplication(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting application:', error);
      res.status(500).json({ error: 'Failed to delete application' });
    }
  });

  // Send candidate submission email to hiring manager
  app.post('/api/send-candidate-submission', requireAuth, async (req, res) => {
    try {
      const { candidateId, positionId, clientId, recipientEmail, additionalNotes } = req.body;

      if (!candidateId || !positionId || !clientId || !recipientEmail) {
        return res.status(400).json({ 
          error: 'Missing required fields: candidateId, positionId, clientId, recipientEmail' 
        });
      }

      // Fetch candidate, position, and client data
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      const position = await storage.getPosition(positionId);
      if (!position) {
        return res.status(404).json({ error: 'Position not found' });
      }

      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Import email functions
      const { getCandidateSubmissionTemplate, sendEmailWithAttachment } = await import('./email');
      
      // Create email template
      const emailTemplate = getCandidateSubmissionTemplate(
        `${candidate.firstName} ${candidate.lastName}`,
        candidate.email,
        candidate.phone || '',
        candidate.currentPosition || '',
        candidate.currentCompany || '',
        candidate.skills || [],
        position.title,
        client.companyName,
        additionalNotes || ''
      );

      // If candidate has a resume, fetch it and attach
      let attachment;
      if (candidate.resumeUrl) {
        try {
          const objectStorageService = new ObjectStorageService();
          const resumeBuffer = await objectStorageService.getObjectBuffer(candidate.resumeUrl);
          
          // Extract filename from resumeUrl (e.g., ".private/resume-abc123.pdf")
          const filename = candidate.resumeUrl.split('/').pop() || 'resume.pdf';
          
          attachment = {
            filename: filename,
            content: resumeBuffer,
          };
        } catch (error) {
          console.error('Error fetching resume for attachment:', error);
          // Continue without attachment if resume fetch fails
        }
      }

      // Send email
      const result = await sendEmailWithAttachment(recipientEmail, emailTemplate, attachment);

      if (!result.success) {
        return res.status(500).json({ error: result.error || 'Failed to send email' });
      }

      res.json({ 
        success: true, 
        messageId: result.messageId,
        message: 'Candidate submission sent successfully' 
      });
    } catch (error) {
      console.error('Error sending candidate submission:', error);
      res.status(500).json({ error: 'Failed to send candidate submission' });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const recruiterId = user.recruiterId;
      const stats = await storage.getDashboardStats(recruiterId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
  });

  // Interview routes
  app.get('/api/interviews', async (req, res) => {
    try {
      const recruiterId = req.query.recruiterId as string;
      const interviews = await storage.listInterviews(recruiterId);
      res.json(interviews);
    } catch (error) {
      console.error('Error fetching interviews:', error);
      res.status(500).json({ error: 'Failed to fetch interviews' });
    }
  });

  app.get('/api/interviews/:id', async (req, res) => {
    try {
      const interview = await storage.getInterview(req.params.id);
      if (!interview) {
        return res.status(404).json({ error: 'Interview not found' });
      }
      res.json(interview);
    } catch (error) {
      console.error('Error fetching interview:', error);
      res.status(500).json({ error: 'Failed to fetch interview' });
    }
  });

  app.post('/api/interviews', async (req, res) => {
    try {
      // Convert scheduledDate/endDate strings to Date objects if needed
      const data = { ...req.body };
      if (data.scheduledDate && typeof data.scheduledDate === 'string') {
        data.scheduledDate = new Date(data.scheduledDate);
      }
      if (data.endDate && typeof data.endDate === 'string') {
        data.endDate = new Date(data.endDate);
      }
      
      const validatedData = insertInterviewSchema.parse(data);
      const interview = await storage.createInterview(validatedData);
      res.json(interview);
    } catch (error) {
      console.error('Error creating interview:', error);
      res.status(400).json({ error: 'Failed to create interview', details: String(error) });
    }
  });

  app.put('/api/interviews/:id', async (req, res) => {
    try {
      // Convert scheduledDate/endDate strings to Date objects if needed
      const data = { ...req.body };
      if (data.scheduledDate && typeof data.scheduledDate === 'string') {
        data.scheduledDate = new Date(data.scheduledDate);
      }
      if (data.endDate && typeof data.endDate === 'string') {
        data.endDate = new Date(data.endDate);
      }
      
      const validatedData = insertInterviewSchema.partial().parse(data);
      const interview = await storage.updateInterview(req.params.id, validatedData);
      if (!interview) {
        return res.status(404).json({ error: 'Interview not found' });
      }
      res.json(interview);
    } catch (error) {
      console.error('Error updating interview:', error);
      res.status(400).json({ error: 'Failed to update interview', details: String(error) });
    }
  });

  app.delete('/api/interviews/:id', async (req, res) => {
    try {
      const deleted = await storage.deleteInterview(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Interview not found' });
      }
      res.json({ success: true, message: 'Interview deleted successfully' });
    } catch (error) {
      console.error('Error deleting interview:', error);
      res.status(500).json({ error: 'Failed to delete interview' });
    }
  });

  // Interview calendar sync routes
  app.post('/api/interviews/:id/sync-calendar', async (req, res) => {
    try {
      const { id } = req.params;
      const interview = await storage.getInterview(id);
      
      if (!interview) {
        return res.status(404).json({ error: 'Interview not found' });
      }

      // Import outlook module dynamically
      const { createCalendarEvent } = await import('./outlook');
      
      // Get application and candidate details for the event
      const application = await storage.getApplicationById(interview.applicationId);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      const candidate = await storage.getCandidate(application.candidateId);
      const position = await storage.getPosition(application.positionId);
      
      if (!candidate || !position) {
        return res.status(404).json({ error: 'Candidate or position not found' });
      }

      const candidateName = `${candidate.firstName} ${candidate.lastName}`;

      // Calculate end time (default to 1 hour if not specified)
      const startDate = new Date(interview.scheduledDate);
      const endDate = interview.endDate ? new Date(interview.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);

      // Create calendar event
      const eventData = {
        subject: `Interview: ${candidateName} - ${position.title}`,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: 'UTC'
        },
        location: interview.location ? { displayName: interview.location } : undefined,
        body: {
          contentType: 'HTML' as const,
          content: `
            <h3>Interview Details</h3>
            <p><strong>Candidate:</strong> ${candidateName}</p>
            <p><strong>Position:</strong> ${position.title}</p>
            <p><strong>Interviewer:</strong> ${interview.interviewerName || 'TBD'}</p>
            ${interview.notes ? `<p><strong>Notes:</strong> ${interview.notes}</p>` : ''}
          `
        },
        attendees: [
          ...(candidate.email ? [{
            emailAddress: { address: candidate.email, name: candidateName },
            type: 'required' as const
          }] : []),
          ...(interview.interviewerEmail ? [{
            emailAddress: { address: interview.interviewerEmail, name: interview.interviewerName || '' },
            type: 'required' as const
          }] : [])
        ]
      };

      const result = await createCalendarEvent(eventData);

      if (result.success && result.eventId) {
        // Update interview with Outlook event ID
        await storage.updateInterview(id, { outlookEventId: result.eventId });
        res.json({ success: true, eventId: result.eventId, message: 'Calendar event created successfully' });
      } else {
        res.status(500).json({ success: false, error: result.error || 'Failed to create calendar event' });
      }
    } catch (error) {
      console.error('Error syncing interview to calendar:', error);
      res.status(500).json({ error: 'Failed to sync interview to calendar', details: String(error) });
    }
  });

  app.put('/api/interviews/:id/update-calendar', async (req, res) => {
    try {
      const { id } = req.params;
      const interview = await storage.getInterview(id);
      
      if (!interview || !interview.outlookEventId) {
        return res.status(404).json({ error: 'Interview or calendar event not found' });
      }

      const { updateCalendarEvent } = await import('./outlook');

      const startDate = new Date(interview.scheduledDate);
      const endDate = interview.endDate ? new Date(interview.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);

      const updates = {
        start: {
          dateTime: startDate.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: 'UTC'
        },
        location: interview.location ? { displayName: interview.location } : undefined
      };

      const result = await updateCalendarEvent(interview.outlookEventId, updates);

      if (result.success) {
        res.json({ success: true, message: 'Calendar event updated successfully' });
      } else {
        res.status(500).json({ success: false, error: result.error || 'Failed to update calendar event' });
      }
    } catch (error) {
      console.error('Error updating calendar event:', error);
      res.status(500).json({ error: 'Failed to update calendar event', details: String(error) });
    }
  });

  app.delete('/api/interviews/:id/delete-calendar', async (req, res) => {
    try {
      const { id } = req.params;
      const interview = await storage.getInterview(id);
      
      if (!interview || !interview.outlookEventId) {
        return res.status(404).json({ error: 'Interview or calendar event not found' });
      }

      const { deleteCalendarEvent } = await import('./outlook');
      const result = await deleteCalendarEvent(interview.outlookEventId);

      if (result.success) {
        // Clear the outlook event ID from interview
        await storage.updateInterview(id, { outlookEventId: null });
        res.json({ success: true, message: 'Calendar event deleted successfully' });
      } else {
        res.status(500).json({ success: false, error: result.error || 'Failed to delete calendar event' });
      }
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      res.status(500).json({ error: 'Failed to delete calendar event', details: String(error) });
    }
  });

  // External Integration routes (Precision Source Management)
  app.post('/api/integration/psm/sync-position/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const position = await storage.getPosition(id);
      if (!position) {
        return res.status(404).json({ error: 'Position not found' });
      }
      
      const result = await PrecisionSourceIntegration.syncPositionToPSM(position);
      if (result.success) {
        res.json({ success: true, psmId: result.psmId, message: 'Position synced to PSM successfully' });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error syncing position to PSM:', error);
      res.status(500).json({ error: 'Failed to sync position to PSM' });
    }
  });

  app.post('/api/integration/psm/generate-agreement/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      const result = await PrecisionSourceIntegration.generateAgreementUrl(client);
      if (result.success) {
        res.json({ 
          success: true, 
          agreementUrl: result.agreementUrl, 
          agreementText: result.agreementText,
          message: 'Agreement generated successfully' 
        });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error generating agreement:', error);
      res.status(500).json({ error: 'Failed to generate agreement' });
    }
  });

  app.post('/api/integration/psm/webhooks/position', async (req, res) => {
    try {
      const result = await PrecisionSourceIntegration.processPositionWebhook(req.body);
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error processing PSM position webhook:', error);
      res.status(500).json({ error: 'Failed to process position webhook' });
    }
  });

  app.post('/api/integration/psm/webhooks/agreement', async (req, res) => {
    try {
      const result = await PrecisionSourceIntegration.processAgreementWebhook(req.body);
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error processing PSM agreement webhook:', error);
      res.status(500).json({ error: 'Failed to process agreement webhook' });
    }
  });

  app.get('/api/integration/psm/status', async (req, res) => {
    try {
      const status = PrecisionSourceIntegration.getIntegrationStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting PSM integration status:', error);
      res.status(500).json({ error: 'Failed to get integration status' });
    }
  });

  // Email outreach routes
  app.post('/api/email/send', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const recruiterId = (req as any).user?.recruiterId;
      
      const emailData = insertEmailOutreachSchema.parse({
        ...req.body,
        recruiterId
      });
      
      const result = await storage.sendEmailToCandidate(emailData);
      
      if (result.success) {
        res.json({ success: true, email: result.email });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  app.get('/api/candidates/:id/emails', requireAuth, async (req, res) => {
    try {
      const recruiterId = (req as any).user?.recruiterId;
      const emails = await storage.getCandidateEmails(req.params.id, recruiterId);
      res.json(emails);
    } catch (error) {
      console.error('Error fetching candidate emails:', error);
      res.status(500).json({ error: 'Failed to fetch candidate emails' });
    }
  });

  app.get('/api/emails', requireAuth, async (req, res) => {
    try {
      const recruiterId = (req as any).user?.recruiterId;
      const emails = await storage.getAllEmails(recruiterId);
      res.json(emails);
    } catch (error) {
      console.error('Error fetching emails:', error);
      res.status(500).json({ error: 'Failed to fetch emails' });
    }
  });

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}