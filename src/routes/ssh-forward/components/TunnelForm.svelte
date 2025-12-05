<script lang="ts">
        import type { SSHConfigEntry, SSHForwardConfig } from "$lib/types";
        import Tooltip from "$lib/components/Tooltip.svelte";

        export let formData: SSHForwardConfig;
        export let loading = false;
        export let onSubmit: () => void | Promise<void>;
        export let onCancel: () => void;
        export let availableAliases: SSHConfigEntry[] = [];
        export let selectedAlias = "";
        export let onAliasChange: (alias: string) => void = () => {};

        $: selectedEntry = availableAliases.find(
                (alias) => alias.alias === selectedAlias,
        );
        $: onAliasChange(selectedAlias);

        let tooltips: Record<string, string> = {
                name: "터널을 구분하기 위한 이름입니다 (예: Production API, Dev Server)",
                portDescription: "대시보드에 표시될 포트 설명입니다 (선택사항)",
                localPort: "로컬 컴퓨터에서 사용할 포트 번호입니다",
                bindAddress:
                        "localhost는 현재 서버 안에서만 접근 가능, 0.0.0.0은 외부 다른 서버에서도 접근 가능합니다",
                remotePort: "원격 서버에서 실행 중인 서비스의 포트 번호입니다",
                remoteHost: "SSH 서버 내에서 접속할 호스트입니다 (대부분 localhost)",
                sshAlias: "SSH config 파일에 저장된 별칭을 사용하거나 수동으로 입력합니다",
                sshHost: "SSH 접속할 서버의 주소입니다 (IP 또는 도메인)",
                sshPort: "SSH 서버의 포트 번호입니다 (기본값: 22)",
                sshUser: "SSH 접속에 사용할 사용자 이름입니다",
        };
</script>

