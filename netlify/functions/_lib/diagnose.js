const fs = require("fs");
const path = require("path");

console.log("=== DIAGNOSTIC RUN ===");
console.log("process.cwd():", process.cwd());
console.log("__dirname:", __dirname);

const rootStorePath = path.join(process.cwd(), "local_gallery_store.json");
console.log("Expected local store path:", rootStorePath);
console.log("Does root store file exist?", fs.existsSync(rootStorePath));

if (fs.existsSync(rootStorePath)) {
  try {
    const data = fs.readFileSync(rootStorePath, "utf8");
    console.log("Root store size (bytes):", data.length);
    const parsed = JSON.parse(data || "{}");
    console.log("Number of images in root store:", Object.keys(parsed).length);
    console.log("Images keys:", Object.keys(parsed));
  } catch (err) {
    console.error("Error reading root store file:", err.message);
  }
}

try {
  const inlined = require("../../../local_gallery_store.json");
  console.log("Inlined store loaded via require successfully!");
  console.log("Number of images in inlined store:", Object.keys(inlined).length);
} catch (err) {
  console.error("Failed to require inlined store:", err.message);
}
console.log("======================");
