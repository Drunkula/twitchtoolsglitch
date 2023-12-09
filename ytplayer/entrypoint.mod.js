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
import { config, playlistDefaults } from "./config.mod.js";
import YTController from "./ytcontroller.class.mod.js";


window.addEventListener('load', main);


async function main() {
    console.log("Main entry point init");
    out("Hello there.");

    let ytpc = new YTController();

window.ytpc = ytpc;// debugging
window.playlistDefaults = playlistDefaults;

    await ytpc.ytPlayer.ready();

    // ytpc.add(playlistDefaults);

    // now we can init the iframe
    let res = ytpc.ytPlayer.init_iframe();

    console.log(res ? "Iframe create SUCCESS!" : "FAILED creating iframe");

    // we need a second promise for the onReady event
    out("Waiting on player...")
    await ytpc.ytPlayer.playerReady();
    out("It ready")

    //test_real();

    ytpc.ytPlayer.play();   // on, it has to have emitted ready first
    ytpc.socket.connect(config.socketty.socketUrl);
    init_controls();

    return;

    setTimeout(() => {
        out("I CHANGE?")
        ytpc.ytPlayer.player.loadPlaylist(["2mQECKOkkqk", "ed8QTKtLxKs", "QM_kJkChgrc"], 0);
    }, 3500);

    setTimeout(() => {
        out("again I CHANGE?")
        ytpc.yt.loadVideoById("ed8QTKtLxKs", 0);
    }, 1500);

    setTimeout(() => {
        ytpc.yt.pauseVideo();
    }, 6000);

    console.log(ytpc);

    // here we would extract some vars from the url string.
}

function init_controls() {
    let controls = document.querySelectorAll(".controls li");

    for (const con of controls) {
        let action = con.dataset["action"];
        con.addEventListener('click', e => ytpc.actions[action](e));
    }
}

function test_real() {
    ytpc.socket.retryConnecting = false;

    ytpc.add(["2mQECKOkkqk", "ed8QTKtLxKs", "QM_kJkChgrc"]);

    ytpc.add(["Next 1", "Next 2"], true);

    ytpc.add("Some Rando");
}

[ ['r', 1], ['g', 2], ['b', 4], ['w', 7], ['c', 6], ['m', 5], ['y', 3], ['k', 0] ]
.reduce(
    (cols, col) => window[col[0]] = f => `\x1b[1m\x1b[3${col[1]}m${f}\x1b[0m`, []
);

//main();   // this makes it work, and the player load

    // add it after you've added the api ready function or you'll miss the boat
/*
function insert_ytplayer_api() {
    var tag = document.createElement('script');

    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}*/