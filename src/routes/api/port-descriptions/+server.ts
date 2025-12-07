import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getAllPortDescriptions,
	setPortDescription,
	deletePortDescription
} from '$lib/server/portDescriptions';

export const GET: RequestHandler = async () => {
	try {
		const descriptions = getAllPortDescriptions();
		return json({ success: true, descriptions });
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
		const { port, description, author, tags } = await request.json();

		if (!port || typeof port !== 'number') {
			return json({ success: false, error: 'Invalid port number' }, { status: 400 });
		}

		setPortDescription(port, description || '', author, tags);
		return json({ success: true, message: 'Port description saved' });
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
		const { port } = await request.json();

		if (!port || typeof port !== 'number') {
			return json({ success: false, error: 'Invalid port number' }, { status: 400 });
		}

		deletePortDescription(port);
		return json({ success: true, message: 'Port description deleted' });
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
