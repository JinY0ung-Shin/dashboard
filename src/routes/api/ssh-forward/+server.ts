import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createSSHForward,
	stopSSHForward,
	listActiveForwards,
	getForwardById
} from '$lib/server/sshForwarder';
import { setPortDescription, deletePortDescription } from '$lib/server/portDescriptions';
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
			const description = `SSH Tunnel: ${config.name}`;

			try {
				setPortDescription(
					config.localPort,
					description,
					config.author
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

		// 삭제 전에 포트 번호 가져오기
		const forward = getForwardById(id);
		const localPort = forward?.localPort;

		const result = await stopSSHForward(id);

		if (result.success) {
			// 터널 삭제 시 포트 설명도 삭제
			if (localPort) {
				try {
					deletePortDescription(localPort);
				} catch (error) {
					console.error('Failed to delete port description:', error);
					// 포트 설명 삭제 실패는 무시
				}
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
