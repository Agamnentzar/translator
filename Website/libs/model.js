var mongoose = require('mongoose')
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

exports.Session = mongoose.model('Session', sessionSchema);
exports.User = mongoose.model('User', userSchema);
exports.Set = mongoose.model('Set', setSchema);
exports.Term = mongoose.model('Term', termSchema);
exports.Entry = mongoose.model('Entry', entrySchema);
exports.SnapshotGenerator = mongoose.model('SnapshotGenerator', snapshotGeneratorSchema);
exports.Snapshot = mongoose.model('Snapshot', snapshotSchema);
exports.SnapshotData = mongoose.model('SnapshotData', snapshotDataSchema);