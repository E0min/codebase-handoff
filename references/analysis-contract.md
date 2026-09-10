# 분석·문서 계약

이 계약은 사람에게 전달할 서비스/기능 인수인계서의 기본 구성이다. 사용자의 명시적 형식 변경을 우선한다. 범위가 좁아도 중요 영역이 조사되지 않았음을 빈칸으로 숨기지 않고 확인 필요 또는 해당 없음으로 표시한다.

## 조사 순서와 수집할 증거

### 1. System Context

사용자·운영자·시스템 trigger, 서비스 경계, 분석 범위 안팎을 식별한다. 실제 HTTP client 목적지, MQ routing/binding, 공유 collection, import/DI 등록으로 레포 사이 관계를 확인한다. 폴더가 인접하다는 이유만으로 연결하지 않는다.

### 2. Repository Responsibility

각 레포에 다음 Repository Summary를 작성한다: 핵심 목적, 서비스 내 역할, 실행 애플리케이션, 주요 사용자, 다른 레포와 관계, 주요 기술 스택, 저장소, 외부 서비스, 배포 형태.

한 문장: 이 레포는 “[책임]”을 담당하는 “[종류]” 애플리케이션이다.

manifest의 버전 선언, lockfile의 해석 버전, 실제 실행 버전을 구분한다. 문서가 없다는 이유로 책임을 추측하지 않는다.

### 3. Repository Structure

`경로 | 책임 | 중요도(Critical/High/Medium/Low) | 주요 의존성` 표로 묶는다. entrypoint, route, service/domain, data access, model/schema, queue/worker, scheduler, integration, config, infra, utility를 식별하되 없는 레이어를 발명하지 않는다.

### 4. Module Dependency

책임 단위의 그래프를 만든다. 핵심 공유 모듈, 다수 소비자, 변경 영향, 순환 의존, layer 위반 후보, 외부 결합을 찾는다. “가장 많은 의존” 같은 순위는 실제로 측정한 경우에만 사용한다. 순환 분석은 범위·해석 규칙·type-only import 포함 여부를 밝힌다. 미수행이면 확인 필요다.

### 5. Runtime Entry Points

HTTP server/route, frontend route, CLI, cron/scheduler, queue consumer, event listener, webhook, bootstrap, function/lambda, batch job을 조사한다.

`Entry Point | Trigger | 핵심 모듈 | 목적 | 실제 경로·함수`를 남긴다. 전체 서비스인지 지정 기능의 목록인지 밝힌다. decorator 추출만으로 global prefix·guard·proxy·운영 사용 여부가 검증되었다고 하지 않는다.

### 6. Core Business Flow

핵심 기능을 최대 10개 우선순위로 추린다. 각각 이름, 목적, 진입점, 핵심 모듈, 데이터, 외부 의존, 비동기 여부, 중요도를 기록한다.

Critical/High는 실제 호출을 끝까지 따라간다. HTTP 반환 후 이어지는 작업, polling 조회 경로, 최종 DB 상태까지 포함한다. 구현 세부가 아닌 “이 단계가 왜 필요한지”와 수정 시 영향 범위를 설명한다. sequenceDiagram을 쓴다.

### 7. Data & State

Entity별로 저장 위치, model/schema, 주요 필드, 관계, 생성 시점, 수정 주체, 삭제 방식, source of truth를 정리한다. 원본·cache·집계·snapshot·표시용 계산값을 구분한다.

ER의 논리 참조와 실제 DB 외래키 강제를 구분한다. schema index 선언과 운영 index 존재를 구분한다. 데이터 보존과 원본 삭제가 downstream에 미치는 영향을 추적한다.

status/state의 **실제 write**를 찾아 `전이 | 함수 | 조건 | DB update 위치 | 실패 상태 | retry`를 기록한다. enum에 있으나 쓰지 않는 상태를 정상 흐름에 넣지 않는다. document 삭제는 설명용 종결 상태로 표시하고 저장된 status와 구분한다.

### 8. Async / Event Flow

producer/consumer, publish/subscribe, cron, background, retry, delayed job, webhook을 찾는다. `Producer → 매개체 → Consumer → Handler → DB/외부 시스템`을 연결한다.

직접 함수 호출·프로세스 내 Promise·DB job·durable queue를 구분한다. request/reply exchange, 임시 큐, correlation ID, ack/nack, DLQ, delivery persistence, heartbeat, worker 소유권, restart 복구를 확인한다. 하나의 async 패턴을 전체 서비스에 일반화하지 않는다.

### 9. External Integration

`시스템 | 목적 | 호출 위치 | 인증 | 실패 처리 | retry/timeout` inventory를 만든다. rate limit, token refresh, webhook, idempotency 구현을 확인한다. 통합별로 미확인 사항을 명시한다. 직접 호출과 내부 서비스가 중개하는 호출, inbound 고객 요청을 구분한다. secret 값은 출력하지 않는다.

### 10. Infrastructure / Deployment

환경변수명·역할·사용 위치, feature flag, local/development/staging/production 분기를 조사한다. 비어 있는 설정이 오류인지 정상 empty 반환인지도 읽는다.

