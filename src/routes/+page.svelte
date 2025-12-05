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

<div class="space-y-2">
        <!-- Header & Stats -->
        <div class="flex flex-col md:flex-row gap-2 items-end justify-between">
                <div>
                        <h2 class="text-lg font-semibold text-slate-200">
                                Network Overview
                        </h2>
                        <p class="text-slate-500 text-xs">
                                {ports.length} ports ({ports.filter((p) => p.state === "open").length} open)
                        </p>
                </div>
        </div>

	<!-- Controls -->
        <div class="glass-card flex flex-col md:flex-row gap-2 justify-between items-center">
		<input
			type="text"
			placeholder="Search..."
			bind:value={searchTerm}
			class="glass-input w-full md:w-64"
		/>

                <div class="flex gap-1 w-full md:w-auto">
			<button
				on:click={findAvailablePort}
				disabled={findingPort}
				class="glass-btn-secondary flex-1 md:flex-none disabled:opacity-50"
			>
				Find Port
			</button>
			<button
				on:click={loadPorts}
				disabled={loading}
				class="glass-btn-primary flex-1 md:flex-none disabled:opacity-50"
			>
				Refresh
			</button>
		</div>
	</div>

	<!-- Notifications -->
	{#if availablePort}
                <div class="p-2 bg-green-900 border border-green-700 text-green-200 rounded text-sm">
			Available Port: <strong>{availablePort}</strong>
		</div>
	{/if}

	{#if success}
                <div class="p-2 bg-green-900 border border-green-700 text-green-200 rounded text-sm">
			{success}
		</div>
	{/if}

	{#if error}
                <div class="p-2 bg-red-900 border border-red-700 text-red-200 rounded text-sm">
			{error}
		</div>
	{/if}

	<!-- Data Table -->
        <div class="glass-card overflow-hidden p-0">
                {#if loading}
                        <div class="text-center py-8 text-slate-400 text-sm">
                                Scanning ports...
                        </div>
                {:else if filteredPorts.length === 0}
                        <div class="text-center py-8 text-slate-500 text-sm">
                                {searchTerm ? "No matching ports found" : "No open ports detected"}
                        </div>
                {:else}
                        <div class="overflow-x-auto">
                                <table class="w-full text-xs">
                                        <thead>
                                                <tr class="border-b border-slate-800 bg-slate-900">
                                                        <th class="text-left py-1 px-2 font-medium text-slate-400">Port</th>
                                                        <th class="text-left py-1 px-2 font-medium text-slate-400">Protocol</th>
                                                        <th class="text-left py-1 px-2 font-medium text-slate-400">Status</th>
                                                        <th class="text-left py-1 px-2 font-medium text-slate-400">Process</th>
                                                        <th class="text-left py-1 px-2 font-medium text-slate-400">Description</th>
                                                        <th class="text-left py-1 px-2 font-medium text-slate-400">Actions</th>
                                                </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-800">
                                                {#each filteredPorts as port}
                                                        <tr class="hover:bg-slate-800/50 {editingPort === port.port ? 'bg-slate-800' : ''}">
                                                                <td class="py-1 px-2">
                                                                        <button
										on:click={() => openPort(port)}
										class="font-mono text-blue-400 hover:underline"
									>
										{port.port}
									</button>
								</td>
                                                                <td class="py-1 px-2 text-slate-400 font-mono">
										{port.protocol.toUpperCase()}
								</td>
                                                                <td class="py-1 px-2">
                                                                        <span class="text-xs {port.state === 'open' ? 'text-green-400' : 'text-red-400'}">
										{port.state === "open" ? "Active" : "Closed"}
									</span>
								</td>
                                                                <td class="py-1 px-2">
                                                                        {#if port.processName}
										<div class="text-slate-300">
											{port.processName}
											{#if port.pid}
												<span class="text-slate-600">({port.pid})</span>
											{/if}
										</div>
									{:else}
										<span class="text-slate-600">-</span>
									{/if}
								</td>
                                                                <td class="py-1 px-2">
                                                                        {#if editingPort === port.port}
										<div class="flex flex-col gap-1 min-w-[150px]">
											<input
												type="text"
												placeholder="Description"
												bind:value={editForm.description}
												class="glass-input"
											/>
											<input
												type="text"
												placeholder="URL"
												bind:value={editForm.url}
												class="glass-input"
											/>
										</div>
									{:else}
										<span class="text-slate-400">{port.description || "-"}</span>
									{/if}
								</td>
                                                                <td class="py-1 px-2">
                                                                        {#if editingPort === port.port}
                                                                                <div class="flex gap-1">
											<button
												class="px-1.5 py-0.5 text-xs rounded bg-green-800 text-green-200 hover:bg-green-700"
												on:click={() => saveDescription(port.port)}
												title="Save"
											>
												Save
											</button>
											<button
												class="px-1.5 py-0.5 text-xs rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
												on:click={cancelEdit}
												title="Cancel"
											>
												Cancel
											</button>
										</div>
									{:else}
										<div class="flex gap-1">
											<button
												class="px-1.5 py-0.5 text-xs rounded bg-slate-800 text-slate-400 hover:bg-slate-700"
												on:click={() => startEditPort(port)}
												title="Edit"
											>
												Edit
											</button>
											{#if port.description}
												<button
													class="px-1.5 py-0.5 text-xs rounded bg-slate-800 text-slate-400 hover:bg-red-900 hover:text-red-300"
													on:click={() => deleteDescription(port.port)}
													title="Delete"
												>
													Del
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
                        <div class="px-2 py-1 border-t border-slate-800 text-right text-slate-600 text-xs">
                                {filteredPorts.length} ports
                        </div>
                {/if}
	</div>
</div>
