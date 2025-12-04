<script lang="ts">
	import { onMount } from "svelte";
	import TunnelForm from "./components/TunnelForm.svelte";
	import ForwardCard from "./components/ForwardCard.svelte";
	import ConfigForm from "./components/ConfigForm.svelte";
	import ConfigCard from "./components/ConfigCard.svelte";
	import type {
		SSHConfigEntry,
		SSHForwardConfig,
		SSHLocalForward,
	} from "$lib/types";

	let forwards: SSHForwardConfig[] = [];
	let loading = false;
	let error = "";
	let success = "";
	let showForm = false;

	let formData: SSHForwardConfig = {
		name: "",
		remoteHost: "",
		remotePort: 0,
		localPort: 0,
		sshUser: "",
		sshHost: "",
		sshPort: 22,
		portDescription: "",
		portUrl: "",
	};

	let configEntries: SSHConfigEntry[] = [];
	let configLoading = false;
	let configError = "";
	let configSuccess = "";
	let showConfigForm = false;
	let editingAlias: string | null = null;
	let sshConfigPath = "";

	let configForm: SSHConfigEntry = {
		alias: "",
		hostName: "",
		user: "",
		port: 22,
		identityFile: "",
		proxyJump: "",
		forwardAgent: true,
		localForwards: [],
	};

	async function loadForwards() {
		loading = true;
		error = "";
		try {
			const response = await fetch("/api/ssh-forward");
			const data = await response.json();

			if (data.success) {
				forwards = data.forwards;
			} else {
				error = data.error || "Failed to load tunnels";
			}
		} catch (e) {
			error = "Unable to reach server";
		} finally {
			loading = false;
		}
	}

	async function loadConfigEntries() {
		configLoading = true;
		configError = "";
		try {
			const response = await fetch("/api/ssh-config");
			const data = await response.json();
			if (data.success) {
				configEntries = data.entries || [];
				sshConfigPath = data.path || "";
			} else {
				configError = data.error || "Failed to load SSH config";
			}
		} catch (e) {
			configError = "Failed to load SSH config";
		} finally {
			configLoading = false;
		}
	}

	async function createForward() {
		error = "";
		success = "";
		loading = true;

		try {
			const response = await fetch("/api/ssh-forward", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});
			const data = await response.json();

			if (data.success) {
				success = data.message;
				showForm = false;
				resetForm();
				await loadForwards();
			} else {
				error = data.message || "Tunnel start failed";
			}
		} catch (e) {
			error = "Unable to reach server";
		} finally {
			loading = false;
		}
	}

	async function stopForward(id: string) {
		if (!confirm("Stop this tunnel?")) return;

		error = "";
		success = "";

		try {
			const response = await fetch("/api/ssh-forward", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id }),
			});
			const data = await response.json();

			if (data.success) {
				success = data.message;
				await loadForwards();
			} else {
				error = data.message || "Stop failed";
			}
		} catch (e) {
			error = "Unable to reach server";
		}
	}

	function resetForm() {
		formData = {
			name: "",
			remoteHost: "",
			remotePort: 0,
			localPort: 0,
			sshUser: "",
			sshHost: "",
			sshPort: 22,
			portDescription: "",
			portUrl: "",
		};
	}

	function resetConfigForm() {
		configForm = {
			alias: "",
			hostName: "",
			user: "",
			port: 22,
			identityFile: "",
			proxyJump: "",
			forwardAgent: true,
			localForwards: [],
		};
		editingAlias = null;
	}

	function sanitizeLocalForwards(forwards: SSHLocalForward[] | undefined) {
		return (forwards || [])
			.map((forward) => ({
				localHost: forward.localHost?.trim(),
				localPort: Number(forward.localPort),
				remoteHost: forward.remoteHost?.trim() || "",
				remotePort: Number(forward.remotePort),
			}))
			.filter(
				(forward) =>
					forward.remoteHost &&
					Number.isFinite(forward.localPort) &&
					Number.isFinite(forward.remotePort),
			);
	}

	async function saveConfigEntry() {
		configError = "";
		configSuccess = "";
		configLoading = true;

		const payload: SSHConfigEntry = {
			...configForm,
			alias: configForm.alias.trim(),
			hostName: configForm.hostName.trim(),
			user: configForm.user?.trim(),
			identityFile: configForm.identityFile?.trim(),
			proxyJump: configForm.proxyJump?.trim(),
			port: configForm.port ? Number(configForm.port) : undefined,
			forwardAgent: configForm.forwardAgent,
			localForwards: sanitizeLocalForwards(configForm.localForwards),
		};

		try {
			const response = await fetch("/api/ssh-config", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					entry: payload,
					previousAlias:
						editingAlias && editingAlias !== payload.alias
							? editingAlias
							: undefined,
				}),
			});
			const data = await response.json();
			if (data.success) {
				configSuccess = data.message || "SSH config saved";
				configEntries = data.entries || [];
				sshConfigPath = data.path || sshConfigPath;
				resetConfigForm();
				showConfigForm = false;
			} else {
				configError =
					data.error || data.message || "Failed to save SSH config";
			}
		} catch (e) {
			configError = "Failed to save SSH config";
		} finally {
			configLoading = false;
		}
	}

	function startEditConfig(entry: SSHConfigEntry) {
		configForm = {
			...entry,
			localForwards: entry.localForwards
				? entry.localForwards.map((f) => ({ ...f }))
				: [],
		};
		editingAlias = entry.alias;
		showConfigForm = true;
		configSuccess = "";
		configError = "";
	}

	async function deleteConfigEntry(alias: string) {
		if (!confirm(`Delete SSH alias "${alias}"?`)) return;
		configError = "";
		configSuccess = "";
		configLoading = true;

		try {
			const response = await fetch("/api/ssh-config", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ alias }),
			});
			const data = await response.json();

			if (data.success) {
				configEntries = data.entries || [];
				sshConfigPath = data.path || sshConfigPath;
				configSuccess = data.message;
			} else {
				configError = data.error || data.message || "Delete failed";
			}
		} catch (e) {
			configError = "Delete failed";
		} finally {
			configLoading = false;
		}
	}

	function applyToTunnel(entry: SSHConfigEntry) {
		showForm = true;
		formData.sshHost = entry.hostName;
		formData.sshPort = entry.port ?? 22;
		if (entry.user) {
			formData.sshUser = entry.user;
		}
	}

	onMount(() => {
		loadForwards();
		loadConfigEntries();
	});
