var model = require('../libs/model.js')
  , utils = require('../libs/utils.js');

var Set = model.Set
  , Term = model.Term
  , Entry = model.Entry
  , User = model.User;

exports.index = function (req, res) {
  var date = new Date();
  date = date.setDate(date.getDate() - 7);

  Set.find({ deleted: { $ne: true } }).sort('_id').exec(function (err1, sets) {
    User.find(function (err2, users) {
      Entry.find({ $or: [{ lang: 'key' }, { date: { $gt: date } }] }).sort('order').exec(function (err3, entries) {
        if (err1 || err2 || err3)
          return res.render('error', { error: err1 || err2 || err3 });

        sets = sets.map(function (s) {
          return {
            id: s.id,
            langs: s.langs,
            title: s.title,
            terms: [],
            termsMap: {}
          };
        });

        var setsMap = utils.map(sets);
        var usersMap = utils.map(users);

        entries.forEach(function (e) {
          var s = setsMap[e.setId];

          if (s) {
            if (e.date > date) {
              var t = s.termsMap[e.termId];

              if (!t) {
                t = new Array(s.langs.length + 1);
                s.termsMap[e.termId] = t;
                s.terms[s.terms.length] = t;
              }

              t[s.langs.indexOf(e.lang) + 1] = {
                value: e.value,
                changed: true,
                date: e.date,
                user: usersMap[e.userId].name
              };
            }
          }
        });

        entries.forEach(function (e) {
          var s = setsMap[e.setId];

          if (s) {
            var t = s.termsMap[e.termId];
            var index = s.langs.indexOf(e.lang) + 1;

            if (e.lang === 'key' && t && !t[index]) {
              t[index] = { value: e.value };
            }
          }
        });

        res.render('changes', { sets: sets });
      });
    });
  });
};