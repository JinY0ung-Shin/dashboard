<script lang="ts">
	import type { SSHForwardConfig } from "$lib/types";

	export let forward: SSHForwardConfig;
	export let onStop: (id: string) => void;
</script>

<div class="glass-card">
	<div class="flex items-start justify-between mb-2">
		<div>
			<h3 class="text-sm font-semibold text-white">
				{forward.name}
			</h3>
			<div class="text-xs text-slate-500 font-mono">
				{forward.sshUser}@{forward.sshHost}
			</div>
		</div>
		<span class="w-2 h-2 rounded-full bg-green-500"></span>
	</div>

	<div class="space-y-1 mb-2 text-xs">
		<div class="flex items-center justify-between py-1 px-2 rounded bg-slate-800 border border-slate-700">
			<span class="text-slate-500">Local</span>
			<span class="font-mono text-blue-400">{forward.localBindAddress || '127.0.0.1'}:{forward.localPort}</span>
		</div>
		{#if forward.localBindAddress === '0.0.0.0'}
			<div class="text-[10px] text-yellow-400 px-2">외부 접근 가능</div>
		{/if}

		<div class="flex items-center justify-between py-1 px-2 rounded bg-slate-800 border border-slate-700">
			<span class="text-slate-500">Remote</span>
			<span class="font-mono text-violet-400">{forward.remoteHost}:{forward.remotePort}</span>
		</div>
	</div>

	{#if forward.id}
		<button
			on:click={() => forward.id && onStop(forward.id)}
			class="w-full py-1 rounded bg-red-900 text-red-300 hover:bg-red-800 text-xs"
		>
			Stop
		</button>
	{/if}
</div>
