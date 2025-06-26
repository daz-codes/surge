function surge(actions = {}, templates = {}) {
  const DATA_LIST = "[data-reaction],[data-bind],[data-template]";
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
    const target = document.querySelector(el.dataset.target) || el;
    if (template) target.innerHTML = template(undefined, $);
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
    const ACTION_ATTRS = [
      "data-action",
      "data-get",
      "data-post",
      "data-patch",
      "data-delete",
    ];

    const actionEvents = new Set();

    container
      .querySelectorAll(ACTION_ATTRS.map((a) => `[${a}]`).join(","))
      .forEach((el) => {
        const { attr, value } = getActionAttribute(el);
        const [event] = value.includes("->")
          ? value.split("->").map((s) => s.trim())
          : [getEvent(el)];
        actionEvents.add(event);
      });

    actionEvents.forEach((event) => {
      container.addEventListener(event, (e) => {
        const el = e.target.closest(
          ACTION_ATTRS.map((a) => `[${a}]`).join(","),
        );
        if (!el || !container.contains(el)) return;

        const { attr, value } = getActionAttribute(el);
        const [expectedEvent, action] = value.includes("->")
          ? value.split("->").map((s) => s.trim())
          : [getEvent(el), value];

        if (expectedEvent !== event) return;
        if (el.dataset.default == null) e.preventDefault();

        if (attr === "data-action") {
          // JS function or inline code
          const [method, args] = parseAction(action);
          if (actions[method]) {
            Array.isArray(args)
              ? actions[method](...args)($, e)
              : actions[method]($, e);
          } else {
            try {
              const scope = getMagicScope($, e, el);
              evaluateExpression(`with($) { ${action} }`, scope, true);
            } catch (err) {
              console.error(`Error evaluating inline action: "${action}"`, err);
            }
          }
        } else {
          // HTTP-based action
          const url = action;
          const method = el.dataset.post
            ? "POST"
            : el.dataset.patch
              ? "PATCH"
              : el.dataset.delete
                ? "DELETE"
                : "GET";

          const target = document.querySelector(el.dataset.target);
          const template = templates[el.dataset.template];
          const scope = { $event: e, $el: e.target };
          let body = null;

          if (el.dataset.params) {
            try {
              const evaluatedParams = evaluateExpression(
                el.dataset.params,
                scope,
              );
              body = JSON.stringify(evaluatedParams);
            } catch (err) {
              console.error("Error evaluating params:", err);
            }
          }

          fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: method === "GET" ? null : body,
          })
            .then((res) =>
              res.headers.get("content-type")?.includes("application/json")
                ? res.json()
                : res.text(),
            )
            .then((data) => {
              if (target) {
                target.innerHTML = template ? template(data, $) : data;
                target.querySelectorAll(DATA_LIST).forEach(processElement);
              }
            });
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

function getActionAttribute(el) {
  for (const attr of ["action", "get", "post", "patch", "delete"]) {
    const key = `data-${attr}`;
    if (el.hasAttribute(key)) return { attr: key, value: el.getAttribute(key) };
  }
  return null;
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

function evaluateExpression(expr, scope = {}, run = false) {
  try {
    const argNames = Object.keys(scope);
    const argValues = Object.values(scope);
    const code = run ? expr : `return (${expr})`;
    return new Function(...argNames, code)(...argValues);
  } catch (err) {
    console.error(`Error evaluating expression: "${expr}"`, err);
    return undefined;
  }
}

function getMagicScope($, e, el) {
  return {
    $,
    $el: el,
    $event: e,
    $target: e.target,
    $value: e.target?.value,
    $checked: e.target?.checked,
  };
}

export default surge;
