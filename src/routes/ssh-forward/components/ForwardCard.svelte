<script lang="ts">
	import type { SSHForwardConfig } from "$lib/types";

	export let forward: SSHForwardConfig;
	export let onStop: (id: string) => void;
</script>

<div class="glass-card group relative overflow-hidden">
	<div class="absolute top-0 right-0 p-4">
		<span class="relative flex h-3 w-3">
			<span
				class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
			></span>
			<span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
		</span>
	</div>

	<div class="mb-6">
		<h3
			class="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors"
		>
			{forward.name}
		</h3>
		<div class="flex items-center gap-2 text-sm text-slate-400 font-mono">
			<span>{forward.sshUser}@{forward.sshHost}</span>
		</div>
	</div>

	<div class="space-y-4 mb-6">
		<div class="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
			<span class="text-xs uppercase tracking-wider text-slate-500 font-semibold">Local</span>
			<span class="font-mono text-blue-300">127.0.0.1:{forward.localPort}</span>
		</div>

		<div class="flex justify-center">
			<svg class="h-5 w-5 text-slate-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
			</svg>
		</div>

		<div class="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
			<span class="text-xs uppercase tracking-wider text-slate-500 font-semibold">Remote</span>
			<span class="font-mono text-violet-300">{forward.remoteHost}:{forward.remotePort}</span>
		</div>
	</div>

	<div class="pt-4 border-t border-white/5">
		{#if forward.id}
			<button
				on:click={() => forward.id && onStop(forward.id)}
				class="w-full py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center justify-center gap-2 group/btn"
			>
				<svg
					class="h-4 w-4 group-hover/btn:scale-110 transition-transform"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
				Stop Tunnel
			</button>
		{/if}
	</div>
</div>
