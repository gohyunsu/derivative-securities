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
const clarificationSource = fs.readFileSync(path.join(root, 'content', 'clarifications.md'), 'utf8');
const clarificationIds = [...clarificationSource.matchAll(/^## (\d{2}-\d{2})$/gm)].map(m => m[1]);
const questionSummaries = new Map([...clarificationSource.matchAll(/^## (\d{2}-\d{2})\r?\n<details><summary>(.*?)<\/summary>/gm)]
  .map(m => [m[1], m[2]]));
const expectedClarifications = chapters.flatMap(([file, count]) =>
  Array.from({length: count}, (_, i) => `${file.slice(0, 2)}-${String(i+1).padStart(2, '0')}`));
if (JSON.stringify(clarificationIds) !== JSON.stringify(expectedClarifications) ||
    questionSummaries.size !== expectedClarifications.length) {
  throw new Error('Slide questions are missing, duplicated, or out of order');
}
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
  const lecturePage = path.join(root, 'docs', 'lecture', `${id}.html`);
  if (!fs.existsSync(lecturePage)) {
    throw new Error(`Missing lecture page: ${id}`);
  }
  const html = fs.readFileSync(lecturePage, 'utf8');
  for (const page of wanted) {
    const questionId = `${id}-${String(page).padStart(2, '0')}`;
    if (!html.includes(`<summary>${questionSummaries.get(questionId)}</summary>`)) {
      throw new Error(`Question missing from lecture page: ${questionId}`);
    }
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
const guidePdf = path.join(publicRoot, 'study-guide.pdf');
if (!fs.existsSync(guidePdf) || fs.statSync(guidePdf).size < 50000 ||
    fs.readFileSync(guidePdf).subarray(0, 5).toString() !== '%PDF-') {
  throw new Error('Missing or invalid study-guide.pdf');
}
const forbidden = walk(publicRoot).filter(p => p !== guidePdf && /\.(pdf|txt|tex|jpg|jpeg|png)$/i.test(p));
if (forbidden.length) throw new Error(`Unexpected source-like files in docs/: ${forbidden.join(', ')}`);
if (!fs.existsSync(path.join(root, 'guide', 'main.tex'))) throw new Error('Missing guide/main.tex');
console.log(`Verified ${chapters.length} lectures, ${total} slide sections and images; no source files in docs/.`);
