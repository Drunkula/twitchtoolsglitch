"use strict"
/*	When obs isn't running
obs-websocket.v4.min.js:8 WebSocket connection to 'ws://localhost:4444/' failed:
scene-switcher-obs.js:55 OBS Websocket : Failed to connect:
scene-switcher-obs.js:56 {status: 'error', description: 'Connection error.', code: 'CONNECTION_ERROR', error: 'Connection error.'}code: "CONNECTION_ERROR"description: "Connection error."error: "Connection error."status: "error"[[Prototype]]: Object
obs_connect_fail @ scene-switcher-obs.js:56
scene-switcher-obs.js:80 OBS Websocket : EVENT: connection closed

Above also when wrong address.

bad password issues auth failed event and

{error: 'Authentication Failed.', message-id: '4', status: 'error', messageId: '4'}
error: "Authentication Failed."
message-id: "4"
messageId: "4"
status: "error"

When wrong address
code: "CONNECTION_ERROR"
description: "Connection error."
error: "Connection error."
status: "error"

Events and commands
https://github.com/obsproject/obs-websocket/blob/4.x-current/docs/generated/protocol.md

When I tested  GetSourcesList and GetSpecialSources
Special Sources:
desktop-1 : Desktop Audio
desktop-2 : Desktop Audio 2
mic-1 : Mic/Aux
mic-2 : Mic/Aux 2
mic-3 : WO Mic (global)

Sources Audio Filtered:
Mic/Aux 2
Mic/Aux
Desktop Audio 2
Desktop Audio
Xbox (global)
WO Mic (global)

Sources Unfiltered:
Mic/Aux 2 : wasapi_input_capture
Mic/Aux : wasapi_input_capture
Desktop Audio 2 : wasapi_output_capture
Desktop Audio : wasapi_output_capture
Video Capture Device : dshow_input
Alert Tape : browser_source
HDMI Box SOMEWHERE : dshow_input
Chat of the D : browser_source
Text (GDI+) : text_gdiplus_v2
Xbox (global) : wasapi_input_capture
WO Mic (global) : wasapi_input_capture


*/
TMIConfig.SceneSwitcherVars = {
	obs: new OBSWebSocket(),
	connected: false,
	sceneCommands: [],	// updated by onchange of command list - starts 1
	audioCommands: [],

	connectPromptShown: false
}

