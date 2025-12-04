import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	deleteSSHConfigEntry,
	getManagedSSHConfig,
	upsertSSHConfigEntry,
	SSH_CONFIG_PATH
} from '$lib/server/sshConfigManager';
import type { SSHConfigEntry } from '$lib/types';

export const GET: RequestHandler = async () => {
	try {
		const result = await getManagedSSHConfig();
		return json({ success: true, ...result });
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { entry, previousAlias } = (await request.json()) as {
			entry: SSHConfigEntry;
			previousAlias?: string;
		};

		if (!entry?.alias || !entry?.hostName) {
			return json(
				{ success: false, error: 'Alias and HostName are required' },
				{ status: 400 }
			);
		}

		const entries = await upsertSSHConfigEntry(entry, previousAlias);

		return json({
			success: true,
			message: 'SSH config saved',
			entries,
			path: SSH_CONFIG_PATH
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { alias } = (await request.json()) as { alias?: string };

		if (!alias) {
			return json({ success: false, error: 'Alias is required' }, { status: 400 });
		}

		const entries = await deleteSSHConfigEntry(alias);
		return json({
			success: true,
			message: 'SSH config removed',
			entries,
			path: SSH_CONFIG_PATH
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
