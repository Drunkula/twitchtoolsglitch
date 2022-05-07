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

 let NCNChatterSet = new Set();	// first chats stored as channel+name

	 // window onload

 window.addEventListener('load', () => {
	log('LOADED');

	tt_forms_init_common();

	let clearChatters = () => { o('', true); };
	let resetChatters = () => { NCNChatterSet.clear(); o('', true); }

	gid('clearnew').onclick = clearChatters;
	gid('resetnew').onclick = resetChatters;

	button_add_confirmed_func('.clearChatConf', clearChatters);
	button_add_confirmed_func('.resetChatConf', resetChatters);

			// param can be chans or channels
        // button that creates the link to the page
	add_bookmark_button_handler();

	restore_form_values('.form-save');
		//init_new_chatter_form_submit_handler();
	mainform_add_submit_handler();

		// url params to array
	if (TMIConfig.autojoin === true) {
		document.getElementById('join').click();			//join_chans();
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


