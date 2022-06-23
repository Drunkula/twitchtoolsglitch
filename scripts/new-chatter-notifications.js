/**
 * Detect new chatter doesn't need an account to run, just the name of channels.
 * requires tmi.js or the minified version
 * https://github.com/tmijs/docs/tree/gh-pages/_posts/v1.4.2
 *
 * Possibly add:
 * Pause on mouseover checkbox, pause/unpause button
 * Play a sound if a new chatter after an interval (low viewship chats)
 * Split channels into panels to make it more of a mod multi channel obseve tool.
 *   panels could have reply fields under and mouse clicks on names fire responses and remove.
 *
 * NOTE channels can be submitted in the url string so twitch-new-chatter-notice.html?chans=chan1,chan2,chan3
 * autojoin=true is also an option
 *
 * I could give different channels different colours, have a colour list
 */

 TMIConfig.NCNChatterSet = new Set();	// first chats stored as channel+name
 let NCNChatterSet = TMIConfig.NCNChatterSet;

	 // window onload

window.addEventListener('load', () => {
	log('LOADED');

	TT.forms_init_common();

	let clearChatters = () => { o('', true); };
	let resetChatters = () => { NCNChatterSet.clear(); o('', true); }

	gid('clearnew').onclick = clearChatters;
	gid('resetnew').onclick = resetChatters;

	TT.button_add_confirmed_func('.clearChatConf', clearChatters);
	TT.button_add_confirmed_func('.resetChatConf', resetChatters);

		// url params to array
	if (TMIConfig.autojoin === true) {
		document.getElementById('join').click();			//TT.join_chans();
	}
});


	 // message handler - does the new chatter logging

cclient.on('message', (channel, userstate, message, self) => {
		// Don't listen to my own messages..
	if (self) return;

	let user = `${channel} ${userstate.username}`;
		// Handle different message types..
	switch(userstate["message-type"]) {
		case "action":
		case "chat":
			if (NCNChatterSet.has(user)) {   // they already in the array?
				return;
			}
			NCNChatterSet.add(user);
			o(`<y>${channel}</y> ${userstate['display-name']}`);
			// console.log(userstate);
			break;
	}
});


