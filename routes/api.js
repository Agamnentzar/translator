/// <reference path="../libs/_node.js" />

var model = require('../libs/model.js')
  , utils = require('../libs/utils.js')
  , cultures = require('../libs/cultures.js');

var User = model.User
  , Set = model.Set
  , Term = model.Term
  , Entry = model.Entry;

function move(setId, termId, refId, place, callback) {
  Term.find({ setId: setId, deleted: { $ne: true } }).sort('order').exec(function (err, terms) {
    if (err)
      return callback(err);

    var termIndex = -1, refIndex = -1;

    for (var i = 0; i < terms.length; i++) {
      if (termIndex < 0 && terms[i].id === termId)
        termIndex = i;
      else if (refIndex < 0 && terms[i].id === refId)
        refIndex = i;
    }

    var term = terms[termIndex];

    if (termIndex < 0)
      return res.json({ error: 'term not found' });
    if (refIndex < 0)
      return res.json({ error: 'ref not found' });

    if (termIndex < refIndex)
      refIndex--;
    if (place === 'after')
      refIndex++;

    terms.splice(termIndex, 1);
    terms.splice(refIndex, 0, term);

    for (var i = 0; i < terms.length; i++)
      terms[i].order = i;

    utils.whenAll(terms, function (t, done) {
      t.save(done);
    }, callback);
  });
}

function createArray(length, value) {
	var result = [];

	for (var i = 0; i < length; i++)
		result.push(value);

	return result;
}

function jsonResult(res) {
	return function (err) {
		if (err)
			res.json({ error: err });
		else
			res.json({ success: true });
	};
}

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
							lengthLimit: t.lengthLimit | 0,
              entries: createArray(langs.length, null),
              modified: createArray(langs.length, false),
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
                	t.modified[langIndex] = langIndex !== 0 && e.modified === true;
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
            version: set.version,
            changes: set.changes,
            terms: ts
          });
        });
      });
    });
  });
};

exports.history = function (req, res) {
  User.find(function (err1, users) {
    Entry.find({ termId: req.query.termId, lang: req.query.lang }).sort('date').exec(function (err2, entries) {
      if (err1 || err2)
        return res.json({ error: err1 || err2 });

      users = utils.map(users);

      res.charset = 'utf-8';
      res.send(entries.map(function (e) {
        return {
          id: e.id,
          date: e.date,
          user: users[e.userId].name,
          value: e.value
        };
      }));
    });
  });
};

exports.set = function (req, res) {
	const termId = req.body.termId;
	const lang = req.body.lang;
	const user = req.user;
	const value = req.body.value;

	model.setEntry(termId, lang, user.id, value, setId => user.can('add', setId) || user.can('all', setId) || user.can(lang, setId))
		.then(() => res.json({ success: true }))
		.catch(e => res.json({ error: e.message }));
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
      term.order = last ? last.order + 1 : 0;
      term.date = Date.now();
      term.userId = req.user.id;
      term.save(function (err, t) {
        if (err || !t)
          return res.json({ error: err || 'term missing' });

        if (req.body.beforeTermId) {
          move(set.id, t.id, req.body.beforeTermId, 'before', function (err) {
            if (err)
              return res.json({ error: err });
            res.json({ id: t.id });
          });
        } else {
          res.json({ id: t.id });
        }
      });
    });
  });
};

exports.move = function (req, res) {
  if (!req.user.can('add', req.body.setId))
    return res.json({ error: 'access denied' });

  move(req.body.setId, req.body.termId, req.body.refId, req.body.place, jsonResult(res));
};

exports.delete = function (req, res) {
  Term.findById(req.body.termId, function (err, term) {
    if (err || !term)
      return res.json({ error: err || 'term not found' });

    if (!req.user.can('add', term.setId))
      return res.json({ error: 'access denied' });

    term.deleted = true;
    term.deletedDate = Date.now();
    term.save(jsonResult(res));
  });
};

exports.changes = function (req, res) {
  var setId = req.body.setId;
  var changes = req.body.changes;

  if (!req.user.can('any', setId))
    return res.json({ error: 'access denied' });

  Set.findById(setId, function (err, set) {
    if (err)
      return res.json({ error: err });

    set.changes = changes;
    set.save(jsonResult(res));
  });
};

exports.clearModified = function (req, res) {
	var setId = req.body.setId;
	var lang = req.body.lang;

	Entry.update({ setId: setId, lang: lang }, { $set: { modified: false } }, { multi: true }, jsonResult(res));
};

exports.setLengthLimit = function (req, res) {
	var termId = req.body.termId;
	var lengthLimit = req.body.lengthLimit | 0;

	Term.findById(termId, function (err, doc) {
		if (err)
			return res.json({ error: err });

		doc.lengthLimit = lengthLimit;
		doc.save(jsonResult(res));
	});
};

exports.fixczech = function (req, res) {
	Entry.update({ lang: 'cz' }, { $set: { lang: 'cs' } }, { multi: true }, jsonResult(res));
};
