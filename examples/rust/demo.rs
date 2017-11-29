use std::mem;
use std::ffi::{CString, CStr};
use std::os::raw::{c_char, c_void};

fn main() {
    println!("Hello World!");
}

#[no_mangle]
pub extern "C" fn add(x: i32, y: i32) -> i32 {
    42
}

#[no_mangle]
pub extern "C" fn time() -> *mut c_char {
    let s = CString::new("Es ist fünf vor Zwölf!!").unwrap();
    s.into_raw()
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
pub extern "C" fn echo_str(name: &str) -> &str {
    name
}

#[no_mangle]
pub extern "C" fn is_fancy(name: &str, expected: bool) -> bool {
    expected && (name.len() > 4)
    // true
}
