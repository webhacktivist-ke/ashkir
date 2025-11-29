import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Safety check for process.env to prevent app crash in browser environments
const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : 'DUMMY_KEY';

// Initialize the API client
const ai = new GoogleGenAI({ apiKey });

export const getGameAssistantResponse = async (
  query: string,
  history: { role: 'user' | 'model'; text: string }[]
): Promise<string> => {
  try {
    if (apiKey === 'DUMMY_KEY') {
        return "DundaBot is initializing... (API Key missing)";
    }

    const model = 'gemini-2.5-flash';
    
    // Construct a context-aware prompt
    const systemInstruction = `You are 'DundaBot', the AI assistant for 'Dundabets', a crash-style betting game popular in Kenya.
    Currency is KSH (Kenyan Shilling).
    Tone: Energetic, witty, and helpful. Use Kenyan slang occasionally (like "Sasa", "Msee", "Dunda").
    Role: Explain rules, calculate potential winnings, or give fun (but strictly disclaimer-heavy) predictions.
    Rules: 
    1. The plane flies, multiplier increases.
    2. Cash out before it flies away (crashes).
    3. If it crashes first, you lose the bet.
    DISCLAIMER: Always remind users that this is a game of chance and results are random. Never guarantee a win.
    `;

    // Map history to simple content structure
    const contents = [
      { role: 'user', parts: [{ text: `Previous conversation:\n${history.map(h => `${h.role}: ${h.text}`).join('\n')}\n\nCurrent Query: ${query}` }] }
    ];

    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: contents.map(c => ({ role: 'user', parts: c.parts })),
      config: {
        systemInstruction: systemInstruction,
        maxOutputTokens: 200,
      }
    });

    return response.text || "Oops, DundaBot is offline nicely right now!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Eish! My connection is erratic. Try again msee.";
  }
};