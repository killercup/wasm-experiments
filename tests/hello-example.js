const { test } = require("ava");
const loadRust = require("../src/compile");
const wrap = require("../src/wrap");

const allocFunction = `
  use std::mem;
  use std::os::raw::{c_char, c_void};
  #[no_mangle]
  pub extern "C" fn alloc(size: usize) -> *mut c_void {
      let mut buf = Vec::with_capacity(size);
      let ptr = buf.as_mut_ptr();
      mem::forget(buf);
      return ptr as *mut c_void;
  }

  #[no_mangle]
  pub extern "C" fn dealloc(ptr: *mut c_void, cap: usize) {
      unsafe  {
          let _buf = Vec::from_raw_parts(ptr, 0, cap);
      }
  }`;

const addFunction = `
#[no_mangle]
pub extern "C" fn add(x: i32, y: i32) -> i32 {
  42
}`;

test(`It's WASM time`, async (t) => {
  const instance = await loadRust(`
    use std::ffi::CString;
    use std::os::raw::c_char;
    #[no_mangle]
    pub extern "C" fn time() -> *mut c_char {
        let s = CString::new("Es ist fünf vor Zwölf!!").unwrap();
        s.into_raw()
    }
  `);
  const time = wrap(instance.exports, "time", [], "CStr");
  t.deepEqual(time(), "Es ist fünf vor Zwölf!!");
});

test(`2 + 2 = 42`, async (t) => {
  const instance = await loadRust(addFunction);
  const add = wrap(instance.exports, "add", ["i32", "i32"], "i32");
  t.deepEqual(add(2, 2), 42);
  t.deepEqual(add(1.1, 1.1), 42);
});

test(`Hello Jan-Erik`, async (t) => {
  const instance = await loadRust(`
    use std::ffi::CStr;
    ${allocFunction}
    #[no_mangle]
    pub extern "C" fn hi(name: *mut c_char) -> *mut c_char {
        name
    }
  `);
  const hi = wrap(instance.exports, "hi", ["CStr"], "CStr");
  t.deepEqual(hi("Jan-Erik"), "Jan-Erik");
});

test(`Hello UTF-8!`, async (t) => {
  const instance = await loadRust(`
    ${allocFunction}
    #[no_mangle]
    pub extern "C" fn hi(name: *mut c_char) -> *mut c_char {
        name
    }
  `);
  const hi = wrap(instance.exports, "hi", ["CStr"], "CStr");
  t.deepEqual(hi("G̸rü͢ß ͟Got͠t͡!"), "G̸rü͢ß ͟Got͠t͡!");
});

test(`sha1`, async (t) => {
  const instance = await loadRust(`
    extern crate sha1;

    use sha1::Sha1;

    ${allocFunction}

    #[no_mangle]
    pub extern "C" fn digest(data: &str) -> String {
        let mut m = Sha1::new();
        m.update(data.as_bytes());
        m.digest().to_string()
    }
  `, { "sha1" : "0.2.0"});
  const digest = wrap(instance.exports, "digest", ["&str"], "String");
  t.deepEqual(digest("foobar"), "8843d7f92416211de9ebb963ff4ce28125932878");
});

test(`string slice`, async (t) => {
  const instance = await loadRust(`
    ${allocFunction}
    #[no_mangle]
    pub fn time_str() -> &'static str {
        "Es ist fünf vor Zwölf!!!"
    }
  `);
  const time = wrap(instance.exports, "time_str", [], "&str");
  t.deepEqual(time(), "Es ist fünf vor Zwölf!!!");
});

test(`owned string`, async (t) => {
  const instance = await loadRust(`
    ${allocFunction}
    #[no_mangle]
    pub fn time_string() -> String {
        String::from("Es ist fünf vor Zwölf!")
    }
  `);
  const time = wrap(instance.exports, "time_string", [], "String");
  t.deepEqual(time(), "Es ist fünf vor Zwölf!");
});

test(`slices and Vecs`, async (t) => {
  const instance = await loadRust(`
    ${allocFunction}
    #[no_mangle]
    pub extern "C" fn digest_bytes(data: &[u8]) -> Vec<u8> {
        vec![13, 37, 42, 42]
    }
  `);
  const digest = wrap(instance.exports, "digest_bytes", ["&[u8]"], "Vec<u8>");
  t.deepEqual(digest(new Uint8Array([0x00, 0x00, 0x00, 0x00])),
    new Uint8Array([13, 37, 42, 42]));
});

test(`u16 vecs`, async (t) => {
  const instance = await loadRust(`
    ${allocFunction}
    #[no_mangle]
    pub extern "C" fn digest_bytes(data: &[u8]) -> Vec<u16> {
        vec![13, 37, 42, 65500, 15, 42, 64000]
    }
  `);
  const digest = wrap(instance.exports, "digest_bytes", ["&[u8]"], "Vec<u16>");
  t.deepEqual(digest(new Uint8Array([0x00, 0x00, 0x00, 0x00])),
    new Uint16Array([13, 37, 42, 65500, 15, 42, 64000]));
});

test(`float vecs`, async (t) => {
  const instance = await loadRust(`
    ${allocFunction}
    #[no_mangle]
    pub extern "C" fn digest_floats(data: &[u8]) -> Vec<f32> {
        vec![13., 37., 42., 42.]
    }
  `);
  const digest = wrap(instance.exports, "digest_floats", ["&[u8]"], "Vec<f32>");
  t.deepEqual(digest(new Uint8Array([0x00, 0x00, 0x00, 0x00])),
    new Float32Array([13, 37, 42, 42]));
});

test(`str echo`, async (t) => {
  const instance = await loadRust(`
    ${allocFunction}
    #[no_mangle]
    pub extern "C" fn echo_str(name: &str) -> &str {
        name
    }
  `);
  const echo = wrap(instance.exports, "echo_str", ["&str"], "&str");
  t.deepEqual(echo("Banana"), "Banana");
  t.deepEqual(echo("Apple"), "Apple");
  t.deepEqual(echo(""), "");
  t.deepEqual(echo("L͞o̕r̕em͟ ip̕s͏u͢m"), "L͞o̕r̕em͟ ip̕s͏u͢m");
});

test(`boolean`, async (t) => {
  const instance = await loadRust(`
    ${allocFunction}
    #[no_mangle]
    pub extern "C" fn is_fancy(name: &str, expected: bool) -> bool {
        expected && (name.len() > 4)
        // true
    }
  `);
  const isFancy = wrap(instance.exports, "is_fancy", ["&str", "bool"], "bool");
  t.deepEqual(isFancy("Banana", true), true);
  t.deepEqual(isFancy("Apple", false), false);
  t.deepEqual(isFancy("N/A", true), false);
});

test(`slice roundtrip`, async (t) => {
  const instance = await loadRust(`
    ${allocFunction}
    ${addFunction}
  `);
  const add = wrap(instance.exports, "add", ["i32", "i32"], "i32");
  const { newSlice, extractSlice } = require("../src/wasm-io");
  const { memory, alloc } = instance.exports;
  const ptr = newSlice(memory, alloc, new Uint8Array([1, 2, 3, 4]));
  const [ptr2, len] = extractSlice(memory, ptr);
  t.deepEqual(4, len);
});
