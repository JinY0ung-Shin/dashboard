import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DATA_DIR, 'dashboard.db');

// 데이터 디렉토리 생성
if (!existsSync(DATA_DIR)) {
	mkdirSync(DATA_DIR, { recursive: true });
}

// SQLite 데이터베이스 연결
const db = new Database(DB_PATH);

// WAL 모드 활성화 (더 나은 동시성)
db.pragma('journal_mode = WAL');

// 외래 키 제약조건 활성화
db.pragma('foreign_keys = ON');

// 통합 포트 테이블 생성
db.exec(`
	CREATE TABLE IF NOT EXISTS ports (
		port INTEGER PRIMARY KEY,
		description TEXT NOT NULL,
		author TEXT,

		-- SSH 터널 관련 정보 (nullable - 일반 포트는 NULL)
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

	-- 인덱스 생성
	CREATE INDEX IF NOT EXISTS idx_ports_ssh_tunnel_id ON ports(ssh_tunnel_id);
	CREATE INDEX IF NOT EXISTS idx_ports_ssh_status ON ports(ssh_status);
	CREATE INDEX IF NOT EXISTS idx_ports_author ON ports(author);
`);

// 업데이트 트리거 생성
db.exec(`
	CREATE TRIGGER IF NOT EXISTS update_ports_timestamp
	AFTER UPDATE ON ports
	BEGIN
		UPDATE ports SET updated_at = CURRENT_TIMESTAMP WHERE port = NEW.port;
	END;
`);

console.log(`[PortKnox] SQLite database initialized at ${DB_PATH}`);

export default db;
