var model = require('../libs/model.js');

var Set = model.Set;

exports.index = function (req, res) {
  Set.find(function (err, sets) {
    res.render('index', { sets: sets });
  });
};

exports.cultures = function (req, res) {
   res.render('cultures', {});
};