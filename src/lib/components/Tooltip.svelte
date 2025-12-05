<script lang="ts">
	export let text: string;
</script>

<span class="relative inline-block group">
	<span class="text-slate-500 cursor-help">ⓘ</span>
	<span class="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute z-[1000] bottom-full left-1/2 -translate-x-1/2 mb-2 w-[200px] px-2 py-1.5 bg-slate-800 text-slate-200 text-[11px] leading-snug rounded border border-slate-600 pointer-events-none">
		{text}
		<span class="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-[5px] border-transparent border-t-slate-800"></span>
	</span>
</span>
