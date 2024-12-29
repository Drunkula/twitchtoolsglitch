/*
tl;dr JUST USE Classes and extend them

BACKPEDAL - how about importing then rexporting?

class file: extend-me.mod.js
class ExtendMe {
    _name = "default";

    get name() {
        return "my name is " + this._name;
    }

    foo() {
        console.log("I say foo");
    }
}

extender:
import ExtendMe from "./extend-me.mod.js";

export { ExtendMe,  default } from "./extend-me.mod.js"

ExtendMe.prototype.bar = function() {
    console.log("ExtendMe I am PROTOTYPE added bar() and name is:", this._name);
}

PROBLEMS?  #privatePropsAndMethods, though you could create get and set for them.




I tried using prototype to add methods to a class and it does work, however there's a problem
in that you get a class back and the methods added in a different module don't always get run
when you'd like them to.  You can do an await and pass a promise from the constructor that
get resolved when the methods are added e.g.

STOP THE BUS - what if I re-export from a "top level" file that does all the shit...

file 1

    foo = await new Foo();

    class Foo() {
        constructon() {
            var thisPromise = new Promise(r => {
                import("./file 2.js").then( x => r(this) );
                //import("./tts-sb.class.extras.js").then( x => Promise.resolve(this) );
            });

            return thisPromise;
        }
    }

file 2
    import Foo from "./file 1"

    function add_funcs() {
        Foo.prototype.test = function () {
            cclog("***************** TTS SB EXTRA METHOD DEFIIIIIINED Ok, that's fine.", "m");
        }

        Foo.prototype.test2 = function () {
            cclog("2222222222222222 TTS SB EXTRA METHOD DEFIIIIIINED Ok, that's fine.", "m");
        }
    }

    add_funcs();











*/