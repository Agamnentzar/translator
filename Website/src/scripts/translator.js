/// <reference path="jquery.min.js" />

$.postJSON = function (url, data, success, error) {
	$.ajax({ url: url, method: 'post', dataType: 'json', data: data, success: success, error: error });
};

(function () {
	var activeSet = {};
	var sets = [];
	var data = {};
	var viewAll, viewRef, viewTgt;
	var permissions = null;
	var langDropdowns = null;
	var doNotRefresh = false;
	var rowHtml = $('<div class="row"></div>');
	var cellHtml = $('<div class="cell edit"><span class="label label-success modified-tag">modified <i class="fa fa-check"></i></span><div></div></div>');

	function refreshView() {
		viewRef = data.langIds.indexOf(localStorage.ref);
		viewTgt = data.langIds.indexOf(localStorage.target);
		viewAll = viewRef === -1 && viewTgt === -1;
	}

	function isSpecial(key) {
		return /(_Custom|_P\d+)$/.test(key || '');
	}

	function getSet() {
		for (var i = 0; i < sets.length; i++) {
			if (sets[i].id === localStorage.setId)
				return sets[i];
		}

		return sets[0];
	}

	function getTermId(key) {
		for (var i = 0; i < data.terms.length; i++) {
			if (data.terms[i].entries[0] === key)
				return data.terms[i].id;
		}

		return null;
	}

	function getTermIndex(termId) {
		for (var i = 0; i < data.terms.length; i++) {
			if (data.terms[i].id === termId)
				return i;
		}

		return -1;
	}

	function getCell(termId, langIndex) {
		var index = getTermIndex(termId);

		if (index >= 0) {
			var cells = data.terms[index].row.find('.cell').get();

			for (var j = 0; j < cells.length; j++) {
				var c = $(cells[j]);

				if (c.data('lang') === langIndex)
					return c;
			}
		}

		return $();
	}

	function rebuildHead() {
		var ref = localStorage.ref;
		var tgt = localStorage.target;
		var all = ref === 'none' && tgt === 'none';

		var table = $('<div class="main-table"></div>');
		var head = $('<div class="row head"></div>');
		var counters = $('<div class="row head counters"></div>');

		$('<div class="cell">TAG</div>').appendTo(head);
		$('#firstcell-template > *').clone().appendTo(counters);

		data.langs.forEach(function (l) {
			if (all || l.id === ref || l.id === tgt) {
				$('<div class="cell"><img class="flag" src="/images/flags/' + l.id + '.png" title="' + l.name + '" />' +
          l.name + '<span class="adnotation"> (' + l.id + ')</span></div>').appendTo(head);
				l.counters = $('#counters-template > *').clone().appendTo(counters);
				l.counters.words = l.counters.find('.counter-words');
				l.counters.chars = l.counters.find('.counter-chars');
				l.counters.allchars = l.counters.find('.counter-allchars');
			}
		});

		table.append(head).append(counters);
		$('#scrollable-head').empty().append(table).find('[title]').tooltip({ placement: 'left' });

		refreshCounters();
	}

	function isTermVisible(i) {
		return viewAll || i === 0 || i === viewRef || i === viewTgt;
	}

	function createRow(term) {
		var p = data.permissions;
		var row = rowHtml.clone();

		term.entries.forEach(function (e, i) {
			if (isTermVisible(i)) {
				var cell = cellHtml.clone();
				cell.data({ term: term.id, lang: i })
				 .toggleClass('key', i === 0)
				 .toggleClass('edit', p[i])
				 .toggleClass('modified', term.modified[i]);
				cell.children().last().text(e);
				cell.appendTo(row);
			}
		});

		if (isSpecial(term.entries[0]))
			row.addClass('special');

		term.row = row;
		term.search = createSearch(term);
	}

	function createSearch(term) {
		var search = [];

		term.entries.forEach(function (e, i) {
			if (isTermVisible(i) && e)
				search.push(e.toLowerCase());
		});

		return search.join(' ');
	}

	function rebuildRows() {
		data.terms.forEach(createRow);

		search();

		var table = $('<div class="main-table"></div>');

		data.terms.forEach(function (t) {
			table.append(t.row);
		});

		$('#scrollable').empty().append(table);
	}

	function checkDuplicates() {
		var keys = [];

		data.terms.forEach(function (t) {
			if (keys.indexOf(t.entries[0]) === -1) {
				t.row.removeClass('duplicate');
				keys[keys.length] = t.entries[0];
			} else {
				t.row.addClass('duplicate');
			}
		});
	}

	function count(text) {
		text = text || '';

		return {
			words: text.split(/\s+/).filter(function (x) { return x.length > 0; }).length,
			chars: text.replace(/\s/g, '').length,
			allchars: text.length
		};
	}

	function refreshCounters() {
		var ref = localStorage.ref;
		var tgt = localStorage.target;
		var all = ref === 'none' && tgt === 'none';

		data.langs.forEach(function (l, i) {
			if (all || l.id === ref || l.id === tgt) {
				var words = 0, chars = 0, allchars = 0;

				data.terms.forEach(function (t) {
					var c = t.counts[i + 1];
					words += c.words;
					chars += c.chars;
					allchars += c.allchars;
				});

				l.counters.words.text(words);
				l.counters.chars.text(chars);
				l.counters.allchars.text(allchars);
			}
		});
	}

	function prepareTerm(t) {
		t.counts = new Array(t.entries.length);
		t.changed = new Array(t.entries.length);

		for (var i = 0; i < t.entries.length; i++)
			t.counts[i] = count(t.entries[i]);
	}

	function initSet(set) {
		if (!set || (set && activeSet.id === set.id))
			return;

		activeSet = set;
		localStorage.setId = set.id;

		langDropdowns.empty();
		$('#scrollable-head').empty();
		$('#scrollable').empty();
		$('#loading').show();
		$('#dropdown-set .value').text(set.title);

		$.getJSON('/api/get', { setId: set.id, timestamp: Date.now() }, function (_data) {
			data = _data;
			data.setId = set.id;
			data.langIds = ['key'].concat(data.langs.map(function (l) { return l.id; }));

			var p = permissions[set.id];

			data.permissions = data.langIds.map(function (l) {
				return p.add || p.all || p[l];
			});

			$('.button-add').prop('disabled', !p.add);

			langDropdowns.append('<li><a href="#" class="lang-none" data-lang="none">none</a></li>');

			data.langs.forEach(function (l) {
				langDropdowns.append('<li><a href="#" class="lang-' + l.id + '" data-lang="' + l.id + '">' +
                             '<img class="flag" src="/images/flags/' + l.id + '.png" />' + l.name + '</a></li>');
			});

			data.terms.forEach(prepareTerm);

			var ref = localStorage.ref;
			var target = localStorage.target;

			if (ref !== 'none' && data.langIds.indexOf(ref) === -1)
				localStorage.ref = ref = data.langIds[1] || 'none';

			if (target !== 'none' && data.langIds.indexOf(target) === -1) {
				localStorage.target = target = Object.keys(p).filter(function (x) {
					return x !== 'view' && x !== 'all' && x !== 'add' && x !== ref;
				})[0];

				if (data.langIds.indexOf(target) === -1)
					localStorage.target = target = 'none';
			}

			refreshView();
			rebuildHead();
			rebuildRows();
			checkDuplicates();

			doNotRefresh = true;

			if ($('#lang-ref').find('.lang-' + ref).length > 0)
				$('#lang-ref').find('.lang-' + ref).click();
			else
				$('#lang-ref').find('.lang-none').click();

			if ($('#lang-target').find('.lang-' + target).length > 0)
				$('#lang-target').find('.lang-' + target).click();
			else
				$('#lang-target').find('.lang-none').click();

			doNotRefresh = false;

			$('.version').text(data.version);
			$('#controls').css('visibility', 'visible');
			$('#loading').hide();
			$('#scrollable-head').show();
			$('#scrollable').show();
		});
	}

	function search() {
		var val = $('#search').val().toLowerCase();

		data.terms.forEach(function (t) {
			t.row.css('display', val === '' || t.search.indexOf(val) !== -1 ? 'table-row' : 'none');
		});

		updateShadow();
	}

	function setValue(termId, lang, value) {
		$.postJSON('/api/set', { termId: termId, lang: lang, value: value }, function (e) {
			var i, terms = data.terms;
			var langIndex = data.langIds.indexOf(lang);

			if (e.error) {
				getCell(termId, langIndex).removeClass('changing').addClass('error');
				return console.log('set - error: ' + e.error);
			}

			for (i = 0; i < terms.length; i++) {
				var t = terms[i];

				if (t.id === termId) {
					t.entries[langIndex] = value;
					t.changed[langIndex] = true;
					t.counts[langIndex] = count(value);
					t.search = createSearch(t);
					break;
				}
			}

			getCell(termId, langIndex)
				.removeClass('changing')
				.addClass('changed')
				.addClass('modified')
    		.children().last().text(value);
			refreshCounters();
			checkDuplicates();
		}, function () {
			console.log('set - network error');
			setTimeout(function () {
				setValue(termId, lang, value);
			}, 1000);
		});
	}

	function deleteTerm(termId) {
		$.postJSON('/api/delete', { termId: termId }, function (e) {
			if (e.error)
				return console.log(e.error);

			var index = getTermIndex(termId);
			data.terms[index].row.remove();
			data.terms.splice(index, 1);
		});
	}

	function addTerm(key, beforeTermId) {
		$.postJSON('/api/add', { setId: data.setId, beforeTermId: beforeTermId }, function (term) {
			if (term.error)
				return console.log(term.error);

			term.entries = new Array(data.langIds.length);

			for (var i = 0; i < term.entries.length; i++)
				term.entries[i] = '';

			prepareTerm(term);
			createRow(term);

			if (beforeTermId) {
				var beforeTermIndex = getTermIndex(beforeTermId);
				data.terms[beforeTermIndex].row.before(term.row);
				data.terms.splice(beforeTermIndex, 0, term);
			} else {
				data.terms[data.terms.length] = term;
				$('#scrollable > .main-table').append(term.row);
				$('#scrollable').scrollTop($('#scrollable > .main-table').height());
			}

			if (key)
				setValue(term.id, 'key', key);
			else
				$(term.row.find('.edit')[0]).click();
		});
	}

	function moveTerm(termId, refId, place) {
		$.postJSON('/api/move', { setId: data.setId, termId: termId, refId: refId, place: place }, function (result) {
			if (result.error)
				return console.log(result.error);

			var termIndex = getTermIndex(termId);
			var refIndex = getTermIndex(refId);
			var term = data.terms[termIndex];
			var ref = data.terms[refIndex];

			if (termIndex < refIndex)
				refIndex--;
			if (place === 'after')
				refIndex++;

			data.terms.splice(termIndex, 1);
			data.terms.splice(refIndex, 0, term);
			ref.row[place](term.row.detach());
		});
	}

	function clearModified() {
		var target = $('#lang-target').data('lang');

		$.postJSON('/api/clearModified', { setId: activeSet.id, lang: target }, function (result) {
			if (result.error) {
				console.log(result.error);
				return;
			}

			var targetIndex = data.langIds.indexOf(target);

			data.terms.forEach(function (term) {
				term.modified[targetIndex] = false;
			});

			rebuildRows();
		});
	}

	function init() {
		var movingTermId = null, movingRefId = null;
		var buttons1 = $('<button class="btn btn-xs btn-default button-here button-here-before">here</button>');
		var buttons2 = $('<button class="btn btn-xs btn-default button-here button-here-after">here</button>');

		permissions = {};
		langDropdowns = $('#lang-ref > ul, #lang-target > ul');

		$('#translator').on('click', '.button-cancel-moving', function () {
			movingTermId = null;
			$('.button-cancel-moving').hide();
		});

		$('#translator').on('click', '.button-here', function () {
			$('.button-cancel-moving').hide();
			buttons1.remove();
			buttons2.remove();

			moveTerm(movingTermId, movingRefId, $(this).hasClass('button-here-before') ? 'before' : 'after');
			movingRefId = movingTermId = null;
		});

		$('#translator').data('permissions').forEach(function (p) {
			var map = {};

			p.permissions.forEach(function (x) {
				map[x] = true;
			});

			permissions[p.setId] = map;
		});

		$('#dropdown-set a').each(function () {
			sets[sets.length] = { id: $(this).data('id'), title: $(this).text() };
		});

		$('#dropdown-set').on('click', 'a', function (e) {
			e.preventDefault();
			initSet({ id: $(this).data('id'), title: $(this).text() });
		});

		$('#lang-ref, #lang-target').on('click', 'a', function (e) {
			e.preventDefault();

			var parent = $(this).parents('.btn-group');
			parent.data('lang', $(this).data('lang'));
			parent.find('.value').html($(this).html());

			var ref = $('#lang-ref').data('lang');
			var target = $('#lang-target').data('lang');

			if (localStorage.ref !== ref || localStorage.target !== target) {
				localStorage.ref = ref;
				localStorage.target = target;

				if (!doNotRefresh) {
					refreshView();
					rebuildHead();
					rebuildRows();
				}
			}
		});

		$('#search').on('change keyup', function () {
			search();
		});

		$('.button-clear').on('click', function () {
			clearModified();
		});

		$('.button-add').on('click', function () {
			addTerm();
		});

		$('.button-print').on('click', function () {
			window.open('/sets/print/' + data.setId + '?ref=' + $('#lang-ref').data('lang') + '&target=' + $('#lang-target').data('lang'));
		});

		$('#scrollable').on('click', '.edit', function () {
			var cell = $(this);
			var lang = data.langIds[cell.data('lang')];
			var termId = cell.data('term');
			var offset = cell.offset();
			var w = cell.width();
			var h = cell.height();
			var editor = $('#editor-template > *').clone();
			var text = cell.children().last().text();
			var area = editor.find('textarea');

			if (cell.parent().is('.special')) {
				offset.top += 2;
				h += 2;
			}

			function handleScroll() {
				editor.offset(cell.offset());
			}

			editor.width(w + 10).height(h + 10).toggleClass('key', cell.is('.key')).appendTo('#translator').offset(offset);

			editor.find('.editor-controls').on('mousedown', false);

			editor.find('.button-cancel').on('mousedown', function () {
				area.val(text).blur();
			});

			editor.find('.button-move').on('mousedown', function () {
				movingTermId = termId;
				$('.button-cancel-moving').show();
			});

			editor.find('.button-add-above').on('mousedown', function () {
				addTerm(null, termId);
			});

			editor.find('.button-delete').on('mousedown', function () {
				if (confirm('Are you sure you want to delete this entry ?'))
					deleteTerm(termId);
			});

			editor.find('.button-ok').on('mousedown', function () {
				area.blur();
			});

			area.val(text).width(w).height(h).focus().blur(function () {
				editor.remove();

				$('#scrollable').off('scroll', handleScroll);

				var newText = area.val();

				if (newText !== text) {
					cell.addClass('changing')
						.children().last().text(newText);
					setValue(termId, lang, newText);
				}

				return false;
			});

			$('#scrollable').on('scroll', handleScroll);

			$.getJSON('/api/history', { termId: termId, lang: lang }, function (history) {
				if (history.error)
					console.log(history.error);

				if (history.length > 1) {
					var position = history.length - 1;

					function updateEnabled() {
						editor.find('.button-undo').prop('disabled', position === 0);
						editor.find('.button-redo').prop('disabled', position === (history.length - 1));
					}

					editor.find('.button-undo').on('mousedown', function () {
						position--;
						area.val(history[position].value);
						updateEnabled();
						return false;
					});

					editor.find('.button-redo').on('mousedown', function () {
						position++;
						area.val(history[position].value);
						updateEnabled();
						return false;
					});

					updateEnabled();
				}
			});

			return false;
		});

		$('#scrollable').on('scroll', updateShadow);

		$('#translator').on('mouseover', '.cell', function () {
			buttons1.remove();
			buttons2.remove();

			if (movingTermId !== null && movingTermId !== $(this).data('term') && $(this).is('.edit.key')) {
				var offset = $(this).offset();
				offset.left += 10;
				offset.top -= 10;
				buttons1.appendTo('#translator').offset(offset);
				offset.top += $(this).height() + 10;
				buttons2.appendTo('#translator').offset(offset);
				movingRefId = $(this).data('term');
			}

			toggleActiveLang($(this).index(), true);
		}).on('mouseout', '.cell', function () {
			toggleActiveLang($(this).index(), false);
		});

		$(document).on('change', '.changes-area', function () {
			data.changes = $(this).val();

			$.postJSON('/api/changes', { setId: data.setId, changes: data.changes }, function (result) {
				if (result.error)
					return console.log(result.error);
			});
		});

		$('.button-changes').popover({
			placement: 'bottom',
			html: true,
			content: function () {
				return $('<div/>').append($('<textarea class="changes-area form-control" rows="5" />').text(data.changes)).html();
			}
		});

		$(window).resize(updateShadow);

		initSet(getSet());
	};

	function toggleActiveLang(lang, toggle) {
		if (lang !== undefined)
			$('#scrollable-head').find('.head .cell:nth-child(' + (lang + 1) + ')').toggleClass('active', toggle);
	}

	function updateShadow() {
		$('#scrollable-head').toggleClass('shadow', $('#scrollable').scrollTop() !== 0);
	}

	$(init);
})();
