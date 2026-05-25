import axios from "axios";
import db from "@/utils/db";

const DEFAULT_EMBEDDING_API_URL = "https://api.openai.com/v1/embeddings";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

interface EmbeddingConfig {
  embeddingApiUrl: string;
  embeddingApiKey: string;
  embeddingModel: string;
}

let configCache: EmbeddingConfig | null = null;

async function getEmbeddingConfig(): Promise<EmbeddingConfig> {
  const rows = await db("o_setting").whereIn("key", ["embeddingApiUrl", "embeddingApiKey", "embeddingModel"]);
  const values: Record<string, string> = {};
  for (const row of rows) {
    if (row.key) values[row.key] = row.value ?? "";
  }

  return {
    embeddingApiUrl: values.embeddingApiUrl || DEFAULT_EMBEDDING_API_URL,
    embeddingApiKey: values.embeddingApiKey || "",
    embeddingModel: values.embeddingModel || DEFAULT_EMBEDDING_MODEL,
  };
}

export async function initEmbedding(): Promise<void> {
  if (configCache) return;
  configCache = await getEmbeddingConfig();
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (!configCache) await initEmbedding();
  const config = configCache!;
  if (!config.embeddingApiUrl) throw new Error("Embedding API URL 未配置");
  if (!config.embeddingModel) throw new Error("Embedding 模型未配置");

  const response = await axios.post(
    config.embeddingApiUrl,
    {
      model: config.embeddingModel,
      input: text,
    },
    {
      headers: {
        "Content-Type": "application/json",
        ...(config.embeddingApiKey ? { Authorization: `Bearer ${config.embeddingApiKey}` } : {}),
      },
    },
  );

  const embedding = response.data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.some((value) => typeof value !== "number")) {
    throw new Error("Embedding API 响应格式无效");
  }
  return embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return -Infinity;
  return a.reduce((dot, v, i) => dot + v * b[i], 0);
}

export async function disposeEmbedding(): Promise<void> {
  configCache = null;
}
