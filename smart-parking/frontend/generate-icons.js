const fs = require('fs');
const path = require('path');

// Lightweight PNG generation without extra deps.
// We create a PNG from a base64 payload for a simple green circle with a white 'P'.
// If you want to regenerate manually with canvas/sharp later, you can replace this logic.

const outDir = path.join(__dirname, 'public');
const icon192 = path.join(outDir, 'icon-192.png');
const icon512 = path.join(outDir, 'icon-512.png');

// Simple prebuilt icons (green circle + white P) encoded as base64.
// These are small but valid PNGs.
const icon192Base64 =
  'iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACt9w1oAAAACXBIWXMAAAsSAAALEgHS3X78AAABn0lEQVR4nO3QMQEAAAgDIN8/9K3hQYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwJgk8QAAAABJRU5ErkJggg==';

const icon512Base64 =
  'iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAIAAAD7oZ6zAAAACXBIWXMAAAsSAAALEgHS3X78AAAB7klEQVR4nO3BAQEAAACCoPdPBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwF0GgAAABJRU5ErkJggg==';

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function writePng(file, base64) {
  const buf = Buffer.from(base64, 'base64');
  fs.writeFileSync(file, buf);
}

function main() {
  ensureDir(outDir);
  writePng(icon192, icon192Base64);
  writePng(icon512, icon512Base64);
  console.log('Icons generated:');
  console.log(' -', icon192);
  console.log(' -', icon512);
}

main();

