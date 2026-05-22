import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import cors from "cors";
import fs from "fs";
const HTTP_PORT = 3001;

// --- Web/WebSocket Server Setup ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let uiClients = [];

wss.on("connection", (ws) => {
    uiClients.push(ws);
    console.error(`[WS] Client connected. Total clients: ${uiClients.length}`);

    ws.on("close", () => {
        uiClients = uiClients.filter(c => c !== ws);
        console.error(`[WS] Client disconnected. Total clients: ${uiClients.length}`);
    });

    ws.on("error", (err) => {
        console.error(`[WS] Client error:`, err);
    });
});

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.post('/api/refine', async (req, res) => {
    const { label, value } = req.body;
    logToFile(`[HTTP] POST /api/refine called. Label: "${label}", Value: "${value}"`);
    try {
        const response = await fetch("http://127.0.0.1:1234/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "local-model",
                messages: [
                    { role: "user", content: `You are an expert prompt engineering assistant. Your task is to enhance and refine a specific characteristic of an image prompt to make it more professional, descriptive, and vivid.

Task: Enhance this '${label}' characteristic for an image prompt: "${value}"

Return the refined text directly.` }
                ],
                temperature: 0.7,
                max_tokens: 1500
            })
        });
        const data = await response.json();
        
        if (data.error) {
            logToFile(`[HTTP] /api/refine LM Studio Error: ${data.error.message}`);
            throw new Error(`LM Studio Error: ${data.error.message}`);
        }
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const refined = data.choices[0].message.content.trim();
            logToFile(`[HTTP] /api/refine Success. Full response: ${JSON.stringify(data)}`);
            res.json({ refined });
        } else {
            logToFile(`[HTTP] /api/refine Invalid response from LM Studio: ${JSON.stringify(data)}`);
            throw new Error("Invalid response from LM Studio");
        }
    } catch (e) {
        console.error("[HTTP] Error refining prompt:", e);
        logToFile(`[HTTP] /api/refine catch Exception: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/review', async (req, res) => {
    const { prompt } = req.body;
    logToFile(`[HTTP] POST /api/review called. Prompt: "${prompt}"`);
    try {
        const response = await fetch("http://127.0.0.1:1234/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "local-model",
                messages: [
                    { role: "user", content: `You are a prompt engineering master. Review the following image generation prompt. Improve its structure, flow, and vocabulary to get the most stunning and accurate image from an AI generator like Midjourney or Stable Diffusion. Output ONLY the improved prompt text, with no extra conversational filler.

Prompt to review:
${prompt}` }
                ],
                temperature: 0.7,
                max_tokens: 2500
            })
        });
        const data = await response.json();
        
        if (data.error) {
            logToFile(`[HTTP] /api/review LM Studio Error: ${data.error.message}`);
            throw new Error(`LM Studio Error: ${data.error.message}`);
        }
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const refined = data.choices[0].message.content.trim();
            logToFile(`[HTTP] /api/review Success. Generated: "${refined}"`);
            res.json({ refined });
        } else {
            logToFile(`[HTTP] /api/review Invalid response from LM Studio: ${JSON.stringify(data)}`);
            throw new Error("Invalid response from LM Studio");
        }
    } catch (e) {
        console.error("[HTTP] Error reviewing prompt:", e);
        logToFile(`[HTTP] /api/review catch Exception: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/analyze-image', async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: "No image provided" });
        }

        logToFile(`[HTTP] POST /api/analyze-image called.`);

        const response = await fetch("http://127.0.0.1:1234/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "local-model",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Describe this image in extreme detail, focusing on the subject, lighting, environment, and artistic style. Return ONLY the description, without any conversational filler." },
                            { type: "image_url", image_url: { url: image } }
                        ]
                    }
                ],
                temperature: 0.7,
                max_tokens: 2500
            })
        });
        const data = await response.json();

        if (data.error) {
            logToFile(`[HTTP] /api/analyze-image LM Studio Error: ${data.error.message}`);
            throw new Error(`LM Studio Error: ${data.error.message}`);
        }

        const generated = data.choices[0].message.content.trim();
        logToFile(`[HTTP] /api/analyze-image Success.`);
        res.json({ description: generated });

    } catch (error) {
        logToFile(`[HTTP] /api/analyze-image catch Exception: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/merge-prompts', async (req, res) => {
    try {
        const { prompts } = req.body;
        if (!prompts || !Array.isArray(prompts)) {
            return res.status(400).json({ error: "No prompts provided" });
        }

        logToFile(`[HTTP] POST /api/merge-prompts called with ${prompts.length} prompts.`);

        const response = await fetch("http://127.0.0.1:1234/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "local-model",
                messages: [
                    {
                        role: "user",
                        content: `You are an expert prompt engineer. Merge the following scene descriptions into a single, highly cohesive, flowing paragraph without contradictions. Ensure all key subjects and stylistic elements are retained. Return ONLY the merged text.\n\nDescriptions to merge:\n${prompts.map((p, i) => `[${i+1}] ${p}`).join('\n')}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 2500
            })
        });
        const data = await response.json();

        if (data.error) {
            logToFile(`[HTTP] /api/merge-prompts LM Studio Error: ${data.error.message}`);
            throw new Error(`LM Studio Error: ${data.error.message}`);
        }

        const generated = data.choices[0].message.content.trim();
        logToFile(`[HTTP] /api/merge-prompts Success.`);
        res.json({ merged: generated });

    } catch (error) {
        logToFile(`[HTTP] /api/merge-prompts catch Exception: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/optimize-prompt', async (req, res) => {
    try {
        const { prompt, engine, format } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: "No prompt provided" });
        }

        logToFile(`[HTTP] POST /api/optimize-prompt called for engine: ${engine}, format: ${format}`);

        let systemPrompt = `You are an expert prompt engineer and artist. Optimize the following image generation prompt specifically for the ${engine} rendering engine.`;
        
        if (engine === "Midjourney") {
            systemPrompt += " Use Midjourney syntax where appropriate (like :: weights, aspect ratios). Focus on evocative descriptors, lighting, and camera details.";
        } else if (engine === "Stable Diffusion" || engine === "Flux") {
            systemPrompt += " Use Stable Diffusion tag-based syntax (comma separated). Order by importance: Subject, Environment, Lighting, Style, Quality tags.";
        } else if (engine === "DALL-E") {
            systemPrompt += " Write a highly descriptive, natural language paragraph. Avoid technical camera terms if they don't make sense, focus on the visual scene.";
        }

        if (format === "JSON") {
            systemPrompt += `\n\nYou MUST return the result EXACTLY as a valid JSON object. Do not wrap it in markdown code blocks. The JSON must follow this schema:
{
  "subject": "Main subject description",
  "environment": "Background and setting",
  "lighting": "Lighting setup",
  "style": "Artistic style and medium",
  "camera": "Camera angles or properties (if applicable)",
  "full_prompt": "The complete, concatenated prompt string ready for the generator"
}`;
        } else {
            systemPrompt += "\n\nReturn ONLY the optimized prompt string without any conversational filler or explanations.";
        }

        const response = await fetch("http://127.0.0.1:1234/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "local-model",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2500
            })
        });
        const data = await response.json();

        if (data.error) {
            logToFile(`[HTTP] /api/optimize-prompt LM Studio Error: ${data.error.message}`);
            throw new Error(`LM Studio Error: ${data.error.message}`);
        }

        const generated = data.choices[0].message.content.trim();
        logToFile(`[HTTP] /api/optimize-prompt Success.`);
        res.json({ optimized: generated });

    } catch (error) {
        logToFile(`[HTTP] /api/optimize-prompt catch Exception: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/decompile-image', async (req, res) => {
    try {
        const { image, sourceId, x, y } = req.body;
        if (!image) {
            return res.status(400).json({ error: "No image provided" });
        }

        logToFile(`[HTTP] POST /api/decompile-image called.`);

        const response = await fetch("http://127.0.0.1:1234/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "local-model",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: `Analyze this image and break it down into core visual components suitable for a node-based prompt generator.
If there is a person in the image, you MUST try to determine their Age, Gender, and Race (Ethnicity) and include them as separate nodes.
Also include the Aspect Ratio of the image (e.g. 16:9, 1:1, 9:16, 4:3, etc).
You MUST output EXACTLY a valid JSON array of objects, with no markdown code blocks, no intro, no outro.
Schema (include Age, Gender, Race ONLY if a person is present):
[
  { "label": "Subject", "value": "..." },
  { "label": "Age", "value": "..." },
  { "label": "Gender", "value": "..." },
  { "label": "Race", "value": "..." },
  { "label": "Environment", "value": "..." },
  { "label": "Lighting", "value": "..." },
  { "label": "Style", "value": "..." },
  { "label": "Camera", "value": "..." },
  { "label": "Color Palette", "value": "#hex1, #hex2, #hex3, #hex4, #hex5" },
  { "label": "Aspect Ratio", "value": "..." }
]` },
                            { type: "image_url", image_url: { url: image } }
                        ]
                    }
                ],
                temperature: 0.3,
                max_tokens: 2500
            })
        });
        const data = await response.json();

        if (data.error) {
            logToFile(`[HTTP] /api/decompile-image LM Studio Error: ${data.error.message}`);
            throw new Error(`LM Studio Error: ${data.error.message}`);
        }

        let generated = data.choices[0].message.content.trim();
        
        // Strip markdown backticks if the LLM adds them
        if (generated.startsWith('```json')) generated = generated.slice(7);
        if (generated.startsWith('```')) generated = generated.slice(3);
        if (generated.endsWith('```')) generated = generated.slice(0, -3);
        generated = generated.trim();
        
        let nodesArray = [];
        try {
            nodesArray = JSON.parse(generated);
        } catch (e) {
            logToFile(`[HTTP] /api/decompile-image Parse Error: ${e.message} on text: ${generated}`);
            throw new Error("LLM did not return valid JSON");
        }

        // Broadcast to all WS clients
        broadcastToUI("render_pipeline", { nodes: nodesArray, sourceId, x, y });

        logToFile(`[HTTP] /api/decompile-image Success. Broadcasted ${nodesArray.length} nodes.`);
        res.json({ success: true, nodes: nodesArray });

    } catch (error) {
        logToFile(`[HTTP] /api/decompile-image catch Exception: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/mcp-forward', (req, res) => {
    try {
        const payload = req.body;
        logToFile(`[HTTP] /api/mcp-forward received payload. Broadcasting to ${uiClients.size} clients.`);
        broadcastToUI("render_pipeline", payload);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/generate-palette', async (req, res) => {
    logToFile(`[HTTP] POST /api/generate-palette called.`);
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: "No text provided" });
        }

        const prompt = `Based on the following descriptive prompt, generate a cohesive color palette of exactly 5 colors that perfectly matches the aesthetic, mood, and lighting described.
Output MUST be exactly a JSON array of 5 hex codes, e.g. ["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF"]. Do not include any other text, markdown blocks, or explanations.

Prompt:
"${text}"`;

        const response = await fetch(`http://127.0.0.1:1234/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "local-model",
                messages: [
                    { role: "system", content: "You are a professional colorist and designer. You only output strict JSON arrays." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 150
            })
        });

        if (!response.ok) {
            throw new Error(`LM Studio API error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        
        let hexes = [];
        try {
            // Remove markdown code blocks if the LLM adds them
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            hexes = JSON.parse(cleanContent);
        } catch (e) {
            // Fallback: extract hexes using regex
            hexes = content.match(/#[0-9a-fA-F]{6}/g) || [];
        }

        if (hexes.length > 5) hexes = hexes.slice(0, 5);

        logToFile(`[HTTP] /api/generate-palette Success.`);
        res.json({ colors: hexes });
    } catch (error) {
        logToFile(`[HTTP] /api/generate-palette catch Exception: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});


import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = path.join(__dirname, 'mcp_debug.log');

function logToFile(msg) {
    try {
        fs.appendFileSync(LOG_FILE, new Date().toISOString() + ': ' + msg + '\n');
    } catch (e) {
        console.error("[MCP] Could not write to log file:", e.message);
    }
}

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    logToFile('UNCAUGHT EXCEPTION: ' + err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
    logToFile('UNHANDLED REJECTION: ' + reason);
});

server.listen(HTTP_PORT, '127.0.0.1', () => {
    console.error(`[HTTP] Server listening on 127.0.0.1:${HTTP_PORT}`);
    logToFile(`[HTTP] Server successfully listening on 127.0.0.1:${HTTP_PORT}`);
}).on('error', (err) => {
    logToFile(`[HTTP] Server listen error: ${err.message}`);
});

// Helper to broadcast to React UI
function broadcastToUI(type, payload) {
    const message = JSON.stringify({ type, payload });
    uiClients.forEach(client => {
        if (client.readyState === 1) { // OPEN
            client.send(message);
        }
    });
}

// --- MCP Server Setup ---
const mcp = new McpServer({
    name: "PromptDecompiler",
    version: "1.0.0"
});

mcp.tool(
    "render_pipeline",
    "Decompiles an image into distinct prompt builder nodes. You MUST split the image description into highly detailed logical categories (nodes). CRITICAL INSTRUCTIONS: 1. For characters, deeply analyze and extract specific skin tones, textures, facial features, and clothing materials into a 'Subject' or 'Character' node. 2. You MUST create dedicated nodes for 'Style' (art medium), 'Color Palette' (specific hues/shades), and 'Lighting' (direction/quality). 3. Assign a weight (0.1 to 2.0) to emphasize prominent features.",
    {
        nodes: z.array(
            z.object({
                label: z.string().describe("Category name (e.g., Camera, Subject, Skin Tones, Lighting, Style, Colors)"),
                value: z.string().describe("Detailed descriptive text for this category"),
                weight: z.number().min(0.1).max(2.0).optional().describe("Importance weight from 0.1 to 2.0. Default is 1.0.")
            })
        ).describe("List of visual nodes to render in the UI")
    },
    async (params) => {
        console.error("[MCP] Tool 'render_pipeline' called with params:", params);
        logToFile(`[MCP] Tool 'render_pipeline' called with params: ${JSON.stringify(params)}`);
        
        // If we have UI clients, broadcast directly (we are the main process)
        if (uiClients.size > 0) {
            broadcastToUI("render_pipeline", params);
        } else {
            // We are likely the spawned MCP process, forward to the main process
            try {
                await fetch(`http://127.0.0.1:${HTTP_PORT}/api/mcp-forward`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params)
                });
                logToFile("[MCP] Forwarded payload to main UI server successfully.");
            } catch (e) {
                logToFile(`[MCP] Failed to forward payload to main server: ${e.message}`);
                // Fallback broadcast just in case
                broadcastToUI("render_pipeline", params);
            }
        }
        
        logToFile(`[MCP] Tool 'render_pipeline' finished execution`);
        return {
            content: [
                {
                    type: "text",
                    text: "Successfully sent the decompiled components to the node-based UI."
                }
            ]
        };
    }
);

// Start MCP Server over STDIO
async function runMcpServer() {
    const transport = new StdioServerTransport();
    await mcp.connect(transport);
    console.error("[MCP] PromptDecompiler MCP Server running on stdio");
    
    // Crucial: Kill the process when LM Studio closes the connection
    // Crucial: Handle when LM Studio closes the connection
    transport.onclose = () => {
        console.error("[MCP] Connection closed by LM Studio. Shutting down.");
        logToFile("[MCP] Connection closed by LM Studio. Shutting down.");
        server.close(() => process.exit(0));
    };
}

// Fallback: if stdin closes, exit gracefully.
process.stdin.on('close', () => {
    console.error("[MCP] stdin closed. Shutting down.");
    logToFile("[MCP] stdin closed. Shutting down.");
    server.close(() => process.exit(0));
});
process.stdin.on('end', () => {
    console.error("[MCP] stdin ended. Shutting down.");
    logToFile("[MCP] stdin ended. Shutting down.");
    server.close(() => process.exit(0));
});

runMcpServer().catch(err => {
    console.error("[MCP] Error running server:", err);
    server.close(() => process.exit(1));
});
