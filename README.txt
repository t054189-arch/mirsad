مرصاد · MIRSAAD — the website
=============================

A static site. No installation, no server, no build step.

  index.html        the sign-in and sign-up gate — this is what opens first
  auth.css auth.js  the gate's styling and logic
  guard.js          sends a visitor without a session back to the gate
  app.html          the application (this used to be index.html)
  app.css           all application styling, with a fixes layer appended
  app.js            the entire application
  ux.js             a small layer of usability improvements, loaded last
  step-1..5.html    the inspection flow, one page per step
  steps.css steps.js  styling and logic for those pages
  tools/make-steps.py generates the step pages from one template

ux.js never modifies app.js. It publishes the current route on the <html>
element so the stylesheet can address one screen at a time, and closes the
mobile menu on Escape. Remove it and the site still runs; it simply loses
those improvements. The end of app.css carries a layer of fixes appended
after the generated rules — mobile scrolling, touch target sizes, and the
dashboard's visual hierarchy. Both are additive: app.js is untouched.

HOW TO OPEN IT
--------------
Double-click index.html and sign in. It opens in any modern browser and runs
completely on its own.

Keep every file together in the same folder. The pages load their styling and
scripts from beside them, so moving one on its own breaks it.

HOW TO PUT IT ONLINE
--------------------
Upload the whole folder to any web host and open index.html. It is a plain
static site, so anything works: GitHub Pages, Netlify (drag the folder onto
netlify.com/drop), Vercel, or ordinary shared hosting over FTP.

WHAT YOU CAN DO IN IT
---------------------
  index.html  ->  sign in as dalal@mirsaad.demo / mirsaad2026
  المنشآت  ->  جسر جابر  ->  إجراء فحص جديد  ->  step-1 through step-5
  بيانات الفحص  ->  رفع البيانات  ->  التحليل  ->  المراجعة  ->  السجل
  approve / reject / edit each finding  ->  حفظ القرار وتحديث السجل

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
There is no server, no database and no artificial intelligence behind this.
The sign-in gate is part of the demonstration, not security: every page is
already in the visitor's browser, so the gate directs people rather than
stopping them. Every structure, inspection, finding and report is invented for the demo,
and the analysis is a timed animation over prepared results. Nothing here is a
record of any real organisation. Your decisions are stored only in your own
browser and are never sent anywhere.
