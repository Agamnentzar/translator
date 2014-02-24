var model = require('../libs/model.js')
  , utils = require('../libs/utils.js')
  , auth = require('../libs/auth.js')
  , cultures = require('../libs/cultures.js');

var User = model.User
  , Set = model.Set;

function getPersmissions(req) {
  var permissions = [];

  Object.keys(req.body.permissions || {}).forEach(function (id) {
    permissions[permissions.length] = {
      setId: id,
      permissions: req.body.permissions[id]
    };
  });

  return permissions;
}

exports.index = function (req, res) {
  User.find().sort('_id').exec(function (err, users) {
    if (err)
      return res.render('error', { error: err });

    res.render('users', { users: users });
  });
};

exports.login = function (req, res) {
  auth.login(res, req.body.email, req.body.password, function (err) {
    if (err)
      return res.render('login', { error: err, referer: req.body.referer });

    res.redirect(req.body.referer || '/');
  });
};

exports.logout = function (req, res) {
  auth.logout(res, req.sessionId);
  res.redirect('/');
};

exports.add = function (req, res) {
  Set.find(function (err, sets) {
    if (err)
      return res.render('error', { error: err });

    res.render('user', { user: new User(), sets: sets, adding: true });
  });
};

exports.addPost = function (req, res) {
  var user = new User();
  user.name = req.body.name;
  user.email = req.body.email;
  user.notes = req.body.notes;
  user.password = auth.hash(req.body.password);
  user.permissions = getPersmissions(req);

  var err = null;

  if (req.body.password != req.body.password2)
    err = 'passwords do not match';

  if (err)
    return res.render('user', { user: user, error: err, adding: true });
  else if (!user.name)
    err = 'name must not be empty';
  else if (!user.email)
    err = 'email must not be empty';

  user.save(function (err) {
    if (err)
      return res.render('error', { error: err });

    res.redirect('/users');
  })
};

exports.edit = function (req, res) {
  if (!req.user.admin && !req.user._id.equals(req.params.id))
    return res.redirect('/');

  Set.find(function (err1, sets) {
    User.findById(req.params.id, function (err2, user) {
      if (err1 || err2 || !user)
        return res.render('error', { error: err1 || err2 || 'user not found' });

      res.render('user', { user: user, sets: sets, adding: false });
    });
  });
};

exports.editPost = function (req, res) {
  if (!req.user.admin && !req.user._id.equals(req.params.id))
    return res.redirect('/');

  Set.find(function (err1, sets) {
    User.findById(req.params.id, function (err2, user) {
      if (err1 || err2 || !user)
        return res.render('error', { error: err1 || err2 || 'user not found' });

      if (req.body.password)
        user.password = auth.hash(req.body.password);

      if (req.user.admin) {
        user.name = req.body.name;
        user.email = req.body.email;
        user.permissions = getPersmissions(req);
        user.notes = req.body.notes;
      }

      var err = null;

      if (req.body.password && req.body.password != req.body.password2)
        err = 'passwords do not match';
      else if (!user.name)
        err = 'name must not be empty';
      else if (!user.email)
        err = 'email must not be empty';

      if (err)
        return res.render('user', { user: user, sets: sets, error: err, adding: false });

      user.save(function (err) {
        if (err)
          return res.render('error', { error: err });

        auth.refresh();
        res.redirect(req.user.admin ? '/users' : '/');
      });
    });
  });
};

exports.admin = function (req, res) {
  User.findById(req.params.id, function (err, user) {
    if (err || !user)
      return res.render('error', { error: err || 'user not found' });

    user.admin = req.query.set == 'true';
    user.save(function (err) {
      if (err)
        return res.render('error', { error: err });

      res.redirect('/users');
      auth.refresh();
    });
  });
};

exports.delete = utils.deleteItem(User, '/users');
exports.restore = utils.restoreItem(User, '/users');