import { Request, Response, NextFunction } from "express";
const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const GoogleGenerativeAI = require("@google/generative-ai").GoogleGenerativeAI;
dotenv.config();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_KEY;
const port = process.env.PORT || 3000;

console.log("Server is starting...");
console.log(`PORT: ${port}`);
console.log(`API KEY: ${API_KEY ? "Loaded" : "Missing"}`);
console.log(`GEMINI API KEY: ${GEMINI_API_KEY ? "Loaded" : "Missing"}`);

app.get("/", (req: Request, res: Response) => {
  res.send("Service is running");
});

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log("---- Incoming Request ----");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", JSON.stringify(req.headers, null, 2));

  const providedKey = req.headers["x-api-key"];
  if (providedKey === API_KEY) {
    console.log("✅ API Key Matched");
    next();
  } else {
    console.error("❌ API Key Mismatch - Forbidden Access");
    res.status(403).json({ error: "Forbidden - Invalid API Key" });
  }
});

async function askGemini(prompt: string) {
  try {
    console.log("LOG: Calling Gemini AI...");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    console.log("LOG: Gemini AI Response Received");
    return result.response.text();
  } catch (error) {
    console.error("❌ ERROR: Failed to fetch Gemini AI response", error);
    throw new Error("Gemini AI Request Failed");
  }
}

interface UserEntries {
  [userId: number]: string[];
}

app.post("/api/summary", async (req: Request, res: Response) => {
  try {
    console.log("---- Processing /api/summary ----");
    console.log("Request Body:", JSON.stringify(req.body, null, 2));

    const userEntries: UserEntries = req.body;
    const summaries: { [userId: number]: string } = {};

    for (const [userId, entries] of Object.entries(userEntries)) {
      console.log(`LOG: Summarizing entries for User ID: ${userId}`);

      const prompt = `Summarize the following journal entries for the user. Write them in second person. Do not include any other information. Also provide ways by which the user could ensure his/her mental well-being. Here are the entries:\n\n${entries.join(
        "\n"
      )}`;

      const summary = await askGemini(prompt);
      summaries[Number(userId)] = summary;
    }

    console.log("LOG: Summarization completed successfully");
    res.json(summaries);
  } catch (error) {
    console.error("❌ ERROR: Summary Processing Failed", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});
