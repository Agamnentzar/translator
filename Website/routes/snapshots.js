var model = require('../libs/model');

var Set = model.Set
  , Snapshot = model.Snapshot
  , SnapshotData = model.SnapshotData;

function getLatestId(device, name, callback) {
  Set.findOne({ devices: { $in: [device] }, name: name }, function (err, set) {
    if (err || !set)
      return callback(err || 'set not found');

    Snapshot.findOne({ setId: set._id, deleted: { $ne: true } }).sort('-date').exec(function (err, snapshot) {
      if (err || !snapshot)
        return callback(err || 'no snapshots');

      callback(null, snapshot.id);
    });
  });
}

function findDataById(id, callback) {
  SnapshotData.findOne({ snapshotId: id }, function (err, data) {
    if (data)
      return callback(null, data);

    Snapshot.find(function (err, snapshots) {
      if (err)
        return callback(err);

      var regex = new RegExp('.*' + id + '$');

      for (var i = 0; i < snapshots.length; i++) {
        if (regex.test(snapshots[i].id)) {
          return SnapshotData.findOne({ snapshotId: snapshots[i]._id }, function (err, data) {
            if (err || !data)
              return callback(err || 'data not found');

            callback(null, data);
          });
        }
      }

      return callback('snapshot not found');
    });
  });
}

function findById(id, res) {
  findDataById(id, function (err, data) {
    if (err)
      return res.json({ error: err });

    res.charset = 'utf-8';
    res.set('Content-Type', 'application/json');
    res.send(data.json);
  });
}

function findVmtById(id, req, res) {
  findDataById(id, function (err, data) {
    if (err)
      return res.send('Error: ' + err);

    var lines = [];
    var lang = req.params.lang;

    data = JSON.parse(data.json);

    var index = data[1].indexOf(lang);

    if (index === -1)
      return res.send('Error: lang not found');

    for (var i = 0; i < data.length; i++) {
      var k = (data[i][0] || '').trim();
      var v = (data[i][index] || data[i][1]).trim();

      if (k) {
        if (/_start$/.test(k))
          v = v.replace(/^\s*([0-9]+\.) ?(.+)$/mg, '$1 \\>$2\\<');

        v = v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '');

        lines[i] = k + ' ' + v;
      }
    }
    
    lines.push('');

    res.charset = 'utf-8';
    res.set('Content-Type', 'text/plain');
    res.send(lines.join('\n'));
  });
}

function findHById(id, req, res) {
  findDataById(id, function (err, data) {
    if (err)
      return res.send('Error: ' + err);

    data = JSON.parse(data.json);

    var result = '#ifndef I18N_TABLES_H\n'
               + '#define I18N_TABLES_H\n'
               + '\n';

    for (var i = 0; i < data.length; i++) {
      var k = (data[i][0] || '').trim();

      if (k)
        result += '__attribute__((used)) static const char* i18n_' + k.toUpperCase() + ' = "' + k + '";\n';
    }

    result += '\n#endif // I18N_TABLES_H';

    res.charset = 'utf-8';
    res.set('Content-Type', 'text/plain');
    res.send(result);
  });
}

exports.latestID = function (req, res) {
  getLatestId(req.params.device, req.params.name, function (err, id) {
    if (err)
      return res.send('Error: ' + err);

    res.send(id);
  });
};

exports.getJSON = function (req, res) {
  findById(req.params.id, res);
};

exports.latestJSON = function (req, res) {
  getLatestId(req.params.device, req.params.name, function (err, id) {
    if (err)
      return res.json({ error: err });

    findById(id, res);
  });
};

exports.liveJSON = function (req, res) {
  Set.findOne({ devices: { $in: [req.params.device] }, name: req.params.name }, function (err, set) {
    if (err || !set)
      return res.json({ error: err || 'set not found' });

    set.export(function (err, data) {
      if (err)
        return res.json({ error: err });

      res.charset = 'utf-8';
      res.json(data);
    });
  });
};

exports.getVMT = function (req, res) {
  findVmtById(req.params.id, req, res);
};

exports.latestVMT = function (req, res) {
  var name = req.params.name.replace(/\..*$/, '');

  getLatestId(req.params.device, name, function (err, id) {
    if (err)
      return res.send('Error: ' + err);

    findVmtById(id, req, res);
  });
};

exports.getH = function (req, res) {
  findHById(req.params.id, req, res);
};

exports.latestH = function (req, res) {
  var name = req.params.name.replace(/\..*$/, '');

  getLatestId(req.params.device, name, function (err, id) {
    if (err)
      return res.send('Error: ' + err);

    findHById(id, req, res);
  });
};