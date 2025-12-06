import { readFileSync, existsSync, renameSync } from 'fs';
import { join } from 'path';
import db from './db';

const DATA_DIR = join(process.cwd(), 'data');
const PORT_DESCRIPTIONS_FILE = join(DATA_DIR, 'port-descriptions.json');
const SSH_TUNNELS_FILE = join(DATA_DIR, 'ssh-tunnels.json');

interface PortDescriptionJSON {
	port: number;
	description: string;
	author?: string;
	url?: string; // 이전 버전 호환
}

interface SSHTunnelJSON {
	id: string;
	name: string;
	remoteHost: string;
	remotePort: number;
	localPort: number;
	localBindAddress?: string;
	sshUser: string;
	sshHost: string;
	sshPort: number;
	author?: string;
	status?: string;
}

export function migrateJSONToSQLite(): void {
	let migrated = false;

	// 1. Port Descriptions 마이그레이션
	if (existsSync(PORT_DESCRIPTIONS_FILE)) {
		try {
			console.log('[Migration] Migrating port descriptions from JSON to SQLite...');
			const data = readFileSync(PORT_DESCRIPTIONS_FILE, 'utf-8');

			if (data && data.trim()) {
				const descriptions: PortDescriptionJSON[] = JSON.parse(data);

				const insertStmt = db.prepare(`
					INSERT INTO port_descriptions (port, description, author)
					VALUES (?, ?, ?)
					ON CONFLICT(port) DO UPDATE SET
						description = excluded.description,
						author = excluded.author
				`);

				const transaction = db.transaction((items: PortDescriptionJSON[]) => {
					for (const item of items) {
						insertStmt.run(item.port, item.description, item.author || null);
					}
				});

				transaction(descriptions);
				console.log(`[Migration] Migrated ${descriptions.length} port descriptions`);

				// JSON 파일을 백업으로 이름 변경
				renameSync(PORT_DESCRIPTIONS_FILE, `${PORT_DESCRIPTIONS_FILE}.backup`);
				migrated = true;
			}
		} catch (error) {
			console.error('[Migration] Failed to migrate port descriptions:', error);
		}
	}

	// 2. SSH Tunnels 마이그레이션
	if (existsSync(SSH_TUNNELS_FILE)) {
		try {
			console.log('[Migration] Migrating SSH tunnels from JSON to SQLite...');
			const data = readFileSync(SSH_TUNNELS_FILE, 'utf-8');

			if (data && data.trim()) {
				const tunnels: SSHTunnelJSON[] = JSON.parse(data);

				const insertStmt = db.prepare(`
					INSERT INTO ssh_tunnels (
						id, name, remote_host, remote_port, local_port,
						local_bind_address, ssh_user, ssh_host, ssh_port, author, status
					)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(id) DO UPDATE SET
						name = excluded.name,
						remote_host = excluded.remote_host,
						remote_port = excluded.remote_port,
						local_port = excluded.local_port,
						local_bind_address = excluded.local_bind_address,
						ssh_user = excluded.ssh_user,
						ssh_host = excluded.ssh_host,
						ssh_port = excluded.ssh_port,
						author = excluded.author,
						status = excluded.status
				`);

				const transaction = db.transaction((items: SSHTunnelJSON[]) => {
					for (const item of items) {
						insertStmt.run(
							item.id,
							item.name,
							item.remoteHost,
							item.remotePort,
							item.localPort,
							item.localBindAddress || '127.0.0.1',
							item.sshUser,
							item.sshHost,
							item.sshPort,
							item.author || null,
							item.status || 'active'
						);
					}
				});

				transaction(tunnels);
				console.log(`[Migration] Migrated ${tunnels.length} SSH tunnels`);

				// JSON 파일을 백업으로 이름 변경
				renameSync(SSH_TUNNELS_FILE, `${SSH_TUNNELS_FILE}.backup`);
				migrated = true;
			}
		} catch (error) {
			console.error('[Migration] Failed to migrate SSH tunnels:', error);
		}
	}

	if (migrated) {
		console.log('[Migration] Migration completed successfully!');
		console.log('[Migration] Original JSON files have been renamed to .backup');
	} else {
		console.log('[Migration] No JSON files found to migrate');
	}
}
