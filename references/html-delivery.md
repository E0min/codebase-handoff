# 단일 HTML 제작·검증

## 전달 계약

독자가 HTML 하나를 브라우저에서 열어 본문과 필요한 모든 그림·보조 자료를 읽을 수 있어야 한다. 구조도만 들어 있는 HTML을 “인수인계서 전체”라고 전달하지 않는다.

- `CODEBASE_MAP.md`에서 본문을 생성해 Markdown과 HTML의 사실이 어긋나지 않게 한다.
- 긴 소스 색인·분석 커밋·진입점 inventory·검증 기록은 HTML 하단의 접이식 부록에 포함한다. 별도 Markdown 링크는 해당 내부 anchor로 바꾸고 클릭 시 부록을 자동으로 펼친다.
- 실제 소스 파일 링크는 checkout에 의존할 수 있다. 이것은 본문을 읽는 데 필요한 외부 자산과 구분해 안내한다. 공유 목적이면 절대 로컬 경로 대신 확인된 저장소 revision 링크 또는 상대 경로를 사용한다.
- font·CSS·JS·그림을 CDN에 의존하지 않는다. 외부 문서로 이동하는 사용자 클릭 링크는 가능하지만, 페이지를 읽을 때 외부 요청이 발생하면 단일 오프라인 전달 검증을 통과한 것으로 보지 않는다.

## 내장 도구 실행

Node.js 22 이상과 Chrome 또는 Chromium이 필요하다. 문서 분석과 Markdown 작성에는 Node.js나 브라우저가 필요하지 않다. Codex·Claude 등 호스트별 설치 경로를 추정하지 말고 현재 읽은 스킬 디렉터리를 기준으로 실행한다.

스킬의 `scripts` 디렉터리에서 한 번 설치한다. 의존성과 lockfile은 분석 대상 프로젝트와 분리되어 있다.

```sh
npm ci --ignore-scripts
```

브라우저 실행 파일은 `CHROME_PATH` 환경변수 또는 `--browser` 인자로 지정한다. 자동 다운로드나 특정 OS 경로를 강제하지 않는다. 다음 명령의 경로는 현재 환경에서 확인한 실제 경로로 바꾼다.

```sh
node build.mjs --input /path/to/CODEBASE_MAP.md --output /path/to/CODEBASE_MAP.html --browser /path/to/chrome --lang ko --title "Codebase handoff"
node check.mjs --input /path/to/CODEBASE_MAP.html --report /path/to/validation.json --browser /path/to/chrome --screenshots /path/to/screenshots
```

- `--appendix /path/to/evidence.md`를 반복해 부록을 넣는다. 포함된 문서 사이 상대 Markdown 링크와 제목 fragment를 내부 anchor로 바꾼다. 제목 anchor는 소문자·문장부호 제거·공백 하이픈·중복 숫자 suffix 규칙을 사용한다. 다른 anchor 규칙을 사용하는 원문은 변환 후 깨진 링크를 수정한다.
- `--viewer /path/to/architecture.html`은 신뢰하고 검증한 Archify HTML만 받는다. sandbox iframe으로 원문을 내장한다. 외부 자산 제거를 자동으로 수행하지 않으므로 최종 오프라인 검증 실패 시 사본을 수정하고 변경 사항을 기록한다. 일반 HTML도 입력할 수 있으나 도구 자체가 Archify 결과임을 인증하지는 않는다.
- Markdown의 raw HTML은 실행하지 않고 텍스트로 표시한다. 로컬 PNG/JPEG/GIF/WebP는 data URL로 내장하고 원격 이미지와 SVG 파일 입력은 거부한다. Mermaid SVG는 strict 모드에서 생성한다. 지원하지 않는 자산은 변환하거나 명시적으로 처리하고 최종본을 다시 검증한다.
- 원본 링크는 출력 파일 위치를 기준으로 다시 계산한다. 분석한 소스가 다른 컴퓨터에 없으면 소스 링크가 열리지 않을 수 있으므로 공유 시 확인된 revision URL을 사용한다.
- 생성 성공은 검증 성공이 아니다. 검증기는 파일 hash·세 viewport·외부/별도 자산 요청·오류·그림 수·중복 ID·깨진 anchor·가로 넘침·부록 펼침을 기록한다. HTML에 들어 있는 생성 manifest와 최종 DOM을 비교한다. 외부 사용자 클릭 링크의 도착 페이지나 모든 실제 소스 파일 존재를 검사하지는 않는다.
- `CHROME_PATH`를 지정한 뒤 `npm test`로 생성→검증 및 깨진 입력 거부 통합 테스트를 실행할 수 있다. 브라우저가 없으면 테스트를 통과시켜 주지 않는다.

Node.js나 브라우저를 사용할 수 없으면 다른 설치된 도구로 같은 계약을 충족하거나 Markdown과 가능한 정적 검사 결과를 전달한다. HTML 생성·브라우저 검증이 남아 있으면 미완료로 명시한다. 특정 OS·호스트에서 실행해 보지 않았다면 호환성을 검증했다고 주장하지 않는다.

## 제작 방법

