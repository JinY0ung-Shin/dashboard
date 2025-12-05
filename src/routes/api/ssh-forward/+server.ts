import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createSSHForward,
	stopSSHForward,
	listActiveForwards
} from '$lib/server/sshForwarder';
import { setPortDescription } from '$lib/server/portDescriptions';
import type { SSHForwardConfig } from '$lib/types';

export const GET: RequestHandler = async () => {
	try {
		const forwards = listActiveForwards();
		return json({ success: true, forwards });
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
		const config: SSHForwardConfig = await request.json();
		const result = await createSSHForward(config);

		if (result.success) {
			// SSH 포워딩 성공 시, 포트 설명 자동 생성 및 저장
			const description = config.portDescription ||
				`SSH Tunnel: ${config.name} (${config.remoteHost}:${config.remotePort})`;

			try {
				await setPortDescription(
					config.localPort,
					description,
					config.portUrl
				);
			} catch (error) {
				console.error('Failed to save port description:', error);
				// 포트 설명 저장 실패는 무시 (포워딩은 성공했으므로)
			}

			return json(result);
		} else {
			return json(result, { status: 400 });
		}
	} catch (error) {
		return json(
			{
				success: false,
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { id } = await request.json();
		const result = stopSSHForward(id);

		if (result.success) {
			return json(result);
		} else {
			return json(result, { status: 400 });
		}
	} catch (error) {
		return json(
			{
				success: false,
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
