<script lang="ts">
        import { onMount, onDestroy } from "svelte";
        import TunnelForm from "./components/TunnelForm.svelte";
        import ForwardCard from "./components/ForwardCard.svelte";
        import type {
                SSHConfigEntry,
                SSHForwardConfig,
        } from "$lib/types";

        let forwards: SSHForwardConfig[] = [];
        let loading = false;
        let error = "";
        let success = "";
        let showForm = false;

        let formData: SSHForwardConfig = {
                name: "",
                remoteHost: "localhost",
                remotePort: null as any,
                localPort: null as any,
                localBindAddress: "127.0.0.1",
                sshUser: "",
                sshHost: "",
                sshPort: 22,
                author: "",
        };

        let configEntries: SSHConfigEntry[] = [];
        let configLoading = false;
        let configError = "";
        let sshConfigPath = "";
        let selectedAlias = "";
        let statusCheckInterval: ReturnType<typeof setInterval> | null = null;
        let findingPort = false;

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
                                if (selectedAlias && !configEntries.find((entry) => entry.alias === selectedAlias)) {
                                        selectedAlias = "";
                                }
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
                                await resetForm();
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

        async function findAvailablePort() {
                findingPort = true;
                try {
                        const response = await fetch("/api/ports", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                        action: "find-available",
                                        startPort: 50000,
                                        endPort: 60000,
                                }),
                        });
                        const data = await response.json();

                        if (data.success && data.port) {
                                formData.localPort = data.port;
                        }
                } catch (e) {
                        console.error("Failed to find available port:", e);
                } finally {
                        findingPort = false;
                }
        }

        async function resetForm() {
                formData = {
                        name: "",
                        remoteHost: "localhost",
                        remotePort: null as any,
                        localPort: null as any,
                        localBindAddress: "127.0.0.1",
                        sshUser: "",
                        sshHost: "",
                        sshPort: 22,
                        author: "",
                };
                selectedAlias = "";

                // 자동으로 사용 가능한 포트 찾기
                await findAvailablePort();
        }

        function handleAliasChange(alias: string) {
                selectedAlias = alias;
                const entry = configEntries.find((item) => item.alias === alias);
                if (!entry) {
                        // Manual 모드: user를 빈 문자열로 설정하여 시스템 사용자 사용
                        formData = {
                                ...formData,
                                sshUser: "",
                        };
                        return;
                }

                // SSH Alias 선택: Config의 user 사용 (없으면 빈 문자열)
                formData = {
                        ...formData,
                        sshHost: entry.hostName || entry.alias,
                        sshPort: entry.port ?? 22,
                        sshUser: entry.user || "",
                };
        }

        async function applyToTunnel(entry: SSHConfigEntry) {
                await resetForm();
                showForm = true;
                handleAliasChange(entry.alias);
        }

        async function toggleForm() {
                if (!showForm) {
                        // 폼을 열 때 자동으로 사용 가능한 포트 찾기
                        await resetForm();
                        showForm = true;
                } else {
                        // 폼을 닫을 때
                        showForm = false;
                }
        }

        onMount(() => {
                loadForwards();
                loadConfigEntries();

                // 5초마다 상태 확인
                statusCheckInterval = setInterval(() => {
                        loadForwards();
                }, 5000);
        });

        onDestroy(() => {
                // interval 정리
                if (statusCheckInterval) {
                        clearInterval(statusCheckInterval);
                }
        });
</script>

<div class="space-y-2">
        <div class="flex items-center justify-between">
                <div>
                        <h2 class="text-lg font-semibold text-slate-200">
                                SSH Tunnels
                        </h2>
                        <p class="text-slate-500 text-xs">
                                {forwards.length} tunnels
                        </p>
                </div>
                <div class="flex gap-1">
                        <button
                                on:click={toggleForm}
                                class="glass-btn-secondary"
                        >
                                {showForm ? "Cancel" : "New Tunnel"}
                        </button>
                        <button
                                on:click={loadForwards}
                                disabled={loading}
                                class="glass-btn-primary disabled:opacity-50"
                        >
                                Refresh
                        </button>
                </div>
        </div>

        <div class="glass-card">
                <div class="flex items-center justify-between gap-2">
                        <div class="text-xs text-slate-400">
                                SSH aliases <span class="text-slate-600">{sshConfigPath || "~/.ssh/config"}</span>
                        </div>
                        <button
                                on:click={loadConfigEntries}
                                disabled={configLoading}
                                class="glass-btn-secondary disabled:opacity-50"
                        >
                                Reload
                        </button>
                </div>

                {#if configError}
                        <div class="mt-2 text-xs text-red-300 bg-red-900 border border-red-700 rounded p-2">
                                {configError}
                        </div>
                {/if}

                <div class="mt-2">
                        {#if configLoading && configEntries.length === 0}
                                <div class="text-center py-4 text-slate-500 text-xs">
                                        Loading...
                                </div>
                        {:else if configEntries.length === 0}
                                <div class="text-xs text-slate-500">
                                        No aliases found
                                </div>
                        {:else}
                                <div class="flex flex-wrap gap-1">
                                        {#each configEntries as entry}
                                                <button
                                                        class="px-2 py-1 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                                                        on:click={() => applyToTunnel(entry)}
                                                        title={entry.alias}
                                                >
                                                        {entry.alias}
                                                        {#if entry.proxyJump}
                                                                <span class="text-[10px] text-violet-400">*</span>
                                                        {/if}
                                                        {#if entry.hostName}
                                                                <span class="text-slate-600 ml-1">{entry.hostName}</span>
                                                        {/if}
                                                </button>
                                        {/each}
                                </div>
                        {/if}
                </div>
        </div>

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

        {#if showForm}
                <TunnelForm
                        bind:formData
                        bind:selectedAlias
                        availableAliases={configEntries}
                        {loading}
                        onAliasChange={handleAliasChange}
                        onSubmit={createForward}
                        onCancel={() => (showForm = false)}
                />
        {/if}

        <div>
                {#if loading && forwards.length === 0}
                        <div class="text-center py-8 text-slate-500 text-sm">
                                Loading...
                        </div>
                {:else if forwards.length === 0}
                        <div class="text-center py-8 glass-card border-dashed border-slate-700">
                                <p class="text-slate-500 text-sm mb-2">No active tunnels</p>
                                <button
                                        on:click={toggleForm}
                                        class="glass-btn-primary"
                                >
                                        Create Tunnel
                                </button>
                        </div>
                {:else}
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {#each forwards as forward}
                                        <ForwardCard {forward} onStop={stopForward} />
                                {/each}
                        </div>
                {/if}
        </div>

</div>
