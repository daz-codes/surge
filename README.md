# ![SURGE](https://github.com/daz4126/surge/assets/16646/cfadc065-905f-48fa-bf09-5355da739f3f)
[![npm](https://img.shields.io/npm/v/@daz4126/surge?color=222222)](https://www.npmjs.com/package/@daz4126/surge)
[![License](https://img.shields.io/badge/License-Unlicense-222222)](#license)

Surge is a tiny, ultra-lightweight JavaScript library that adds a surge of reactivity to your HTML — all in just 1kb (minified and gzipped). 

No virtual DOM. No build step. No dependencies. Just drop it in and go.

Ever wonder why it takes 50kb of JavaScript, a virtual DOM, and a mountain of boilerplate just to build a counter?

With Surge, it doesn’t.

Surge embraces the simplicity of the web and the power of HTML-first development. It supercharges your HTML with a sprinkle of declarative magic using `data-*` attributes — no JSX, no diffing and no dependencies. Just clean, semantic HTML — with a surge of reactiviey.

⚡️ Two-way binding — Update your data or your UI, and both stay in sync
⚡️ Action binding with parameters — Easily wire logic to events like click, input, or submit
⚡️ LocalStorage support — Persist state with zero config
⚡️ Reactive HTML insertion — Dynamically add content and Surge wires it up automatically

Surge doesn't fight the browser — it works with it. HTML is your template and JavaScript is your logic. Surge brings them together in a powerful way then gets out of your way to let you build. And it's so small you'll hardly even know it's there.

Surge is built with simplicity in mind. Whether you’re prototyping, enhancing a static site, or building a micro-app, Surge gives you the power to be productive — without the weight of a full framework.

## Shopping Cart Example

Here's an example that shows off a number of Surge's features:

```HTML
<div data-surge data-local-storage="surge-cart">
  <h1>🛒 Shopping Cart</h1>
  <p>How many basketballs do you want to buy for $<span data-value="unitPrice">4.99</span> each?
  <p hidden>Items in cart: <span data-value="count" data-calculate="updatePrice">0</span></p>

  <button data-action="increment(-1)">-</button>
  <button data-action="increment()">+</button>

  <div data-value="basket"></div>
    <p>Total: $<span data-value="total">0</span></p>

    <label>
    price per ball:
    <input type="number" step="0.01" value="4.99" data-bind="unitPrice" />
  </label>
</div>
```

```javascript
  surge({
    increment: (n=1) => $ => {
      $.count += n
      $.basket = "🏀".repeat($.count)
    },
    updatePrice: $ => {
      $.total = ($.total + $.unitPrice).toFixed(2)
    }
  });
```

## 1. Write Some HTML

```html
<div data-surge>
  <input data-element="name" type="text" placeholder="Enter your name">
  <button data-action="greet">Greet</button>
  <h1>Hello <strong id="output">World</strong></h1>
</div>
```

## 2. Add Some JS

```javascript
surge({
    greet: $ => $.output = $.name.value
})
```
## 3. That's it, there is no Step 3!!

![Hello Surge!](https://github.com/daz4126/surge/assets/16646/96c7fadf-6b1f-43e2-a80f-980d953e9933)

You can see a live demo [on CodePen](https://codepen.io/daz4126/pen/oNOVVKJ).

Surge was inspired by the brilliant [Stimulus](https://stimulus.hotwired.dev) library.


## Installation

Either use npm or yarn to install:

```
npm install @daz4126/surge
```

Then import the `surge` function in your JavaScript file:

```
import surge from "@daz4126/surge"
```

Alternatively you can just import from a CDN:

```
import surge from "https://esm.sh/@daz4126/surge"
```

## Usage

Surge works by adding `data` attributes to your HTML.

Let's look at a simple example to illustrate how it works.

We'll make a little counter app that tracks how many times a button has been pressed.

```html
<main data-surge>
  <button>Pressed <span>0</span> times</button>
</main>
```

First, we need to add a `data-surge` attribute to the container element to identify that we're using Surge:

```html
<main data-surge>
  <button>Pressed <span>0</span> times</button>
</main>
```

Next we need to add a `data-action` attribute to the button. This tells Surge what action to run when the button is pressed. These take the form of `data-action="event->actionName"`:

```html
<main data-surge>
  <button data-action="click->increment">Pressed <span>0</span> times</button>
</main>
```

This means that when the button is clicked the action called `increment` will be called.

Buttons have a default event of 'click', so we can omit the reference to it and just write the name of the action:

```html
<main data-surge>
  <button data-action="increment">Pressed <span>0</span> times</button>
</main>
```

Next we need to associate the value of the count with the `span` element inside the button. To do this we give it a `data-value` attribute of "count". Surge uses this to identify the element. This element will also be reactive and it's text content will update dynamically whenever its `value` property is changed inside a surge action. We assign an initial value of `0` by setting the text content to `0`:

```html
<main data-surge>
  <button data-action="increment">Pressed <span data-value="count">0</span> times</button>
</main>
```

This will add a `count` property to the Surge object, which is the argument of any Surge actions. Changing the value of this propetry will cause the text content to automatically update and re-render.

Now we just need to define our `increment` action in the JavaScript. Actions are similar to event handlers and are passed to the `surge` function as an object:

```javascript
surge({
    increment: ($,e) => $.count++
})
```
Surge actions have two parameters - the *Surge object*, `$`, and the event object, `e`. The event object is exactly the same as any event handler and the Surge object has some methods that can be used to access and update the elements that have been marked with an `data-element` and `data-value` attributes. In the example above `$.count` refers to the value contained in the span element that has the `data-value` attribute and can be treated just like a normal JavaScript variable, so using the increment operator, `++`, will increase its value by 1. Any changes will automatically update the text content of the element with the new value, so every time the button is pressed, the next number will be displayed.

Note that in the example above, we don't actually use the event object, so we can omit it from the action definition:

```javascript
surge({
    increment: $ => $.count++
})
```

We can make actions more generic by adding parameters to them. These are added inside parentheses inside the `data-action` value

```html
<main data-surge>
  <button data-action="increment(1)">Increase by 1</button>
  <button data-action="increment(2)">Increase by 2</button>
  <h1 data-value="count">0</h1>
</main>
```

Actions that accept parameters need to have an extra parameter added to the function using a curried form of 'double arrow function', for example, we can add the parameter `n` which represents the amount to increment by to the `increment` action like this:

```javascript
surge({
    increment: n => $ => $.count += n
})
```

This will now pass the parameter from the action into the function and increment the value of `count` by this amount.

We can set a default value of `1` in the usual way:

```javascript
surge({
    increment: (n=1) => $ => $.count += n
})
```

Note that the parentheses are still required in the `data-action` value to indicate that this is an action that accepts parentheses:

```html
<main data-surge>
  <button data-action="increment()">Increase by 1</button>
  <button data-action="increment(2)">Increase by 2</button>
  <h1 data-value="count">0</h1>
</main>
```


This example can be seen [on CodePen](https://codepen.io/daz4126/pen/dyLLpwy).

### Data Attributes

#### `data-surge`

Signifies the start of a Surge block of code, any Surge code will only apply to anything inside this container.

#### `data-element`

Any element with this attribute will be accessible as a property of the surge object

```html
<h1 data-element="title">Hello Surge</h1>
```

This element would then be accessible inside a Surge action as:

```javascript
$.title
```

(yes, it has jQuery vibes....)

#### `data-value`

Used to create reactive values.

#### `data-action`
#### `data-calculate`
#### `data-bind`
#### `data-default`
#### `data-foo`

### The `initalize` action

The `initialize` action will run once after the HTML loads. This is useful for any setup code that needs running.

The `initialize` action is **not** an event listener so only accepts the Surge object as it's only argument, for example:

```javascript
connect: $ => {
  console.log("Connected!")
}
```

## Creating Dynamic Content

Elements that have been added to the Surge object have a number of methods that can be used to add dynamic content. Any content added can also use the 

### `$.element.append`

Every element that can be accessed using the Surge object has an `append` method that can be used to append HTML to it. The dynamically added HTML fragment is provided as a string and becomes the last child of the element. For example the following code would append a list item to a list:

```html
<main data-surge>
  <button data-action="add">Add new item</button>
  <ul id="list" data-size=1></ul>
</main>
```

```javascript
surge({
  add: $ => $.list.append(`<li>Item number ${$.list.size++}</li>`)
})
```

You can add `id`s and `data-action` attributes to dynamically created HTML to create fully interactive web pages.

**See the To Do List example below for this in action**

### `$.element.prepend`

The `prepend` method works in the same was as `append` but inserts the HTML fragment as the first child of the element.

### `$.element.after`

The `after` method will insert the HTML fragment after the element (as a sibling).

### `$.element.before`

The `before` method will insert the HTML fragment before the element (as a sibling).

### `$.element.replace`

The `replace` method will replace the element with the HTML fragment.

# State Management

State can be managed at an element level by using `data` attribues. These can be used to set properties of the element that can be accessed using the Surge object. For example, you can keep track of whether an item is important or not:

```html
<h1 id="heading" data-important=true data-action'="click->highlight">Something Important</h1>
```

This can then be accessed in the action code:

```javascript
highlight: $ => {
  if($.heading.important){
    $.heading.style.color = "red"
  } else {
    $.heading.style.color = "yellow"
  }
}
```

The Surge object, `$`, is effectively a global object of the app and is available to every action, so is perfect for managing shared state that you want to share around the whole app.

You can add properites directly to the Surge object using the dot notation:

```
$.username = "Ada"
```

This will now be accessible in all of the actions.

If you are using a lot of properties in this way, it might be worth namespacing these values:

```
$.state.username = "Ada"
```

The key thing to remember is that the Surge object acts just like a regular object and is available in every action.

**See the Stopwatch example below for this technique being used to keep track of whether the clock is ticking**

# Examples

Have a look at the examples below to see how Surge can be used to create a variety of interactive HTML.

### Likes Counter

![Likes Counter](https://github.com/daz4126/surge/assets/16646/83a1d67d-2ec5-4d7b-998f-f33a4271dbfa)


#### HTML:
```html
<main data-surge>
  <h1>❤️ <strong id="count">0</strong></h1>
  <button data-action="increment">👍</button>
  <button data-action="decrement">👎</button>
</main>
```

#### JavaScript:
```javascript
surge({
  increment: $ => $.count.value++,
  decrement: $ => $.count.value--
})
```

[See the code on CodePen](https://codepen.io/daz4126/pen/oNOVEme)

### Character Counter

![Charcter Counter](https://github.com/daz4126/surge/assets/16646/bc408184-3989-465d-82d7-13d64b5753b7)

#### HTML:
```html
<main data-surge>
  <textarea data-action="count"></textarea>
  <p>
    There are
    <strong id="count">0</strong> characters in this textarea.
  </p>
</main>
```

#### JavaScript:
```javascript
surge({
  count: ($,e) => $.count.value = e.target.value.length
})
```

[See the code on CodePen](https://codepen.io/daz4126/pen/XWQONvR)

### BMI Calculator

![BMI Calculator](https://github.com/daz4126/surge/assets/16646/f6cbaecb-ebb3-42d8-a4ec-5033a3939df2)

#### HTML:
```html
<main data-surge>
  <h2>BMI Calculator</h2>
  <h2>BMI: <strong id="bmi">25</strong></h2>
  <label>Weight (kg):</label>
  <input type="range" min=0 max=150 data-action="update" data-target="weight" value=45>
  <h2 id="weight">75</h2>
  <label>Height (cm):</label>
  <input type="range" min=0 max=250 data-action="update" data-target="height" value=150>
  <h2 id="height">25</h2>
</main>
```

#### JavaScript:
```javascript
surge({
  update: $ => {
    $[$.target.dataset.target].value = $.target.value
    $.bmi.value = ($.weight.value / ($.height.value/100)**2).toFixed(1)
  }
})
```

[See the code on CodePen](https://codepen.io/daz4126/pen/abxXwQR)

### Slideshow

![Slideshow](https://github.com/daz4126/surge/assets/16646/66001699-521d-4b8b-97c2-b9a75fffea87)


#### HTML:
```html
<main data-surge>
  <button data-action="previous"> ← </button>
  <button data-action="next"> → </button>
  <div id="slides" data-index=0>
    <div>🐵</div>
    <div hidden>🙈</div>
    <div hidden>🙉</div>
    <div hidden>🙊</div>
  </div>
</main>
```

#### JavaScript:
```javascript
const showCurrentSlide = (slides,i) =>  [...slides].forEach((element, j) => element.hidden = j !== i)

surge({
  next: $ => {
    $.slides.index = ($.slides.index + 1)%4
    showCurrentSlide($.slides.children,$.slides.index)
  },
  previous: $ => {
    $.slides.index = (($.slides.index - 1)%4+4)%4
    showCurrentSlide($.slides.children,$.slides.index)
  }
})
```

[See the code on CodePen](https://codepen.io/daz4126/pen/poBYMoP)

### Stopwatch

![Screenshot 2024-05-18 at 10 12 29](https://github.com/daz4126/surge/assets/16646/8858d7ed-3935-4dbe-9a19-2e3ed7835b03)

#### HTML:
```html
<main data-surge>
  <h1 id="time">0.00</h1>
  <button id="toggleBtn" data-action="toggle">Start</button>
  <button data-action="reset">Reset</button>
</main>
```

#### JavaScript:
```javascript
surge({
  toggle: $ => {
    $.toggleBtn.value = $.ticking ? "Start" : "Stop"
    if($.ticking){
      $.ticking = clearInterval($.ticking)
    } else {
        $.ticking = setInterval(() => {
          $.time.value = (Number($.time.value) + 0.01).toFixed(2)
    },10)
    }
  },
  reset: $ => {
    $.time.value = (0).toFixed(2)
  }
})
```

[See the code on CodePen](https://codepen.io/daz4126/pen/mdgoqOQ)

### Times Table Quiz

![Times Table Quiz](https://github.com/daz4126/surge/assets/16646/50717e99-a798-4007-8edc-1b7756351a2c)

#### HTML:
```html
<main data-surge>
  <div id="game">
  <h2>Times Tables</h2>
  <h2>Score: <span id="score">0</span></h2>
  <h1><span id="question">1</span>) <span id="x"></span> &times; <span id="y"></span> = <span id="answer"></span><span id="feedback"></span></h1>
  <form data-action="check">
    <input id="userAnswer" />
  </form>
  </div>
  <div id="info" hidden=true>
  <h2 id="message"></h2>
    <button data-action="newGame">Play Again</button>
  </div>
</main>
```

#### JavaScript:
```javascript
const NUMBER_OF_QUESTIONS = 5

const randomNumber = n => Math.ceil(Math.random()*n)
const generateQuestion = (x,y) => {
  x.value = randomNumber(12)
  y.value = randomNumber(12)
}

surge({
  connect: $ => {
    generateQuestion($.x,$.y)
  },
  check: $ => {
    $.e.preventDefault()
    $.answer.value = $.userAnswer.value
    if($.userAnswer.value == $.x.value * $.y.value){
      $.score.value ++
      $.feedback.value = "✅"
    } else {
      $.feedback.value = "❌"
    }
    setTimeout(() => {
      if($.question.value === NUMBER_OF_QUESTIONS){
        $.message.value = `Game Over. You Scored ${$.score.value}`
        $.game.hidden = true
        $.info.hidden = false
      } else {
        $.question.value ++
        generateQuestion($.x,$.y)
        $.userAnswer.value = ""
        $.answer.value = ""
        $.feedback.value = ""
    }
    },700)
  },
  newGame: $ => {
    generateQuestion($.x,$.y)
    $.question.value = 1
    $.score.value = 0
    $.game.hidden = false
    $.info.hidden = true
    $.answer.value = ""
    $.userAnswer.value = ""
    $.feedback.value = ""
  },
})
```

[See the code on CodePen](https://codepen.io/daz4126/pen/vYMPdPd)

### To Do List

![Screenshot 2024-05-11 at 17 44 53](https://github.com/daz4126/surge/assets/16646/28d94fd6-2c51-4d10-b8d7-34b6fcaca2e8)

#### HTML:
```html
<main data-surge>
  <form data-action="add">
  <input id="item" placeholder="What do you want to do?"/>
  <button type="submit">+</button>
</form>
  <ul id="list"></ul>
</main>
```

#### JavaScript:
```javascript
const actions = {
   add: $ => {
     $.e.preventDefault()
     $.list.append(`<li data-action="complete" data-completed=false  class="item">${$.item.val}<button data-action=delete>delete</button></li>`)
     $.item.value = ""
     $.item.focus()
  },
    complete: $ => {
      if($.target.className === "item"){
        $.target.dataset.completed = !JSON.parse($.target.dataset.completed)
      }  
    },
  delete: $ => $.target.parentElement.remove()
}

surge(actions)
```

[See the code on CodePen](https://codepen.io/daz4126/pen/PogvwBZ)

### Fetching Data

![Fetching Data](https://github.com/daz4126/surge/assets/16646/8ea5b762-b7ad-41b8-8c9d-581c03b51710)

#### HTML:
```html
<main data-surge>
  <div id="photos" data-url="https://picsum.photos/v2/list"></div>
</main>
```

#### JavaScript:
```javascript
surge({
  connect: $ => {
    fetch($.photos.url)
      .then(response => response.ok ? response.json() 
                        : new Error(response.status))
      .then(data => {
        data.forEach(photo => $.photos.append(`<img src="${`https://picsum.photos/id/${photo.id}/200`}"/>`))       
      })
      .catch(error => console.log(error.message))
  }
})
```

[See the code on CodePen](https://codepen.io/daz4126/pen/MWRRgLg)
