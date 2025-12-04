<script lang="ts">
	import type { SSHConfigEntry } from "$lib/types";

	export let configForm: SSHConfigEntry;
	export let configLoading = false;
	export let editingAlias: string | null = null;
	export let onSubmit: () => void | Promise<void>;
	export let onCancel: () => void;

	function addForwardRow() {
		configForm = {
			...configForm,
			localForwards: [
				...(configForm.localForwards || []),
				{
					localHost: "127.0.0.1",
					localPort: 0,
					remoteHost: "",
					remotePort: 0,
				},
			],
		};
	}

	function removeForwardRow(index: number) {
		configForm = {
			...configForm,
			localForwards: (configForm.localForwards || []).filter((_, i) => i !== index),
		};
	}
</script>

<div class="glass-card animate-slide-up border-l-4 border-l-violet-500">
	<h4 class="text-lg font-semibold text-white mb-4">
		{editingAlias ? `Edit alias (${editingAlias})` : "New SSH alias"}
	</h4>
	<form on:submit|preventDefault={onSubmit} class="space-y-6">
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<div class="space-y-2">
				<label for="alias" class="text-sm font-medium text-slate-300">Host Alias</label>
				<input
					id="alias"
					type="text"
					bind:value={configForm.alias}
					placeholder="e.g. prod-api"
					required
					class="glass-input w-full"
				/>
			</div>

			<div class="space-y-2">
				<label for="hostName" class="text-sm font-medium text-slate-300">HostName</label>
				<input
					id="hostName"
					type="text"
					bind:value={configForm.hostName}
					placeholder="ssh target host"
					required
					class="glass-input w-full"
				/>
			</div>

			<div class="space-y-2">
				<label for="configUser" class="text-sm font-medium text-slate-300">User</label>
				<input
					id="configUser"
					type="text"
					bind:value={configForm.user}
					placeholder="e.g. ubuntu"
					class="glass-input w-full"
				/>
			</div>

			<div class="space-y-2">
				<label for="configPort" class="text-sm font-medium text-slate-300">SSH Port</label>
				<input
					id="configPort"
					type="number"
					bind:value={configForm.port}
					placeholder="22"
					class="glass-input w-full"
				/>
			</div>

			<div class="space-y-2">
				<label for="identityFile" class="text-sm font-medium text-slate-300">IdentityFile</label>
				<input
					id="identityFile"
					type="text"
					bind:value={configForm.identityFile}
					placeholder="C:/Users/you/.ssh/id_rsa"
					class="glass-input w-full"
				/>
			</div>

			<div class="space-y-2">
				<label for="proxyJump" class="text-sm font-medium text-slate-300">ProxyJump (optional)</label>
				<input
					id="proxyJump"
					type="text"
					bind:value={configForm.proxyJump}
					placeholder="jumpuser@jump.host:22"
					class="glass-input w-full"
				/>
			</div>

			<div class="space-y-2">
				<label class="text-sm font-medium text-slate-300">ForwardAgent</label>
				<div class="flex items-center gap-3">
					<input
						id="forwardAgent"
						type="checkbox"
						bind:checked={configForm.forwardAgent}
						class="h-4 w-4 accent-blue-500"
					/>
					<label for="forwardAgent" class="text-slate-300 text-sm">
						Enable SSH agent forwarding
					</label>
				</div>
			</div>
		</div>

		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-semibold text-slate-200">LocalForward rules</p>
					<p class="text-xs text-slate-500">
						Specify LocalForward entries stored in the alias.
					</p>
				</div>
				<button type="button" class="glass-btn-secondary text-sm" on:click={addForwardRow}>
					Add LocalForward
				</button>
			</div>

			{#if !configForm.localForwards || configForm.localForwards.length === 0}
				<div class="text-sm text-slate-500 bg-white/5 p-3 rounded-lg">
					No LocalForward lines yet. Click "Add LocalForward" to define one.
				</div>
			{/if}

			{#each configForm.localForwards || [] as forward, index}
				<div class="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
					<div class="space-y-2">
						<label class="text-xs text-slate-400">Local Host</label>
						<input
							type="text"
							bind:value={forward.localHost}
							placeholder="127.0.0.1"
							class="glass-input w-full"
						/>
					</div>
					<div class="space-y-2">
						<label class="text-xs text-slate-400">Local Port</label>
						<input
							type="number"
							bind:value={forward.localPort}
							placeholder="8080"
							class="glass-input w-full"
						/>
					</div>
					<div class="space-y-2">
						<label class="text-xs text-slate-400">Remote Host</label>
						<input
							type="text"
							bind:value={forward.remoteHost}
							placeholder="localhost"
							class="glass-input w-full"
						/>
					</div>
					<div class="space-y-2">
						<label class="text-xs text-slate-400">Remote Port</label>
						<input
							type="number"
							bind:value={forward.remotePort}
							placeholder="3000"
							class="glass-input w-full"
						/>
					</div>
					<div class="flex md:justify-end">
						<button
							type="button"
							class="glass-btn-secondary w-full md:w-auto"
							on:click={() => removeForwardRow(index)}
						>
							Remove
						</button>
					</div>
				</div>
			{/each}
		</div>

		<div class="flex gap-3 pt-4 border-t border-white/5">
			<button
				type="submit"
				class="glass-btn-primary flex items-center gap-2 disabled:opacity-50"
				disabled={configLoading}
			>
				{#if configLoading}
					<div
						class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
					></div>
				{/if}
				<span>{editingAlias ? "Update Alias" : "Save Alias"}</span>
			</button>
			<button type="button" class="glass-btn-secondary" on:click={onCancel}>
				Cancel
			</button>
		</div>
	</form>
</div>
