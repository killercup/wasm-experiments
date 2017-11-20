extern crate sha1;

use std::mem;
use std::ffi::{CString, CStr};
use std::os::raw::{c_char, c_void};

use sha1::Sha1;

fn main() {
    println!("Hello World!");
}

#[no_mangle]
pub extern "C" fn add(x: i32, y: i32) -> i32 {
    42
}

#[no_mangle]
pub fn time_string() -> String {
    String::from("Es ist fünf vor Zwölf!")
}

#[no_mangle]
pub fn time_str() -> &'static str {
    "Es ist fünf vor Zwölf!!!"
}

#[no_mangle]
pub extern "C" fn time() -> *mut c_char {
    let s = CString::new("Es ist fünf vor Zwölf!!").unwrap();
    s.into_raw()
}

#[no_mangle]
pub extern "C" fn hi(name: *mut c_char) -> *mut c_char {
    name
}

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
}

#[no_mangle]
pub extern "C" fn digest(data: *mut c_char) -> *mut c_char {
    unsafe {
        let data = CStr::from_ptr(data);

        let mut m = Sha1::new();
        m.update(data.to_bytes());
        let dgst = m.digest().to_string();
        let s = CString::new(dgst).unwrap();
        s.into_raw()
    }
}

#[no_mangle]
pub extern "C" fn digest_bytes(data: &[u8]) -> Vec<u8> {
    vec![13, 37, 42, 42]
}
