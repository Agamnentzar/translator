/// <reference path="jquery.min.js" />
/// <reference path="moment.min.js" />

$(function () {
  $('[title]').tooltip();

  $(document).on('click', '.confirm', function () {
    return confirm($(this).data('confirm') || 'Are you sure ?');
  });

  $('time').each(function () {
    $(this).text(moment($(this).attr('pubdate')).format('DD MMM YYYY HH:mm'));
  });

  $('.button-show-deleted').on('change', function () {
    localStorage.showDeleted = $(this).prop('checked');
    $('#page').toggleClass('hide-deleted', !$(this).prop('checked'));
  }).prop('checked', localStorage.showDeleted === 'true').change();

  $('.permission-view').on('change', function () {
    var checked = $(this).prop('checked');
    var inputs = $(this).parent().parent().find('.permission-add-remove, .permission-edit-all, .permission-edit-lang');
    inputs.prop('disabled', !checked);

    if (!checked)
      inputs.prop('checked', false);
  }).change();

  $('.permission-add-remove').on('change', function () {
    var checked = $(this).prop('checked');

    $(this).parent().parent().find('.permission-edit-all, .permission-edit-lang')
           .prop('checked', checked).prop('disabled', checked);
  }).each(function () {
    if ($(this).prop('checked')) {
      $(this).parent().parent().find('.permission-edit-all, .permission-edit-lang')
             .prop('checked', true).prop('disabled', true);
    }
  });

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

    $(this).on('click', '.form-items-remove', function () {
      $(this).parents('.lang-entry').remove();
      update();
      return false;
    });

    $(this).on('click', '.form-items-up, .form-items-down', function () {
      var up = $(this).is('.form-items-up');
      var entry = $(this).parents('.lang-entry');
      var other = entry[up ? 'prev' : 'next']();

      if (other.length > 0)
        entry.remove()[up ? 'insertBefore' : 'insertAfter'](other);

      return false;
    });

    update();
  });

  $('.changes-table .changed').hover(function () {
    var offset = $(this).offset();
    offset.left = Math.max(300, offset.left + $(this).outerWidth() / 2);
    $('#popover').find('h3').html('<b>' + moment($(this).data('date')).fromNow() + '</b> by <b>' + $(this).data('user') + '</b>');
    $('#popover').find('p').text($(this).data('value'));
    $('#popover').show().offset(offset);
  }, function () {
    $('#popover').hide();
  });
});
