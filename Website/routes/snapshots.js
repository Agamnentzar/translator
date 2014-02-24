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
          names: g.names || [],
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
  generator.names = req.body.names.trim().split(/ /g).map(function (n) { return n.trim(); });
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
    generator.names = req.body.names.trim().split(/ /g).map(function (n) { return n.trim(); });
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

    res.render('make', { id: generator.id, title: generator.title });
  });
};

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

function createSnapshot(id, callback) {
  SnapshotGenerator.findById(id, function (err, generator) {
    if (err || !generator)
      return callback(err || 'item not found');

    model.createSnapshotFromGenerator(generator, callback);
  });
}

function getLatestId(name, callback) {
  SnapshotGenerator.findOne({ names: { $in: [name] } }, function (err, generator) {
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
  });
}

function findVmtById(id, req, res) {
  SnapshotData.findOne({ snapshotId: id }, function (err, data) {
    if (err || !data)
      return res.send('Error: ' + (err || 'data not found'));

    var lines = [];
    var lang = req.params.lang;
    var set = req.params.set.replace(/\..*$/, '');

    data = JSON.parse(data.json);

    if (!set)
      return res.send('Error: missing set');
    if (!data[set])
      return res.send('Error: set not found');

    var index = data[set][1].indexOf(lang);

    if (index === -1)
      return res.send('Error: lang not found');

    data = data[set];

    for (var i = 0; i < data.length; i++) {
      var k = (data[i][0] || '').trim();
      var v = (data[i][index] || '').trim();

      if (/_start$/.test(k))
        v = v.replace(/^\s*([0-9]+\.) ?(.+)$/m, '$1 \\>$2\\<');

      v = v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r');

      lines[i] = k + ' ' + v;
    }

    res.set('Content-Type', 'text/plain');
    res.send(lines.join('\n'));
  });
}

exports.latestID = function (req, res) {
  getLatestId(req.params.name, function (err, id) {
    if (err)
      return res.send('Error: ' + err);

    res.send(id);
  });
};

exports.getJSON = function (req, res) {
  findById(req.params.id, res);
};

exports.latestJSON = function (req, res) {
  getLatestId(req.params.name, function (err, id) {
    if (err)
      return res.json({ error: err });

    findById(id, res);
  });
};

exports.liveJSON = function (req, res) {
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

exports.getVMT = function (req, res) {
  findVmtById(req.params.id, req, res);
};

exports.latestVMT = function (req, res) {
  getLatestId(req.params.name, function (err, id) {
    if (err)
      return res.send('Error: ' + err);

    findVmtById(id, req, res);
  });
};

exports.delete = utils.deleteItem(SnapshotGenerator, '/snapshots');
exports.restore = utils.restoreItem(SnapshotGenerator, '/snapshots');
exports.deleteSnapshot = utils.deleteItem(Snapshot, '/snapshots');
exports.restoreSnapshot = utils.restoreItem(Snapshot, '/snapshots');