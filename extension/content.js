(async () => {
  const DATA_URL = chrome.runtime.getURL("data/item-names.json");
  const SEARCH_INDEX_URL = chrome.runtime.getURL("data/item-search-index.json");
  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEXTAREA",
    "INPUT",
    "OPTION"
  ]);
  const ITEM_ID_PATTERNS = [
    /(?:^|[?&;/])item=(\d+)(?:[&#/]|$)/i,
    /\/item\/(\d+)(?:[/?#]|$)/i,
    /item:(\d+)/i
  ];
  const CJK_PATTERN = /[\u3400-\u9FFF]/;
  const SEARCHABLE_SELECTOR = [
    'input[type="text"]',
    'input[type="search"]',
    "input:not([type])",
    "textarea",
    '[contenteditable="true"]',
    '[role="textbox"]'
  ].join(",");
  const SEARCH_RESULTS_LIMIT = 24;

  let dictionary = null;
  let searchIndex = null;
  let searchIndexPromise = null;
  let pendingRoots = new Set();
  let flushScheduled = false;

  let helperRoot = null;
  let helperList = null;
  let helperEmpty = null;
  let activeSearchTarget = null;
  let activeSearchResults = [];
  let activeResultIndex = -1;
  let helperHideTimer = null;

  const inputValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set;
  const textareaValueSetter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value"
  )?.set;

  try {
    const response = await fetch(DATA_URL);
    dictionary = await response.json();
  } catch (error) {
    console.error("[raidbots-item-cn] Failed to load item dictionary.", error);
    return;
  }

  function scheduleFlush(root) {
    if (!root) {
      return;
    }

    pendingRoots.add(root);
    if (flushScheduled) {
      return;
    }

    flushScheduled = true;
    queueMicrotask(flushPendingRoots);
  }

  function flushPendingRoots() {
    flushScheduled = false;
    const roots = Array.from(pendingRoots);
    pendingRoots = new Set();

    for (const root of roots) {
      translateRoot(root);
    }
  }

  function parseItemId(value) {
    if (!value) {
      return null;
    }

    for (const pattern of ITEM_ID_PATTERNS) {
      const match = value.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  function extractItemId(element) {
    if (!(element instanceof Element)) {
      return null;
    }

    const candidates = [
      element.getAttribute("href"),
      element.getAttribute("data-wowhead"),
      element.getAttribute("data-wowhead-tt"),
      element.getAttribute("data-item-id"),
      element.getAttribute("data-href"),
      element.getAttribute("title")
    ];

    for (const candidate of candidates) {
      const itemId = parseItemId(candidate);
      if (itemId) {
        return itemId;
      }
    }

    return null;
  }

  function findTranslationFromElement(element, fallbackText) {
    const owner = element.closest("[href],[data-wowhead],[data-wowhead-tt],[data-item-id],[data-href],[title]");
    if (owner) {
      const itemId = extractItemId(owner);
      if (itemId && dictionary.byId[itemId]) {
        return dictionary.byId[itemId];
      }
    }

    return dictionary.byName[fallbackText] || null;
  }

  function replaceTrimmedText(rawText, translatedText) {
    const leadingWhitespace = rawText.match(/^\s*/)?.[0] || "";
    const trailingWhitespace = rawText.match(/\s*$/)?.[0] || "";
    return `${leadingWhitespace}${translatedText}${trailingWhitespace}`;
  }

  function translateTextNode(node) {
    const parent = node.parentElement;
    if (!parent || SKIP_TAGS.has(parent.tagName)) {
      return;
    }

    if (parent.closest("[data-rbcn-helper-root]")) {
      return;
    }

    const rawText = node.nodeValue || "";
    const trimmedText = rawText.trim();
    if (!trimmedText) {
      return;
    }

    const translatedText = findTranslationFromElement(parent, trimmedText);
    if (!translatedText || translatedText === trimmedText) {
      return;
    }

    if (!parent.dataset.rbcnOriginalText) {
      parent.dataset.rbcnOriginalText = trimmedText;
    }

    node.nodeValue = replaceTrimmedText(rawText, translatedText);
  }

  function translateAttributes(element) {
    if (SKIP_TAGS.has(element.tagName)) {
      return;
    }

    if (element.closest("[data-rbcn-helper-root]")) {
      return;
    }

    const itemId = extractItemId(element);
    const itemTranslation = itemId ? dictionary.byId[itemId] : null;

    for (const attrName of ["title", "aria-label"]) {
      const currentValue = element.getAttribute(attrName);
      if (!currentValue) {
        continue;
      }

      const trimmedValue = currentValue.trim();
      if (!trimmedValue) {
        continue;
      }

      const translatedValue = itemTranslation || dictionary.byName[trimmedValue];
      if (!translatedValue || translatedValue === trimmedValue) {
        continue;
      }

      element.setAttribute(
        attrName,
        replaceTrimmedText(currentValue, translatedValue)
      );
    }
  }

  function translateRoot(root) {
    if (!dictionary || !document.body) {
      return;
    }

    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }

    if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) {
      return;
    }

    if (root instanceof Element) {
      translateAttributes(root);
    }

    const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    while (elementWalker.nextNode()) {
      translateAttributes(elementWalker.currentNode);
    }

    const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (textWalker.nextNode()) {
      translateTextNode(textWalker.currentNode);
    }
  }

  function isTopGearPage() {
    return location.pathname.startsWith("/simbot/topgear");
  }

  function ensureHelperUi() {
    if (helperRoot) {
      return;
    }

    helperRoot = document.createElement("div");
    helperRoot.dataset.rbcnHelperRoot = "true";
    helperRoot.style.position = "fixed";
    helperRoot.style.zIndex = "2147483647";
    helperRoot.style.minWidth = "320px";
    helperRoot.style.maxWidth = "520px";
    helperRoot.style.maxHeight = "360px";
    helperRoot.style.overflow = "hidden";
    helperRoot.style.display = "none";
    helperRoot.style.border = "1px solid rgba(255,255,255,0.14)";
    helperRoot.style.borderRadius = "10px";
    helperRoot.style.background = "#20222a";
    helperRoot.style.boxShadow = "0 18px 40px rgba(0,0,0,0.42)";
    helperRoot.style.fontFamily = 'Lato, "Noto Sans SC", sans-serif';

    helperList = document.createElement("div");
    helperList.style.maxHeight = "360px";
    helperList.style.overflowY = "auto";

    helperEmpty = document.createElement("div");
    helperEmpty.style.display = "none";
    helperEmpty.style.padding = "12px 14px";
    helperEmpty.style.color = "#c8ccd7";
    helperEmpty.style.fontSize = "13px";
    helperEmpty.textContent = "没有匹配到中文装备名";

    helperRoot.append(helperList, helperEmpty);
    document.body.appendChild(helperRoot);
  }

  async function loadSearchIndex() {
    if (searchIndex) {
      return searchIndex;
    }

    if (!searchIndexPromise) {
      searchIndexPromise = fetch(SEARCH_INDEX_URL)
        .then((response) => response.json())
        .then((payload) => {
          searchIndex = payload.entries || [];
          return searchIndex;
        })
        .catch((error) => {
          console.error("[raidbots-item-cn] Failed to load item search index.", error);
          return [];
        });
    }

    return searchIndexPromise;
  }

  function isSearchableTarget(target) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    if (!target.matches(SEARCHABLE_SELECTOR)) {
      return false;
    }

    if (target.getAttribute("type") === "hidden") {
      return false;
    }

    return true;
  }

  function getEditableValue(target) {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      return target.value || "";
    }

    return target.textContent || "";
  }

  function setEditableValue(target, value) {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const setter = target instanceof HTMLInputElement ? inputValueSetter : textareaValueSetter;
      const previousValue = target.value;
      if (setter) {
        setter.call(target, value);
      } else {
        target.value = value;
      }
      const valueTracker = target._valueTracker;
      if (valueTracker && typeof valueTracker.setValue === "function") {
        valueTracker.setValue(previousValue);
      }
      return;
    }

    target.textContent = value;
  }

  function dispatchEditableInput(target, inputType = "insertText", data = null) {
    target.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType, data }));
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType, data }));
    target.dispatchEvent(new Event("search", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function replaySearchInput(target, nextValue) {
    setEditableValue(target, "");
    dispatchEditableInput(target, "deleteContentBackward", null);

    await new Promise((resolve) => setTimeout(resolve, 0));

    setEditableValue(target, nextValue);
    dispatchEditableInput(target, "insertText", nextValue);

    const lastChar = nextValue.slice(-1) || " ";
    target.dispatchEvent(new KeyboardEvent("keydown", { key: lastChar, bubbles: true }));
    target.dispatchEvent(new KeyboardEvent("keyup", { key: lastChar, bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 30));

    if (getEditableValue(target) !== nextValue) {
      setEditableValue(target, nextValue);
      dispatchEditableInput(target, "insertReplacementText", nextValue);
    }

  }

  function hideSearchHelper() {
    activeSearchResults = [];
    activeResultIndex = -1;
    activeSearchTarget = null;

    if (helperRoot) {
      helperRoot.style.display = "none";
    }
  }

  function scheduleHideSearchHelper() {
    clearTimeout(helperHideTimer);
    helperHideTimer = setTimeout(hideSearchHelper, 120);
  }

  function cancelHideSearchHelper() {
    clearTimeout(helperHideTimer);
  }

  function positionSearchHelper(target) {
    if (!helperRoot || !target || !document.body.contains(target)) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const top = Math.min(rect.bottom + 6, window.innerHeight - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - 540));
    const width = Math.max(320, Math.min(rect.width, 520));

    helperRoot.style.top = `${top}px`;
    helperRoot.style.left = `${left}px`;
    helperRoot.style.width = `${width}px`;
  }

  function renderSearchHelper() {
    ensureHelperUi();

    helperList.replaceChildren();

    if (!activeSearchTarget || activeSearchResults.length === 0) {
      helperEmpty.style.display = "block";
      helperRoot.style.display = activeSearchTarget ? "block" : "none";
      if (activeSearchTarget) {
        positionSearchHelper(activeSearchTarget);
      }
      return;
    }

    helperEmpty.style.display = "none";

    activeSearchResults.forEach((result, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.dataset.rbcnIndex = String(index);
      item.style.display = "block";
      item.style.width = "100%";
      item.style.padding = "10px 14px";
      item.style.border = "0";
      item.style.borderBottom = "1px solid rgba(255,255,255,0.06)";
      item.style.background = "transparent";
      item.style.color = "#ffffff";
      item.style.cursor = "pointer";
      item.style.textAlign = "left";

      const primary = document.createElement("div");
      primary.style.fontSize = "14px";
      primary.style.fontWeight = "700";
      primary.textContent = result.zh;

      const secondary = document.createElement("div");
      secondary.style.marginTop = "2px";
      secondary.style.fontSize = "12px";
      secondary.style.color = "#b3bac8";
      secondary.textContent = result.en;

      item.append(primary, secondary);

      helperList.appendChild(item);
    });

    helperRoot.style.display = "block";
    positionSearchHelper(activeSearchTarget);
    syncActiveResultStyles();
  }

  function syncActiveResultStyles() {
    if (!helperList) {
      return;
    }

    const items = helperList.querySelectorAll("[data-rbcn-index]");
    items.forEach((item) => {
      const isActive = Number(item.dataset.rbcnIndex) === activeResultIndex;
      item.style.background = isActive ? "#2d313d" : "transparent";
    });
  }

  async function applySearchResult(result) {
    if (!activeSearchTarget || !result) {
      return;
    }

    const target = activeSearchTarget;
    cancelHideSearchHelper();
    if (target instanceof HTMLElement) {
      target.focus();
    }

    await replaySearchInput(target, result.en);

    if (target instanceof HTMLElement) {
      target.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
      target.dispatchEvent(new KeyboardEvent("keyup", { key: "End", bubbles: true }));
      target.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
      target.dispatchEvent(new KeyboardEvent("keypress", { key: "Enter", code: "Enter", bubbles: true }));
      target.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
    }

    const form = target.closest("form");
    if (form) {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      }
    }

    hideSearchHelper();
  }

  function buildSearchResults(entries, query) {
    const exact = [];
    const prefix = [];
    const contains = [];

    for (const [zh, en] of entries) {
      if (!zh.includes(query)) {
        continue;
      }

      const result = { zh, en };
      if (zh === query) {
        exact.push(result);
      } else if (zh.startsWith(query)) {
        prefix.push(result);
      } else {
        contains.push(result);
      }

      if (exact.length + prefix.length + contains.length >= SEARCH_RESULTS_LIMIT * 3) {
        break;
      }
    }

    return exact
      .concat(prefix, contains)
      .sort((left, right) => left.zh.length - right.zh.length || left.en.localeCompare(right.en))
      .slice(0, SEARCH_RESULTS_LIMIT);
  }

  async function updateSearchHelper(target) {
    if (!isTopGearPage() || !isSearchableTarget(target)) {
      hideSearchHelper();
      return;
    }

    const query = getEditableValue(target).trim();
    if (!query || !CJK_PATTERN.test(query)) {
      hideSearchHelper();
      return;
    }

    activeSearchTarget = target;
    const entries = await loadSearchIndex();

    if (target !== activeSearchTarget) {
      return;
    }

    activeSearchResults = buildSearchResults(entries, query);
    activeResultIndex = activeSearchResults.length > 0 ? 0 : -1;
    renderSearchHelper();
  }

  function handleSearchTargetInput(event) {
    const target = event.target;
    if (!isSearchableTarget(target)) {
      return;
    }

    updateSearchHelper(target);
  }

  function handleSearchTargetFocus(event) {
    const target = event.target;
    if (!isSearchableTarget(target)) {
      return;
    }

    updateSearchHelper(target);
  }

  function handleSearchTargetBlur(event) {
    const target = event.target;
    if (target === activeSearchTarget) {
      scheduleHideSearchHelper();
    }
  }

  function moveSelection(step) {
    if (activeSearchResults.length === 0) {
      return;
    }

    activeResultIndex = (activeResultIndex + step + activeSearchResults.length) % activeSearchResults.length;
    syncActiveResultStyles();
  }

  function handleSearchTargetKeydown(event) {
    if (event.target !== activeSearchTarget || activeSearchResults.length === 0 || helperRoot?.style.display !== "block") {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.key === "Enter" && activeResultIndex >= 0) {
      event.preventDefault();
      applySearchResult(activeSearchResults[activeResultIndex]);
      return;
    }

    if (event.key === "Escape") {
      hideSearchHelper();
    }
  }

  function installChineseSearchHelper() {
    ensureHelperUi();

    helperRoot.addEventListener("mouseenter", cancelHideSearchHelper);
    helperRoot.addEventListener("mouseleave", scheduleHideSearchHelper);
    helperRoot.addEventListener("mousedown", (event) => {
      const item = event.target.closest("[data-rbcn-index]");
      if (!item) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const index = Number(item.dataset.rbcnIndex);
      if (!Number.isNaN(index)) {
        activeResultIndex = index;
        syncActiveResultStyles();
        applySearchResult(activeSearchResults[index]);
      }
    });
    helperRoot.addEventListener("mousemove", (event) => {
      const item = event.target.closest("[data-rbcn-index]");
      if (!item) {
        return;
      }

      const index = Number(item.dataset.rbcnIndex);
      if (Number.isNaN(index) || index === activeResultIndex) {
        return;
      }

      activeResultIndex = index;
      syncActiveResultStyles();
    });

    document.addEventListener("focusin", handleSearchTargetFocus, true);
    document.addEventListener("focusout", handleSearchTargetBlur, true);
    document.addEventListener("input", handleSearchTargetInput, true);
    document.addEventListener("keydown", handleSearchTargetKeydown, true);

    window.addEventListener("scroll", () => positionSearchHelper(activeSearchTarget), true);
    window.addEventListener("resize", () => positionSearchHelper(activeSearchTarget));
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        scheduleFlush(mutation.target);
      }

      for (const node of mutation.addedNodes) {
        scheduleFlush(node);
      }
    }
  });

  installChineseSearchHelper();
  scheduleFlush(document.body);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();
