import { exec } from 'child_process';
import { promisify } from 'util';
import type { PortInfo } from '$lib/types';

const execAsync = promisify(exec);

export async function scanPorts(): Promise<PortInfo[]> {
	const ports: PortInfo[] = [];

	try {
		// Windows: netstat 사용
		if (process.platform === 'win32') {
			const { stdout } = await execAsync('netstat -ano');
			const lines = stdout.split('\n');

			for (const line of lines) {
				const match = line.match(/^\s*(TCP|UDP)\s+(\S+):(\d+)\s+\S+\s+(\w+)\s+(\d+)?/);
				if (match) {
					const [, protocol, , port, state, pid] = match;
					const portNum = parseInt(port);

					if (!isNaN(portNum) && state === 'LISTENING') {
						ports.push({
							port: portNum,
							protocol: protocol.toLowerCase(),
							state: 'open',
							pid: pid ? parseInt(pid) : undefined
						});
					}
				}
			}
		} else {
			// Linux/Mac: ss 사용 (Ubuntu 포함)
			try {
				// ss -tulpn: 모든 TCP/UDP listening 포트와 프로세스 정보 표시
				const { stdout } = await execAsync('ss -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null');
				const lines = stdout.split('\n');

				for (const line of lines) {
					// ss 출력 파싱: tcp   LISTEN 0      128    0.0.0.0:22    0.0.0.0:*    users:(("sshd",pid=1234,fd=3))
					const ssMatch = line.match(
						/(tcp|udp)\s+\S+\s+\S+\s+\S+\s+(?:\S+:)?(\d+)\s+.*?(?:users:\(\("([^"]+)",pid=(\d+))?/i
					);

					if (ssMatch) {
						const [, protocol, port, processName, pid] = ssMatch;
						const portNum = parseInt(port);

						if (!isNaN(portNum)) {
							ports.push({
								port: portNum,
								protocol: protocol.toLowerCase(),
								state: 'open',
								processName: processName || undefined,
								pid: pid ? parseInt(pid) : undefined
							});
						}
					} else {
						// netstat 출력 파싱 (fallback)
						const netstatMatch = line.match(
							/(tcp|udp)\s+\S+\s+\S+\s+(?:\S+:)?(\d+)\s+.*?(\d+)\/(\S+)/
						);
						if (netstatMatch) {
							const [, protocol, port, pid, processName] = netstatMatch;
							const portNum = parseInt(port);

							if (!isNaN(portNum)) {
								ports.push({
									port: portNum,
									protocol: protocol.toLowerCase(),
									state: 'open',
									processName: processName || undefined,
									pid: pid ? parseInt(pid) : undefined
								});
							}
						}
					}
				}
			} catch (e) {
				console.error('Error scanning ports on Linux/Mac:', e);
			}
		}
	} catch (error) {
		console.error('Error scanning ports:', error);
	}

	// 중복 제거 및 정렬
	const uniquePorts = Array.from(new Map(ports.map((p) => [p.port, p])).values()).sort(
		(a, b) => a.port - b.port
	);

	return uniquePorts;
}

export async function findAvailablePort(
	startPort: number = 3000,
	endPort: number = 65535
): Promise<number> {
	const usedPorts = await scanPorts();
	const usedPortNumbers = new Set(usedPorts.map((p) => p.port));

	for (let port = startPort; port <= endPort; port++) {
		if (!usedPortNumbers.has(port)) {
			return port;
		}
	}

	throw new Error('No available ports found');
}
