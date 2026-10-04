// Writes docs/audio-checklist.csv: every clip the app needs, with the exact
// vowelled Arabic text, so a native MSA speaker can record and a reviewer can
// tick off each file.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const data = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url), 'utf8'));
const manifest = existsSync(new URL('../public/audio/manifest.json', import.meta.url))
  ? JSON.parse(readFileSync(new URL('../public/audio/manifest.json', import.meta.url), 'utf8')).files
  : {};
const rows = [['file', 'arabic_text', 'transliteration', 'notes', 'recorded']];
const stem = (p) => p.replace(/\.[a-z0-9]+$/i, '');
const add = (audio, text, tr, notes) => rows.push([audio, text, tr, notes, stem(audio) in manifest ? 'yes' : 'no']);

for (const l of data('letters.json')) {
  for (const f of l.forms) add(f.audio, f.text, f.phonemes, `Level 1 short vowel (${f.vowel}) — say the SOUND only, not the letter name`);
  for (const f of l.longForms) add(f.audio, f.text, f.phonemes, `Level 2 long vowel (${f.vowel}) — clearly lengthened (~2× short)`);
}
for (const w of data('words.json')) add(w.audio, w.word, w.translit, `word level ${w.level} — ${w.gloss}`);
for (const s of data('stories.json')) {
  add(s.audio, s.sentences.join(' '), '', `story for ${s.letter} — all three sentences, slow FS2 pace`);
  s.sentences.forEach((t, i) => add(s.sentenceAudio[i], t, '', `story ${s.letter} sentence ${i + 1} (optional; enables highlighting)`));
}
for (const s of data('sentences.json')) add(s.audio, s.text, '', `decodable sentence — ${s.gloss}`);
for (const i of data('instructions.json')) add(i.audio, i.text, '', 'instruction');

const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
writeFileSync(new URL('../docs/audio-checklist.csv', import.meta.url), '\ufeff' + csv + '\n');
console.log(`audio checklist: ${rows.length - 1} clips`);
