// Referenced from javascript_openai integration blueprint
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function getOpenAIClient() {
  return openai;
}

export interface ParsedResume {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  skills: string[];
  resumeText: string;
}

/**
 * Parses a resume PDF and extracts contact information, skills, and text content
 * @param pdfText - The extracted text from the PDF
 * @returns Parsed resume with contact info, skills array, and full text
 */
export async function parseResume(pdfText: string): Promise<ParsedResume> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content:
            "You are a resume parsing expert. Analyze the resume text and extract the candidate's contact information and skills. Return a JSON object with these fields: 'firstName', 'lastName', 'email', 'phone', 'location' (city/state or full address), 'skills' (array of unique skill names, no duplicates, 1-3 words each), and 'resumeText' (the full resume text). If any field is not found, omit it or set it to null.",
        },
        {
          role: "user",
          content: `Parse this resume and extract all information:\n\n${pdfText}`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    console.log('[OpenAI] Raw AI response:', JSON.stringify(result, null, 2));

    const parsedData = {
      firstName: result.firstName || undefined,
      lastName: result.lastName || undefined,
      email: result.email || undefined,
      phone: result.phone || undefined,
      location: result.location || undefined,
      skills: Array.isArray(result.skills) ? result.skills : [],
      resumeText: result.resumeText || pdfText,
    };
    
    console.log('[OpenAI] Parsed data being returned:', {
      firstName: parsedData.firstName,
      lastName: parsedData.lastName,
      email: parsedData.email,
      phone: parsedData.phone,
      location: parsedData.location,
      skillsCount: parsedData.skills.length
    });

    return parsedData;
  } catch (error) {
    console.error("Failed to parse resume with OpenAI:", error);
    throw new Error("Failed to parse resume: " + (error as Error).message);
  }
}
