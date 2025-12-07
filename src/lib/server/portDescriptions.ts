import db from './db';
import type { PortDescription } from '$lib/types';

export function getPortDescription(port: number): PortDescription | undefined {
	const stmt = db.prepare('SELECT port, description, author, tags FROM ports WHERE port = ?');
	const row = stmt.get(port) as any;
	if (!row) return undefined;

	return {
		port: row.port,
		description: row.description,
		author: row.author,
		tags: row.tags ? JSON.parse(row.tags) : undefined
	};
}

export function getAllPortDescriptions(): PortDescription[] {
	const stmt = db.prepare('SELECT port, description, author, tags FROM ports ORDER BY port');
	const rows = stmt.all() as any[];

	return rows.map(row => ({
		port: row.port,
		description: row.description,
		author: row.author,
		tags: row.tags ? JSON.parse(row.tags) : undefined
	}));
}

export function setPortDescription(port: number, description: string, author?: string, tags?: string[]): void {
	const stmt = db.prepare(`
		INSERT INTO ports (port, description, author, tags)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(port) DO UPDATE SET
			description = excluded.description,
			author = excluded.author,
			tags = excluded.tags,
			updated_at = CURRENT_TIMESTAMP
	`);

	const tagsJson = tags && tags.length > 0 ? JSON.stringify(tags) : null;
	stmt.run(port, description, author || null, tagsJson);
}

export function deletePortDescription(port: number): void {
	const stmt = db.prepare('DELETE FROM ports WHERE port = ? AND ssh_tunnel_id IS NULL');
	stmt.run(port);
}
