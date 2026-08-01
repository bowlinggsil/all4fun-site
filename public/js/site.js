/* באולינג שערי חדרה — לוגיקת צד לקוח.
   גרסת vanilla של הלוגיקה מייצוא Claude Design, בלי jQuery ובלי React.
   כל בלוק בודק שהאלמנטים שלו קיימים, כך שאותו קובץ רץ בכל ששת העמודים. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- תפריט נייד ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("mainnav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- פתיחת תפריט נפתח סוגרת את האחרים ---------- */
  document.addEventListener(
    "toggle",
    function (e) {
      var d = e.target;
      if (!d.matches || !d.matches(".nav details") || !d.open) return;
      document.querySelectorAll(".nav details[open]").forEach(function (o) {
        if (o !== d) o.open = false;
      });
    },
    true
  );

  /* ---------- קרוסלת ההירו ---------- */
  var slidesWrap = document.querySelector(".slides");
  if (slidesWrap && slidesWrap.children.length) {
    var dots = document.querySelectorAll(".slide-nav a");
    var idx = 0;
    var timer = null;

    function goTo(i) {
      var n = slidesWrap.children.length;
      idx = ((i % n) + n) % n;
      Array.prototype.forEach.call(slidesWrap.children, function (s, k) {
        s.classList.toggle("active", k === idx);
      });
      dots.forEach(function (d, k) {
        d.classList.toggle("active", k === idx);
      });
    }

    function restart() {
      clearInterval(timer);
      if (!reduced) timer = setInterval(function () { goTo(idx + 1); }, 5000);
    }

    goTo(0);
    restart();

    document.addEventListener("click", function (e) {
      var dot = e.target.closest(".slide-nav a");
      if (dot) {
        e.preventDefault();
        goTo(Array.prototype.indexOf.call(dot.parentElement.children, dot));
        restart();
        return;
      }
      var prev = e.target.closest(".slide-prev");
      if (prev) { e.preventDefault(); goTo(idx - 1); restart(); return; }
      var next = e.target.closest(".slide-next");
      if (next) { e.preventDefault(); goTo(idx + 1); restart(); }
    });

    /* גובה ההירו נגזר מגובה הכותרת החיה */
    function sizeHero() {
      var hdr = document.querySelector(".site-header");
      var h = window.innerHeight - (hdr ? hdr.offsetHeight : 0);
      document.querySelectorAll(".slide").forEach(function (s) {
        s.style.minHeight = h + "px";
      });
    }
    sizeHero();
    window.addEventListener("resize", sizeHero);
  }

  /* ---------- לייטבוקס וידאו ---------- */
  var lb = document.querySelector(".video-lightbox");
  if (lb) {
    var lbVideo = lb.querySelector("video");
    function closeLb() {
      lb.classList.remove("open");
      if (lbVideo) { lbVideo.pause(); lbVideo.removeAttribute("src"); lbVideo.load(); }
    }
    document.addEventListener("click", function (e) {
      var opener = e.target.closest("[data-video]");
      if (opener) {
        e.preventDefault();
        if (lbVideo) {
          lbVideo.src = opener.getAttribute("data-video");
          lbVideo.poster = opener.getAttribute("data-poster") || "";
          lbVideo.play().catch(function () {});
        }
        lb.classList.add("open");
        return;
      }
      if (e.target.closest(".lightbox-close") || e.target === lb) closeLb();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLb();
    });
  }

  /* ---------- רצף הסטרייק (דף הבית בלבד) ----------
     הכדור מתגלגל עם הגלילה; בתחתית העמוד הוא נורה אל הפינים,
     והווידאו מנוקה מהרקע הכהה על גבי canvas כדי שהפינים ישבו שקופים. */
  var ball = document.querySelector(".scroll-ball");
  var cam = document.querySelector(".strike-cam");
  var cv = cam && cam.querySelector("canvas");
  var vid = cam && cam.querySelector("video");

  if (ball && cam && cv && vid && !reduced) {
    var RATE = 2.4;
    var CROP = [120, 60, 1060, 640];
    var camRaf = 0, fadeRaf = 0, ballRaf = 0, striking = false;

    cv.width = 600;
    cv.height = 362;
    var cx = cv.getContext("2d", { willReadFrequently: true });

    /* הוצאת הרקע: פיקסל כהה -> שקוף, עם רמפה רכה בקצוות */
    function key() {
      if (!vid.videoWidth) return;
      cx.clearRect(0, 0, cv.width, cv.height);
      cx.drawImage(vid, CROP[0], CROP[1], CROP[2], CROP[3], 0, 0, cv.width, cv.height);
      var d = cx.getImageData(0, 0, cv.width, cv.height);
      var p = d.data;
      for (var i = 0; i < p.length; i += 4) {
        var lum = Math.max(p[i], p[i + 1], p[i + 2]);
        if (lum <= 104) p[i + 3] = 0;
        else if (lum < 168) p[i + 3] = Math.round(((lum - 104) / 64) * 255);
      }
      cx.putImageData(d, 0, 0);
    }

    function camLoop() {
      if (!vid.paused && !vid.ended) {
        key();
        camRaf = requestAnimationFrame(camLoop);
      } else {
        key();
        camRaf = 0;
      }
    }

    vid.addEventListener("seeked", key);
    vid.addEventListener("loadeddata", function () { vid.currentTime = 0; });
    if (vid.readyState >= 2) vid.currentTime = 0;

    /* הנפילה רצה מהר, והזנב עם הפינים ששוכבים מואט */
    vid.addEventListener("timeupdate", function () {
      if (!vid.paused && vid.currentTime >= 3.55 && vid.playbackRate !== 0.72) {
        vid.playbackRate = 0.72;
      }
    });

    vid.addEventListener("ended", function () {
      if (camRaf) cancelAnimationFrame(camRaf);
      key();
      cam.classList.add("gone");
    });

    function reset() {
      striking = false;
      if (fadeRaf) { cancelAnimationFrame(fadeRaf); fadeRaf = 0; }
      if (camRaf) { cancelAnimationFrame(camRaf); camRaf = 0; }
      ball.classList.remove("launch", "hit");
      cam.classList.remove("play", "gone");
      vid.pause();
      vid.currentTime = 0;
    }

    function tick() {
      ballRaf = 0;
      var doc = document.documentElement;
      var max = Math.max(1, doc.scrollHeight - doc.clientHeight);
      var p = Math.min(1, Math.max(0, doc.scrollTop / max));
      var hdr = document.querySelector(".site-header");
      var minY = (hdr ? hdr.offsetHeight : 80) + 14;
      var maxY = doc.clientHeight - ball.offsetHeight - 18;

      cam.classList.toggle("armed", p > 0.9 && !striking);

      if (striking) {
        if (p < 0.85) reset();
        return;
      }

      var y = minY + p * (maxY - minY);
      ball.style.transform =
        "translate(0px," + y + "px) rotate(" + doc.scrollTop * 0.45 + "deg)";

      if (p >= 0.995) {
        striking = true;
        var toX = -(cam.offsetWidth * 0.5 - ball.offsetWidth * 0.5 - 6);
        ball.classList.add("launch");
        requestAnimationFrame(function () {
          ball.style.transform =
            "translate(" + toX + "px," + maxY + "px) rotate(" +
            (doc.scrollTop * 0.45 + 420) + "deg)";
        });
        cam.classList.add("play");
        vid.currentTime = 0;
        vid.muted = true;
        vid.playbackRate = RATE;
        var pr = vid.play();
        if (pr && pr.catch) pr.catch(function () {});
        if (!camRaf) camRaf = requestAnimationFrame(camLoop);

        /* הכדור נעלם בדיוק בפריים שבו הפינים מתחילים ליפול */
        (function fade() {
          if (!striking) return;
          if (vid.currentTime >= 1.86) { ball.classList.add("hit"); return; }
          fadeRaf = requestAnimationFrame(fade);
        })();
      }
    }

    window.addEventListener(
      "scroll",
      function () { if (!ballRaf) ballRaf = requestAnimationFrame(tick); },
      { passive: true }
    );
    tick();
  } else if (ball) {
    /* ללא תנועה: מסתירים את הכדור והפינים לגמרי */
    ball.style.display = "none";
    if (cam) cam.style.display = "none";
  }
})();
