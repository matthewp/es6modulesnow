window.addEventListener('load', function onload() {
  window.removeEventListener('load', onload, false);

  var tags = document.querySelectorAll('script');
  Array.prototype.forEach.call(tags, function(tag) {
    var src = tag.dataset.src;
    if(!src || !tag.type || tag.type !== 'application/harmony') {
      return;
    }

    System.load(src);
  });
}, false);
