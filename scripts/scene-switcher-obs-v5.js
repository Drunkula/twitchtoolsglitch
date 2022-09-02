"use strict"
/*
V5 docs : https://github.com/obs-websocket-community-projects/obs-websocket-js
send is now call, connect doesn't take an object (annoying)

Protocols like GetSceneList
https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md

When obs isn't running
Events and commands
https://github.com/obsproject/obs-websocket/blob/4.x-current/docs/generated/protocol.md

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

		//let result = obs.connect(opts)
		let result = obs.connect('ws://' + opts.address, opts.password)	// works in 5.0.1
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

		if (e.toString() === 'Error: Authentication failed.')
			message += ' - password is incorrect.'
		else //if (e.error === 'Connection error.')
			message += ' - Possibly: <span  class="content"><ul><li>bad address</li><li>OBS not running</li><li>OBS Websocket not configured or using an OBS version earlier than v28.</li></ul></span>'

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
		let scenes = await SS.obs.call('GetSceneList');	// works
		let sceneA = scenes.scenes.map(a => a.sceneName);	// change from v4 name to sceneName
										log("<b>Scenes:</b> " + sceneA.join(', ')); console.log("Scenes", scenes);
		return sceneA;
	}

		// GetMediaSourcesList GetAudioActive(source) ListOutputs?
		// GetSourcesList <- good have found browser_source dshow_input
		// returns array of source names

	async function obs_get_audio_sources() {	// {name: 'WO Mic (global)', type: 'input', typeId: 'wasapi_input_capture'}
		//let req = "GetSourcesList";	// no longer works
		let req = "GetInputList";	// sort of - some are wasapi_input_capture
		let sources = await SS.obs.call(req);
		console.log("RAW", sources);

		//let unfiltered = sources.sources.map(a => a.name + ' : ' + a.typeId);
		let unfiltered = sources.inputs.map(a => a.inputName + ' : ' + a.inputKind);
		log('<b>Sources Unfiltered:</b><br>' + unfiltered.join('<br>'))

		let sourcesA = sources.inputs.filter(s => s.inputKind === 'wasapi_input_capture' || s.inputKind === 'wasapi_output_capture').map(a => a.inputName);
				log("<b>Sources Audio Filtered:</b><br> " + sourcesA.join('<br>'));
				console.log("audio", sources);

		return sourcesA;
	}

		// GetSpecialSources sounds interesting
		// https://github.com/obsproject/obs-websocket/blob/4.x-current/docs/generated/protocol.md#getspecialsources
		// returns array of source names

	async function obs_get_special_sources() {	// {name: 'WO Mic (global)', type: 'input', typeId: 'wasapi_input_capture'}
		let req = "GetSpecialSources";
		let sources = await SS.obs.call(req);
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


}	// scope ENDS