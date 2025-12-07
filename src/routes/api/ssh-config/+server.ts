import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSSHConfigAliases, SSH_CONFIG_PATH } from '$lib/server/sshConfigManager';

export const GET: RequestHandler = async () => {
	try {
		const result = await getSSHConfigAliases();
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
