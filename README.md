# WASM experiments

Some experiments after seeing [Rust PR #45905].

## Stuff I did

- Follow the instructions on [Rust PR #45905] to get a rustc that can target WASM
  - `./configure --target=wasm32-unknown-unknown --set llvm.experimental-targets=WebAssembly`
  - `./x.py build`
  - Link the new WASM32 toolchain with `rustup toolchain link wasm32 build/x86_64-apple-darwin/stage2/`
- Install `wasm-gc` with `cargo install --git https://github.com/alexcrichton/wasm-gc`
- Install some more tools (incl. wasm2wat) with `git clone https://github.com/WebAssembly/wabt && cd wabt && make install`
- Compile the code in this repo with `cargo +wasm32 build --target=wasm32-unknown-unknown --release`
  - This should put get you some `.wasm` files: `ls -lah target/wasm32-unknown-unknown/release/`
  - Alternatively, you can just use the `*.wasm` in this repo
- Run it with `node ./do-the-wasm.js`
  - e.g., `node ./do-the-wasm.js hello-wasm.gc.wasm add 1 2`

## Open questions

- Why oh why can't I build no staticlib that is a `.wasm` file?
- Is `undefined` really the best output format for a return value `&static str`?
  - `undefined` is a really bad representation of a static string. However, a `&static str` is a fat pointer consisting of `(pointer to data, length of data)`. The caller therefore needs to allocate memory for the function to write this fat pointer into and then needs to extract the actual data from this info

[Rust PR #45905]: https://github.com/rust-lang/rust/pull/45905
