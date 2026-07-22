(function () {
  var list = document.getElementById('live-news-list');
  var status = document.getElementById('live-news-status');
  if (!list) return;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderItem(item) {
    var date = '';
    if (item.pubDate) {
      var d = new Date(item.pubDate);
      if (!isNaN(d)) date = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
    return (
      '<li class="news-item">' +
      '<a href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(item.title) +
      '</a>' +
      '<span class="news-meta">' + escapeHtml(item.source || 'Fuente externa') + (date ? ' · ' + date : '') + '</span>' +
      '</li>'
    );
  }

  fetch('/api/news')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.items || !data.items.length) return;
      list.innerHTML = data.items.map(renderItem).join('');
      if (status) {
        status.textContent = 'Actualizado en directo · ' + new Date(data.updatedAt).toLocaleString('es-ES');
      }
    })
    .catch(function () {
      // Sin conexión con /api/news: se deja el contenido estático generado en el build.
    });
})();
