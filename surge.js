function surge(actions = {}, templates = {}) {
  const DATA_LIST = "[data-reaction], [data-bind],[data-template]";
  const elements = new Map();
  const bindings = {};
  const state = {};
  const calcs = initializeCalcs();
  const localStorageKey =
    document.querySelector("[data-surge]")?.dataset.localStorage || null;

  // Base function to access elements, jQuery style
  const base = (selector) => {
    if (elements.has(selector)) return elements.get(selector);

    const el = surgeContainer.querySelector(selector);
    if (el) {
      registerElement(el);
      elements.set(selector, el); // Cache the selector
    }
    return el;
  };

  // Proxy to intercept property access for state
  const $ = new Proxy(base, {
    get(target, prop) {
      if (prop in state) return state[prop];
      return target[prop]; // Allow access to $ methods like $.name
    },
    set(target, prop, value) {
      state[prop] = value;
      if (bindings[prop]) {
        bindings[prop].forEach((el) => {
          const template = templates[prop] || templates[el.dataset.template];
          el.innerHTML = template ? template(value, $) : value;
          updateCalculations(prop);
        });
      }
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
    const template = templates[el.dataset.template];
    if (template) el.innerHTML = template(undefined, $);
    el.querySelectorAll(DATA_LIST).forEach(processElement);
  }

  function processElement(el) {
    if (el.dataset.template) initializeTemplate(el);
    if (el.dataset.reaction) initializeBinding(el);
    if (el.dataset.bind) bindTwoWay(el);
  }

  function initializeBinding(el) {
    const key = el.dataset.reaction;

    if (localStorageKey) {
      const stored = localStorage.getItem(`${localStorageKey}-${key}`);
      if (stored) state[key] = parseInput(stored);
    } else {
      state[key] = parseInput(el.textContent);
    }

    bindings[key] ||= [];
    bindings[key].push(el);

    const template = templates[key] || templates[el.dataset.template];
    el.innerHTML = template ? template(state[key], $) : state[key];
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

  function bindAllActions(container) {
    const actionEvents = new Set();
    container.querySelectorAll("[data-action]").forEach((el) => {
      const [event] = el.dataset.action.includes("->")
        ? el.dataset.action.split("->").map((s) => s.trim())
        : [getEvent(el)];

      actionEvents.add(event);
    });
    actionEvents.forEach((event) => {
      container.addEventListener(event, (e) => {
        const el = e.target.closest("[data-action]");
        if (!el || !container.contains(el)) return;

        const [expectedEvent, action] = el.dataset.action.includes("->")
          ? el.dataset.action.split("->").map((s) => s.trim())
          : [getEvent(el), el.dataset.action];

        if (expectedEvent !== event) return;

        if (el.dataset.default == null) e.preventDefault();

        const [method, args] = parseAction(action);
        if (actions[method]) {
          Array.isArray(args)
            ? actions[method](...args)($, e)
            : actions[method]($, e);
        } else {
          try {
            $.$el = el;
            $.$event = e;
            $.$target = e.target;
            $.$value = e.target.value;
            $.$checked = e.target.checked;
            const magicProps = [
              "$el",
              "$event",
              "$target",
              "$value",
              "$checked",
            ];
            const magicBindings = magicProps
              .map((name) => `const ${name} = $["${name}"];`)
              .join("\n");

            const fn = new Function(
              "$",
              `
          ${magicBindings}
          with($) { ${action} }
        `,
            );
            fn($);
          } catch (err) {
            console.error(`Error evaluating inline action: "${action}"`, err);
          }
        }
      });
    });
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
          if (existingCalc) {
            existingCalc.values.push(val);
          } else {
            calculations.push({ func, values: [val] });
          }
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
  return $;
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
  const args = match
    ? match[2]
      ? match[2].split(",").map((arg) => parseInput(arg.trim()))
      : [undefined]
    : null;
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
