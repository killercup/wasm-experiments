WAT_ARGS ?= --fold-exprs --inline-exports --generate-names

example/hello.rs:
	cargo +nightly build --target=wasm32-unknown-unknown --release --example hello
	cp target/wasm32-unknown-unknown/release/examples/hello.wasm hello-wasm.wasm
	wasm-gc hello-wasm.wasm hello-wasm.gc.wasm

test: example/hello.rs
	npm test

all: example/hello.rs
	wasm2wat $(WAT_ARGS) hello-wasm.wasm > hello-wasm.wat
	wasm2wat $(WAT_ARGS) hello-wasm.gc.wasm > hello-wasm.gc.wat
