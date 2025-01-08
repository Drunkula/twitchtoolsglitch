/**
 *
 */
import { Socketty } from '../Socketty.class.js';
document.title = "Console Log (js)";
window.clog = console.log;
var ccols = {};    // console colours

var actions = {
    consoleclear: d => console.clear(),
    consolelog: d => {clog( ccols[d.colour](d.message) );},
    dump: d => console.log(d.data)
}

const SOCK_ADDR = "ws://localhost:8082";
let sock = new Socketty();

sock.on("message", sock_msg_handler );
sock.connect(SOCK_ADDR);

    // is it a json?

function sock_msg_handler(d) {
    d = d.data;
    let data = null, action, json = "not json";

    if (d[0] === '{')
    try {
        json = JSON.parse(d);
        action = json.action;
        //data = json;
        if (actions[action]) {
            actions[action](json);
            return;
        }
    } catch (error) {
        clog("Error: message_handler:", d);
    }

    console.log(d);
}

// functions globally in window object.  Change to a var to avoid pollution e.g var ccols = {} and change window for ccols
[ ['r', 1], ['g', 2], ['b', 4], ['w', 7], ['c', 6], ['m', 5], ['y', 3], ['k', 0] ]
.reduce(
    (cols, col) => ccols[col[0]] = f => `\x1b[1m\x1b[3${col[1]}m${f}\x1b[0m`, []
);