# WASM experiments

Some experiments after seeing [Rust PR #45905].

This is how you can play with it yourself:

- Follow the instructions on [Rust PR #45905] to get a rustc that can target WASM
  - `./configure --target=wasm32-unknown-unknown --set llvm.experimental-targets=WebAssembly`
  - `./x.py build`
  - Link the new WASM32 toolchain, e.g. with `rustup toolchain link wasm32 build/x86_64-apple-darwin/stage2/`
- Optionally, install `wasm-gc` with `cargo install --git https://github.com/alexcrichton/wasm-gc`
- Optionally, install some more tools (incl. wasm2wat) with `git clone https://github.com/WebAssembly/wabt && cd wabt && make install`
- Clone this repo, and compile it with `cargo +wasm32 build --target=wasm32-unknown-unknown --release`
  - This should put get your some `.wasm` files: `ls -lah target/wasm32-unknown-unknown/release/`
  - Alternatively, use the `*.wasm` in this repo
- Have a very recent _node_ version, and run it with `node ./do-the-wasm.js`
  - e.g., `node ./do-the-wasm.js hello-wasm.gc.wasm add 1 2`

[Rust PR #45905]: https://github.com/rust-lang/rust/pull/45905
