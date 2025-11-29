
import { GoogleGenAI, Type } from "@google/genai";

export interface GenerateOptionsResult {
  options: string[];
  error?: string;
}

export async function generateCreativeOptions(userPrompt: string, count: number = 5, currentContext: string[] = []): Promise<GenerateOptionsResult> {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return { options: [], error: "API Key not configured." };
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Construct a prompt that includes the user's request and potentially some context
    let fullPrompt = `User Request: "${userPrompt}"\n`;
    
    if (currentContext.length > 0) {
        fullPrompt += `Current existing options (for context/style reference): ${currentContext.slice(0, 5).join(', ')}...\n`;
    }
    
    fullPrompt += `Generate exactly ${count} distinct, creative variations. Keep them short (under 10 words each).`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: `A list of exactly ${count} creative short text options based on the user request.`
                }
            }
        },
        systemInstruction: "You are a creative writing assistant for a prompt engineering tool. Your task is to generate short, concise, and creative text options based on the user's request. Return ONLY the list of strings."
      }
    });

    // Access the text property directly (it is a getter, not a function)
    const responseText = response.text;
    
    if (!responseText) {
        return { options: [], error: "No response from AI." };
    }

    const parsed = JSON.parse(responseText);
    
    if (parsed.options && Array.isArray(parsed.options)) {
        return { options: parsed.options };
    }
    
    return { options: [], error: "Invalid format returned." };

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return { options: [], error: error.message || "Unknown error occurred." };
  }
}
