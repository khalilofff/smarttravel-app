import { spawn } from "node:child_process";

const port = process.argv[2] || "3000";
const cookiePrefix = process.argv[3] || `smarttravel-${port}`;
const host = process.argv[4] || "localhost";
const appUrl = `http://${host}:${port}`;

const env = {
  ...process.env,
  PORT: port,
  NEXTAUTH_URL: appUrl,
  APP_URL: appUrl,
  NEXTAUTH_COOKIE_PREFIX: cookiePrefix,
};

console.log(`\nSmartTravel local instance`);
console.log(`URL: ${appUrl}`);
console.log(`Cookie prefix: ${cookiePrefix}`);
console.log(`This instance has its own NextAuth cookie namespace.\n`);

const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["next", "dev", "-p", port, "-H", host], {
  stdio: "inherit",
  env,
  shell: false,
});

child.on("exit", (code) => process.exit(code ?? 0));
