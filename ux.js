/*
 * MIRSAAD — UX enhancement layer
 * =============================================================================
 * Loads after app.js and improves the experience from the outside. The
 * application bundle is never modified.
 *
 * It only ever adds listeners and, in one guarded case, a single button. It
 * never rewrites content the application owns, so a future rebuild of app.js
 * cannot be broken by this file — at worst these improvements stop applying.
 *
 *   1. Publishes the active route on <html data-route>, so the stylesheet can
 *      address one screen at a time (the bundle exposes no such hook).
 *   2. Arabic validation messages in place of the browser's own wording.
 *   3. Blocks sign-in while the form is incomplete.
 *   4. A show/hide control for the password field.
 *   5. Escape closes the mobile navigation drawer.
 */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------
   * 1. Route published on the document element
   *
   * The app routes on location.hash ("#/sites/site-jaber"). The first
   * segment is enough to style a screen, and the full path is published
   * alongside it for anything more specific. Before sign-in the hash is
   * empty, which is the landing page.
   * ------------------------------------------------------------------- */
  function publishRoute() {
    var path = (location.hash || "").replace(/^#\/?/, "");
    var root = document.documentElement;
    root.setAttribute("data-route", path.split("/")[0] || "landing");
    root.setAttribute("data-path", path || "landing");
  }

  publishRoute();
  window.addEventListener("hashchange", publishRoute);

  /* ---------------------------------------------------------------------
   * 2 & 3. Sign-in form: Arabic messages, and no empty submissions
   *
   * The fields carry `required`, but the bundle's submit handler does not
   * consult validity, so an empty form signed the visitor straight in. A
   * capture-phase listener runs before that handler and stops an incomplete
   * form there.
   *
   * Messages are set through setCustomValidity so they appear in the
   * browser's own bubble. Nothing is inserted into the DOM the app renders,
   * which is what makes this safe.
   * ------------------------------------------------------------------- */
  var MESSAGES = {
    valueMissing: {
      email: "يرجى إدخال البريد الإلكتروني.",
      password: "يرجى إدخال كلمة المرور.",
    },
    typeMismatch: {
      email: "يرجى إدخال بريد إلكتروني صحيح.",
      password: "",
    },
  };

  function arabicMessage(field) {
    var kind = field.type === "password" ? "password" : "email";
    if (field.validity.valueMissing) return MESSAGES.valueMissing[kind];
    if (field.validity.typeMismatch) return MESSAGES.typeMismatch[kind];
    return "";
  }

  // Applied on the way down, so it runs before the bundle's own handler.
  document.addEventListener(
    "invalid",
    function (event) {
      var field = event.target;
      if (!field || !field.validity) return;
      field.setCustomValidity(arabicMessage(field));
    },
    true
  );

  // A stale custom message keeps a field invalid forever, so clear it as
  // soon as the visitor types.
  document.addEventListener("input", function (event) {
    var field = event.target;
    if (field && field.setCustomValidity) field.setCustomValidity("");
  });

  document.addEventListener(
    "submit",
    function (event) {
      var form = event.target;
      if (!form || typeof form.checkValidity !== "function") return;
      if (form.checkValidity()) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof form.reportValidity === "function") form.reportValidity();
      var firstInvalid = form.querySelector(":invalid");
      if (firstInvalid) firstInvalid.focus();
    },
    true
  );

  /* ---------------------------------------------------------------------
   * 4. Password visibility toggle
   *
   * This is the one place a node is added to the page. React can discard
   * children it did not create when it re-renders, so an observer puts the
   * button back if it disappears. The button is marked with a data
   * attribute so it is never added twice.
   * ------------------------------------------------------------------- */
  var SHOW = "إظهار كلمة المرور";
  var HIDE = "إخفاء كلمة المرور";

  var EYE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
    '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/>' +
    '<circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
    '<path d="M2.5 12S6 5.5 12 5.5c1.6 0 3 .5 4.2 1.1M21.5 12S18 18.5 12 18.5c-1.6 0-3-.5-4.2-1.1"/>' +
    '<path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M4 4l16 16"/></svg>';

  function addPasswordToggle() {
    var field = document.querySelector('input[type="password"], input[data-mirsaad-pw]');
    if (!field) return;

    var host = field.parentElement;
    if (!host) return;
    if (host.querySelector("[data-mirsaad-pw-toggle]")) return;

    // The field is marked so it can still be found once its type flips to
    // "text", which would otherwise break the selector above.
    field.setAttribute("data-mirsaad-pw", "");
    host.setAttribute("data-mirsaad-pw-host", "");

    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-mirsaad-pw-toggle", "");
    button.setAttribute("aria-label", SHOW);
    button.setAttribute("title", SHOW);
    button.innerHTML = EYE;

    button.addEventListener("click", function () {
      var shown = field.getAttribute("type") === "text";
      field.setAttribute("type", shown ? "password" : "text");
      button.innerHTML = shown ? EYE : EYE_OFF;
      button.setAttribute("aria-label", shown ? SHOW : HIDE);
      button.setAttribute("title", shown ? SHOW : HIDE);
      // Keep the caret where it was rather than dropping focus.
      field.focus();
    });

    host.appendChild(button);
  }

  /* ---------------------------------------------------------------------
   * 5. Escape closes the mobile navigation drawer
   *
   * The drawer's overlay is the only element on the page carrying z-[60].
   * Its first button is the close control, so Escape simply clicks it,
   * leaving the app's own state handling in charge of the rest.
   * ------------------------------------------------------------------- */
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var overlay = document.querySelector(".z-\\[60\\]");
    if (!overlay) return;
    var close = overlay.querySelector("button");
    if (close) close.click();
  });

  /* ---------------------------------------------------------------------
   * Re-apply after the app renders, and whenever it renders again.
   * ------------------------------------------------------------------- */
  function apply() {
    publishRoute();
    addPasswordToggle();
  }

  var root = document.getElementById("root") || document.body;
  var scheduled = false;

  new MutationObserver(function () {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      apply();
    });
  }).observe(root, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
