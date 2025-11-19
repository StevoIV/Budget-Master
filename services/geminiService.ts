import { GoogleGenAI } from "@google/genai";
import { BudgetMonth } from "../types";

// Use process.env.API_KEY as per instructions.
// In a real scenario, ensure this environment variable is set.
const apiKey = process.env.API_KEY || ''; 

export const getBudgetInsights = async (monthData: BudgetMonth): Promise<string> => {
  if (!apiKey) {
    return "API Key is missing. Please configure the environment.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Simplify data for the prompt to save tokens and focus attention
    const promptData = {
      totals: {
        income: monthData.transactions.filter(t => t.type === 'INCOMING').reduce((acc, t) => acc + t.amount, 0),
        expenses: monthData.transactions.filter(t => t.type !== 'INCOMING').reduce((acc, t) => acc + t.amount, 0),
      },
      categories: monthData.transactions.reduce((acc: any, t) => {
        if (t.type !== 'INCOMING') {
            acc[t.type] = (acc[t.type] || 0) + t.amount;
        }
        return acc;
      }, {}),
      largestExpenses: monthData.transactions
        .filter(t => t.type !== 'INCOMING')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map(t => `${t.name}: £${t.amount}`)
    };

    const prompt = `
      You are a helpful financial assistant for Chris and Dani. 
      Analyze their monthly budget data below in JSON format.
      
      Data: ${JSON.stringify(promptData)}

      Please provide 3 specific, actionable, and friendly observations or tips to help them save money or manage their cash flow better.
      Keep it brief (max 100 words total). Format as a bulleted list.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate insights at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I couldn't analyze your budget right now. Please try again later.";
  }
};