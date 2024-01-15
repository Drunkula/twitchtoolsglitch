"use strict"

var UserMon = UserMon || {};
var UserMonVars = {};

/*
    To get new join events then all tmi connected channels will have to be parted
    when a change to users is made
*/

(function(ns) {
    //* The user list still gets two changes
    const USERMON_EVENTS = [
		{selector: '#users', event: 'change', function: users_tracked_changed, params: {noAutoChange: true}},
    ];//*/

    var userT, messageT;

    window.addEventListener('load', async (event) => {
        document.title = "Twitch User Monitor";

        userT = gid("usersinchannels");
        messageT = gid("messagelog");

            // restores params and permissions
        TT.forms_init_common();

        TT.add_event_listeners(USERMON_EVENTS);

            // this adds the #mainform submit handler
        TT.add_events_common();

        TT.cclient.on("join", join_handler);
        TT.cclient.on("part", part_handler);
        TT.cclient.on("message", message_handler);
            // JOIN events can take a while to arrive
        TT.join_chans();
    });



    function join_handler(channel, user, self) {
        if ( TMIConfig.users.includes(user)  ) {
            user_channel_add(channel, user);

            console.log(`${user} JOIN ${channel}`);
        }
    }

    function part_handler(channel, user, self) {
        if ( TMIConfig.users.includes(user)  ) {
            let cuRowId = user_channel_div_id(channel, user);
            let cuRowDiv = gid(cuRowId);
                // don't add if it's already
            if (cuRowDiv) {
                cuRowDiv.remove();
            };

            console.log(`${user} LEFT ${channel}`);
        }
    }

    function message_handler(channel, userstate, message, self) {
        if ( TMIConfig.users.includes( userstate["username"] )  ) {
            console.log(`${userstate["username"]} in ${channel}: ${message}`);
//console.log(userstate);
            msg_add(channel, userstate["display-name"], message, userstate["tmi-sent-ts"]);
        }
    }

        // I'm not getting new JOIN info when I leave a channel and then join again
        // I might have to reconnect the client

    async function users_tracked_changed() {
        console.log("Users changed...");

console.log("READYSTATE", TT.cclient.readyState());

        if (TT.cclient.readyState() !== "OPEN") {
            return;
        }
console.log("Disconnecting due to user change");
        await TT.cclient.disconnect();

        let res = await TT.cclient.connect().catch(
            e => console.log("CONNECT ERROR", e)
        );
console.log("AFTER reconnect", res);
        return;
    }

        // message log add

    function msg_add(channel, user, message, ts) {
        user_channel_add(channel, user);

        let msgRow = dce('div');
        msgRow.dataset["timestamp"] = ts;
        // .classList.add('speechQRow');
        let userDiv = dce('div');
        userDiv.classList.add('speechQUser');
        userDiv.textContent = user;

        let msgDiv = dce('div');
		msgDiv.textContent = message;
		msgDiv.classList.add('speechQText');

        let chDiv = dce('div');
		chDiv.textContent = channel;
        chDiv.classList.add('speechQUser');

        let tDiv = dce('div');  // well done for not taking a string, Date.
		tDiv.textContent = new Date( Number(ts) ).toLocaleTimeString().substring(0, 5);

        msgRow.append(userDiv, msgDiv, tDiv, chDiv);
        messageT.prepend( msgRow );
    }

            // message log add

    function user_channel_add(channel, user) {

        let cuRowId = user_channel_div_id(channel, user);
        let cuRowDiv = gid(cuRowId);
            // don't add if it's already
        if (cuRowDiv) return;

        let cuRow = dce('div');
        cuRow.id = cuRowId;
        // .classList.add('speechQRow');
        let userDiv = dce('div');
        userDiv.classList.add('speechQUser');
        userDiv.textContent = user;

        let chDiv = dce('div');
        chDiv.textContent = channel;
        chDiv.classList.add('speechQUser');

        cuRow.append(userDiv, chDiv);
        userT.append( cuRow );
    }

        // creates an id to create a table row

    function user_channel_div_id(channel, user) {
        return (user + channel).toLowerCase();
    }

		// document create element
    function dce(i) {
        return document.createElement(i);
    }
})(UserMon);