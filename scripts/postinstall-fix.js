import fs from "fs";
import path from "path";

const patchesDir = path.resolve("patches/unenv");
const filePath = path.join(patchesDir, "process.js");

fs.mkdirSync(patchesDir, { recursive: true });
fs.writeFileSync(filePath, "export default {};", "utf8");

console.log("✅ Created patches/unenv/process.js");
