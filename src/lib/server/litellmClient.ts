import type { LiteLLMAddModelRequest, LiteLLMModel, LiteLLMDeleteModelRequest } from '$lib/types';

// LiteLLM 서버 설정
const LITELLM_BASE_URL = process.env.LITELLM_BASE_URL || 'http://localhost:4000';
const LITELLM_API_KEY = process.env.LITELLM_MASTER_KEY || 'sk-1234';

/**
 * LiteLLM에 새 모델 추가
 */
export async function addModelToLiteLLM(
	request: LiteLLMAddModelRequest
): Promise<{ success: boolean; model?: LiteLLMModel; error?: string }> {
	try {
		console.log(`[PortKnox LiteLLM] Adding model: ${request.model_name}`);

		const response = await fetch(`${LITELLM_BASE_URL}/model/new`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${LITELLM_API_KEY}`
			},
			body: JSON.stringify(request)
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`[PortKnox LiteLLM] Failed to add model: ${errorText}`);
			return {
				success: false,
				error: `Failed to add model: ${response.status} ${errorText}`
			};
		}

		const model = (await response.json()) as LiteLLMModel;
		console.log(`[PortKnox LiteLLM] Model added successfully:`, model);

		return {
			success: true,
			model
		};
	} catch (error) {
		console.error('[PortKnox LiteLLM] Error adding model:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * LiteLLM에서 모델 삭제
 */
export async function deleteModelFromLiteLLM(
	modelId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		console.log(`[PortKnox LiteLLM] Deleting model: ${modelId}`);

		const response = await fetch(`${LITELLM_BASE_URL}/model/delete`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${LITELLM_API_KEY}`
			},
			body: JSON.stringify({ id: modelId } as LiteLLMDeleteModelRequest)
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`[PortKnox LiteLLM] Failed to delete model: ${errorText}`);
			return {
				success: false,
				error: `Failed to delete model: ${response.status} ${errorText}`
			};
		}

		console.log(`[PortKnox LiteLLM] Model deleted successfully`);

		return {
			success: true
		};
	} catch (error) {
		console.error('[PortKnox LiteLLM] Error deleting model:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * LiteLLM 모델 목록 조회
 */
export async function listLiteLLMModels(): Promise<{
	success: boolean;
	models?: LiteLLMModel[];
	error?: string;
}> {
	try {
		const response = await fetch(`${LITELLM_BASE_URL}/model/info`, {
			headers: {
				Authorization: `Bearer ${LITELLM_API_KEY}`
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			return {
				success: false,
				error: `Failed to list models: ${response.status} ${errorText}`
			};
		}

		const data = await response.json();
		return {
			success: true,
			models: data.data || []
		};
	} catch (error) {
		console.error('[PortKnox LiteLLM] Error listing models:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * LiteLLM 서버 헬스체크
 */
export async function checkLiteLLMHealth(): Promise<boolean> {
	try {
		const response = await fetch(`${LITELLM_BASE_URL}/health`, {
			method: 'GET'
		});

		return response.ok;
	} catch (error) {
		console.error('[PortKnox LiteLLM] Health check failed:', error);
		return false;
	}
}
