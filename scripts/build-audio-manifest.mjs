// Scans public/audio for recorded files and writes public/audio/manifest.json.
// Run automatically before every build; run manually after adding recordings.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../public/audio/', import.meta.url).pathname;
const AUDIO = /\.(mp3|m4a|aac|ogg|opus|wav)$/i;
const files = {};
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (AUDIO.test(name) && statSync(p).size > 0) {
      const rel = relative(root, p).split('\\').join('/');
      files[rel.replace(AUDIO, '')] = rel;
    }
  }
}
walk(root);
writeFileSync(join(root, 'manifest.json'), JSON.stringify({ files }, null, 2) + '\n');
console.log(`audio manifest: ${Object.keys(files).length} recording(s)`);
