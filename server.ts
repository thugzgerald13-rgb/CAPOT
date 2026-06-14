import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API route
app.post("/api/suggest-category", async (req, res) => {
  try {
    const { vendor, details, amount, availableCategories, currentExpenseType } = req.body;
    
    if (!vendor && !details) {
      return res.status(400).json({ error: "Missing vendor or details to suggest category." });
    }

    const categoriesString = Array.isArray(availableCategories) 
      ? availableCategories.join(", ") 
      : "Operating Expenses";

    const prompt = `Suggest the most accurate accounting category/account title for the following expense transaction:
- Supplier/Vendor Name: "${vendor || 'Unknown'}"
- Details/Description of purchase: "${details || 'N/A'}"
- Gross amount: ₱${amount || '0'}
- Current Expense Class/Type: "${currentExpenseType || 'Others'}"

You must select or match closely from one of these available account titles/categories:
[${categoriesString}]

Analyze the description and supplier industry:
1. "Meralco", "Electric", "Power" typically map to electricity/utility line items, e.g. "Utilities Expense" or "Operating Expenses".
2. "Globe", "PLDT", "Telecom", "Telecoms", "Internet", "Phone" typically map to communication/internet/utility line items or "Utilities Expense".
3. "Grab", "Uber", "Taxi", "Travel" typically map to travel/transportation expenses or "Operating Expenses".
4. "National Book Store", "Office Depot", "Stationery", "Paper", "Supplies" map to office supplies, stationery, or "Operating Expenses".
5. "SM Supermarket", "Grocery", "Kitchen" are kitchen/office pantry or other general expenses.
6. "Asset", "Machine", "PC", "Computer", "Laptop", "Equipment", "Dell" are assets/capital expenditures (Capital Goods) and map to asset accounts or "Operating Expenses".

Select the most matching account title from the list of available categories. If no direct match exists, return the closest matched category.
Also determine the appropriate expense class: "Capital Goods" (for machinery/assets), "Services", or "Others".

Return your recommendation as a JSON object matching the requested schema.`;

    // Query generative model
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedCategory: { 
              type: Type.STRING,
              description: "The name of the recommended category/account title from the list."
            },
            suggestedExpenseType: { 
              type: Type.STRING,
              description: "The expense class, must be one of: 'Capital Goods', 'Services', or 'Others'."
            },
            confidence: { 
              type: Type.STRING,
              description: "Level of confidence in this match. Can be: 'High', 'Medium', 'Low'."
            },
            reason: { 
              type: Type.STRING,
              description: "Short human-friendly sentence explaining this categorization logic."
            }
          },
          required: ["suggestedCategory", "suggestedExpenseType", "confidence", "reason"]
        }
      }
    });

    const resultText = response?.text;
    if (!resultText) {
      throw new Error("No text returned from Gemini");
    }

    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error("Gemini suggestion error:", error);
    res.status(500).json({ error: error?.message || "Failed to make category suggestion." });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
