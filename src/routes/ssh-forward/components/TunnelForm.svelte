<script lang="ts">
	import type { SSHForwardConfig } from "$lib/types";

	export let formData: SSHForwardConfig;
	export let loading = false;
	export let onSubmit: () => void | Promise<void>;
	export let onCancel: () => void;
</script>

<div class="glass-card animate-slide-up border-l-4 border-l-blue-500">
	<h3 class="text-xl font-semibold text-white mb-6 flex items-center gap-2">
		<span class="p-1.5 rounded bg-blue-500/20 text-blue-400">
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 10V3L4 14h7v7l9-11h-7z"
				/>
			</svg>
		</span>
		Configure New Tunnel
	</h3>
	<form on:submit|preventDefault={onSubmit} class="space-y-6">
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<div class="space-y-2">
				<label for="name" class="text-sm font-medium text-slate-300"
					>Configuration Name</label
				>
				<input
					id="name"
					type="text"
					bind:value={formData.name}
					placeholder="e.g. Production API"
					required
					class="glass-input w-full"
				/>
			</div>

			<div class="space-y-2">
				<label for="localPort" class="text-sm font-medium text-slate-300"
					>Local Port</label
				>
				<input
					id="localPort"
					type="number"
					bind:value={formData.localPort}
					placeholder="e.g. 8080"
					required
					class="glass-input w-full"
				/>
			</div>

			<div class="space-y-2">
				<label for="remoteHost" class="text-sm font-medium text-slate-300"
					>Remote Host</label
				>
				<input
					id="remoteHost"
					type="text"
					bind:value={formData.remoteHost}
					placeholder="e.g. localhost"
					required
					class="glass-input w-full"
				/>
			</div>

			<div class="space-y-2">
				<label for="remotePort" class="text-sm font-medium text-slate-300"
					>Remote Port</label
				>
				<input
					id="remotePort"
					type="number"
					bind:value={formData.remotePort}
					placeholder="e.g. 3000"
					required
					class="glass-input w-full"
				/>
			</div>

			<div class="space-y-2">
				<label for="sshHost" class="text-sm font-medium text-slate-300"
					>SSH Server</label
				>
				<input
					id="sshHost"
					type="text"
					bind:value={formData.sshHost}
					placeholder="e.g. ssh.example.com"
					required
					class="glass-input w-full"
				/>
			</div>

			<div class="space-y-2">
				<label for="sshPort" class="text-sm font-medium text-slate-300"
					>SSH Port</label
				>
				<input
					id="sshPort"
					type="number"
					bind:value={formData.sshPort}
					placeholder="Default: 22"
					class="glass-input w-full"
				/>
			</div>

			<div class="space-y-2">
				<label for="sshUser" class="text-sm font-medium text-slate-300"
					>SSH User</label
				>
				<input
					id="sshUser"
					type="text"
					bind:value={formData.sshUser}
					placeholder="e.g. ubuntu"
					required
					class="glass-input w-full"
				/>
			</div>

			<div class="space-y-2">
				<label for="portDescription" class="text-sm font-medium text-slate-300"
					>Description (Optional)</label
				>
				<input
					id="portDescription"
					type="text"
					bind:value={formData.portDescription}
					placeholder="e.g. API Server"
					class="glass-input w-full"
				/>
			</div>

			<div class="space-y-2">
				<label for="portUrl" class="text-sm font-medium text-slate-300"
					>URL (Optional)</label
				>
				<input
					id="portUrl"
					type="text"
					bind:value={formData.portUrl}
					placeholder="e.g. http://localhost:8080"
					class="glass-input w-full"
				/>
			</div>
		</div>

		<div class="flex gap-3 pt-4 border-t border-white/5">
			<button
				type="submit"
				class="glass-btn-primary flex items-center gap-2 disabled:opacity-50"
				disabled={loading}
			>
				{#if loading}
					<div
						class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
					></div>
				{/if}
				<span>Start Tunnel</span>
			</button>
			<button type="button" class="glass-btn-secondary" on:click={onCancel}>
				Cancel
			</button>
		</div>
	</form>
</div>
