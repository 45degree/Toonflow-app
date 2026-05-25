/**
 * Toonflow AI供应商模板 - SiliconFlow
 * @version 1.0
 */

type VideoMode =
  | "singleImage"
  | "startEndRequired"
  | "endFrameOptional"
  | "startFrameOptional"
  | "text"
  | (`videoReference:${number}` | `imageReference:${number}` | `audioReference:${number}`)[];

interface TextModel {
  name: string;
  modelName: string;
  type: "text";
  think: boolean;
}

interface ImageModel {
  name: string;
  modelName: string;
  type: "image";
  mode: ("text" | "singleImage" | "multiReference")[];
  associationSkills?: string;
}

interface VideoModel {
  name: string;
  modelName: string;
  type: "video";
  mode: VideoMode[];
  associationSkills?: string;
  audio: "optional" | false | true;
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
}

interface TTSModel {
  name: string;
  modelName: string;
  type: "tts";
  voices: { title: string; voice: string }[];
}

interface VendorConfig {
  id: string;
  version: string;
  name: string;
  author: string;
  description?: string;
  icon?: string;
  inputs: { key: string; label: string; type: "text" | "password" | "url"; required: boolean; placeholder?: string }[];
  inputValues: Record<string, string>;
  models: (TextModel | ImageModel | VideoModel | TTSModel)[];
}

type ReferenceList =
  | { type: "image"; sourceType: "base64"; base64: string }
  | { type: "audio"; sourceType: "base64"; base64: string }
  | { type: "video"; sourceType: "base64"; base64: string };

interface ImageConfig {
  prompt: string;
  referenceList?: Extract<ReferenceList, { type: "image" }>[];
  size: "1K" | "2K" | "4K";
  aspectRatio: `${number}:${number}`;
}

interface VideoConfig {
  duration: number;
  resolution: string;
  aspectRatio: "16:9" | "9:16";
  prompt: string;
  referenceList?: ReferenceList[];
  audio?: boolean;
  mode: VideoMode[];
}

interface TTSConfig {
  text: string;
  voice: string;
  speechRate: number;
  pitchRate: number;
  volume: number;
  referenceList?: Extract<ReferenceList, { type: "audio" }>[];
}

declare const axios: any;
declare const logger: (msg: string) => void;
declare const urlToBase64: (url: string) => Promise<string>;
declare const createOpenAICompatible: any;
declare const exports: {
  vendor: VendorConfig;
  textRequest: (m: TextModel, t: boolean, tl: 0 | 1 | 2 | 3) => any;
  imageRequest: (c: ImageConfig, m: ImageModel) => Promise<string>;
  videoRequest: (c: VideoConfig, m: VideoModel) => Promise<string>;
  ttsRequest: (c: TTSConfig, m: TTSModel) => Promise<string>;
};

const vendor: VendorConfig = {
  id: "siliconflow",
  version: "1.0",
  author: "Toonflow",
  name: "SiliconFlow",
  description: "SiliconFlow 图片生成接口适配，支持 Kwai-Kolors/Kolors。",
  inputs: [
    { key: "apiKey", label: "API密钥", type: "password", required: true },
    { key: "baseUrl", label: "请求地址", type: "url", required: true, placeholder: "示例：https://api.siliconflow.cn/v1" },
  ],
  inputValues: {
    apiKey: "",
    baseUrl: "https://api.siliconflow.cn/v1",
  },
  models: [
    {
      name: "Kolors",
      modelName: "Kwai-Kolors/Kolors",
      type: "image",
      mode: ["text"],
    },
  ],
};

function getHeaders() {
  if (!vendor.inputValues.apiKey) throw new Error("缺少API Key");
  const apiKey = vendor.inputValues.apiKey.replace(/^Bearer\s+/i, "");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

function getImageEndpoint() {
  const baseUrl = (vendor.inputValues.baseUrl || "https://api.siliconflow.cn/v1").replace(/\/+$/, "");
  return baseUrl.endsWith("/images/generations") ? baseUrl : `${baseUrl}/images/generations`;
}

function getImageSize(config: ImageConfig) {
  const sizeTable: Record<string, Record<string, string>> = {
    "1K": {
      "1:1": "1024x1024",
      "4:3": "1152x864",
      "3:4": "864x1152",
      "16:9": "1280x720",
      "9:16": "720x1280",
      "3:2": "1248x832",
      "2:3": "832x1248",
    },
    "2K": {
      "1:1": "2048x2048",
      "4:3": "2304x1728",
      "3:4": "1728x2304",
      "16:9": "2560x1440",
      "9:16": "1440x2560",
      "3:2": "2496x1664",
      "2:3": "1664x2496",
    },
    "4K": {
      "1:1": "4096x4096",
      "4:3": "3840x2880",
      "3:4": "2880x3840",
      "16:9": "3840x2160",
      "9:16": "2160x3840",
      "3:2": "3840x2560",
      "2:3": "2560x3840",
    },
  };

  return sizeTable[config.size]?.[config.aspectRatio] ?? "1024x1024";
}

const textRequest = (model: TextModel) => {
  if (!vendor.inputValues.apiKey) throw new Error("缺少API Key");
  const apiKey = vendor.inputValues.apiKey.replace(/^Bearer\s+/i, "");
  return createOpenAICompatible({ name: "siliconflow", baseURL: vendor.inputValues.baseUrl, apiKey }).chatModel(model.modelName);
};

const imageRequest = async (config: ImageConfig, model: ImageModel): Promise<string> => {
  const body = {
    model: model.modelName,
    prompt: config.prompt,
    image_size: getImageSize(config),
    batch_size: 1,
    num_inference_steps: 20,
    guidance_scale: 7.5,
  };

  logger(`[SiliconFlow图片生成] 请求模型: ${model.modelName}, 尺寸: ${body.image_size}`);
  const response = await axios.post(getImageEndpoint(), body, { headers: getHeaders() });
  const data = response.data;

  if (data?.error) {
    throw new Error(`图片生成失败：${data.error.message || data.error.code || JSON.stringify(data.error)}`);
  }

  const item = data?.data?.[0];
  if (item?.url) return await urlToBase64(item.url);
  if (item?.b64_json) return item.b64_json.startsWith("data:") ? item.b64_json : `data:image/png;base64,${item.b64_json}`;

  throw new Error(`图片生成失败：未返回有效图片，响应：${JSON.stringify(data)}`);
};

const videoRequest = async (config: VideoConfig, model: VideoModel): Promise<string> => {
  throw new Error("SiliconFlow 供应商暂未实现视频生成");
};

const ttsRequest = async (config: TTSConfig, model: TTSModel): Promise<string> => {
  throw new Error("SiliconFlow 供应商暂未实现语音生成");
};

exports.vendor = vendor;
exports.textRequest = textRequest;
exports.imageRequest = imageRequest;
exports.videoRequest = videoRequest;
exports.ttsRequest = ttsRequest;

export {};
