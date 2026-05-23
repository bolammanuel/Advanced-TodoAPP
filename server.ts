import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize server-side Gemini client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is missing");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API: Voice agent for parsing workflow/scheduling requests
app.post("/api/gemini/voice-agent", async (req, res) => {
  try {
    const { prompt, existingTasks } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const ai = getGeminiClient();
    const systemInstruction = `You are an expert AI productivity assistant and scheduling agent. 
Analyze the user's spoken command (transcription) and current tasks list to determine if they want to:
1. Create a new task (e.g. "I want to study coding tomorrow at 3pm", "add a task to buy groceries")
2. Complete an existing task (e.g. "finish code task", "check off groceries")
3. Update/reschedule a task (e.g. "move writing task to next week")
4. Delete a task (e.g. "remove study session")
5. Or just ask a general productivity query / talk to you about their workflow.

Respond with a JSON object that maps to the requested actions so the UI can execute them.
Current date/time context: ${new Date().toISOString()}.
Existing tasks in list: ${JSON.stringify(existingTasks || [])}.

Provide a friendly, conversational spoken voice response in responseMessage. Keep it brief and friendly as it will be read aloud.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description: "The intended action: 'create', 'complete', 'update', 'delete', or 'none'.",
            },
            taskTitle: {
              type: Type.STRING,
              description: "Extracted or inferred task title.",
            },
            taskDescription: {
              type: Type.STRING,
              description: "Extracted description, subtasks, or calendar details.",
            },
            taskDeadline: {
              type: Type.STRING,
              description: "Inferred task deadline date in ISO 8601 string format (YYYY-MM-DDTHH:MM:SS), if specified.",
            },
            responseMessage: {
              type: Type.STRING,
              description: "A short, pleasant, friendly spoken feedback statement to say back to the user.",
            },
            targetTaskId: {
              type: Type.STRING,
              description: "The ID of the matching task from the existing list, if applicable.",
            },
            spotifyTrigger: {
              type: Type.BOOLEAN,
              description: "Set to true if this task involves computer work, coding, focus, study, or writing, suggesting activating the Spotify ambient board.",
            }
          },
          required: ["action", "responseMessage"],
        },
      },
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Voice agent parse error:", error);
    res.status(500).json({
      error: "Failed to parse voice command with AI",
      message: error.message,
    });
  }
});

// API: High-quality Text to Speech
app.post("/api/gemini/tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || "Kore" }, // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
          },
        },
      },
    });

    // Extract the raw base64 encoded audio bytes
    const candidates = response.candidates;
    const base64Audio = candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio payload returned from Gemini TTS API");
    }

    res.json({ audio: base64Audio });
  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    res.status(500).json({
      error: "Failed to generate voice speech",
      message: error.message,
    });
  }
});

// Serve frontend assets and hook up Vite Dev Server Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on port ${PORT}`);
  });
}

startServer();
