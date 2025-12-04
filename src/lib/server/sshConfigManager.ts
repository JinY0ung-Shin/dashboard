import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import type { SSHConfigEntry, SSHLocalForward } from '$lib/types';

const SSH_DIR = join(homedir(), '.ssh');
export const SSH_CONFIG_PATH = join(SSH_DIR, 'config');

const MANAGED_START = '# PortDash managed start';
const MANAGED_END = '# PortDash managed end';

function trimLines(lines: string[]): string[] {
	let end = lines.length - 1;
	while (end >= 0 && lines[end].trim() === '') {
		end--;
	}
	return lines.slice(0, end + 1);
}

async function ensureSSHDir() {
	if (!existsSync(SSH_DIR)) {
		await mkdir(SSH_DIR, { recursive: true });
	}
}

async function readConfigFile(): Promise<string[]> {
	if (!existsSync(SSH_CONFIG_PATH)) {
		return [];
	}
	const content = await readFile(SSH_CONFIG_PATH, 'utf-8');
	return content.split(/\r?\n/);
}

async function writeConfigFile(lines: string[]) {
	await ensureSSHDir();
	const content = `${lines.join('\n')}\n`;
	await writeFile(SSH_CONFIG_PATH, content, 'utf-8');
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

function serializeLocalForward(forward: SSHLocalForward): string {
	const localHost = forward.localHost?.trim() || '127.0.0.1';
	return `${localHost}:${forward.localPort} ${forward.remoteHost}:${forward.remotePort}`;
}

function parseManagedEntries(lines: string[]): SSHConfigEntry[] {
	const entries: SSHConfigEntry[] = [];
	let current: SSHConfigEntry | null = null;

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;

		const [key, ...rest] = line.split(/\s+/);
		const value = rest.join(' ');
		const lowerKey = key.toLowerCase();

		if (lowerKey === 'host') {
			if (current && current.alias && current.hostName) {
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

	if (current && current.alias && current.hostName) {
		entries.push(current);
	}

	return entries;
}

function serializeEntry(entry: SSHConfigEntry): string[] {
	const lines: string[] = [`Host ${entry.alias}`];
	lines.push(`  HostName ${entry.hostName}`);

	if (entry.user) lines.push(`  User ${entry.user}`);
	if (entry.port) lines.push(`  Port ${entry.port}`);
	if (entry.identityFile) lines.push(`  IdentityFile ${entry.identityFile}`);
	if (entry.proxyJump) lines.push(`  ProxyJump ${entry.proxyJump}`);
	if (entry.forwardAgent !== undefined) {
		lines.push(`  ForwardAgent ${entry.forwardAgent ? 'yes' : 'no'}`);
	}
	entry.localForwards?.forEach(forward => {
		lines.push(`  LocalForward ${serializeLocalForward(forward)}`);
	});
	entry.extras?.forEach(opt => {
		if (!opt.key || typeof opt.value === 'undefined') return;
		lines.push(`  ${opt.key} ${opt.value}`);
	});

	return lines;
}

function buildManagedBlock(entries: SSHConfigEntry[]): string[] {
	const block: string[] = [MANAGED_START];

	if (entries.length === 0) {
		block.push('# (no managed hosts yet)');
	} else {
		entries.forEach((entry, idx) => {
			block.push(...serializeEntry(entry));
			if (idx < entries.length - 1) {
				block.push('');
			}
		});
	}

	block.push(MANAGED_END);
	return block;
}

function splitSections(lines: string[]) {
	const startIndex = lines.findIndex(line => line.trim() === MANAGED_START);
	const endIndex =
		startIndex >= 0
			? lines.findIndex((line, idx) => idx > startIndex && line.trim() === MANAGED_END)
			: -1;

	if (startIndex >= 0 && endIndex > startIndex) {
		return {
			before: trimLines(lines.slice(0, startIndex)),
			managed: lines.slice(startIndex + 1, endIndex),
			after: trimLines(lines.slice(endIndex + 1))
		};
	}

	return {
		before: trimLines(lines),
		managed: [],
		after: []
	};
}

function sanitizeEntry(entry: SSHConfigEntry): SSHConfigEntry {
	const sanitized: SSHConfigEntry = {
		alias: entry.alias.trim(),
		hostName: entry.hostName.trim(),
		user: entry.user?.trim() || undefined,
		port: entry.port && Number.isFinite(entry.port) ? entry.port : undefined,
		identityFile: entry.identityFile?.trim() || undefined,
		proxyJump: entry.proxyJump?.trim() || undefined,
		forwardAgent: entry.forwardAgent ?? true,
		localForwards: entry.localForwards
			?.map(f => ({
				localHost: f.localHost?.trim() || undefined,
				localPort: Number(f.localPort),
				remoteHost: f.remoteHost.trim(),
				remotePort: Number(f.remotePort)
			}))
			.filter(
				f =>
					!!f.remoteHost &&
					Number.isFinite(f.localPort) &&
					Number.isFinite(f.remotePort)
			),
		extras: entry.extras?.map(opt => ({ key: opt.key.trim(), value: opt.value.trim() }))
	};

	return sanitized;
}

export async function getManagedSSHConfig(): Promise<{
	path: string;
	entries: SSHConfigEntry[];
}> {
	const lines = await readConfigFile();
	const { managed } = splitSections(lines);
	const entries = parseManagedEntries(managed);
	return { entries, path: SSH_CONFIG_PATH };
}

export async function saveSSHConfigEntries(entries: SSHConfigEntry[]) {
	const lines = await readConfigFile();
	const { before, after } = splitSections(lines);
	const managedBlock = buildManagedBlock(entries);

	const output: string[] = [];
	output.push(...before);
	if (output.length && managedBlock.length) {
		output.push('');
	}
	output.push(...managedBlock);
	if (after.length) {
		if (output.length && output[output.length - 1].trim() !== '') {
			output.push('');
		}
		output.push(...after);
	}

	await writeConfigFile(trimLines(output));
	return entries;
}

export async function upsertSSHConfigEntry(entry: SSHConfigEntry, previousAlias?: string) {
	const sanitized = sanitizeEntry(entry);
	const { entries } = await getManagedSSHConfig();
	const aliasKey = sanitized.alias.toLowerCase();
	const previousKey = previousAlias?.toLowerCase();

	const filtered = entries.filter(existing => {
		const key = existing.alias.toLowerCase();
		if (previousKey && key === previousKey) return false;
		return key !== aliasKey;
	});

	filtered.push(sanitized);

	await saveSSHConfigEntries(filtered);
	return filtered;
}

export async function deleteSSHConfigEntry(alias: string) {
	const { entries } = await getManagedSSHConfig();
	const key = alias.trim().toLowerCase();
	const filtered = entries.filter(entry => entry.alias.toLowerCase() !== key);
	await saveSSHConfigEntries(filtered);
	return filtered;
}
