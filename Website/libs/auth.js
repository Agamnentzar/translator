var crypto = require('crypto')
  , model = require('./model.js');

var User = model.User
  , Session = model.Session;

var sessions = {};

function randomString(length) {
  var characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var result = "";

  for (var i = 0; i < length; i++)
    result += characters[Math.floor(Math.random() * characters.length)];

  return result;
}

function getNewSessionId() {
  var sid = '';

  do {
    sid = randomString(20);
  } while (sessions[sid] !== undefined);

  return sid;
}

function authorize(req, res, next, admin) {
  var sessionId = req.cookies.sessionId;

  if (!sessionId || !sessions[sessionId] || (admin && !sessions[sessionId].user.admin))
    return res.render('login', { referer: req.originalUrl });

  req.session = sessions[sessionId];
  req.user = sessions[sessionId].user;
  res.locals.loggedInUser = req.user;
  next();
}

module.exports = function (req, res, next) {
  authorize(req, res, next, false);
};

module.exports.admin = function (req, res, next) {
  authorize(req, res, next, true);
};

module.exports.init = function (callback) {
  Session.find(function (err, ss) {
    if (!err) {
      ss.forEach(function (s) {
        sessions[s.sessionId] = {
          dbo: s,
          user: null,
          userId: s.userId,
          sessionId: s.sessionId
        };
      });

      module.exports.refresh();
    }

    if (callback)
      callback(err);
  });
};

module.exports.refresh = function () {
  User.find({ deleted: { $ne: true } }, function (err, users) {
    if (err)
      return console.log(err);

    if (users.length === 0) {
      var admin = new User();
      admin.name = 'Admin';
      admin.email = 'admin@admin';
      admin.password = exports.hash('admin');
      admin.admin = true;
      admin.save();
    }

    Object.keys(sessions).forEach(function (id) {
      var s = sessions[id];

      s.user = null;

      for (var i = 0; i < users.length; i++) {
        var u = users[i];

        if (s.userId == u.id) {
          s.user = u;
          break;
        }
      }

      if (s.user == null)
        delete sessions[id];
    });
  });
};

module.exports.login = function (res, email, password, callback) {
  callback = callback || function () { };

  User.findOne({ email: email, deleted: { $ne: true } }, function (err, user) {
    if (err)
      return callback(err, null);

    if (user === null)
      return callback('invalid login', null);

    if (user.password !== module.exports.hash(password))
      return callback('invalid password', null);

    var id = getNewSessionId();
    var session = new Session();
    session.userId = user._id;
    session.sessionId = id;
    session.save(function (err, s) {
      if (err)
        return callback(err, null);

      sessions[id] = { id: id, user: user, userId: user.id, dbo: s };
      res.cookie('sessionId', id);
      callback(null, sessions[id]);
    });
  });
};

module.exports.logout = function (res, sessionId) {
  var session = sessions[sessionId];

  if (session) {
    session.dbo.remove(function (err) {
      if (err)
        console.log(err);
    });

    delete sessions[sessionId];
  }

  res.clearCookie('sessionId');
};

module.exports.hash = function (password) {
  var sha = crypto.createHash('sha1');
  sha.update(password || '');
  return sha.digest('hex');
};