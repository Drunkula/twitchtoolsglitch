"use strict"
/*	MAIN Body for control - separated from more OBS based functions

	v4.0.2 obs websocket js https://raw.githubusercontent.com/obs-websocket-community-projects/obs-websocket-js/gh-pages/dist/obs-websocket.js
	https://github.com/obs-websocket-community-projects/obs-websocket-js/tree/v4
	https://github.com/obsproject/obs-websocket/releases

	https://pub.dev/documentation/obs_websocket/latest/

	npm view obs-websocket-js versions => npm i obs-websocket-js@4.0.3

	PROBLEMS
		Wanting to fill in partial form data before the OBS selects are populated so that there's some visual feedback.
		Could have the selects set another value form saved like a hidden or text field and link them.
		No - just don't add common events so that the URL is NOT repopulated.

		init common adds onchange to all .form-save which populates the url

		On OBS connection fail the selects will be empty and populate the URL with empty

		init_common: perms, form restore, events

	Chat from speech doesn't init until AFTER the speech options are available
	This needs to grab the obs credentials so has to either passively or actively restore
	So I need to change form restore - separate out the function that lets you fetch where
	the restore comes from
	Normally TMIConfig.restoredParams = TT.get_restore_params();
	Yes, that shall be our salvation

*/
{	// Scope starts
	// proxy for typing
const SS = TMIConfig.SceneSwitcherVars;

docReady( () => init_scene_switcher() )


const SS_EVENTS = [
	{selector: '.scene-test', event: 'click', function: scene_test_button_handler, params: {}},	// test button
	{selector: '.audio-test', event: 'click', function: audio_test_button_handler, params: {}},	// test button
	{selector: '#obsconnect', event: 'click', function: SS.obs_connect, params: {}},	// test button
	{selector: '.scenecmd-input', event: 'change', function: scene_command_onchange, params: {}},	// scene command to !dfioowe and store in SS vars
	{selector: '.audiocmd-input', event: 'change', function: audio_command_onchange, params: {}}	// as above for audio
];


	/**
	 *	Oh, these are the little functions we like
	 */

async function init_scene_switcher() {
	TT.forms_init_common();	// common permissions, restores forms, no longer adds common events
	TT.add_event_listeners(SS_EVENTS);	// will add onchange on forms but no common events yet means URL won't be updated
				 //TT.add_events_common(); // DON'T add here as it'll clear scenes in the url.  Added in obs_connect_success
	SS.obs_add_listeners();
	SS.obs_connect();

	SS.tmi_listener_init();

	if (TMIConfig.autojoin) {
		console.debug(r("Auto Joining channels..."));
		TT.join_chans();
	}
}



SS.get_obs_login_form_data = function get_obs_form_login () {
	let address = gid('obsaddress').value.toString().trim();
	let port = gid('obsport').value.toString().trim();
	let password = gid('obspassword').value.toString().trim();

	address += ':' + port;

	return {address, password}
}

	// fill them scene dropdowns

SS.populate_scene_selects = function populate_scene_selects (scenes) {
	let selects = qsa('.scene-select');
						console.log("Number of selects:", selects.length);
	let frag = document.createDocumentFragment();
		// fragments EMPTY on append/replace so can't do once and I'm not grabbing the select
	selects.forEach( s => {
		for (let scene of scenes) {
			let ul = document.createElement('option');
			ul.value = ul.textContent = scene;
			frag.appendChild(ul);
		}

		s.replaceChildren(frag);
	} );
}


	// fill them scene dropdowns

SS.populate_audio_selects = function populate_audio_selects(audioSources) {
	let selects = qsa('.audio-select');
						console.log("Number of audio selects:", selects.length);
	let frag = document.createDocumentFragment();
		// fragments EMPTY on append/replace so can't do once and I'm not grabbing the select
	selects.forEach( s => {
		for (let scene of audioSources) {
			let ul = document.createElement('option');
			ul.value = ul.textContent = scene;
			frag.appendChild(ul);
		}

		s.replaceChildren(frag);
	} );
}

SS.show_obs_setup_modal = function() {
	TT.show_modal('configModal');
	let click = new Event('click');
	gid('obssettings').dispatchEvent(click);
}


	// turns " something LIKE thIS" into "!somethinglikethis"
	// STORES into SS.sceneCommands

function reduce_command(cmd) {
	cmd = cmd.split(' ').filter(e => e).join('').toLowerCase();
	if ( cmd[0] !== '!') cmd = "!" + cmd;
	return cmd.length ===1 ? '' : cmd;
}

function scene_command_onchange(e) {
	let cmd = reduce_command(e.target.value)

	let [,index] = e.target.id.split('-');
	index = parseInt(index)

	SS.sceneCommands[index] = cmd;
	e.target.value = cmd;
}

function audio_command_onchange(e) {
	let cmd = reduce_command(e.target.value)

	let [,index] = e.target.id.split('-');
	index = parseInt(index)

	SS.audioCommands[index] = cmd;
	e.target.value = cmd;
}

	// selects and obs scene based on the index of the command sets

function obs_scene_change(index) {
	if (!SS.connected) {
		console.error("OBS Scene Change Fail: Not connected");
		return false;
	}

	index = parseInt(index);
	let prop = 'sceneid-' + index.toString();
	let scene = SS.sceneSelects[prop];

	if (scene.length === 0) {
		console.error("OBS Scene Change Fail: Scene blank");
		return false;
	}

		// send a scene change request

	console.log("Change scene to : ", scene);

	SS.obs.send('SetCurrentScene', {'scene-name': scene})
		.then(a => console.log(`set scene then`, a))
		.catch(e => {
			console.error(`set scene catch`, e)
			obs_display_error(e, "Set current scene");
		});
}


function obs_display_error(e, ...more) {
	let out = [];
	for (let p in e) {
		out.push(p + ' : ' + e[p]);
	}

	log(out.join('<br>'));
}

	///////////// SCENE HELPERS /////////////////

function scene_test_button_handler(e) {
	obs_scene_change(e.target.dataset.index);
}

function scene_command_to_index (str) {
	let words = str.split(' ');
	let inCmd = words[0].toLowerCase();
	let index = SS.sceneCommands.indexOf(inCmd);
	return index === -1 ? false : index;
}

function get_scene_from_index(index) {
	let prop = 'sceneid-' + parseInt(index).toString();
	return SS.sceneSelects[prop];
}

	///////////// AUDIO HELPERS /////////////////

function audio_test_button_handler(e) {
	audio_mute_by_index(e.target.dataset.index);
}

function audio_mute_by_index(idx) {
	let source = SS.audioSelects[idx]
	let mute = SS.audioAction[idx] === 'mute' ? true : false
	obs_mute_source(source, mute);
}

function obs_mute_source(source, mute = true) {
	let opts = {source, mute};

	SS.obs.send('SetMute', opts)
		.then( r => console.log("obs mute source result:", r) )
		.catch( a => console.error(a) )
}

function audio_command_to_index(str) {
	let words = str.split(' ');
	let inCmd = words[0].toLowerCase();
	let index = SS.audioCommands.indexOf(inCmd);
	return index === -1 ? false : index;
}


	// TMI Message checker - the heart of the program

SS.tmi_listener_init = function() {

	let lastMsgId = null;   // after a reconnect TMI sometimes sents repeats

	TT.cclient.on('message', (channel, userstate, message, self) => {
		if (self || SS.commandsEnabled === false || SS.connected === false || message[0] !== '!') return;   // Don't listen to my own messages..

		if (lastMsgId === userstate['id']) {  // had a case of double messaging
			return;
		}
		lastMsgId = userstate['id'];    // unique to every message

			// are they permitted ?
		if (! TT.user_permitted( userstate )) { console.debug("USER NOT PERMITTED", userstate['username']);
			return false;
		}

			// Handle different message types..
		switch(userstate["message-type"]) {
			case "action": case "chat": case "whisper":
				let sceneIndex = scene_command_to_index(message);  // returns !command / false

				if (sceneIndex !== false) {
					obs_scene_change(sceneIndex);
				}

				let audioIndex = audio_command_to_index(message);

				if (audioIndex !== false) {
					audio_mute_by_index(audioIndex);
				}

				break;
			default:
				break;
		}
	});
}






}	// scope