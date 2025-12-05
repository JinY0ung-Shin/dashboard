<script lang="ts">
        import type { SSHConfigEntry, SSHForwardConfig } from "$lib/types";

        export let formData: SSHForwardConfig;
        export let loading = false;
        export let onSubmit: () => void | Promise<void>;
        export let onCancel: () => void;
        export let availableAliases: SSHConfigEntry[] = [];
        export let selectedAlias = "";
        export let onAliasChange: (alias: string) => void = () => {};

        $: selectedEntry = availableAliases.find((alias) => alias.alias === selectedAlias);
        $: onAliasChange(selectedAlias);
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
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div class="rounded-xl border border-white/5 bg-slate-900/50 p-4 space-y-4">
                                <div class="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                                        <span>Configuration</span>
                                        <span class="h-px flex-1 mx-2 bg-white/5"></span>
                                </div>
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

                        <div class="rounded-xl border border-white/5 bg-slate-900/50 p-4 space-y-4">
                                <div class="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                                        <span>Forward Target</span>
                                        <span class="h-px flex-1 mx-2 bg-white/5"></span>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                </div>
                        </div>

                        <div class="rounded-xl border border-white/5 bg-slate-900/50 p-4 space-y-4">
                                <div class="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                                        <span>SSH Connection</span>
                                        <span class="h-px flex-1 mx-2 bg-white/5"></span>
                                </div>
                                <div class="space-y-2">
                                        <label for="sshAlias" class="text-sm font-medium text-slate-300"
                                                >SSH Alias</label
                                        >
                                        <select
                                                id="sshAlias"
                                                class="glass-input w-full"
                                                bind:value={selectedAlias}
                                        >
                                                <option value="">Manual entry</option>
                                                {#each availableAliases as alias}
                                                        <option value={alias.alias}>
                                                                {alias.alias}
                                                                {alias.hostName ? ` (${alias.hostName})` : ""}
                                                        </option>
                                                {/each}
                                        </select>
                                        <div class="space-y-1">
                                                <p class="text-xs text-slate-500">Loaded from ~/.ssh/config</p>
                                                {#if selectedEntry?.proxyJump}
                                                        <div class="flex items-center gap-2 text-xs text-slate-300">
                                                                <span class="px-2 py-1 rounded-full bg-slate-800/60 text-[11px] text-blue-300">ProxyJump</span>
                                                                <span class="font-mono text-slate-200">{selectedEntry.proxyJump}</span>
                                                        </div>
                                                {/if}
                                        </div>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div class="space-y-2 md:col-span-2">
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
