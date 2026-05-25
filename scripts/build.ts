import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

// 打包默认使用 prod 环境变量
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "prod";
}

const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));

function buildWeb() {
  if (process.env.SKIP_WEB_BUILD === "1") return;

  const webDir = path.resolve("web");
  const webPackage = path.join(webDir, "package.json");
  if (!fs.existsSync(webPackage)) {
    console.warn("⚠️ 未找到 web/package.json，跳过前端构建");
    return;
  }

  console.log("🔨 开始构建前端...\n");
  if (!fs.existsSync(path.join(webDir, "node_modules"))) {
    execFileSync("yarn", ["install", "--frozen-lockfile"], { cwd: webDir, stdio: "inherit" });
  }
  execFileSync("yarn", ["build-only"], {
    cwd: webDir,
    stdio: "inherit",
    env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=4096" },
  });

  const webDist = path.join(webDir, "dist");
  const targetWebDir = path.resolve("data", "web");
  fs.rmSync(targetWebDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(targetWebDir), { recursive: true });
  fs.cpSync(webDist, targetWebDir, { recursive: true });
  console.log("✅ 前端构建完成: data/web\n");
}

const external = [
  "electron",
  "@huggingface/transformers",
  "onnxruntime-node",
  "vm2",
  "sqlite3",
  "better-sqlite3",
  "sharp",
  "mysql",
  "mysql2",
  "pg",
  "pg-query-stream",
  "oracledb",
  "tedious",
  "mssql",
];

// 后端服务打包配置
const appBuildConfig: esbuild.BuildOptions = {
  entryPoints: ["src/app.ts"],
  bundle: true,
  minify: false,
  format: "cjs",
  allowOverwrite: true,
  outfile: `data/serve/app.js`,
  platform: "node",
  target: "esnext",
  tsconfig: "./tsconfig.json",
  alias: {
    "@": "./src",
  },
  sourcemap: false,
  external,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
};

// Electron 主进程打包配置
const mainBuildConfig: esbuild.BuildOptions = {
  entryPoints: ["scripts/main.ts"],
  bundle: true,
  minify: false,
  format: "cjs",
  outfile: `build/main.js`,
  allowOverwrite: true,
  platform: "node",
  target: "esnext",
  tsconfig: "./tsconfig.json",
  alias: {
    "@": "./src",
  },
  sourcemap: false,
  external,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
};

(async () => {
  try {
    await buildWeb();

    console.log("🔨 开始构建后端...\n");

    // 并行构建
    await Promise.all([esbuild.build(appBuildConfig), esbuild.build(mainBuildConfig)]);

    console.log("✅ 后端服务构建完成: build/app.js");
    console.log("✅ Electron主进程构建完成: build/main.js");
    console.log("\n🎉 所有构建任务完成!\n");
  } catch (err) {
    console.error("❌ 构建失败:", err);
    process.exit(1);
  }
})();
