/* Hanori — trang chi tiết: đổi ảnh chính khi bấm thumbnail */
(function () {
  "use strict";
  var main = document.getElementById("pdpMain");
  if (!main) return;
  var thumbs = document.querySelectorAll(".pdp-thumb");
  thumbs.forEach(function (t) {
    t.addEventListener("click", function () {
      var src = t.getAttribute("data-src");
      if (!src) return;
      main.src = src;
      thumbs.forEach(function (x) { x.classList.remove("active"); });
      t.classList.add("active");
    });
  });
})();
