import { GoogleGenerativeAI } from "@google/generative-ai";
import { Request, Response } from "express";
import { geminiTokenBucket } from "../server";
import retryWithBackoff from "../helpers/retry_with_backoff";

async function askGemini(prompt: string) {
  if (!geminiTokenBucket.take(1)) {
    const waitTime = geminiTokenBucket.getWaitTime(1);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    return await askGemini(prompt);
  }

  try {
    const GEMINI_API_KEY = process.env.GEMINI_KEY;

    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API Key not found");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    throw new Error("Gemini AI Request Failed");
  }
}

interface UserEntries {
  [userId: number]: string[];
}

async function getSummaryFromGemini(req: Request, res: Response) {
  try {
    console.log("---- Processing /api/summary ----");
    console.log(
      `LOG: Request Body contains ${Object.keys(req.body).length} users`
    );

    const userEntries: UserEntries = req.body;
    const summaries: { [userId: number]: string } = {};

    // Processing users one by one to avoid overloading the Gemini API
    for (const [userId, entries] of Object.entries(userEntries)) {
      try {
        console.log(
          `LOG: Processing User ID: ${userId} with ${entries.length} entries`
        );

        // Join all entries and respect Gemini's context limits
        const combinedEntries = entries.join("\n\n");

        // Check if we are processing too large of a text
        if (combinedEntries.length > 30000) {
          console.log(
            `LOG: Entries too large (${combinedEntries.length} chars), chunking...`
          );

          const chunks = chunkText(combinedEntries);
          console.log(`LOG: Split into ${chunks.length} chunks`);

          // Process each chunk and combine the summaries
          const chunkSummaries: string[] = [];

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(
              `LOG: Processing chunk ${i + 1}/${
                chunks.length
              } for User ${userId}`
            );

            const promptPrefix =
              i === 0
                ? "Summarize the following journal entries for the user. "
                : "This is a continuation of journal entries from the same user. Continue the summary. ";

            const prompt = `${promptPrefix}Write in second person. Here are the entries:\n\n${chunk}`;

            const chunkSummary = await retryWithBackoff(() =>
              askGemini(prompt)
            );
            chunkSummaries.push(chunkSummary);
          }

          // Merge the summaries if we had multiple chunks
          if (chunkSummaries.length > 1) {
            const combinedChunkSummaries = chunkSummaries.join("\n\n");
            const finalPrompt = `Combine these partial summaries into one cohesive summary. Write in second person and provide ways the user could ensure their mental well-being:\n\n${combinedChunkSummaries}`;
            summaries[Number(userId)] = await retryWithBackoff(() =>
              askGemini(finalPrompt)
            );
          } else {
            summaries[Number(userId)] = chunkSummaries[0];
          }
        } else {
          // Normal processing for entries that fit within limits
          const prompt = `Summarize the following journal entries for the user. Write them in second person. Do not include any other information. Also provide ways by which the user could ensure his/her mental well-being. Here are the entries:\n\n${combinedEntries}`;

          summaries[Number(userId)] = await retryWithBackoff(() =>
            askGemini(prompt)
          );
        }

        console.log(`LOG: Successfully generated summary for User ${userId}`);
      } catch (error) {
        console.error(
          `❌ ERROR: Failed to generate summary for User ${userId}`,
          error
        );
        summaries[Number(userId)] =
          "Unable to generate summary due to an error.";
      }
    }

    console.log(
      `LOG: Completed summaries for ${Object.keys(summaries).length} users`
    );
    res.json(summaries);
  } catch (error) {
    console.error("❌ ERROR: Summary Processing Failed", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export { getSummaryFromGemini };
