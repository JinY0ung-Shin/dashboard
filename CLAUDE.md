# PortKnox - 프로젝트 가이드

> 이 문서는 Claude AI가 프로젝트를 빠르게 이해하고 작업할 수 있도록 작성되었습니다.

## 프로젝트 개요

**PortKnox**는 서버 포트 관리 및 SSH 터널링을 위한 웹 대시보드입니다.

- **목적**: 개발 서버의 포트 관리 및 원격 서비스 접근 간소화
- **브랜딩**: PortKnox = Port + Knox (Fort Knox - 보안/안전성 상징)
- **타겟 사용자**: 개발자, DevOps 엔지니어

## 기술 스택

### Frontend

- **SvelteKit 5**: 메인 프레임워크
- **TailwindCSS**: 스타일링
- **TypeScript**: 타입 안정성

### Backend

- **Node.js + TypeScript**: 서버
- **better-sqlite3**: 데이터베이스
- **ssh2**: SSH 터널링

### 데이터 저장

- **SQLite**: 로컬 데이터베이스 (WAL 모드)
- **위치**: `data/dashboard.db`

## 주요 기능

### 1. Dashboard (포트 관리)

- 실시간 포트 스캐닝 (netstat/ss 사용)
- 포트 정보 조회: 포트 번호, 프로토콜, 상태, 프로세스
- **포트별 메타데이터**:
  - Description: 포트 설명
  - Author (Registrant): 등록자 이름
- 포트 번호 클릭 시 서비스 접속
- 검색 기능 (포트, 프로토콜, 프로세스, 설명, 등록자)
- 사용 가능한 포트 찾기

### 2. SSH Forwarding (SSH 터널)

- 원격 서버의 서비스를 로컬 포트로 포워딩
- **자동 기능**:
  - 재연결 (최대 5회, 3초 간격)
  - 서버 재시작 시 터널 복원
  - Dashboard에 자동 등록 (description + author)
  - **LiteLLM 자동 등록**: SSH 터널 생성 시 원격 LLM을 LiteLLM Proxy에 자동 등록
- **설정 옵션**:
  - Bind Address: localhost(127.0.0.1) 또는 모든 인터페이스(0.0.0.0)
  - SSH Config 파일 (`~/.ssh/config`) 자동 로드
  - LiteLLM 모델 이름 및 API 키 (선택)
- **상태 관리**:
  - active: 정상 작동
  - inactive: 재연결 중
  - error: 최대 재시도 초과

### 3. LiteLLM Integration (LLM 프록시)

- **목적**: 원격 서버의 LLM을 SSH 터널로 가져와 통합 관리
- **Docker Compose**: PostgreSQL + LiteLLM Proxy
- **자동 등록**: SSH 터널 생성 시 LiteLLM에 모델 자동 추가/삭제
- **API 기반**: OpenAI 호환 API 프록시
- **위치**: `./llm-proxy/`
- **포트**: 4000 (LiteLLM), 5432 (PostgreSQL)

## 데이터베이스 구조

### 통합 테이블: `ports`

```sql
CREATE TABLE ports (
  port INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  author TEXT,
  tags TEXT, -- JSON array

  -- SSH 터널 전용 컬럼 (nullable)
  ssh_tunnel_id TEXT UNIQUE,
  ssh_tunnel_name TEXT,
  ssh_remote_host TEXT,
  ssh_remote_port INTEGER,
  ssh_local_bind_address TEXT,
  ssh_user TEXT,
  ssh_host TEXT,
  ssh_port INTEGER,
  ssh_status TEXT,

  -- LiteLLM 통합 (nullable)
  litellm_enabled BOOLEAN DEFAULT 0,
  litellm_model_id TEXT,
  litellm_model_name TEXT,
  litellm_api_base TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 데이터 구분

- **일반 포트**: `ssh_tunnel_id IS NULL`
- **SSH 터널 포트**: `ssh_tunnel_id IS NOT NULL`

### 인덱스

- `idx_ports_ssh_tunnel_id`: SSH 터널 ID 조회 최적화
- `idx_ports_ssh_status`: 상태별 필터링 최적화
- `idx_ports_author`: 등록자별 필터링 최적화

## 아키텍처

### SQLite 단일 통합 테이블

- `ports` 테이블 하나로 모든 데이터 관리
- SSH 터널 컬럼은 nullable로 설계
- **장점**:
  - 데이터 일관성 보장
  - Dashboard ↔ SSH Forward 자동 동기화
  - 코드 단순화
  - 트랜잭션 지원으로 안정성 향상

## 핵심 로직

### SSH 터널 생성 흐름

1. 사용자가 SSH Forward 폼 작성 (LiteLLM 옵션 포함 가능)
2. `createSSHForward()` 호출
3. SSH 연결 설정 (`setupSSHConnection()`)
4. 성공 시:
   - **LiteLLM 자동 등록** (옵션 활성화된 경우):
     - `addModelToLiteLLM()` 호출
     - 모델 이름, API Base, API Key 전달
     - LiteLLM에서 모델 ID 반환
   - `saveTunnel()` → DB에 저장
     - description: "SSH Tunnel: {name}"
     - author: 사용자 입력값
     - 모든 SSH 설정 저장
     - LiteLLM 정보 저장 (enabled, model_id, model_name, api_base)
5. Dashboard에서 즉시 조회 가능

### LiteLLM 통합 흐름

1. **SSH 터널 생성 시**:
   - 사용자가 "LiteLLM 자동 등록" 체크박스 활성화
   - 모델 이름 입력 (예: "my-llm")
   - API 키 입력 (선택사항)
2. **자동 등록**:
   - SSH 터널이 성공적으로 생성되면
   - `http://{bindAddress}:{localPort}/v1` 형식으로 API Base 생성
   - LiteLLM API 호출하여 모델 등록
   - DB에 LiteLLM 정보 저장
