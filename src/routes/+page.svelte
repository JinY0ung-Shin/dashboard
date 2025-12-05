<script lang="ts">
	import type { PortInfo } from "$lib/types";
	import { onMount } from "svelte";

        export let data: { hostIp?: string | null };

        const buildHostBase = (host?: string | null) => {
                const target = host?.trim();
                if (!target) return "http://localhost";
                return target.startsWith("http") ? target.replace(/\/$/, "") : `http://${target}`;
        };

        let hostBase = buildHostBase(data?.hostIp);

        let ports: PortInfo[] = [];
	let loading = false;
	let error = "";
	let searchTerm = "";
	let availablePort: number | null = null;
	let findingPort = false;
	let editingPort: number | null = null;
	let editForm = {
		description: "",
		url: "",
	};
	let success = "";

	async function loadPorts() {
		loading = true;
		error = "";
		try {
			const response = await fetch("/api/ports");
			const data = await response.json();

			if (data.success) {
				ports = data.ports;
			} else {
				error = data.error || "포트 정보를 가져오는데 실패했습니다";
			}
		} catch (e) {
			error = "서버 연결에 실패했습니다";
		} finally {
			loading = false;
		}
	}

	async function findAvailablePort() {
		findingPort = true;
		availablePort = null;
		try {
			const response = await fetch("/api/ports", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "find-available",
					startPort: 3000,
					endPort: 65535,
				}),
			});
			const data = await response.json();

			if (data.success) {
				availablePort = data.port;
			} else {
				error = data.error || "사용 가능한 포트를 찾는데 실패했습니다";
			}
		} catch (e) {
			error = "서버 연결에 실패했습니다";
		} finally {
			findingPort = false;
		}
	}

        const resolvePortUrl = (port: PortInfo) => {
			const defaultUrl = `${hostBase}:${port.port}`;
			if (!port.url) return defaultUrl;

			const rawUrl = port.url.trim();
			const normalized = rawUrl.startsWith("http") ? rawUrl : `http://${rawUrl}`;

			return defaultUrl
		};

        function openPort(port: PortInfo) {
                const url = resolvePortUrl(port);
                window.open(url, "_blank");
        }

        function startEditPort(port: PortInfo) {
                editingPort = port.port;
                editForm.description = port.description || "";
                editForm.url = resolvePortUrl(port);
        }

	function cancelEdit() {
		editingPort = null;
		editForm.description = "";
		editForm.url = "";
	}

	async function saveDescription(port: number) {
		error = "";
		success = "";

		try {
			const response = await fetch("/api/port-descriptions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					port,
					description: editForm.description,
					url: editForm.url,
				}),
			});
			const data = await response.json();

			if (data.success) {
				success = "포트 설명이 저장되었습니다";
				cancelEdit();
				await loadPorts();
				setTimeout(() => (success = ""), 3000);
			} else {
				error = data.error || "저장에 실패했습니다";
			}
		} catch (e) {
			error = "서버 연결에 실패했습니다";
		}
	}

	async function deleteDescription(port: number) {
		if (!confirm("이 포트의 설명을 삭제하시겠습니까?")) return;

		error = "";
		success = "";

		try {
			const response = await fetch("/api/port-descriptions", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ port }),
			});
			const data = await response.json();

			if (data.success) {
				success = "포트 설명이 삭제되었습니다";
				await loadPorts();
				setTimeout(() => (success = ""), 3000);
			} else {
				error = data.error || "삭제에 실패했습니다";
			}
		} catch (e) {
			error = "서버 연결에 실패했습니다";
		}
	}

        onMount(() => {
                const browserHost = typeof location !== "undefined" ? location.hostname : undefined;
                hostBase = buildHostBase(data?.hostIp || browserHost || "localhost");
                loadPorts();
        });

	$: filteredPorts = ports
		.filter(
			(p) =>
				p.port.toString().includes(searchTerm) ||
				p.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
				(p.service &&
					p.service
						.toLowerCase()
						.includes(searchTerm.toLowerCase())) ||
				(p.processName &&
					p.processName
						.toLowerCase()
						.includes(searchTerm.toLowerCase())) ||
				(p.description &&
					p.description
						.toLowerCase()
						.includes(searchTerm.toLowerCase())),
		)
		.sort((a, b) => {
			// 설명이 있는 포트를 먼저 표시
			const aHasDesc = a.description ? 1 : 0;
			const bHasDesc = b.description ? 1 : 0;
			if (aHasDesc !== bHasDesc) {
				return bHasDesc - aHasDesc; // 설명 있는 것이 먼저
			}
			// 설명 유무가 같으면 포트 번호로 정렬
			return a.port - b.port;
		});
