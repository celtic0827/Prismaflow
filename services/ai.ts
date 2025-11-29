import { GoogleGenAI, Type } from "@google/genai";

export async function generateVariations(
  existingOptions: string[],
  context: string
): Promise<string[]> {
  
  // 1. Check for AI Studio Key Selection Environment
  // This handles the "API Key not configured" error by ensuring a key is selected in supported environments.
  // Cast window to any to avoid TypeScript errors with conflicting global types for aistudio.
  const win = window as any;

  if (win.aistudio) {
    try {
      const hasKey = await win.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await win.aistudio.openSelectKey();
      }
    } catch (e) {
      console.warn("AI Studio Key Selection check failed:", e);
    }
  }

  // 2. Initialize Client
  // Initialize INSIDE the function to ensure process.env is populated at runtime.
  // Using process.env.API_KEY directly as required.
  const apiKey = process.env.API_KEY;
  
  // If API key is still missing after the selection flow, we cannot proceed.
  // We throw a specific error that the UI can catch.
  if (!apiKey) {
    throw new Error("API Key not configured. Please ensure you have selected a valid API key.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // 3. Construct Prompt
  const prompt = `
    You are a creative assistant for a prompt engineering tool.
    
    Task: Generate 5 new, distinct options for a randomizer block.
    Context/Input: "${context}"
    Existing Options (Avoid Duplicates): ${existingOptions.join(', ')}
    
    Requirements:
    - Return ONLY a raw JSON array of strings.
    - Keep items concise (1-5 words).
    - Match the tone of the input.
    - Do not include the original context in the output.
  `;

  // 4. Call API
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as string[];

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // 5. Handle Key Expiry/Auth Errors
    // If the key is invalid, prompt the user to select again.
    if (error.message?.includes("Requested entity was not found") || error.message?.includes("403")) {
      if (win.aistudio) {
         await win.aistudio.openSelectKey();
         throw new Error("API Key refreshed. Please try again.");
      }
    }
    throw error;
  }
}