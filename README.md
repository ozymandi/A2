# Prompt Builder

A visual, node-based prompt generator for AI image generation (Midjourney, Stable Diffusion, DALL-E, etc.) with advanced LM Studio (MCP) integration for image decompilation and prompt optimization.

## Features

- **Node-Based UI:** Drag and drop elements like Subject, Environment, Camera, Lighting, and more to compose your prompt visually.
- **Save & Load:** Export your prompt graphs to JSON and load them back later.
- **AI Decompilation (Vision):** Drop an image into the Base Input, and use an LM Studio Vision model to automatically extract its core components (Subject, Style, Lighting, Camera, etc.) directly into the node graph.
- **Smart Person Attributes:** Automatically detects if a person is in the image and generates specific nodes for Age, Gender, and Race.
- **AI Prompt Optimization:** Built-in optimizer in the Final Prompt node. Choose your target engine (Midjourney, Stable Diffusion, etc.) and get a refined, professional prompt using your local LLM.

---

## Installation Guide

### Prerequisites
1. **Node.js**: Ensure you have Node.js installed (v18+ recommended). You can download it from [nodejs.org](https://nodejs.org/).
2. **LM Studio**: Required for AI features (Decompilation & Optimization). Download from [lmstudio.ai](https://lmstudio.ai/).

### Step 1: Install Dependencies
The easiest way to install all required packages is to run the included batch script:
1. Double-click on `Install_Dependencies.bat`.
*(Alternatively, you can manually run `npm install` inside both the `backend` and `frontend` folders).*

### Step 2: Start the Application
To launch the app, simply run the startup script:
1. Double-click on `Start_App.bat`.
2. Two terminal windows will open (one for the Backend API, one for the Frontend UI). **Do not close them.**
3. Your default web browser should automatically open the app at `http://localhost:5173`.

---

## Configuring LM Studio (MCP Server)

To use the AI-powered features (like Decompilation and Optimization), you need to connect LM Studio to the app's backend and load the correct models.

### 1. Enable LM Studio Local Server
1. Open LM Studio.
2. Go to the **Developer / Local Server** tab.
3. Start the Local Inference Server (default port is `1234`). Our app uses this to communicate with your loaded LLM.

### 2. Load the Right Models
- **For Prompt Optimization**: Load any good instruction-following text model (e.g., Llama-3, Gemma, Mistral).
- **For Image Decompilation**: You **must** load a Vision-capable model (e.g., Llama-3.2-Vision, Qwen2-VL, Moondream) if you want the app to analyze images.

### 3. Add the MCP Server to LM Studio (Optional, for advanced chat integration)
Our backend also acts as an MCP (Model Context Protocol) server, allowing you to ask LM Studio to directly render pipelines in the UI from the chat tab.
1. Open LM Studio and go to **Settings > MCP Servers** (or equivalent MCP configuration section depending on your LM Studio version).
2. Add a new standard STDIO server.
3. Set the executable to `node`.
4. Set the arguments to the absolute path of `index.js` in the `backend` folder of this project (e.g., `C:\path\to\A2\backend\index.js`).
5. Now, you can chat with a model in LM Studio and tell it: *"Decompile this image"* or *"Create a prompt pipeline for a cinematic sci-fi scene"*, and it will automatically draw the nodes in your browser!

---

## Usage

1. Open the app in your browser.
2. Drag nodes from the left Sidebar onto the canvas.
3. Select presets (like Camera Angles, Lighting setups) from the dropdowns, or type your own custom text.
4. Connect the output of the nodes to the **Mixer** node or directly into the **Final Prompt** node.
5. In the Final Prompt node, select your Target Engine and click **Optimize** (requires LM Studio to be running) or simply copy the combined prompt text!
