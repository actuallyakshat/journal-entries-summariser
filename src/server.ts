import { NextFunction, Request, Response } from "express";
import { getSummaryFromGemini } from "./controller/get_summary_from_gemini";
import { TokenBucket } from "./token-bucket/token_bucket";

const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_SECRET;
const port = process.env.PORT || 3000;

// Using a token bucket system to implement rate limiting
export const geminiTokenBucket = new TokenBucket(60, 1 / 1000);

app.get("/", (_: Request, res: Response) => {
  res.send("Service is running");
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const providedKey = req.headers["x-api-key"];
  if (providedKey === API_KEY) {
    next();
  } else {
    res.status(403).json({ error: "Forbidden - Invalid API Key" });
  }
});

app.post("/api/summary", getSummaryFromGemini);

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});
