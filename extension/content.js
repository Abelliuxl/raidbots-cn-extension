(async () => {
  const DATA_URL = chrome.runtime.getURL("data/item-names.json");
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

  let dictionary = null;
  let pendingRoots = new Set();
  let flushScheduled = false;

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

  scheduleFlush(document.body);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();
