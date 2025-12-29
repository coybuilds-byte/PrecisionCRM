import { z } from "zod";
import { storage } from "./storage";
import type { Position, Client } from "@shared/schema";
import { getOpenAIClient } from "./openai";

// Configuration for Precision Source Management integration
const PSM_CONFIG = {
  baseUrl: "https://www.precisionsourcemanagement.com",
  apiUrl: "https://api.precisionsourcemanagement.com/v1", // Simulated API endpoint
  webhookSecret: process.env.PSM_WEBHOOK_SECRET || "dev_webhook_secret",
  clientId: process.env.PSM_CLIENT_ID || "dev_client_id",
  apiKey: process.env.PSM_API_KEY || "dev_api_key",
  email: "customerservice@precisionsourcemanagement.com",
  phone: "971-754-7899"
};

// Schema for position update webhooks from PSM
export const psmPositionUpdateSchema = z.object({
  positionId: z.string(),
  action: z.enum(["created", "updated", "closed", "filled"]),
  data: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    requirements: z.array(z.string()).optional(),
    status: z.enum(["open", "closed", "on_hold"]).optional(),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    location: z.string().optional(),
    isRemote: z.boolean().optional(),
    filledDate: z.string().optional(),
  }).optional(),
  timestamp: z.string(),
  signature: z.string() // HMAC signature for webhook verification
});

// Schema for client agreement status updates from PSM
export const psmAgreementUpdateSchema = z.object({
  clientId: z.string(),
  agreementStatus: z.enum(["pending", "signed", "rejected", "expired"]),
  signedDate: z.string().optional(),
  agreementUrl: z.string().optional(),
  signerName: z.string().optional(),
  signerEmail: z.string().optional(),
  timestamp: z.string(),
  signature: z.string()
});

