'use strict'
console.debug('common tmi start.');
/* https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Events.md
https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Commands.md
https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Functions.md
*/
	// ******************** TMI Boilerplate ****************** //

let TMI_DEFAULT_CHANNELS = [];//"def", "channels", 'DEFAULTS'];		// could put this in a different file for easy user use
let TMI_DEFAULT_ALLOW_NAMED = [];//"default", "allow", "named", 'DEFAULTS'];
let TMI_IGNORE_DEFAULT = ["nightbot", "streamelements", "moobot"]; // LOWERCASE

var TMIConfig = {
	autojoin: null,
	joinDebounceSecs: 3,
	restoredParams: [],

	ignoredUsers: '',

	perms : {	// permissions to run commands
        allowEveryone : false,
        allowMods : true,
        allowVips : true,
        allowNamed : TMI_DEFAULT_ALLOW_NAMED
    }
}
	// TMI options
const clientOpts = 	{
    connection: {
        secure: true,
        reconnect: true
    },
    identity: { // your id here if you want your bot to speak and not just observe
		//username: 'YourBotOrIdHere',
        //password: 'oauth:lah23h23hagb6glvv015d'
    },
    channels: []	// don't add defaults
};

const cclient = new tmi.Client(clientOpts);
const tmiConnected = cclient.connect();	// don't join here if you prefill channels in clientOpts
	// returns promise. cclient.ws.readyState = 1 when connected, ws = null before connection


	/**
	 * Repopulates form fields from url
	 * formats channels field
	 */

function tt_forms_init_common() {
	TMIConfig.restoredParams = get_restore_params();
		// form values will overwrite defaults
	restore_form_values('.form-save');
	mainform_add_submit_handler();
	add_bookmark_button_handler()

	tt_forms_init_common_permissions();

	let ll = gid('loglabel');
	if (ll) {
		ll.onclick = () => { log('', true); }
	}
		// if no channels were in the request then use the defaults
	let channo = gid('channels');
	if (channo) {
		if (TMIConfig.restoredParams['channels'] === undefined) {
			channo.value = TMI_DEFAULT_CHANNELS.join(' ');
		}
	}

	tt_init_ignored_users();

		// autojoin check
	if (TMIConfig.restoredParams['autojoin'] === "true") {
		TMIConfig.autojoin = true;
	}
}

	// call AFTER restore params

function tt_init_ignored_users() {
    let igUsrs = gid('ignoredusers');

	if (!igUsrs) return;

    if (TMIConfig.restoredParams['ignoredusers'] === undefined) {
        igUsrs.value =  TMI_IGNORE_DEFAULT.join(' ');
    }
		// ignored user checks are made against TMI with username which is lower case - hence onchange
    igUsrs.onchange = () => {
        let iu = igUsrs.value; // int
        iu = iu.match(/\w+/g);  // strip out the words

        iu = iu ? iu.map(a => a.toLowerCase()) : [];

		TMIConfig.ignoredUsers = iu;

        console.log('SETTING Ignored users config TO ', iu);
    }

    //igUsrs.onchange();
}

	// if permissions are used you'll have allownamed, everyone, mods, vips

function tt_forms_init_common_permissions() {
	tt_init_permission_checkboxes();
	tt_init_allow_named_input();
}

	// sets onchange event for the allowname field
function tt_init_allow_named_input() {
	    // add default values and onchange handler
	let aNamed = gid('allownamed');

	if (aNamed) {
		aNamed.onchange = tt_allow_named_onchange;
			// form restore is called before this
		if (TMIConfig.restoredParams['allownamed'] === undefined)
			aNamed.value = TMI_DEFAULT_ALLOW_NAMED.join(' ');

		tt_allow_named_onchange();
	}
}

    // allow named input field changes and updates permissions

function tt_allow_named_onchange(e) {
	var named = gid('allownamed').value.match(/\w+/g);
	TMIConfig.perms.allowNamed = named ? named.map( a => a.toLowerCase() ) : [];
}

	// set events for permission checkboxes everyone, mods, vips (class)
function tt_init_permission_checkboxes() {
	let boxes = qsa(".permissions input[type=checkbox]");

	for(let cb of boxes) {        //log('checkbox = '+cb.id+' is '+(cb.checked? 'SET':'UNSET'))
		cb.onchange = () => {   // this auto naming thing is pretty stupid
			let varName = 'allow' + cb.id[0].toUpperCase() + cb.id.substring(1);
			TMIConfig.perms[varName] = cb.checked;
		}
		cb.onchange();  // inits the values
	}
}


    // user allowed to do the command?

function tt_user_permitted(user) {
	let allowed = false;

	switch (true) {
		case TMIConfig.perms.allowEveryone:
		case TMIConfig.perms.allowMods && user.mod:
		case TMIConfig.perms.allowVips && user.badges && user.badges.vip === "1":
		case TMIConfig.perms.allowNamed.includes(user.username):
		case user.badges && user.badges.broadcaster === "1":
			allowed = true;
			break;

		default:
			allowed = false;
			break;
	}

	return allowed;
}

	// common form submit handler for joining channels

function mainform_add_submit_handler() {
	const joinBtn = gid('join');

	let mf = gid('mainform');

	if (!mf) return;

	mf.onsubmit = (e) => {
		if (joinBtn.disabled)   // debouncing
			return;

		joinBtn.disabled = true;
		setTimeout(()=>joinBtn.disabled = false, TMIConfig.joinDebounceSecs * 1000);

		join_chans();

		document.getElementById('logbox')?.classList.remove('is-hidden');

		return false;
	}
}


	 // joins channels in the text input, leaves those not in there if connected

