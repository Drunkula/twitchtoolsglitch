/*
I could add a ready() promise
*/
//const socketUrl = 'ws://127.0.0.1:8081/'; // for streamerbot

    /**
     *  websocket wrapper with all the functionality but also
     * pings
     * reconnects
     * restored event listeners
     *
     * use it as a direct replacement
     */

export { Socketty };

class Socketty {

    ws = null;
    socketUrl = "ws://127.0.0.1:8081/";
    connected = false;

    retryConnectingAuto = true;    // open or connect set retryConnecting to this
    retryConnecting = true;

    retryInitialDelay = 250;   // milliseconds
    retryCurrentDelay = this.retryInitialDelay;
    retryCurrentAttempts = 0;

    retryDecay = 1.5;
    retryMaxIntervalTime = 30;
    retryMaxAttempts = 100; // emit an error or something
    retryMaxTimeTotal = 600; // want to stop after X minutes.  Not yet implemented

    pingActive = true;
    pingInterval = 30;  // seconds
    pingSetIntervalRef;  // for setInterval

        // if people do event listeners they'll need adding back to the socket
    eventListenerBackup = [];

    statesToStr = {
        0: "CONNECTING",
        1: "OPEN",
        2: "CLOSING",
        3: "CLOSED"
    }

    states = {
        "CONNECTING": 0,
        "OPEN"      : 1,
        "CLOSING"   : 2,
        "CLOSED"    : 3
    }

        // *************** FUNCTIONS / METHODS **************** //

    constructor(sockUrl) {
        clog("I am a Socketty constructor");
        if (sockUrl) {
            return this.connect(sockUrl);
        }
    }

    get ping() { return this.pingActive ; }
    set ping(v) { this.pingActive = v; this.ping_set(v); }

/*
    0	CONNECTING	Socket has been created. The connection is not yet open.
    1	OPEN	The connection is open and ready to communicate.
    2	CLOSING	The connection is in the process of closing.
    3	CLOSED	The connection is closed or couldn't be opened.
*/

    connect(sockUrl) {
        sockUrl = sockUrl ? sockUrl : this.socketUrl;

        this.retryConnecting = this.retryConnectingAuto;

        try {/* You can add extra conditions if you want.
            let doConnect = false;
            switch (true) {
                case this.ws === null:
                case this.ws.url !== sockUrl:
                case this.ws.readyState === 2:
                case this.ws.readyState === 3:
                    doConnect = true;
                    break;
            }

            if (!doConnect) {
                clog("NO!  Reconnect attemp will not be made");
                return;
            }*/
                // in case you did want a new socket
            if (this.ws)
                this.ws.close();
            this.ws = new WebSocket(sockUrl);
        } catch(e) {
            clog("Socketty Connect Error:", e);
            return false;
        }

        clog("Socketty connect() ws:", this.ws);
            // can add before connected?
        this.add_events();
        this.add_event_backups();

        this.ping_set(true);

        return this.ws;
    }

        // keep trying until max events
        // CRITICAL no state 0 (connecting) check means we might try to connect again
        // and create a new socket if that's allowed = cycle of horror

    reconnect() {
        if (!this.retryConnecting || (this.ws && (this.ws.readyState === 1 || this.ws.readyState === 0) ) ) {
            return;
        }

        if (this.retryCurrentAttempts >= this.retryMaxAttempts) {
            // could emit here
            clog(`Socketty max reconnect attempts [${this.retryCurrentAttempts}] reached.`);
            return;
        }

        this.retryCurrentAttempts++;

        clog(`Socketty *Reconnect attempt ${this.retryCurrentAttempts} with delay of `, this.retryCurrentDelay);

        setTimeout(this.connect.bind(this), this.retryCurrentDelay);

        this.retryCurrentDelay *= this.retryDecay;
        if (this.retryCurrentDelay > this.retryMaxIntervalTime * 1000) {
            this.retryCurrentDelay = this.retryMaxIntervalTime * 1000;
        }
    }


        // true or false
    ping_set(on = true) {
        if (on == false) {
            if (this.pingSetIntervalRef) {
                clearInterval(this.pingSetIntervalRef);
                this.pingSetIntervalRef = null;
            }

            this.ping = false;
            return;
        }

        if (!this.pingSetIntervalRef) {
            this.pingSetIntervalRef = setInterval( this.ping.bind(this), this.pingInterval * 1000 );
        }

        this.ping = true;
    }

        // adds native events.  4 available are open, close, ready, message

    add_events() {
        this.ws.addEventListener("open", e => {
            this.retryCurrentDelay = this.retryInitialDelay;
            this.retryCurrentAttempts = 0;

            this.connected = true;
            this.retryConnecting = this.retryConnectingAuto;    // WARNING: this might not always be wanted

            clog("Socketty Websocket opened", e);
            //out("Websocket opened, state: ", states[ws.readyState]);
            //this.ws.send("Hello.");
        });

        this.ws.addEventListener("error", e => {
            // out("Socketty error.  See clog
            clog("Socketty Error", e);
                //
            if (this.ws.readyState !== this.states.OPEN)   // OPEN
                this.connected = false; // conditional
        });

            // this keeps going as a failed socket will just pump a close event

        this.ws.addEventListener('close', e => {
            //out("Socketty Closed after seconds: ", performance.now() / 1000);
            clog("Socketty Closed after seconds: ", performance.now() / 1000);

            this.connected = false;

            if (this.retryConnecting)
               this.reconnect();
        });

            // do I need this?
        /*
        this.ws.addEventListener("message", e => {
                clog("Socketty got msg at ", performance.now(), e);
        });//*/
    }   // end add_events

        // reattach events added with addEventListener

    add_event_backups() {
        for (const [event, listener] of this.eventListenerBackup) {
            this.ws.addEventListener(event, listener);
        }
    }

        // add the event and back them up in case of a reconnect
        // events will be added back on connect

    addEventListener(event, handler) {
        if (this.ws) {
            this.ws.addEventListener(event, handler);
        }
        this.eventListenerBackup.push([event, handler]);
    }

    send(d) {
        //if (!this.connected) return false;
        //if (this.ws.readyState !== this.states.OPEN) return false;
        this.ws.send(d);
    }

    ping() {
        if (this.connected) {
            this.ws.send('ping');
        }
    }

    close() {
        this.retryConnecting = false;
        this.ws.close();
    }
        // getter to make this almost invisible
    get readyState() {
        return this.ws.readyState;
    }
}   // class end