3. **SSH 터널 중지 시**:
   - DB에서 LiteLLM 정보 조회
   - `deleteModelFromLiteLLM()` 호출하여 모델 삭제
   - 터널 및 DB 레코드 삭제

### Dashboard ↔ SSH Forward 동기화

- **Dashboard에서 author 수정** → DB 업데이트
- **SSH Forward 조회** → `listActiveForwards()`가 DB에서 최신 author 조회
- **동기화 메커니즘**: 메모리(activeForwards Map) + DB 병합

```typescript
// SSH Forward가 최신 데이터를 가져오는 방법
export function listActiveForwards(): SSHForwardConfig[] {
	return Array.from(activeForwards.values()).map((forward) => {
		// DB에서 최신 author 조회
		const dbData = db
			.prepare(
				`
      SELECT description, author FROM ports WHERE ssh_tunnel_id = ?
    `
			)
			.get(forward.config.id);

		return {
			...forward.config,
			author: dbData?.author || undefined
		};
	});
}
```

## 파일 구조

```
src/
├── lib/
│   ├── server/
│   │   ├── db.ts                  # SQLite 초기화
│   │   ├── portDescriptions.ts    # 포트 설명 CRUD
│   │   ├── portScanner.ts         # 포트 스캐닝
│   │   ├── sshForwarder.ts        # SSH 터널 관리
│   │   ├── sshConfigManager.ts    # SSH Config 파서
│   │   └── litellmClient.ts       # LiteLLM API 클라이언트
│   ├── components/
│   │   └── Tooltip.svelte
│   └── types.ts                   # 타입 정의
├── routes/
│   ├── +layout.svelte             # 레이아웃 (네비게이션)
│   ├── +page.svelte               # Dashboard
│   ├── +page.server.ts            # Dashboard 서버 로직
│   ├── api/
│   │   ├── ports/+server.ts       # 포트 API
│   │   ├── port-descriptions/+server.ts
│   │   └── ssh-forward/+server.ts
│   └── ssh-forward/
│       ├── +page.svelte           # SSH Forward UI
│       └── components/
│           ├── ConfigForm.svelte
│           ├── TunnelForm.svelte
│           ├── ConfigCard.svelte
│           └── ForwardCard.svelte
└── hooks.server.ts                # 서버 초기화

data/
├── dashboard.db                   # SQLite DB
├── dashboard.db-wal               # WAL 로그
└── *.backup                       # 백업 파일

llm-proxy/                         # LiteLLM Proxy
├── docker-compose.yml             # Docker Compose 설정
├── config.yaml                    # LiteLLM 설정
├── .env                           # 환경변수
├── .env.example                   # 환경변수 예시
└── README.md                      # LiteLLM 사용법
```

## 중요 개념

### SSH 터널 상태 관리

- **메모리**: `activeForwards: Map<string, ActiveForward>`
  - SSH 클라이언트 객체
  - 서버 객체
  - 재연결 상태
- **DB**: ports 테이블
  - 영구 저장용
  - 서버 재시작 시 복원 소스

### 재연결 메커니즘

```typescript
// 연결 끊김 감지
client.on('close', (hadError) => {
  if (재시도 횟수 < 5) {
    3초 후 reconnectSSHForward() 호출
  } else {
    status = 'error'
  }
});
```

### 포트 스캐닝

- **Linux/Mac**: `ss -tulpn` 또는 `netstat`
- **Windows**: `netstat -ano`
- **결과 파싱**: 정규표현식으로 포트, 프로토콜, PID 추출

