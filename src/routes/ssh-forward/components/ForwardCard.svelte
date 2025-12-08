<script lang="ts">
        import type { SSHForwardConfig } from '$lib/types';

        export let forward: SSHForwardConfig;
        export let onStop: (id: string) => void;

        const LLM_BADGE_COLOR = 'bg-amber-500/10 text-amber-200 border border-amber-400/40';

        let healthStatus: 'idle' | 'checking' | 'healthy' | 'unhealthy' | 'error' = 'idle';
        let healthMessage = '';
        let healthUrl = '';

        $: statusColor =
                forward.status === 'active'
                        ? 'bg-green-500'
                        : forward.status === 'error'
				? 'bg-red-500'
				: 'bg-yellow-500';
        $: statusText =
                forward.status === 'active' ? '' : forward.status === 'error' ? '연결 실패' : '재연결 중...';
        $: healthUrl = `http://localhost:${forward.localPort}/health`;

        async function checkHealth() {
                healthStatus = 'checking';
                healthMessage = '';

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);

                try {
                        const response = await fetch(healthUrl, {
                                method: 'GET',
                                cache: 'no-store',
                                signal: controller.signal,
                        });

                        if (response.ok) {
                                healthStatus = 'healthy';
                                healthMessage = 'Healthy (200 OK)';
                        } else {
                                healthStatus = 'unhealthy';
                                healthMessage = `Unhealthy (${response.status} ${response.statusText})`;
                        }
                } catch (error) {
                        healthStatus = 'error';
                        healthMessage = error instanceof Error ? error.message : 'Unknown error';
                } finally {
                        clearTimeout(timeout);
                }
        }
</script>

<div class="glass-card">
	<div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                        <div class="flex items-center gap-2">
                                <h3 class="text-sm font-semibold text-white">
                                        {forward.name}
                                </h3>
                                {#if forward.litellmEnabled}
                                        <span class={`text-[10px] px-1.5 py-0.5 rounded ${LLM_BADGE_COLOR}`}>
                                                LLM
                                        </span>
                                {/if}
                                {#if statusText}
                                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                                                {statusText}
                                        </span>
                                {/if}
			</div>
                <div class="text-xs text-slate-500 font-mono">
                        {forward.sshHost}
                </div>
                {#if forward.author}
                        <div class="text-[10px] text-slate-600 mt-0.5">
                                등록자: {forward.author}
                        </div>
                {/if}
		</div>
		<span class="w-2 h-2 rounded-full {statusColor}"></span>
	</div>

	<div class="space-y-1 mb-2 text-xs">
		<div
			class="flex items-center justify-between py-1 px-2 rounded bg-slate-800 border border-slate-700"
		>
			<span class="text-slate-500">Local</span>
			<span class="font-mono text-blue-400"
				>{forward.localBindAddress || '127.0.0.1'}:{forward.localPort}</span
			>
		</div>
		{#if forward.localBindAddress === '0.0.0.0'}
			<div class="text-[10px] text-yellow-400 px-2">외부 접근 가능</div>
		{/if}

                <div
                        class="flex items-center justify-between py-1 px-2 rounded bg-slate-800 border border-slate-700"
                >
                        <span class="text-slate-500">Remote</span>
                        <span class="font-mono text-violet-400">{forward.remoteHost}:{forward.remotePort}</span>
                </div>
        </div>

        {#if forward.litellmEnabled}
                <div class="flex items-center gap-2 mb-2 text-xs">
                        <button
                                class="px-2 py-1 rounded bg-blue-900 text-white-200 border border-blue-700 hover:bg-white-800 disabled:opacity-60"
                                on:click={checkHealth}
                                disabled={healthStatus === 'checking'}
                        >
                                {healthStatus === 'checking' ? 'Checking...' : 'Check LLM Health'}
                        </button>
                </div>
                {#if healthStatus !== 'idle'}
                        <div
                                class="text-[10px] px-2 py-1 rounded border"
                                class:bg-green-900={healthStatus === 'healthy'}
                                class:border-green-700={healthStatus === 'healthy'}
                                class:text-green-200={healthStatus === 'healthy'}
                                class:bg-red-900={healthStatus === 'unhealthy' || healthStatus === 'error'}
                                class:border-red-700={healthStatus === 'unhealthy' || healthStatus === 'error'}
                                class:text-red-200={healthStatus === 'unhealthy' || healthStatus === 'error'}
                        >
                                {healthMessage}
                        </div>
                {/if}
        {/if}

        {#if forward.id}
                <button
                        on:click={() => forward.id && onStop(forward.id)}
                        class="w-full py-1 rounded bg-red-900 text-red-300 hover:bg-red-800 text-xs"
		>
			Stop
		</button>
	{/if}
</div>
