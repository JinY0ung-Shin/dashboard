<script lang="ts">
	import type { SSHConfigEntry } from '$lib/types';

	export let entry: SSHConfigEntry;
	export let applyToTunnel: (entry: SSHConfigEntry) => void;
</script>

<div class="glass-card relative overflow-hidden">
	<div class="absolute top-0 right-0 p-4">
		<span class="text-xs text-slate-500">Host</span>
	</div>
	<div class="mb-4">
		<h4 class="text-xl font-semibold text-white">{entry.alias}</h4>
		{#if entry.hostName}
			<p class="text-sm text-slate-400 font-mono">
				{entry.hostName}
				{entry.port ? `:${entry.port}` : ''}
			</p>
		{/if}
		{#if entry.proxyJump}
			<div class="mt-3 flex items-center gap-2 text-xs text-slate-300">
				<span class="px-2 py-1 rounded-full bg-slate-800/60 text-[11px] text-blue-300"
					>ProxyJump</span
				>
				<span class="font-mono text-slate-200">{entry.proxyJump}</span>
			</div>
		{/if}
	</div>

	<div class="flex flex-wrap gap-2 pt-3 border-t border-white/5">
		<button class="glass-btn-secondary text-sm flex-1" on:click={() => applyToTunnel(entry)}>
			Use for tunnel
		</button>
	</div>
</div>
