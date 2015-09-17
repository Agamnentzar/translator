var mongoose = require('mongoose')
  , cultures = require('./cultures')
  , utils = require('./utils')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

mongoose.connect('mongodb://localhost/verity-translations', { user: 'verity', pass: 'veritypass' });

var sessionSchema = new Schema({
	sessionId: String,
	userId: ObjectId,
	last: Date
});

var userSchema = new Schema({
	name: String,
	email: String,
	notes: String,
	password: String,
	admin: Boolean,
	permissions: [{
		setId: ObjectId,
		permissions: [String]
	}],
	deleted: Boolean,
	deletedDate: Date
});

userSchema.methods.can = function (permission, setId) {
	var permissions = this.permissions;

	if (setId) {
		for (var i = 0; i < permissions.length; i++) {
			if (permissions[i].setId.equals(setId))
				return permission === 'any' || permissions[i].permissions.indexOf(permission) !== -1;
		}
	}

	return false;
};

var setSchema = new Schema({
	name: String,
	title: String,
	devices: [String],
	version: String,
	changes: String,
	langs: [String],
	deleted: Boolean,
	deletedDate: Date
});

setSchema.methods.export = function (callback) {
	var set = this;

	Term.find({ setId: set._id, deleted: { $ne: true } }).sort('order').exec(function (err1, terms) {
		Entry.find({ setId: set._id, deleted: { $ne: true } }, function (err2, entries) {
			if (err1 || err2)
				return callback(err1 || err2);

			var termsMap = {}, datesMap = {}, modsMap = {};
			var json = [['Lang'], ['LangId']];
			var modified = [[false], [false]];
			var langs = { key: 0 };

			set.langs.forEach(function (l, i) {
				var c = cultures.get(l);
				json[0][i + 1] = c.name;
				json[1][i + 1] = c.id;
				modified[0][i + 1] = false;
				modified[1][i + 1] = false;
				langs[l] = i + 1;
			});

			terms.forEach(function (t) {
				var term = new Array(json[0].length);
				var mods = new Array(json[0].length);
				json[json.length] = termsMap[t.id] = term;
				datesMap[t.id] = new Array(json[0].length);
				modified[modified.length] = modsMap[t.id] = mods;

				for (var i = 0; i < term.length; i++) {
					term[i] = '';
					mods[i] = false;
				}
			});

			entries.forEach(function (e) {
				var term = termsMap[e.termId.toString()];
				var date = datesMap[e.termId.toString()];
				var mods = modsMap[e.termId.toString()];

				if (term) {
					var index = langs[e.lang];

					if (!date[index] || date[index] < e.date) {
						term[index] = e.value.trim();
						date[index] = e.date;
						mods[index] = e.modified;
					}
				}
			});

			for (var i = json.length - 1; i >= 0; i--) {
				if (!json[i][0]) {
					json.splice(i, 1);
					modified.splice(i, 1);
				}
			}

			callback(null, json, modified);
		});
	});
};

var termSchema = new Schema({
	setId: ObjectId,
	order: Number,
	date: Date,
	userId: ObjectId,
	deleted: Boolean,
	deletedDate: Date
});

var entrySchema = new Schema({
	setId: ObjectId,
	termId: ObjectId,
	userId: ObjectId,
	lang: String,
	date: Date,
	value: String,
	deleted: Boolean,
	deletedDate: Date,
	modified: Boolean,
});

var snapshotSchema = new Schema({
	userId: ObjectId,
	setId: ObjectId,
	version: String,
	changes: String,
	date: Date,
	deleted: Boolean,
	deletedDate: Date
});

var snapshotDataSchema = new Schema({
	snapshotId: ObjectId,
	json: String,
});

var Session = exports.Session = mongoose.model('Session', sessionSchema);
var User = exports.User = mongoose.model('User', userSchema);
var Set = exports.Set = mongoose.model('Set', setSchema);
var Term = exports.Term = mongoose.model('Term', termSchema);
var Entry = exports.Entry = mongoose.model('Entry', entrySchema);
var Snapshot = exports.Snapshot = mongoose.model('Snapshot', snapshotSchema);
var SnapshotData = exports.SnapshotData = mongoose.model('SnapshotData', snapshotDataSchema);

exports.cloneSet = function (id, name, title, langs, callback) {
	Set.findById(id, function (err, source) {
		if (err || !source)
			return callback(err || 'item not found');

		Term.find({ setId: source.id, deleted: { $ne: true } }, function (err1, terms) {
			Entry.find({ setId: source.id, deleted: { $ne: true }, lang: { $in: ['key'].concat(langs) } }, function (err2, entries) {
				if (err1 || err2)
					return callback(err1 || err2);

				console.log(terms.length + ' terms');
				console.log(entries.length + ' entries');

				var set = new Set();
				set.name = name;
				set.title = title;
				set.langs = langs;
				set.save(function (err, s) {
					if (err)
						return callback(err);

					var termIds = {};

					utils.whenAll(terms, function (t, done) {
						var term = new Term();
						term.setId = s.id;
						term.order = t.order;
						term.date = t.date;
						term.userId = t.userId;
						term.save(function (err, tt) {
							if (err)
								console.log('Error: ' + err);
							else
								termIds[t.id] = tt.id;
							done();
						});
					}, function () {
						utils.whenAll(entries, function (e, done) {
							if (!termIds[e.termId]) {
								console.log('Error: missing term ID');
								return done();
							}

							var entry = new Entry();
							entry.setId = s.id;
							entry.termId = termIds[e.termId];
							entry.userId = e.userId;
							entry.lang = e.lang;
							entry.date = e.date;
							entry.value = e.value;
							entry.save(function (err) {
								if (err)
									console.log('Error: ' + err);
								done();
							});
						}, function (err) {
							if (err)
								callback(err)
							else
								callback(null, s);
						});
					});
				});
			});
		});
	});
};