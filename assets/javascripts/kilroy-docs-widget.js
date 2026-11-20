(function () {
  "use strict";

  const KILROY_DOCS_ALIAS = "kilroy.docs.docs";
  const SEND_THROTTLE_MS = 120;

  function isHttpUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
  }

  function enforceExternalHttpLinks(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const anchors = scope.querySelectorAll("a[href]");

    anchors.forEach((anchor) => {
      const href = anchor.getAttribute("href") || "";
      if (!isHttpUrl(href)) {
        return;
      }

      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    });
  }

  function initExternalHttpLinkPolicy() {
    const run = () => enforceExternalHttpLinks(document);

    run();
    window.requestAnimationFrame(run);
    window.setTimeout(run, 250);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) {
            continue;
          }

          if (node.matches && node.matches("a[href]")) {
            enforceExternalHttpLinks(node.parentElement || document);
            return;
          }

          if (node.querySelector && node.querySelector("a[href]")) {
            enforceExternalHttpLinks(node);
            return;
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function injectTopNavStyles() {
    if (document.getElementById("kilroy-docs-top-nav-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "kilroy-docs-top-nav-style";
    style.textContent = [
      ".kilroy-docs-top-nav {",
      "  display: grid;",
      "  gap: 0.5rem;",
      "  margin: 0 0 1rem;",
      "  padding: 0.75rem;",
      "  position: relative;",
      "  z-index: 3;",
      "  pointer-events: auto !important;",
      "  border: 1px solid var(--md-default-fg-color--lightest);",
      "  border-radius: 0.5rem;",
      "  background: var(--md-default-bg-color);",
      "}",
      ".kilroy-docs-top-nav__title {",
      "  font-size: 0.7rem;",
      "  font-weight: 700;",
      "  letter-spacing: 0.08em;",
      "  text-transform: uppercase;",
      "  color: var(--md-default-fg-color--light);",
      "}",
      ".kilroy-docs-top-nav__links {",
      "  display: grid;",
      "  gap: 0.5rem;",
      "  pointer-events: auto !important;",
      "}",
      ".kilroy-docs-top-nav__link {",
      "  display: block;",
      "  padding: 0.65rem 0.75rem;",
      "  border-radius: 0.4rem;",
      "  background: var(--md-code-bg-color);",
      "  color: var(--md-default-fg-color);",
      "  text-decoration: none;",
      "  line-height: 1.35;",
      "  cursor: pointer !important;",
      "  pointer-events: auto !important;",
      "  user-select: text;",
      "}",
      ".kilroy-docs-top-nav__link:hover {",
      "  background: var(--md-accent-fg-color--transparent);",
      "}",
      ".kilroy-docs-top-nav__eyebrow {",
      "  display: block;",
      "  font-size: 0.72rem;",
      "  color: var(--md-default-fg-color--light);",
      "  margin-bottom: 0.15rem;",
      "}",
      ".kilroy-docs-top-nav__label {",
      "  display: block;",
      "  font-weight: 600;",
      "}",
      ".kilroy-docs-top-nav--content {",
      "  margin-bottom: 1.25rem;",
      "}",
      "@media screen and (min-width: 76.25em) {",
      "  .kilroy-docs-top-nav--content {",
      "    display: none;",
      "  }",
      "}",
    ].join("\n");

    document.head.appendChild(style);
  }

  function buildTopNavLink(link, eyebrow) {
    if (!link || !link.getAttribute("href")) {
      return null;
    }

    const href = link.getAttribute("href");
    const anchor = document.createElement("a");
    anchor.className = "kilroy-docs-top-nav__link";
    anchor.href = href;
    anchor.target = "_self";
    anchor.setAttribute("aria-label", link.getAttribute("aria-label") || eyebrow);

    const eyebrowNode = document.createElement("span");
    eyebrowNode.className = "kilroy-docs-top-nav__eyebrow";
    eyebrowNode.textContent = eyebrow;

    const labelNode = document.createElement("span");
    labelNode.className = "kilroy-docs-top-nav__label";
    labelNode.textContent = (link.getAttribute("aria-label") || "").replace(/^Previous:\s*|^Next:\s*/i, "") || link.textContent.trim();

    anchor.appendChild(eyebrowNode);
    anchor.appendChild(labelNode);
    return anchor;
  }

  function buildTopNavBlock() {
    const prev = document.querySelector(".md-footer__link--prev");
    const next = document.querySelector(".md-footer__link--next");

    if (!prev && !next) {
      return null;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "kilroy-docs-top-nav";

    const title = document.createElement("div");
    title.className = "kilroy-docs-top-nav__title";
    title.textContent = "Page Navigation";
    wrapper.appendChild(title);

    const links = document.createElement("div");
    links.className = "kilroy-docs-top-nav__links";

    const prevLink = buildTopNavLink(prev, "Back");
    const nextLink = buildTopNavLink(next, "Next");
    if (prevLink) links.appendChild(prevLink);
    if (nextLink) links.appendChild(nextLink);

    wrapper.appendChild(links);
    return wrapper;
  }

  function mountTopNavBlock() {
    if (document.querySelector(".kilroy-docs-top-nav")) {
      enforceExternalHttpLinks(document);
      return;
    }

    injectTopNavStyles();
    const block = buildTopNavBlock();
    if (!block) {
      return;
    }

    const secondaryNav = document.querySelector(".md-sidebar--secondary .md-nav--secondary");
    if (secondaryNav) {
      const secondaryTitle = secondaryNav.querySelector(":scope > .md-nav__title");
      if (secondaryTitle && secondaryTitle.parentElement === secondaryNav) {
        secondaryNav.insertBefore(block, secondaryTitle.nextSibling);
      } else {
        secondaryNav.insertBefore(block, secondaryNav.firstChild || null);
      }
      return;
    }

    const secondaryInner = document.querySelector(".md-sidebar--secondary .md-sidebar__inner");
    if (secondaryInner) {
      secondaryInner.insertBefore(block, secondaryInner.firstChild || null);
      return;
    }

    const article = document.querySelector(".md-content__inner");
    if (article) {
      block.classList.add("kilroy-docs-top-nav--content");
      article.insertBefore(block, article.firstChild || null);
    }

    enforceExternalHttpLinks(document);
  }

  function initIframeFocusBridge(options = {}) {
    const enabled = options.enabled === true;
    const pdalias = String(options.pdalias || "").trim();
    const targetOrigin = String(options.targetOrigin || window.location.origin || "*");

    if (!enabled || !pdalias) {
      return function noopCleanup() {};
    }

    if (window.parent === window) {
      return function noopCleanup() {};
    }

    let lastSent = 0;

    function sendFocusIntent(reason) {
      const now = Date.now();
      if (now - lastSent < SEND_THROTTLE_MS) return;
      lastSent = now;

      try {
        window.parent.postMessage(
          {
            _cmd: "focus_widget_window",
            pdalias,
            reason: reason || "",
            ts: now,
          },
          targetOrigin
        );
      }
      catch (_err) {
        // ignore postMessage failures
      }
    }

    const onPointerDown = () => sendFocusIntent("pointerdown");
    const onFocusIn = () => sendFocusIntent("focusin");

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn, true);

    return function cleanupIframeFocusBridge() {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
    };
  }

  function initKilroyDocsWidgetBridge() {
    return initIframeFocusBridge({
      enabled: true,
      pdalias: KILROY_DOCS_ALIAS,
      targetOrigin: window.location.origin || "*",
    });
  }

  if (!window.__kilroyDocsBridgeInitialized) {
    window.__kilroyDocsBridgeInitialized = true;
    window.__kilroyDocsBridgeCleanup = initKilroyDocsWidgetBridge();
    initExternalHttpLinkPolicy();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mountTopNavBlock, { once: true });
    } else {
      mountTopNavBlock();
    }
  }

  window.initIframeFocusBridge = window.initIframeFocusBridge || initIframeFocusBridge;
  window.initKilroyDocsWidgetBridge = initKilroyDocsWidgetBridge;
})();