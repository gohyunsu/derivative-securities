import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const chapters = [
  ['01-introduction.md', 7],
  ['02-basics.md', 14],
  ['03-volatility-and-losses.md', 36],
  ['04-forward-futures-mechanics.md', 30],
  ['05-forward-pricing.md', 24],
  ['06-hedging-and-cfar.md', 24],
];
let total = 0;
for (const [file, expected] of chapters) {
  const id = file.slice(0, 2);
  const source = fs.readFileSync(path.join(root, 'content', file), 'utf8');
  const numbers = [...source.matchAll(/^## 슬라이드 (\d{2}) · /gm)].map(m => Number(m[1]));
  const wanted = Array.from({length: expected}, (_, i) => i + 1);
  if (JSON.stringify(numbers) !== JSON.stringify(wanted)) {
    throw new Error(`${file}: section sequence is ${numbers.join(',')}`);
  }
  for (const page of wanted) {
    const target = path.join(root, 'docs', 'assets', 'slides', id, `${String(page).padStart(2, '0')}.webp`);
    if (!fs.existsSync(target) || fs.statSync(target).size < 1000) {
      throw new Error(`Missing or empty slide image: ${target}`);
    }
  }
  if (!fs.existsSync(path.join(root, 'docs', 'lecture', `${id}.html`))) {
    throw new Error(`Missing lecture page: ${id}`);
  }
  total += expected;
}
const publicRoot = path.join(root, 'docs');
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(d => {
    const entry = path.join(dir, d.name);
    return d.isDirectory() ? walk(entry) : [entry];
  });
}
const forbidden = walk(publicRoot).filter(p => /\.(pdf|txt|tex|jpg|jpeg|png)$/i.test(p));
if (forbidden.length) throw new Error(`Unexpected source-like files in docs/: ${forbidden.join(', ')}`);
if (!fs.existsSync(path.join(root, 'guide', 'main.tex'))) throw new Error('Missing guide/main.tex');
console.log(`Verified ${chapters.length} lectures, ${total} slide sections and images; no source files in docs/.`);
