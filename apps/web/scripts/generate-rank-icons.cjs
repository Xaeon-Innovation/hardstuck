const fs = require("fs");
const path = require("path");

const OW = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#e8a317",
  platinum: "#4ecdc4",
  diamond: "#5dade2",
  master: "#af7ac5",
  grandmaster: "#e74c3c",
  champion: "#f4d03f",
};
const MR = {
  bronze: "#a0522d",
  silver: "#bdc3c7",
  gold: "#f1c40f",
  platinum: "#1abc9c",
  diamond: "#3498db",
  grandmaster: "#9b59b6",
  celestial: "#00cec9",
  eternity: "#fd79a8",
  one_above_all: "#ffeaa7",
};
const AP = {
  rookie: "#95a5a6",
  bronze: "#cd7f32",
  silver: "#ecf0f1",
  gold: "#f39c12",
  platinum: "#1abc9c",
  diamond: "#3498db",
  master: "#e74c3c",
};

function uid(key) {
  return key.replace(/[^a-z0-9]/gi, "");
}

function owSvg(key, div, color) {
  const id = uid(key);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#1a1a1a"/>
    </linearGradient>
  </defs>
  <polygon points="32,4 56,18 56,46 32,60 8,46 8,18" fill="url(#${id})" stroke="${color}" stroke-width="2"/>
  <polygon points="32,14 48,24 48,40 32,50 16,40 16,24" fill="#0a0a0a" opacity="0.45"/>
  <text x="32" y="38" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="16" fill="#efe9dc">${div}</text>
</svg>`;
}

function mrSvg(key, label, color) {
  const id = uid(key);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <radialGradient id="${id}" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#120808"/>
    </radialGradient>
  </defs>
  <path d="M32 4 L52 14 L52 34 C52 48 32 58 32 58 C32 58 12 48 12 34 L12 14 Z" fill="url(#${id})" stroke="${color}" stroke-width="2"/>
  <circle cx="32" cy="30" r="12" fill="#0a0a0a" opacity="0.35"/>
  <text x="32" y="35" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="14" fill="#efe9dc">${label}</text>
</svg>`;
}

function apexSvg(key, roman, color) {
  const id = uid(key);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="${id}" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#1a0505"/>
    </linearGradient>
  </defs>
  <polygon points="32,6 54,50 10,50" fill="url(#${id})" stroke="${color}" stroke-width="2"/>
  <polygon points="32,18 44,44 20,44" fill="#0a0a0a" opacity="0.4"/>
  <text x="32" y="42" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="11" fill="#efe9dc">${roman}</text>
</svg>`;
}

function writeAll(dir, files) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, svg] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name + ".svg"), svg);
  }
}

const root = path.join(__dirname, "../public/ranks");

const owFiles = {};
for (const tier of Object.keys(OW)) {
  for (const d of [5, 4, 3, 2, 1]) {
    const key = `${tier}_${d}`;
    owFiles[key] = owSvg(key, d, OW[tier]);
  }
}
writeAll(path.join(root, "overwatch"), owFiles);

const mrFiles = {};
for (const tier of [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "grandmaster",
  "celestial",
]) {
  for (const d of [3, 2, 1]) {
    const key = `${tier}_${d}`;
    mrFiles[key] = mrSvg(key, String(d), MR[tier]);
  }
}
mrFiles.eternity = mrSvg("eternity", "E", MR.eternity);
mrFiles.one_above_all = mrSvg("one_above_all", "1", MR.one_above_all);
writeAll(path.join(root, "marvel_rivals"), mrFiles);

const apFiles = {};
const romans = { iv: "IV", iii: "III", ii: "II", i: "I" };
for (const tier of [
  "rookie",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
]) {
  for (const d of ["iv", "iii", "ii", "i"]) {
    const key = `${tier}_${d}`;
    apFiles[key] = apexSvg(key, romans[d], AP[tier]);
  }
}
apFiles.master = apexSvg("master", "M", AP.master);
writeAll(path.join(root, "apex"), apFiles);

console.log({
  overwatch: Object.keys(owFiles).length,
  marvel_rivals: Object.keys(mrFiles).length,
  apex: Object.keys(apFiles).length,
});
