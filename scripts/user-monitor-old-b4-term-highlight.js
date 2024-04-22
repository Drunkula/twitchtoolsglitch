"use strict"    // NOT A MODULE      NOT A MODULE       NOT A MODULE

var UserMon = UserMon || {};
//var UserMonVars = {};

/*
    To get new join events then all tmi connected channels will have to be parted
    when a change to users is made.

    Soft wildcards.
    Match an optional space.
    Match a max of X characters

    !"£$%^&*()[]-=_+;':@,.<>
    !^+

    a filter
    qsa('#messagelog > div > div > div:nth-child(2)').forEach(x => {if (!x.innerText.includes("NAME OF CHANNEL")) x.parentNode.parentNode.style.display="none"})
*/
        // window must be interacted with to work
window.addEventListener('beforeunload', x => x.preventDefault());

//window.addEventListener('beforeunload', x => x.returnValue = "Are you sure about this?");

(function(ns) {
    //* The user list still gets two changes
    const USERMON_EVENTS = [
		{selector: '#users', event: 'change', function: users_tracked_changed, params: {noAutoChange: true}},
		{selector: '#buzzwords', event: 'change', function: search_terms_changed, params: {noAutoChange: false}},
		{selector: '#chfilter', event: 'keyup', function: ch_filter_changed, params: {noAutoChange: false}},
    ];//*/

    var userT, messageT;
    var searchTermRegex = null;
    var msgHits = 0;

    var chFilterText = "";  // can be used to check incoming messages
    var chFilterInput = gid("chfilter");


    window.addEventListener('load', async (event) => {
        document.title = "Twitch User Monitor";

        userT = gid("usersinchannels");
        messageT = gid("messagelog");

            // restores params and permissions
        TT.forms_init_tmi();    // BEFORE common
        TT.forms_init_common();

        // this adds the #mainform submit handler
        TT.add_events_common();

            // add AFTER common events
        TT.add_event_listeners(USERMON_EVENTS);

        TT.cclient.on("join", join_handler);
        TT.cclient.on("part", part_handler);
        TT.cclient.on("message", message_handler);
            // JOIN events can take a while to arrive
        TT.join_chans();

        if (TT.config.miniviewOnStart) {
            TT.mini_view_on(true);
        }
    });


        // user has joined a channel
    function join_handler(channel, user, self) {
        if ( TT.config.users.includes(user)  ) {
            user_channel_add(channel, user);

            console.log(`${user} JOIN ${channel}`);
        }
    }
        // user has departed a channel
    function part_handler(channel, user, self) {
        if ( TT.config.users.includes(user)  ) {
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
        if ( TT.config.users.includes( userstate["username"] )  ) {
            console.log(`${userstate["username"]} in ${channel}: ${message}`);
//console.log(userstate);
            msg_add(channel, userstate["display-name"], message, userstate["tmi-sent-ts"]);
        } else
        if (searchTermRegex.test(message)) {
            msg_add(channel, userstate["display-name"], message, userstate["tmi-sent-ts"]);
        }
    }

        // I'm not getting new JOIN info when I leave a channel and then join again
        // I might have to reconnect the client

    async function users_tracked_changed() {
        console.log("Users changed...");

                //console.log("READYSTATE", TT.cclient.readyState());

        if (TT.cclient.readyState() !== "OPEN") {
            return;
        }
                // console.log("Disconnecting due to user change");
        await TT.cclient.disconnect();

        let res = await TT.cclient.connect().catch(
            e => console.log("CONNECT ERROR", e)
        );
                //console.log("AFTER reconnect", res);
        return;
    }

        // message log add

    function msg_add(channel, user, message, ts) {
        inc_msg_hits();

        let msgRow = dce('div');
        msgRow.classList.add('speechQRow');
        msgRow.dataset["timestamp"] = ts;
            // user
        let userDiv = dce('div');
        userDiv.classList.add('speechQUser');
        userDiv.textContent = user;

        let timeNMsgDiv = dce('div');
        timeNMsgDiv.classList.add('speechQButtons');

            // message
        let msgDiv = dce('div');
		msgDiv.textContent = message;
		msgDiv.classList.add('speechQText');
            // time
        let tDiv = dce('div');  // well done for not taking a string, Date.
		tDiv.textContent = new Date( Number(ts) ).toLocaleTimeString().substring(0, 5);
        tDiv.classList.add('speechQUser');

            // channel
        let chDiv = dce('div');
		chDiv.textContent = channel;
        chDiv.classList.add('speechQUser');

        timeNMsgDiv.append(tDiv, chDiv);
        msgRow.append(userDiv, msgDiv, timeNMsgDiv);
// filter incoming messages
        if (chFilterText && !channel.includes(chFilterText)) msgRow.style.display="none";

        messageT.prepend( msgRow );
    }

    function inc_msg_hits() {
        msgHits++;
        document.title = `Twitch User Monitor (${msgHits})`;
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

        // search terms updated

    function search_terms_changed() {
        console.log("SEARCH TERMS NOW", TT.config.buzzwords, TT.config.buzzwords.length);

        let terms = [];

        if (TT.config.buzzwords.length) {
            for (let term of TT.config.buzzwords) {
                // make parts of a regex, replace stars with .* and escape chars gcm
                term = term.replace(/\\/g, "\\\\"); // backslash to real backslash
                term = term.replace(/\./g, "\\.");  // dot to real dot

                term = term.replace(/\*/g, ".*");           // dot wildcard
                term = term.replace(/!/g, "\\s*");          // ! optional spaces
                term = term.replace(/\^/g, ".{0,10}");      // ^ wildcard limited to 10 chars
                term = term.replace(/[(]s[)]/g, "(|s|'s)"); // (s) optional s, 's
                // @&%
                    // non-space characters
                term = term.replace(/\?/g, "\\S*");         // optional "solid" non-space chars
                term = term.replace(/\+/g, "\\S+");         // 1 or more non optional solid chars

                terms.push(term);
            }
                // join with word boundaries
            let regexStr = "(\\b" + terms.join("\\b|\\b") + "\\b)";
            // backslashes ARE considered as word boundaries and \b\\b doesn't work
            searchTermRegex = new RegExp(regexStr, "i");
            //searchTermRegex = new RegExp("\\b\\\\\\b", "i");
            console.log("REGEX STRING", regexStr, searchTermRegex);
        } else {
            searchTermRegex = null;
        }
    }

        // filter changed

    function ch_filter_changed() {

        chFilterText = chFilterInput.value.trim();

        let rows = qsa("#messagelog div > div > div:nth-of-type(2)");
console.log("ROWS", rows);
        rows.forEach(x => {
            x.parentNode.parentNode.style.display = x.textContent.includes(chFilterText) ? "flex" : "none";
        });
    }

		// document create element
    function dce(i) {
        return document.createElement(i);
    }
})(UserMon);