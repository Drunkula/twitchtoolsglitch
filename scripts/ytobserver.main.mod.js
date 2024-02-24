import SockMsgRouter from "./sockmsgrouter.class.mod.js";

window.clog = console.log;

document.title = "YT Observer";

make_table();


class YTObserver extends SockMsgRouter {
    actions = {
        allplaylistdata: got_all_playlist
    };

    mySockEvents = [
        ['open', () => {
            this.send("iAmAnObserver");
        }]
    ];

    constructor() {
        super();
            // add default and custom
        this.add_socket_events();
        this.add_socket_events(this.mySockEvents);
    }
}

let YTO = new YTObserver();
YTO.connect();
window.YTO = YTO;

let htmlEvents = [
    {selector: "#next", event: "click", function: x=>YTO.send("playnext"), params: {}},
    {selector: "#prev", event: "click", function: x=>YTO.send("playprev"), params: {}},
    {selector: "#getplaylist", event: "click", function: x=>YTO.send("getwholeplaylist"), params: {}},
    {selector: "deletesong", event: "click", function: x=>x, params: {}},
];
add_event_listeners(htmlEvents);

function got_all_playlist(d) {
    console.log("Wow. got a full playlist");
    //console.log("playlist received", d);
    let pl = JSON.parse(d.data);

    let {playlist, playlistmap, playlistindex} = pl.data;
    console.log("playlist", playlist);

    let t = dce("table"); t.classList.add("table");
    t.append( table_row({isHeader: true, data: ["Song", "Adder"]}) );

    let counter = 0;
    for (let id of playlist) {
        let tr = table_row({id, data: [playlistmap[id].title, playlistmap[id].adder]});
        if (counter === playlistindex) tr.classList.add("is-selected");
        t.append( tr );
        counter++;
    }

    gid("playlist").replaceChildren(t);
}

    // adds events like click, change to elements

function add_event_listeners(events) {
    let chEv = new Event('change');
    let inpEv = new Event('input');

    for (const ev of events) {
        let fs = qsa(ev.selector);
        for (const f of fs) {
            f.addEventListener(ev.event, ev.function);
				// LAZY, dangerous, might change this to params having triggers
            if (ev.event === 'change' && ev.params?.noAutoChange !== true) {
                f.dispatchEvent(chEv);
            } else
            if (ev.event === 'input') {
                f.dispatchEvent(inpEv);
            }
        }
    }
}

    //

function make_table() {
    console.log("making table")

    let t = dce("table");
    t.classList.add("table");

    let hr = table_row({isHeader: true, data:["Foo", "Fahh", "Quim"]});
    let nr = table_row([1, 2, 3]);

    let nr2 = table_row([4, 2, 6]);
    let nr3 = table_row(["I", "am", "tr3"]);
    nr2.classList.add("is-selected");

    t.append(hr, nr, nr2, nr.cloneNode(true), nr.cloneNode());
    t.append(nr3);

console.log("nr", nr)

    gid("playlist").append(t);

    console.log("table made")
}

