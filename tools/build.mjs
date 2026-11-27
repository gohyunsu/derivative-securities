import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const root = path.resolve(import.meta.dirname, '..');
const docs = path.join(root, 'docs');
const courseTitle = '주식, 채권, 파생금융상품 3: 실증';
const lectures = [
  {id:'01', file:'01-introduction.md', title:'파생상품을 공부하는 언어', short:'현금흐름·할인·복제의 출발점', count:7, color:'blue', flow:['누가 무엇을 지급하나','현금흐름을 언제 할인하나','같은 지급액의 가격은?']},
  {id:'02', file:'02-basics.md', title:'파생상품의 구조와 시장 참여자', short:'지급액·위험 이전·거래 목적', count:14, color:'teal', flow:['지급함수로 노출 파악','기존 위험과 합산','헤지·투기·차익거래 구별']},
  {id:'03', file:'03-volatility-and-losses.md', title:'변동성, 시장의 성장, 대형 손실', short:'변동성·레버리지·유동성 위험', count:36, color:'amber', flow:['변동성이 위험 이전을 자극','레버리지·현금 부족 발생','손실 사례의 실패 고리']},
  {id:'04', file:'04-forward-futures-mechanics.md', title:'선도·선물의 계약과 결제', short:'청산소·증거금·정산 시점', count:30, color:'blue', flow:['선도·선물의 만기 노출','청산·증거금의 흐름','중간 유동성 위험']},
  {id:'05', file:'05-forward-pricing.md', title:'선도가격, 보유비용, 베이시스', short:'무차익·보유비용·베이시스', count:24, color:'teal', flow:['현물 보유로 만기 인도 복제','금리·배당·보관비 반영','베이시스·차익거래 판단']},
  {id:'06', file:'06-hedging-and-cfar.md', title:'선도 헤지와 현금흐름의 하방위험', short:'헤지 수량·기대값·하방위험', count:24, color:'amber', flow:['기업의 기존 현금흐름','헤지 계약 수량 선택','평균과 하방위험 비교']},
  {id:'07', file:'07-option-basics.md', title:'옵션의 권리와 무차익 가격관계', short:'선택권·프리미엄·가격 경계', count:22, color:'blue', flow:['권리와 의무 구별','지급액·프리미엄 분리','무차익 경계·풋–콜 패리티']},
  {id:'08', file:'08-option-strategies.md', title:'옵션 조합이 만드는 손익 구조', short:'지급액 합산·손익 한도·변동폭', count:31, color:'teal', flow:['계약별 지급액 합산','행사가마다 기울기 변화','손익 한도·방향·변동폭']},
  {id:'09', file:'09-binomial-option-pricing.md', title:'이항모형으로 옵션가격을 유도하기', short:'두 상태 복제·위험중립가격', count:27, color:'amber', flow:['두 미래 상태 설정','주식·채권으로 지급액 복제','위험중립가격·조기행사']},
  {id:'10', file:'10-continuous-time-and-pde.md', title:'연속시간 주가과정과 옵션가격의 기본 PDE', short:'주가 확률과정·델타·PDE', count:15, color:'blue', flow:['주가 충격을 확률과정으로','델타로 공통 위험 상쇄','무차익 PDE 도출']},
  {id:'11', file:'11-black-scholes-pricing.md', title:'Black–Scholes 가격과 시장의 변동성', short:'무차익해·델타·내재변동성', count:18, color:'teal', flow:['위험중립분포로 지급액 평가','만기 현금흐름 할인','가격 공식·델타·내재변동성']},
  {id:'12', file:'12-option-greeks-and-hedging.md', title:'Greeks와 실제 옵션 헤지', short:'민감도·헤지오차·잔여위험', count:25, color:'amber', flow:['가격의 국소 민감도 계산','델타·감마 중립 수량','헤지오차·잔여위험 평가']},
];
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const clarificationSource = fs.readFileSync(path.join(root, 'content', 'clarifications.md'), 'utf8').replaceAll('\r\n','\n');
const clarificationHeadings = [...clarificationSource.matchAll(/^## (\d{2}-\d{2})$/gm)];
const clarifications = new Map();
for (let i=0; i<clarificationHeadings.length; i++) {
  const match = clarificationHeadings[i];
  const id = match[1];
  if (clarifications.has(id)) throw new Error(`Duplicate clarification: ${id}`);
  const body = clarificationSource.slice(match.index + match[0].length, clarificationHeadings[i+1]?.index ?? clarificationSource.length).trim();
  if (!/^<details><summary>.+<\/summary><p>.+<\/p><\/details>$/.test(body)) {
    throw new Error(`Invalid clarification: ${id}`);
  }
  clarifications.set(id, body);
}

function parseLecture(meta) {
  const source = fs.readFileSync(path.join(root, 'content', meta.file), 'utf8').replaceAll('\r\n','\n');
  const matches = [...source.matchAll(/^## 슬라이드 (\d{2}) · (.+)$/gm)];
  if (matches.length !== meta.count) throw new Error(`${meta.file}: expected ${meta.count} slide headings, found ${matches.length}`);
  const titleMatch = source.match(/^# (.+)$/m);
  if (!titleMatch) throw new Error(`${meta.file}: missing chapter title`);
  const intro = source.slice(titleMatch.index + titleMatch[0].length, matches[0].index).trim();
  const slides = matches.map((match, i) => {
    const id = `${meta.id}-${match[1]}`;
    const body = source.slice(match.index + match[0].length, matches[i+1]?.index ?? source.length).trim();
    return {
      number: match[1], title: match[2].trim(),
      markdown: [body, clarifications.get(id)].filter(Boolean).join('\n\n'),
    };
  });
  slides.forEach((slide, i) => {
    if (Number(slide.number) !== i+1) throw new Error(`${meta.file}: slide ${i+1} missing`);
    if (slide.markdown.length < 100) throw new Error(`${meta.file}: slide ${slide.number} is too short`);
  });
  return {...meta, title: titleMatch[1].replace(/^\d+\. /,''), intro, slides};
}
const chapters = lectures.map(parseLecture);
const allSlideIds = new Set(chapters.flatMap(c => c.slides.map(s => `${c.id}-${s.number}`)));
for (const id of clarifications.keys()) {
  if (!allSlideIds.has(id)) throw new Error(`Unused clarification: ${id}`);
}

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
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  if (/@@MATH(?:BLOCK|INLINE)\d+@@/.test(html)) throw new Error('Unreplaced math token');
  return html;
}

const diagramMap = {
  '02-04': {file:'payoff.svg', caption:'선도·콜 매수의 만기 payoff (콜 프리미엄 제외)'},
  '05-07': {file:'cost-of-carry.svg', caption:'현물 매수·차입과 선도 매수의 cash flow'},
  '06-05': {file:'hedge-ratio.svg', caption:'Hedge ratio에 따른 달러당 구매비용'},
  '06-14': {file:'hedge-frontier.svg', caption:'평균 현금흐름과 하위 5% 현금흐름의 trade-off'},
  '09-07': {file:'binomial-replication.svg', caption:'두 상태의 콜 지급액을 주식과 채무로 복제'},
};
const navCards = current => chapters.map(c => `<a class="chapter-link ${current===c.id?'is-current':''}" href="${current?'../':''}lecture/${c.id}.html"><span class="chapter-num">${c.id}</span><span><strong>${esc(c.title)}</strong><small>${esc(c.short)}</small></span><span class="chapter-count">${c.count}</span></a>`).join('');
const mathjax = `<script>window.MathJax={tex:{inlineMath:[['\\\\(','\\\\)']],displayMath:[['\\\\[','\\\\]']]},options:{skipHtmlTags:['script','noscript','style','textarea','pre','code']}};</script><script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>`;
function shell(title, body, {prefix='', current=''}={}) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${courseTitle} — 슬라이드별 한국어 학습 가이드"><title>${esc(title)} · ${esc(courseTitle)}</title><link rel="stylesheet" href="${prefix}assets/site.css">${mathjax}</head><body data-prefix="${prefix}"><div class="reading-progress" aria-hidden="true"></div><header class="site-header"><a class="brand" href="${prefix}index.html"><span class="brand-mark">∂</span><span class="brand-title">${esc(courseTitle)}</span></a><button type="button" class="search-trigger" data-search-trigger aria-label="전체 검색 열기"><span>⌕</span> 검색 <kbd>/</kbd></button></header>${body}<dialog id="slide-dialog" class="slide-dialog"><button type="button" class="dialog-close" data-dialog-close aria-label="이미지 닫기">×</button><img alt="확대한 슬라이드"><p></p></dialog><dialog id="search-dialog" class="search-dialog"><div class="search-panel"><div class="search-input-row"><span>⌕</span><input type="search" id="search-input" placeholder="개념, 사례, 수식 검색" aria-label="전체 내용 검색"><button type="button" data-search-close aria-label="검색 닫기">×</button></div><div id="search-results" class="search-results"></div><p class="search-hint">슬라이드 제목과 설명을 함께 검색합니다. Esc로 닫기</p></div></dialog><script src="${prefix}assets/search-index.js"></script><script src="${prefix}assets/site.js"></script></body></html>`;
}

function writeIndex() {
  const cards=chapters.map(c=>`<a class="overview-card card-${c.color}" href="lecture/${c.id}.html"><div class="overview-card-top"><span>${c.id}</span><span>${c.count}개 슬라이드</span></div><h3>${esc(c.title)}</h3><p>${esc(c.short)}</p><div class="card-arrow">학습하기 <span>↗</span></div></a>`).join('');
const body=`<main class="home-main"><section class="home-hero"><div class="eyebrow">${esc(courseTitle)}</div><h1>현금흐름에서<br><em>헤지와 옵션가격</em>까지</h1><p>위험을 왜 거래하고, 그 계약의 가격은 어떻게 정해질까? 현금흐름과 무차익 원리에서 출발해 선도·선물의 가격, 기업의 헤지, 옵션 복제와 실제 위험관리까지 연결한다.</p><div class="hero-actions"><a class="primary-button" href="lecture/01.html">처음부터 읽기 <span>→</span></a><span>${chapters.length}개 장 · ${chapters.reduce((n,c)=>n+c.count,0)}개 슬라이드</span></div><div class="hero-formula" aria-label="선도계약의 만기 손익">\\[\\Pi_T=Q(S_T-K)\\]</div></section><section class="learning-path"><div class="section-kicker">학습 경로</div><h2>현금흐름에서 복제가격까지</h2><div class="path-line"><span>위험 이전</span><b>→</b><span>계약과 결제</span><b>→</b><span>무차익 가격</span><b>→</b><span>헤지 수량</span><b>→</b><span>옵션 복제</span></div><div class="overview-grid">${cards}</div></section><section class="home-note"><h2>읽는 방법</h2><p>먼저 각 장의 개념 흐름을 읽고, 슬라이드 그림과 오른쪽 설명을 함께 보세요. 수식은 무엇을 복제하거나 상쇄하는지부터 이해한 뒤 현금흐름과 단위를 검산하면 됩니다. 심화 질문은 필요할 때 펼치고, 이미지를 클릭해 도표를 확대할 수 있습니다.</p></section><footer class="site-footer">${courseTitle}</footer></main>`;
  fs.writeFileSync(path.join(docs,'index.html'),shell('전체 목차',body));
}
function writeLecture(chapter,index) {
  const sidebar=`<aside class="sidebar"><a class="sidebar-home" href="../index.html">← 전체 목차</a><div class="sidebar-label">강의</div><nav aria-label="강의 목록" class="chapter-nav">${navCards(chapter.id)}</nav><div class="sidebar-label sidebar-label-slides">이 장의 슬라이드</div><nav aria-label="슬라이드 목차" class="slide-nav">${chapter.slides.map(s=>`<a href="#s${s.number}" data-slide-link="${s.number}"><span>${s.number}</span>${esc(s.title)}</a>`).join('')}</nav></aside>`;
  const sections=chapter.slides.map(s=>{
    const image=`../assets/slides/${chapter.id}/${s.number}.webp`;
    const diagram=diagramMap[`${chapter.id}-${s.number}`];
    const diagramHtml=diagram?`<figure class="concept-figure"><img src="../assets/figures/${diagram.file}" alt="${esc(diagram.caption)}" loading="lazy"><figcaption>${esc(diagram.caption)}</figcaption></figure>`:'';
    return `<section class="slide" id="s${s.number}" data-slide="${s.number}"><div class="slide-heading"><span class="slide-index">${chapter.id} / ${s.number}</span><h2>${esc(s.title)}</h2></div><div class="slide-grid"><figure class="slide-figure"><button type="button" class="slide-image-button" data-zoom-src="${image}" data-zoom-label="${chapter.id}장 슬라이드 ${s.number}: ${esc(s.title)}" aria-label="슬라이드 ${s.number} 이미지 확대"><img src="${image}" alt="${chapter.id}장 슬라이드 ${s.number}: ${esc(s.title)}" loading="lazy" decoding="async"><span class="zoom-hint">확대해서 보기 ↗</span></button><figcaption>슬라이드 ${s.number}</figcaption></figure><div class="explanation">${htmlWithMath(s.markdown)}${diagramHtml}</div></div></section>`;
  }).join('');
  const previous=chapters[index-1]; const next=chapters[index+1];
  const pager=`<nav class="chapter-pager" aria-label="이전·다음 장">${previous?`<a href="${previous.id}.html"><small>이전 장</small><strong>← ${esc(previous.title)}</strong></a>`:'<span></span>'}${next?`<a href="${next.id}.html"><small>다음 장</small><strong>${esc(next.title)} →</strong></a>`:'<span></span>'}</nav>`;
  const flow=`<div class="chapter-flow" aria-label="개념 흐름"><span>개념 흐름</span><ol>${chapter.flow.map(step=>`<li>${esc(step)}</li>`).join('')}</ol></div>`;
  const main=`<div class="layout">${sidebar}<main class="lecture-main"><section class="lecture-hero"><div class="eyebrow">${chapter.id}장 · ${chapter.count}개 슬라이드</div><h1>${esc(chapter.title)}</h1><div class="lecture-intro">${htmlWithMath(chapter.intro)}</div>${flow}<div class="lecture-start"><a href="#s01">첫 슬라이드로 내려가기 ↓</a><span>${index+1} / ${chapters.length}</span></div></section>${sections}${pager}<footer class="site-footer">${courseTitle}</footer></main></div>`;
  fs.writeFileSync(path.join(docs,'lecture',`${chapter.id}.html`),shell(chapter.title,main,{prefix:'../',current:chapter.id}));
}

fs.mkdirSync(path.join(docs,'lecture'),{recursive:true});
fs.mkdirSync(path.join(docs,'assets'),{recursive:true});
writeIndex();
chapters.forEach(writeLecture);
const search=chapters.flatMap(c=>c.slides.map(s=>({chapter:c.id, chapterTitle:c.title, slide:s.number, title:s.title, text:s.markdown.replace(/<[^>]+>|\$\$?/g,' ').replace(/[*_`#|\\]/g,' ').replace(/\s+/g,' ')})));
fs.writeFileSync(path.join(docs,'assets','search-index.js'),`window.GUIDE_SEARCH=${JSON.stringify(search)};\n`);
console.log(`Built site with ${chapters.length} lecture pages and ${search.length} slide sections`);
