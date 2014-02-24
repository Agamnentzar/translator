var express = require('express')
  , http = require('http')
  , path = require('path')
  , less = require('less-middleware')
  , routes = require('./routes')
  , users = require('./routes/users')
  , sets = require('./routes/sets')
  , snapshots = require('./routes/snapshots')
  , api = require('./routes/api')
  , auth = require('./libs/auth')
  , cultures = require('./libs/cultures');

var isProduction = (process.env.NODE_ENV === 'production');
var staticContentAge = isProduction ? (7 * 24 * 3600 * 1000) : 0;
var admin = auth.admin;
var app = express();

app.set('port', process.env.PORT || 8097);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser('somesecretstringhere'));
app.use(express.methodOverride());
app.use(function (req, res, next) {
  var url = req.originalUrl;
  var index = url.substr(1).indexOf('/');
  res.locals.currentLocation = index === -1 ? url : url.substr(0, index + 1);
  next();
});
app.use(app.router);
app.use(require('less-middleware')({
  src: __dirname + "/src",
  dest: __dirname + "/public",
  optimization: isProduction ? 2 : 0,
  compress: isProduction,
  debug: !isProduction,
  once: isProduction
}));
app.use(express.static(__dirname + '/public', { maxAge: staticContentAge }));
app.locals.cultures = cultures;
app.locals.pretty = !isProduction;

if (!isProduction)
  app.use(express.errorHandler());

app.get('/', auth, routes.index);
app.get('/cultures', auth, routes.cultures);
app.post('/login', users.login);
app.get('/logout', auth, users.logout);

app.get('/api/get', auth, api.get);
app.post('/api/set', auth, api.set);
app.post('/api/add', auth, api.add);
app.post('/api/delete', auth, api.delete);

app.get('/users', admin, users.index);
app.get('/users/add', admin, users.add);
app.get('/users/edit/:id', auth, users.edit);
app.get('/users/delete/:id', admin, users.delete);
app.get('/users/restore/:id', admin, users.restore);
app.get('/users/admin/:id', admin, users.admin);
app.post('/users/add', admin, users.addPost);
app.post('/users/edit/:id', auth, users.editPost);

app.get('/sets', admin, sets.index);
app.get('/sets/add', admin, sets.add);
app.get('/sets/edit/:id', admin, sets.edit);
app.get('/sets/delete/:id', admin, sets.delete);
app.get('/sets/restore/:id', admin, sets.restore);
app.get('/sets/import/:id', admin, sets.import);
app.post('/sets/add', admin, sets.addPost);
app.post('/sets/edit/:id', admin, sets.editPost);
app.post('/sets/import/:id', admin, sets.importPost);

app.get('/snapshots', admin, snapshots.index);
app.get('/snapshots/add', admin, snapshots.add);
app.post('/snapshots/add', admin, snapshots.addPost);
app.get('/snapshots/edit/:id', admin, snapshots.edit);
app.post('/snapshots/edit/:id', admin, snapshots.editPost);
app.get('/snapshots/delete/:id', admin, snapshots.delete);
app.get('/snapshots/deleteSnapshot/:id', admin, snapshots.deleteSnapshot);
app.get('/snapshots/restore/:id', admin, snapshots.restore);
app.get('/snapshots/restoreSnapshot/:id', admin, snapshots.restoreSnapshot);
app.get('/snapshots/make/:id', admin, snapshots.make);
app.post('/snapshots/make/:id', admin, snapshots.makePost);

app.get('/id/:name/latest', snapshots.latestID);
app.get('/json/:name/live', snapshots.liveJSON);
app.get('/json/:name/latest', snapshots.latestJSON);
app.get('/json/:name/:id', snapshots.getJSON);
app.get('/vmt/:name/latest/:lang/:set', snapshots.latestVMT);
app.get('/vmt/:name/:id/:lang/:set', snapshots.getVMT);

auth.init(function (err) {
  if (err)
    console.log(err);

  http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
  });
})
