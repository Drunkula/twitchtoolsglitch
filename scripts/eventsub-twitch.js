/*
wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30


*/
"use strict"


function clog() {
    console.log(...arguments);
}

import { Socketty } from './Socketty.class.js';

// SCOPE SCOPE SCOPE
{
    const wsaddr = "wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30";

    //import default from './ytplayer/Socketty.class.js'


    let sock = new Socketty();
    sock.retryConnecting = false;

    console.log("sock", sock);

    sock.on('message', e => console.log("MESSAGE", e));
    sock.on('open', e => console.log("OPEN", e));
    sock.on('close', e => console.log("CLOSE", e));
    sock.on('error', e => console.log("ERROR", e));

    sock.connect(wsaddr);
}