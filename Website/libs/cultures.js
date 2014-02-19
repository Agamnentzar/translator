var fs = require('fs');
var file = fs.readFileSync(__dirname + '/../cultures.json', 'utf8');
var cultures = JSON.parse(file);

cultures.sort(function (a, b) {
  return a.name.localeCompare(b.name);
});

cultures.forEach(function (c) { c.flag = '/images/flags/' + c.id + '.png'; });

exports.all = cultures;

exports.get = function (id) {
  for (var i = 0; i < cultures.length; i++) {
    if (cultures[i].id === id)
      return cultures[i];
  }

  return null;
};