module.exports = {
	apps: [
		{
			name: 'dashboard',
			script: 'npm',
			args: 'run preview',
			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: '500M',
			env: {
				NODE_ENV: 'production',
				PORT: 4173
			},
			error_file: './logs/err.log',
			out_file: './logs/out.log',
			log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
			merge_logs: true
		}
	]
};
