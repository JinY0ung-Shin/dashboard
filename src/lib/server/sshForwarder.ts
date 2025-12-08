import type { SSHForwardConfig, SSHForwardResult } from '$lib/types';
import { spawn, type ChildProcess } from 'child_process';
import { createConnection } from 'net';
import db from './db';
import { addModelToLiteLLM, deleteModelFromLiteLLM } from './litellmClient';
interface ActiveForward {
	config: SSHForwardConfig;
	process: ChildProcess;
	reconnectAttempts: number;
	isReconnecting: boolean;
}

const activeForwards = new Map<string, ActiveForward>();
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

function saveTunnel(config: SSHForwardConfig, litellmModelId?: string): void {
	const description = `SSH Tunnel: ${config.name}`;
	const bindAddress = config.localBindAddress || '127.0.0.1';
	const apiBase = `http://${bindAddress}:${config.localPort}/v1`;

	const normalizedTags = Array.isArray(config.tags)
		? config.tags.filter((tag): tag is string => Boolean(tag))
		: [];
	const tags = new Set(normalizedTags);
	if (config.litellmEnabled) {
		tags.add('llm');
	}
	const tagsJson = tags.size > 0 ? JSON.stringify([...tags]) : null;

	const stmt = db.prepare(`
		INSERT INTO ports (
			port, description, author, tags,
			ssh_tunnel_id, ssh_tunnel_name, ssh_remote_host, ssh_remote_port,
			ssh_local_bind_address, ssh_user, ssh_host, ssh_port, ssh_status,
			litellm_enabled, litellm_model_id, litellm_model_name, litellm_api_base
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(port) DO UPDATE SET
			description = excluded.description,
			author = excluded.author,
			tags = excluded.tags,
			ssh_tunnel_id = excluded.ssh_tunnel_id,
			ssh_tunnel_name = excluded.ssh_tunnel_name,
			ssh_remote_host = excluded.ssh_remote_host,
			ssh_remote_port = excluded.ssh_remote_port,
			ssh_local_bind_address = excluded.ssh_local_bind_address,
			ssh_user = excluded.ssh_user,
			ssh_host = excluded.ssh_host,
			ssh_port = excluded.ssh_port,
			ssh_status = excluded.ssh_status,
			litellm_enabled = excluded.litellm_enabled,
			litellm_model_id = excluded.litellm_model_id,
			litellm_model_name = excluded.litellm_model_name,
			litellm_api_base = excluded.litellm_api_base,
			updated_at = CURRENT_TIMESTAMP
	`);

	stmt.run(
		config.localPort,
		description,
		config.author || null,
		tagsJson,
		config.id,
		config.name,
		config.remoteHost,
		config.remotePort,
		bindAddress,
		config.sshUser,
		config.sshHost,
		config.sshPort,
		config.status || 'active',
		config.litellmEnabled ? 1 : 0,
		litellmModelId || null,
		config.litellmModelName || null,
		config.litellmEnabled ? apiBase : null
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
                                ssh_status as status,
                                tags,
                                litellm_enabled as litellmEnabled,
                                litellm_model_id as litellmModelId,
                                litellm_model_name as litellmModelName,
                                litellm_api_base as litellmApiBase
                        FROM ports
                        WHERE ssh_tunnel_id IS NOT NULL
                        ORDER BY created_at
                `);

                type SavedTunnelRow = {
                        id: string;
                        name: string;
                        remoteHost: string;
                        remotePort: number;
                        localPort: number;
                        localBindAddress?: string | null;
                        sshUser: string;
                        sshHost: string;
                        sshPort: number;
                        author?: string | null;
                        status?: 'active' | 'inactive' | 'error' | null;
                        tags?: string | null;
                        litellmEnabled?: number;
                        litellmModelId?: string | null;
                        litellmModelName?: string | null;
                        litellmApiBase?: string | null;
                };

                const tunnels = (stmt.all() as SavedTunnelRow[]).map((row) => {
                        let parsedTags: string[] | undefined;
                        if (row.tags) {
                                try {
                                        parsedTags = JSON.parse(row.tags);
                                } catch (error) {
                                        console.error('Failed to parse tunnel tags:', error);
                                }
                        }

                        return {
                                ...row,
                                tags: parsedTags,
                                litellmEnabled: Boolean(row.litellmEnabled),
                                litellmModelId: row.litellmModelId || undefined,
                                litellmModelName: row.litellmModelName || undefined,
                                litellmApiBase: row.litellmApiBase || undefined,
                                author: row.author || undefined,
                                localBindAddress: row.localBindAddress || undefined,
                                status: row.status || undefined,
                        } as SSHForwardConfig;
                });

                return tunnels;
        } catch (error) {
                console.error('Error loading SSH tunnels:', error);
                return [];
        }
}

function generateId(): string {
	return `fwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

	console.log(
		`[SSH Forward ${id}] 재연결 시도 ${forward.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`
	);

	setTimeout(async () => {
		try {
			if (!activeForwards.has(id)) {
				console.log(`[SSH Forward ${id}] 이미 중지됨, 재연결 취소`);
				return;
			}

			const result = await setupSSHConnection(id, config);
			const currentForward = activeForwards.get(id);

			if (!currentForward) return;

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
		const bindAddress = config.localBindAddress || '127.0.0.1';
		const localForward = `${bindAddress}:${config.localPort}:${config.remoteHost}:${config.remotePort}`;

		// SSH 명령 인자 구성
		const sshArgs: string[] = [
			'-N', // 원격 명령 실행 안 함 (포워딩만)
			'-L', localForward, // 로컬 포워딩
			'-o', 'ExitOnForwardFailure=yes', // 포워딩 실패 시 종료
			'-o', 'ServerAliveInterval=10', // keepalive
			'-o', 'ServerAliveCountMax=3',
			'-o', 'StrictHostKeyChecking=no',
			'-o', 'UserKnownHostsFile=/dev/null',
		];

		// 포트가 기본값(22)이 아니면 추가
		if (config.sshPort && config.sshPort !== 22) {
			sshArgs.push('-p', String(config.sshPort));
		}

		// 사용자 지정
		if (config.sshUser) {
			sshArgs.push('-l', config.sshUser);
		}

		// 호스트 추가
		sshArgs.push(config.sshHost);

		console.log(`[SSH Forward ${id}] 실행: ssh ${sshArgs.join(' ')}`);

		const sshProcess = spawn('ssh', sshArgs, {
			stdio: ['ignore', 'pipe', 'pipe'],
			detached: false,
		});

		let started = false;
		let errorOutput = '';

		// stderr에서 에러 메시지 수집
		sshProcess.stderr?.on('data', (data) => {
			const message = data.toString();
			errorOutput += message;
			console.error(`[SSH Forward ${id}] stderr:`, message.trim());
		});

		// stdout 로깅 (디버깅용)
		sshProcess.stdout?.on('data', (data) => {
			console.log(`[SSH Forward ${id}] stdout:`, data.toString().trim());
		});

		// 프로세스 종료 처리
		sshProcess.on('close', (code, signal) => {
			console.log(`[SSH Forward ${id}] 프로세스 종료 (code: ${code}, signal: ${signal})`);

			if (!started) {
				// 시작도 못하고 종료된 경우
				resolve({
					success: false,
					message: `SSH 연결 실패: ${errorOutput || `종료 코드 ${code}`}`,
				});
				return;
			}

			const forward = activeForwards.get(id);
			if (!forward) {
				console.log(`[SSH Forward ${id}] 연결 종료 (수동 중지)`);
				return;
			}

			// 재연결 시도
			if (forward.reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !forward.isReconnecting) {
				console.log(`[SSH Forward ${id}] 재연결 예정...`);
				reconnectSSHForward(id, config);
			}
		});

		sshProcess.on('error', (err) => {
			console.error(`[SSH Forward ${id}] 프로세스 에러:`, err.message);
			if (!started) {
				resolve({
					success: false,
					message: `SSH 프로세스 실행 실패: ${err.message}`,
				});
			}
		});

		// 연결 성공 확인 (포트가 열릴 때까지 대기)
		const checkPortOpen = async (): Promise<boolean> => {
			return new Promise((resolveCheck) => {
				const socket = createConnection({
					host: bindAddress,
					port: config.localPort,
					timeout: 1000,
				});

				socket.on('connect', () => {
					socket.destroy();
					resolveCheck(true);
				});
				socket.on('timeout', () => {
					socket.destroy();
					resolveCheck(false);
				});
				socket.on('error', () => {
					socket.destroy();
					resolveCheck(false);
				});
			});
		};
				// 최대 10초 동안 포트 열림 확인
		const maxAttempts = 20;
		let attempts = 0;

		const checkInterval = setInterval(async () => {
			attempts++;

			// 프로세스가 종료되었으면 중단
			if (sshProcess.exitCode !== null) {
				clearInterval(checkInterval);
				return;
			}

			const isOpen = await checkPortOpen();
			if (isOpen) {
				clearInterval(checkInterval);
				started = true;

				const updatedConfig = { ...config, id, status: 'active' as const };
				const existingForward = activeForwards.get(id);

				if (existingForward) {
					try {
						existingForward.process.kill();
					} catch (e) {
						// 무시
					}
					existingForward.process = sshProcess;
					existingForward.config = updatedConfig;
				} else {
					activeForwards.set(id, {
						config: updatedConfig,
						process: sshProcess,
						reconnectAttempts: 0,
						isReconnecting: false,
					});
				}

				const accessInfo = bindAddress === '0.0.0.0' ? '(외부 접근 가능)' : '(localhost만)';
				console.log(`[SSH Forward ${id}] 터널 시작 성공`);
				resolve({
					success: true,
					message: `SSH 포트 포워딩 시작: ${bindAddress}:${config.localPort} -> ${config.remoteHost}:${config.remotePort} ${accessInfo}`,
					config: updatedConfig,
				});
			} else if (attempts >= maxAttempts) {
				clearInterval(checkInterval);
				sshProcess.kill();
				resolve({
					success: false,
					message: `SSH 터널 시작 시간 초과: ${errorOutput || '포트가 열리지 않음'}`,
				});
			}
		}, 500);
	});
}

export async function createSSHForward(config: SSHForwardConfig): Promise<SSHForwardResult> {
	const id = config.id || generateId();
	const result = await setupSSHConnection(id, { ...config, id });

	if (result.success) {
		let litellmModelId: string | undefined;

		if (config.litellmEnabled && config.litellmModelName) {
			const bindAddress = config.localBindAddress || '127.0.0.1';
			const apiBase = `http://${bindAddress}:${config.localPort}/v1`;

			console.log(`[PortKnox LiteLLM] Registering model: ${config.litellmModelName} at ${apiBase}`);

			const litellmResult = await addModelToLiteLLM({
				model_name: config.litellmModelName,
				litellm_params: {
					model: `openai/${config.litellmModelName}`,
					api_base: apiBase,
					api_key: config.litellmApiKey || 'dummy',
				},
			});

			if (litellmResult.success && litellmResult.model) {
				litellmModelId = litellmResult.model.model_info?.id || litellmResult.model.model_name;
				console.log(`[PortKnox LiteLLM] Model registered successfully: ${litellmModelId}`);
			} else {
				console.error(`[PortKnox LiteLLM] Failed to register model: ${litellmResult.error}`);
			}
		}

		saveTunnel(result.config!, litellmModelId);
	}

	return result;
}

export async function stopSSHForward(id: string): Promise<SSHForwardResult> {
	const forward = activeForwards.get(id);

	if (!forward) {
		return {
			success: false,
			message: '해당 포워딩을 찾을 수 없습니다',
		};
	}

	try {
		// LiteLLM에서 모델 삭제
		const dbData = db
			.prepare(
				`
			SELECT litellm_enabled, litellm_model_id, litellm_model_name, port
			FROM ports
			WHERE ssh_tunnel_id = ?
		`
			)
			.get(id) as
			| {
					litellm_enabled: number;
					litellm_model_id: string | null;
					litellm_model_name: string | null;
					port: number;
			  }
			| undefined;

		console.log(`[PortKnox SSH] Stopping tunnel ${id}, LiteLLM data:`, dbData);

		if (dbData?.litellm_enabled && dbData.litellm_model_id) {
			try {
				console.log(
					`[PortKnox LiteLLM] Deleting model: ${dbData.litellm_model_id} (${dbData.litellm_model_name}) from port ${dbData.port}`
				);
				const litellmResult = await deleteModelFromLiteLLM(dbData.litellm_model_id);
				if (litellmResult.success) {
					console.log(`[PortKnox LiteLLM] Model deleted successfully from LiteLLM`);
				} else {
					console.error(
						`[PortKnox LiteLLM] Failed to delete model from LiteLLM: ${litellmResult.error}`
					);
				}
			} catch (error) {
				console.error(`[PortKnox LiteLLM] Exception while deleting model:`, error);
			}
		}

		// 재연결 방지
		forward.isReconnecting = true;
		forward.reconnectAttempts = MAX_RECONNECT_ATTEMPTS;

		// Map에서 먼저 제거
		activeForwards.delete(id);

		// 프로세스 종료
		try {
			forward.process.kill('SIGTERM');
			
			// 1초 후에도 안 죽으면 강제 종료
			setTimeout(() => {
				try {
					forward.process.kill('SIGKILL');
				} catch (e) {
					// 이미 종료됨
				}
			}, 1000);
		} catch (e) {
			console.error(`[SSH Forward ${id}] 프로세스 종료 실패:`, e);
		}

		deleteTunnel(id);

		console.log(`[SSH Forward ${id}] 터널 중지 완료`);

		return {
			success: true,
			message: '포트 포워딩이 중지되었습니다',
		};
	} catch (error) {
		console.error(`[SSH Forward ${id}] 중지 실패:`, error);
		return {
			success: false,
			message: `포워딩 중지 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
		};
	}
}

export function listActiveForwards(): SSHForwardConfig[] {
	return Array.from(activeForwards.values()).map((forward) => {
		try {
			const dbData = db
				.prepare(
					`
				SELECT description, author
				FROM ports
				WHERE ssh_tunnel_id = ?
			`
				)
				.get(forward.config.id) as { description: string; author: string | null } | undefined;

			if (dbData) {
				return {
					...forward.config,
					author: dbData.author || undefined,
				};
			}
		} catch (error) {
			console.error(`Failed to fetch latest data for tunnel ${forward.config.id}:`, error);
		}

		return forward.config;
	});
}

export function getForwardById(id: string): SSHForwardConfig | undefined {
	const forward = activeForwards.get(id);
	if (!forward) return undefined;

	try {
		const dbData = db
			.prepare(
				`
			SELECT description, author
			FROM ports
			WHERE ssh_tunnel_id = ?
		`
			)
			.get(id) as { description: string; author: string | null } | undefined;

		if (dbData) {
			return {
				...forward.config,
				author: dbData.author || undefined,
			};
		}
	} catch (error) {
		console.error(`Failed to fetch latest data for tunnel ${id}:`, error);
	}

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

                const MAX_RESTORE_ATTEMPTS = 3;
                const RESTORE_RETRY_DELAY = 2000;

                for (const config of savedTunnels) {
                        let attempt = 0;
                        let restored = false;

                        while (attempt < MAX_RESTORE_ATTEMPTS && !restored) {
                                attempt++;
                                try {
                                        const result = await setupSSHConnection(config.id!, config);
                                        if (result.success) {
                                                console.log(`[PortKnox SSH] 터널 복원 성공: ${config.name}`);
                                                saveTunnel(result.config!);
                                                restored = true;
                                        } else {
                                                console.error(
                                                        `[PortKnox SSH] 터널 복원 실패 (시도 ${attempt}/${MAX_RESTORE_ATTEMPTS}): ${config.name} - ${result.message}`
                                                );
                                                if (attempt < MAX_RESTORE_ATTEMPTS) {
                                                        await new Promise((resolve) => setTimeout(resolve, RESTORE_RETRY_DELAY));
                                                }
                                        }
                                } catch (error) {
                                        console.error(
                                                `[PortKnox SSH] 터널 복원 중 예외 발생 (시도 ${attempt}/${MAX_RESTORE_ATTEMPTS}): ${config.name}`,
                                                error
                                        );
                                        if (attempt < MAX_RESTORE_ATTEMPTS) {
                                                await new Promise((resolve) => setTimeout(resolve, RESTORE_RETRY_DELAY));
                                        }
                                }
                        }

                        if (!restored) {
                                console.error(`[PortKnox SSH] 터널 복원 실패 (최대 시도 초과): ${config.name}`);
                        }

                        await new Promise((resolve) => setTimeout(resolve, 500));
                }

		console.log(`[PortKnox SSH] 터널 복원 완료`);
	} catch (error) {
		console.error('[PortKnox SSH] 터널 복원 프로세스 오류:', error);
	}
}