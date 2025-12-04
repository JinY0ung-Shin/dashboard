<script lang="ts">
	import { onMount } from "svelte";
	import type { SSHForwardConfig } from "$lib/types";

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

	onMount(() => {
		loadForwards();
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
</div>
