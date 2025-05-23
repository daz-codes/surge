function surge(actions = {}, templates = {}) {
  const DATA_LIST = "[data-reaction],[data-bind],[data-template],[data-action]";
  const elements = new Map();
  const bindings = {};
  const state = {};
  const boundEvents = new Set();
  const calcs = initializeCalcs();
  const localStorageKey =
    document.querySelector("[data-surge]")?.dataset.localStorage || null;

  // Base function to access elements
  const base = (selector) => {
    if (elements.has(selector)) return elements.get(selector);
    const els = surgeContainer.querySelectorAll(selector);
    if (els.length < 1) return;
    els.forEach((el) => registerElement(el));
    return elements
      .set(selector, els.length === 1 ? els[0] : els)
      .get(selector);
  };

  // Proxy to intercept property access for state
  const $ = new Proxy(base, {
    get(target, prop) {
      if (prop in state) return state[prop];
      return target[prop]; // Allow access to $ methods like $.name
    },
    set(target, prop, value) {
      if (bindings[prop] && state[prop] !== value) {
        bindings[prop].forEach((el) => {
          const template = templates[prop] || templates[el.dataset.template];
          el.innerHTML = template ? template(value, $) : value;
          updateCalculations(prop);
        });
      }
      state[prop] = value;
      if (localStorageKey) {
        localStorage.setItem(
          `${localStorageKey}-${prop}`,
          JSON.stringify(value),
        );
      }
      return true;
    },
    apply(target, thisArg, args) {
      return target(...args);
    },
  });

  const surgeContainer = document.querySelector("[data-surge]");
  if (!surgeContainer) return;

  surgeContainer.querySelectorAll(DATA_LIST).forEach(processElement);
  bindAllActions(surgeContainer);

  function initializeTemplate(el) {
    const template =
      templates[el.dataset.reaction] || templates[el.dataset.template];
    if (template) el.innerHTML = template(undefined, $);
    el.querySelectorAll(DATA_LIST).forEach(processElement);
  }

  function processElement(el) {
    if (el.dataset.template) initializeTemplate(el);
    if (el.dataset.reaction) initializeBinding(el);
    if (el.dataset.bind) bindTwoWay(el);
    if (el.dataset.action) bindAllActions(surgeContainer, el);
  }

  function initializeBinding(el) {
    const key = el.dataset.reaction;
    const stored =
      localStorageKey && localStorage.getItem(`${localStorageKey}-${key}`);
    state[key] = parseInput(stored ?? el.textContent);
    (bindings[key] ||= []).push(el);
    initializeTemplate(el);
  }

  function registerElement(el) {
    Object.keys(el.dataset).forEach((key) => {
      Object.defineProperty(el, key, {
        get: () => parseInput(el.dataset[key]),
        set: (value) => (el.dataset[key] = value),
      });
    });
    enhanceDomMethods(el);
  }

  function enhanceDomMethods(el) {
    ["append", "prepend", "before", "after", "replace"].forEach((method) => {
      const domMethod = method === "replace" ? "replaceWith" : method;
      const original = el[domMethod].bind(el);
      el[method] = (html) => {
        const template = document.createElement("template");
        template.innerHTML = typeof html === "object" ? html.outerHTML : html;
        Array.from(template.content.children).forEach((child) => {
          original(child);
          processElement(child);
          child.querySelectorAll(DATA_LIST).forEach(processElement);
        });
      };
    });
  }

  function bindTwoWay(el) {
    const key = el.dataset.bind;
    el.addEventListener("input", (e) => {
      $[key] = parseInput(e.target.value);
    });
  }

  function bindAllActions(container, el = null) {
    const targets = el ? [el] : container.querySelectorAll("[data-action]");
    targets.forEach((element) => {
      const [event] = element.dataset.action.includes("->")
        ? element.dataset.action.split("->").map((s) => s.trim())
        : [getEvent(element)];

      if (!boundEvents.has(event)) {
        container.addEventListener(event, handleAction);
        boundEvents.add(event);
      }
    });
  }
  function handleAction(e) {
    const el = e.target.closest("[data-action]");
    if (!el || !surgeContainer.contains(el)) return;

    const [expectedEvent, action] = el.dataset.action.includes("->")
      ? el.dataset.action.split("->").map((s) => s.trim())
      : [getEvent(el), el.dataset.action];

    if (expectedEvent !== e.type) return;

    if (el.dataset.default == null) e.preventDefault();

    const [method, args] = parseAction(action);
    if (actions[method]) {
      Array.isArray(args)
        ? actions[method](...args)($, e)
        : actions[method]($, e);
    }
  }

  function initializeCalcs() {
    const calculations = [];
    document
      .querySelectorAll(
        "[data-surge] [data-calculate],[data-surge][data-calculate]",
      )
      .forEach((el) => {
        const calcs = el.dataset.calculate.split(",");
        const val = el.dataset.reaction;
        calcs.forEach((calc) => {
          const func = actions[calc];
          if (!func) return;
          const existingCalc = calculations.find((c) => c.func === func);
          existingCalc
            ? existingCalc.values.push(val)
            : calculations.push({ func, values: [val] });
        });
      });
    return calculations;
  }

  function updateCalculations(value) {
    calcs
      .filter(
        (calc) =>
          calc.values.includes(value) || calc.values.includes(undefined),
      )
      .forEach((calc) => calc.func($));
  }

  if (actions.init) actions.init($);
}

function getEvent(el) {
  return (
    { FORM: "submit", INPUT: "input", TEXTAREA: "input", SELECT: "change" }[
      el.tagName
    ] || "click"
  );
}

function parseAction(action) {
  const match = action.match(/^(\w+)\((.*)\)$/);
  const method = match ? match[1].trim() : action;
  const args =
    match?.[2]?.split(",").map((arg) => parseInput(arg.trim())) ?? null;

  return [method, args];
}

function parseInput(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
export default surge;
