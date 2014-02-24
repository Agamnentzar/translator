/// <reference path="jquery.min.js" />

$.postJSON = function (url, data, success, error) {
  $.ajax({ url: url, method: 'post', dataType: 'json', data: data, success: success, error: error });
};

var Api = (function () {
  var Api = {};

  var activeSet = {};
  var sets = [];
  var data = {};
  var rows = [];
  var viewAll, viewRef, viewTgt;
  var permissions = null;
  var langDropdowns = null;
  var doNotRefresh = false;
  var rowHtml = $('<div class="row"></div>');
  var cellHtml = $('<div class="cell edit"></div>');

  function refreshView() {
    viewRef = data.langIds.indexOf(localStorage.ref);
    viewTgt = data.langIds.indexOf(localStorage.target);
    viewAll = viewRef === -1 && viewTgt === -1;
  }

  function isSpecial(key) {
    return /_P\d+$/.test(key || '');
  }

  function getSet() {
    for (var i = 0; i < sets.length; i++) {
      if (sets[i].id === localStorage.setId)
        return sets[i];
    }

    return sets[0];
  }

  function getRow(termId) {
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].termId === termId)
        return rows[i];
    }

    return null;
  }

  function getCell(termId, langIndex) {
    var row = getRow(termId);

    if (row) {
      var cells = row.row.find('.cell').get();

      for (var j = 0; j < cells.length; j++) {
        var c = $(cells[j]);

        if (c.data('lang') === langIndex)
          return c;
      }
    }

    return $();
  }

  function getTermId(key) {
    for (var i = 0; i < data.terms.length; i++) {
      if (data.terms[i].entries[0] === key)
        return data.terms[i].id;
    }

    return null;
  }

  function rebuildHead() {
    var ref = localStorage.ref;
    var tgt = localStorage.target;
    var all = ref === 'none' && tgt === 'none';

    var table = $('<div class="table"></div>');
    var head = $('<div class="row head"></div>');
    var counters = $('<div class="row head counters"></div>');

    $('<div class="cell"></div>').appendTo(head);
    $('<div class="cell"><button class="btn btn-sm btn-default button-cancel-moving" style="display: none;">cancel moving</button></div>').appendTo(counters);

    data.langs.forEach(function (l) {
      if (all || l.id === ref || l.id === tgt) {
        $('<div class="cell"><img class="flag" src="/images/flags/' + l.id + '.png" title="' + l.name + '" />' +
          l.name + '<span class="adnotation"> (' + l.id + ')</span></div>').appendTo(head);
        l.counters = $('<div class="cell">' +
            '<abbr title="words">WR</abbr>: <span class="counter-words"></span><br />' +
            '<abbr title="characters (no space)">CN</abbr>: <span class="counter-chars"></span><br />' +
            '<abbr title="characters (with space)">CW</abbr>: <span class="counter-allchars"></span><br />' +
          '</div>').appendTo(counters);

        l.counters.words = l.counters.find('.counter-words');
        l.counters.chars = l.counters.find('.counter-chars');
        l.counters.allchars = l.counters.find('.counter-allchars');
      }
    });

    table.append(head).append(counters);
    $('#scrollable-head').empty().append(table).find('[title]').tooltip();

    refreshCounters();
  }

  function createRow(term) {
    var p = data.permissions;
    var row = rowHtml.clone();
    var search = ' ';
    var all = viewAll, ref = viewRef, tgt = viewTgt;

    term.entries.forEach(function (e, i) {
      if (all || i === 0 || i === ref || i === tgt) {
        search += e + ' ';
        cellHtml.clone().data({ term: term.id, lang: i })
                .toggleClass('key', i === 0).toggleClass('edit', p[i])
                .text(e).appendTo(row);
      }
    });

    if (isSpecial(term.entries[0]))
      row.addClass('special');

    return { search: search.toLowerCase(), row: row, termId: term.id };
  }

  function rebuildRows() {
    rows = data.terms.map(function (t) {
      return createRow(t);
    });

    search();

    var table = $('<div class="table"></div>');

    rows.forEach(function (row) {
      table.append(row.row);
    });

    $('#scrollable').empty().append(table);
  }

  // TODO: check duplicate keys

  function nonZeroLength(x) {
    return x.length > 0;
  }

  function count(text) {
    text = text || '';

    return {
      words: text.split(/\s+/).filter(nonZeroLength).length,
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

    $.getJSON('/api/get', { setId: set.id }, function (_data) {
      data = _data;
      data.setId = set.id;
      data.langIds = ['key'].concat(data.langs.map(function (l) { return l.id; }));

      var p = permissions[set.id];

      data.permissions = data.langIds.map(function (l) {
        return p.add || p.all || p[l];
      });

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

      $('#controls').css('visibility', 'visible');
      $('#loading').hide();
      $('#scrollable-head').show();
      $('#scrollable').show();
    });
  }

  function search() {
    var val = $('#search').val().toLowerCase();

    rows.forEach(function (r) {
      r.row.css('display', val === '' || r.search.indexOf(val) !== -1 ? 'table-row' : 'none');
    });
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
          break;
        }
      }

      getCell(termId, langIndex).text(value).removeClass('changing').addClass('changed');

      refreshCounters();
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

      for (var i = 0; i < data.terms.length; i++) {
        if (data.terms[i].id === termId) {
          delete data.terms[i];
          break;
        }
      }

      for (var i = 0; i < rows.length; i++) {
        if (rows[i].termId === termId) {
          rows[i].row.remove();
          delete rows[i];
          break;
        }
      }
    });
  }

  function addTerm(key) {
    $.postJSON('/api/add', { setId: data.setId }, function (term) {
      if (term.error)
        return console.log(term.error);

      term.entries = new Array(data.langIds.length);

      for (var i = 0; i < term.entries.length; i++)
        term.entries[i] = '';

      prepareTerm(term);

      var row = createRow(term);
      rows[rows.length] = row
      $('#scrollable > .table').append(row.row);
      $('#scrollable').scrollTop($('#scrollable').height());

      if (key)
        setValue(term.id, 'key', key);
    });
  }

  function init() {
    var movingTermId = null;
    var buttons1 = $('<button class="btn btn-xs btn-default button-here button-here-before">here</button>');
    var buttons2 = $('<button class="btn btn-xs btn-default button-here button-here-after">here</button>');
    var editorHtml = $('<div class="editor"><div class="editor-controls">' +
                         '<button class="btn btn-xs btn-danger button-cancel">cancel</button> ' +
                         //'<button class="btn btn-xs btn-warning button-ok" disabled>undo</button> ' +
                         //'<button class="btn btn-xs btn-warning button-ok" disabled>redo</button> ' +
                         '<button class="btn btn-xs btn-success button-ok">ok</button> ' +
                       '</div><div class="editor-controls-key">' +
                         '<button class="btn btn-xs btn-danger button-delete">delete</button> ' +
                         //'<button class="btn btn-xs btn-default button-add-below">add</button> ' +
                         //'<button class="btn btn-xs btn-default button-move">move</button> ' +
                         //'<button class="btn btn-xs btn-default button-copy" disabled>copy to</button> ' +
                       '</div><textarea></textarea></div>');

    permissions = {};
    langDropdowns = $('#lang-ref > ul, #lang-target > ul');

    $('#translator').on('click', '.button-cancel-moving', function () {
      movingTermId = null;
      $('.button-cancel-moving').hide();
    });

    $('#translator').on('click', '.button-here', function () {
      movingTermId = null;
      $('.button-cancel-moving').hide();
      buttons1.remove();
      buttons2.remove();

      // TODO: move...
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

    $('.button-add').on('click', function () {
      addTerm();
    });

    $('#scrollable').on('click', '.edit', function () {
      var cell = $(this);
      var offset = cell.offset();
      var w = cell.width();
      var h = cell.height();
      var editor = editorHtml.clone();

      function handleScroll() {
        var offset = cell.offset();
        editor.offset(offset);
      }

      var text = cell.text();
      var area = editor.find('textarea');

      if (cell.parent().is('.special')) {
        offset.top += 2;
        h += 2;
      }

      editor.width(w + 10).height(h + 10).toggleClass('key', cell.is('.key')).appendTo('#translator').offset(offset);

      editor.find('.button-cancel').on('mousedown', function () {
        area.val(text);
      });

      editor.find('.button-move').on('mousedown', function () {
        movingTermId = cell.data('term');
        $('.button-cancel-moving').show();
      });

      editor.find('.button-add-below').on('mousedown', function () {
        // TODO: ...
      });

      editor.find('.button-delete').on('mousedown', function () {
        if (confirm('Are you sure you want to delete this entry ?')) {
          deleteTerm(cell.data('term'));
        }
      });

      area.val(text).width(w).height(h).focus().blur(function () {
        editor.remove();
        $('#scrollable').off('scroll', handleScroll);

        var newText = area.val();

        if (newText !== text) {
          cell.text(newText).addClass('changing');
          setValue(cell.data('term'), data.langIds[cell.data('lang')], newText);
        }

        return false;
      });

      $('#scrollable').on('scroll', handleScroll);

      return false;
    });

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
      }
    }).on('mouseout', '.key', function () {
      //$(this).find('.buttons').remove();
    });

    initSet(getSet());
  };

  // Api.switchSet = function (set) ...

  Api.data = function () {
    return data;
  };

  Api.keys = function () {
    return data.terms.map(function (t) {
      return t.entries[0];
    });
  };

  Api.set = function (key, lang, value) {
    if (data.langIds.indexOf(lang) === -1)
      return console.log('invalid lang');

    var termId = getTermId(key);

    if (termId === null)
      return console.log('key not found');

    return setValue(termId, lang, value);
  };

  //Api.move = function (key, refKey, place /*['before'|'after']*/) {
  //  if (key === refKey)
  //    return console.log('keys cannot be the same');
  //
  //  //...
  //};

  Api.add = function (key/*, beforeKey [optional]*/) {
    // TODO: handle beforeKey
    addTerm(key);
  };

  Api.delete = function (key) {
    var termId = getTermId(key);

    if (termId === null)
      return console.log('key not found');

    deleteTerm(termId);
  };

  $(init);

  return Api;
})();