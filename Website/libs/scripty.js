var fs = require('fs')
  , uglifyJS = require("uglify-js");

module.exports = function (app, options) {
  var scripts = JSON.parse(fs.readFileSync(options.scripts, { encoding: 'utf-8' }));

  app.locals.scripts = function (key) {
    return scripts[key] || '';
  };

  if (options.debug) {
    Object.keys(scripts).forEach(function (key) {
      scripts[key] = scripts[key].map(function (src) {
        return '<script src="' + src + '"></script>';
      }).join('\n');
    });
  } else {
    fs.readdirSync(options.output).forEach(function (file) {
      fs.unlinkSync(options.output + '/' + file);
    });

    Object.keys(scripts).forEach(function (key) {
      var paths = scripts[key].map(function (src) { return options.source + src; });
      var minified = uglifyJS.minify(paths);
      var name = '/' + key + '-' + (Date.now() % 100000) + '.js';
      scripts[key] = ['/scripts' + name];
      fs.writeFileSync(options.output + name, minified.code);
    });
  }
};
