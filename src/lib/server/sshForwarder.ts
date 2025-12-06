import { Client } from 'ssh2';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import db from './db';
import type { SSHForwardConfig, SSHForwardResult } from '$lib/types';

interface ActiveForward {
	config: SSHForwardConfig;
	client: Client;
	server: any;
	reconnectAttempts: number;
	isReconnecting: boolean;
}

const activeForwards = new Map<string, ActiveForward>();
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3초

function saveTunnel(config: SSHForwardConfig): void {
	const description = `SSH Tunnel: ${config.name}`;

	const stmt = db.prepare(`
		INSERT INTO ports (
			port, description, author,
			ssh_tunnel_id, ssh_tunnel_name, ssh_remote_host, ssh_remote_port,
			ssh_local_bind_address, ssh_user, ssh_host, ssh_port, ssh_status
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(port) DO UPDATE SET
			description = excluded.description,
			author = excluded.author,
			ssh_tunnel_id = excluded.ssh_tunnel_id,
			ssh_tunnel_name = excluded.ssh_tunnel_name,
			ssh_remote_host = excluded.ssh_remote_host,
			ssh_remote_port = excluded.ssh_remote_port,
			ssh_local_bind_address = excluded.ssh_local_bind_address,
			ssh_user = excluded.ssh_user,
			ssh_host = excluded.ssh_host,
			ssh_port = excluded.ssh_port,
			ssh_status = excluded.ssh_status,
			updated_at = CURRENT_TIMESTAMP
	`);

	stmt.run(
		config.localPort,
		description,
		config.author || null,
		config.id,
		config.name,
		config.remoteHost,
		config.remotePort,
		config.localBindAddress || '127.0.0.1',
		config.sshUser,
		config.sshHost,
		config.sshPort,
		config.status || 'active'
	);
}

function deleteTunnel(id: string): void {
	const stmt = db.prepare('DELETE FROM ports WHERE ssh_tunnel_id = ?');
	stmt.run(id);
}

function loadSavedTunnels(): SSHForwardConfig[] {
	try {
		const stmt = db.prepare(`
			SELECT
				ssh_tunnel_id as id,
				ssh_tunnel_name as name,
				ssh_remote_host as remoteHost,
				ssh_remote_port as remotePort,
				port as localPort,
				ssh_local_bind_address as localBindAddress,
				ssh_user as sshUser,
				ssh_host as sshHost,
				ssh_port as sshPort,
				author,
				ssh_status as status
			FROM ports
			WHERE ssh_tunnel_id IS NOT NULL
			ORDER BY created_at
		`);

		const tunnels = stmt.all() as SSHForwardConfig[];
		return tunnels;
	} catch (error) {
		console.error('Error loading SSH tunnels:', error);
		return [];
	}
}

function generateId(): string {
	return `fwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function findSSHKey(): Buffer | undefined {
	const sshDir = join(homedir(), '.ssh');
	const keyFiles = [
		'id_ed25519',
		'id_rsa',
		'id_ecdsa',
		'id_dsa'
	];

	for (const keyFile of keyFiles) {
		const keyPath = join(sshDir, keyFile);
		if (existsSync(keyPath)) {
			try {
				return readFileSync(keyPath);
			} catch (error) {
				console.error(`Failed to read SSH key ${keyPath}:`, error);
			}
		}
	}

	return undefined;
}

async function reconnectSSHForward(id: string, config: SSHForwardConfig): Promise<void> {
	const forward = activeForwards.get(id);
	if (!forward || forward.isReconnecting) return;

	if (forward.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
		console.error(`[SSH Forward ${id}] 최대 재연결 시도 횟수 초과`);
		forward.config.status = 'error';
		saveTunnel(forward.config);
		return;
	}

	forward.isReconnecting = true;
	forward.reconnectAttempts += 1;
	forward.config.status = 'inactive';

	console.log(`[SSH Forward ${id}] 재연결 시도 ${forward.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);

	setTimeout(async () => {
		try {
			// Map에서 제거되었는지 확인 (수동으로 stop된 경우)
			if (!activeForwards.has(id)) {
				console.log(`[SSH Forward ${id}] 이미 중지됨, 재연결 취소`);
				return;
			}

			const result = await setupSSHConnection(id, config);
			const currentForward = activeForwards.get(id);

			if (!currentForward) return; // 재연결 도중 삭제됨

			if (result.success) {
				currentForward.reconnectAttempts = 0;
				currentForward.isReconnecting = false;
				console.log(`[SSH Forward ${id}] 재연결 성공`);
				saveTunnel(currentForward.config);
			} else {
				currentForward.isReconnecting = false;
				await reconnectSSHForward(id, config);
			}
		} catch (error) {
			const currentForward = activeForwards.get(id);
			if (currentForward) {
				currentForward.isReconnecting = false;
				await reconnectSSHForward(id, config);
			}
		}
	}, RECONNECT_DELAY);
}

