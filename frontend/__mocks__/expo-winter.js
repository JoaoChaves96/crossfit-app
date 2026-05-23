// Stub for expo/src/winter and expo/src/winter/runtime.native
// These modules install WinterCG globals (TextDecoder, URL, fetch, etc.) via
// native JSI — they cannot run in a Jest/Node environment.
// All globals they would install already exist in Node 18+.
module.exports = {};
