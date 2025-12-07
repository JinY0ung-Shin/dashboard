import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { scanPorts, findAvailablePort } from '$lib/server/portScanner';
import { getAllPortDescriptions } from '$lib/server/portDescriptions';

export const GET: RequestHandler = async () => {
	try {
		const ports = await scanPorts();
		const descriptions = getAllPortDescriptions();
		const descriptionMap = new Map(descriptions.map(d => [d.port, d]));

		// 포트 정보에 저장된 설명 병합
		const portsWithDescriptions = ports.map(port => {
			const desc = descriptionMap.get(port.port);
			return {
				...port,
				description: desc?.description,
				author: desc?.author,
				tags: desc?.tags
			};
		});

		return json({ success: true, ports: portsWithDescriptions });
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
		const { action, startPort, endPort } = await request.json();

		if (action === 'find-available') {
			const port = await findAvailablePort(startPort, endPort);
			return json({ success: true, port });
		}

		return json({ success: false, error: 'Invalid action' }, { status: 400 });
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
