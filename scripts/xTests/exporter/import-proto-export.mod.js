
import ExtendMe from "./extend-me.mod.js";

export { ExtendMe,  default } from "./extend-me.mod.js"

ExtendMe.prototype.bar = function() {
    console.log("ExtendMe I am PROTOTYPE added bar() and name is:", this._name);
    // this is ILLEGAL
    //console.log("ExtendMe PROTOTYPE bar() and my private name name is : ", this.#privName);
}

