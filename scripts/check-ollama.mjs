const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const model = process.env.OLLAMA_MODEL || "llama3";

async function main() {
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const models = Array.isArray(data.models) ? data.models.map((m) => m.name) : [];
    const hasModel = models.some((name) => name === model || name.startsWith(model + ":") || name.startsWith(model));
    console.log("✅ Ollama server is reachable:", baseUrl);
    if (hasModel) {
      console.log(`✅ Ollama model found: ${model}`);
    } else {
      console.log(`⚠️ Ollama is running, but model '${model}' was not found.`);
      console.log(`Run: ollama pull ${model}`);
      console.log("Installed models:", models.length ? models.join(", ") : "none");
    }
  } catch (error) {
    console.log("⚠️ Ollama server is not reachable yet.");
    console.log("Install/start Ollama, then run:");
    console.log(`  ollama pull ${model}`);
    console.log("  npm run ollama:check");
    console.log("The app will still run, but itinerary generation will use the local scoring fallback until Ollama is available.");
  }
}

main();
