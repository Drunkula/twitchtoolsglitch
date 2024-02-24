/*
    JAVASCRIPT part
*/
import { Socketty } from "/scripts/Socketty.class.js";

    // whether next or prev was last used
const PLAYLIST_FORWARD = 1;
const PLAYLIST_BACKWARD = -1;
    // Default playlist in config.mod.js

// essentially {these funcs} = {this object of funcs}

var SockMsgRouterCounter = 0;
var SAOpenTimes = {};


class SockMsgRouter {
    socket = new Socketty();    // url is set in constructor
    myId = 0;   // set in constructor

    socketEvents = [
        ['message', e => this.message_handler(e)],
        ['open',  () => { //out("SockMsgRouter Socketty opened");
                    //SAOpenTimes[this.myId] = -Infinity;
                    SAOpenTimes[this.myId] =performance.now();
                }],
                /*
        ['close', () => {   // out first time then only every 30 seconds
            let now = performance.now();
            let last = SAOpenTimes[this.myId] ??= -Infinity;  // doesn't exist?  Warn first time with nullish coalescing assignment
            SAOpenTimes[this.myId] = now;
            if (now - last > 30000) {
                out("!SockMsgRouter Oh noes, socketty closed");
            }
        }],*/

        ['error', x => console.error("Error: SockMsgRouter Socketty error!", x.toString())]
    ];

        // messages will be like a format of "action" and "data"

    actions = {
        sendmessage:d => { this.send(d.data); },
        consolelog: d => {clog( window[d.colour](d.message) );},
    }

        // HAS A socket systems

    constructor() {
        this.myId = SockMsgRouterCounter++;
        clog("I am a SockMsgRouter constructor.");
        //this.add_socket_events();
    }

    add_socket_events(events = null) {
        events??= this.socketEvents;
        for (const pair of events) {
            this.socket.addEventListener(pair[0], pair[1]);
        }
    }

        // routes incoming socket messages

    message_handler(e) {
        let data = null, action, json = "not json";

        if (typeof e === "string") {
            action = e;
        } else {
            action = e.data;
        }

        if (action[0] === '{')
        try {
            json = JSON.parse(action);
            action = json.action;
            data = json;
        } catch (error) {
            clog("message_hander:", e);
            clog("ERROR:", error.toString());
        }

        if (this.actions[action]) {
            this.actions[action](data);
        }
            // don't log everything
        if (["consolelog", "pong"].includes(action)) {
            return;
        }

        clog("Action:", action, "JSON?", json);
            //this.send("Thanks, partner!")
    }

    connect(url) {
        this.socket.connect(url);
    }

        // both of these SHOULD check they're connected

    send(data) {
        return this.socket.send(data);
    }

    send_json(obj) {
        return this.socket.send( JSON.stringify(obj) );
    }

}

    // why don't classes hoist
//let YTP = new YTController();

export default SockMsgRouter;

