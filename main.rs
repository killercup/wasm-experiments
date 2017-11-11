fn main() {
    println!("Hello World!");
}

#[no_mangle]
pub extern "C" fn add(x: i32, y: i32) -> i32 {
    42
}

#[no_mangle]
pub extern "C" fn time() -> &'static str {
    "Es ist fünf vor Zwölf!!"
}

#[no_mangle]
pub extern "C" fn hi(name: &str) {
    println!("Hello, {}", name);
}