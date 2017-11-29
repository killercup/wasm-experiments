WAT_ARGS ?= --fold-exprs --inline-exports --generate-names

/demo.rs:
	rustc +nightly --target wasm32-unknown-unknown -O demo.rs
	wasm-gc demo.wasm demo-wasm.gc.wasm

all: demo.rs
	wasm2wat $(WAT_ARGS) demo-wasm.wasm > demo-wasm.wat
	wasm2wat $(WAT_ARGS) demo-wasm.gc.wasm > demo-wasm.gc.wat
