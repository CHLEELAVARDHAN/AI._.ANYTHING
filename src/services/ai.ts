import { GoogleGenAI, ThinkingLevel, Modality, Type } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;

const MODELS = [
  "gemini-3.1-pro-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-3.1-flash-lite-preview"
];

export async function generateAIResponse(
  prompt: string, 
  history: any[] = [], 
  options: {
    systemInstruction?: string;
    useThinking?: boolean;
    useSearch?: boolean;
    searchEngine?: 'google' | 'yahoo' | 'duckduckgo';
    useMaps?: boolean;
    location?: { latitude: number; longitude: number };
    files?: { data: string; mimeType: string }[];
  } = {}
) {
  const { 
    systemInstruction = "", 
    useThinking = false, 
    useSearch = false, 
    searchEngine = 'google',
    useMaps = false, 
    location, 
    files = [] 
  } = options;
  
  let modelsToTry = [MODELS[0], MODELS[1], MODELS[4], MODELS[2]];
  if (useMaps) modelsToTry = ["gemini-3-flash-preview", "gemini-3.1-pro-preview"]; 
  else if (useSearch) modelsToTry = ["gemini-3-flash-preview", "gemini-3.1-pro-preview", "gemini-2.5-flash"];

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const config: any = {
    systemInstruction: systemInstruction + 
      (useThinking ? `\n\n[EXTENDED DEEP THINKING MODE ACTIVE]\nYou must solve the user's problem by thinking deeply and understanding the root cause. You must evaluate all edge cases, verify your logic step-by-step, and guarantee a robust, completely error-free solution before providing the final answer. Prioritize absolute accuracy and stability over brevity. Ensure that you have explored multiple facets of the problem before deciding on the best possible solution. You are an expert at eliminating bugs and errors.` : "") +
      (useSearch ? `\n\nUser preferred search engine: ${searchEngine}. When providing search results, prioritize information as it would appear on ${searchEngine}.` : "") +
      `\n\nWhen the user asks for a diagram, sketch, or graphical representation (e.g., "Gimme the diagram for this in detailed"), you MUST provide a detailed Mermaid diagram using mermaid code blocks (e.g., \`\`\`mermaid ... \`\`\`). Use appropriate diagram types like flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram, or gantt to represent the information clearly. Ensure the diagram is detailed and easy to understand. IMPORTANT: Always wrap node labels and text in double quotes if they contain special characters like &, =, <, >, or spaces (e.g., A["Label with & and ="]). Avoid using reserved words as node IDs.` +
      `\n\nFor data visualizations (charts, graphs), you MUST provide a JSON block with the language label "chart". The JSON must be STRICTLY valid. Follow this structure:
{
  "type": "bar" | "line" | "area" | "pie",
  "data": Array of objects (e.g., [{ "name": "Jan", "value": 400 }]),
  "title": "Visualization Title",
  "is3D": boolean
}
CRITICAL: Do NOT include trailing commas. Do NOT use literal newlines inside strings (use \\n). Ensure all keys are double-quoted.` +
      `\n\nFor mathematical equations and formulae, you MUST use LaTeX notation wrapped in dollar signs. Use single dollar signs ($...$) for inline math and double dollar signs ($$...$$) for block/display math. Ensure complex formulae like fractions, square roots, and integrals are properly formatted.`,
    tools: []
  };

  if (useMaps) {
    config.tools.push({ googleMaps: {} });
  } else if (useSearch) {
    config.tools.push({ googleSearch: {} });
  }

  if (useMaps && location) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: location
      }
    };
  }

  const contents: any[] = history.map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.content }]
  }));

  const userParts: any[] = [{ text: prompt }];
  if (files.length > 0) {
    files.forEach((f: any) => {
      const mimeType = f.mimeType || f.type;
      if (!mimeType) {
        console.warn("Missing MIME type for file:", f.name);
        return;
      }
      userParts.push({
        inlineData: {
          data: f.data.split(',')[1],
          mimeType: mimeType
        }
      });
    });
  }

  contents.push({
    role: 'user',
    parts: userParts
  });

  let lastError: any = null;
  let modelSwitchedInfo = "";

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelToUse = modelsToTry[i];
    
    // Create new config object to modify for specific models if needed
    const currentConfig = { ...config };
    if (useThinking && modelToUse.includes("3.1-pro")) {
      currentConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    try {
      if (i > 0) {
        modelSwitchedInfo = `\n\n> ⚠️ **System Note:** Primary model quota exceeded. Seamlessly switched to \`${modelToUse}\` to continue processing your request.\n\n`;
      }

      const response = await ai.models.generateContent({
        model: modelToUse,
        contents,
        config: currentConfig
      });

      let text = response.text || "No response generated.";
      
      // Append switch notification to the top if we had to fallback
      if (modelSwitchedInfo) {
        text = modelSwitchedInfo + text;
      }
      
      // Extract grounding URLs if any
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const urls = Array.from(new Set(chunks.map((c: any) => c.web?.uri || c.maps?.uri).filter(Boolean)));
        if (urls.length > 0) {
          text += "\n\n---\n\n### Sources\n" + urls.map((u: string) => `- [${u}](${u})`).join('\n');
        }
      }

      return {
        text,
        model: modelToUse
      };
    } catch (error: any) {
      lastError = error;
      const msg = (error.message || '').toLowerCase();
      const status = error.status || 0;
      const isQuotaError = status === 429 || msg.includes("429") || msg.includes("quota") || msg.includes("too many requests") || msg.includes("limit") || msg.includes("overloaded");
      
      console.error(`Error with model ${modelToUse}:`, error);
      
      if (error.message?.includes("Unsupported MIME type")) {
        throw new Error(`The AI model does not support one of the uploaded file types. Please try converting your file to a supported format like PDF, plain text, or image.`);
      }

      if (isQuotaError && i < modelsToTry.length - 1) {
        console.warn(`Model ${modelToUse} failed with quota limit. Attempting fallback...`);
        continue;
      }
      
      // If none of our fallbacks worked or it's a fatal error, break
      break;
    }
  }

  throw lastError;
}

