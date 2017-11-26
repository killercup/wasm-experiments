# WASM experiments

Some experiments after seeing [Rust PR #45905].

## Stuff I did

- `rustup target add wasm32-unknown-unknown --toolchain nightly`
- Install `wasm-gc` with `cargo install --git https://github.com/alexcrichton/wasm-gc`
- Install some more tools (incl. wasm2wat) with `git clone https://github.com/WebAssembly/wabt && cd wabt && make install`
- Compile the code in this repo with `cargo +nightly build --target=wasm32-unknown-unknown --release`
  - This should put get you some `.wasm` files: `ls -lah target/wasm32-unknown-unknown/release/`
  - Alternatively, you can just use the `*.wasm` in this repo
- Run it with `node ./do-the-wasm.js`
  - e.g., `node ./do-the-wasm.js hello-wasm.gc.wasm add 1 2`

## Using the `wrap` function

While this repo first started as a playground,
over time, a generic wrapper tool was developed.
Its goal is to allow you to easily call Rust functions in WASM from JS.

Let's see how we can use it to handle some trivial functions.

First, we'll need a way to load Rust code as WASM:

```js
const loadRust = require("../src/compile");
```

You can also load you own `.wasm` file, of course. Nex, the wrapper helper:

```js
const wrap = require("../src/wrap");
```

We'll be calling this a lot.

And, to test that this actually works (yes, this code is tested),
let's import the handy `ava` library.

```js
const { test } = require("ava");
```

Okay, we should be good to go. Let's see if this works:

```js
test("it works!", async (t) => {
    const instance = await loadRust(`
        #[no_mangle]
        pub extern "C" fn is_answer(a: i32) -> bool {
            a == 42
        }
    `);
    const isAnswer = wrap(instance.exports, "is_answer", ["i32"], "bool");
    t.deepEqual(isAnswer(42), true);
});
```

Looking good!
The thing with this wrapper tool is that it needs to be able
to convert between Rust and JS types.
Primitives like integers are easy,
but stuff like strings or arrays are a bit more complicated.

### Debugging

You can enable more logging output by seeting the environment variable `LOG_LEVEL`.
The levels are error (`1`), warn, info, debug, trace (`5`).
The default is `2` (info).

## Open questions

- Why oh why can't I build no staticlib that is a `.wasm` file?
- Is `undefined` really the best output format for a return value `&static str`?
  - `undefined` is a really bad representation of a static string. However, a `&static str` is a fat pointer consisting of `(pointer to data, length of data)`. The caller therefore needs to allocate memory for the function to write this fat pointer into and then needs to extract the actual data from this info

[Rust PR #45905]: https://github.com/rust-lang/rust/pull/45905
