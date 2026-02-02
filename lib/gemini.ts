
import { GoogleGenAI } from "@google/genai";

// A API Key é injetada automaticamente pelo ambiente
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const MODELS = {
  flash: 'gemini-3-flash-preview',
  pro: 'gemini-3-pro-preview'
};
