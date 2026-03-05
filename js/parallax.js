/**
 * Parallax: sections start spread out (not touching); scroll brings them
 * to manifest stopping position where they touch and connect.
 * Uses centroid to push each section outward from frame center.
 */
(function () {
  var data = window.ART_DATA;
  if (!data || !data.sections || !data.sections.length) return;

  var sections = data.sections;
  var scrollWrap = document.querySelector('.scroll-wrap');
  var frameEl = document.querySelector('.assembly-frame');
  var sectionEls = document.querySelectorAll('.sections .section');
  if (!scrollWrap || !frameEl || sectionEls.length !== sections.length) return;

  var runHeight = scrollWrap.offsetHeight - (window.innerHeight || document.documentElement.clientHeight);

  function getSpread() {
    var w = frameEl.offsetWidth;
    var h = frameEl.offsetHeight;
    return Math.max(w, h) * 1.2;
  }

  function setProgress(p) {
    p = Math.max(0, Math.min(1, p));
    var spread = getSpread();
    sections.forEach(function (s, i) {
      var el = sectionEls[i];
      if (!el) return;
      var cx = s.centroidFracX != null ? s.centroidFracX : 0.5;
      var cy = s.centroidFracY != null ? s.centroidFracY : 0.5;
      var dx = (cx - 0.5) * 2;
      var dy = (cy - 0.5) * 2;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      dx /= len;
      dy /= len;
      var fromX = dx * spread * (1 - p);
      var fromY = dy * spread * (1 - p);
      var rot = (s.rotation || 0) * p;
      el.style.transform = 'translate(' + fromX + 'px,' + fromY + 'px) rotate(' + rot + 'deg)';
      el.classList.toggle('assembled', p >= 1);
    });
  }

  function onScroll() {
    var rect = scrollWrap.getBoundingClientRect();
    var viewHeight = window.innerHeight || document.documentElement.clientHeight;
    var top = rect.top;
    if (top > viewHeight) {
      setProgress(0);
      return;
    }
    if (top + rect.height < 0) {
      setProgress(1);
      return;
    }
    var progress = -top / runHeight;
    setProgress(progress);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    runHeight = scrollWrap.offsetHeight - (window.innerHeight || document.documentElement.clientHeight);
    onScroll();
  });
  onScroll();
})();
