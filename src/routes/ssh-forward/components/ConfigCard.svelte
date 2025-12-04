<script lang="ts">
	import type { SSHConfigEntry } from "$lib/types";

	export let entry: SSHConfigEntry;
	export let applyToTunnel: (entry: SSHConfigEntry) => void;
	export let startEditConfig: (entry: SSHConfigEntry) => void;
	export let deleteConfigEntry: (alias: string) => void;
</script>

<div class="glass-card relative overflow-hidden">
	<div class="absolute top-0 right-0 p-4">
		<span class="text-xs text-slate-500">Host</span>
	</div>
	<div class="mb-4">
		<h4 class="text-xl font-semibold text-white">{entry.alias}</h4>
		<p class="text-sm text-slate-400 font-mono">
			{entry.user ? `${entry.user}@` : ""}{entry.hostName}
			{entry.port ? `:${entry.port}` : ""}
		</p>
		{#if entry.proxyJump}
			<p class="text-xs text-slate-500 mt-1">
				ProxyJump &rarr; {entry.proxyJump}
			</p>
		{/if}
		{#if entry.identityFile}
			<p class="text-xs text-slate-500">
				Key: {entry.identityFile}
			</p>
		{/if}
	</div>

	{#if entry.localForwards && entry.localForwards.length > 0}
		<div class="space-y-2 mb-4">
			<p class="text-xs text-slate-400 uppercase tracking-wide">LocalForward</p>
			{#each entry.localForwards as fwd}
				<div class="flex justify-between items-center p-2 rounded bg-white/5 border border-white/5">
					<span class="font-mono text-blue-200">
						{fwd.localHost || "127.0.0.1"}:{fwd.localPort}
					</span>
					<span class="text-xs text-slate-500">&rarr;</span>
					<span class="font-mono text-violet-200">
						{fwd.remoteHost}:{fwd.remotePort}
					</span>
				</div>
			{/each}
		</div>
	{/if}

	<div class="flex flex-wrap gap-2 pt-3 border-t border-white/5">
		<button class="glass-btn-secondary text-sm flex-1" on:click={() => applyToTunnel(entry)}>
			Use in tunnel form
		</button>
		<button class="glass-btn-secondary text-sm" on:click={() => startEditConfig(entry)}>
			Edit
		</button>
		<button
			class="glass-btn-primary text-sm bg-red-500/20 border-red-500/30 hover:bg-red-500/30"
			on:click={() => deleteConfigEntry(entry.alias)}
		>
			Delete
		</button>
	</div>
</div>
