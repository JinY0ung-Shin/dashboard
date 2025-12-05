import { Client } from 'ssh2';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { SSHForwardConfig, SSHForwardResult } from '$lib/types';

interface ActiveForward {
	config: SSHForwardConfig;
	client: Client;
	server: any;
}

const activeForwards = new Map<string, ActiveForward>();

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

export async function createSSHForward(config: SSHForwardConfig): Promise<SSHForwardResult> {
	return new Promise((resolve) => {
		const id = config.id || generateId();
		const client = new Client();

		client.on('ready', () => {
			// SSH 연결 성공
			client.forwardIn('127.0.0.1', config.localPort, (err, port) => {
				if (err) {
					client.end();
					resolve({
						success: false,
						message: `포트 포워딩 설정 실패: ${err.message}`
					});
					return;
				}

				const updatedConfig = { ...config, id, status: 'active' as const };
				activeForwards.set(id, { config: updatedConfig, client, server: port });

				resolve({
					success: true,
					message: `SSH 포트 포워딩 시작: ${config.localPort} -> ${config.remoteHost}:${config.remotePort}`,
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
			activeForwards.delete(id);
			resolve({
				success: false,
				message: `SSH 연결 오류: ${err.message}`
			});
		});

		// SSH 연결 시작
		try {
			const privateKey = findSSHKey();
			const connectOptions: any = {
				host: config.sshHost,
				port: config.sshPort,
				username: config.sshUser,
				tryKeyboard: true,
				readyTimeout: 10000
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

export function stopSSHForward(id: string): SSHForwardResult {
	const forward = activeForwards.get(id);

	if (!forward) {
		return {
			success: false,
			message: '해당 포워딩을 찾을 수 없습니다'
		};
	}

	try {
		forward.client.end();
		activeForwards.delete(id);

		return {
			success: true,
			message: '포트 포워딩이 중지되었습니다'
		};
	} catch (error) {
		return {
			success: false,
			message: `포워딩 중지 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		};
	}
}

export function listActiveForwards(): SSHForwardConfig[] {
	return Array.from(activeForwards.values()).map(f => f.config);
}

export function getForwardById(id: string): SSHForwardConfig | undefined {
	return activeForwards.get(id)?.config;
}
