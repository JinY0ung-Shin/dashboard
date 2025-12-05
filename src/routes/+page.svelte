<script lang="ts">
	import { onMount } from "svelte";
	import type { PortInfo } from "$lib/types";

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

	function openPort(port: PortInfo) {
		const url = port.url || `http://localhost:${port.port}`;
		window.open(url, "_blank");
	}

	function startEditPort(port: PortInfo) {
		editingPort = port.port;
		editForm.description = port.description || "";
		editForm.url = port.url || `http://localhost:${port.port}`;
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
                        const aHasDesc = a.description ? 1 : 0;
                        const bHasDesc = b.description ? 1 : 0;

                        if (aHasDesc !== bHasDesc) {
                                return bHasDesc - aHasDesc;
                        }

                        return a.port - b.port;
                });

        $: totalPorts = ports.length;
        $: openPorts = ports.filter((p) => p.state === "open").length;
        $: describedPorts = ports.filter((p) => p.description).length;
</script>

<div class="space-y-5 lg:space-y-4">
        <!-- Header, Filters, Stats -->
        <div class="grid gap-3 xl:grid-cols-[1.8fr_1fr]">
                <div class="panel flex flex-col gap-3">
                        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                        <h2 class="text-2xl font-semibold">포트 모니터링</h2>
                                        <p class="text-slate-500 text-sm">서버 포트 상태를 확인하고 관리하세요.</p>
                                </div>
                                <div class="text-xs text-slate-500 sm:text-right">
                                        총 {totalPorts}개 중 <span class="font-medium text-slate-700">{filteredPorts.length}</span>개 표시
                                </div>
                        </div>

                        <div class="flex flex-wrap items-center gap-2">
                                <div class="flex-1 min-w-[220px] max-w-md">
                                        <label class="sr-only" for="search">검색</label>
                                        <div class="relative">
                                                <div
                                                        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"
                                                >
                                                        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path
                                                                        fill-rule="evenodd"
                                                                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                                                        clip-rule="evenodd"
                                                                />
                                                        </svg>
                                                </div>
                                                <input
                                                        id="search"
                                                        type="text"
                                                        placeholder="포트, 서비스 검색"
                                                        bind:value={searchTerm}
                                                        class="input pl-9"
                                                />
                                        </div>
                                </div>

                                <div class="flex gap-2">
                                        <button
                                                on:click={findAvailablePort}
                                                disabled={findingPort}
                                                class="btn-secondary min-w-[120px] disabled:opacity-50"
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
                                                <span>빈 포트 찾기</span>
                                        </button>
                                        <button
                                                on:click={loadPorts}
                                                disabled={loading}
                                                class="btn-primary min-w-[120px] disabled:opacity-50"
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
                                                <span>새로고침</span>
                                        </button>
                                </div>
                        </div>
                </div>

                <div class="panel grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div class="flex flex-col gap-0.5 p-2 rounded border border-slate-100">
                                <span class="text-[11px] uppercase tracking-wide text-slate-500">전체</span>
                                <span class="text-xl font-semibold">{totalPorts}</span>
                        </div>
                        <div class="flex flex-col gap-0.5 p-2 rounded border border-slate-100">
                                <span class="text-[11px] uppercase tracking-wide text-slate-500">Open</span>
                                <span class="text-xl font-semibold text-green-700">{openPorts}</span>
                        </div>
                        <div class="flex flex-col gap-0.5 p-2 rounded border border-slate-100">
                                <span class="text-[11px] uppercase tracking-wide text-slate-500">설명 있음</span>
                                <span class="text-xl font-semibold text-blue-700">{describedPorts}</span>
                        </div>
                </div>
        </div>

	<!-- Notifications -->
        {#if availablePort}
                <div class="panel border-green-200 bg-green-50 text-green-800 flex items-center gap-2">
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                        </svg>
                        <span>사용 가능한 포트: <strong>{availablePort}</strong></span>
                </div>
        {/if}

        {#if success}
                <div class="panel border-green-200 bg-green-50 text-green-800">{success}</div>
        {/if}

        {#if error}
                <div class="panel border-red-200 bg-red-50 text-red-800">{error}</div>
        {/if}

	<!-- Data Table -->
        <div class="panel p-0 overflow-hidden">
                {#if loading}
                        <div class="text-center py-12 text-slate-500 text-sm flex flex-col items-center gap-3">
                                <div class="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                                <p>포트 정보를 불러오는 중입니다...</p>
                        </div>
                {:else if filteredPorts.length === 0}
                        <div class="text-center py-12 text-slate-500">
                                <p class="text-sm">
                                        {searchTerm ? "해당 조건의 포트가 없습니다" : "표시할 포트가 없습니다"}
                                </p>
                        </div>
                {:else}
                        <div class="overflow-x-auto">
                                <table class="w-full text-sm table-dense">
                                        <thead class="bg-slate-100 text-slate-700">
                                                <tr>
                                                        <th class="text-left font-semibold">Port</th>
                                                        <th class="text-left font-semibold">Protocol</th>
                                                        <th class="text-left font-semibold">Status</th>
                                                        <th class="text-left font-semibold">Process</th>
                                                        <th class="text-left font-semibold">Description</th>
                                                        <th class="text-left font-semibold">Actions</th>
                                                </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-200">
                                                {#each filteredPorts as port}
                                                        <tr
                                                                class="hover:bg-slate-50 transition-colors {editingPort ===
                                                                port.port
                                                                        ? 'bg-blue-50'
                                                                        : ''}"
                                                        >
                                                                <td>
                                                                        <button
                                                                                on:click={() => openPort(port)}
                                                                                class="font-mono text-blue-600 hover:underline"
                                                                        >
                                                                                {port.port}
                                                                        </button>
                                                                </td>
                                                                <td class="text-slate-600 font-mono text-sm">{port.protocol.toUpperCase()}</td>
                                                                <td>
                                                                        <span
                                                                                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border {port.state ===
                                                                                'open'
                                                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                                                        : 'bg-red-50 text-red-700 border-red-200'}"
                                                                        >
                                                                                <span
                                                                                        class="w-1.5 h-1.5 rounded-full mr-1.5 {port.state ===
                                                                                        'open'
                                                                                                ? 'bg-green-500'
                                                                                                : 'bg-red-500'}"
                                                                                ></span>
                                                                                {port.state === "open"
                                                                                        ? "Active"
                                                                                        : "Closed"}
                                                                        </span>
                                                                </td>
                                                                <td>
                                                                        {#if port.processName}
                                                                                <div class="flex flex-col">
                                                                                        <span class="text-slate-900 font-medium">{port.processName}</span>
                                                                                        {#if port.pid}
                                                                                                <span
                                                                                                        class="text-xs text-slate-500 font-mono"
                                                                                                        >PID: {port.pid}</span
                                                                                                >
                                                                                        {/if}
                                                                                </div>
                                                                        {:else}
                                                                                <span class="text-slate-400">-</span>
                                                                        {/if}
                                                                </td>
                                                                <td>
                                                                        {#if editingPort === port.port}
                                                                                <div class="flex flex-col gap-2 min-w-[220px]">
                                                                                        <input
                                                                                                type="text"
                                                                                                placeholder="Description"
                                                                                                bind:value={
                                                                                                        editForm.description
                                                                                                }
                                                                                                class="input py-2 text-sm"
                                                                                        />
                                                                                        <input
                                                                                                type="text"
                                                                                                placeholder="URL (optional)"
                                                                                                bind:value={editForm.url}
                                                                                                class="input py-2 text-sm"
                                                                                        />
                                                                                </div>
                                                                        {:else}
                                                                                <div class="flex flex-col gap-1 min-w-[220px]">
                                                                                        <span class="text-slate-700 text-sm">{port.description || "-"}</span>
                                                                                        {#if port.url}
                                                                                                <a
                                                                                                        class="text-xs text-blue-600 hover:underline truncate"
                                                                                                        href={port.url}
                                                                                                        target="_blank"
                                                                                                        rel="noreferrer"
                                                                                                        >{port.url}</a
                                                                                                >
                                                                                        {/if}
                                                                                </div>
                                                                        {/if}
                                                                </td>
                                                                <td>
                                                                        {#if editingPort === port.port}
                                                                                <div class="flex gap-2">
                                                                                        <button
                                                                                                class="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 transition"
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
                                                                                                class="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
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
                                                                                                class="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition"
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
                                                                                                        class="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-red-600 transition"
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
                        <div class="px-3 sm:px-4 py-3 border-t border-slate-200 text-right text-slate-500 text-sm">
                                총 {filteredPorts.length}개의 포트
                        </div>
                {/if}
        </div>
</div>
