'use strict'
console.debug('common tmi start.');
/* https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Events.md
https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Commands.md
https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Functions.md
*/
	// ******************** TMI Boilerplate ****************** //

(() => {	// SCOPE START
    // replacement for T.M.I.Config
TT.config = {	// MOST tools add their config to this to make observing easy
	...TT.config,
	TMI_DEFAULT_CHANNELS: 	[],		// could put this in a different file for easy user use
	TMI_DEFAULT_ALLOW_NAMED:[],		// these do work
	TMI_IGNORE_DEFAULT:		["nightbot", "streamelements", "moobot", "streamlabs", "fossabot", "songlistbot"], // LOWERCASE

	autojoin: null,
	joinDebounceSecs: 3,
}

TT.config.perms = {	// permissions to run commands
	allowEveryone : false,
	allowMods : true,
	allowVips : true,
	allowNamed : TT.config.TMI_DEFAULT_ALLOW_NAMED,
	ignoredUsers: TT.config.TMI_IGNORE_DEFAULT,
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

TT.cclient = cclient;

TT.config.tmiConnected = cclient.connect();	// don't join here if you prefill channels in clientOpts
	// returns promise. cclient.ws.readyState = 1 when connected, ws = null before connection




	 // joins channels in the text input, departs those not in the list if connected

TT.join_chans = async function join_chans() {
	await TT.config.tmiConnected;

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

cclient.on("connecting", (address, port) => {
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


	//// ******* FORMS AND PERMISSION ******* ////

	// if permissions are used you'll have allownamed, everyone, mods, vips

	TT.forms_init_tmi = function () {
		TT.init_channels_defaults();
		TT.allow_named_init_defaults();
		TT.ignored_users_init_defaults();
	}

		// if no channels were in the request then use the defaults

	TT.init_channels_defaults = function init_channels_defaults () {
		let channo = gid('channels');
		if (channo) {
			channo.value = TT.config.TMI_DEFAULT_CHANNELS.join(' ');
		}
	}

		// set defaults on ignoredusers if nothing in restore

	TT.ignored_users_init_defaults = function tt_ignored_users_init_defaults() {
		let igUsrs = gid('ignoredusers');
		if (!igUsrs) return;
		igUsrs.value = TT.config.TMI_IGNORE_DEFAULT.join(' ');
	}

		// sets onchange event for the allowname field
		// COULD use the mapper and grab values out of where they save to populate

	TT.allow_named_init_defaults = function allow_named_init_defaults() {
		let aNamed = gid('allownamed');
		if (!aNamed) return	//if (TT.initialUrlParamsToArray['allownamed'] === undefined)
		aNamed.value = TT.config.TMI_DEFAULT_ALLOW_NAMED.join(' ');
	}

		// turning these into event emits to update the input would be overkill

	TT.ignored_users_add = function(user) {
		user = user.toString().trim().toLowerCase();
		TT.config.perms.ignoredUsers.push(user);
		TT.config.perms.ignoredUsers = [...new Set(TT.config.perms.ignoredUsers)];
		gid('ignoredusers').value = TT.config.perms.ignoredUsers.join(' ');
		TT.url_populate();
	}

	TT.ignored_users_remove = function(user) {
		user = user.toString().trim().toLowerCase();
		let uset = new Set(TT.config.perms.ignoredUsers);
		uset.delete(user);
		TT.config.perms.ignoredUsers = [...uset];
		gid('ignoredusers').value = TT.config.perms.ignoredUsers.join(' ');
		TT.url_populate();
	}



})(); // SCOPE END