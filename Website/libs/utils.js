exports.map = function (items) {
  var map = {};

  items.forEach(function (i) {
    map[i.id] = i;
  });

  return map;
};

exports.distribute = function (parents, children, idField, childrenField) {
  var map = exports.map(parents);

  parents.forEach(function (p) {
    p[childrenField] = [];
  });

  children.forEach(function (c) {
    var p = map[c[idField].toString()];

    if (p) {
      var array = p[childrenField];
      array[array.length] = c;
    }
  });
};

exports.deleteItem = function (type, redirect) {
  return function (req, res) {
    type.findById(req.params.id, function (err, item) {
      if (err || !item)
        return res.render('error', { error: err || 'item not found' });

      item.deleted = true;
      item.deletedDate = Date.now();
      item.save(function (err) {
        if (err)
          return res.render('error', { error: err });

        res.redirect(redirect || '/');
      });
    });
  }
};

exports.restoreItem = function (type, redirect) {
  return function (req, res) {
    type.findById(req.params.id, function (err, item) {
      if (err || !item)
        return res.render('error', { error: err || 'item not found' });

      item.deleted = false;
      item.save(function (err) {
        if (err)
          return res.render('error', { error: err });

        res.redirect(redirect || '/');
      });
    });
  }
};

exports.whenAll = function (items, action, callback) {
  if (!items || items.length === 0)
    return callback();

  var todo = items.length, error = null;

  function done(err) {
    error = err || error;

    if (--todo <= 0)
      callback(error);
  }

  items.forEach(function (item) {
    action(item, done);
  });
};