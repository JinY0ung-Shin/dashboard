<script>
	import "../app.css";
	import { page } from "$app/stores";
</script>

<div
	class="min-h-screen text-slate-100 selection:bg-blue-500/30 selection:text-blue-200"
>
	<nav class="fixed top-0 left-0 w-full z-50 glass border-b-0 border-white/5">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between h-16">
				<div class="flex items-center gap-8">
					<div class="flex-shrink-0">
						<span
							class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400"
						>
							PortDash
						</span>
					</div>
					<div class="hidden md:block">
						<div class="flex items-baseline space-x-4">
							<a
								href="/"
								class="px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 {$page
									.url.pathname === '/'
									? 'bg-white/10 text-white shadow-lg shadow-blue-900/20'
									: 'text-slate-300 hover:bg-white/5 hover:text-white'}"
							>
								Dashboard
							</a>
							<a
								href="/ssh-forward"
								class="px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 {$page
									.url.pathname === '/ssh-forward'
									? 'bg-white/10 text-white shadow-lg shadow-blue-900/20'
									: 'text-slate-300 hover:bg-white/5 hover:text-white'}"
							>
								SSH Forwarding
							</a>
						</div>
					</div>
				</div>
				<div>
					<div
						class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse"
					></div>
				</div>
			</div>
		</div>
	</nav>

	<main
		class="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in"
	>
		<slot />
	</main>
</div>
