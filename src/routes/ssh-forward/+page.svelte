<script lang="ts">
	import { onMount } from "svelte";
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
				error = data.error || "포워딩 정보를 가져오는데 실패했습니다";
			}
		} catch (e) {
			error = "서버 연결에 실패했습니다";
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
				error = data.message || "포워딩 생성에 실패했습니다";
			}
		} catch (e) {
			error = "서버 연결에 실패했습니다";
		} finally {
			loading = false;
		}
	}

	async function stopForward(id: string) {
		if (!confirm("이 포트 포워딩을 중지하시겠습니까?")) return;

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
				error = data.message || "포워딩 중지에 실패했습니다";
			}
		} catch (e) {
			error = "서버 연결에 실패했습니다";
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
			localForwards: (configForm.localForwards || []).filter(
				(_, i) => i !== index,
			),
		};
	}

	onMount(() => {
		loadForwards();
		loadConfigEntries();
	});
</script>

<div class="space-y-8">
	<!-- Header -->
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
					<svg
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
					<span>Cancel</span>
				{:else}
					<svg
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
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
				<svg
					class="h-4 w-4 {loading ? 'animate-spin' : ''}"
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

	<!-- Form -->
	{#if showForm}
		<div class="glass-card animate-slide-up border-l-4 border-l-blue-500">
			<h3
				class="text-xl font-semibold text-white mb-6 flex items-center gap-2"
			>
				<span class="p-1.5 rounded bg-blue-500/20 text-blue-400">
					<svg
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
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
			<form on:submit|preventDefault={createForward} class="space-y-6">
				<div
					class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
				>
					<div class="space-y-2">
						<label
							for="name"
							class="text-sm font-medium text-slate-300"
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
						<label
							for="localPort"
							class="text-sm font-medium text-slate-300"
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
						<label
							for="remoteHost"
							class="text-sm font-medium text-slate-300"
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
						<label
							for="remotePort"
							class="text-sm font-medium text-slate-300"
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
						<label
							for="sshHost"
							class="text-sm font-medium text-slate-300"
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
						<label
							for="sshPort"
							class="text-sm font-medium text-slate-300"
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
						<label
							for="sshUser"
							class="text-sm font-medium text-slate-300"
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
						<label
							for="portDescription"
							class="text-sm font-medium text-slate-300"
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
						<label
							for="portUrl"
							class="text-sm font-medium text-slate-300"
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
					<button
						type="button"
						class="glass-btn-secondary"
						on:click={() => (showForm = false)}
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Active Tunnels Grid -->
	<div>
		{#if loading && forwards.length === 0}
			<div
				class="text-center py-20 text-slate-400 flex flex-col items-center gap-4"
			>
				<div
					class="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"
				></div>
				<p>Loading tunnels...</p>
			</div>
		{:else if forwards.length === 0}
			<div
				class="text-center py-20 text-slate-400 glass-card border-dashed border-2 border-slate-700/50"
			>
				<div
					class="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4"
				>
					<svg
						class="h-8 w-8 text-slate-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
				</div>
				<h3 class="text-lg font-medium text-slate-200 mb-1">
					No Active Tunnels
				</h3>
				<p class="text-slate-500 mb-6">
					Create a new SSH tunnel to forward remote ports to your
					local machine.
				</p>
				<button
					on:click={() => (showForm = true)}
					class="glass-btn-primary inline-flex items-center gap-2"
				>
					<svg
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
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
					<div class="glass-card group relative overflow-hidden">
						<!-- Status Indicator -->
						<div class="absolute top-0 right-0 p-4">
							<span class="relative flex h-3 w-3">
								<span
									class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
								></span>
								<span
									class="relative inline-flex rounded-full h-3 w-3 bg-green-500"
								></span>
							</span>
						</div>

						<div class="mb-6">
							<h3
								class="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors"
							>
								{forward.name}
							</h3>
							<div
								class="flex items-center gap-2 text-sm text-slate-400 font-mono"
							>
								<span>{forward.sshUser}@{forward.sshHost}</span>
							</div>
						</div>

						<div class="space-y-4 mb-6">
							<div
								class="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5"
							>
								<span
									class="text-xs uppercase tracking-wider text-slate-500 font-semibold"
									>Local</span
								>
								<span class="font-mono text-blue-300"
									>127.0.0.1:{forward.localPort}</span
								>
							</div>

							<div class="flex justify-center">
								<svg
									class="h-5 w-5 text-slate-600 animate-pulse"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 14l-7 7m0 0l-7-7m7 7V3"
									/>
								</svg>
							</div>

							<div
								class="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5"
							>
								<span
									class="text-xs uppercase tracking-wider text-slate-500 font-semibold"
									>Remote</span
								>
								<span class="font-mono text-violet-300"
									>{forward.remoteHost}:{forward.remotePort}</span
								>
							</div>
						</div>

						<div class="pt-4 border-t border-white/5">
							{#if forward.id}
								<button
									on:click={() => stopForward(forward.id!)}
									class="w-full py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center justify-center gap-2 group/btn"
								>
									<svg
										class="h-4 w-4 group-hover/btn:scale-110 transition-transform"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
									Stop Tunnel
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- SSH Config Manager -->
	<div class="space-y-4 pt-10 border-t border-white/5">
		<div class="flex items-center justify-between flex-wrap gap-4">
			<div>
				<h3
					class="text-2xl font-semibold text-white flex items-center gap-2"
				>
					<svg
						class="h-5 w-5 text-blue-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
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
					Manage Host aliases and LocalForward rules in
					{sshConfigPath || "~/.ssh/config"} (managed section only).
				</p>
			</div>
			<div class="flex gap-3">
				<button
					on:click={() => (showConfigForm = !showConfigForm)}
					class="glass-btn-secondary flex items-center gap-2"
				>
					<svg
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						{#if showConfigForm}
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						{:else}
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
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
						class="h-4 w-4 {configLoading ? 'animate-spin' : ''}"
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
			<div class="glass-card animate-slide-up border-l-4 border-l-violet-500">
				<h4 class="text-lg font-semibold text-white mb-4">
					{editingAlias ? `Edit alias (${editingAlias})` : "New SSH alias"}
				</h4>
				<form
					on:submit|preventDefault={saveConfigEntry}
					class="space-y-6"
				>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div class="space-y-2">
							<label
								for="alias"
								class="text-sm font-medium text-slate-300"
								>Host Alias</label
							>
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
							<label
								for="hostName"
								class="text-sm font-medium text-slate-300"
								>HostName</label
							>
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
							<label
								for="configUser"
								class="text-sm font-medium text-slate-300"
								>User</label
							>
							<input
								id="configUser"
								type="text"
								bind:value={configForm.user}
								placeholder="e.g. ubuntu"
								class="glass-input w-full"
							/>
						</div>

						<div class="space-y-2">
							<label
								for="configPort"
								class="text-sm font-medium text-slate-300"
								>SSH Port</label
							>
							<input
								id="configPort"
								type="number"
								bind:value={configForm.port}
								placeholder="22"
								class="glass-input w-full"
							/>
						</div>

						<div class="space-y-2">
							<label
								for="identityFile"
								class="text-sm font-medium text-slate-300"
								>IdentityFile</label
							>
							<input
								id="identityFile"
								type="text"
								bind:value={configForm.identityFile}
								placeholder="C:/Users/you/.ssh/id_rsa"
								class="glass-input w-full"
							/>
						</div>

						<div class="space-y-2">
							<label
								for="proxyJump"
								class="text-sm font-medium text-slate-300"
								>ProxyJump (optional)</label
							>
							<input
								id="proxyJump"
								type="text"
								bind:value={configForm.proxyJump}
								placeholder="jumpuser@jump.host:22"
								class="glass-input w-full"
							/>
						</div>

						<div class="space-y-2">
							<label class="text-sm font-medium text-slate-300"
								>ForwardAgent</label
							>
							<div class="flex items-center gap-3">
								<input
									id="forwardAgent"
									type="checkbox"
									bind:checked={configForm.forwardAgent}
									class="h-4 w-4 accent-blue-500"
								/>
								<label for="forwardAgent" class="text-slate-300 text-sm"
									>Enable SSH agent forwarding</label
								>
							</div>
						</div>
					</div>

					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-semibold text-slate-200">
									LocalForward rules
								</p>
								<p class="text-xs text-slate-500">
									Specify LocalForward entries stored in the alias.
								</p>
							</div>
							<button
								type="button"
								class="glass-btn-secondary text-sm"
								on:click={addForwardRow}
							>
								Add LocalForward
							</button>
						</div>

						{#if !configForm.localForwards || configForm.localForwards.length === 0}
							<div class="text-sm text-slate-500 bg-white/5 p-3 rounded-lg">
								No LocalForward lines yet. Click "Add LocalForward" to define
								one.
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
						<button
							type="button"
							class="glass-btn-secondary"
							on:click={() => {
								resetConfigForm();
								showConfigForm = false;
							}}
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Config cards -->
		<div class="space-y-4">
			{#if configLoading && configEntries.length === 0}
				<div class="text-center py-12 text-slate-400">
					<div
						class="w-8 h-8 border-4 border-violet-400/30 border-t-violet-400 rounded-full animate-spin mx-auto mb-4"
					></div>
					<p>Loading SSH config...</p>
				</div>
			{:else if configEntries.length === 0}
				<div
					class="glass-card border-dashed border-2 border-slate-700/50 text-center py-12"
				>
					<h4 class="text-lg text-slate-200 mb-2">No managed aliases yet</h4>
					<p class="text-slate-500 mb-4">
						Use "Add Alias" to create a Host block with LocalForward and
						ProxyJump options.
					</p>
					<button
						on:click={() => (showConfigForm = true)}
						class="glass-btn-primary inline-flex items-center gap-2"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
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
										ProxyJump → {entry.proxyJump}
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
									<p class="text-xs text-slate-400 uppercase tracking-wide">
										LocalForward
									</p>
									{#each entry.localForwards as fwd}
										<div
											class="flex justify-between items-center p-2 rounded bg-white/5 border border-white/5"
										>
											<span class="font-mono text-blue-200">
												{fwd.localHost || "127.0.0.1"}:{fwd.localPort}
											</span>
											<span class="text-xs text-slate-500">→</span>
											<span class="font-mono text-violet-200">
												{fwd.remoteHost}:{fwd.remotePort}
											</span>
										</div>
									{/each}
								</div>
							{/if}

							<div class="flex flex-wrap gap-2 pt-3 border-t border-white/5">
								<button
									class="glass-btn-secondary text-sm flex-1"
									on:click={() => applyToTunnel(entry)}
								>
									Use in tunnel form
								</button>
								<button
									class="glass-btn-secondary text-sm"
									on:click={() => startEditConfig(entry)}
								>
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
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
