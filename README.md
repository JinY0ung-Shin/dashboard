# 서버 포트 대시보드

TypeScript와 SvelteKit으로 만든 서버 포트 관리 및 SSH 포트포워딩 대시보드입니다.

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행
npm run dev

# 3. 브라우저에서 접속
# http://localhost:5173
```

## 주요 기능

### 포트 관리
- 현재 서버에서 열려있는 포트 목록 확인
- **포트 클릭으로 서비스 접근**: 포트 번호를 클릭하면 해당 서비스가 새 탭에서 열립니다
- **포트별 설명 추가**: 각 포트에 대한 설명과 커스텀 URL을 저장할 수 있습니다
- 포트 검색 기능 (번호, 프로토콜, 서비스, 설명)
- 사용 가능한 포트 찾기

### SSH 포트포워딩
- 다른 서버의 서비스를 로컬 포트로 포워딩
- SSH 터널링을 통한 안전한 원격 접근
- **자동 재연결**: 연결이 끊어지면 자동으로 재시도 (최대 5회)
- **영구 저장**: 서버 재시작 시 자동으로 터널 복원
- **외부 접근 설정**: localhost만 또는 모든 인터페이스(0.0.0.0) 선택 가능
- **실시간 상태 모니터링**: 5초마다 자동 상태 확인
- SSH Config 파일 지원: `~/.ssh/config`의 Host 별칭 자동 로드
- 직관적인 툴팁으로 초보자도 쉽게 사용 가능

### Tab 기반 UI
- 확장 가능한 탭 인터페이스
- 깔끔하고 직관적인 디자인

## 설치

```bash
npm install
```

## 개발 서버 실행

```bash
npm run dev
```

개발 서버는 http://localhost:5173 에서 실행됩니다.

## 빌드

```bash
npm run build
```

## 프로덕션 배포

### 방법 1: 기본 실행

```bash
npm run preview
```

### 방법 2: PM2로 실행 (권장)

PM2는 Node.js 프로세스 매니저로, 앱이 크래시되면 자동으로 재시작하고 로그를 관리해줍니다.

#### PM2 설치

```bash
# 전역 설치
npm install -g pm2
```

#### PM2로 앱 시작

```bash
# 빌드 먼저 실행
npm run build

# PM2로 프로덕션 서버 시작
pm2 start npm --name "dashboard" -- run preview

# 또는 개발 모드로 시작 (개발 중 사용)
pm2 start npm --name "dashboard-dev" -- run dev
```

#### PM2 관리 명령어

```bash
# 앱 상태 확인
pm2 status

# 실시간 로그 보기
pm2 logs dashboard

# 앱 재시작
pm2 restart dashboard

# 앱 중지
pm2 stop dashboard

# 앱 삭제
pm2 delete dashboard

# 모니터링 대시보드
pm2 monit
```

#### 서버 재부팅 시 자동 시작

```bash
# 현재 PM2 프로세스를 시작 스크립트로 저장
pm2 save

# 부팅 시 자동 시작 설정
pm2 startup

