$(function () {
  $('[title]').tooltip();

  $(document).on('click', '.confirm', function () {
    return confirm($(this).data('confirm') || 'Are you sure ?');
  });

  $('.permission-view').on('change', function () {
    var checked = $(this).prop('checked');
    var inputs = $(this).parent().parent().find('.permission-add-remove, .permission-edit-all, .permission-edit-lang');
    inputs.prop('disabled', !checked);

    if (!checked)
      inputs.prop('checked', false);
  }).change();

  $('.permission-edit-all').on('change', function () {
    var checked = $(this).prop('checked');

    $(this).parent().parent().find('.permission-edit-lang')
           .prop('checked', checked).prop('disabled', checked);
  }).each(function () {
    if ($(this).prop('checked')) {
      $(this).parent().parent().find('.permission-edit-lang')
             .prop('checked', true).prop('disabled', true);
    }
  });

  $('.form-items').each(function () {
    var template = $('#form-items-template > *');
    var list = $(this).find('.form-items-list');
    var select = $(this).find('.form-items-selector');
    var options = select.find('option');

    function update() {
      var values = [];

      list.find('input').each(function () {
        values[values.length] = $(this).val();
      });

      select.empty();

      options.each(function () {
        if (values.indexOf($(this).attr('value')) === -1)
          select.append(this);
      });

      select.val(0);
    }

    select.on('change', function () {
      var val = $(this).val();
      var name = $(this).find('[value="' + val + '"]').text();

      if (val) {
        var tpl = template.clone();
        tpl.find('input').val(val);
        tpl.find('b').text(name);
        tpl.find('img').attr('src', '/images/flags/' + val + '.png');
        tpl.appendTo(list);
        $(this).val('');
        update();
      }
    });

    $(this).on('click', 'button', function () {
      $(this).parent().remove();
      update();
    });

    update();
  });
});

$(function () {
  $('#translator').each(function () {
    var langs = [{ id: 'en', name: 'English' }, { id: 'pl', name: 'Polish' }, { id: 'de', name: 'German' }, { id: 'fr', name: 'French' }, { id: 'es', name: 'Spanish' }, { id: 'it', name: 'Italian' }, { id: 'no', name: 'Norwegian' }]
    var text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut ultricies arcu. Cras molestie eros id tortor rutrum, nec accumsan urna convallis. Donec aliquet consectetur blandit. Sed sodales id neque suscipit sagittis. Sed quis justo iaculis nunc suscipit auctor ut ac nulla. Integer et elit at arcu convallis adipiscing. Integer scelerisque eros laoreet pulvinar laoreet. Ut condimentum arcu non mi vehicula pretium. Maecenas quis mattis nunc, vel dictum ipsum. Duis condimentum faucibus sem, sed ultricies orci. Suspendisse vestibulum augue sit amet neque viverra aliquet. Aliquam et ligula in purus adipiscing sagittis. Nunc mollis felis vitae accumsan tempus. Sed iaculis neque dolor, ullamcorper dapibus erat mattis quis. Donec nunc sapien, dictum et odio quis, pretium ultrices lorem.';

    var targetUl = $('#lang-target > ul');
    var refUl = $('#lang-ref > ul');

    langs.forEach(function (l) {
      var html = '<li><a href="#"><img class="flag" src="/images/flags/' + l.id + '.png" />' + l.name + '</a></li>';
      $(html).appendTo(targetUl);
      $(html).appendTo(refUl);
    });

    var table = $('<div class="table"></div>');
    var head = $('<div class="row head"></div>');
    var counters = $('<div class="row head counters"></div>');

    $('<div class="cell"></div>').appendTo(head);
    $('<div class="cell"></div>').appendTo(counters);

    langs.forEach(function (l) {
      $('<div class="cell"><img class="flag" src="/images/flags/' + l.id + '.png" />' + l.name +
        '<span class="adnotation"> (' + l.id + ')</span></div>').appendTo(head);
      $('<div class="cell">' +
          '<abbr title="words">WR</abbr>: <span>000000</span><br />' +
          '<abbr title="characters (no space)">CN</abbr>: <span>000000</span><br />' +
          '<abbr title="characters (with space)">CW</abbr>: <span>000000</span><br />' +
        '</div>').appendTo(counters);
    });

    table.append(head);
    table.append(counters);

    $('#table-head').empty().append(table);

    table = $('<div class="table"></div>');

    for (var i = 0; i < 100; i++) {
      var row = $('<div class="row"></div>');

      $('<div class="cell"></div>').text('test').appendTo(row);

      langs.forEach(function () {
        var cell = $('<div class="cell"></div>').text(text).appendTo(row);
      });

      row.appendTo(table);
    }

    $('#scrollable').empty().append(table);

    // ----

    $('#lang-ref, #lang-target').on('click', 'a', function () {
      //...
    });
  });
});