# WASM experiments

Some experiments after seeing [Rust PR #45905].

[Rust PR #45905]: https://github.com/rust-lang/rust/pull/45905

## Getting Rust to compile to WASM

It's quite easy now!
Assuming you've installed Rust with [rustup] (highly recommended), it's just:

```
rustup update
rustup target add wasm32-unknown-unknown --toolchain nightly
rustc +nightly --target wasm32-unknown-unknown -O hello.rs
```

[rustup]: https://www.rustup.rs

## Using the `wrap` function

While this repo first started as a playground,
over time, a generic wrapper tool was developed.
Its goal is to allow you to easily call Rust functions in WASM from JS.

Let's see how we can use it to handle some trivial functions.

### Boilerplate

First, we'll need a way to load Rust code as WASM:

```js
const loadRust = require("../src/compile");
```

You can also load your own `.wasm` file, of course.
Next, the wrapper helper:

```js
const wrap = require("../src/wrap");
```

We'll be calling this a lot.

And, to test that this actually works (yes, this code is tested),
let's import the handy `ava` library.

```js
const { test } = require("ava");
```

### Easy as 1 2 3

Okay, we should be good to go. Let's see if this works:

```js
test("it works!", async (t) => {
    const instance = await loadRust(`
        #[no_mangle]
        pub fn is_answer(a: i32) -> bool {
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

### A-B-C? Actually not that easy

Let's try to write a function that returns a Rust `String`:

```js
test("get the time", async (t) => {
    const instance = await loadRust(`
        #[no_mangle]
        pub extern "C" fn time() -> String {
            String::from("Beer o'clock")
        }
    `);
    const time = wrap(instance.exports, "time", [], "String");
```

Surprisingly, we cannot wrap this!
The error message will tell you why:

```js
    const error = await t.throws(() => {
        const now = time();
    });
    t.is(error.message, "Ensure failed: You need to export an `alloc` function to get strings from WASM");
});
```

So, to get a Rust `String` (or any other non-primitive type basically), we need to allocate memory.
And not even to store the string itself (which Rust stores on the heap),
just to be able to tell the WASM function where to write the stack data of the `String` to
(It's passed as an out paramter as a `String` needs three words of storage).

Let's give this another go:

```js
test("really get the time", async (t) => {
    const instance = await loadRust(`
        use std::mem;
        use std::os::raw::c_void;

        #[no_mangle]
        pub extern "C" fn alloc(size: usize) -> *mut c_void {
            let mut buf = Vec::with_capacity(size);
            let ptr = buf.as_mut_ptr();
            mem::forget(buf); // This is JS' responsibility now
            return ptr as *mut c_void;
        }

        #[no_mangle]
        pub extern "C" fn time() -> String {
            String::from("Beer o'clock")
        }
    `);
    const time = wrap(instance.exports, "time", [], "String");
    t.deepEqual(time(), "Beer o'clock");
});
```

For now, this `alloc` export is something you'll just have to do. Sorry.
It'll get better, I promise.
(Deallocating memory is still an open issue -- chime in [here][issue-7]!)

[issue-7]: https://github.com/killercup/wasm-experiments/issues/7

### Writing code yourself is way to hard, let's just use Cargo

Okay, how about we try to do something useful?
Like, I don't know, calculate a SHA1 has for some bytes.
Do you know how to write implement SHA1 by hand? Well, me neither.
So, let's use a crate (Rust library)! [Here][sha1], I found one!

[sha1]: https://crates.io/crates/sha1

How to use it? Let's split this up a bit.
Here is the Rust code to load the `sha1` crate,
use it to munch some string slice,
and return a fancy `String` that contains the human-readable hash.

```js
test("digest some yummy bytes", async (t) => {
    const rustCode = `
        extern crate sha1;
        use sha1::Sha1;

        #[no_mangle]
        pub extern "C" fn digest(data: &str) -> String {
            let mut m = Sha1::new();
            m.update(data.as_bytes());
            m.digest().to_string()
        }
```

Oh, and don't forget the `alloc` dance:

```js
        use std::mem;
        use std::os::raw::c_void;

        #[no_mangle]
        pub extern "C" fn alloc(size: usize) -> *mut c_void {
            let mut buf = Vec::with_capacity(size);
            let ptr = buf.as_mut_ptr();
            mem::forget(buf); // This is JS' responsibility now
            return ptr as *mut c_void;
        }
    `;
```

and then we can compile this to WASM with a newly added list of dependencies
(the format is `{ name: "version" }`):

```js    
    const instance = await loadRust(rustCode, { sha1: "0.2" });
```

Et voilá, we can SHA1 all the strings now!

```js    
    const digest = wrap(instance.exports, "digest", ["&str"], "String");
    t.deepEqual(digest("foobar"), "8843d7f92416211de9ebb963ff4ce28125932878");
});
``` 

### Debugging

You can enable more logging output by setting the environment variable `LOG_LEVEL`.
The levels are error (`0`), warn, info, debug, trace (`5`).
The default is `2` (info).