export async function* generateAIStream(
  prompt: string, 
  history: any[] = [], 
  options: {
    systemInstruction?: string;
    useThinking?: boolean;
    useSearch?: boolean;
    searchEngine?: 'google' | 'yahoo' | 'duckduckgo';
    useMaps?: boolean;
    location?: { latitude: number; longitude: number };
    files?: { data: string; mimeType: string }[];
  } = {}
) {
  const { 
    systemInstruction = "", 
    useThinking = false, 
    useSearch = false, 
    searchEngine = 'google', 
    useMaps = false, 
    location, 
    files = [] 
  } = options;
  
  let modelsToTry = [MODELS[0], MODELS[1], MODELS[4], MODELS[2]];
  if (useMaps) modelsToTry = ["gemini-3-flash-preview", "gemini-3.1-pro-preview"]; 
  else if (useSearch) modelsToTry = ["gemini-3-flash-preview", "gemini-3.1-pro-preview", "gemini-2.5-flash"];

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const config: any = {
    systemInstruction: systemInstruction + 
      (useThinking ? `\n\n[EXTENDED DEEP THINKING MODE ACTIVE]\nYou must solve the user's problem by thinking deeply and understanding the root cause. You must evaluate all edge cases, verify your logic step-by-step, and guarantee a robust, completely error-free solution before providing the final answer. Prioritize absolute accuracy and stability over brevity. Ensure that you have explored multiple facets of the problem before deciding on the best possible solution. You are an expert at eliminating bugs and errors.` : "") +
      (useSearch ? `\n\nUser preferred search engine: ${searchEngine}. When providing search results, prioritize information as it would appear on ${searchEngine}.` : "") +
      `\n\nWhen the user asks for a diagram, sketch, or graphical representation (e.g., "Gimme the diagram for this in detailed"), you MUST provide a detailed Mermaid diagram using mermaid code blocks (e.g., \`\`\`mermaid ... \`\`\`). Use appropriate diagram types like flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram, or gantt to represent the information clearly. Ensure the diagram is detailed and easy to understand. IMPORTANT: Always wrap node labels and text in double quotes if they contain special characters like &, =, <, >, or spaces (e.g., A["Label with & and ="]). Avoid using reserved words as node IDs.` +
      `\n\nFor data visualizations (charts, graphs), you MUST provide a JSON block with the language label "chart". The JSON must be STRICTLY valid. Follow this structure:
{
  "type": "bar" | "line" | "area" | "pie",
  "data": Array of objects (e.g., [{ "name": "Jan", "value": 400 }]),
  "title": "Visualization Title",
  "is3D": boolean
}
CRITICAL: Do NOT include trailing commas. Do NOT use literal newlines inside strings (use \\n). Ensure all keys are double-quoted.` +
      `\n\nFor mathematical equations and formulae, you MUST use LaTeX notation wrapped in dollar signs. Use single dollar signs ($...$) for inline math and double dollar signs ($$...$$) for block/display math. Ensure complex formulae like fractions, square roots, and integrals are properly formatted.`,
    tools: []
  };

  if (useMaps) {
    config.tools.push({ googleMaps: {} });
  } else if (useSearch) {
    config.tools.push({ googleSearch: {} });
  }

  if (useMaps && location) {
    config.toolConfig = {
      retrievalConfig: { latLng: location }
    };
  }

  const contents: any[] = history.map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.content }]
  }));

  const userParts: any[] = [{ text: prompt }];
  if (files.length > 0) {
    files.forEach((f: any) => {
      const mimeType = f.mimeType || f.type;
      if (!mimeType) return;
      userParts.push({
        inlineData: { data: f.data.split(',')[1], mimeType: mimeType }
      });
    });
  }

  contents.push({ role: 'user', parts: userParts });

  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelToUse = modelsToTry[i];
    
    // Create new config object for each attempt
    const currentConfig = { ...config };
    if (useThinking && modelToUse.includes("3.1-pro")) {
      currentConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    try {
      if (i > 0) {
        yield `\n\n> ⚠️ **System Note:** Primary model quota exceeded. Seamlessly switched to \`${modelToUse}\` to continue assisting you.\n\n`;
      }

      const responseStream = await ai.models.generateContentStream({
        model: modelToUse,
        contents,
        config: currentConfig
      });

      let hasYieldedSources = false;
      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield chunk.text;
        }
        const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks && !hasYieldedSources) {
          const urls = Array.from(new Set(groundingChunks.map((c: any) => c.web?.uri || c.maps?.uri).filter(Boolean)));
          if (urls.length > 0) {
            yield "\n\n---\n\n### Sources\n" + urls.map((u: string) => `- [${u}](${u})`).join('\n');
            hasYieldedSources = true;
          }
        }
      }
      
      // If we completed stream processing without failure, success, no need to fallback
      return;
      
    } catch (error: any) {
      lastError = error;
      const msg = (error.message || '').toLowerCase();
      const status = error.status || 0;
      const isQuotaError = status === 429 || msg.includes("429") || msg.includes("quota") || msg.includes("too many requests") || msg.includes("limit") || msg.includes("overloaded");
      
      console.error(`Error with stream on model ${modelToUse}:`, error);

      if (isQuotaError && i < modelsToTry.length - 1) {
        console.warn(`Stream model ${modelToUse} failed with quota limit. Attempting fallback...`);
        // Continue to text iteration
        continue;
      }
      
      break;
    }
  }

  throw lastError;
}

export async function textToSpeech(text: string) {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
    return audio;
  }
  return null;
}
