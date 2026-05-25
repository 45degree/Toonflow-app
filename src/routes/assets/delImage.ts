import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    id: z.number(),
  }),
  async (req, res) => {
    const { id } = req.body;
    const imageRow = await u.db("o_image").where({ id }).first();
    await u.db("o_assets").where({ imageId: id }).update({
      imageId: null,
    });
    await u.db("o_image").where({ id }).delete();
    if (imageRow?.filePath) {
      await u.oss.deleteFile(imageRow.filePath);
    }
    res.status(200).send(success({ message: "资产图片删除成功" }));
  },
);
