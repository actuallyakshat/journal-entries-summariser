import { Request, Response } from "express";
const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const GoogleGenerativeAI = require("@google/generative-ai").GoogleGenerativeAI;
dotenv.config();

app.use(cors());
app.use(express.json());

app.set("trust proxy", true);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 10 requests per windowMs
});

const API_KEY = process.env.API_SECRET;

app.use((req: Request, res: Response, next: Function) => {
  console.log("LOG: REQUEST @", new Date(Date.now()));

  console.log("REQUEST METHOD AND URL :", req.method, req.url);
  console.log("HEADER KEY: ", req.headers["x-api-key"]);

  const providedKey = req.headers["x-api-key"];
  if (providedKey === API_KEY) {
    next();
  } else {
    res.status(403).send("Forbidden");
  }
});

app.use(limiter);

const port = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_KEY;

interface UserEntries {
  [userId: number]: string[];
}

async function askGemini(prompt: string) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

app.get("/", (req: Request, res: Response) => {
  res.send("Service is running");
});

app.post("/api/summary", async (req: Request, res: Response) => {
  try {
    console.log("LOG: SUMMARISING ENTIRES @", new Date(Date.now()));

    const userEntries: UserEntries = req.body;
    const summaries: { [userId: number]: string } = {};
    for (const [userId, entries] of Object.entries(userEntries)) {
      const prompt = `Summarize the following journal entries for the user. Write them in second person. Do not include any other information. Also provide ways by which the user could ensure his/her mental well-being. Here are the entries:\n\n${entries.join(
        "\n"
      )}`;

      const summary = await askGemini(prompt);
      summaries[Number(userId)] = summary;
    }

    console.log("LOG: SUMMARISED ENTIRES @", new Date(Date.now()));
    res.json(summaries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log("API KEY: ", API_KEY);
  console.log(`Server is running at http://localhost:${port}`);
});
