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
    socketUrl = "ws://localhost:8081/";
    connecting = false; // set to true when connect() called
    connected = false;
    _readyPromise = false;
    readyResolver = x => x; // set by new promise

    retryConnecting = true;     // open or connect sets retryConnecting to this
    _retryConnectingFlag = true;         // internal use

    retryInitialDelay = 250;   // milliseconds
    _retryCurrentDelay = this.retryInitialDelay;
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
            this.connect(sockUrl);  // don't RETURN this as you'll be returning our socket
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
        if (sockUrl) {
            this.socketUrl = sockUrl;
        } else {
            sockUrl = this.socketUrl;
        }

        this._retryConnectingFlag = this.retryConnecting;

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
            if (this.ws) {
                this.ws.close();
            }

            this.connected = false;

            this.ws = new WebSocket(sockUrl);
        } catch(e) {
            clog("Socketty Connect Error:", e);
            return false;
        }

        this._readyPromise = new Promise(x => this.readyResolver = x);

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
        if (!this._retryConnectingFlag || (this.ws && (this.ws.readyState === 1 || this.ws.readyState === 0) ) ) {
            return;
        }

        if (this.retryCurrentAttempts >= this.retryMaxAttempts) {
            // could emit here
            clog(`Socketty max reconnect attempts [${this.retryCurrentAttempts}] reached.`);
            return;
        }

        this.retryCurrentAttempts++;

        clog(`Socketty *Reconnect attempt ${this.retryCurrentAttempts} with delay of `, this._retryCurrentDelay);

        setTimeout(this.connect.bind(this), this._retryCurrentDelay);

        this._retryCurrentDelay *= this.retryDecay;
        if (this._retryCurrentDelay > this.retryMaxIntervalTime * 1000) {
            this._retryCurrentDelay = this.retryMaxIntervalTime * 1000;
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

        // can be awaited

    ready() {
        if (this.ws) {
            switch (this.ws.readyState) {
                case this.states['OPEN']:
                    return Promise.resolve(true);
                    break;
                case this.states['CONNECTING']:
                    return this._readyPromise;
                    break;

                case this.states['CLOSING']:
                case this.states['CLOSED']:
                    return Promise.resolve(false);
            }
        }
            // no connectiona attempt has been made
        return Promise.resolve(false);
    }

        // adds native events.  4 available are open, close, error, message

    add_events() {
        this.ws.addEventListener("open", e => {
            this._retryCurrentDelay = this.retryInitialDelay;
            this.retryCurrentAttempts = 0;

            this.connected = true;
            this._retryConnectingFlag = this.retryConnecting;    // WARNING: this might not always be wanted

            if (this._readyPromise) {
                this.readyResolver(true);
            }

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

            if (this._readyPromise) {
                this.readyResolver(false);
            }
        });

            // this keeps going as a failed socket will just pump a close event

        this.ws.addEventListener('close', e => {
            //out("Socketty Closed after seconds: ", performance.now() / 1000);
            clog("Socketty Closed after seconds: ", performance.now() / 1000);

            this.connected = false;

            if (this._readyPromise) {
                this.readyResolver(false);
            }

            if (this._retryConnectingFlag)
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
        // alias
    on(e, h) {
        this.addEventListener(e, h);
    }

    send(d) {
        //if (this.ws.readyState !== this.states.OPEN) return false;
        this.ws.send(d);
    }

    ping() {
        if (this.connected) {
            this.ws.send('ping');
        }
    }

    close() {
        this._retryConnectingFlag = false;
        this.ws.close();
    }
        // getter to make this almost invisible
    get readyState() {
        return this.ws.readyState;
    }
}   // class end