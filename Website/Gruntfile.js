module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		less: {
			dev: {
				options: {
					sourceMap: true,
					sourceMapFileInline: true,
					ieCompat: false,
				},
				files: { 'build/styles/style.css': 'src/styles/style.less' },
			},
			prod: {
				options: {
					compress: true,
					cleancss: true,
					ieCompat: false,
				},
				files: { 'build/styles/style.css': 'src/styles/style.less' },
			}
		},
		watch: {
			grunt: {
				files: ['Gruntfile.js']
			},
			css: {
				files: ['src/**/*.less'],
				tasks: ['less:dev'],
				options: { livereload: true }
			},
			jade: {
				files: ['views/**/*.jade'],
				options: { livereload: true },
			},
			express: {
				files: ['translator.js', 'libs/**/*.js', 'routes/**/*.js'],
				tasks: ['express:dev'],
				options: { spawn: false },
			},
		},
		express: {
			options: {
				script: 'translator.js',
				port: 8097,
				args: ['--color'],
			},
			dev: {
			},
			prod: {
				options: {
					node_env: 'production',
					background: false,
				}
			},
		},
	});

	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-express-server');

	grunt.registerTask('dev', ['less:dev', 'express:dev', 'watch']);
	grunt.registerTask('prod', ['less:prod', 'requirejs:compile', 'express:prod']);
};
