/* had to do this to allow the global use of clog and cclog when breaking things up into
    Modules.

    Importing this makes clog work everywhere.
*/


let ccols = {}; // console log colours placeholder
window.clog = console.log;  // for multiple params

// functions globally in window object.  Change to a var to avoid pollution e.g var ccols = {} and change window for ccols
[ ['r', 1], ['g', 2], ['b', 4], ['w', 7], ['c', 6], ['m', 5], ['y', 3], ['k', 0] ]
.reduce(
    (cols, col) => ccols[col[0]] = f => `\x1b[1m\x1b[3${col[1]}m${f}\x1b[0m`, []
);

    // for easy colours

export function cclog(msg, col = "w")  {
    if (ccols[col] === undefined) {
        console.warn("cclog received illegal colour: ", col);
        col = "w";
    }
    console.log(ccols[col](msg));
}

window.clog = clog;


///////////// BULMA TOAST //////////////
///////////// BULMA TOAST //////////////
///////////// BULMA TOAST //////////////

toast_init();

function toast_init(testToast = false) {
    function toast(message, type="is-info", duration = 4000, extras = {}) {
        bulmaToast.toast({ message, type, duration, ...extras });
    }

    window.toast = toast;

    function toast_raw(d) {
        bulmaToast.toast(d);//, animate: {in: "backInLeft", out: "fadeOutBottomLeft"} });
    }

    bulmaToast.setDefaults({ animate: {in: "backInLeft", out: "fadeOutBottomLeft"}, duration: 4000 });
    window.toast_raw = toast_raw;

    if (testToast) {
        toast("Toast Test Message");
    }
}