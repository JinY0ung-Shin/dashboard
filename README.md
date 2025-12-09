# PortKnox

> Secure Port Management & SSH Tunnel Dashboard

TypeScript와 SvelteKit으로 만든 프로페셔널한 서버 포트 관리 및 SSH 포트포워딩 대시보드입니다.

## 주요 기능

### 포트 관리

- **실시간 포트 스캔**: 로컬 시스템의 열린 포트를 실시간으로 스캔하고 모니터링
- **포트 설명 관리**: 각 포트에 대한 설명과 등록자 정보 추가/수정
- **상태 모니터링**: 포트의 상태(open/closed), 프로토콜, 서비스 정보 확인

### SSH 포트 포워딩

- **SSH 터널 생성**: 원격 서버의 포트를 로컬 포트로 포워딩
- **자동 재연결**: 연결이 끊어지면 자동으로 재연결 시도 (최대 5회)
- **터널 복원**: 서버 재시작 시 저장된 터널 자동 복원
- **외부 접근 제어**: localhost만 허용 또는 외부 접근 허용 선택 가능
- **SSH 키 인증**: 자동으로 SSH 키 파일 감지 및 사용 (id_ed25519, id_rsa 등)
- **LiteLLM 통합**: SSH 터널 생성 시 원격 LLM을 LiteLLM Proxy에 자동 등록

### URL 모니터링 & 알람

- **임의 URL 모니터링**: 원하는 URL을 자유롭게 추가하여 헬스체크
- **자동 헬스체크**: 1분마다 자동으로 URL 상태 확인
- **이메일 알람**: 3번 연속 실패 시 이메일 전송, 복구 시에도 알림
- **URL별 설정**: 각 URL마다 개별 이메일 수신자, 체크 주기, 타임아웃 설정
- **상태 추적**: Healthy/Unhealthy/Unknown 상태 실시간 모니터링
- **검색 및 필터**: 이름, URL, 작성자, 태그로 빠른 검색
- **이력 관리**: 헬스체크 이력 및 알람 발송 이력 저장

### 데이터 관리

- **SQLite 데이터베이스**: 경량 SQLite를 사용한 안정적인 데이터 저장
- **통합 테이블 구조**: 포트 정보와 SSH 터널 정보를 단일 테이블로 관리
- **자동 동기화**: Dashboard와 SSH Forwarding 간 실시간 데이터 동기화

## 기술 스택

- **Frontend**: SvelteKit 5, TypeScript, TailwindCSS
- **Backend**: SvelteKit (Node.js)
- **Database**: SQLite (better-sqlite3, WAL mode)
- **SSH**: ssh2 라이브러리
- **Port Scanning**: netstat 명령어 활용
- **Email**: nodemailer (SMTP)
- **Scheduling**: node-cron

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정 (선택사항 - URL 모니터링 사용 시 필요)
# .env 파일 생성 후 SMTP 설정 추가

# 3. 개발 서버 실행
npm run dev

# 4. 브라우저에서 접속
# http://localhost:5173
```

## 환경 설정

### URL 모니터링을 위한 SMTP 설정

URL 모니터링 기능을 사용하려면 `.env` 파일을 생성하고 SMTP 설정을 추가해야 합니다:

```bash
# SMTP 설정 (Gmail 예시)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=PortKnox <noreply@portknox.dev>

# 모니터링 설정 (선택사항)
MONITOR_CHECK_INTERVAL=60000      # 기본: 1분
MONITOR_FAILURE_THRESHOLD=3       # 알람 전 연속 실패 횟수
MONITOR_CLEANUP_DAYS=30           # 이력 보관 기간 (일)
```

#### Gmail 설정 방법

1. Google 계정 → 보안 → 2단계 인증 활성화
2. 앱 비밀번호 생성: https://myaccount.google.com/apppasswords
3. 생성된 비밀번호를 `SMTP_PASSWORD`에 입력

**참고**: SMTP 설정이 없으면 URL 모니터링 기능은 비활성화되며, 다른 기능은 정상적으로 작동합니다.

## 설치 및 실행

### 개발 환경

```bash
# 저장소 클론
git clone <repository-url>
cd dashboard

# 의존성 설치
npm install

# 개발 서버 실행 (hot reload 포함)
npm run dev