</script>

<div class="space-y-8">
	<div class="flex items-center justify-between">
		<div>
			<h2
				class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400 mb-2"
			>
				SSH Tunnels
			</h2>
			<p class="text-slate-400">
				Securely forward local ports to remote servers
			</p>
		</div>
		<div class="flex gap-3">
			<button
				on:click={() => (showForm = !showForm)}
				class="glass-btn-secondary flex items-center gap-2"
			>
				{#if showForm}
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
					<span>Cancel</span>
				{:else}
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					<span>New Tunnel</span>
				{/if}
			</button>
			<button
				on:click={loadForwards}
				disabled={loading}
				class="glass-btn-primary flex items-center gap-2 disabled:opacity-50"
			>
				<svg class="h-4 w-4" class:animate-spin={loading} fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
				<span>Refresh</span>
			</button>
		</div>
	</div>

	{#if success}
		<div
			class="p-4 bg-green-500/10 border border-green-500/20 text-green-200 rounded-lg animate-slide-up"
		>
			{success}
		</div>
	{/if}

	{#if error}
		<div
			class="p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-lg animate-slide-up"
		>
			{error}
		</div>
	{/if}

	{#if showForm}
		<TunnelForm
			bind:formData
			{loading}
			onSubmit={createForward}
			onCancel={() => (showForm = false)}
		/>
	{/if}

	<div>
		{#if loading && forwards.length === 0}
			<div class="text-center py-20 text-slate-400 flex flex-col items-center gap-4">
				<div
					class="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"
				></div>
				<p>Loading tunnels...</p>
			</div>
		{:else if forwards.length === 0}
			<div class="text-center py-20 text-slate-400 glass-card border-dashed border-2 border-slate-700/50">
				<div class="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg class="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
				</div>
				<h3 class="text-lg font-medium text-slate-200 mb-1">No Active Tunnels</h3>
				<p class="text-slate-500 mb-6">
					Create a new SSH tunnel to forward remote ports to your local machine.
				</p>
				<button
					on:click={() => (showForm = true)}
					class="glass-btn-primary inline-flex items-center gap-2"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Create Tunnel
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each forwards as forward}
					<ForwardCard {forward} onStop={stopForward} />
				{/each}
			</div>
		{/if}
	</div>

	<div class="space-y-4 pt-10 border-t border-white/5">
		<div class="flex items-center justify-between flex-wrap gap-4">
			<div>
				<h3 class="text-2xl font-semibold text-white flex items-center gap-2">
					<svg class="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 11c1.657 0 3-1.79 3-4s-1.343-4-3-4-3 1.79-3 4 1.343 4 3 4zM5.5 21a6.5 6.5 0 0113 0"
						/>
					</svg>
					SSH Config (aliases)
				</h3>
				<p class="text-slate-400 text-sm">
					Manage Host aliases and LocalForward rules in {sshConfigPath || "~/.ssh/config"} (managed section
					only).
				</p>
			</div>
			<div class="flex gap-3">
				<button
					on:click={() => (showConfigForm = !showConfigForm)}
					class="glass-btn-secondary flex items-center gap-2"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						{#if showConfigForm}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						{:else}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						{/if}
					</svg>
					<span>{showConfigForm ? "Close Form" : "Add Alias"}</span>
				</button>
				<button
					on:click={loadConfigEntries}
					disabled={configLoading}
					class="glass-btn-primary flex items-center gap-2 disabled:opacity-50"
				>
					<svg
						class="h-4 w-4"
						class:animate-spin={configLoading}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
					<span>Sync</span>
				</button>
			</div>
		</div>

		{#if configSuccess}
			<div
				class="p-4 bg-green-500/10 border border-green-500/20 text-green-200 rounded-lg animate-slide-up"
			>
				{configSuccess}
			</div>
		{/if}

		{#if configError}
			<div
				class="p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-lg animate-slide-up"
			>
				{configError}
			</div>
		{/if}

		{#if showConfigForm}
			<ConfigForm
				bind:configForm
				{configLoading}
				{editingAlias}
				onSubmit={saveConfigEntry}
				onCancel={() => {
					resetConfigForm();
					showConfigForm = false;
				}}
			/>
		{/if}

		<div class="space-y-4">
			{#if configLoading && configEntries.length === 0}
				<div class="text-center py-12 text-slate-400">
					<div
						class="w-8 h-8 border-4 border-violet-400/30 border-t-violet-400 rounded-full animate-spin mx-auto mb-4"
					></div>
					<p>Loading SSH config...</p>
				</div>
			{:else if configEntries.length === 0}
				<div class="glass-card border-dashed border-2 border-slate-700/50 text-center py-12">
					<h4 class="text-lg text-slate-200 mb-2">No managed aliases yet</h4>
					<p class="text-slate-500 mb-4">
						Use "Add Alias" to create a Host block with LocalForward and ProxyJump options.
					</p>
					<button
						on:click={() => (showConfigForm = true)}
						class="glass-btn-primary inline-flex items-center gap-2"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Add first alias
					</button>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each configEntries as entry}
						<ConfigCard
							{entry}
							applyToTunnel={applyToTunnel}
							startEditConfig={startEditConfig}
							deleteConfigEntry={deleteConfigEntry}
						/>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
