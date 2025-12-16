import { GoogleGenAI, Type } from "@google/genai";

export async function generateVariations(
  existingOptions: string[],
  context: string
): Promise<string[]> {
  
  // 1. Check for AI Studio Key Selection Environment
  // This handles the "API Key not configured" error by ensuring a key is selected in supported environments.
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

  try {
    // 2. Initialize Client
    // Safe access to API Key to avoid ReferenceErrors if process is undefined in certain build environments
    let apiKey = '';
    try {
      if (typeof process !== 'undefined' && process.env) {
        apiKey = process.env.API_KEY || '';
      }
    } catch (e) {
      // Ignore reference errors
    }
    
    // Explicitly check for API key if not in AI Studio (where it might be injected late)
    if (!apiKey && !win.aistudio) {
        throw new Error("API Key not found. If deployed, please set the API_KEY environment variable.");
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
    const msg = error.message || '';
    if (msg.includes("API Key") || msg.includes("403") || msg.includes("not found")) {
      if (win.aistudio) {
         try {
             await win.aistudio.openSelectKey();
         } catch {}
         throw new Error("API Key refreshed. Please try again.");
      }
    }
    throw error;
  }
}
