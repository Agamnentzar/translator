var express = require('express')
  , http = require('http')
  , path = require('path')
  , less = require('less-middleware')
  , routes = require('./routes')
  , users = require('./routes/users')
  , sets = require('./routes/sets')
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

app.get('/users', admin, users.index);
app.get('/users/add', admin, users.add);
app.get('/users/edit', auth, users.edit);
app.get('/users/delete', admin, users.delete);
app.get('/users/admin', admin, users.admin);
app.post('/users/add', admin, users.addPost);
app.post('/users/edit', auth, users.editPost);

app.get('/sets', admin, sets.index);
app.get('/sets/delete', admin, sets.delete);
app.get('/sets/add', admin, sets.add);
app.get('/sets/edit', admin, sets.edit);
app.post('/sets/add', admin, sets.addPost);
app.post('/sets/edit', admin, sets.editPost);

auth.init(function (err) {
  if (err)
    console.log(err);

  http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
  });
})
