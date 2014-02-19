var model = require('../libs/model.js');

var Set = model.Set;

exports.index = function (req, res) {
  Set.find(function (err, sets) {
    if (err)
      return res.render('error', { error: err });

    res.render('sets', { sets: sets });
  });
};

exports.edit = function (req, res) {
  Set.findById(req.query.id, function (err, set) {
    if (err)
      return res.render('error', { error: err });

    res.render('set', { set: set });
  });
};

exports.editPost = function (req, res) {
  Set.findById(req.body.id, function (err, set) {
    if (err && set)
      return res.render('error', { error: err || 'no set with this id' });

    set.name = req.body.name;
    set.title = req.body.title;
    set.langs = req.body.langs;

    // TODO: add/remove langs

    set.save(function (err) {
      if (err)
        return res.render('error', { error: err });

      res.redirect('/sets');
    });
  });
};

exports.add = function (req, res) {
  var set = new Set();
  set.langs = ['en'];
  res.render('set', { set: set });
};

exports.addPost = function (req, res) {
  var set = new Set();
  set.name = req.body.name;
  set.title = req.body.title;
  set.langs = req.body.langs;
  set.save(function (err) {
    if (err)
      return res.render('error', { error: err });

    res.redirect('/sets');
  });
};

exports.delete = function (req, res) {
  Set.findById(req.query.id, function (err, set) {
    if (err)
      return res.render('error', { error: err });

    set.remove(function (err) {
      if (err)
        return res.render('error', { error: err });
      res.redirect('/sets');
    });
  });
};