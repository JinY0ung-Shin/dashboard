export interface PortInfo {
	port: number;
	protocol: string;
	state: 'open' | 'closed';
	service?: string;
	pid?: number;
	processName?: string;
	description?: string;
	author?: string;
	tags?: string[]; // Array of hashtags
	litellmEnabled?: boolean;
	litellmModelId?: string;
	litellmModelName?: string;
	litellmApiBase?: string;
}

export interface PortDescription {
	port: number;
	description?: string;
	author?: string;
	tags?: string[]; // Array of hashtags
	litellmEnabled?: boolean;
	litellmModelId?: string;
	litellmModelName?: string;
	litellmApiBase?: string;
}

export interface SSHForwardConfig {
        id?: string;
        name: string;
        remoteHost: string;
        remotePort: number;
        localPort: number;
        localBindAddress?: string; // '127.0.0.1' (localhost only) or '0.0.0.0' (all interfaces)
        sshUser: string;
        sshHost: string;
        sshPort: number;
        status?: 'active' | 'inactive' | 'error';
        author?: string; // 터널을 등록한 사람
        tags?: string[];
        portUrl?: string;
        // LiteLLM 자동 등록 옵션
        litellmEnabled?: boolean;
        litellmModelName?: string; // 사용자 지정 모델 이름
        litellmApiKey?: string; // LLM API 키 (선택사항)
        litellmModelId?: string;
        litellmApiBase?: string;
}

export interface SSHForwardResult {
	success: boolean;
	message: string;
	config?: SSHForwardConfig;
}

export interface SSHLocalForward {
	localHost?: string;
	localPort: number;
	remoteHost: string;
	remotePort: number;
}

export interface SSHConfigExtraOption {
	key: string;
	value: string;
}

export interface SSHConfigEntry {
	alias: string;
	hostName?: string;
	user?: string;
	port?: number;
	identityFile?: string;
	proxyJump?: string;
	strictHostKeyChecking?: 'yes' | 'no' | 'accept-new';
	forwardAgent?: boolean;
	localForwards?: SSHLocalForward[];
	extras?: SSHConfigExtraOption[];
}

// LiteLLM API 타입
export interface LiteLLMModelParams {
	model: string; // 예: "openai/gpt-3.5-turbo"
	api_base: string; // 예: "http://localhost:8080/v1"
	api_key?: string; // 선택사항
}

export interface LiteLLMAddModelRequest {
	model_name: string;
	litellm_params: LiteLLMModelParams;
}

export interface LiteLLMModel {
	model_id?: string;
	model_name: string;
	litellm_params: LiteLLMModelParams;
	model_info?: {
		id: string;
		db_model: boolean;
	};
}

export interface LiteLLMDeleteModelRequest {
	id: string;
}
