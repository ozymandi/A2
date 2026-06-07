# O'Bend - Prompt Engineering Node UI

O'Bend is a powerful, node-based mobile application designed to simplify and optimize the creation of prompts for various AI image generation engines (Midjourney, Stable Diffusion, Ideogram, DALL-E, etc.). It provides a structural, block-based approach to prompt engineering, complete with AI-powered prompt optimization, image decompilation, and customizable color palettes.

## 🚀 Features

- **Node-Based Interface**: Build prompts using distinct structural blocks (Subject, Environment, Camera, Lighting, Style, Artist, Aspect Ratio).
- **AI Prompt Optimization**: Uses LLMs (via OpenRouter, Groq, or Gemini) to rewrite and format your block-based structures into highly optimized prompts tailored specifically for your chosen generation engine.
- **Image Decompilation**: Upload any image from your gallery or camera, and use Vision models to automatically decompile the image back into editable prompt blocks.
- **Smart Color Palettes**: Automatically extract or generate cohesive 5-color hex palettes to maintain consistent styling.
- **Ideogram JSON Support**: Generates strict, structured JSON schemas specifically formatted for Ideogram 4's advanced generation API.
- **Mock Google Authentication**: Includes a ready-to-use login screen for Google Auth integration.
- **Dark Mode First**: Beautiful, responsive, and modern dark-mode UI with smooth micro-interactions.

## 📦 Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Navigation**: React Navigation (Native Stack)
- **Icons**: Lucide React Native
- **Storage**: AsyncStorage (for API keys, models, and mock user sessions)
- **API Integration**: Groq API, OpenRouter API, Google Gemini API

## 🛠 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ozymandi/A2.git
   cd A2/mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Expo development server:**
   ```bash
   npm run dev
   # or
   npx expo start
   ```

4. **Run the app:**
   - Press `a` to run on Android Emulator.
   - Press `i` to run on iOS Simulator.
   - Or scan the QR code with the Expo Go app on your physical device.

## 🔑 Configuration

To enable the core AI features (Prompt Optimization and Image Decompilation), you must provide your own API key.

1. Open the app and navigate to **Settings** (the gear icon).
2. Select your preferred engine (Groq, OpenRouter, or Gemini).
3. Enter your API key (stored securely and locally on your device).
4. Select a model from the list. 
   *(Note: For Image Decompilation to work, you must select an engine/model that supports Vision, such as Gemini 1.5 Flash or LLaMA 3.2 11B Vision).*

## 🔐 Google Authentication Setup

The application currently uses a "Mock Login" for development and testing. To enable real Google Sign-In:

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Create an **OAuth 2.0 Client ID** (Web application type).
3. Open `src/screens/LoginScreen.tsx`.
4. Replace the `WEB_CLIENT_ID` constant with your actual Google Cloud Web Client ID.
5. Create a standalone build (Expo Go does not support custom native OAuth modules out of the box).

## 📝 License

This project is proprietary and confidential. All rights reserved.
