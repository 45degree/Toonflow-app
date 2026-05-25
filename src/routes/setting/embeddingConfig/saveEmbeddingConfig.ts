import express from "express";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import u from "@/utils";
import { disposeEmbedding } from "@/utils/agent/embedding";
import { z } from "zod";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    embeddingApiUrl: z.string().url(),
    embeddingApiKey: z.string(),
    embeddingModel: z.string().min(1),
  }),
  async (req, res) => {
    const { embeddingApiUrl, embeddingApiKey, embeddingModel } = req.body;

    const upsert = async (key: string, value: string) => {
      const exists = await u.db("o_setting").where("key", key).first();
      if (exists) {
        await u.db("o_setting").where("key", key).update({ value });
      } else {
        await u.db("o_setting").insert({ key, value });
      }
    };

    await upsert("embeddingApiUrl", embeddingApiUrl);
    await upsert("embeddingApiKey", embeddingApiKey);
    await upsert("embeddingModel", embeddingModel);
    await disposeEmbedding();

    res.status(200).send(success("保存设置成功"));
  },
);