Git → CI → Build → Deploy → Runtime을 workflow와 실제 설정으로 연결한다. Docker, orchestrator, cloud, serverless, migration, cron, monitoring, logging을 필요한 범위에서 조사한다. 선언된 trigger와 조직의 실제 승격 절차, GitOps 태그 커밋과 클러스터 반영을 구분한다.

### 11. Failure Path

핵심 흐름마다 Success/Failure/Retry/Timeout/Rollback/Partial Failure를 확인한다. try/catch, transaction, compensation, idempotency, DLQ의 존재뿐 아니라 적용 경계를 확인한다.

각 write 사이에서 프로세스가 죽는 경우, timeout 뒤 작업이 계속되는 경우, 신·구 데이터가 공존하는 경우, replay 시 누적되는 경우를 코드상 위험으로 검토한다. 재현하지 않은 위험을 발생한 장애로 보고하지 않는다.

`증상 | 첫 확인 지점 | 다음 경계 | 복구 판단` 표와 연결 키(job/run/request/slug/batch 등 실제 존재하는 것)를 제공한다. 운영 변경 명령을 실제로 실행하지 않고 확인 절차를 설명한다.

### 12. Risk / Technical Debt / Unknown

위험도는 의존 범위·DB 결합·외부 API·side effect·transaction·async·retry·legacy·TODO/FIXME/HACK·테스트 범위를 근거로 판단한다.

`영역 | 위험도 | 이유 | 변경 시 확인할 것` 표를 만든다. 테스트 파일 존재, 테스트 실행 성공, coverage, 운영 검증은 각각 별도다.

개발자 질문은 중요도 순으로 정리한다: 설계 이유, 운영 전용 문제, 보존해야 할 계약, 알려진 장애, 수동 운영, deprecated/미사용 기능, 부채, 핵심 제약, 배포 버전, 데이터 보존·복구 담당. 질문마다 어떤 증거가 필요한지 덧붙인다.

## 최종 문서의 15개 점검 항목

여러 레포에 걸친 서비스에는 다음 전체 구조를 사용한다. 작은 프로젝트는 연관 항목을 합치고 각 항목의 위치 또는 해당 없음·확인 필요를 점검표에 기록한다. 절 수를 줄여도 조사 항목을 조용히 생략하지 않는다.

| 절 | 제목 | 필수 내용 |
| --- | --- | --- |
| 1 | Executive Summary | 5분 요약, 목적, 핵심 흐름, 용어, 범위·분석 기준·증거 한계 |
| 2 | System Context | 외부 사용자·시스템, Repository Summary, 레포 관계 |
| 3 | Repository Map | 책임별 디렉터리와 중요도·의존성 |
| 4 | Architecture | 상위 dependency graph, 공유 core, 변경 영향·cycle/layer 검토 |
| 5 | Runtime Entry Points | 등록과 실제 호출을 구분한 진입점 표 |
| 6 | Core Business Flows | 최대 10개 후보, Critical/High E2E, 실제 경로·함수, sequence |
| 7 | Data Model | Entity 소유권·CRUD·원본/파생 구분·ER |
| 8 | State Lifecycle | 실제 전이·조건·write·실패·retry |
| 9 | Async Architecture | queue/event/cron·reply·restart·간접 연결 |
| 10 | External Integrations | 외부 경계 inventory·인증·실패·timeout·retry |
| 11 | Infrastructure | configuration·환경 차이·CI/CD·프로세스·migration·관측 |
| 12 | Failure & Recovery | 증상별 진단 순서, 부분 실패·재시도·복구 한계 |
| 13 | Danger Zones | 위험 표·테스트 증거·수정 시 동반 검증 |
| 14 | Unknowns | 우선순위가 있는 추가 핸드오프 질문 |
| 15 | Suggested Learning Order | 최대 10단계, 각 단계의 이유·볼 파일·답해야 할 질문 |

학습 순서는 작은 프로젝트에서 3~5단계, 큰 서비스에서 최대 10단계를 권장한다. 사용자가 정확한 단계 수를 지정하면 그 형식을 우선한다. 좁은 코드베이스를 채우려고 존재하지 않는 기능을 만들지 않는다.

## 검토 연습: 결론을 내리기 전에 확인할 것

- 타입에 `published`가 있어도 실제 성공 코드가 문서를 삭제한다면 상태도는 무엇을 보여야 하는가?
- raw upsert 뒤 score increment와 cursor update가 별도 호출이라면 어디까지 멱등성을 주장할 수 있는가?
- HTTP 내부에서 RPC 응답을 기다리는 경로를 다른 기능의 polling 계약으로 설명하고 있지 않은가?
- 새 generation을 일부 삽입한 직후 reader가 최대 generation을 선택한다면 원본 보존과 읽기 일관성이 같은 보장인가?
- README의 배포 설명과 현재 workflow의 trigger가 다르면 어떤 사실을 기록해야 하는가?

이 질문은 조사 방법을 검토하기 위한 예시다. 대상 서비스에 같은 구조나 결함이 있다고 가정하지 않는다.
