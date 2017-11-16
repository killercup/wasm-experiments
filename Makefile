WAT_ARGS ?= --fold-exprs --inline-exports --generate-names

main: main.rs
	cargo +wasm32 build --target=wasm32-unknown-unknown --release
	cp target/wasm32-unknown-unknown/release/hello-wasm.wasm hello-wasm.wasm
	wasm2wat $(WAT_ARGS) hello-wasm.wasm > hello-wasm.wat
	wasm-gc hello-wasm.wasm hello-wasm.gc.wasm
	wasm2wat $(WAT_ARGS) hello-wasm.gc.wasm > hello-wasm.gc.wat
