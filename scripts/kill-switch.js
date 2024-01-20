/*
    Terminate an OBS stream via chat/whisper
    Option to allow termination on a raid out

    Needed: channel, allowMods, allowVips, users permitted, enabled/disabled
*/
"use strict"
// container for the vars for this

{
    TMIConfig.KS = {
        obs: new OBSWebSocket(),
        connected: false,
    };

    const KS = TMIConfig.KS;

    const KS_EVENTS = [
        // connect button
        {selector: '#obsconnect', event: 'click', function: () => KS.obs_connect(), params: {}},
    ];


    docReady( () => init_killswitch() );


    function init_killswitch() {
        console.log( g("KILLSWITCH INITIALISING") );

        TT.forms_init_common();	// common permissions, restores forms, no longer adds common events

        TT.add_event_listeners(KS_EVENTS);	// will add onchange on forms but no common events yet means URL won't be updated
		TT.add_events_common();

        KS.obs_connect();

            // start listening for messages
        ks_tmi_init();
        //KS.tmi_listener_init();

        if (TMIConfig.autojoin) {
            console.debug(r("Auto Joining channels..."));
            TT.join_chans();
        }

        if (TMIConfig.miniviewOnStart) {
            TT.mini_view_on(true);
        }
    }   // init ends


        // Sets connected/not connected and changes colour

    function set_connected_text(connected = false) {
        let statusText = "NOT CONNECTED";
        let removeClass = "is-success";
        let addClass = "is-danger";

        if (connected) {
            statusText = "Connected";
            addClass = "is-success";
            removeClass = "is-danger";
        }

        gid("connectstatus").classList.remove(removeClass);
        gid("connectstatus").classList.add(addClass);
        gid("connectstatus").textContent = statusText;
    }


    KS.obs_connect = function obs_connect() {
        const obs = KS.obs;
		const opts = KS.get_obs_login_form_data();

			// modal info text
		gid("connectresult").textContent = '...please wait';
		log("Address: " + opts.address)

		//let result = obs.connect(opts)
		let result = obs.connect('ws://' + opts.address, opts.password)	// works in 5.0.1
			.then(r => {
				KS.obs_connect_success( r );
				return true; })
			.catch(e => {
				KS.obs_connect_fail(e);
				return false;
			});

		return result;
    }

    KS.obs_connect_success = async function obs_connect_success(a) {
		console.log("OBS connect success", a);

		KS.connected = true;
		gid("connectresult").textContent = 'Success';

        set_connected_text(true);
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

        set_connected_text(false);
	}

    KS.get_obs_login_form_data = function get_obs_form_login () {
        let address = gid('obsaddress').value.toString().trim();
        let port = gid('obsport').value.toString().trim();
        let password = gid('obspassword').value.toString().trim();

        address += ':' + port;

        return {address, password}
    }

        // TMI TWITCH Message listener

    function ks_tmi_init() {

        TT.cclient.on('message', (channel, userstate, message, self) => {
            if (self || KS.killswitchEnabled === false || KS.connected === false || message[0] !== '!') return;   // Don't listen to my own messages..

                // are they permitted ?
            if (! TT.user_permitted( userstate )) { console.debug("USER NOT PERMITTED", userstate['username']);
                return false;
            }

                // Handle different message types..
            switch(userstate["message-type"]) {
                case "action": case "chat": case "whisper":

                    if (message === KS.endCommand) {
                        log("I WOULD KILL THIS DAMNED STREAM!");
                        // await SS.obs.send(req);
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