/* באולינג שערי חדרה — לוגיקת צד לקוח.
 *
 * קובץ אחד לכל האתר. כל בלוק בודק קודם שהאלמנטים שלו קיימים
 * בעמוד, ואם לא — פשוט מדלג. ככה אותו קובץ נטען בכל שבעת העמודים
 * בלי צורך בקובץ נפרד לכל אחד, והדפדפן שומר אותו במטמון פעם אחת.
 *
 * אין כאן תלות בשום ספרייה. jQuery שנטען ב-Base.astro משמש
 * אך ורק את ווידג'ט הנגישות ולא נוגע לקוד הזה.
 *
 * תוכן:
 *   1. תפריט נייד
 *   2. תפריטים נפתחים
 *   3. קרוסלת ההירו
 *   4. לייטבוקס וידאו
 *   5. רצף הסטרייק (דף הבית)
 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 0. גובה ההדר ----------
     ההדר הוא position:fixed, ולכן המרווח שמתחתיו וגובה ההירו
     חייבים לדעת כמה הוא תופס. במקום מספר קבוע — מודדים אותו
     ומפרסמים ל---header-h. הגובה משתנה בין דסקטופ לנייד,
     ומשתנה שוב אם מוסיפים פריט לתפריט או מגדילים לוגו,
     אז מספר קבוע כאן מתיישן מיד ומשאיר פס ריק בתחתית ההירו. */
  var header = document.querySelector(".site-header");
  if (header) {
    var syncHeaderHeight = function () {
      document.documentElement.style.setProperty(
        "--header-h",
        header.offsetHeight + "px"
      );
    };
    syncHeaderHeight();
    window.addEventListener("resize", syncHeaderHeight);
    if (window.ResizeObserver) new ResizeObserver(syncHeaderHeight).observe(header);
    /* הגופנים משנים את גובה השורה כשהם נטענים */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(syncHeaderHeight);
    }
  }

  /* ---------- 1. תפריט נייד ----------
     מתחת ל-940px הניווט מתקפל מאחורי כפתור ההמבורגר.
     aria-expanded מתעדכן בכל לחיצה כדי שקורא מסך ידע מה המצב. */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("mainnav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- 2. תפריטים נפתחים ----------
     שימוש ב-details/summary נייטיב במקום JS — עובד גם בלי הקובץ הזה.
     מה שכן צריך JS: לסגור תפריט אחד כשנפתח אחר.
     האזנה ל-toggle חייבת להיות בשלב ה-capture, כי האירוע לא עולה. */
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

  /* ---------- 3. קרוסלת ההירו ----------
     מעבר בהצללה בלבד (opacity), בלי הזזה — כל השקופיות
     יושבות אחת על השנייה באותה משבצת גריד. */
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

    /* גובה השקופיות מטופל ב-CSS דרך --header-h שנקבע למעלה.
       אין כאן קביעת גובה inline בכוונה: inline גובר על מדיה-קוורי
       ועל svh/dvh, ובנייד זה נשבר כשסרגל הדפדפן נכנס ויוצא. */
  }

  /* ---------- 4. לייטבוקס וידאו ----------
     בסגירה מסירים את ה-src וקוראים ל-load(). בלי זה הדפדפן
     ממשיך להוריד את הקובץ ברקע גם אחרי שהחלון נסגר. */
  var lb = document.querySelector(".video-lightbox");
  if (lb) {
    var lbVideo = lb.querySelector("video");
    function closeLb() {
      if (lb.hidden) return;
      lb.hidden = true;
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
        lb.hidden = false;
        return;
      }
      if (e.target.closest(".lightbox-close") || e.target === lb) closeLb();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLb();
    });
  }

  /* ---------- 5. רצף הסטרייק (דף הבית בלבד) ----------
   *
   * הכדור מתגלגל במורד המסך לפי אחוז הגלילה. בתחתית העמוד
   * הוא נורה אל הפינים, הווידאו מתנגן, והכדור נעלם בדיוק
   * בפריים שבו הפינים מתחילים ליפול.
   *
   * הווידאו עצמו מוסתר (1x1 פיקסל, שקוף). מה שנראה זה canvas
   * שאליו מצוירת כל פריים אחרי הוצאת הרקע הכהה — אחרת היה
   * מרובע וידאו שחור באמצע העמוד.
   *
   * מגבלה: הוצאת הרקע קוראת פיקסלים מה-canvas, ולכן הווידאו
   * חייב להיות מאותו דומיין. קובץ מ-CDN חיצוני יזהם את ה-canvas
   * והדפדפן יחסום את getImageData.
   *
   * כל הרצף מדולג כשהמשתמש ביקש להפחית תנועה. */
  var ball = document.querySelector(".scroll-ball");
  var cam = document.querySelector(".strike-cam");
  var cv = cam && cam.querySelector("canvas");
  var vid = cam && cam.querySelector("video");

  if (ball && cam && cv && vid && !reduced) {
    var RATE = 2.4;
    var CROP = [120, 60, 1060, 640];
    var SLOW_AT = 3.55;    /* הרגע שבו ההשמעה מואטת */
    var SLOW_RATE = 0.72;  /* מהירות הזנב */
    var FADE_LEAD = 2;     /* שניות לפני הסוף שבהן מתחילה ההיעלמות */
    var camRaf = 0, fadeRaf = 0, ballRaf = 0, striking = false;

    cv.width = 600;
    cv.height = 362;
    var cx = cv.getContext("2d", { willReadFrequently: true });

    /* הוצאת הרקע.
       הקליפ צולם באולם חשוך, אז אפשר להפריד לפי בהירות:
       פיקסל כהה = רקע ויוצא שקוף, פיקסל בהיר = פין ונשאר.
       בין שני הספים יש רמפה הדרגתית, אחרת קווי המתאר
       של הפינים יוצאים משוננים. */
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

    /* הקליפ המקורי איטי מדי לשימוש הזה, אז הוא רץ ב-RATE.
       הזנב — החלק שבו הפינים כבר שוכבים על המסלול — מואט
       חזרה, כדי שהרגע הזה יספיק להיקלט לפני שהכל נעלם. */
    vid.addEventListener("timeupdate", function () {
      if (!vid.paused && vid.currentTime >= SLOW_AT && vid.playbackRate !== SLOW_RATE) {
        vid.playbackRate = SLOW_RATE;
      }

      /* ההיעלמות מתחילה שתי שניות לפני סוף הקליפ, כך שהדהייה
         רצה במקביל לנפילה ולא אחריה — הפינים ממשיכים ליפול
         לתוך ההיעלמות.

         מלכודת: אי אפשר פשוט לחלק ב-playbackRate הנוכחי.
         המהירות מתחלפת באמצע (RATE ואז SLOW_RATE), אז חישוב
         לפי המהירות הנוכחית בלבד נותן תשובה שגויה לחלוטין
         ומתחיל את הדהייה כמעט מיד עם תחילת הקליפ.
         צריך לסכום את שני הקטעים בנפרד. */
      if (!vid.paused && vid.duration && !cam.classList.contains("gone")) {
        var t = vid.currentTime;
        var left =
          t < SLOW_AT
            ? (SLOW_AT - t) / RATE + (vid.duration - SLOW_AT) / SLOW_RATE
            : (vid.duration - t) / SLOW_RATE;
        if (left <= FADE_LEAD) cam.classList.add("gone");
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
      /* נקודת הנחיתה נגזרת מהמלבן של הפינים, לא מגובה החלון.
         הכדור והפינים שניהם fixed, כלומר באותה מערכת קואורדינטות,
         ולכן הכדור נוחת על אותה נקודה בפינים בכל גודל מסך.
         חישוב לפי clientHeight נשבר בנייד: סרגל הכתובת נכנס ויוצא
         תוך כדי גלילה, הגובה משתנה, והכדור עוצר לפני הפינים. */
      var camBox = cam.getBoundingClientRect();
      var maxY = camBox.top + camBox.height * 0.69 - ball.offsetHeight / 2;

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

        /* הכדור נעלם בשנייה 1.86 — הפריים שבו הפין הראשון זז.
           נבדק ב-rAF ולא ב-timeupdate, כי timeupdate יורה
           בערך ארבע פעמים בשנייה וזה מפספס את הפריים. */
        (function fade() {
          if (!striking) return;
          if (vid.currentTime >= 1.86) { ball.classList.add("hit"); return; }
          fadeRaf = requestAnimationFrame(fade);
        })();
      }
    }

    var queueTick = function () {
      if (!ballRaf) ballRaf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", queueTick, { passive: true });
    /* בנייד גובה החלון משתנה בלי אירוע גלילה - סרגל הכתובת נכנס
       ויוצא, והמסך מסתובב. בלי המאזינים האלה הכדור נשאר תקוע
       בנקודה שחושבה לגובה חלון ישן. */
    window.addEventListener("resize", queueTick);
    window.addEventListener("orientationchange", queueTick);
    tick();
  } else if (ball) {
    /* המשתמש ביקש להפחית תנועה, או שהדפדפן לא תומך.
       מסתירים לגמרי במקום להשאיר כדור סטטי תלוי באוויר. */
    ball.style.display = "none";
    if (cam) cam.style.display = "none";
  }
})();
