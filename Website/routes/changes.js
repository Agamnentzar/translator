var model = require('../libs/model.js')
  , utils = require('../libs/utils.js');

var Set = model.Set
  , Term = model.Term
  , Entry = model.Entry
  , User = model.User;

exports.index = function (req, res) {
  var date = new Date();
  date = date.setDate(date.getDate() - 7);

  var query = { $or: [{ lang: 'key' }, { date: { $gt: date } }, { deletedDate: { $gt: date } }] };

  Set.find({ deleted: { $ne: true } }).sort('_id').exec(function (err1, sets) {
    User.find(function (err2, users) {
      Term.find({}).sort('order').exec(function (err3, terms) {
        Entry.find(query).exec(function (err4, entries) {
          if (err1 || err2 || err3 || err4)
            return res.render('error', { error: err1 || err2 || err3 || err4 });

          sets = sets.map(function (s) {
            return { id: s.id, langs: s.langs, title: s.title, terms: [] };
          });

          var setsMap = utils.map(sets);
          var usersMap = utils.map(users);
          var termsMap = {};

          terms.forEach(function (t) {
            var s = setsMap[t.setId];

            if (s) {
              termsMap[t.id] = s.terms[s.terms.length] = {
                type: (t.deleted && t.deletedDate > date) ? 'removed' : (t.date > date ? 'added' : undefined)
              };
            }
          });

          entries.forEach(function (e) {
            var s = setsMap[e.setId];
            var t = termsMap[e.termId];

            if (s && t && e.date > date) {
              if (!t.entries)
                t.entries = new Array(s.langs.length + 1);

              var type = t.type || (e.deleted ? 'removed' : 'changed');
              var index = s.langs.indexOf(e.lang) + 1;
              var user = usersMap[e.userId] ? usersMap[e.userId].name : '[deleted user]';
              var entry = t.entries[index];

              if (entry) {
                if (entry.date < e.date) {
                  type = type == 'added' ? 'changed' : type;
                  t.entries[index] = { value: e.value, type: type, date: e.date, user: user };
                } else if (entry.type === 'added') {
                  entry.type = 'changed';
                }
              } else {
                t.entries[index] = { value: e.value, type: type, date: e.date, user: user };
              }
            }
          });

          entries.forEach(function (e) {
            var s = setsMap[e.setId];
            var t = termsMap[e.termId];

            if (s && t) {
              var index = s.langs.indexOf(e.lang) + 1;

              if (e.lang === 'key' && t && t.entries && !t.entries[index])
                t.entries[index] = { value: e.value, type: t.type, date: t.date, user: t.user };
            }
          });

          sets.forEach(function (s) {
            s.terms = s.terms.filter(function (t) { return t.entries; });
          });

          res.render('changes', { sets: sets });
        });
      });
    });
  });
};