# 위 명령어가 출력하는 명령어를 복사해서 실행
# (시스템에 따라 다름, 출력된 명령어를 그대로 실행하세요)
```

#### PM2 설정 파일 사용 (선택사항)

프로젝트 루트에 `ecosystem.config.js` 생성:

```javascript
module.exports = {
  apps: [{
    name: 'dashboard',
    script: 'npm',
    args: 'run preview',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

설정 파일로 실행:

```bash
pm2 start ecosystem.config.js
```

## 지원 플랫폼

이 대시보드는 **크로스 플랫폼**을 지원합니다:

### Ubuntu / Linux
- `ss -tulpn` 명령어 사용하여 포트 스캔
- 프로세스 이름과 PID 자동 감지
- 권장 환경입니다

### Windows
- `netstat -ano` 명령어 사용
- 관리자 권한이 필요할 수 있습니다

### macOS
- `ss` 또는 `netstat` 명령어 사용
- 기본적으로 지원됩니다

## SSH 포트포워딩 사용법

### 사전 요구사항

SSH 키 기반 인증이 설정되어 있어야 합니다:

```bash
# SSH 키가 없다면 생성
ssh-keygen -t ed25519

# 원격 서버에 공개키 복사
ssh-copy-id user@remote-server

# 연결 테스트
ssh user@remote-server
```

### SSH Config 파일 활용 (권장)

`~/.ssh/config` 파일에 자주 사용하는 서버를 등록하면 대시보드에서 자동으로 불러옵니다:

```
Host my-server
    HostName example.com
    User myuser
    Port 22
    IdentityFile ~/.ssh/id_ed25519

Host proxy-server
    HostName jump.example.com
    User admin
    ProxyJump bastion
```

### 터널 생성 예시

1. **Dashboard → SSH Tunnels** 탭으로 이동
2. **New Tunnel** 버튼 클릭
3. 설정 입력:
   - **Name**: Production API
   - **Local Port**: 8080 (로컬에서 사용할 포트)
   - **Bind Address**: localhost (본인만) 또는 0.0.0.0 (외부 접근 허용)
   - **Remote Host**: localhost (대부분의 경우)
   - **Remote Port**: 3000 (원격 서버의 서비스 포트)
   - **SSH Host**: example.com
   - **SSH User**: myuser
4. **Start Tunnel** 클릭

이제 `http://localhost:8080`으로 원격 서버의 3000번 포트 서비스에 접근할 수 있습니다.

### 자동 복원

- SSH 터널 설정은 `data/ssh-tunnels.json`에 저장됩니다
- 서버 재시작 시 자동으로 모든 터널을 재연결합니다
- PM2를 사용하면 앱이 크래시되어도 자동으로 재시작되어 터널이 유지됩니다

## 주의사항

### 포트 스캔
- **Ubuntu/Linux**: 루트 권한 없이도 대부분의 포트 정보를 확인할 수 있습니다
- **Windows**: 포트 스캔 기능은 관리자 권한이 필요할 수 있습니다

### SSH 포트포워딩
- SSH 키 인증이 반드시 설정되어 있어야 합니다 (비밀번호 인증 미지원)
- SSH 키 위치: `~/.ssh/id_ed25519`, `~/.ssh/id_rsa` 등
- Windows에서는 `ssh-agent` 서비스가 실행 중이어야 합니다
- `0.0.0.0` 바인딩 시 방화벽 설정에 주의하세요

### 프로덕션 운영
- PM2 사용을 권장합니다 (자동 재시작, 로그 관리)
- `data/` 폴더는 백업하세요 (포트 설명, SSH 터널 설정 포함)

## FAQ & 트러블슈팅

### SSH 터널이 "All configured authentication methods failed" 오류가 발생해요

SSH 키 인증이 제대로 설정되지 않았을 가능성이 높습니다:

1. SSH 키 생성 확인:
   ```bash
   ls -la ~/.ssh/
   ```

2. 공개키를 원격 서버에 복사:
   ```bash
   ssh-copy-id user@remote-server
   ```

3. 수동으로 연결 테스트:
   ```bash
   ssh user@remote-server
   ```

4. Windows의 경우 ssh-agent 서비스 확인:
   ```powershell
   Get-Service ssh-agent
   # 실행 중이 아니면
   Start-Service ssh-agent
   ```

### 서버를 재시작했는데 SSH 터널이 복원되지 않아요

1. PM2를 사용하고 있는지 확인하세요 (권장)
2. `data/ssh-tunnels.json` 파일이 있는지 확인
3. 서버 로그 확인:
   ```bash
   pm2 logs dashboard
   ```

### PM2로 실행했는데 앱이 시작되지 않아요

1. 먼저 빌드를 실행했는지 확인:
   ```bash
   npm run build
   ```

2. PM2 로그 확인:
   ```bash
   pm2 logs dashboard --lines 100
   ```

3. 포트가 이미 사용 중인지 확인:
   ```bash
   # Linux/Mac
   lsof -i :4173

   # Windows
   netstat -ano | findstr :4173
   ```

### SSH 터널 연결이 자주 끊겨요

1. 방화벽이나 NAT 타임아웃 설정을 확인하세요
2. SSH keepalive 설정이 활성화되어 있습니다 (10초 간격)
3. 자동 재연결 기능이 작동 중입니다 (최대 5회 재시도)
4. PM2를 사용하면 앱 크래시 시에도 자동 복구됩니다

### 외부에서 0.0.0.0으로 바인딩한 포트에 접근이 안 돼요

1. 방화벽 설정 확인:
   ```bash
   # Ubuntu/Linux (ufw 사용 시)
   sudo ufw allow 8080/tcp

   # firewalld 사용 시
   sudo firewall-cmd --add-port=8080/tcp --permanent
   sudo firewall-cmd --reload
   ```

2. 클라우드 환경이라면 보안 그룹(Security Group) 설정 확인

## 라이선스

MIT

## 기여

이슈와 Pull Request를 환영합니다!