async function setupSSHConnection(id: string, config: SSHForwardConfig): Promise<SSHForwardResult> {
	return new Promise((resolve) => {
		const client = new Client();

		client.on('ready', () => {
			// SSH 연결 성공
			const bindAddress = config.localBindAddress || '127.0.0.1';
			client.forwardIn(bindAddress, config.localPort, (err, port) => {
				if (err) {
					client.end();
					resolve({
						success: false,
						message: `포트 포워딩 설정 실패: ${err.message}`
					});
					return;
				}

				const updatedConfig = { ...config, id, status: 'active' as const };
				const existingForward = activeForwards.get(id);

				if (existingForward) {
					// 기존 클라이언트 종료
					try {
						existingForward.client.end();
					} catch (e) {
						// 무시
					}
					existingForward.client = client;
					existingForward.server = port;
					existingForward.config = updatedConfig;
				} else {
					activeForwards.set(id, {
						config: updatedConfig,
						client,
						server: port,
						reconnectAttempts: 0,
						isReconnecting: false
					});
				}

				const accessInfo = bindAddress === '0.0.0.0' ? '(외부 접근 가능)' : '(localhost만)';
				resolve({
					success: true,
					message: `SSH 포트 포워딩 시작: ${bindAddress}:${config.localPort} -> ${config.remoteHost}:${config.remotePort} ${accessInfo}`,
					config: updatedConfig
				});
			});
		});

		client.on('tcp connection', (info, accept) => {
			// 로컬 포트로 들어온 연결을 원격 서버로 포워딩
			const stream = accept();

			client.forwardOut(
				info.srcIP,
				info.srcPort,
				config.remoteHost,
				config.remotePort,
				(err, upstream) => {
					if (err) {
						stream.end();
						return;
					}
					stream.pipe(upstream).pipe(stream);
				}
			);
		});

		client.on('error', (err) => {
			console.error(`[SSH Forward ${id}] 연결 오류:`, err.message);
			// activeForwards에 아직 없으면 초기 연결 실패
			if (!activeForwards.has(id)) {
				resolve({
					success: false,
					message: `SSH 연결 오류: ${err.message}`
				});
			}
			// 이미 연결된 경우는 재연결 로직이 처리함
		});

		client.on('close', (hadError) => {
			const forward = activeForwards.get(id);
			// Map에서 삭제되었으면 수동으로 중지한 것이므로 재연결 안 함
			if (!forward) {
				console.log(`[SSH Forward ${id}] 연결 종료 (수동 중지)`);
				return;
			}

			console.log(`[SSH Forward ${id}] 연결 종료 (에러: ${hadError})`);

			// 최대 재시도 횟수를 초과하지 않았으면 재연결 시도
			if (forward.reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !forward.isReconnecting) {
				console.log(`[SSH Forward ${id}] 재연결 예정...`);
				reconnectSSHForward(id, config);
			}
		});

		client.on('end', () => {
			console.log(`[SSH Forward ${id}] 연결 끊김`);
		});

		// SSH 연결 시작
		try {
			const privateKey = findSSHKey();
			const connectOptions: any = {
				host: config.sshHost,
				port: config.sshPort,
				username: config.sshUser,
				tryKeyboard: true,
				readyTimeout: 10000,
				keepaliveInterval: 10000, // 10초마다 keepalive
				keepaliveCountMax: 3
			};

			// SSH agent 사용 (Windows의 경우 pageant, Unix의 경우 SSH_AUTH_SOCK)
			if (process.env.SSH_AUTH_SOCK) {
				connectOptions.agent = process.env.SSH_AUTH_SOCK;
			} else if (process.platform === 'win32') {
				// Windows에서 pageant 사용 시도
				connectOptions.agent = 'pageant';
			}

			// SSH 키 파일이 있으면 추가
			if (privateKey) {
				connectOptions.privateKey = privateKey;
			}

			client.connect(connectOptions);
		} catch (error) {
			resolve({
				success: false,
				message: `SSH 연결 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
			});
		}
	});
}

export async function createSSHForward(config: SSHForwardConfig): Promise<SSHForwardResult> {
	const id = config.id || generateId();
	const result = await setupSSHConnection(id, { ...config, id });

	if (result.success) {
		saveTunnel(result.config!);
	}

	return result;
}

export async function stopSSHForward(id: string): Promise<SSHForwardResult> {
	const forward = activeForwards.get(id);

	if (!forward) {
		return {
			success: false,
			message: '해당 포워딩을 찾을 수 없습니다'
		};
	}

	try {
		// 재연결 방지
		forward.isReconnecting = true;
		forward.reconnectAttempts = MAX_RECONNECT_ATTEMPTS;

		// Map에서 먼저 제거 (close 이벤트에서 재연결 시도 방지)
		activeForwards.delete(id);

		// 모든 이벤트 리스너 제거
		forward.client.removeAllListeners();

		// 에러 이벤트만 다시 추가 (연결 종료 시 발생하는 에러 무시)
		forward.client.on('error', (err) => {
			// 종료 중 발생하는 에러는 로그만 남기고 무시
			console.log(`[SSH Forward ${id}] 종료 중 에러 무시:`, err.message);
		});

		// 연결 종료
		forward.client.end();

		// 강제 종료
		setTimeout(() => {
			try {
				forward.client.destroy();
			} catch (e) {
				// 무시
			}
		}, 1000);

		deleteTunnel(id);

		console.log(`[SSH Forward ${id}] 터널 중지 완료`);

		return {
			success: true,
			message: '포트 포워딩이 중지되었습니다'
		};
	} catch (error) {
		console.error(`[SSH Forward ${id}] 중지 실패:`, error);
		return {
			success: false,
			message: `포워딩 중지 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		};
	}
}

export function listActiveForwards(): SSHForwardConfig[] {
	// 메모리의 활성 터널 정보에 DB의 최신 author/description 병합
	return Array.from(activeForwards.values()).map(forward => {
		try {
			// DB에서 최신 정보 가져오기
			const dbData = db.prepare(`
				SELECT description, author
				FROM ports
				WHERE ssh_tunnel_id = ?
			`).get(forward.config.id) as { description: string; author: string | null } | undefined;

			if (dbData) {
				// DB의 최신 author로 업데이트
				return {
					...forward.config,
					author: dbData.author || undefined
				};
			}
		} catch (error) {
			console.error(`Failed to fetch latest data for tunnel ${forward.config.id}:`, error);
		}

		// DB 조회 실패 시 메모리 데이터 반환
		return forward.config;
	});
}

export function getForwardById(id: string): SSHForwardConfig | undefined {
	const forward = activeForwards.get(id);
	if (!forward) return undefined;

	try {
		// DB에서 최신 정보 가져오기
		const dbData = db.prepare(`
			SELECT description, author
			FROM ports
			WHERE ssh_tunnel_id = ?
		`).get(id) as { description: string; author: string | null } | undefined;

		if (dbData) {
			// DB의 최신 author로 업데이트
			return {
				...forward.config,
				author: dbData.author || undefined
			};
		}
	} catch (error) {
		console.error(`Failed to fetch latest data for tunnel ${id}:`, error);
	}

	// DB 조회 실패 시 메모리 데이터 반환
	return forward.config;
}

export async function restoreSavedTunnels(): Promise<void> {
	try {
		const savedTunnels = loadSavedTunnels();
		console.log(`[PortKnox SSH] 저장된 터널 ${savedTunnels.length}개 복원 중...`);

		if (savedTunnels.length === 0) {
			console.log(`[PortKnox SSH] 복원할 터널이 없습니다`);
			return;
		}

		for (const config of savedTunnels) {
			try {
				// 각 터널 복원 시도
				const result = await setupSSHConnection(config.id!, config);
				if (result.success) {
					console.log(`[PortKnox SSH] 터널 복원 성공: ${config.name}`);
					saveTunnel(result.config!);
				} else {
					console.error(`[PortKnox SSH] 터널 복원 실패: ${config.name} - ${result.message}`);
					// 복원 실패한 터널은 재연결 시도할 수 있도록 상태 유지
				}
			} catch (error) {
				console.error(`[PortKnox SSH] 터널 복원 중 예외 발생: ${config.name}`, error);
			}

			// 각 복원 사이에 약간의 지연 (동시 연결 제한)
			await new Promise(resolve => setTimeout(resolve, 500));
		}

		console.log(`[PortKnox SSH] 터널 복원 완료`);
	} catch (error) {
		console.error('[PortKnox SSH] 터널 복원 프로세스 오류:', error);
	}
}
