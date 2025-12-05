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

<div class="glass-card border-l-2 border-l-blue-600">
        <h3 class="text-sm font-semibold text-white mb-2">
                Configure New Tunnel
        </h3>
        <form on:submit|preventDefault={onSubmit} class="space-y-3">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-2">
                        <div class="rounded border border-slate-800 bg-slate-900 p-2 space-y-2">
                                <div class="text-xs text-slate-500 font-medium">Configuration</div>
                                <div>
                                        <label for="name" class="text-xs text-slate-400">Name</label>
                                        <input
                                                id="name"
                                                type="text"
                                                bind:value={formData.name}
                                                placeholder="Production API"
                                                required
                                                class="glass-input w-full"
                                        />
                                </div>
                                <div>
                                        <label for="portDescription" class="text-xs text-slate-400">Description</label>
                                        <input
                                                id="portDescription"
                                                type="text"
                                                bind:value={formData.portDescription}
                                                placeholder="API Server"
                                                class="glass-input w-full"
                                        />
                                </div>
                        </div>

                        <div class="rounded border border-slate-800 bg-slate-900 p-2 space-y-2">
                                <div class="text-xs text-slate-500 font-medium">Forward Target</div>
                                <div class="grid grid-cols-2 gap-2">
                                        <div>
                                                <label for="localPort" class="text-xs text-slate-400">Local Port</label>
                                                <input
                                                        id="localPort"
                                                        type="number"
                                                        bind:value={formData.localPort}
                                                        placeholder="8080"
                                                        required
                                                        class="glass-input w-full"
                                                />
                                        </div>

                                        <div>
                                                <label for="remotePort" class="text-xs text-slate-400">Remote Port</label>
                                                <input
                                                        id="remotePort"
                                                        type="number"
                                                        bind:value={formData.remotePort}
                                                        placeholder="3000"
                                                        required
                                                        class="glass-input w-full"
                                                />
                                        </div>

                                        <div class="col-span-2">
                                                <label for="remoteHost" class="text-xs text-slate-400">Remote Host</label>
                                                <input
                                                        id="remoteHost"
                                                        type="text"
                                                        bind:value={formData.remoteHost}
                                                        placeholder="localhost"
                                                        required
                                                        class="glass-input w-full"
                                                />
                                        </div>
                                </div>
                        </div>

                        <div class="rounded border border-slate-800 bg-slate-900 p-2 space-y-2">
                                <div class="text-xs text-slate-500 font-medium">SSH Connection</div>
                                <div>
                                        <label for="sshAlias" class="text-xs text-slate-400">SSH Alias</label>
                                        <select
                                                id="sshAlias"
                                                class="glass-input w-full"
                                                bind:value={selectedAlias}
                                        >
                                                <option value="">Manual</option>
                                                {#each availableAliases as alias}
                                                        <option value={alias.alias}>
                                                                {alias.alias}
                                                        </option>
                                                {/each}
                                        </select>
                                        {#if selectedEntry?.proxyJump}
                                                <div class="text-[10px] text-violet-400 mt-1">ProxyJump: {selectedEntry.proxyJump}</div>
                                        {/if}
                                </div>

                                <div class="grid grid-cols-3 gap-2">
                                        <div class="col-span-2">
                                                <label for="sshHost" class="text-xs text-slate-400">SSH Host</label>
                                                <input
                                                        id="sshHost"
                                                        type="text"
                                                        bind:value={formData.sshHost}
                                                        placeholder="ssh.example.com"
                                                        required
                                                        class="glass-input w-full"
                                                />
                                        </div>

                                        <div>
                                                <label for="sshPort" class="text-xs text-slate-400">Port</label>
                                                <input
                                                        id="sshPort"
                                                        type="number"
                                                        bind:value={formData.sshPort}
                                                        placeholder="22"
                                                        class="glass-input w-full"
                                                />
                                        </div>
                                </div>

                                <div>
                                        <label for="sshUser" class="text-xs text-slate-400">SSH User</label>
                                        <input
                                                id="sshUser"
                                                type="text"
                                                bind:value={formData.sshUser}
                                                placeholder="ubuntu"
                                                required
                                                class="glass-input w-full"
                                        />
                                </div>
                        </div>
                </div>

                <div class="flex gap-1 pt-2 border-t border-slate-800">
                        <button
                                type="submit"
                                class="glass-btn-primary disabled:opacity-50"
                                disabled={loading}
                        >
                                Start Tunnel
                        </button>
                        <button type="button" class="glass-btn-secondary" on:click={onCancel}>
                                Cancel
                        </button>
                </div>
        </form>
</div>
