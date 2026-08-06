import dotenv from "dotenv";
dotenv.config();
;

console.log("API Key:", process.env.GEMINI_API_KEY);
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function main() {
  try {
    const models = await ai.models.list();

    console.log("Available models:\n");

    for await (const model of models) {
      console.log(model.name);
    }
  } catch (err) {
    console.error(err);
  }
}

main();