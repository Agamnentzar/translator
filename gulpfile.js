var gulp = require('gulp');
var sass = require('gulp-sass');
var gulpif = require('gulp-if');
var minifyCSS = require('gulp-minify-css');
var sourcemaps = require('gulp-sourcemaps');
var liveServer = require('gulp-live-server');
var isDev = true;

const setProd = cb => {
	isDev = false;
	cb();
};

const buildSass = () => gulp.src('src/styles/style.scss')
	.pipe(gulpif(isDev, sourcemaps.init()))
	.pipe(sass().on('error', sass.logError))
	.pipe(gulpif(!isDev, minifyCSS({ keepSpecialComments: 0 })))
	.pipe(gulpif(isDev, sourcemaps.write()))
	.pipe(gulp.dest('build/styles'));

const serverProd = cb => {
	var server = liveServer(['translator.js', '--color'], { env: { NODE_ENV: 'production' } }, false);
	server.start();
	cb();
};

const serverDev = cb => {
	var server = liveServer(['translator.js', '--color'], {});
	server.start();

	gulp.watch(['build/styles/**/*.css'], server.notify.bind(server));
	gulp.watch(['src/scripts/**/*.js'], server.notify.bind(server));
	gulp.watch(['views/**/*.jade'], server.notify.bind(server));
	gulp.watch(['public/**/*'], server.notify.bind(server));
	gulp.watch(['translator.js', 'routes/**/*.js', 'libs/**/*.js'], function () {
		server.start();
	});
	cb();
};

const watch = cb => {
	gulp.watch(['src/styles/**/*.scss'], buildSass);
	cb();
};

const prod = gulp.series(setProd, buildSass, serverProd);
const dev = gulp.series(buildSass, serverDev, watch);

module.exports = { watch, prod, dev };
