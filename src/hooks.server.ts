import { restoreSavedTunnels } from '$lib/server/sshForwarder';

// 서버 시작 시 저장된 SSH 터널 복원
restoreSavedTunnels().catch((error) => {
	console.error('Failed to restore SSH tunnels:', error);
});

// 전역 에러 핸들러 - SSH 연결 에러로 인한 서버 크래시 방지
process.on('uncaughtException', (error) => {
	console.error('Uncaught Exception:', error);
	// SSH 연결 에러는 무시하고 서버는 계속 실행
	if (error.message?.includes('ECONNRESET') || error.message?.includes('SSH')) {
		console.log('SSH 연결 에러 무시, 서버 계속 실행');
	} else {
		// 다른 심각한 에러는 로그를 남김
		console.error('심각한 에러 발생:', error);
	}
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export async function handle({ event, resolve }) {
	return resolve(event);
}
