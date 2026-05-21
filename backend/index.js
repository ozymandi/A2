import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import cors from "cors";

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
});

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.post('/api/refine', async (req, res) => {
    const { label, value } = req.body;
    try {
        const response = await fetch("http://localhost:1234/v1/chat/completions", {
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
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const refined = data.choices[0].message.content.trim();
            res.json({ refined });
        } else {
            throw new Error("Invalid response from LM Studio");
        }
    } catch (e) {
        console.error("[HTTP] Error refining prompt:", e);
        res.status(500).json({ error: e.message });
    }
});

server.listen(HTTP_PORT, () => {
    console.error(`[HTTP] Server listening on port ${HTTP_PORT}`);
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
    "Renders the decompiled prompt components into the node-based visual pipeline. Call this tool after analyzing the image and extracting the prompt components.",
    {
        subject: z.string().describe("The main subject(s) or character(s) in the image."),
        environment: z.string().describe("The setting, background, or environment."),
        lighting: z.string().describe("The lighting conditions (e.g., cinematic, natural, harsh)."),
        camera: z.string().describe("Camera details (e.g., wide angle, 50mm, macro, drone view)."),
        style: z.string().describe("The art style, medium, or aesthetics (e.g., cyberpunk, oil painting, photorealistic)."),
        extra_details: z.string().describe("Any other important details or modifiers.")
    },
    async (params) => {
        console.error("[MCP] Tool 'render_pipeline' called with params:", params);
        
        // Send data to the UI
        broadcastToUI("render_pipeline", params);
        
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
}

runMcpServer().catch(err => {
    console.error("[MCP] Error running server:", err);
});
