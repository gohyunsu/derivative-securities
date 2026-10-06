import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const root = path.resolve(import.meta.dirname, '..');
const docs = path.join(root, 'docs');
const lectures = [
  {id:'01', file:'01-introduction.md', title:'파생상품을 공부하는 언어', short:'계약·현금흐름·복리', count:7, color:'blue'},
  {id:'02', file:'02-basics.md', title:'파생상품의 구조와 시장 참여자', short:'지급액·분류·헤지와 차익거래', count:14, color:'teal'},
  {id:'03', file:'03-volatility-and-losses.md', title:'변동성, 시장의 성장, 대형 손실', short:'시장 성장·사례·위험관리', count:36, color:'amber'},
  {id:'04', file:'04-forward-futures-mechanics.md', title:'선도·선물의 계약과 결제', short:'청산소·증거금·일일정산', count:30, color:'blue'},
  {id:'05', file:'05-forward-pricing.md', title:'선도가격, 보유비용, 베이시스', short:'무차익·환율평가·콘탱고', count:24, color:'teal'},
  {id:'06', file:'06-hedging-and-cfar.md', title:'선도 헤지와 현금흐름의 하방위험', short:'완전·부분헤지와 비선형 CFaR', count:24, color:'amber'},
];
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

function parseLecture(meta) {
  const source = fs.readFileSync(path.join(root, 'content', meta.file), 'utf8').replaceAll('\r\n','\n');
  const matches = [...source.matchAll(/^## 슬라이드 (\d{2}) · (.+)$/gm)];
  if (matches.length !== meta.count) throw new Error(`${meta.file}: expected ${meta.count} slide headings, found ${matches.length}`);
  const titleMatch = source.match(/^# (.+)$/m);
  if (!titleMatch) throw new Error(`${meta.file}: missing chapter title`);
  const intro = source.slice(titleMatch.index + titleMatch[0].length, matches[0].index).trim();
  const slides = matches.map((match, i) => ({
    number: match[1], title: match[2].trim(),
    markdown: source.slice(match.index + match[0].length, matches[i+1]?.index ?? source.length).trim(),
  }));
  slides.forEach((slide, i) => {
    if (Number(slide.number) !== i+1) throw new Error(`${meta.file}: slide ${i+1} missing`);
    if (slide.markdown.length < 100) throw new Error(`${meta.file}: slide ${slide.number} is too short`);
  });
  return {...meta, title: titleMatch[1].replace(/^\d+\. /,''), intro, slides};
}
const chapters = lectures.map(parseLecture);

function htmlWithMath(markdown) {
  const tokens = [];
  let prepared = markdown.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, tex) => {
    const index = tokens.push({kind:'display', tex})-1;
    return `\n\n@@MATHBLOCK${index}@@\n\n`;
  });
  prepared = prepared.replace(/(?<!\\)\$((?:\\\$|[^$\n])+?)\$/g, (_, tex) => {
    const index = tokens.push({kind:'inline', tex})-1;
    return `@@MATHINLINE${index}@@`;
  });
  let html = marked.parse(prepared, {gfm:true, breaks:false});
  html = html.replace(/<p>@@MATHBLOCK(\d+)@@<\/p>/g, (_, n) => `<div class="equation">\\[${esc(tokens[Number(n)].tex)}\\]</div>`);
  html = html.replace(/@@MATHINLINE(\d+)@@/g, (_, n) => `<span class="math-inline">\\(${esc(tokens[Number(n)].tex)}\\)</span>`);
  if (/@@MATH(?:BLOCK|INLINE)\d+@@/.test(html)) throw new Error('Unreplaced math token');
  return html;
}

function texEscape(text) {
  return text.replace(/[\\{}%&#_^~]/g, c => ({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','%':'\\%','&':'\\&','#':'\\#','_':'\\_','^':'\\^{}','~':'\\~{}'}[c]));
}
function inlineTex(source) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    if (source[i] === '$' && source[i-1] !== '\\') {
      let j = i+1;
      while (j < source.length && !(source[j] === '$' && source[j-1] !== '\\')) j++;
      if (j < source.length) { out += `$${source.slice(i+1,j)}$`; i=j+1; continue; }
    }
    if (source.startsWith('**',i)) {
      const j=source.indexOf('**',i+2);
      if (j>=0) { out += `\\textbf{${inlineTex(source.slice(i+2,j))}}`; i=j+2; continue; }
    }
    if (source[i] === '`') {
      const j=source.indexOf('`',i+1);
      if (j>=0) { out += `\\texttt{${texEscape(source.slice(i+1,j))}}`; i=j+1; continue; }
    }
    if (source[i] === '[') {
      const link=source.slice(i).match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
      if (link) { out += `\\href{${link[2]}}{${texEscape(link[1])}}`; i+=link[0].length; continue; }
    }
    let j=i+1;
    while (j<source.length && !['$','*','`','['].includes(source[j])) j++;
    out += texEscape(source.slice(i,j));
    i=j;
  }
  return out;
}
function markdownToTex(markdown) {
  const lines = markdown.replaceAll('\r\n','\n').split('\n');
  const output = [];
  for (let i=0; i<lines.length; i++) {
    let line=lines[i].trim();
    if (!line) { output.push(''); continue; }
    if (line === '$$') {
      const block=[];
      i++;
      while (i<lines.length && lines[i].trim() !== '$$') { block.push(lines[i]); i++; }
      if (i>=lines.length) throw new Error('Unclosed display math');
      output.push('\\[', ...block, '\\]');
      continue;
    }
    if (line.startsWith('<details>')) {
      const m=line.match(/^<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>$/);
      if (!m) throw new Error(`Unsupported details format: ${line.slice(0,80)}`);
      output.push(`\\par\\medskip\\noindent\\textbf{심화: ${inlineTex(m[1])}}\\quad ${inlineTex(m[2])}\\par`);
      continue;
    }
    if (line.startsWith('|')) {
      const rows=[];
      while (i<lines.length && lines[i].trim().startsWith('|')) {
        const cells=lines[i].trim().slice(1,-1).split('|').map(s=>s.trim());
        if (!cells.every(c=>/^:?-{3,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      i--;
      const count=rows[0].length;
      if (![3,6].includes(count) || rows.some(row=>row.length!==count)) throw new Error(`Unsupported table width: ${count}`);
      const widths=count===3
        ? 'p{0.22\\linewidth}p{0.32\\linewidth}p{0.32\\linewidth}'
        : 'p{0.13\\linewidth}p{0.12\\linewidth}p{0.15\\linewidth}p{0.19\\linewidth}p{0.14\\linewidth}p{0.18\\linewidth}';
      const size=count===3 ? '\\small' : '\\footnotesize\\setlength{\\tabcolsep}{3pt}';
      output.push(`\\begin{center}${size}\\begin{longtable}{${widths}}\\hline`);
      rows.forEach((row,n)=>output.push(`${row.map(inlineTex).join(' & ')} \\\\ ${n===0?'\\hline':''}`));
      output.push('\\hline\\end{longtable}\\end{center}\\normalsize');
      continue;
    }
    if (line.startsWith('- ')) { output.push(`\\noindent\\textbullet\ ${inlineTex(line.slice(2))}\\par`); continue; }
    output.push(`${inlineTex(line)}\\par`);
  }
  return output.join('\n');
}

function writeTex() {
  const preamble = String.raw`\documentclass[11pt,a4paper]{article}
\usepackage[a4paper,margin=23mm,headheight=14pt]{geometry}
\usepackage{kotex}
\usepackage{amsmath,amssymb}
\usepackage{longtable,array}
\usepackage{xcolor}
\usepackage[colorlinks=true,linkcolor=blue!55!black,urlcolor=blue!55!black]{hyperref}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0.55em}
\setcounter{tocdepth}{2}
\renewcommand{\arraystretch}{1.25}
\begin{document}
\begin{titlepage}
\centering
\vspace*{3cm}
{\Large 주식·채권·파생금융상품 3: 실증\par}
\vspace{1.2cm}
{\Huge\bfseries 슬라이드별 학습 가이드\par}
\vspace{1.2cm}
{\large 계약의 현금흐름에서 무차익 가격과 위험관리까지\par}
\vfill
{\large 2026년 2학기\par}
\end{titlepage}
\tableofcontents
\clearpage
`;
  let body='';
  for (const chapter of chapters) {
    body += `\n\\section{${texEscape(`${chapter.id}. ${chapter.title}`)}}\n`;
    body += markdownToTex(chapter.intro)+'\n';
    for (const slide of chapter.slides) {
      body += `\n\\subsection{${texEscape(`슬라이드 ${slide.number} · ${slide.title}`)}}\n`;
      body += markdownToTex(slide.markdown)+'\n';
    }
  }
  fs.mkdirSync(path.join(root,'guide'),{recursive:true});
  fs.writeFileSync(path.join(root,'guide','main.tex'), preamble+body+'\n\\end{document}\n','utf8');
}

const diagramMap = {'02-04':'payoff.svg','05-07':'cost-of-carry.svg','06-05':'hedge-ratio.svg','06-14':'hedge-frontier.svg'};
const navCards = current => chapters.map(c => `<a class="chapter-link ${current===c.id?'is-current':''}" href="${current?'../':''}lecture/${c.id}.html"><span class="chapter-num">${c.id}</span><span><strong>${esc(c.title)}</strong><small>${esc(c.short)}</small></span><span class="chapter-count">${c.count}</span></a>`).join('');
const mathjax = `<script>window.MathJax={tex:{inlineMath:[['\\\\(','\\\\)']],displayMath:[['\\\\[','\\\\]']]},options:{skipHtmlTags:['script','noscript','style','textarea','pre','code']}};</script><script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>`;
function shell(title, body, {prefix='', current=''}={}) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="주식·채권·파생금융상품 3: 실증 — 슬라이드별 한국어 학습 가이드"><title>${esc(title)} · 파생금융상품 3</title><link rel="stylesheet" href="${prefix}assets/site.css">${mathjax}</head><body data-prefix="${prefix}"><div class="reading-progress" aria-hidden="true"></div><header class="site-header"><a class="brand" href="${prefix}index.html"><span class="brand-mark">∂</span><span>파생금융상품 <b>3</b></span></a><span class="header-divider"></span><span class="header-subtitle">슬라이드별 학습 가이드</span><a class="pdf-link" href="${prefix}study-guide.pdf" download>PDF 가이드 ↓</a><button type="button" class="search-trigger" data-search-trigger aria-label="전체 검색 열기"><span>⌕</span> 검색 <kbd>/</kbd></button></header>${body}<dialog id="slide-dialog" class="slide-dialog"><button type="button" class="dialog-close" data-dialog-close aria-label="이미지 닫기">×</button><img alt="확대한 슬라이드"><p></p></dialog><dialog id="search-dialog" class="search-dialog"><div class="search-panel"><div class="search-input-row"><span>⌕</span><input type="search" id="search-input" placeholder="개념, 사례, 수식 검색" aria-label="전체 내용 검색"><button type="button" data-search-close aria-label="검색 닫기">×</button></div><div id="search-results" class="search-results"></div><p class="search-hint">슬라이드 제목과 설명을 함께 검색합니다. Esc로 닫기</p></div></dialog><script src="${prefix}assets/search-index.js"></script><script src="${prefix}assets/site.js"></script></body></html>`;
}

function writeIndex() {
  const cards=chapters.map(c=>`<a class="overview-card card-${c.color}" href="lecture/${c.id}.html"><div class="overview-card-top"><span>${c.id}</span><span>${c.count}개 슬라이드</span></div><h3>${esc(c.title)}</h3><p>${esc(c.short)}</p><div class="card-arrow">학습하기 <span>↗</span></div></a>`).join('');
  const body=`<main class="home-main"><section class="home-hero"><div class="eyebrow">2026 · 2학기 · 학습 가이드</div><h1>계약의 현금흐름에서<br><em>위험관리의 직관</em>까지</h1><p>선도와 선물의 구조를 이해하고, 무차익 가격을 직접 유도한 뒤, 실제 기업의 헤지 수량과 하방 현금흐름을 계산한다. 각 슬라이드에 대응하는 설명과 수식이 한 화면에서 이어진다.</p><div class="hero-actions"><a class="primary-button" href="lecture/01.html">처음부터 읽기 <span>→</span></a><a class="pdf-link" href="study-guide.pdf" download>PDF 내려받기 ↓</a><span>6개 장 · 135개 슬라이드</span></div><div class="hero-formula" aria-label="선도계약의 만기 손익">\\[\\Pi_T=Q(S_T-K)\\]</div></section><section class="learning-path"><div class="section-kicker">학습 경로</div><h2>한 흐름으로 연결되는 여섯 장</h2><div class="path-line"><span>계약 구조</span><b>→</b><span>거래와 결제</span><b>→</b><span>무차익 가격</span><b>→</b><span>헤지 설계</span></div><div class="overview-grid">${cards}</div></section><section class="home-note"><h2>읽는 방법</h2><p>슬라이드 이미지를 먼저 보고 오른쪽의 설명을 따라가세요. 수식은 각 단계의 현금흐름과 단위를 확인하며 읽고, 심화 설명은 필요한 순간 펼쳐 보세요. 이미지 클릭으로 표와 그래프를 확대할 수 있습니다.</p></section><footer class="site-footer">주식·채권·파생금융상품 3: 실증 · 2026-2</footer></main>`;
  fs.writeFileSync(path.join(docs,'index.html'),shell('전체 목차',body));
}
function writeLecture(chapter,index) {
  const sidebar=`<aside class="sidebar"><a class="sidebar-home" href="../index.html">← 전체 목차</a><div class="sidebar-label">강의</div><nav aria-label="강의 목록" class="chapter-nav">${navCards(chapter.id)}</nav><div class="sidebar-label sidebar-label-slides">이 장의 슬라이드</div><nav aria-label="슬라이드 목차" class="slide-nav">${chapter.slides.map(s=>`<a href="#s${s.number}" data-slide-link="${s.number}"><span>${s.number}</span>${esc(s.title)}</a>`).join('')}</nav></aside>`;
  const sections=chapter.slides.map(s=>{
    const image=`../assets/slides/${chapter.id}/${s.number}.webp`;
    const diagram=diagramMap[`${chapter.id}-${s.number}`];
    const diagramHtml=diagram?`<figure class="concept-figure"><img src="../assets/figures/${diagram}" alt="${esc(s.title)}을 설명하는 도식" loading="lazy"><figcaption>개념을 한눈에 보기</figcaption></figure>`:'';
    return `<section class="slide" id="s${s.number}" data-slide="${s.number}"><div class="slide-heading"><span class="slide-index">${chapter.id} / ${s.number}</span><h2>${esc(s.title)}</h2></div><div class="slide-grid"><figure class="slide-figure"><button type="button" class="slide-image-button" data-zoom-src="${image}" data-zoom-label="${chapter.id}장 슬라이드 ${s.number}: ${esc(s.title)}" aria-label="슬라이드 ${s.number} 이미지 확대"><img src="${image}" alt="${chapter.id}장 슬라이드 ${s.number}: ${esc(s.title)}" loading="lazy" decoding="async"><span class="zoom-hint">확대해서 보기 ↗</span></button><figcaption>슬라이드 ${s.number}</figcaption></figure><div class="explanation">${htmlWithMath(s.markdown)}${diagramHtml}</div></div></section>`;
  }).join('');
  const previous=chapters[index-1]; const next=chapters[index+1];
  const pager=`<nav class="chapter-pager" aria-label="이전·다음 장">${previous?`<a href="${previous.id}.html"><small>이전 장</small><strong>← ${esc(previous.title)}</strong></a>`:'<span></span>'}${next?`<a href="${next.id}.html"><small>다음 장</small><strong>${esc(next.title)} →</strong></a>`:'<span></span>'}</nav>`;
  const main=`<div class="layout">${sidebar}<main class="lecture-main"><section class="lecture-hero"><div class="eyebrow">CHAPTER ${chapter.id} · ${chapter.count} SLIDES</div><h1>${esc(chapter.title)}</h1><div class="lecture-intro">${htmlWithMath(chapter.intro)}</div><div class="lecture-start"><a href="#s01">첫 슬라이드로 내려가기 ↓</a><span>${index+1} / ${chapters.length}</span></div></section>${sections}${pager}<footer class="site-footer">주식·채권·파생금융상품 3: 실증 · 2026-2</footer></main></div>`;
  fs.writeFileSync(path.join(docs,'lecture',`${chapter.id}.html`),shell(chapter.title,main,{prefix:'../',current:chapter.id}));
}

fs.mkdirSync(path.join(docs,'lecture'),{recursive:true});
fs.mkdirSync(path.join(docs,'assets'),{recursive:true});
writeTex();
writeIndex();
chapters.forEach(writeLecture);
const search=chapters.flatMap(c=>c.slides.map(s=>({chapter:c.id, chapterTitle:c.title, slide:s.number, title:s.title, text:s.markdown.replace(/<[^>]+>|\$\$?/g,' ').replace(/[*_`#|\\]/g,' ').replace(/\s+/g,' ').slice(0,1100)})));
fs.writeFileSync(path.join(docs,'assets','search-index.js'),`window.GUIDE_SEARCH=${JSON.stringify(search)};\n`);
console.log(`Built ${chapters.length} lecture pages, ${search.length} slide sections, and guide/main.tex`);