1. 현재 환경의 Markdown parser, Mermaid, headless browser, Chrome/Chromium 위치를 확인한다. 기존 프로젝트 경로나 특정 OS 설치 경로를 하드코딩해서 이식하지 않는다. 새 의존성이 필요하면 기존 환경에 무단 대규모 설치하지 말고 산출물 전용 위치와 명시적 버전을 사용한다.
2. Markdown의 Mermaid 블록을 파싱하고 렌더러로 SVG를 생성한다. 코드 블록만 출력하지 않는다. SVG와 본문은 HTML에 inline으로 넣는다. `.mmd` 원본은 유지한다.
3. Archify를 사용할 때에는 현재 SKILL.md의 schema·validate·deliver·browser·시각 검토 절차를 따른다. 지원하지 않는 diagram type을 지원한다고 가정하지 않는다. 가령 ER은 Mermaid로 유지할 수 있다.
4. 독립 Archify viewer를 포함하려면 self-contained HTML을 `iframe srcdoc` 등으로 내장한다. sibling HTML을 `src`로 참조하면 파일 하나로 전달한 것이 아니다. 문자열과 태그를 안전하게 escape한다.
5. 원본 Archify artifact와 embedded 사본을 구분한다. 오프라인 전달을 위해 사본의 외부 font link를 제거했다면 변경을 기록하고 사본을 포함한 최종 HTML을 다시 검증한다. 원본 receipt를 수정된 사본의 byte 증거로 재사용하지 않는다.
6. 목차 anchor는 유일하고 안정적으로 만든다. 원문의 제목·숫자가 바뀌어도 링크가 깨지지 않도록 실제 DOM과 대조한다. 긴 코드는 줄바꿈 또는 가로 스크롤을 제공한다.
7. HTML에 실행 가능한 코드가 들어올 수 있는 Markdown·SVG는 신뢰 경계를 고려한다. 임의 사용자 HTML을 검증 없이 실행하거나 외부 페이지 스크립트를 끼워 넣지 않는다. 필요한 Markdown과 검증된 다이어그램 자산으로 범위를 제한한다.

## 읽기 경험

- 첫 화면에 목적, 읽는 순서, 목차를 제공한다. 전체 구조도 → 요약 → 핵심 흐름으로 자연스럽게 연결한다.
- 긴 문서는 스크롤하는 것이 정상이다. 독립 그림의 첫 화면 containment 규칙을 전체 안내서 높이에 적용하지 않는다.
- 데스크톱에서는 고정/접을 수 있는 목차를, 좁은 화면에서는 본문을 가리지 않는 탐색을 제공한다.
- 표는 넓으면 자체 가로 스크롤을 제공한다. 페이지 전체 가로 넘침은 없도록 한다.
- 넓은 Mermaid를 본문 폭으로 무조건 축소하지 않는다. 자연스러운 SVG 크기, 확대 또는 그림 내부 스크롤로 레이블을 읽을 수 있게 한다.
- iframe 내부 스크롤 때문에 본문 이동이 어려우면 높이·별도 펼침·보기 모드를 조정한다. 독립 Archify 그림의 자체 acceptance는 해당 스킬을 따른다.
- 시스템 font를 기본으로 사용한다. 색과 장식보다 한글 본문, 표, 코드, 그림 레이블의 가독성을 먼저 확인한다.
- 인쇄 버튼은 선택 사항이다. 인쇄/PDF를 지원한다고 안내하면 그림과 표가 잘리는지 실제 print 렌더도 확인한다. 인쇄 기능이 준비되지 않았으면 약속하지 않는다.

## 검증과 완료 기준

### 문서·근거 검증

- 사용자 요청의 절과 핵심 기능이 모두 포함되어 있는지 확인한다. 자동 파일 목록의 길이를 분석 완료 기준으로 사용하지 않는다.
- Markdown·HTML 파일 링크와 anchor를 검증한다. 괄호·공백·유니코드 경로를 처리한다.
- Mermaid 블록 수와 실제 SVG 수를 비교하고 문법·render 오류를 확인한다.
- 가능하면 주요 근거 파일의 HEAD 또는 hash를 전후 비교한다. drift가 있으면 영향을 받은 주장을 재확인한다.

### 실제 브라우저 검증

HTML을 `file://`로 열고 적어도 일반 데스크톱, 넓은 데스크톱, 좁은 모바일 viewport에서 확인한다. 기준 예시는 1440×1000, 1920×1080, 390×844이며 사용자의 실제 독서 환경을 우선한다.

- 외부 HTTP(S) 요청을 차단하고 request를 기록한다. 차단 덕분에 화면이 나왔다고 외부 의존이 없다고 판단하지 않는다. 최종본의 외부 자산 요청이 0인지 확인한다.
- 본문 절·목차·그림·부록 개수를 확인한다.
- 목차 링크, 부록 자동 펼침, 내장 Archify의 SVG 표시를 확인한다.
- `document.documentElement.scrollWidth <= innerWidth`를 확인한다. 문서의 세로 스크롤은 허용한다.
- console/page 오류와 깨진 anchor를 확인한다.
- 스크린샷으로 본문·표·가장 복잡한 그림을 실제로 읽어본다. DOM 검사 통과만으로 시각 검토 완료라고 보고하지 않는다.
- 수정 후 최종 HTML을 다시 검사한다. 기존 파일의 검증 결과를 수정본의 증거로 사용하지 않는다.

### 증거 구분

각각 수행/성공/실패/미검증을 분리한다: Markdown 구조·링크, Mermaid parse/render, Archify artifact receipt, 최종 HTML browser 검증, 시각 검토, 제품 코드 테스트, 실제 운영·인증 UI.

browser나 renderer가 없으면 가능한 정적 검사까지 완료하고 미검증 범위를 알린다. 실패한 검사를 통과로 바꾸거나 화면 clipping으로 넘침을 숨기지 않는다. 환경 문제가 반복되면 같은 명령을 무한 반복하지 말고 가용한 대안을 사용한 뒤 남은 제한을 기록한다.

## 전달 문구 예시

“통합 HTML 안내서를 만들었습니다. 본문·구조도·흐름도·보조 자료를 포함하므로 이 파일 하나로 읽을 수 있습니다. [실제로 수행한 검증]을 확인했습니다. 운영 버전·데이터는 [수행 상태]입니다.”

검증을 통과한 사실만 채운다. 코드 링크가 로컬 checkout에 의존하면 짧게 안내한다.
