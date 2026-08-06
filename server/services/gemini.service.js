import dotenv from "dotenv"
dotenv.config()

import { GoogleGenAI } from "@google/genai";


const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

export const askAi = async (messages) => {
    try {
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            throw new Error("Messages array is empty.");
        }

        // Extract system + user prompts
        const systemInstruction =
            messages.find((m) => m.role === "system")?.content || "";

        const userPrompt =
            messages
                .filter((m) => m.role === "user")
                .map((m) => m.content)
                .join("\n") || "";

        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: userPrompt,
            config: {
                systemInstruction,
                temperature: 0.2,
            },
        });

        const text = response.text?.trim();

        if (!text) {
            throw new Error("Gemini returned an empty response.");
        }

        return text;

    } catch (error) {
        console.error("Gemini Error:", error);
        throw error;
    }
};