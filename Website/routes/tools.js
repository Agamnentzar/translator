var exec = require('child_process').exec;

exports.qr = function (req, res) {
  res.render('tools/qr');
};

exports.qrPost = function (req, res) {
  res.send(req.body);

  //var foo = spawn('generate_qr', ['-a', '/foo']);
  // exec('cat sdgs dg sg df', function (err, stdout, stderr) { });
};