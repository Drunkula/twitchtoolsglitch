console.debug('common tmi start.');
/* https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Events.md
https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Commands.md
https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Functions.md
*/
	// ******************** TMI Boilerplate ****************** //

let TMI_DEFAULT_CHANNELS = [];		// could put this in a different file for easy user use
let TMI_DEFAULT_ALLOW_NAMED = [];
let TMI_IGNORE_DEFAULT = ["nightbot", "streamelements", "moobot"]; // LOWERCASE

var TMIConfig = {
	chansCleaned: [],
	autojoin: null,
	joinDebounceSecs: 3,
	$_GET: [],

	perms : {	// permissions to run commands
        allowEveryone : false,
        allowMods : true,
        allowVips : true,
        allowNamed : TMI_DEFAULT_ALLOW_NAMED
    }
}

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
        //document.getElementById('ncl').onclick = () => { o('', true); }
    document.getElementById('loglabel').onclick = () => { log('', true); }
		// PROBLEM really they aren't new chatters for all situations
		//gid('resetnew').onclick = () => { chatters.clear(); o('', true); }

	let $_GET = get_url_params();
	TMIConfig.$_GET = $_GET;
        // form values will overwrite defaults
	restore_form_values('.form-save');

		// if no channels were in the request then use the defaults
	let channo = gid('channels');
	if (channo) {
		if (TMIConfig.$_GET['channels'] === undefined) {
			channo.value = TMI_DEFAULT_CHANNELS.join(' ');
		}
	}

		// autojoin check
	if ($_GET['autojoin'] === "true") {
		TMIConfig.autojoin = true;
	}
}

	// if permissions are used you'll have allownamed, everyone, mods, vips

function tt_forms_init_common_permissions() {
		    // add default values and onchange handler
		let aNamed = gid('allownamed');

		if (aNamed) {
			aNamed.onchange = allow_named_onchange;
				// form restore is called before this
			if (TMIConfig.$_GET['allownamed'] === undefined)
				aNamed.value = TMI_DEFAULT_ALLOW_NAMED.join(' ');

			allow_named_onchange();
		}

	        // set events for permission checkboxes everyone, mods, vips
		let boxes = qsa(".permissions input[type=checkbox]");

		for(let cb of boxes) {        //log('checkbox = '+cb.id+' is '+(cb.checked? 'SET':'UNSET'))
			cb.onchange = () => {   // this auto naming thing is pretty stupid
				let varName = 'allow' + cb.id[0].toUpperCase() + cb.id.substring(1);
				TMIConfig.perms[varName] = cb.checked;
			}
			cb.onchange();  // inits the values
		}

}


	// common form submit handler for joining channels

function mainform_add_submit_handler() {
	const joinBtn = gid('join');

	gid('mainform').onsubmit = (e) => {
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

    // allow named input field changes and updates permissions

function allow_named_onchange() {
	var named = gid('allownamed').value.match(/\w+/g);
	TMIConfig.perms.allowNamed = named ? named.map( a => a.toLowerCase() ) : [];
}

    // Populate the url link box

function add_bookmark_button_handler() {
	let btn = qsa('.urlpopulate');
	let urlBox = gid('linkurl')

	let channels = gid('channels');
	let allownamed = gid('allownamed');

	const popUrlFunc =() => {
		let url = inputs_to_uri_string(".form-save", true);

		url = 'autojoin=true&' + url;
		url = window.location.origin + window.location.pathname + '?' + url;

		linkurl.value = url;
		history.replaceState({}, null, url);
	}

	btn.forEach( (b) => {
		b.onclick = popUrlFunc;
	});
}

console.debug('common tmi end.');