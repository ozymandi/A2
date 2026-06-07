import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_KEY_STORAGE_KEY = '@prompt_builder_api_key';
export const ENGINE_STORAGE_KEY = '@prompt_builder_engine';
export const SELECTED_MODEL_STORAGE_KEY = '@prompt_builder_selected_model';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

export interface PromptBlock {
  id: string;
  type: string;
  content: string;
}

const SYSTEM_PROMPT = `You are an expert stable diffusion and midjourney prompt engineer. 
Your task is to take a set of structural blocks provided by the user and assemble them into a cohesive, highly detailed, and professional image generation prompt.
Output ONLY the raw text of the final prompt. Do not add conversational text.`;

const DECOMPILE_PROMPT = `Analyze the provided image and decompile it into structural blocks for prompt generation. 
Available block types: Subject, Environment, Camera, Lighting, Style, Aspect Ratio, Artist.
Return the result as a valid JSON array of objects, where each object has a "type" and "content" property.
Example: [{"type": "Subject", "content": "A futuristic cyborg"}, {"type": "Lighting", "content": "Neon light"}]
ONLY return the raw JSON array. Do not include any markdown formatting or extra text.`;

export async function fetchAvailableModels(engine: string, apiKey: string): Promise<string[]> {
  if (engine === 'Groq') {
    const res = await fetch(GROQ_MODELS_URL, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!res.ok) throw new Error('Failed to fetch Groq models');
    const data = await res.json();
    // Return all models since Groq temporarily removed their vision models
    return data.data.map((m: any) => m.id).sort();
  } else if (engine === 'OpenRouter') {
    const res = await fetch(OPENROUTER_MODELS_URL);
    if (!res.ok) throw new Error('Failed to fetch OpenRouter models');
    const data = await res.json();
    
    // Sort all models, but put some guaranteed free vision models at the very beginning
    const allModels = data.data.map((m: any) => m.id);
    const recommendedFree = [
      'meta-llama/llama-3.2-11b-vision-instruct:free',
      'google/gemini-pro-1.5-exp:free',
      'qwen/qwen-2-vl-7b-instruct:free'
    ].filter(m => allModels.includes(m));
    
    const others = allModels.filter((m: string) => !recommendedFree.includes(m)).sort();
    return [...recommendedFree, ...others];
  } else {
    // Gemini models
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`);
    if (!res.ok) throw new Error('Failed to fetch Gemini models');
    const data = await res.json();
    return data.models.map((m: any) => m.name.replace('models/', '')).sort();
  }
}

export async function decompileImage(base64Image: string): Promise<PromptBlock[]> {
  const apiKey = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
  const engine = await AsyncStorage.getItem(ENGINE_STORAGE_KEY) || 'Groq';
  let selectedModel = await AsyncStorage.getItem(SELECTED_MODEL_STORAGE_KEY);

  if (!apiKey) throw new Error('API Key is missing.');
  if (!selectedModel) selectedModel = engine === 'Groq' ? 'llama-3.2-11b-vision-instruct' : 'gemini-1.5-flash';

  let rawJson = '';
  const userPromptText = "Analyze the attached image and return the JSON array of blocks.";

  if (engine === 'Groq') {
    rawJson = await callGroq(apiKey, DECOMPILE_PROMPT, userPromptText, selectedModel, base64Image);
  } else if (engine === 'OpenRouter') {
    rawJson = await callOpenRouter(apiKey, DECOMPILE_PROMPT, userPromptText, selectedModel, base64Image);
  } else {
    rawJson = await callGemini(apiKey, DECOMPILE_PROMPT, userPromptText, selectedModel, base64Image);
  }

  try {
    // Clean up markdown block if the model returned it
    let cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Sometimes the model forgets the surrounding brackets for the array
    if (cleanJson.startsWith('{') && cleanJson.endsWith('}')) {
      cleanJson = `[${cleanJson}]`;
    } else if (!cleanJson.startsWith('[')) {
      // Try to extract the array if there's text before it
      const startIdx = cleanJson.indexOf('[');
      const endIdx = cleanJson.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleanJson = cleanJson.substring(startIdx, endIdx + 1);
      } else {
        // Fallback: just wrap it and hope
        cleanJson = `[${cleanJson}]`;
      }
    }

    const blocks: PromptBlock[] = JSON.parse(cleanJson);
    return blocks.map((b, i) => ({ ...b, id: `decompiled_${Date.now()}_${i}` }));
  } catch (e) {
    throw new Error('Failed to parse decompiled blocks: ' + rawJson);
  }
}

export async function optimizePrompt(
  blocks: PromptBlock[], 
  base64Image?: string,
  targetEngine: string = 'Midjourney',
  outputFormat: string = 'Plain Text'
): Promise<string> {
  const apiKey = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
  const engine = await AsyncStorage.getItem(ENGINE_STORAGE_KEY) || 'Groq';
  let selectedModel = await AsyncStorage.getItem(SELECTED_MODEL_STORAGE_KEY);

  if (!apiKey) throw new Error('API Key is missing. Go to Settings to configure it.');
  if (base64Image && !selectedModel) {
    selectedModel = engine === 'Groq' ? 'llama-3.2-11b-vision-instruct' : 'gemini-1.5-flash';
  } else if (!selectedModel) {
    selectedModel = engine === 'Groq' ? 'llama-3.1-70b-versatile' : 'gemini-1.5-flash';
  }

  // Filter out empty blocks
  const activeBlocks = blocks.filter(b => b.content.trim() !== '' || b.type === 'Palette');
  const userMessage = activeBlocks.map(b => `[${b.type}]: ${b.content || 'None'}`).join('\n');

  let customSystemPrompt = `You are an expert prompt engineer and artist. Optimize the following image generation blocks specifically for the ${targetEngine} rendering engine.`;
        
  if (targetEngine === "Midjourney") {
      customSystemPrompt += " Use Midjourney syntax where appropriate (like :: weights, aspect ratios). Focus on evocative descriptors, lighting, and camera details. IMPORTANT: Include standard Midjourney parameters at the end (e.g., --v 6.0 --ar 16:9) if appropriate.";
  } else if (targetEngine === "Stable Diffusion" || targetEngine === "Flux") {
      customSystemPrompt += " Use Stable Diffusion tag-based syntax (comma separated). Order by importance: Subject, Environment, Lighting, Style, Quality tags.";
  } else if (targetEngine === "DALL-E") {
      customSystemPrompt += " Write a highly descriptive, natural language paragraph. Avoid technical camera terms if they don't make sense, focus on the visual scene.";
  } else if (targetEngine === "Ideogram") {
      customSystemPrompt += " Focus heavily on structured components: high-level description, style, and compositional elements with bounding boxes if requested.";
  }

  if (outputFormat === "JSON") {
      if (targetEngine === "Ideogram") {
          customSystemPrompt += `\n\nYou MUST return the result EXACTLY as a valid JSON object. Do not wrap it in markdown code blocks. The JSON must strictly follow the Ideogram 4 caption schema:
{
  "high_level_description": "A one-sentence summary of the entire image",
  "style_description": {
    "aesthetics": "Keywords about mood/vibe",
    "lighting": "Lighting details",
    "art_style": "If non-photographic, put the style here (otherwise use 'photo')",
    "medium": "The medium, e.g. illustration, photograph",
    "color_palette": ["#hex1", "#hex2"]
  },
  "compositional_deconstruction": {
    "background": "Background description",
    "elements": [
      {"type": "obj", "bbox": [0, 0, 1000, 1000], "desc": "Detailed description of object or subject"}
    ]
  }
}`;
      } else {
          customSystemPrompt += `\n\nYou MUST return the result EXACTLY as a valid JSON object. Do not wrap it in markdown code blocks. The JSON must follow this schema:
{
  "subject": "Main subject description",
  "environment": "Background and setting",
  "lighting": "Lighting setup",
  "style": "Artistic style and medium",
  "camera": "Camera angles or properties (if applicable)",
  "full_prompt": "The complete, concatenated prompt string ready for the generator"
}`;
      }
  } else {
      customSystemPrompt += "\n\nReturn ONLY the optimized prompt string without any conversational filler or explanations.";
  }

  if (engine === 'Groq') {
    return callGroq(apiKey, customSystemPrompt, userMessage, selectedModel, base64Image);
  } else if (engine === 'OpenRouter') {
    return callOpenRouter(apiKey, customSystemPrompt, userMessage, selectedModel, base64Image);
  } else {
    return callGemini(apiKey, customSystemPrompt, userMessage, selectedModel, base64Image);
  }
}

export async function generatePalette(blocks: PromptBlock[]): Promise<string[]> {
  const apiKey = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
  const engine = await AsyncStorage.getItem(ENGINE_STORAGE_KEY) || 'Groq';
  let selectedModel = await AsyncStorage.getItem(SELECTED_MODEL_STORAGE_KEY);

  if (!apiKey) throw new Error('API Key is missing.');
  if (!selectedModel) {
    selectedModel = engine === 'Groq' ? 'llama-3.1-70b-versatile' : 'gemini-1.5-flash';
  }

  const activeBlocks = blocks.filter(b => b.content.trim() !== '' && b.type !== 'Palette');
  const userMessage = activeBlocks.map(b => `[${b.type}]: ${b.content}`).join('\n') || "A beautiful cinematic scene";

  const systemPrompt = `You are a professional colorist and aesthetic designer.
Given the description of an image, generate a cohesive color palette consisting of exactly 5 hex color codes.
Return ONLY a valid JSON array of 5 hex strings. Example: ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#00FFFF"]
Do not include any markdown, explanation, or conversational text.`;

  let rawJson = '';

  if (engine === 'Groq') {
    rawJson = await callGroq(apiKey, systemPrompt, userMessage, selectedModel);
  } else if (engine === 'OpenRouter') {
    rawJson = await callOpenRouter(apiKey, systemPrompt, userMessage, selectedModel);
  } else {
    rawJson = await callGemini(apiKey, systemPrompt, userMessage, selectedModel);
  }

  try {
    let cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    if (!cleanJson.startsWith('[')) {
      const startIdx = cleanJson.indexOf('[');
      const endIdx = cleanJson.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        cleanJson = cleanJson.substring(startIdx, endIdx + 1);
      }
    }
    const colors: string[] = JSON.parse(cleanJson);
    return colors;
  } catch (e) {
    throw new Error('Failed to parse generated palette: ' + rawJson);
  }
}

async function callOpenRouter(apiKey: string, systemPrompt: string, userPrompt: string, model: string, base64Image?: string): Promise<string> {
  const contentArray: any[] = [
    { type: 'text', text: userPrompt }
  ];

  if (base64Image) {
    contentArray.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${base64Image}` }
    });
  }

  const userContent = base64Image ? contentArray : userPrompt;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://prompt-builder.app',
      'X-Title': 'Prompt Builder'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API Error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function callGroq(apiKey: string, systemPrompt: string, userPrompt: string, model: string, base64Image?: string): Promise<string> {
  const contentArray: any[] = [
    { type: 'text', text: userPrompt }
  ];

  if (base64Image) {
    contentArray.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${base64Image}` }
    });
  }

  const userContent = base64Image ? contentArray : userPrompt;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.7,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API Error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string, model: string, base64Image?: string): Promise<string> {
  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;
  
  const parts: any[] = [
    { text: systemPrompt + "\n\nUSER PROMPT:\n" + userPrompt }
  ];

  if (base64Image) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image
      }
    });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: parts
      }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API Error: ${err}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}
