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

// 테이블 생성
db.exec(`
	CREATE TABLE IF NOT EXISTS port_descriptions (
		port INTEGER PRIMARY KEY,
		description TEXT NOT NULL,
		author TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS ssh_tunnels (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		remote_host TEXT NOT NULL,
		remote_port INTEGER NOT NULL,
		local_port INTEGER NOT NULL,
		local_bind_address TEXT DEFAULT '127.0.0.1',
		ssh_user TEXT NOT NULL,
		ssh_host TEXT NOT NULL,
		ssh_port INTEGER DEFAULT 22,
		author TEXT,
		status TEXT DEFAULT 'active',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_ssh_tunnels_local_port ON ssh_tunnels(local_port);
	CREATE INDEX IF NOT EXISTS idx_ssh_tunnels_status ON ssh_tunnels(status);
`);

// 업데이트 트리거 생성
db.exec(`
	CREATE TRIGGER IF NOT EXISTS update_port_descriptions_timestamp
	AFTER UPDATE ON port_descriptions
	BEGIN
		UPDATE port_descriptions SET updated_at = CURRENT_TIMESTAMP WHERE port = NEW.port;
	END;

	CREATE TRIGGER IF NOT EXISTS update_ssh_tunnels_timestamp
	AFTER UPDATE ON ssh_tunnels
	BEGIN
		UPDATE ssh_tunnels SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
	END;
`);

console.log(`[Database] SQLite database initialized at ${DB_PATH}`);

export default db;
