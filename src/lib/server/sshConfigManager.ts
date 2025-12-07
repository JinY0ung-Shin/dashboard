import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import type { SSHConfigEntry, SSHLocalForward } from '$lib/types';

const SSH_DIR = join(homedir(), '.ssh');
export const SSH_CONFIG_PATH = join(SSH_DIR, 'config');

async function readConfigFile(): Promise<string[]> {
	if (!existsSync(SSH_CONFIG_PATH)) {
		return [];
	}
	const content = await readFile(SSH_CONFIG_PATH, 'utf-8');
	return content.split(/\r?\n/);
}

function parseLocalForward(value: string): SSHLocalForward | null {
	const parts = value.trim().split(/\s+/);
	if (parts.length < 2) return null;

	const [localPart, remotePart] = parts;
	const localSegments = localPart.split(':');
	const localPort = Number(localSegments.pop());
	const localHost = localSegments.length ? localSegments.join(':') : undefined;

	const remoteSegments = remotePart.split(':');
	const remotePort = Number(remoteSegments.pop());
	const remoteHost = remoteSegments.join(':') || remotePart;

	if (!Number.isFinite(localPort) || !Number.isFinite(remotePort) || !remoteHost) {
		return null;
	}

	return {
		localHost,
		localPort,
		remoteHost,
		remotePort
	};
}

function parseEntries(lines: string[]): SSHConfigEntry[] {
	const entries: SSHConfigEntry[] = [];
	let current: SSHConfigEntry | null = null;

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;

		const [key, ...rest] = line.split(/\s+/);
		const value = rest.join(' ');
		const lowerKey = key.toLowerCase();

		if (lowerKey === 'host') {
			if (current && current.alias) {
				entries.push(current);
			}
			current = { alias: value, hostName: '' };
			continue;
		}

		if (!current) continue;

		switch (lowerKey) {
			case 'hostname':
				current.hostName = value;
				break;
			case 'user':
				current.user = value;
				break;
			case 'port': {
				const port = Number(value);
				if (Number.isFinite(port)) {
					current.port = port;
				}
				break;
			}
			case 'identityfile':
				current.identityFile = value;
				break;
			case 'proxyjump':
				current.proxyJump = value;
				break;
			case 'forwardagent':
				current.forwardAgent = value.toLowerCase() === 'yes';
				break;
			case 'localforward': {
				const forward = parseLocalForward(value);
				if (forward) {
					current.localForwards = current.localForwards || [];
					current.localForwards.push(forward);
				}
				break;
			}
			default:
				current.extras = current.extras || [];
				current.extras.push({ key, value });
		}
	}

	if (current && current.alias) {
		entries.push(current);
	}

	return entries;
}

function sanitizeEntry(entry: SSHConfigEntry): SSHConfigEntry {
	const sanitized: SSHConfigEntry = {
		alias: entry.alias.trim(),
		hostName: entry.hostName?.trim() || undefined,
		user: entry.user?.trim() || undefined,
		port: entry.port && Number.isFinite(entry.port) ? entry.port : undefined,
		identityFile: entry.identityFile?.trim() || undefined,
		proxyJump: entry.proxyJump?.trim() || undefined,
		forwardAgent: entry.forwardAgent ?? true,
		localForwards: entry.localForwards
			?.map((f) => ({
				localHost: f.localHost?.trim() || undefined,
				localPort: Number(f.localPort),
				remoteHost: f.remoteHost.trim(),
				remotePort: Number(f.remotePort)
			}))
			.filter(
				(f) => !!f.remoteHost && Number.isFinite(f.localPort) && Number.isFinite(f.remotePort)
			),
		extras: entry.extras?.map((opt) => ({ key: opt.key.trim(), value: opt.value.trim() }))
	};

	return sanitized;
}

export async function getSSHConfigAliases(): Promise<{
	path: string;
	entries: SSHConfigEntry[];
}> {
	const lines = await readConfigFile();
	const entries = parseEntries(lines).map(sanitizeEntry);
	return { entries, path: SSH_CONFIG_PATH };
}
