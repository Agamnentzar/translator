var fs = require('fs')
  , utils = require('../libs/utils.js')
  , model = require('../libs/model.js')
  , cultures = require('../libs/cultures.js');

var Set = model.Set
  , Term = model.Term
  , Entry = model.Entry
  , SnapshotGenerator = model.SnapshotGenerator
  , Snapshot = model.Snapshot
  , SnapshotData = model.SnapshotData;

exports.index = function (req, res) {
  Set.find(function (err, sets) {
    if (err)
      return res.render('error', { error: err });

    var setMap = utils.map(sets);

    SnapshotGenerator.find().sort('-date').exec(function (err, generators) {
      if (err)
        return res.render('error', { error: err });

      generators = generators.map(function (g) {
        return {
          id: g.id,
          name: g.name,
          title: g.title,
          date: g.date,
          sets: g.sets.map(function (s) { return setMap[s]; }),
          deleted: g.deleted,
          snapshots: []
        };
      });

      Snapshot.find().sort('-date').exec(function (err, snapshots) {
        if (err)
          return res.render('error', { error: err });

        utils.distribute(generators, snapshots, 'generatorId', 'snapshots');

        res.render('snapshots', { generators: generators });
      });
    });
  });
};

exports.add = function (req, res) {
  Set.find({ deleted: { $ne: true } }, function (err, sets) {
    if (err)
      return res.render('error', { error: err });

    res.render('snapshot', { generator: new SnapshotGenerator(), sets: sets });
  });
};

exports.addPost = function (req, res) {
  var generator = new SnapshotGenerator();
  generator.title = req.body.title;
  generator.name = req.body.name;
  generator.date = Date.now();
  generator.userId = req.user.id;
  generator.sets = req.body.sets;
  generator.save(function (err) {
    if (err)
      return res.render('error', { error: err });

    res.redirect('/snapshots');
  });
};

exports.edit = function (req, res) {
  Set.find({ deleted: { $ne: true } }, function (err, sets) {
    if (err)
      return res.render('error', { error: err });

    SnapshotGenerator.findById(req.params.id, function (err, generator) {
      if (err || !generator)
        return res.render('error', { error: err || 'item not found' });

      res.render('snapshot', { generator: generator, sets: sets });
    });
  });
};

exports.editPost = function (req, res) {
  SnapshotGenerator.findById(req.params.id, function (err, generator) {
    if (err || !generator)
      return res.render('error', { error: err || 'icon not found' });

    generator.title = req.body.title;
    generator.name = req.body.name;
    generator.sets = req.body.sets;
    generator.save(function (err) {
      if (err)
        return res.render('error', { error: err });

      res.redirect('/snapshots');
    });
  });
};

exports.make = function (req, res) {
  SnapshotGenerator.findById(req.params.id, function (err, generator) {
    if (err)
      return res.render('error', { error: err });

    res.render('make', { id: generator.id, name: generator.name });
  });
};

function createSnapshot(id, callback) {
  SnapshotGenerator.findById(id, function (err, generator) {
    if (err || !generator)
      return callback(err || 'item not found');

    Set.find({ _id: { $in: generator.sets }, deleted: { $ne: true } }, function (err1, sets) {
      Term.find({ setId: { $in: generator.sets }, deleted: { $ne: true } }).sort('order').exec(function (err2, terms) {
        Entry.find({ setId: { $in: generator.sets }, deleted: { $ne: true } }, function (err3, entries) {
          if (err1 || err2 || err3)
            return callback(err1 || err2 || err3);

          var json = {}, setsMap = {}, langsMap = {};
          var termsMap = {}, datesMap = {};

          sets.forEach(function (s) {
            var set = [['Lang'], ['LangId']];
            var langs = { key: 0 };

            setsMap[s.id] = json[s.name] = set;
            langsMap[s.id] = langs;

            s.langs.forEach(function (l, i) {
              var c = cultures.get(l);
              set[0][i + 1] = c.name;
              set[1][i + 1] = c.id;
              langs[l] = i + 1;
            });
          });

          terms.forEach(function (t) {
            var set = setsMap[t.setId.toString()];

            if (set) {
              var term = new Array(set[0].length);
              set[set.length] = termsMap[t.id] = term;
              datesMap[t.id] = new Array(set[0].length);

              for (var i = 0; i < term.length; i++)
                term[i] = '';
            }
          });

          entries.forEach(function (e) {
            var lang = langsMap[e.setId.toString()];
            var term = termsMap[e.termId.toString()];
            var date = datesMap[e.termId.toString()];

            if (lang && term) {
              var index = lang[e.lang];

              if (!date[index] || date[index] < e.date) {
                term[index] = e.value.trim();
                date[index] = e.date;
              }
            }
          });

          callback(null, {
            generator: generator,
            sets: sets.map(function (s) { return s.name; }).join(' '),
            json: json
          });
        });
      });
    });
  });
}

