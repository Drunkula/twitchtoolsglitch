/*
Set up the youtube player

Socketty - 2 way between Streamerbot.  Add listeners
YTPlayer - Creates the iframe, tell it cue, play, pause, stop
    emit api ready and player ready after iframe init

YTController -
    Handles messages from Streamerbot via Socketty
    gives orders to YTPlayer
    sends state changes to Streamerbot
    Has the playlist

*/
import { config, playlistDefaults } from "./ytconfig.mod.js";
import YTController from "./ytcontroller.class.mod.js";


window.addEventListener('load', main);


async function main() {
    console.log("Main entry point init");
    out("Hello there.  Press F12 to open the dev console and observer messages");
    out("Set up watch expressions    ytpc.playlist");
    out('ptr: " + ytpc.playlistPointer + " nexts: " + ytpc.playlistNextCount + " [ptr]:" + ytpc.playlist[ytpc.playlistPointer] + " plyCurrStr: " + ytpc.playlistCurrent;');

    grab_url_params();

    clog =  ytparams.ytdbg === true ? console.log : function (){};

    let ytpc = new YTController();
    ytpc.myName = ytparams.name; // got from URL params
    ytpc.myObsSourceName = ytparams.obs;
    ytpc.chatcmds = ytparams.chatcmds;
    ytpc.chatadds = ytparams.chatadds;

        // it'll send 'closing' to streamerbot
    //window.addEventListener('beforeunload', () => ytpc.close());

window.ytpc = ytpc;// debugging
window.playlistDefaults = playlistDefaults;

    await ytpc.ytPlayer.ready();

    // ytpc.add(playlistDefaults);

    // now we can init the iframe
    let res = ytpc.ytPlayer.init_iframe( ytparams.videoId );

    console.log(res ? "Iframe create SUCCESS!" : "FAILED creating iframe");

    // we need a second promise for the onReady event
    out("Waiting on player...")
    await ytpc.ytPlayer.playerReady();
    out("It ready")

    //test_real();
    let socket = ytparams.webSock ??= config.socketty.socketUrl;
    ytpc.socketty.connect( socket );

    let sw = await ytpc.socketty.ready();

    clog("Awaiting socket ready:", sw, "readystate", ytpc.socketty.readyState);
        // if the above wait resolved false it'll still try and send
    ytpc.ytPlayer.play();   // on, it has to have emitted ready first

        // play will try and send a socket message even though it's not open.
        // IF the socket url has been changed here
        // socket open will try and load video by id so player has to be ready
        // it's not worth worrying about.
        // hang on, have a socket ready promise and we're all good
        // SO DO THIS: await ytpc.socket.ready or something

        // make those text links sing
    init_controls();

    return;
}

    // updates ytparams with params passed to the url

function grab_url_params() {
    let qs = new window.URLSearchParams( window.location.search );
    // url var | maps to param[that]
    let pList = ["x|XSize", "y|YSize", "muted", "video", "id|name", "chatadd", "add|chatadd", "chatadds|chatadd", "nan", "nowandnext|nan",
    "playlist", "pl|playlist", "shuffle", "debug|ytdbg", "obs", "chatcmds", "chatcommands|chatcmds", "cmds|chatcmds"];

    for (let p of pList) {
        let [param, to] = p.split("|");
        let u = qs.get(param);
        // no value means true e.g &nan means nan is true
        if (u === "false") u = false; else if(u === "true") u = true; else if (u === "") u = true;
clog(`${param} maps to ${to} value : `, u);
        if (u !== null) {
            param = to ? to : param; // to exists after param|to split
            ytparams[param] = u;
        }
    }

    return ytparams;// they're global anyway
}

function init_controls() {
    let controls = document.querySelectorAll(".controls li");

    for (const con of controls) {
        let action = con.dataset["action"];
        //con.addEventListener('click', e => ytpc.actions[action](e));
        con.addEventListener('click', e => ytpc.message_handler( action ));
    }
}

function test_real() {
    ytpc.socketty.retryConnecting = false;
    ytpc.add(["2mQECKOkkqk", "ed8QTKtLxKs", "QM_kJkChgrc"]);
    ytpc.add(["Next 1", "Next 2"], true);
    ytpc.add("Some Rando");
}

[ ['r', 1], ['g', 2], ['b', 4], ['w', 7], ['c', 6], ['m', 5], ['y', 3], ['k', 0] ]
.reduce(
    (cols, col) => window[col[0]] = f => `\x1b[1m\x1b[3${col[1]}m${f}\x1b[0m`, []
);

    // add it after you've added the api ready function or you'll miss the boat
/*
function insert_ytplayer_api() {
    var tag = document.createElement('script');

    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}*/