## 일반적인 작업

### 새 기능 추가 시

1. `src/lib/types.ts`에 타입 추가
2. DB 스키마 변경 필요 시 `src/lib/server/db.ts` 수정
3. API 엔드포인트: `src/routes/api/` 추가
4. UI 컴포넌트: `src/routes/` 또는 `components/` 추가

### DB 스키마 변경 시

1. `src/lib/server/db.ts`의 CREATE TABLE 수정
2. 마이그레이션 로직 추가 (필요 시)
3. 관련 CRUD 함수 업데이트
4. 타입 정의 업데이트

### 버그 수정 시

- **SSH 관련**: `src/lib/server/sshForwarder.ts`
- **포트 스캔 관련**: `src/lib/server/portScanner.ts`
- **DB 관련**: `src/lib/server/portDescriptions.ts` 또는 `db.ts`
- **UI 관련**: `src/routes/` 컴포넌트

## 알려진 제약사항

1. **SSH 인증**: 키 기반만 지원 (비밀번호 미지원)
2. **포트 스캔**: Windows는 관리자 권한 필요할 수 있음
3. **동시성**: SQLite WAL 모드로 해결됨
4. **재연결**: 최대 5회, 초과 시 수동 재시작 필요

## 디버깅 팁

### 로그 확인

모든 로그는 `[PortKnox]`, `[PortKnox SSH]`, `[PortKnox Migration]` 접두사 사용

```bash
# PM2 로그
pm2 logs portknox

# 직접 실행 시
npm run dev  # 콘솔에 출력
```

### DB 직접 조회

```bash
npm install -g better-sqlite3

# DB 조회
sqlite3 data/dashboard.db "SELECT * FROM ports"
```

### 일반적인 문제

**SSH 터널이 연결 안 됨**

- SSH 키 인증 확인: `ssh user@host`로 테스트
- Windows: ssh-agent 서비스 실행 확인

**Dashboard에서 수정이 SSH Forward에 반영 안 됨**

- 페이지 새로고침 필요
- `listActiveForwards()`가 DB에서 최신 데이터 조회하는지 확인

**포트 스캔 안 됨**

- 명령어 권한 확인
- 로그에서 에러 메시지 확인

**LiteLLM 연결 안 됨**

- Docker Compose 상태 확인: `cd llm-proxy && docker-compose ps`
- LiteLLM 로그 확인: `docker-compose -f llm-proxy/docker-compose.yml logs -f litellm`
- 환경변수 확인: `.env` 파일에 `LITELLM_BASE_URL`, `LITELLM_MASTER_KEY` 설정
- 헬스체크: `curl http://localhost:4000/model/info -H "Authorization: Bearer sk-1234"`

## 개발 워크플로우

```bash
# LiteLLM 서버 시작
cd llm-proxy
docker-compose up -d
cd ..

# 개발 시작
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm run preview

# PM2로 배포
pm2 start npm --name "portknox" -- run preview
pm2 save

# LiteLLM 서버 중지
cd llm-proxy
docker-compose down
```

## 브랜딩 가이드

- **로고/이름**: PortKnox (대소문자 구분)
- **태그라인**: "Secure Port Management Made Simple"
- **색상 테마**: Dark mode (slate-900 base)
- **로그 접두사**: `[PortKnox]`, `[PortKnox SSH]`, etc.

## 주요 업데이트 히스토리

### 2025-12-07

- ✅ **LiteLLM 통합 기능 추가**
  - Docker Compose로 PostgreSQL + LiteLLM Proxy 관리
  - SSH 터널 생성 시 LiteLLM에 자동으로 모델 등록
  - SSH 터널 중지 시 LiteLLM에서 모델 자동 삭제
  - DB 스키마에 LiteLLM 관련 컬럼 추가
  - LiteLLM API 클라이언트 모듈 작성
  - SSH Forward UI에 LiteLLM 자동 등록 옵션 추가

### 2025-12-06

- ✅ Dashboard에 등록자(author) 컬럼 추가
- ✅ SSH Forward와 Dashboard 간 author 정보 동기화
- ✅ SQLite 단일 통합 테이블 구조로 설계
- ✅ 브랜딩을 PortKnox로 변경
- ✅ `listActiveForwards()`에 DB 병합 로직 추가
- ✅ DB Migration 기능 제거 (불필요)

## 참고 자료

- [SvelteKit Docs](https://kit.svelte.dev)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [ssh2 Documentation](https://github.com/mscdex/ssh2)
- [LiteLLM Docs](https://docs.litellm.ai/)

---

**작성일**: 2025-12-06
**최종 업데이트**: 2025-12-07
