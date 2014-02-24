var fs = require('fs')
  , utils = require('../libs/utils.js')
  , model = require('../libs/model.js')
  , cultures = require('../libs/cultures.js');

var Set = model.Set
  , Term = model.Term
  , Entry = model.Entry;

exports.index = function (req, res) {
  Set.find(function (err, sets) {
    if (err)
      return res.render('error', { error: err });

    res.render('sets', { sets: sets });
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

exports.edit = function (req, res) {
  Set.findById(req.params.id, function (err, set) {
    if (err)
      return res.render('error', { error: err });

    res.render('set', { set: set });
  });
};

exports.editPost = function (req, res) {
  Set.findById(req.params.id, function (err, set) {
    if (err && set)
      return res.render('error', { error: err || 'no set with this id' });

    set.name = req.body.name;
    set.title = req.body.title;
    set.langs = req.body.langs;
    set.save(function (err) {
      if (err)
        return res.render('error', { error: err });

      res.redirect('/sets');
    });
  });
};

exports.import = function (req, res) {
  Set.findById(req.params.id, function (err, set) {
    if (err || !set)
      return res.render('error', { error: err || 'no set' });

    res.render('import', { set: set });
  });
};

exports.importPost = function (req, res) {
  fs.readFile(req.files.file.path, function (err, data) {
    if (err || !data)
      return res.render('error', { error: err || 'no file sent' });

    var json = JSON.parse(data);

    Set.findById(req.params.id, function (err, set) {
      if (err || !set)
        return res.render('error', { error: err || 'set not found' });

      var langs = null;

      for (var i = 0; i < json.length; i++) {
        if (json[i][0] === 'LangId') {
          langs = json[i].map(function (x) {
            if (x === 'LangId')
              return 'key';
            if (x === 'us')
              return 'en-US';
            return x;
          });
        }
      }

      Term.find({ setId: set.id }, function (err1, terms) {
        Entry.find({ setId: set.id }, function (err2, entries) {
          if (err1 || err2)
            return res.render('error', { error: err1 || err2 });

          terms.forEach(function (t) { t.remove(); });
          entries.forEach(function (e) { e.remove(); });

          set.langs = langs.slice(1);
          set.save(function (err, set) {
            json.forEach(function (t, index) {
              if (t[0] == 'LangId' || t[0] == 'Lang')
                return;

              var term = new Term();
              term.setId = set.id;
              term.date = Date.now();
              term.userId = req.user.id;
              term.order = index;
              term.save(function (err, _term) {
                t.forEach(function (l, li) {
                  if (l) {
                    var entry = new Entry();
                    entry.setId = set.id;
                    entry.termId = _term.id;
                    entry.userId = req.user.id;
                    entry.lang = langs[li];
                    entry.date = Date.now();
                    entry.value = (l || '').trim();
                    entry.save();
                  }
                });
              });
            });

            res.redirect('/sets');
          });
        });
      });
    });
  });
};

exports.clone = function (req, res) {
  Set.findById(req.params.id, function (err, set) {
    if (err)
      return res.render('error', { error: err });

    res.render('clone', { set: set });
  });
};

exports.clonePost = function (req, res) {

};

exports.delete = utils.deleteItem(Set, '/sets');
exports.restore = utils.restoreItem(Set, '/sets');