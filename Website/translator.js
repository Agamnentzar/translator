var express = require('express')
  , http = require('http')
  , path = require('path')
  , routes = require('./routes')
  , users = require('./routes/users')
  , sets = require('./routes/sets')
  , snapshots = require('./routes/snapshots')
  , changes = require('./routes/changes')
  , api = require('./routes/api')
  , tools = require('./routes/tools')
  , auth = require('./libs/auth')
  , cultures = require('./libs/cultures')
  , timestamp = require('./libs/timestamp.js')
;

var app = express();
var production = process.env.NODE_ENV === 'production';
var staticContentAge = production ? (1000 * 3600 * 24 * 365) : 0;
var admin = auth.admin;

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
  res.locals.timestamp = timestamp;
  next();
});
app.use(app.router);
app.use(express.compress());

app.use(express.static(path.join(__dirname, 'public'), { maxAge: staticContentAge }));
app.use(express.static(path.join(__dirname, 'build'), { maxAge: staticContentAge }));
app.use(express.static(path.join(__dirname, 'src'), { maxAge: staticContentAge }));

app.locals.cultures = cultures;

app.get('/', auth, routes.index);
app.get('/angular', auth, routes.angular);
app.get('/cultures', auth, routes.cultures);
app.post('/login', users.login);
app.get('/logout', auth, users.logout);

app.get('/api/get', auth, api.get);
app.get('/api/history', auth, api.history);
app.post('/api/set', auth, api.set);
app.post('/api/add', auth, api.add);
app.post('/api/move', auth, api.move);
app.post('/api/delete', auth, api.delete);
app.post('/api/changes', auth, api.changes);

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
app.post('/sets/add', admin, sets.addPost);
app.get('/sets/import', admin, sets.import);
app.post('/sets/import', admin, sets.importPost);
app.get('/sets/edit/:id', admin, sets.edit);
app.post('/sets/edit/:id', admin, sets.editPost);
app.get('/sets/delete/:id', admin, sets.delete);
app.get('/sets/restore/:id', admin, sets.restore);
app.get('/sets/export/:id', admin, sets.export);
app.get('/sets/clone/:id', admin, sets.clone);
app.post('/sets/clone/:id', admin, sets.clonePost);
app.get('/sets/versions/:id', admin, sets.versions);
app.get('/sets/new/:id', admin, sets.newVersion);
app.post('/sets/new/:id', admin, sets.newVersionPost);
app.get('/sets/version/delete/:id', admin, sets.deleteSnapshot);
app.get('/sets/version/restore/:id', admin, sets.restoreSnapshot);
app.get('/sets/print/:id', admin, sets.print);

app.get('/changes', admin, changes.index);

app.get('/id/:device/:name/latest', snapshots.latestID);
app.get('/json/:device/:name/live', snapshots.liveJSON);
app.get('/json/:device/:name/latest', snapshots.latestJSON);
app.get('/json/:device/:name/:id', snapshots.getJSON);
app.get('/vmt/:device/latest/:lang/:name', snapshots.latestVMT);
app.get('/vmt/:device/:id/:lang/:name', snapshots.getVMT);
app.get('/h/:device/:name/latest', snapshots.latestH);
app.get('/h/:device/:name/:id', snapshots.getH);

app.get('/qr', tools.qr);
app.post('/qr', tools.qrPost);

auth.init(function (err) {
  if (err)
    console.log(err);

  http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
  });
});
