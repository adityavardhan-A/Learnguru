import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize Gemini SDK when an API key is configured
export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const hasGeminiConfig = !!apiKey;
