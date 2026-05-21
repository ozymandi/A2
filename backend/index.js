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
app.use(express.json());

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
                model: "gemma-4-31b",
                messages: [
                    { role: "system", content: "You are an expert prompt engineering assistant. Your task is to enhance and refine a specific characteristic of an image prompt to make it more professional, descriptive, and vivid. Respond ONLY with the refined text, with no conversational filler, no quotes, and no markdown." },
                    { role: "user", content: `Enhance this '${label}' characteristic for an image prompt: "${value}"` }
                ],
                temperature: 0.7,
                max_tokens: 150
            })
        });
        const data = await response.json();
        
        if (data.error) {
            logToFile(`[HTTP] /api/refine LM Studio Error: ${data.error.message}`);
            throw new Error(`LM Studio Error: ${data.error.message}`);
        }
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const refined = data.choices[0].message.content.trim();
            logToFile(`[HTTP] /api/refine Success. Generated: "${refined}"`);
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
                model: "gemma-4-31b",
                messages: [
                    { role: "system", content: "You are a prompt engineering master. Review the following image generation prompt. Improve its structure, flow, and vocabulary to get the most stunning and accurate image from an AI generator like Midjourney or Stable Diffusion. Output ONLY the improved prompt text, with no extra conversational filler." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 300
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
        
        // Send data to the UI
        broadcastToUI("render_pipeline", params);
        
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
