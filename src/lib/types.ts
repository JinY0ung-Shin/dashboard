export interface PortInfo {
	port: number;
	protocol: string;
	state: 'open' | 'closed';
	service?: string;
	pid?: number;
	processName?: string;
	description?: string;
	url?: string;
}

export interface PortDescription {
	port: number;
	description: string;
	url?: string;
}

export interface SSHForwardConfig {
	id?: string;
	name: string;
	remoteHost: string;
	remotePort: number;
	localPort: number;
	localBindAddress?: string; // '127.0.0.1' (localhost only) or '0.0.0.0' (all interfaces)
	sshUser: string;
	sshHost: string;
	sshPort: number;
	status?: 'active' | 'inactive' | 'error';
	author?: string; // 터널을 등록한 사람
	portUrl?: string;
}

export interface SSHForwardResult {
	success: boolean;
	message: string;
	config?: SSHForwardConfig;
}

export interface SSHLocalForward {
	localHost?: string;
	localPort: number;
	remoteHost: string;
	remotePort: number;
}

export interface SSHConfigExtraOption {
	key: string;
	value: string;
}

export interface SSHConfigEntry {
        alias: string;
        hostName?: string;
        user?: string;
        port?: number;
        identityFile?: string;
        proxyJump?: string;
        forwardAgent?: boolean;
	localForwards?: SSHLocalForward[];
	extras?: SSHConfigExtraOption[];
}
