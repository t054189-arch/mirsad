مرصاد · MIRSAAD — the website
=============================

Three files. That is the whole site.

  index.html   the page
  app.css      all styling
  app.js       the entire application

HOW TO OPEN IT
--------------
Double-click index.html. It opens in any modern browser and runs completely —
no installation, no server, no build step.

Keep the three files together in the same folder. index.html loads app.css and
app.js from beside it, so moving one on its own breaks the page.

HOW TO PUT IT ONLINE
--------------------
Upload all three files to any web host and open index.html. It is a plain
static site, so anything works: GitHub Pages, Netlify (drag the folder onto
netlify.com/drop), Vercel, or ordinary shared hosting over FTP.

WHAT YOU CAN DO IN IT
---------------------
  الصفحة الرئيسية  ->  ابدأ الآن  ->  sign in with any email and password
  المنشآت  ->  جسر جابر  ->  إجراء فحص جديد  ->  التالي  ->  بدء التحليل
  watch the analysis  ->  مراجعة النتائج  ->  approve / reject / edit each one
  ->  حفظ القرار وتحديث السجل

The statistics, the structure record and the notification bell all update from
your decisions, and they survive a page refresh. To start over, go to
الإعدادات -> التفضيلات -> إعادة ضبط البيانات التجريبية.

The العربية / English switch is in the header, and flips the whole interface
between right-to-left and left-to-right.

TWO THINGS TO KNOW
------------------
An internet connection is used for the Arabic fonts only (Google Fonts). Fully
offline, the site still works — it falls back to the system Arabic typeface.

The 3D bridge needs WebGL. Where that is unavailable, or where the visitor has
asked for reduced motion, the page shows a still architectural view instead.

THIS IS A DEMONSTRATION
-----------------------
There is no server, no database, no login and no artificial intelligence behind
this. Every structure, inspection, finding and report is invented for the demo,
and the analysis is a timed animation over prepared results. Nothing here is a
record of any real organisation. Your decisions are stored only in your own
browser and are never sent anywhere.
