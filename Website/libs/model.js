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
  password: String,
  admin: Boolean,
  permissions: [
    {
      setId: Schema.ObjectId,
      permissions: [String]
    }
  ]
});

userSchema.methods.can = function (setId, permission) {
  var permissions = this.permissions;

  for (var i = 0; i < permissions.length; i++) {
    if (permissions[i].setId.equals(setId))
      return permissions[i].permissions.indexOf(permission) !== -1;
  }

  return false;
};

var setSchema = new Schema({
  name: String,
  title: String,
  langs: [String]
});

var Session = exports.Session = mongoose.model('Session', sessionSchema);
var User = exports.User = mongoose.model('User', userSchema);
var Set = exports.Set = mongoose.model('Set', setSchema);
