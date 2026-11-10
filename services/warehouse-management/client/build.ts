// Build React UI → public/app.js (served by Elysia static plugin)
const result = await Bun.build({
  entrypoints: ["./client/app.tsx"],
  outdir: "./public",
  target: "browser",
  minify: true,
});

if (!result.success) {
  console.error("❌ UI build failed:");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.log("✅ UI built → public/app.js");
