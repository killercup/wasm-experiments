const { test } = require("ava");
const loadRust = require("../src/compile");
const wrap = require("../src/wrap");

test("it works!", async (t) => {
  const instance = await loadRust(`
    #[no_mangle]
    pub extern "C" fn foo() -> i32 {
        return 32;
    }
  `);
  const foo = wrap(instance.exports, "foo", [], "i32");
  t.deepEqual(foo(), 32);
});