# 또는 특정 호스트/포트로 실행
npm run dev -- --host 0.0.0.0 --port 3000
```

### 프로덕션 빌드

```bash
# 프로덕션 빌드
npm run build

# 빌드된 앱 미리보기
npm run preview

# Node.js 어댑터로 빌드 후 실행
node build
```

## 사용 방법

### 포트 관리

1. **포트 스캔**: Dashboard 탭에서 "Scan Ports" 버튼 클릭
2. **설명 추가**: 포트 행의 "Edit" 버튼 클릭 후 설명과 등록자 입력
3. **정보 확인**: 포트 번호, 상태, 프로토콜, 서비스, PID, 프로세스명 확인

### URL 모니터링

1. **모니터 생성**:
   - Monitors 탭으로 이동
   - "New Monitor" 버튼 클릭
   - 필요한 정보 입력:
     - Name: 모니터 이름
     - URL: 모니터링할 URL (예: https://api.example.com/health)
     - Email Recipients: 알람 수신 이메일 (복수 가능)
     - Check Interval: 체크 주기 (초 단위, 기본 60초)
     - Timeout: 타임아웃 (초 단위, 기본 5초)
     - Author: 등록자 정보 (선택사항)
     - Tags: 태그 (선택사항)

2. **모니터 관리**:
   - **Enable/Disable**: 토글 스위치로 모니터링 활성화/비활성화
   - **상태 확인**: ✓ (healthy), ✗ (unhealthy), ? (unknown)
   - **Delete**: 모니터 삭제 (이력도 함께 삭제됨)

3. **알람**:
   - 3번 연속 실패 시 자동으로 이메일 발송
   - 복구 시에도 알림 이메일 발송
   - 상태 변화 시에만 이메일 전송 (중복 방지)

### SSH 포트 포워딩

1. **터널 생성**:
   - SSH Forwarding 탭으로 이동
   - "New Tunnel" 버튼 클릭
   - 필요한 정보 입력:
     - Tunnel Name: 터널 이름
     - Local Port: 로컬 포트 번호
     - Remote Host: 원격 호스트 주소
     - Remote Port: 원격 포트 번호
     - SSH User: SSH 사용자명
     - SSH Host: SSH 서버 주소
     - SSH Port: SSH 포트 (기본: 22)
     - Local Bind Address: 127.0.0.1 (localhost만) 또는 0.0.0.0 (외부 접근 허용)
     - Registrant: 등록자 정보 (선택사항)

2. **터널 관리**:
   - **Stop**: 터널 중지
   - **Edit**: 등록자 정보 수정
   - **상태 확인**: Active/Inactive/Error 상태 표시

3. **자동 복원**:
   - 서버 재시작 시 저장된 터널이 자동으로 복원됩니다
   - 연결 실패 시 자동으로 재연결을 시도합니다

## 데이터베이스

PortKnox는 SQLite를 사용하여 데이터를 관리합니다.

### 데이터베이스 위치

```
./data/dashboard.db
```

### 테이블 구조

#### ports 테이블

```sql
CREATE TABLE ports (
  port INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  author TEXT,
  tags TEXT,

  -- SSH 터널 관련 정보 (nullable)
  ssh_tunnel_id TEXT UNIQUE,
  ssh_tunnel_name TEXT,
  ssh_remote_host TEXT,
  ssh_remote_port INTEGER,
  ssh_local_bind_address TEXT,
  ssh_user TEXT,
  ssh_host TEXT,
  ssh_port INTEGER,
  ssh_status TEXT,

  -- LiteLLM 관련 정보 (nullable)
  litellm_enabled BOOLEAN DEFAULT 0,
  litellm_model_id TEXT,
  litellm_model_name TEXT,
  litellm_api_base TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### url_monitors 테이블 (URL 모니터링)

```sql
CREATE TABLE url_monitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  check_interval INTEGER DEFAULT 60000,
  timeout INTEGER DEFAULT 5000,
  email_recipients TEXT NOT NULL,
  enabled BOOLEAN DEFAULT 1,

  status TEXT DEFAULT 'unknown',
  consecutive_failures INTEGER DEFAULT 0,
  last_check_at DATETIME,
  last_success_at DATETIME,
  last_failure_at DATETIME,
  last_status_code INTEGER,
  last_error_message TEXT,

  author TEXT,
  tags TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### monitor_history 테이블 (헬스체크 이력)

```sql
CREATE TABLE monitor_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id TEXT NOT NULL,
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  healthy BOOLEAN NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,

  FOREIGN KEY (monitor_id) REFERENCES url_monitors(id) ON DELETE CASCADE
);
```

#### alarm_history 테이블 (알람 발송 이력)

```sql
CREATE TABLE alarm_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id TEXT NOT NULL,
  alarm_type TEXT NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  recipients TEXT NOT NULL,
  email_sent BOOLEAN DEFAULT 0,
  error_message TEXT,

  FOREIGN KEY (monitor_id) REFERENCES url_monitors(id) ON DELETE CASCADE
);
```

### 데이터베이스 특징

- **WAL 모드**: 더 나은 동시성을 위한 Write-Ahead Logging
- **자동 타임스탬프**: created_at, updated_at 자동 관리
- **통합 관리**: 포트 정보와 SSH 터널을 단일 테이블로 관리
- **외래키 제약**: CASCADE DELETE로 모니터 삭제 시 이력도 자동 삭제
- **인덱스 최적화**: 자주 조회되는 컬럼에 인덱스 생성

## 프로젝트 구조

```
PortKnox/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db.ts                    # SQLite 데이터베이스 초기화
│   │   │   ├── portDescriptions.ts      # 포트 설명 관리
│   │   │   ├── portScanner.ts           # 포트 스캔 기능
│   │   │   ├── sshForwarder.ts          # SSH 포트 포워딩
│   │   │   ├── litellmClient.ts         # LiteLLM API 클라이언트
│   │   │   ├── monitorCrud.ts           # 모니터 CRUD 함수
│   │   │   └── monitoring/
│   │   │       ├── healthChecker.ts     # URL 헬스체크
│   │   │       ├── emailService.ts      # 이메일 전송
│   │   │       ├── monitorManager.ts    # 모니터링 관리
│   │   │       └── scheduler.ts         # Cron 스케줄러
│   │   ├── components/
│   │   │   └── Tooltip.svelte           # 툴팁 컴포넌트
│   │   └── types.ts                     # TypeScript 타입 정의
│   ├── routes/
│   │   ├── +layout.svelte               # 레이아웃 (헤더, 네비게이션)
│   │   ├── +page.svelte                 # Dashboard 페이지
│   │   ├── ssh-forward/
│   │   │   └── +page.svelte             # SSH Forwarding 페이지
│   │   ├── monitors/
│   │   │   ├── +page.svelte             # Monitors 페이지
│   │   │   └── components/
│   │   │       ├── MonitorForm.svelte   # 모니터 생성 폼
│   │   │       └── MonitorCard.svelte   # 모니터 상태 카드
│   │   └── api/
│   │       ├── ports/                   # 포트 관리 API
│   │       ├── ssh-forward/             # SSH 포워딩 API
│   │       ├── ssh-config/              # SSH Config 파서 API
│   │       ├── health-check/            # 헬스체크 API
│   │       └── monitors/                # 모니터 관리 API
│   └── hooks.server.ts                  # 서버 초기화 훅
├── data/
│   └── dashboard.db                     # SQLite 데이터베이스
├── llm-proxy/                           # LiteLLM Proxy
│   ├── docker-compose.yml
│   └── config.yaml
├── CLAUDE.md                            # 프로젝트 기술 문서
├── package.json
└── README.md
```

## SSH 키 인증

PortKnox는 자동으로 다음 SSH 키 파일을 감지하여 사용합니다:

1. `~/.ssh/id_ed25519`
2. `~/.ssh/id_rsa`
3. `~/.ssh/id_ecdsa`
4. `~/.ssh/id_dsa`

SSH Agent (SSH_AUTH_SOCK)도 지원합니다.

## 에러 처리

### SSH 연결 에러

- 자동 재연결 시도 (최대 5회, 3초 간격)
- 재연결 실패 시 상태를 'error'로 표시
- 서버 크래시 방지를 위한 전역 에러 핸들러

### 포트 충돌

- 이미 사용 중인 로컬 포트는 터널 생성 실패로 표시됩니다

## 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 타입 체크
npm run check

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## 라이선스

이 프로젝트는 개인 프로젝트입니다.

## 기여

버그 리포트나 기능 제안은 이슈로 등록해주세요.
