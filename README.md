# 주식·채권·파생금융상품 3: 실증 — 슬라이드별 학습 가이드

이 저장소는 선도·선물·무차익 가격·헤지와 현금흐름 위험을 처음 배우는 경제학부 학생을 위한 한국어 학습 가이드의 **원고와 정적 사이트**를 담는다. 각 장의 슬라이드 번호가 원고와 사이트에 일대일로 대응한다.

## 결과물

| 위치 | 내용 |
| --- | --- |
| `content/` | 여섯 장의 슬라이드별 원고. 설명·유도·예시의 단일 원천 |
| `docs/` | GitHub Pages에 게시할 정적 사이트와 135장의 슬라이드 이미지 |
| `guide/main.tex` | 같은 원고에서 생성한 단일 LaTeX 문서 |
| `tools/` | 사이트·LaTeX 생성, 슬라이드 이미지 변환, 완전성 검사 |
| `WORKLOG.md` | 범위, 검증 결과, 출판 상태를 기록한 작업 로그 |

사이트는 `gohyunsu` 계정의 독립된 GitHub Pages 저장소에서 제공한다. 첫 화면에서 여섯 장을 선택하고, 각 절에서 왼쪽 슬라이드 이미지와 오른쪽 설명을 함께 볼 수 있다. 검색, 이미지 확대, 심화 설명 접기 기능을 제공한다.

## 구성과 재생성

Node.js 20 이상과 Python 3, Pillow 및 Poppler가 필요하다. 원고를 수정한 후:

```powershell
npm install
npm run build
npm run check
```

원본 PDF에서 이미지를 다시 생성할 때만 아래 명령을 실행한다.

```powershell
python tools/render_slides.py
```

`docs/`는 빌드 산출물이지만, GitHub Pages가 바로 읽을 수 있도록 버전 관리한다. `slides/`, `scripts/`, `notes/`, `.research/`는 로컬 참고 자료이며 `.gitignore`로 제외한다. **원본 PDF, 녹취록, 판서 사진은 공개 저장소에 올리지 않는다.** 공개 자산에는 페이지별 WebP 슬라이드 이미지와 직접 제작한 SVG 도식만 들어간다.

## 출판 구조

정적 사이트 파일은 독립 저장소의 `docs/`에서 GitHub Pages로 게시한다. HTML·CSS·JavaScript·WebP가 상대경로를 사용하므로 프로젝트 URL에서도 동작한다. 게시 전에는 `npm run check`와 `git ls-files`로 공개 대상을 확인한다.

LaTeX 문서는 XeLaTeX와 `kotex`, `amsmath`, `hyperref` 등을 사용한다. 편집기 컴파일이 가능한 환경에서 `guide/main.tex`을 열어 PDF를 생성할 수 있다.

