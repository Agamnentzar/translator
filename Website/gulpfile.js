var gulp = require('gulp')
	, sass = require('gulp-sass')
	, gulpif = require('gulp-if')
	, minifyCSS = require('gulp-minify-css')
	, sourcemaps = require('gulp-sourcemaps')
	, runSequence = require('run-sequence')
	, liveServer = require('gulp-live-server')
;

var dev = true;

gulp.task('set-prod', function () {
	dev = false;
});

gulp.task('sass', function () {
	return gulp.src('src/styles/style.scss')
		.pipe(gulpif(dev, sourcemaps.init()))
		.pipe(sass().on('error', sass.logError))
		.pipe(gulpif(!dev, minifyCSS({ keepSpecialComments: 0 })))
		.pipe(gulpif(dev, sourcemaps.write()))
		.pipe(gulp.dest('build/styles'));
});

gulp.task('server-prod', function () {
	var server = liveServer(['translator.js', '--color'], { env: { NODE_ENV: 'production' } }, false);
	server.start();
});

gulp.task('server-dev', function () {
	var server = liveServer(['translator.js', '--color'], {});
	server.start();

	gulp.watch(['build/styles/**/*.css'], server.notify.bind(server));
	gulp.watch(['src/scripts/**/*.js'], server.notify.bind(server));
	gulp.watch(['views/**/*.jade'], server.notify.bind(server));
	gulp.watch(['public/**/*'], server.notify.bind(server));
	gulp.watch(['translator.js', 'routes/**/*.js', 'libs/**/*.js'], function () {
		server.start();
	});
});

gulp.task('watch', function () {
	gulp.watch(['src/styles/**/*.scss'], ['sass']);
});

gulp.task('prod', function (done) {
	runSequence('set-prod', 'sass', 'server-prod', done);
});

gulp.task('dev', function (done) {
	runSequence('sass', ['server-dev', 'watch'], done);
});