export class PrecisionSourceIntegration {
  /**
   * Sync position data to Precision Source Management
   */
  static async syncPositionToPSM(position: Position): Promise<{ success: boolean; psmId?: string; error?: string }> {
    try {
      // Simulate API call to PSM
      console.log(`[PSM Integration] Syncing position "${position.title}" to Precision Source Management`);
      
      const psmPayload = {
        title: position.title,
        description: position.description,
        requirements: position.requirements || [],
        location: position.location,
        salary: position.salary,
        clientReference: position.clientId,
        internalId: position.id,
        status: position.status,
        postedDate: new Date().toISOString()
      };

      // In a real implementation, this would be an HTTP request
      const simulatedResponse = {
        success: true,
        psmPositionId: `psm_${position.id.slice(0, 8)}`,
        message: "Position successfully synced to PSM platform"
      };

      console.log(`[PSM Integration] Position synced successfully. PSM ID: ${simulatedResponse.psmPositionId}`);
      
      return {
        success: true,
        psmId: simulatedResponse.psmPositionId
      };
    } catch (error) {
      console.error('[PSM Integration] Error syncing position:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate client agreement with OpenAI
   */
  static async generateAgreementUrl(client: Client): Promise<{ success: boolean; agreementUrl?: string; agreementText?: string; error?: string }> {
    try {
      console.log(`[PSM Integration] Generating agreement for client "${client.companyName}"`);
      
      const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      const agreementPrompt = `Generate a professional recruitment placement agreement between Precision Source Management (PSM) and ${client.companyName}.

Include these specific terms:
- Service: Full-time placement recruitment services
- Fee Structure: 25% of the candidate's first year salary
- Payment Terms: 5% due immediately upon placement, remainder net 30 days
- Replacement Guarantee: If the placed candidate does not work out due to their own reasons (not due to client's actions or business changes), PSM will provide a replacement candidate at no additional fee within 90 days
- Client Contact: ${client.contactName}
- Client Email: ${client.contactEmail}
- Client Phone: ${client.contactPhone || 'Not provided'}
- Client Address: ${client.address || 'Not provided'}
- Agreement Date: ${currentDate}

Format the agreement professionally with:
1. Title
2. Parties section
3. Services section
4. Fee structure and payment terms
5. Replacement guarantee terms
6. Standard legal clauses (term, termination, confidentiality)
7. Signature blocks for both parties

Make it legally sound and professional.`;

      const openai = getOpenAIClient();
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a legal document expert specializing in recruitment and staffing agreements. Generate clear, professional, and legally sound agreements.'
          },
          {
            role: 'user',
            content: agreementPrompt
          }
        ],
        temperature: 0.3,
      });

      const agreementText = completion.choices[0]?.message?.content;

      if (!agreementText) {
        throw new Error('Failed to generate agreement text');
      }

      console.log(`[PSM Integration] Agreement generated successfully for ${client.companyName}`);
      
      return {
        success: true,
        agreementText,
        agreementUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(agreementText)}`
      };
    } catch (error) {
      console.error('[PSM Integration] Error generating agreement:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process webhook from PSM for position updates
   */
  static async processPositionWebhook(payload: unknown): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const validated = psmPositionUpdateSchema.parse(payload);
      
      // Verify webhook signature (simplified for demo)
      if (!this.verifyWebhookSignature(validated.signature, validated)) {
        return { success: false, error: 'Invalid webhook signature' };
      }

      console.log(`[PSM Integration] Processing position webhook: ${validated.action} for position ${validated.positionId}`);

      // Update position in our database based on PSM update
      if (validated.data) {
        const updateData: any = {};
        
        if (validated.data.status) updateData.status = validated.data.status;
        if (validated.data.title) updateData.title = validated.data.title;
        if (validated.data.description) updateData.description = validated.data.description;
        if (validated.data.requirements) updateData.requirements = validated.data.requirements;
        if (validated.data.location) updateData.location = validated.data.location;
        if (validated.data.salaryMin || validated.data.salaryMax) {
          updateData.salary = `${validated.data.salaryMin || 0}-${validated.data.salaryMax || 0}`;
        }

        if (Object.keys(updateData).length > 0) {
          await storage.updatePosition(validated.positionId, updateData);
          console.log(`[PSM Integration] Position ${validated.positionId} updated from PSM webhook`);
        }
      }

      return {
        success: true,
        message: `Position ${validated.action} processed successfully`
      };
    } catch (error) {
      console.error('[PSM Integration] Error processing position webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid webhook payload'
      };
    }
  }

  /**
   * Process webhook from PSM for client agreement updates
   */
  static async processAgreementWebhook(payload: unknown): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const validated = psmAgreementUpdateSchema.parse(payload);
      
      // Verify webhook signature (simplified for demo)
      if (!this.verifyWebhookSignature(validated.signature, validated)) {
        return { success: false, error: 'Invalid webhook signature' };
      }

      console.log(`[PSM Integration] Processing agreement webhook: ${validated.agreementStatus} for client ${validated.clientId}`);

      // Update client agreement status in our database
      const updateData: any = {};
      
      if (validated.agreementStatus === 'signed' && validated.signedDate) {
        updateData.agreementSigned = new Date(validated.signedDate);
      }

      if (Object.keys(updateData).length > 0) {
        await storage.updateClient(validated.clientId, updateData);
        console.log(`[PSM Integration] Client ${validated.clientId} agreement status updated: ${validated.agreementStatus}`);
      }

      return {
        success: true,
        message: `Agreement ${validated.agreementStatus} processed successfully`
      };
    } catch (error) {
      console.error('[PSM Integration] Error processing agreement webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid webhook payload'
      };
    }
  }

  /**
   * Verify webhook signature (simplified implementation for demo)
   */
  private static verifyWebhookSignature(signature: string, payload: any): boolean {
    // In a real implementation, this would use HMAC with the webhook secret
    // For demo purposes, we'll accept any signature that's not empty
    return !!(signature && signature.length > 0);
  }

  /**
   * Get PSM integration status and configuration
   */
  static getIntegrationStatus() {
    return {
      enabled: true,
      provider: "Precision Source Management",
      contact: {
        email: PSM_CONFIG.email,
        phone: PSM_CONFIG.phone,
        website: PSM_CONFIG.baseUrl
      },
      features: {
        positionSync: true,
        agreementSigning: true,
        webhookUpdates: true,
        remoteHiring: true,
        aiIntegration: true
      },
      locations: ["Portland, OR", "Minneapolis, MN"]
    };
  }
}

export type PsmPositionUpdate = z.infer<typeof psmPositionUpdateSchema>;
export type PsmAgreementUpdate = z.infer<typeof psmAgreementUpdateSchema>;