/*
    Terminate an OBS stream via chat/whisper
    Option to allow termination on a raid out

    Needed: channel, allowMods, allowVips, users permitted, enabled/disabled

    obs.socket is undefined when not connected, a socket when connected so check socket before readyState
*/
"use strict"

// scope container for the vars
{
    TMIConfig.KS = {
        obs: new OBSWebSocket(),
        isConnected: false,
    };

    const KS = TMIConfig.KS;

    const KS_EVENTS = [
        // connect button
        {selector: '#obsconnect', event: 'click', function: () => KS.obs_connect(), params: {}},
    ];


    docReady( () => init_killswitch() );


    async function init_killswitch() {
        console.log( g("KILLSWITCH INITIALISING") );

        TT.forms_init_common();	// common permissions, restores forms, no longer adds common events

        TT.add_event_listeners(KS_EVENTS);	// will add onchange on forms but no common events yet means URL won't be updated
		TT.add_events_common();
            // returns a promise
        KS.obs_connect();   // bool
            // will be zero, 1 if awaited but socket is undefined on failure
        console.log("OBS AFTER CONENCT", KS.obs.socket.readyState);
            // start listening for messages
        ks_tmi_listen();

        if (TMIConfig.autojoin) {
            console.debug(r("Auto Joining channels..."));
            TT.join_chans();
        }

        if (TMIConfig.miniviewOnStart) {
            TT.mini_view_on(true);
        }
            // don't make call requests as currently unidentified.  Wait until success
        KS.obs.on("ConnectionOpened", async function(e) {
            console.log("OPEN args", arguments);// nothing
        });

            // these are for actual obs events like scenes changing
        KS.obs.on("ConnectionClosed", function(e) {
            console.log("IT CLOSED:", e);
            console.log("CLOSED args", arguments);// single argument
                KS.connected = false;
                set_connected_state(false);
        });

        KS.obs.on("ConnectionError", e => {
            KS.connected = false;
            console.log("ERROR IT HAS ERROR:", e);
        });
            // single arg outputActive in object useful
        KS.obs.on("RecordStateChanged", function(e) {
            console.log("RecordStateChanged args", arguments);// single argument
            gid("isrecording").textContent = e.outputActive ? "YES" : "NO";
        });

        KS.obs.on("StreamStateChanged", function(e) {
            console.log("StreamStateChanged args", arguments);// single argument
            gid("isstreaming").textContent = e.outputActive ? "YES" : "NO";
        });

        console.log("events", KS.obs.availableEvents);
            /*
        addition websocket events
    ConnectionOpened - When connection has opened (no data)
    ConnectionClosed - When connection closed (called with OBSWebSocketError object)
    ConnectionError - When connection closed due to an error (generally above is more useful)
    Hello - When server has sent Hello message (called with Hello data)
    Identified - When client has connected and identified (called with Identified data)

        */

    }   // init ends


        // Sets connected/not connected and changes colour

    function set_connected_state(connected = false) {
        let statusText = "NOT CONNECTED";
        let removeClass = "is-success";
        let addClass = "is-danger";
        let conObs = "NO";

        if (connected) {
            statusText = "Connected";
            addClass = "is-success";
            removeClass = "is-danger";
            conObs = "YES";
        }

        gid("connectstatus").classList.remove(removeClass);
        gid("connectstatus").classList.add(addClass);
        gid("connectstatus").textContent = statusText;

        gid("obsconnected").textContent = conObs;
    }


    KS.obs_connect = function obs_connect() {
        const obs = KS.obs;
		const opts = KS.get_obs_login_form_data();

			// modal info text
		gid("connectresult").textContent = '...please wait';
		log("Address: " + opts.address)

		//let result = obs.connect(opts)
		let result = obs.connect('ws://' + opts.address, opts.password)	// works in 5.0.1
			.then(async r => {
				KS.obs_connect_success( r );
                let res = await KS.obs.call("GetRecordStatus")
                //.then(e => console.log("REC STATUS", e));
                console.log("RECSTAT", res)
				return true;
            })
			.catch(e => {
				KS.obs_connect_fail(e);
				return false;
			});

		return result;  // returns what .then or .catch return
    }

    KS.obs_connect_success = async function obs_connect_success(a) {
		console.log("OBS connect success", a);

		KS.isConnected = true;
		gid("connectresult").textContent = 'Success';
            // get record status
        let res = KS.obs.call("GetRecordStatus")
        .then(e => console.log("1. REC STATUS", e));
            // res is a pending promise
        console.log("1b. REC STATUS", res);

        let res2 = KS.obs.call("GetStreamStatus")
        .then(e => console.log("1. Stream STATUS", e));

        set_connected_state(true);
	}

		/*  */

	KS.obs_connect_fail = function obs_connect_fail(e) {
		KS.connected = false;

		let message = 'Failed to connect'

		if (e.toString() === 'Error: Authentication failed.')
			message += ' - password is incorrect.'
		else //if (e.error === 'Connection error.')
			message += ' - Possibly: <span  class="content"><ul><li>bad address</li><li>OBS not running</li><li>OBS Websocket not configured or <a href="scene-switcher.html">using an OBS version earlier than v28.</a></li></ul></span>'

		gid("connectresult").innerHTML = message;

		console.log( y('FAIL OBS Websocket connct: ') + r(message) );
		console.error( e );

		log("OBS Websocket failed to connect:");

		for( let p in e)
			log( '<span class="ml-4">' + p + " : " + e[p] + '</span>' );

        set_connected_state(false);
	}

        // gets connection details from the form

    KS.get_obs_login_form_data = function get_obs_form_login () {
        let address = gid('obsaddress').value.toString().trim();
        let port = gid('obsport').value.toString().trim();
        let password = gid('obspassword').value.toString().trim();

        address += ':' + port;

        return {address, password}
    }

        // TMI TWITCH Message listener

    function ks_tmi_listen() {

        TT.cclient.on('message', (channel, userstate, message, self) => {
            console.log("message", message);

            if (self || KS.killswitchEnabled === false) return;   // Don't listen to my own messages..

                // are they permitted ?
            if (! TT.user_permitted( userstate )) { console.debug("USER NOT PERMITTED", userstate['username']);
                return false;
            }
                // Handle different message types..
            switch(userstate["message-type"]) {
                case "action": case "chat": case "whisper":

                    if (message === KS.endCommand) {
                        log("I WOULD KILL THIS DAMNED STREAM!");
                        gid("killMsg").textContent = "KILL MESSAGE FROM : " + userstate["display-name"] + " at " + Date.now();
                        // await SS.obs.send(req);

                        if (KS.connected === false) return;

                        KS.obs.call("StopStream", {}).then(
                           e => console.log("STOP STREAM:", e)
                        ).catch(e => console.log("ERROR", e));

                        KS.obs.call("StopRecord", {}).then(
                            e => console.log("STOP RECORD:", e)
                         ).catch(e => console.log("ERROR", e));
                    }

                    break;
                default:
                    break;
            }
        });
    }

}