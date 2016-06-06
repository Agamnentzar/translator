var fs = require('fs')
  , utils = require('../libs/utils')
  , model = require('../libs/model')
  , cultures = require('../libs/cultures');

var Set = model.Set
  , Term = model.Term
  , Entry = model.Entry
  , Snapshot = model.Snapshot
  , SnapshotData = model.SnapshotData;

function setupSet(set, src) {
	set.name = src.name;
	set.title = src.title;
	set.langs = src.langs;
	set.version = src.version;
	set.changes = src.changes;
	set.devices = src.devices.trim().split(/ /g).map(function (n) { return n.trim(); });
}

exports.index = function (req, res) {
	Set.find().sort('title').exec(function (err, sets) {
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

	setupSet(set, req.body);

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
		if (err || !set)
			return res.render('error', { error: err || 'set not found' });

		setupSet(set, req.body);

		set.save(function (err) {
			if (err)
				return res.render('error', { error: err });

			res.redirect('/sets');
		});
	});
};

exports.import = function (req, res) {
	var set = new Set();
	res.render('import', { set: set });
};

exports.importPost = function (req, res) {
	fs.readFile(req.files.file.path, function (err, data) {
		if (err || !data)
			return res.render('error', { error: err || 'no file sent' });

		var json = JSON.parse(data);
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

		var set = new Set();
		set.title = req.body.title;
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
};

exports.export = function (req, res) {
	Set.findById(req.params.id, function (err, set) {
		if (err || !set)
			return res.json({ error: err || 'no set' });

		set.export(function (err, data) {
			if (err)
				return res.json({ error: err });

			res.charset = 'utf-8';
			res.json(data);
		});
	});
};

exports.clone = function (req, res) {
	Set.findById(req.params.id, function (err, set) {
		if (err || !set)
			return res.render('error', { error: err || 'item not found' });

		res.render('clone', { sourceTitle: set.title, set: { name: set.name, langs: set.langs } });
	});
};

exports.clonePost = function (req, res) {
	model.cloneSet(req.params.id, req.body.name, req.body.title, req.body.langs, function (err, set) {
		if (err)
			res.render('error', { error: err });
		else
			res.redirect('/sets');
	});
};

exports.copy = function (req, res) {
	model.copySet(req.params.from, req.params.to)
		.then(() => res.redirect('/sets'))
		.catch(error => res.render('error', { error }));
};

exports.versions = function (req, res) {
	Set.findById(req.params.id, function (err1, set) {
		Snapshot.find({ setId: set._id }).sort('-date').exec(function (err2, snapshots) {
			if (err1 || err2)
				return res.render('error', { error: err1 || err2 });

			res.render('versions', { set: set, snapshots: snapshots });
		});
	});
};

exports.newVersion = function (req, res) {
	Set.findById(req.params.id, function (err, set) {
		if (err)
			return res.render('error', { error: err });

		if (!isNaN(set.version))
			set.nextVersion = +set.version + 1;

		res.render('newVersion', { set: set });
	});
};

exports.newVersionPost = function (req, res) {
	Set.findById(req.params.id, function (err, set) {
		if (err || !set)
			return res.render('error', { error: err || 'no set' });

		set.export(function (err, exportData) {
			if (err)
				return res.render('error', { error: err });

			var snapshot = new Snapshot();
			snapshot.setId = set._id;
			snapshot.userId = req.user._id;
			snapshot.version = req.body.version;
			snapshot.changes = req.body.changes;
			snapshot.date = new Date();
			snapshot.save(function (err, s) {
				if (err)
					return res.render('error', { error: err });

				var data = new SnapshotData();
				data.snapshotId = s._id;
				data.json = JSON.stringify(exportData);
				data.save(function (err) {
					if (err) {
						s.remove(function () {
							res.render('error', { error: err });
						});
					} else {
						set.version = req.body.newVersion;
						set.changes = '';
						set.save(function (err) {
							if (err)
								res.render('error', { error: err });
							else
								res.redirect('/sets/versions/' + set.id);
						});
					}
				});
			});
		});
	});
};

exports.delete = utils.deleteItem(Set, '/sets');
exports.restore = utils.restoreItem(Set, '/sets');

exports.deleteSnapshot = utils.deleteItem(Snapshot, function (item) { return '/sets/versions/' + item.setId; });
exports.restoreSnapshot = utils.restoreItem(Snapshot, function (item) { return '/sets/versions/' + item.setId; });

exports.print = function (req, res) {
	Set.findById(req.params.id, function (err, set) {
		if (err || !set)
			return res.send(err || 'no set');
		
		set.export(function (err, data, modified) {
			if (err || (data.length < 2))
				return res.send(err || 'missing data');

			var ref = data[1].indexOf(req.query.ref);
			var target = data[1].indexOf(req.query.target);

			res.render('print', { set: set, data: data, modified: modified, ref: ref, target: target });
		});
	});
};
