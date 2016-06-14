var semicolonLanguages = ['pl'];

function encodeCSV(value) {
	value = value || '';
	value = value.replace(/"/g, '""');

	if (/[;,"\n]/.test(value)) {
		value = '"' + value + '"';
	}

	return value;
}

function decodeCSV(value) {
	if (value && /^"/.test(value) && /"$/.test(value)) {
		value = value.substr(1, value.length - 2);
		value = value.replace(/""/g, '"');
	}

	return value;
}

const commaSplitter = /,(?=(?:[^"]*"[^"]*")*(?![^"]*"))/g;
const semicolonSplitter = /;(?=(?:[^"]*"[^"]*")*(?![^"]*"))/g;

function continueLine(line) {
	line = line.replace(/""/, '');
	var quots = 0;

	for (var i = 0; i < line.length; i++) {
		if (line[i] === '"') {
			quots++;
		}
	}

	return quots % 2 === 1;
}

exports.decode = function (value) {
	var lines = value.split(/\r?\n/g);
	var nextLine;
	var splitter;
	var result = [];

	for (var li = 0; li < lines.length; li++) {
		var line = lines[li];

		while (continueLine(line) && (li < (lines.length - 1)))
			line += '\n' + lines[++li];

		if (!splitter) {
			var enc = false;

			for (var i = 0; i < line.length; i++) {
				if (!enc && (line[i] === ';' || line[i] === ',')) {
					splitter = line[i] === ';' ? semicolonSplitter : commaSplitter;
					break;
				}

				if (line[i] === '"') {
					if (line.length > (i + 1) && line[i + 1] === '"')
						i++;
					else
						enc = !enc;
				}
			}

			if (!splitter) {
				splitter = commaSplitter;
			}
		}

		result.push(line.split(splitter).map(decodeCSV));
	}

	return result;
};

exports.encode = function (value, lang) {
	const separator = (lang && semicolonLanguages.indexOf(lang) !== -1) ? ';' : ',';
	return value.map(line => line.map(encodeCSV).join(separator)).join('\r\n');
};
