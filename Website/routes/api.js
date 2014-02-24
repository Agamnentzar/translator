/// <reference path="../libs/_node.js" />

var model = require('../libs/model.js')
  , cultures = require('../libs/cultures.js');

var User = model.User
  , Set = model.Set
  , Term = model.Term
  , Entry = model.Entry;

exports.get = function (req, res) {
  User.find(function (err, users) {
    if (err)
      return res.json({ error: err });

    Set.findById(req.query.setId, function (err, set) {
      if (err || !set)
        return res.json({ error: err || 'set not found' });

      Term.find({ setId: set.id, deleted: { $ne: true } }).sort('order').exec(function (err, terms) {
        if (err)
          return res.json({ error: err });

        Entry.find({ setId: set.id, deleted: { $ne: true } }, function (err, entries) {
          if (err)
            return res.json({ error: err });

          var termsMap = {};
          var ts = [];
          var langs = ['key'].concat(set.langs);

          terms.forEach(function (t) {
            ts[ts.length] = termsMap[t.id] = {
              id: t.id,
              entries: new Array(langs.length),
              e: new Array(langs.length)
            };
          });

          entries.forEach(function (e) {
            var t = termsMap[e.termId];

            if (t) {
              var langIndex = langs.indexOf(e.lang);

              if (langIndex !== -1) {
                if (!t.e[langIndex] || t.e[langIndex].date < e.date) {
                  t.entries[langIndex] = e.value;
                  t.e[langIndex] = e;
                }
              }
            }
          });

          ts.forEach(function (t) {
            delete t.e;
          });

          res.charset = 'utf-8';
          res.json({
            users: users.map(function (u) {
              return { id: u.id, name: u.name };
            }),
            langs: set.langs.map(cultures.get),
            terms: ts
          });
        });
      });
    });
  });
};

exports.set = function (req, res) {
  Term.findById(req.body.termId, function (err, term) {
    if (err || !term)
      return res.json({ error: err || 'term not found' });

    var lang = req.body.lang;

    Entry.find({ termId: term.id, lang: lang, deleted: { $ne: true } }, function (err, entries) {
      if (err)
        return res.json({ error: err });

      if (!(req.user.can('add', term.setId) || req.user.can('all', term.setId) || req.user.can(lang, term.setId)))
        return res.json({ error: 'access denied' });

      var e = new Entry();
      e.setId = term.setId;
      e.termId = term.id;
      e.userId = req.user.id;
      e.lang = lang;
      e.date = Date.now();
      e.value = req.body.value;
      e.save(function (err) {
        if (err)
          return res.json({ error: err });

        for (var i = 0; i < entries.length; i++) {
          entries[i].deleted = true;
          entries[i].deletedDate = Date.now();
          entries[i].save();
        }

        res.json({ success: true });
      });
    });
  });
};

exports.add = function (req, res) {
  if (!req.user.can('add', req.body.setId))
    return res.json({ error: 'access denied' });

  Set.findById(req.body.setId, function (err, set) {
    if (err || !set)
      return res.json({ error: err || 'set not found' });

    Term.findOne({ setId: set.id, deleted: { $ne: true } }).sort('-order').exec(function (err, last) {
      var term = new Term();
      term.setId = set.id;
      term.order = last.order + 1;
      term.date = Date.now();
      term.userId = req.user.id;
      term.save(function (err, t) {
        if (err || !t)
          return res.json({ error: err || 'term missing' });

        res.json({ id: t.id });
      });
    });
  });
};

exports.addAfter = function (req, res) {
  // TODO: ...
};

exports.delete = function (req, res) {
  Term.findById(req.body.termId, function (err, term) {
    if (err || !term)
      return res.json({ error: err || 'term not found' });

    if (!req.user.can('add', term.setId))
      return res.json({ error: 'access denied' });

    term.deleted = true;
    term.deletedDate = Date.now();
    term.save(function (err) {
      if (err)
        return res.json({ error: err });

      res.json({ success: true });
    });
  });
};