exports.makePost = function (req, res) {
  createSnapshot(req.params.id, function (err, result) {
    if (err)
      return res.render('error', { error: err });

    var snapshot = new Snapshot();
    snapshot.generatorId = result.generator.id;
    snapshot.userId = req.user.id;
    snapshot.version = req.body.version;
    snapshot.sets = result.sets;
    snapshot.date = Date.now();
    snapshot.save(function (err, s) {
      if (err)
        return res.render('error', { error: err });

      result.json.metadata = {
        id: s.id,
        name: result.generator.name,
        title: result.generator.title,
        version: s.version
      };

      var data = new SnapshotData();
      data.snapshotId = s.id;
      data.json = JSON.stringify(result.json);
      data.save(function (err) {
        if (err) {
          s.remove(function () {
            return res.render('error', { error: err });
          });
        }

        res.redirect('/snapshots');
      });
    });
  });
};

function getLatestId(name, callback) {
  SnapshotGenerator.findOne({ name: name }, function (err, generator) {
    if (err || !generator)
      return callback(err || 'name not found');

    Snapshot.findOne({ generatorId: generator.id, deleted: { $ne: true } }).sort('-date').exec(function (err, snapshot) {
      if (err || !snapshot)
        return callback(err || 'no snapshots');

      callback(null, snapshot.id);
    });
  });
}

function findById(id, res) {
  SnapshotData.findOne({ snapshotId: id }, function (err, data) {
    if (err || !data)
      return res.json({ error: err || 'data not found' });

    res.charset = 'utf-8';
    res.set('Content-Type', 'application/json');
    res.send(data.json);

    //switch (req.query.type) {
    //  // TEMP: do this client-side
    //  case 'values':
    //    var lines = [];
    //    var lang = req.query.lang || 'en';
    //    var set = req.query.set;
    //
    //    data = JSON.parse(data.json);
    //
    //    if (!set)
    //      return res.send('missing set');
    //    if (!data[set])
    //      return res.send('set not found');
    //
    //    var index = data[set][1].indexOf(lang);
    //
    //    if (index === -1)
    //      return res.send('lang not found');
    //
    //    data = data[set];
    //
    //    for (var i = 0; i < data.length; i++) {
    //      var k = (data[i][0] || '').trim();
    //      var v = (data[i][index] || '').trim();
    //
    //      if (/_start$/.test(k))
    //        v = v.replace(/^\s*([0-9]+\.) ?(.+)$/m, '$1 \\>$2\\<');
    //
    //      v = v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    //
    //      lines[i] = k + ' ' + v;
    //    }
    //
    //    res.set('Content-Type', 'text/plain');
    //    res.send(lines.join('\n'));
    //    break;
    //  // END TEMP
    //  case 'json':
    //  default:
    //    res.set('Content-Type', 'application/json');
    //    res.send(data.json);
    //}
  });
}

exports.get = function (req, res) {
  findById(req.params.id, res);
};

exports.latest = function (req, res) {
  getLatestId(req.params.name, function (err, id) {
    if (err)
      return res.json({ error: err });

    findById(id, res);
  });
};

exports.live = function (req, res) {
  SnapshotGenerator.findOne({ name: req.params.name }, function (err, generator) {
    if (err || !generator)
      return res.json({ error: err || 'item not found' });

    createSnapshot(generator.id, function (err, result) {
      if (err)
        return res.json({ error: err });

      res.charset = 'utf-8';
      res.json(result.json);
    });
  });
};

exports.delete = utils.deleteItem(SnapshotGenerator, '/snapshots');
exports.restore = utils.restoreItem(SnapshotGenerator, '/snapshots');
exports.deleteSnapshot = utils.deleteItem(Snapshot, '/snapshots');
exports.restoreSnapshot = utils.restoreItem(Snapshot, '/snapshots');