{	// scope
	const SS = TMIConfig.SceneSwitcherVars;

		/** Gets params from form, attempts login */

	SS.obs_connect = function obs_connect() {
		const obs = SS.obs;
		const opts = SS.get_obs_login_form_data();

			// modal info text
		gid("connectresult").textContent = '...please wait';
		log("Address: " + opts.address)

		let result = obs.connect(opts)
			.then(r => {
				SS.obs_connect_success( r );
				return true; })
			.catch(e => {
				SS.obs_connect_fail(e);
				return false;
			});

		return result;
	}

	SS.obs_connect_success = async function obs_connect_success(a) {
		console.log("OBS connect success", a);

		SS.connected = true;
		gid("connectresult").textContent = 'Success';

		SS.scenes = await SS.obs_get_scenes();
		SS.populate_scene_selects(SS.scenes);

		SS.audios = await obs_get_audio_sources();
		SS.populate_audio_selects(SS.audios);

		TT.restore_form_values(".scene-select, .audio-select");
		TT.add_events_common();
	}

		/*  */

	SS.obs_connect_fail = function obs_connect_fail(e) {
		SS.connected = false;

		let message = 'Failed to connect'

		if (e.error === 'Authentication Failed.')
			message += ' - password is incorrect.'
		else if (e.error === 'Connection error.')
			message += ' - Possibly: <span  class="content"><ul><li>bad address</li><li>OBS not running</li><li>OBS Websocket not installed.</li></ul></span>'

		gid("connectresult").innerHTML = message;

		console.log( y('FAIL OBS Websocket connct: ') + r(message) );
		console.error( e );

		log("OBS Websocket failed to connect:");

		for( let p in e)
			log( '<span class="ml-4">' + p + " : " + e[p] + '</span>' );

		SS.show_obs_setup_modal()
	}

		// GetSceneList request

	SS.obs_get_scenes = async function obs_get_scenes() {
		let scenes = await SS.obs.send('GetSceneList');
		let sceneA = scenes.scenes.map(a => a.name);
										log("<b>Scenes:</b> " + sceneA.join(', ')); console.log("Scenes", scenes);
		return sceneA;
	}

		// GetMediaSourcesList GetAudioActive(source) ListOutputs?
		// GetSourcesList <- good have found browser_source dshow_input
		// returns array of source names

	async function obs_get_audio_sources() {	// {name: 'WO Mic (global)', type: 'input', typeId: 'wasapi_input_capture'}
		let req = "GetSourcesList";
		let sources = await SS.obs.send(req);

		let unfiltered = sources.sources.map(a => a.name + ' : ' + a.typeId);
		log('<b>Sources Unfiltered:</b><br>' + unfiltered.join('<br>'))

		let sourcesA = sources.sources.filter(s => s.typeId === 'wasapi_input_capture' || s.typeId === 'wasapi_output_capture').map(a => a.name);
				log("<b>Sources Audio Filtered:</b><br> " + sourcesA.join('<br>'));
				console.log("audio", sources);

		return sourcesA;
	}

		// GetSpecialSources sounds interesting
		// https://github.com/obsproject/obs-websocket/blob/4.x-current/docs/generated/protocol.md#getspecialsources
		// returns array of source names

	async function obs_get_special_sources() {	// {name: 'WO Mic (global)', type: 'input', typeId: 'wasapi_input_capture'}
		let req = "GetSpecialSources";
		let sources = await SS.obs.send(req);
								console.log("SPECIAL SOURCES:", sources);
		let wanted = ["desktop-1", "desktop-2", "mic-1", "mic-2", "mic-3"]
		let filtered = [], info = [];
		for (let p in sources) {
			console.log(p);
			if ( wanted.includes(p) ) {
				info.push(`${p} : ${sources[p]}`)
				filtered.push(sources[p])
			}
		}

		log("<b>Special Sources:</b><br>" + info.join('<br>'));

		return filtered;
	}



		// some generic handlers

	SS.obs_add_listeners = function obs_add_listeners() {
		SS.obs.on('error', (e) => {
			o2('<b>OBS CONNECT ERROR</b>', e.toString())
			console.error("Obs Connect error:", e);
		})

		SS.obs.on('SwitchScenes', d => {
			console.log("Scene switched to ", d)
			o("Scene switched to " + d.sceneName);
		});

			// obs ws generic callback
		const callback = (data, eventType) => {	// yellow, green, plain
			console.log( y('OBS Websocket : ') + b("EVENT:"), eventType);
			console.log( c("Data:"), data);
			log( 'OBS Websocket - Event: <b>' + eventType + '</b> : Data : ' + data?.toString() );
		};

		SS.obs.on('ConnectionOpened', (data) => callback(data, 'connection opened (ConnectionOpened)'));
		SS.obs.on('ConnectionClosed', (data) => callback(data, 'connection closed (ConnectionClosed)'));
		SS.obs.on('AuthenticationSuccess', (data) => callback(data, 'authenticated (AuthenticationSuccess)'));
		SS.obs.on('AuthenticationFailure', (data) => callback(data, 'auth fail (AuthentificationFail)'));
	}



	/* function connection_established(d) {
		console.log(y('CONNECTION ESTABLISHED: '), d);
	}

	function connection_dropped() {
		console.log( m('CONNECTION DROPPED EVENT') );
	}

	function obs_auth_good_cb() {
		console.log( y('OBS auth successful EVENT: ') );
		///*obs.send('Authenticate')	.then(d => console.log(d))	.catch(e => console.log(e))
	}

	function obs_auth_bad_cb(d) {
		console.log( m('OBS auth failure : '), d );
	}

	function obs_test_connection(port, password) {
		return true;
	}
 	*/










}	// scope ENDS