'use strict'
console.debug('common tmi start.');
/* https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Events.md
https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Commands.md
https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Functions.md
*/
	// ******************** TMI Boilerplate ****************** //

(() => {	// SCOPE START

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

TMIConfig.tmiConnected = cclient.connect();	// don't join here if you prefill channels in clientOpts
	// returns promise. cclient.ws.readyState = 1 when connected, ws = null before connection




	 // joins channels in the text input, leaves those not in there if connected

TT.join_chans = async function join_chans() {
	await TMIConfig.tmiConnected;

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




console.debug('common tmi end.');

})(); // SCOPE END