<div class="glass-card border-l-2 border-l-blue-600">
        <h3 class="text-sm font-semibold text-white mb-2">
                Configure New Tunnel
        </h3>
        <form on:submit|preventDefault={onSubmit} class="space-y-3">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-2">
                        <div
                                class="rounded border border-slate-800 bg-slate-900 p-2 space-y-2"
                        >
                                <div class="text-xs text-slate-500 font-medium">
                                        Configuration
                                </div>
                                <div>
                                        <label
                                                for="name"
                                                class="text-xs text-slate-400 flex items-center gap-1"
                                        >
                                                Name
                                                <Tooltip text={tooltips.name} />
                                        </label>
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
                                        <label
                                                for="portDescription"
                                                class="text-xs text-slate-400 flex items-center gap-1"
                                        >
                                                Description
                                                <Tooltip
                                                        text={tooltips.portDescription}
                                                />
                                        </label>
                                        <input
                                                id="portDescription"
                                                type="text"
                                                bind:value={
                                                        formData.portDescription
                                                }
                                                placeholder="API Server"
                                                class="glass-input w-full"
                                        />
                                </div>
                        </div>

                        <div
                                class="rounded border border-slate-800 bg-slate-900 p-2 space-y-2"
                        >
                                <div class="text-xs text-slate-500 font-medium">
                                        Forward Target
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                        <div>
                                                <label
                                                        for="localPort"
                                                        class="text-xs text-slate-400 flex items-center gap-1"
                                                >
                                                        Local Port
                                                        <Tooltip
                                                                text={tooltips.localPort}
                                                        />
                                                </label>
                                                <input
                                                        id="localPort"
                                                        type="number"
                                                        bind:value={
                                                                formData.localPort
                                                        }
                                                        placeholder="8080"
                                                        required
                                                        class="glass-input w-full [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                />
                                        </div>

                                        <div>
                                                <label
                                                        for="bindAddress"
                                                        class="text-xs text-slate-400 flex items-center gap-1"
                                                >
                                                        Bind Address
                                                        <Tooltip
                                                                text={tooltips.bindAddress}
                                                        />
                                                </label>
                                                <select
                                                        id="bindAddress"
                                                        bind:value={
                                                                formData.localBindAddress
                                                        }
                                                        class="glass-input w-full"
                                                >
                                                        <option
                                                                value="127.0.0.1"
                                                                >localhost
                                                                (127.0.0.1)</option
                                                        >
                                                        <option value="0.0.0.0"
                                                                >All interfaces
                                                                (0.0.0.0)</option
                                                        >
                                                </select>
                                        </div>

                                        <div>
                                                <label
                                                        for="remotePort"
                                                        class="text-xs text-slate-400 flex items-center gap-1"
                                                >
                                                        Remote Port
                                                        <Tooltip
                                                                text={tooltips.remotePort}
                                                        />
                                                </label>
                                                <input
                                                        id="remotePort"
                                                        type="number"
                                                        bind:value={
                                                                formData.remotePort
                                                        }
                                                        placeholder="3000"
                                                        required
                                                        class="glass-input w-full [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                />
                                        </div>

                                        <div>
                                                <label
                                                        for="remoteHost"
                                                        class="text-xs text-slate-400 flex items-center gap-1"
                                                >
                                                        Remote Host
                                                        <Tooltip
                                                                text={tooltips.remoteHost}
                                                        />
                                                </label>
                                                <input
                                                        id="remoteHost"
                                                        type="text"
                                                        bind:value={
                                                                formData.remoteHost
                                                        }
                                                        placeholder="localhost"
                                                        required
                                                        class="glass-input w-full"
                                                />
                                        </div>
                                </div>
                        </div>

                        <div
                                class="rounded border border-slate-800 bg-slate-900 p-2 space-y-2"
                        >
                                <div class="text-xs text-slate-500 font-medium">
                                        SSH Connection
                                </div>
                                <div>
                                        <label
                                                for="sshAlias"
                                                class="text-xs text-slate-400 flex items-center gap-1"
                                        >
                                                SSH Alias
                                                <Tooltip
                                                        text={tooltips.sshAlias}
                                                />
                                        </label>
                                        <select
                                                id="sshAlias"
                                                class="glass-input w-full"
                                                bind:value={selectedAlias}
                                        >
                                                <option value="">Manual</option>
                                                {#each availableAliases as alias}
                                                        <option
                                                                value={alias.alias}
                                                        >
                                                                {alias.alias}
                                                        </option>
                                                {/each}
                                        </select>
                                        {#if selectedEntry?.proxyJump}
                                                <div
                                                        class="text-[10px] text-violet-400 mt-1"
                                                >
                                                        ProxyJump: {selectedEntry.proxyJump}
                                                </div>
                                        {/if}
                                </div>

                                <div class="grid grid-cols-3 gap-2">
                                        <div class="col-span-2">
                                                <label
                                                        for="sshHost"
                                                        class="text-xs text-slate-400 flex items-center gap-1"
                                                >
                                                        SSH Host
                                                        <Tooltip
                                                                text={tooltips.sshHost}
                                                        />
                                                </label>
                                                <input
                                                        id="sshHost"
                                                        type="text"
                                                        bind:value={
                                                                formData.sshHost
                                                        }
                                                        placeholder="ssh.example.com"
                                                        required
                                                        class="glass-input w-full"
                                                />
                                        </div>

                                        <div>
                                                <label
                                                        for="sshPort"
                                                        class="text-xs text-slate-400 flex items-center gap-1"
                                                >
                                                        Port
                                                        <Tooltip
                                                                text={tooltips.sshPort}
                                                        />
                                                </label>
                                                <input
                                                        id="sshPort"
                                                        type="number"
                                                        bind:value={
                                                                formData.sshPort
                                                        }
                                                        placeholder="22"
                                                        class="glass-input w-full"
                                                />
                                        </div>
                                </div>

                                <div>
                                        <label
                                                for="sshUser"
                                                class="text-xs text-slate-400 flex items-center gap-1"
                                        >
                                                SSH User
                                                <Tooltip
                                                        text={tooltips.sshUser}
                                                />
                                        </label>
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
                        <button
                                type="button"
                                class="glass-btn-secondary"
                                on:click={onCancel}
                        >
                                Cancel
                        </button>
                </div>
        </form>
</div>
