var model = require('../libs/model.js');

var Set = model.Set;

exports.index = function (req, res) {
  Set.find({ deleted: { $ne: true } }).sort('_id').exec(function (err, sets) {
    var userSets = [];

    sets.forEach(function (s) {
      if (req.user.can('view', s.id))
        userSets[userSets.length] = s;
    });

    res.render('index', { sets: userSets });
  });
};

exports.angular = function (req, res) {
	Set.find({ deleted: { $ne: true } }).sort('_id').exec(function (err, sets) {
		var userSets = [];

		sets.forEach(function (s) {
			if (req.user.can('view', s.id))
				userSets[userSets.length] = s;
		});

		res.render('angular', { sets: userSets });
	});
};

exports.cultures = function (req, res) {
  res.render('cultures', {});
};