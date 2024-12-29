

var ___tester_is_mod = "foo";
var isModule = window.___tester_is_mod === ___tester_is_mod;  // can'd do under Node

export class ExtendMe {
    _name = "ExtendMe default";
    #privName = "ExtendMe private name";

    constructor() {
        console.log("ExtendMe is constructed");
    }

    get name() {
        return "ExtendMe my name is " + this._name;
    }

    foo() {
        console.log("ExtendMe Native method foo() and my name is : ", this.name);
        // this is legal
        console.log("ExtendMe Native method foo() and my private name name is : ", this.#privName);
    }
}

export default ExtendMe;
//export ExtendMe;


console.log("typeof exports", typeof exports);  // browser undefined, object node
console.log("typeof module", typeof module);    // browser undefined, object node
console.log("typeof this", typeof this);        // object in node,
console.log("typeof globalthis", typeof globalThis);    // object in both
console.log("typeof window", typeof window);
console.log("typeof globalThis constructor:", globalThis.constructor);  // ƒ Window() in browser, Function object in node


if (typeof exports === 'object' && typeof module === 'object') {
    // you're in Node
    console.log("You're in NODE");
}
if (typeof Window === 'function' && this?.constructor === Window) {
    // definitely in a browser
    console.log("You're in a browser window");
}
if (typeof this === "undefined") {
    console.log("You're in a browser module");
}
