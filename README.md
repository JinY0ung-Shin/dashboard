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

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행
npm run dev

# 3. 브라우저에서 접속
# http://localhost:5173
```

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

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 데이터베이스 특징

- **WAL 모드**: 더 나은 동시성을 위한 Write-Ahead Logging
- **자동 타임스탬프**: created_at, updated_at 자동 관리
- **통합 관리**: 포트 정보와 SSH 터널을 단일 테이블로 관리

## 프로젝트 구조

```
dashboard/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db.ts              # SQLite 데이터베이스 초기화
│   │   │   ├── portDescriptions.ts # 포트 설명 관리
│   │   │   ├── portScanner.ts     # 포트 스캔 기능
│   │   │   └── sshForwarder.ts    # SSH 포트 포워딩
│   │   ├── components/
│   │   │   └── SSHForwardTab.svelte # SSH 포워딩 탭 컴포넌트
│   │   └── types.ts               # TypeScript 타입 정의
│   ├── routes/
│   │   ├── +layout.svelte         # 레이아웃 (헤더, 네비게이션)
│   │   ├── +page.svelte           # Dashboard 페이지
│   │   └── api/
│   │       └── ports/             # 포트 관리 API
│   │       └── ssh-forward/       # SSH 포워딩 API
│   └── hooks.server.ts            # 서버 초기화 훅
├── data/
│   └── dashboard.db               # SQLite 데이터베이스
├── CLAUDE.md                      # 프로젝트 기술 문서
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
