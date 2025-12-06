import db from './db';
import type { PortDescription } from '$lib/types';

export function getPortDescription(port: number): PortDescription | undefined {
	const stmt = db.prepare('SELECT port, description, author FROM port_descriptions WHERE port = ?');
	const row = stmt.get(port) as PortDescription | undefined;
	return row;
}

export function getAllPortDescriptions(): PortDescription[] {
	const stmt = db.prepare('SELECT port, description, author FROM port_descriptions ORDER BY port');
	const rows = stmt.all() as PortDescription[];
	return rows;
}

export function setPortDescription(port: number, description: string, author?: string): void {
	const stmt = db.prepare(`
		INSERT INTO port_descriptions (port, description, author)
		VALUES (?, ?, ?)
		ON CONFLICT(port) DO UPDATE SET
			description = excluded.description,
			author = excluded.author,
			updated_at = CURRENT_TIMESTAMP
	`);

	stmt.run(port, description, author || null);
}

export function deletePortDescription(port: number): void {
	const stmt = db.prepare('DELETE FROM port_descriptions WHERE port = ?');
	stmt.run(port);
}
