<script lang="ts">
        import { onMount } from "svelte";
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
        let sshConfigPath = "";
        let selectedAlias = "";

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
                selectedAlias = "";
        }

        function handleAliasChange(alias: string) {
                selectedAlias = alias;
                const entry = configEntries.find((item) => item.alias === alias);
                if (!entry) return;

                formData = {
                        ...formData,
                        sshHost: entry.hostName || entry.alias,
                        sshPort: entry.port ?? 22,
                        sshUser: entry.user || formData.sshUser,
                };
        }

        function applyToTunnel(entry: SSHConfigEntry) {
                showForm = true;
                handleAliasChange(entry.alias);
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

        <div class="bg-slate-900/40 border border-white/5 rounded-xl p-3 md:p-4 shadow-lg shadow-black/20">
                <div class="flex items-center justify-between gap-3 flex-wrap">
                        <div class="flex items-center gap-2 text-sm text-slate-200">
                                <svg class="h-4 w-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M12 11c1.657 0 3-1.79 3-4s-1.343-4-3-4-3 1.79-3 4 1.343 4 3 4zM5.5 21a6.5 6.5 0 0113 0"
                                        />
                                </svg>
                                <span class="font-semibold">사용가능한 SSH aliases</span>
                                <span class="text-slate-500 text-xs">{sshConfigPath || "~/.ssh/config"}</span>
                        </div>

                        <button
                                on:click={loadConfigEntries}
                                disabled={configLoading}
                                class="text-xs px-3 py-1 rounded-lg border border-white/10 bg-white/5 text-slate-200 flex items-center gap-2 disabled:opacity-50"
                        >
                                <svg
                                        class="h-3.5 w-3.5"
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
                                <span>새로고침</span>
                        </button>
                </div>

                {#if configError}
                        <div class="mt-3 text-xs text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg p-3 animate-slide-up">
                                {configError}
                        </div>
                {/if}

                <div class="mt-3 space-y-3">
                        {#if configLoading && configEntries.length === 0}
                                <div class="text-center py-4 text-slate-400 text-sm">
                                        <div class="w-6 h-6 border-4 border-violet-400/30 border-t-violet-400 rounded-full animate-spin mx-auto mb-2"></div>
                                        <p>Loading SSH aliases...</p>
                                </div>
                        {:else if configEntries.length === 0}
                                <div class="text-sm text-slate-400 flex items-center gap-2">
                                        <svg class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                                />
                                        </svg>
                                        <span>등록된 alias가 없습니다. ~/.ssh/config의 Host 블록을 참고하세요.</span>
                                </div>
                        {:else}
                                <div class="flex flex-wrap gap-2">
                                        {#each configEntries as entry}
                                                <button
                                                        class="group px-3 py-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-left text-xs text-slate-200 transition"
                                                        on:click={() => applyToTunnel(entry)}
                                                        title={`Alias 적용: ${entry.alias}`}
                                                >
                                                        <div class="flex items-center gap-2">
                                                                <span class="font-semibold text-white">{entry.alias}</span>
                                                                {#if entry.proxyJump}
                                                                        <span class="text-[10px] text-violet-200 bg-violet-500/20 border border-violet-400/30 rounded-full px-2 py-0.5">
                                                                                ProxyJump → {entry.proxyJump}
                                                                        </span>
                                                                {/if}
                                                        </div>
                                                        {#if entry.hostName}
                                                                <div class="text-slate-400 text-[11px] mt-1">{entry.hostName}:{entry.port ?? 22}</div>
                                                        {/if}
                                                </button>
                                        {/each}
                                </div>
                        {/if}
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

</div>
