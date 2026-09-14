// routes.js
import log from "@/common/chalk";
import express from "express";
import { OpenAI } from "openai";
import { asyncHandler } from "../middleware/common";

const router = express.Router();
router.post(
  "/aiwrite",
  asyncHandler(async (req, res) => {
    const { content } = req.body;
    const getAi = async (content) => {
      const openai = new OpenAI({
        apiKey: "REDACTED_PROVIDER_API_KEY",
        baseURL: "https://api.nextapi.fun/v1",
      });
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "user",
            content: ` Continue write this Article in "zh" language
            start with:
      "${content}"
      
      CONCISE SUMMARY:`,
          },
        ],
        model: "gpt-3.5-turbo",
      });
      const summary = completion.choices[0].message.content;
      return summary;
    };
    try {
      const data = await getAi(content);
      res.json({ status: 1, data });
    } catch (error) {
      log.error(JSON.stringify(error));
    }
  })
);

export default router;