async function join_chans() {
	await tmiConnected;

		// grab the channels from the text input
	let channels = gid('channels').value.match(/\w+/g);
	channels = channels ? channels.map(x => x = '#'+x.toLowerCase()) : [];

	// leave channels and join channels
	let currChans = cclient.getChannels();
	console.debug(`cclient chans before join/part`, currChans);

		// join / part channels
	for (let ch of currChans) { // part chans not in the new list
		if (!channels.includes(ch))
		cclient.part(ch).catch(e => console.debug(e));
	}
	for (let ch of channels) {  // join chans not in the current list
		if (!currChans.includes(ch))
			cclient.join(ch).catch(e => console.debug(e));
	}
}


	// join (and roomstate) can be used to check if we've joined a channel
cclient.on('join', function (channel, username) {
	if (username == cclient.getUsername()) {
		console.debug(c('Joined'),`${channel} as ${username} : cclient.channels now : `, cclient.getChannels());
		log('<b style="color: cyan">Joined:</b> ' + channel);
	}
})

	// sent when any user leaves a channel, self means it's us
cclient.on('part', (channel, username, self) => {
	if (self) {
		console.debug('Parted', channel, username);
		log('<b style="color: magenta">Left channel:</b> ' + channel);
	}
})

	// let's see if I can catch the _promiseJoin fail event tmi.js linke 2523
cclient.on('_promiseJoin', function(error, channel) {
	if (error) {
		console.debug(y('NOTICE :'),'join error for', channel, error);
		log(`<b style="color:yellow">NOTICE</b> Could not join channel: ${channel}`);
	}
});

cclient.on("disconnected", (reason) => {
	log('Disconnected : ' + reason)
	console.debug("Disconnected:", reason);
});

	// ********** LEAVING THESE FOR DEBUGGING ************* //

// connected
cclient.on('connected', (addr, port) => {
	console.debug(`TMI on.connected on address : ${addr} : ${port}`);
	log(`Connected to `+port+' '+addr);

	for (const channel of cclient.getChannels()) {
		log('Channel : ' + channel);            // or roomstate events are good checks of channels joined
		console.debug('Channel: ', channel);
	}	//console.debug("cclient:", cclient);
	console.debug('connected as:', cclient.getUsername())
});

cclient.on("connefting", (address, port) => {
	log(`Connecting to addr: ${address}:${port}`)
});

// cclient.on("logon", function() {
// 	//log('Logon happened...');
// 	//console.debug('Logon args:', arguments);
// });

    // roomstate actually triggers a join emit before the roomstate emit
cclient.on('roomstate', (chan, state) => {
	console.debug("Roomstate:", chan, state);
})


/**
 * Simple outputs to named divs
 */

 /**
  * Output to that div top first
  * @param {string} str
  * @param {bool} clearIt
  * @returns
  */

function o(str, clearIt, after="<br/>", divId = 'mainoutput') {
	if (clearIt)
		document.getElementById(divId).innerHTML = '';

	if (!str) return;

	var ndiv = `<div onclick="this.remove()">${str + after}</div>`;
		// https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML
	document.getElementById(divId).insertAdjacentHTML('afterbegin', ndiv);
}

/**
  * Output to that div top first
  * @param {string} str
  * @param {bool} clearIt
  * @returns
  */

 function log(str, clearIt, after="<br/>") {
	if (clearIt)
		return document.getElementById('log').innerHTML = str + after;

	// https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML
	document.getElementById('log').insertAdjacentHTML('afterbegin', str + after);
}

    // Populate the url link box

function add_bookmark_button_handler() {
	let btn = qsa('.urlpopulate');
	let urlBox = gid('linkurl')

	let channels = gid('channels');
	let allownamed = gid('allownamed');

	const popUrlFunc =() => {
		let urlParams = inputs_to_uri_string('.form-save', true);

		urlParams = 'autojoin=true&' + urlParams;

		page_params_set(urlParams);

		let url = window.location.origin + window.location.pathname + '?' + urlParams;

		linkurl.value = url;
		history.replaceState({}, null, url);
	}

	btn.forEach( (b) => {
		b.onclick = popUrlFunc;
	});
}


function page_params_set(data) {
	local_store_set('urlParams', data);
}

function page_params_get() {
	return local_store_get('urlParams');
}

function local_store_set(name, data) {
    let namePath = name + window.location.pathname;
    localStorage.setItem(namePath, JSON.stringify(data));
}

    // url location of current page

function local_store_get (name) {
    let namePath = name + window.location.pathname;
    return JSON.parse( localStorage.getItem(namePath) );
}


	// returns object of vars in ?url params or localStorage

function get_restore_params() {
	let getU = get_query_string_params();

	if (Object.keys(getU).length) {
		console.info('get_restore_params using '+ g('get'));
		return getU;
	}
		// local storage?
	let lParams = param_string_to_array( page_params_get() )

	if (Object.keys(lParams).length) {
		console.info('get_restore_params using ' + g('localStorage'));
		return lParams;
	}

	return false;
}

	// returns array of url?foo=bar parameters will be needed for minified versions

function get_query_string_params() {
	let getVars = {};
	decodeURI(window.location.href).replace(/[?&]+([^=&]+)=([^&]*)/gi,
		function(a,name,value){getVars[name]=value;});
	return getVars;
}

console.debug('common tmi end.');