/**
 * https://github.com/tmijs/docs/tree/gh-pages/_posts/v1.4.2
 *
 */

let NCNChatterSet = new Set();	// first chats stored as channel+name
console.log("SUBS GIFTS CHEERS");
// easy way of finding if there are url params
console.log("window.location.search", window.location.search);

console.log("localStorage", localStorage);

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

		// url params to array
	if (TMIConfig.autojoin === true) {
		document.getElementById('join').click();
	}

	console.log(window.location);

	console.log("CALLBACKS", callbacks);

	for (f of callbacks) {
		cclient.on(f.name, f);
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
			//NCNChatterSet.add(user);
			//o(`<y>${channel}</y> ${userstate['display-name']}`);
			// console.log(userstate);
			break;
	}
});



let callbacks = [
		// system-msg is the useful part of the methods e.g. "WardenOfTheDead48 gifted a Tier 1 sub to SoulGlitch3s!"
		// msg-param-recipient-user-name but receipient can be used

		// submysterygift gives the givers name, but it goes to random followers
		//	msg-param-mass-gift-count: "2" to this many this time
		//	msg-param-sender-count: "22" total given for this channel


        // ***** SUB / CHEERS ***** //
		// userstate has bits, display-name, username, color
	cheer               = function (channel, userstate, msg)
		{console.log('** CHEER ** : channel, userstate, msg', channel, userstate, msg); console.log('args:', arguments);},
        //resub         = (["resub", "subanniversary"], [[channel, username, streakMonths, msg, userstate, methods]]) {},

    resub               = function (channel, username, months, message, userstate, methods)
		{console.log('** RESUB ** (channel, username, months, message, userstate, methods', arguments)},
    //(["resub", "subanniversary"], [[channel, username, streakMonths, msg, userstate, methods]]);

    subscription        = function (channel, username, method, message, userstate)
		{console.log('** SUBSCRIPTION **', channel, username, method, message, userstate, arguments)},
                    // oh god, this went a bit mental
    subgift             = function (channel, username, streakMonths, recipient, methods, userstate)
		{ console.log('** SUB GIFT ** channel, username, streakMonths, recipient, methods, userstate', arguments); },

    anonsubgift         = function (channel, streakMonths, recipient, methods, userstate)
		{console.log('** ANON SUB GIFT **'); for(arg of arguments) {console.log(arg); }},

    submysterygift      = function (channel, username, numbOfSubs, methods, userstate)
		{console.log('** SUB MYSTERY GIFT **'); for(arg of arguments) {console.log(arg); }},

    anonsubmysterygift  = function (channel, giftSubCount, methods, userstate)
		{console.log('** SUBS ANON MYSTERY **'); for(arg of arguments) {console.log(arg); }},

    primepaidupgrade    = function (channel, username, methods, userstate)
		{console.log('** Prime Paid Upgrade **'); for(arg of arguments) {console.log(arg); }},

    giftpaidupgrade     = function (channel, username, sender, userstate)
		{console.log('** gift paid upgrade **'); for(arg of arguments) {console.log(arg); }},    // upgrading from a gift from a sender

    anongiftpaidupgrade = function (channel, username, userstate)
		{console.log('** Anon paid gift upgrade **'); for(arg of arguments) {console.log(arg); }}, // use upgraded from an anonymous gift sub
];