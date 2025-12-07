<script>
	import '../app.css';
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>PortKnox - Secure Port Management & SSH Tunnel Dashboard</title>
	<meta
		name="description"
		content="PortKnox - Professional port monitoring and SSH tunnel management dashboard"
	/>
</svelte:head>

<div class="min-h-screen text-slate-100">
	<nav class="border-b border-slate-800 bg-slate-900">
		<div class="max-w-7xl mx-auto px-4">
			<div class="flex items-center justify-between h-10">
				<div class="flex items-center gap-4">
					<div class="flex items-center gap-2 text-m font-semibold text-slate-200">
						<img src="/favicon.png" alt="PortKnox" class="w-10 h-10" />
						PortKnox
					</div>
					<div class="flex items-baseline space-x-2 text-xs">
						<a
							href="/"
							class="px-2 py-1 rounded {$page.url.pathname === '/'
								? 'bg-slate-800 text-white'
								: 'text-slate-400 hover:text-slate-200'}"
						>
							Dashboard
						</a>
						<a
							href="/ssh-forward"
							class="px-2 py-1 rounded {$page.url.pathname === '/ssh-forward'
								? 'bg-slate-800 text-white'
								: 'text-slate-400 hover:text-slate-200'}"
						>
							SSH Forwarding
						</a>
					</div>
				</div>
			</div>
		</div>
	</nav>

	<main class="pt-4 pb-4 px-4 max-w-7xl mx-auto">
		<slot />
	</main>
</div>
