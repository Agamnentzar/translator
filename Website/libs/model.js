var mongoose = require('mongoose')
  , cultures = require('./cultures')
  , Schema = mongoose.Schema;

mongoose.connect('mongodb://localhost/verity-translations', { user: 'verity', pass: 'veritypass' });

var sessionSchema = new Schema({
  sessionId: String,
  userId: Schema.ObjectId,
  last: Date
});

var userSchema = new Schema({
  name: String,
  email: String,
  notes: String,
  password: String,
  admin: Boolean,
  permissions: [
    {
      setId: Schema.ObjectId,
      permissions: [String]
    }
  ],
  deleted: Boolean,
  deletedDate: Date
});

userSchema.methods.can = function (permission, setId) {
  var permissions = this.permissions;

  if (setId) {
    for (var i = 0; i < permissions.length; i++) {
      if (permissions[i].setId.equals(setId))
        return permissions[i].permissions.indexOf(permission) !== -1;
    }
  }

  return false;
};

var setSchema = new Schema({
  name: String,
  title: String,
  langs: [String],
  deleted: Boolean,
  deletedDate: Date
});

var termSchema = new Schema({
  setId: Schema.ObjectId,
  order: Number,
  date: Date,
  userId: Schema.ObjectId,
  deleted: Boolean,
  deletedDate: Date
});

var entrySchema = new Schema({
  setId: Schema.ObjectId,
  termId: Schema.ObjectId,
  userId: Schema.ObjectId,
  lang: String,
  date: Date,
  value: String,
  deleted: Boolean,
  deletedDate: Date
});

var snapshotGeneratorSchema = new Schema({
  userId: Schema.ObjectId,
  names: [String],
  title: String,
  sets: [Schema.ObjectId],
  date: Date,
  deleted: Boolean,
  deletedDate: Date
});

var snapshotSchema = new Schema({
  generatorId: Schema.ObjectId,
  userId: Schema.ObjectId,
  version: String,
  sets: String,
  date: Date,
  deleted: Boolean,
  deletedDate: Date
});

var snapshotDataSchema = new Schema({
  snapshotId: Schema.ObjectId,
  json: String,
});

var Session = exports.Session = mongoose.model('Session', sessionSchema);
var User = exports.User = mongoose.model('User', userSchema);
var Set = exports.Set = mongoose.model('Set', setSchema);
var Term = exports.Term = mongoose.model('Term', termSchema);
var Entry = exports.Entry = mongoose.model('Entry', entrySchema);
var Snapshot = exports.SnapshotGenerator = mongoose.model('SnapshotGenerator', snapshotGeneratorSchema);
var Snapshot = exports.Snapshot = mongoose.model('Snapshot', snapshotSchema);
var SnapshotData = exports.SnapshotData = mongoose.model('SnapshotData', snapshotDataSchema);

exports.createSnapshotFromGenerator = function (generator, callback) {
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
};