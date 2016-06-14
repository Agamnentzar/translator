var fs = require('fs')
	, Promise = require('bluebird')
  , utils = require('../libs/utils')
  , model = require('../libs/model')
  , cultures = require('../libs/cultures')
  , csv = require('../libs/csv.js');

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
	set.devices = src.devices.trim().split(/ /g).map(n => n.trim());
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

exports.importCSV = function (req, res) {
	Set.findById(req.params.id, function (err, set) {
		if (err || !set)
			return res.render('error', { error: err || 'set not found' });

		res.render('import-csv', { set: set });
	});
};

exports.importCSVPost = function (req, res) {
	const setId = req.params.id;

	Promise.all([
		Set.findById(setId).exec(),
		Term.find({ setId: setId, deleted: { $ne: true } }).exec(),
		Entry.find({ setId: setId, deleted: { $ne: true }, lang: 'key' }).exec(),
	]).spread((set, terms, entries) => {
		const user = req.user;
		const data = req.file.buffer.toString('utf8');
		const translations = csv.decode(data);

		if (!set) {
			throw new Error('set not found');
		}

		return Promise.map(translations, t => {
			const keyEntry = entries.find(e => e.value === t[0]);

			if (keyEntry) {
				return Promise.map(t.slice(1), (value, index) => {
					const termId = keyEntry.termId;
					const lang = translations[1][index + 1];
					return model.setEntry(termId, lang, user.id, value, () => true);
				});
			}
		});
	})
		.then(() => res.redirect('/sets'))
		.catch(error => res.render('error', { error: error }));
};

exports.import = function (req, res) {
	var set = new Set();
	res.render('import', { set: set });
};

exports.importPost = function (req, res) {
	var data = req.file.buffer.toString('utf8');
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

exports.exportCSV = function (req, res) {
	const lang = req.params.lang.replace(/\..*$/, '');

	Set.findById(req.params.id, function (err, set) {
		res.charset = 'utf-8';
		res.set('Content-Type', 'text/csv');

		if (err || !set)
			return res.send(err || 'no set');

		set.export(function (err, data) {
			if (err)
				return res.send(err);

			const langIndex = data[1].indexOf(lang);
			const result = data.map(x =>[x[0], x[langIndex]]);
			res.send(csv.encode(result));
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

exports.clearEmpty = function (req, res) {
	model.clearEmptyTerms(req.params.id)
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

			const snapshot = new Snapshot();
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

exports.deleteSnapshot = utils.deleteItem(Snapshot, item => '/sets/versions/' + item.setId);
exports.restoreSnapshot = utils.restoreItem(Snapshot, item => '/sets/versions/' + item.setId);

exports.print = function (req, res) {
	Set.findById(req.params.id, function (err, set) {
		if (err || !set)
			return res.send(err || 'no set');

		set.export(function (err, data, modified) {
			if (err || (data.length < 2))
				return res.send(err || 'missing data');

			const ref = data[1].indexOf(req.query.ref);
			const target = data[1].indexOf(req.query.target);
			res.render('print', { set: set, data: data, modified: modified, ref: ref, target: target });
		});
	});
};
