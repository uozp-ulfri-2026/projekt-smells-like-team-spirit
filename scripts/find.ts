import fs from "node:fs";

// Load the JSON file
const data: { city: string; country: string }[] = JSON.parse(
  fs.readFileSync("assets/mmc-city-country-pairs.json", "utf8")
);

// City to search for
const target = "Benkovac";

// Find all indices where city matches
const indices = data
  .map((entry, index) => (entry.city === target ? index : -1))
  .filter((i) => i !== -1);

console.log(`Indices for ${target}:`, indices);
