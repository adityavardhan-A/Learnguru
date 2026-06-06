import { useState } from 'react';
import { genAI, hasGeminiConfig } from '../services/gemini';

const MODEL = 'gemini-2.5-flash';

export const useGemini = () => {
  const [loadingAI, setLoadingAI] = useState(false);
  const [errorAI, setErrorAI] = useState(null);

  // Strip markdown code fences from a model response
  const cleanJsonString = (rawStr) => {
    let clean = rawStr.trim();
    if (clean.startsWith('```json')) clean = clean.slice(7);
    else if (clean.startsWith('```')) clean = clean.slice(3);
    if (clean.endsWith('```')) clean = clean.slice(0, -3);
    return clean.trim();
  };

  const ensureConfigured = () => {
    if (!hasGeminiConfig || !genAI) {
      throw new Error('Gemini API key is not configured. Set VITE_GEMINI_API_KEY in your environment.');
    }
  };

  // 1. Generate exactly 5 MCQs from lecture notes
  const generateQuiz = async (lectureTitle, notesContent) => {
    setLoadingAI(true);
    setErrorAI(null);

    const systemPrompt = `You are a professional educational assessor for the Learn Guru LMS. Generate a multiple-choice quiz with exactly 5 distinct questions based strictly on the lecture material below.

Output MUST be a valid JSON array with this exact structure:
[
  {
    "question": "Question text",
    "options": ["First option", "Second option", "Third option", "Fourth option"],
    "answer": "First option",
    "explanation": "Why the answer is correct."
  }
]

RULES:
1. Exactly 5 questions, each with exactly 4 options.
2. The "answer" string MUST exactly match one of the items in "options".
3. Output ONLY the raw JSON array, with no markdown fences or extra text.

Lecture Title: ${lectureTitle}
Notes:
${notesContent}`;

    try {
      ensureConfigured();
      const model = genAI.getGenerativeModel({ model: MODEL });
      const result = await model.generateContent(systemPrompt);
      const parsed = JSON.parse(cleanJsonString(result.response.text()));
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Gemini returned an unexpected quiz format.');
      }
      return parsed.slice(0, 5);
    } catch (err) {
      console.error('AI quiz generation error:', err);
      setErrorAI(err.message || 'Failed to generate AI quiz.');
      throw err;
    } finally {
      setLoadingAI(false);
    }
  };

  // 2. Generate a markdown summary of lecture notes
  const generateSummary = async (lectureTitle, notesContent) => {
    setLoadingAI(true);
    setErrorAI(null);

    const systemPrompt = `You are an expert academic tutor for Learn Guru. Summarize the lecture material below into a concise, professional study summary using rich markdown: bulleted key takeaways, a short conceptual explanation, bold highlight terms, and 3 actionable "Pro Tips".

Lecture Title: ${lectureTitle}
Content:
${notesContent}`;

    try {
      ensureConfigured();
      const model = genAI.getGenerativeModel({ model: MODEL });
      const result = await model.generateContent(systemPrompt);
      return result.response.text();
    } catch (err) {
      console.error('AI summary error:', err);
      setErrorAI(err.message || 'Failed to generate AI summary.');
      throw err;
    } finally {
      setLoadingAI(false);
    }
  };

  // 3. Free-form tutor chat reply
  const generateChatReply = async (question, context = {}) => {
    const systemPrompt = `You are a helpful AI tutor for Learn Guru, an LMS platform.
${context.course ? `The student is in the course: "${context.course}".` : ''}
Student name: ${context.name || 'Student'}, Role: ${context.role || 'student'}.
Answer concisely and helpfully about course material, platform features (lectures, quizzes, assignments, live classes, leaderboard, XP), and learning strategies. Keep responses under 150 words.

Question: ${question}`;

    ensureConfigured();
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(systemPrompt);
    return result.response.text();
  };

  return {
    generateQuiz,
    generateSummary,
    generateChatReply,
    hasGeminiConfig,
    loadingAI,
    errorAI
  };
};