</script>

<div class="space-y-4">
        <!-- Header & Stats -->
        <div class="flex flex-col md:flex-row gap-2 items-end justify-between">
                <div class="space-y-1">
                        <h2
                                class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400"
                        >
                                Network Overview
                        </h2>
                        <p class="text-slate-400 text-sm">
                                Monitor and manage your active server ports
                        </p>
                </div>

                <div class="flex gap-2">
                        <div
                                class="glass px-4 py-2 rounded-lg flex flex-col items-center min-w-[90px]"
                        >
                                <span
                                        class="text-xs text-slate-400 uppercase tracking-wider font-semibold"
                                        >Total</span
                                >
                                <span class="text-xl font-bold text-white leading-tight">{ports.length}</span
                                >
                        </div>
                        <div
                                class="glass px-4 py-2 rounded-lg flex flex-col items-center min-w-[90px]"
                        >
                                <span
                                        class="text-xs text-slate-400 uppercase tracking-wider font-semibold"
                                        >Open</span
                                >
                                <span class="text-xl font-bold text-green-400 leading-tight"
                                        >{ports.filter((p) => p.state === "open").length}</span
                                >
                        </div>
                </div>
        </div>

	<!-- Controls -->
        <div
                class="glass-card p-3 flex flex-col md:flex-row gap-2 justify-between items-center"
        >
		<div class="relative w-full md:w-96">
			<div
				class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
			>
				<svg
					class="h-5 w-5 text-slate-500"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<input
				type="text"
				placeholder="Search ports, services..."
				bind:value={searchTerm}
				class="glass-input w-full pl-10"
			/>
		</div>

                <div class="flex gap-2 w-full md:w-auto">
			<button
				on:click={findAvailablePort}
				disabled={findingPort}
				class="glass-btn-secondary flex-1 md:flex-none flex items-center justify-center gap-2 disabled:opacity-50"
			>
				{#if findingPort}
					<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
							fill="none"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
				{/if}
				<span>Find Port</span>
			</button>
			<button
				on:click={loadPorts}
				disabled={loading}
				class="glass-btn-primary flex-1 md:flex-none flex items-center justify-center gap-2 disabled:opacity-50"
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

	<!-- Notifications -->
	{#if availablePort}
                <div
                        class="p-3 bg-green-500/10 border border-green-500/20 text-green-200 rounded-lg flex items-center gap-2 animate-slide-up"
                >
			<svg
				class="h-5 w-5 text-green-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span
				>Available Port Found: <strong class="text-white"
					>{availablePort}</strong
				></span
			>
		</div>
	{/if}

	{#if success}
                <div
                        class="p-3 bg-green-500/10 border border-green-500/20 text-green-200 rounded-lg animate-slide-up"
                >
			{success}
		</div>
	{/if}

	{#if error}
                <div
                        class="p-3 bg-red-500/10 border border-red-500/20 text-red-200 rounded-lg animate-slide-up"
                >
			{error}
		</div>
	{/if}

	<!-- Data Table -->
        <div class="glass-card overflow-hidden p-0">
                {#if loading}
                        <div
                                class="text-center py-14 text-slate-400 flex flex-col items-center gap-3"
                        >
                                <div
                                        class="w-9 h-9 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"
                                ></div>
                                <p>Scanning ports...</p>
                        </div>
                {:else if filteredPorts.length === 0}
                        <div class="text-center py-14 text-slate-400">
                                <svg
                                        class="mx-auto h-10 w-10 text-slate-600 mb-3"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                >
                                        <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                </svg>
                                <p class="text-base">
                                        {searchTerm
                                                ? "No matching ports found"
                                                : "No open ports detected"}
                                </p>
                        </div>
                {:else}
                        <div class="overflow-x-auto">
                                <table class="w-full text-sm leading-tight">
                                        <thead>
                                                <tr class="border-b border-white/5 bg-white/5">
                                                        <th
                                                                class="text-left py-2.5 px-3 font-semibold text-slate-300"
                                                                >Port</th
                                                        >
                                                        <th
                                                                class="text-left py-2.5 px-3 font-semibold text-slate-300"
                                                                >Protocol</th
                                                        >
                                                        <th
                                                                class="text-left py-2.5 px-3 font-semibold text-slate-300"
                                                                >Status</th
                                                        >
                                                        <th
                                                                class="text-left py-2.5 px-3 font-semibold text-slate-300"
                                                                >Process</th
                                                        >
                                                        <th
                                                                class="text-left py-2.5 px-3 font-semibold text-slate-300"
                                                                >Description</th
                                                        >
                                                        <th
                                                                class="text-left py-2.5 px-3 font-semibold text-slate-300"
                                                                >Actions</th
                                                        >
                                                </tr>
                                        </thead>
                                        <tbody class="divide-y divide-white/5">
                                                {#each filteredPorts as port}
                                                        <tr
								class="hover:bg-white/5 transition-colors {editingPort ===
								port.port
									? 'bg-blue-500/5'
									: ''}"
							>
                                                                <td class="py-2 px-3">
                                                                        <button
										on:click={() => openPort(port)}
										class="font-mono text-blue-400 hover:text-blue-300 hover:underline transition-colors font-medium"
									>
										{port.port}
									</button>
								</td>
                                                                <td
                                                                        class="py-2 px-3 text-slate-400 font-mono text-sm"
                                                                        >{port.protocol.toUpperCase()}</td
                                                                >
                                                                <td class="py-2 px-3">
                                                                        <span
										class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {port.state ===
										'open'
											? 'bg-green-500/10 text-green-400 border border-green-500/20'
											: 'bg-red-500/10 text-red-400 border border-red-500/20'}"
									>
										<span
											class="w-1.5 h-1.5 rounded-full mr-1.5 {port.state ===
											'open'
												? 'bg-green-400 animate-pulse'
												: 'bg-red-400'}"
										></span>
										{port.state === "open"
											? "Active"
											: "Closed"}
									</span>
								</td>
                                                                <td class="py-2 px-3">
                                                                        {#if port.processName}
										<div class="flex flex-col">
											<span
												class="text-slate-200 font-medium"
												>{port.processName}</span
											>
											{#if port.pid}
												<span
													class="text-xs text-slate-500 font-mono"
													>PID: {port.pid}</span
												>
											{/if}
										</div>
									{:else}
										<span class="text-slate-600">-</span>
									{/if}
								</td>
                                                                <td class="py-2 px-3">
                                                                        {#if editingPort === port.port}
										<div
											class="flex flex-col gap-2 min-w-[200px]"
										>
											<input
												type="text"
												placeholder="Description"
												bind:value={
													editForm.description
												}
												class="glass-input py-1.5 text-sm"
											/>
											<input
												type="text"
												placeholder="URL (optional)"
												bind:value={editForm.url}
												class="glass-input py-1.5 text-sm"
											/>
										</div>
									{:else}
										<span
											class="text-slate-400 italic text-sm"
											>{port.description || "-"}</span
										>
									{/if}
								</td>
                                                                <td class="py-2 px-3">
                                                                        {#if editingPort === port.port}
                                                                                <div class="flex gap-2">
											<button
												class="p-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
												on:click={() =>
													saveDescription(port.port)}
												title="Save"
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
														d="M5 13l4 4L19 7"
													/>
												</svg>
											</button>
											<button
												class="p-1.5 rounded bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 transition"
												on:click={cancelEdit}
												title="Cancel"
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
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</button>
										</div>
									{:else}
										<div class="flex gap-2">
											<button
												class="p-1.5 rounded hover:bg-white/5 text-slate-400 hover:text-blue-400 transition"
												on:click={() =>
													startEditPort(port)}
												title="Edit"
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
														d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
													/>
												</svg>
											</button>
											{#if port.description}
												<button
													class="p-1.5 rounded hover:bg-white/5 text-slate-400 hover:text-red-400 transition"
													on:click={() =>
														deleteDescription(
															port.port,
														)}
													title="Delete"
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
															d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
														/>
													</svg>
												</button>
											{/if}
										</div>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
                        <div
                                class="px-4 py-2 border-t border-white/5 text-right text-slate-500 text-sm"
                        >
                                Showing {filteredPorts.length} ports
                        </div>
                {/if}
	</div>
</div>
