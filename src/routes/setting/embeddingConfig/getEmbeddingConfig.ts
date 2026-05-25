import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";

const router = express.Router();

const DEFAULTS = {
  embeddingApiUrl: "https://api.openai.com/v1/embeddings",
  embeddingApiKey: "",
  embeddingModel: "text-embedding-3-small",
};

export default router.get("/", async (req, res) => {
  const rows = await u.db("o_setting").whereIn("key", Object.keys(DEFAULTS));
  const values: Record<string, string> = { ...DEFAULTS };

  for (const row of rows) {
    if (row.key && row.key in values) values[row.key] = row.value ?? "";
  }

  res.status(200).send(success(values));
});
