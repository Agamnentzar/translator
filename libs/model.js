var mongoose = require('mongoose')
	, Promise = require('bluebird')
  , cultures = require('./cultures')
  , utils = require('./utils')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.Schema.Types.ObjectId;

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

				if (c) {
					json[0][i + 1] = c.name;
					json[1][i + 1] = c.id;
					modified[0][i + 1] = false;
					modified[1][i + 1] = false;
					langs[l] = i + 1;
				}
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
	lengthLimit: Number,
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

exports.copySet = function (fromId, toId) {
	return Promise.all([
		Set.findById(fromId).exec(),
		Set.findById(toId).exec(),
		Term.find({ setId: fromId, deleted: { $ne: true } }).exec(),
		Entry.find({ setId: fromId, deleted: { $ne: true } }).exec(),
		Term.findOne({ setId: toId, deleted: { $ne: true } }).sort({ order: -1 }).exec(),
	]).spread((from, to, terms, entries, maxOrderTerm) => {
		if (!from || !to || !terms || !entries) {
			throw new Error('item not found');
		}

		console.log(terms.length + ' terms');
		console.log(entries.length + ' entries');

		to.langs = to.langs.concat(from.langs.filter(l => to.langs.indexOf(l) === -1));

		var termIds = {};
		var maxOrder = maxOrderTerm.order + 1;

		return to.save()
			.then(() => Promise.map(terms, t => {
				var term = new Term();
				term.setId = to.id;
				term.order = t.order + maxOrder;
				term.date = t.date;
				term.userId = t.userId;
				return term.save().then(tt => termIds[t.id] = tt.id);
			}))
			.then(() => Promise.map(entries, e => {
				if (termIds[e.termId]) {
					var entry = new Entry();
					entry.setId = to.id;
					entry.termId = termIds[e.termId];
					entry.userId = e.userId;
					entry.lang = e.lang;
					entry.date = e.date;
					entry.value = e.value;
					return entry.save();
				}
			}));
	});
};

exports.clearEmptyTerms = function (setId) {
	return Promise.all([
		Term.find({ setId: setId, deleted: { $ne: true } }).exec(),
		Entry.find({ setId: setId, deleted: { $ne: true }, lang: 'key' }).exec(),
	]).spread((terms, entries) => {
		return Promise.map(terms, term => {
			var key = entries.find(e => e.termId.equals(term.id));

			if (!key) {
				term.deleted = true;
				term.deletedDate = Date.now();
				return term.save();
			}
		});
	});
};

exports.setEntry = function (termId, lang, userId, value, hasAccess) {
	return Promise.all([
		Term.findById(termId).exec(),
		Entry.find({ termId: termId, lang: lang, deleted: { $ne: true } }).exec(),
	]).spread((term, entries) => {
		if (!term)
			throw new Error('term not found');

		if (!hasAccess(term.setId))
			throw new Error('access denied');

		const e = new Entry();
		e.setId = term.setId;
		e.termId = term.id;
		e.userId = userId;
		e.lang = lang;
		e.date = Date.now();
		e.value = value;
		e.modified = true;

		return e.save()
			.then(() => Promise.map(entries, e => {
				e.deleted = true;
				e.deletedDate = Date.now();
				return e.save();
			}));
	});
};
