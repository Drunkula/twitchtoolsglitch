/** CHAT-TO-speech.js
 *
 *  THIS IS OFFICIALY A MESS as I'm not splitting into modules so it can stay serverless.
 *
 *  The EDGE stalling problem with this might need a new strategy:
 *      Start a shorter timeout that'll be cancelled on utterance start
 *      Start a longer timeout that'll be cancelled on utterence end.  This must allow speaking time so maybe 20 seconds plus.
 *
 *  The timeouts don't come in the order you might expect, a new start can fire before the end of another so adding
 *  timeouts on the start means they can be cancelled by the end event if you're not somehow doing 'tricks'
 *
 *  PAUSING FIRES END EVENTS for some browsers.
 *  BUG: End events aren't fired on utterances as sometimes they're garbage collected early.
 *  IDEA: Actually, why don't I have an oldUtterance property in the speecher then swap it out every time
 *  a new one is created.
 *
 *  Aaaaand it still doesn't seem to save the day - and EDGE is the only platform I'm having trouble with - which is what I've chosen
 *
 *  Detecting edge can be done with window.navigator.userAgentData brands possibly or Edg/ in userAgent
 *
 *
 *  **** EASYspeech.voices() CAN'T BE TRUSTED as it doesn't update itself onvoiceschanged a second time ****
 *  EASYSPEECH doesn't queue utterances unlike the real thing.  I get the feeling I could have done all
 *  this natively - it was only the getVoices thing I was worried about.
 *
 *  ACTUALLY: I could have used EasySpeech and attached my own listener to native voicesChanged
 *
 *  OH - EasySpeech's strategy is that if onvoiceschanged isn't supported to keep checking every
 *  250ms to see if SpeechSynthesis.getVoices() returns an array - look for const voicesLoaded
 *  I SO should have checked and re-rolled this - which I should do so this doesn't have to be a module
 *
 *  https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
 *  https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance
 *
 *  speechSynthesis has properties speaking pending and paused
 *  speaking and pending can be used with the queue BUT - they're slow to update on some browsers - use own
 *
 * ss.paused isn't enough with queue processing so use a property
 *
 * TO DO
 *   POSSIBLE - follower only
 *      add a delay before adding to the speech queue so they can be nixed
 *      check for mod message deletions
 *          https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Events.md#messagedeleted
 *          https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Events.md#ban
 *
 *  Speecher.ready() returns promise, true when good, false when bad
 *
 * https://gist.github.com/AlcaDesign/6213ff17d3981c861adf BTTV emote possible
 *
 * https://kunszg.com/emotes?search=amouranth
 *
 * https://api.7tv.app/v2/cosmetics/avatars
 *
 * https://kunszg.com/commands/code/emotes
 * 7TV ${api[2]}/users/${userId[0].userId}/emotes
 * https://api.7tv.app/users/125387632/emotes
 *
 * PROBLEM - with the NEW HASH on first load these aren't working, you can press refresh and they will work from
 * the same url - looks like I'm going to have to delay doing the voice onchanges until after they're populated
 *
 *
 * NOTE: Start events on an utterance are fired when they are unpaused
 */
"use strict"


TMIConfig.TTSVars = {       // more props added from forms
    flashSetTimeout: null,
    flashDuration: 3500,    // milliseconds
    flashFunc: x => x,      // does nothing for now
        // updated by the speecher callbacks and speech parameter onchanges
    voices: [],
    sayCmds: {},
    voiceHashToIndex: new Map(),
}

    // allows us to change the main function.  Yes, maybe I should have just made this a class
var UserMon = UserMon || {};

(function(ns) {
//try {   // scope starts ( in case I can demodularise this )
    const ALL_CHAT_RANDOM_VOICE = true; // disable for server

    const TTSVars = TMIConfig.TTSVars;
    const TTS_MOD_COOLDOWN = 0; // THIS might have been causing problems in Flip's
    const cooldowns = new TT.Cooldowns();
    const speech = new TT.Speecher();

    const TTS_TEST_TEXT = "Testing the voice one two three";

    const emote_filter = new Emoter()
    TT.emote_filter = emote_filter;

    const SPEECH_START_TIMEOUT_MS = 2000;     // seconds that speech has to start before it's cancelled
    const SPEECH_END_TIMEOUT_MS = 20000;     // seconds that speech has to end before it's cancelled

    TTSVars.speecher = speech;

       // edge is the one that stalls
    const isEdgeChrome = window.navigator.userAgent.toLowerCase().includes('edg/');
    const isAndroid = window.navigator.userAgent.toLowerCase().includes('android');
    const isChrome = window.navigator.userAgent.toLowerCase().includes('chrome');

    const speechQueueOldDiv = gid('speechqueueold');

    add_speecher_global_utterance_events(speech);

        // quick hashing func for voice ids in the url
    TT.quick_hash = str => str.split('').map(v=>v.charCodeAt(0)).reduce((a,v)=>a+((a<<7)+(a<<3))^v).toString(16);

  /*   speech.addEventListener('voicessschanged', e => {
        console.debug("VOICES HAVE CHANGED in Speech", e);
    }) */

    let TTS_EVENTS = [
        {selector: '#saycmds [id^="sc-"], #saycmds input[type="range"], #saycmds select', event: 'change',
            function: update_say_commands, params: {}},

            // want this it happen AFTER update_say_commands
        {selector: ".voice-select", event: 'change', function: say_command_auto_test, params: {noAutoChange: true,}},

        {selector: '#speechtestbtn', event: 'click', function: speech_test, params: {}},

        {selector: '#cancelbtn', event: 'click', function: () => speech.cancel(), params: {}},

        {selector: '#saycmds button[data-index]', event: 'click', function: test_voice_onclick, params: {}},
        {selector: 'input[type="range"]', event: 'input', function: slider_oninput, params: {}},

        {selector: '#enablespeech', event: 'change', function: speech_enabled_checkbox_onchange, params: {}},

        {selector: '#pausespeech', event: 'change', function: speech_pause_checkbox_onchange, params: {}},

        {selector: '#volumemaster', event: 'input', function: volume_master_slider_oninput, params: {}},

        {selector: '#charfilter', event: 'change', function: filter_chars_onchange, params: {}},
    ];

        // on window load

    window.addEventListener('load', async (event) => {

        TT.cclient.on('emotesets', function() {
            console.log("EMOTE SETS", arguments);
        })

            // fetch the emote names for the room

        TT.cclient.on('roomstate', async (chan, state) => {
            console.log("Getting bttv / franker for ", chan, `room id ${state['room-id']}`);
            let results = await emote_filter.fetch(state['room-id']);
            console.log("FETCH FILTER FOR ", chan, results);
        })

        init_speecher().then(() => {
                // set up the voice selects
            create_speech_selects_options();  // must be done BEFORE init common

            speech.addEventListener('voiceschanged', () => {
                let voices = speechSynthesis.getVoices();
                if (voices.length !== TTSVars.voices.length)
                {  // have to do it this way because of EDGE firing onvoiceschanged events willy nilly
                    console.debug(g("Number of voices has changed:"), voices.length);
                    TTSVars.voices = voices;

                    create_speech_selects_options();
                    TT.restore_form_values(".voice-select");
                }
            });

            // SCENE SWITCHER restores form values for selects then adds common events
                // SHOULD ADD a check to make sure the utterance starts

            TT.forms_init_common(); // restores forms and sets up common permissions doesn't triggers ONCHANGE

            if (TTSVars.voices.length) {
                TT.restore_form_values(".voice-select");
            }

            TT.add_events_common();  // Should I wait until AFTER the SPEECH are populated? triggers onchange on .form-save
            TT.add_event_listeners(TTS_EVENTS);

                // main listener
            add_chat_to_speech_tmi_listener();
            init_flasher_tech();

            if (TMIConfig.autojoin) {
                console.debug(r("Auto Joining channels..."));
                TT.join_chans();
            }

                // want to know if client is android
            log('User Agent: ' + window.navigator.userAgent);
        })  // init_speecher ends
        .catch( e => {
            log('<b>INIT ERROR:</b> ' + e.toString())
            o(e.toString(), true)
            if (TTSVars.voices.length === 0) {
                o('<h4 class="subtitle is-4">Please try a different browser</h4>')
                o('<h3 class="title is-3">Sadly No Speech available</h3>')
            }
        })

    });// on load ends


        // pulls a value out of the display queue

    function display_queue_entry_deque(e) {
        try {
            //TTSVars.speech_queue_remove_entry(e.target.queueid);
            TTSVars.speech_queue_entry_to_old_messages(e.target.queueid, false); // true includes the ID

                // remove older entries
            while ( speechQueueOldDiv.childElementCount > TTSVars.speechQueueOldLimit ) {
                speechQueueOldDiv.removeChild( speechQueueOldDiv.lastChild );
            }
        } catch (error) {
            console.error(error)
            console.error(`Error removing speech queue row # ${e.target.queueid} on utterance end event`)
        }
    }

        // add the form things

    function add_speecher_global_utterance_events(speech) {

        let pause_listener = e => {
            try {                            //TTSVars.speech_queue_remove_entry(e.target.queueid);
                    console.debug(`PAUSED: Paused: ${speech.ss.paused}, Pending: ${speech.ss.pending}, Speaking: ${speech.ss.speaking}`)
                } catch (error) {
                    console.error(error)
                }
            }

        let resume_listener = e => {
                try {
                    console.log( y("SPEECH RESUME"), `Paused: ${speech.ss.paused}, Pending: ${speech.ss.pending}, Speaking: ${speech.ss.speaking}`);
                } catch (error) {
                    console.error(error)
                }
            }

        speech.utteranceOn({ end: (e) => { console.log("END EVENT FIRED FOR", e.utterance.queueid, e.utterance.text);} })
        speech.utteranceOn({ start: (e) => { console.log("START EVENT FIRED FOR", e.utterance.queueid, e.utterance.text);} })

        speech.utteranceOn({ error: speech_error_callback });
        speech.utteranceOn({ error: display_queue_entry_deque,
                                end: display_queue_entry_deque,
                                pause: pause_listener,
                                resume: resume_listener
                            });

            // INTERFACE : show current spoken message
        speech.utteranceOn({
            start: e => { gid("speechqueuesaying").innerHTML = '<span class="tag is-info">Saying: </span> : '
            //+ (e.target.queueid ? `<span class="tag is-primary">${e.target.queueid}</span> ` : "[n/a] ")
            + e.target.text; },

            end: e => { gid("speechqueuesaying").innerText = "Idle..."; },

            error: e => { console.log(e); gid("speechqueuesaying").innerHTML = '<span class="tag is-danger">Error:</span> : ' + e.error; }
        });


        speech.addEventListener('beforespeak', () => speech.utterance.volume = TTSVars.volumemaster);
        speech.addEventListener('cancelled', data => { TTSVars.speech_queue_remove_entry(data.id, true); });
            // log rejected packs
        speech.addEventListener("rejected", e => { console.error("######## SPEECHER PACK REJECTED ############", e); document.title = "*** REJECTION CHECK LOG ***"});

        //if (isEdgeChrome) {
            add_message_timeouts();
        //}
    }   // END add global utterance events


        /**
         * Timeouts for each speech entry in case the end event fails to fire - only needed on Edge so far.
         * edge sometimes garbage collects the utterance which causes no end event
         * it's possible these might no longer be needed if the garbage collection issue is solved by oldUtterance in the speecher class
         *
         * NOTE: Checked for every message if it is chrome so the time value can be changed dynamically.
         *
         * MAYBE I should still add the start timeout, just not the end one
         */

    function add_message_timeouts () {
        //console.log( y("********* ADDING EDGE no end event workaround ***********") );
        let synthErrors = {};

        speech.addEventListener('beforespeak', (data) => {

            if (TTSVars.edgeVoiceTimeout <= 0) {
                return;
            }

            let qid = data.detail.id;
                // NOTE: this WILL kill any paused speeches if you leave it

            let voiceEndTimeoutMilliSeconds = TTSVars.edgeVoiceTimeout * 1000;

            let speech_end_timeout_callback =  () => {    //function speech_timeout(queueid) {
                console.error(`END ERROR EDGE speech_end_timeout error : cancelling queueid: ${qid} after ${voiceEndTimeoutMilliSeconds}ms with text "${data.detail.utterance.text}" voice: ${data.detail.utterance.voice.voiceURI}`);
                console.debug("END TIMEOUT Detail", data.detail);
                //console.debug("Speecher state: ",  TTSVars.speecher);
                TTSVars.speecher.cancel_id(qid);    // might automatically deque
                //display_queue_entry_deque( {target: {queueid: qid}} );// may be triggered by cancel_id triggering end
            }

            let end_timeout  = setTimeout(speech_end_timeout_callback, voiceEndTimeoutMilliSeconds);

                // start timeout also clears end

            let speech_start_timeout_callback = () => {    //function speech_timeout(queueid) {
                console.error(`START ERROR EDGE speech_start_timeout error : cancelling queueid: ${qid} after ${SPEECH_START_TIMEOUT_MS}ms with text "${data.detail.utterance.text}" voice: ${data.detail.utterance.voice.voiceURI}`);
                clearTimeout(end_timeout);
                TTSVars.speecher.cancel_id(qid);
                display_queue_entry_deque( {target: {queueid: qid}} ); // you could call the function this calls directly
            }

            let start_timeout = setTimeout(speech_start_timeout_callback, SPEECH_START_TIMEOUT_MS);

                // add start end end events to the utterance.
            data.detail.utterance.addEventListener( 'start', a => clearTimeout( start_timeout ) );
            data.detail.utterance.addEventListener( 'end', a => clearTimeout( end_timeout ) );
                // clear both timeouts if there's an error
            data.detail.utterance.addEventListener( 'error', e => {
                clearTimeout( start_timeout );
                clearTimeout( end_timeout );
                if (e.error === "synthesis-failed" && ! synthErrors[e.utterance.voice.name]) {
                    console.error(r("SYNTHESIS FAILED FOR"), e.utterance.voice.name);
                    synthErrors[e.utterance.voice.name] = true;
                    log('<strong style="color: red">WARNING:</strong> Synthesis failed for voice ' + e.utterance.voice.name)
                }
            });
        });
    }


        // async so we can await readyness

    async function init_speecher() {
        log("Initialising Speech engine");

        try {
            let ready = await speech.ready();

            if (ready) {
                log("Engine Initialised");
            }
            else {
                log("Speech Engine Fail")
                return false;
            }

            TTSVars.ss = speechSynthesis;
            TTSVars.voices = speech.getVoices();
            return ready;
        } catch (e) {
            console.log("INIT_SPEECHER ERROR:", e);
        }

    };

    // MAIN Twitch listener
    // ***** PROBLEMS WITH REPEATS / SKIP - found out that there's a global value out there that gets written to - let's fix that
    // tmi code is re-adding event listeners on disconnects (is it?)
    function add_chat_to_speech_tmi_listener()
    {       // https://dev.twitch.tv/docs/irc/tags#globaluserstate-twitch-tags
        TTSVars.lastUser = "";
        TTSVars.lastChannel = "";
        TTSVars.lastMsgTime = 0;

        TT.cclient.on('messagedeleted', message_twitch_moderation_handler);
        TT.cclient.on('ban', message_twitch_ban_handler);
        TT.cclient.on('raw_message', message_twitch_raw_clearchat_handler); // handles bans/timeouts if CLEARCHAT appears
        TT.cclient.on('notice', message_twitch_notice_handler); // currently just logs the notice

        //TT.cclient.on("join", (ch,usr,self) => console.log(`JOIN EVENT ${ch}: ${usr}`));
        TT.cclient.on("part", (ch, usr, self) => console.log(`JOIN PART EVENT ${ch}: ${usr}`));

            // we can check for automod IN the message. The flags are in userstate but they're not modding, they're
            // notices about swears, etc. like 0-4:S.5 or 3-9:P.0 where the first digits are position, and the second the reason
        TT.cclient.on('message', twitch_message_handler);
    } // add_chat_to_speech_tmi_listener

        // ****************   ., mMESSAGE HANDLER ****************

    function twitch_message_handler (channel, userstate, message, self) {
        //console.log("state", userstate);
        console.log("message", message);
            // same user and channel as last message
        const username = userstate["username"];
        const sameUser = username == TTSVars.lastUser;
        const sameChannel = channel == TTSVars.lastChannel;
/*
        if (userstate.flags)
            console.log("flags", userstate.flags, message, userstate);
*/
        if (self || TTSVars.chatEnabled === false) return;   // Don't listen to my own messages..

        if ( TTSVars.chatQueueLimit && speech.queue_length() >= TTSVars.chatQueueLimit ) {
            return false;
        }

            // are they permitted ?
        if (! TT.user_permitted( userstate )) {            // console.debug("USER NOT PERMITTED", userstate['username']);
            return false;
        }
            // return if the message type isn't readable
        switch(userstate["message-type"]) {
            case "action": case "chat": //case "whisper":
                break;
            default:
                return;
        }

            // PROCESS THE MESSAGE
                // filter out emotes
        let sayCommand = starts_with_say_command(message);  // returns !command / false
        let voiceParams = {};

        let commandSliceOffset = 0   // amount to strip from message
        let voiceIndexDefault = 1; // I START AT ONE

            // if sayCommand is false test !say or all chat on

        if (sayCommand === false) {
                // does it start with "!say"
            if ( message.startsWith("!say ") ) {
                message = message.substring(5);
            }
            else // Read all chat set?, but not if command
            if ( !TTSVars.chatReadAll ||
                (TTSVars.chatReadOtherCommands === false && '!' === message[0] ) ) {
                return;
            }
                // test for a personalised user command.  usercommands = {username: "alias", edtrots: "ed"}
            let nameIsCmd = starts_with_say_command("!" + TTSVars.usercommands[userstate['username']]);
                // !cmd or false returned
            if (nameIsCmd) {   // sayCmds are !cmd: {rate, pitch, voice} // THIS IS THE BUG THIS IS THE BUG .text get written to the global later cos reference.
                //sayCmdPack.params = TTSVars.sayCmds[nameIsCmd]; check TMIConfig.TTSVars.sayCmds
                //voiceParams = {...TTSVars.sayCmds[nameIsCmd]};    // FIXED
                voiceParams = ns.get_voice_settings_by_name(nameIsCmd); // allows "patching" the jank version back
            } else if (TTSVars.randomVoices) {
                let vIdx = Math.floor(Math.random() * TTSVars.voices.length);
                let voice = TTSVars.voices[vIdx]; // console.log("RAND VOICE", voice.name);
                voiceParams = { rate: 1.3, pitch: 1.0, voice }
            } else { // use voice 1
                voiceParams = get_voice_settings_by_index( voiceIndexDefault );
            }

            sayCommand = '!all-chat';
        } else { // DEFAULT VOICE// remove the voice command from the message
            // console.log("MESSAGE", message);
            commandSliceOffset = sayCommand.length + 1;
            message = message.slice(commandSliceOffset);
            voiceParams = ns.get_voice_settings_by_name(sayCommand);
        }

        if (TTSVars.filterCharsRegex) {
            try {
                message = message.replace(TTSVars.filterCharsRegex, ' ');
                console.log("MSG AFTER REGEX", message);
            } catch (error) {
                console.log("REGEX ERROR:", e);
            }
        }

        if ( ! TTSVars.chatReadEmotes ) {
            message = emote_filter.filter(message, userstate);
        }

        message = message.trim();

            // any message left?  I've noticed blank messages which just contain unprintable characters
        if (message.length === 0) { //console.log("message zero returning");
            return;
        }

            // category out a single user by setting similar commands to a single value e.g. !allsaycommands
        let cooldownParams = {
            channel: 'ALL-CHANS',    // cooldowns are CHANNEL based - so set to a common value if you want to put globals on for all
            command: sayCommand ? sayCommand : '!all-chat',   // set to !userCategoryFake to category out only users
            //category: "text-to-speech-"+ channel,   // example to category out channels individually
            userstate,
            globalCooldown: TTSVars.chatCooldownGlobal,
            userCooldown: TTSVars.chatCooldownUser,
            modCooldown: TTS_MOD_COOLDOWN     // tested working
        }

        let oc = cooldowns.cooldown_check(cooldownParams);

        if (oc !== false ) {    // returns an object of user and global cooldown if on a cooldown
            console.debug("ON a cooldown", oc);
            return;
        }
        cooldowns.cooldown_set(cooldownParams);

        let nid = speech.next_id();
        let msgid = userstate["id"];  // each message has one
            // visually add to the speech queue
        TTSVars.speech_queue_list_add({user: userstate["display-name"], text: message, id: nid, msgid})

            // now check if we should throw the message away
        /*
        if ( is_flags_moderated(userstate) ) { // user current fn as a shortcut
            message_twitch_moderation_handler(channel, userstate.username, message, {"target-msg-id": userstate.id});
            return;
        }*/

            // replace atted name underscores and camel casing e.g bigJohn_Jenkins = big John Jenkins
        message = atted_names_convert(message);

            // add "user says" only if enough time has passed between same user messages
            // really I'd like to check the end of the last utterance and see if they were speaking next.
        if (sameUser && sameChannel &&
            TTSVars.chatNoNameRepeatSeconds && userstate["tmi-sent-ts"] - TTSVars.lastMsgTime <= TTSVars.chatNoNameRepeatSeconds * 1000) {
                voiceParams.text = message;
            } else {
                voiceParams.text = add_speech_before_after(message, userstate, channel);
        }

            // should Last User only be updated when there's an actual speech?  It should, really

        TTSVars.lastMsgTime = userstate["tmi-sent-ts"];
        TTSVars.lastUser = username;
        TTSVars.lastChannel = channel;

            // when it was bugged this used to sometimes get a global array entry
        speech.say(voiceParams);
    }   // end twitch_message_handler

        // CLEARCHAT happens on /ban /timeout or /clear :tmi.twitch.tv CLEARCHAT #dallas for entire room :tmi.twitch.tv CLEARCHAT #dallas :aSingleUser

    function message_twitch_raw_clearchat_handler(clone, msg) {
        if ( TTSVars.chatRemoveModerated &&  msg.command === "CLEARCHAT" && msg.params.length > 1) {
            message_twitch_ban_handler(msg.params[0], msg.params[1], null, null);
        }   // 1 param = whole room, 2 = single user
    }

        // moderated messages can be discarded.  Only MANUALLY modded

    function message_twitch_moderation_handler(channel, username, deletedMessage, userstate) {
        // userstate has login for name, room-id, target-msg-id, and time
        if (!TTSVars.chatRemoveModerated) return;

        let speecherId = TTSVars.speech_queue_msgid_to_id(userstate["target-msg-id"]);
        //console.log("**** MESSAGE MODERATION", userstate, "to message id", speecherId);
        if (speecherId) {
            TTSVars.speecher.cancel_id(speecherId);
            TTSVars.speech_queue_entry_to_old_messages(speecherId, false);
            TTSVars.speech_queue_add_tag(speecherId, "moderated", "danger");
        }
    }



        // ban handler.  Bans send username in lower case and in userstate
        // room-id target-user-id tmi-sent-ts

    function message_twitch_ban_handler(channel, username, reason, userstate) {
        let entries = qsa(`[data-user="${username}" i]`); // data in ban buttons are capitalised so use insensitive search
            // stop speech entries, transfer visible queue and add "banned"
        entries.forEach(e => {
            TTSVars.speecher.cancel_id(e.dataset.id);
            TTSVars.speech_queue_entry_to_old_messages(e.dataset.id, false);
            TTSVars.speech_queue_add_tag(e.dataset.id, "banned", "danger");
        });
    }

        // is the automod in notices?  I've never even seen a notice

    function message_twitch_notice_handler(channel, msgid, message) {
        console.log("Notice received msgid, message", msgid, message);
    }

        // convert atted names and underscores so @some_nameIsCool -> some name Is Cool

    function atted_names_convert(message) {
        const atNameRegex = /@\w+/g;
        const camelCaseRegex = /([a-z]+)([A-Z])/g;  // spaces between theCamelCases

        const rMatches = message.match(atNameRegex);

        if (rMatches !== null) {
            for (let match of rMatches) {
                let subName = match.replaceAll("_", " ");

                subName = subName.replace(camelCaseRegex, "$1 $2");
                if (match !== subName) {
                    message = message.replace(match, subName);
                    //console.log("CONVERTED @: ", match, subName);
                }
            }
        }

        return message;
    }

        // adds tagged strings before and after the message and names to nicknames
        // userstate has tmi-sent-ts unix milliseconds

    function add_speech_before_after(msg, state, channel) {
        if (TTSVars.chatSayBefore || TTSVars.chatSayAfter) {
            // TODO: NICKNAME check needs to be made here
            let name = state['username'];

            // if no digits in username
            if (TTSVars.nicknames[name]) {
                name = TTSVars.nicknames[name];
            }
            else {
                if ( !TTSVars.chatReadNameDigits ) {
                    name = name.replace(/\d/g, ' ');
                }

                    // camelCase names are more likely to be read correctly
                name = state['display-name'];
                    // and even more correctly if spaced e.g. MyNameIsBob -> My Name Is Bob
                name = name.replaceAll("_", " ");
                const reggie = /([a-z]+)([A-Z])/g;
                name = name.replace(reggie, "$1 $2");
            }

            channel = channel.slice(1); // get rid of #

            let sBefore = TTSVars.chatSayBefore.replace(/{channel}/ig, channel).replace(/{user}/ig, name);
            let sAfter = TTSVars.chatSayAfter.replace(/{channel}/ig, channel).replace(/{user}/ig, name);
            msg = sBefore + ' ' + msg + ' ' + sAfter;
        }

        return msg;
    }

        // if browser requires interaction before allowing speech then flash the screen

    function speech_error_callback(e) {
        if (e.error === "not-allowed") {console.log("speech_error_callback", e);
            TTSVars.flashFunc();
        }
    }

        // Does the text match one of the defined !command text inputs
        // returns the command string, e.g. !ali or false
    function starts_with_say_command (str) {
        if (str[0] === '!') {	// get the first word with ! lowercased
            let words = str.split(' ');//.filter(e => e);
                // rest of first word to lower case
            let inCmd = words[0].toLowerCase();

            return inCmd in TTSVars.sayCmds ? inCmd : false;
        }

        return false;
    }

    function strip_command(str) {
        return str.slice( str.indexOf(' ') + 1);
    }


    /**
     *  Adds the <option>s to the selects
     *  Do BEFORE restoring the defaults
     */

    function create_speech_selects_options () {
        let voice_name_filter = (v => v.replace(/Microsoft\s*|Google\s*/, ''))

        let selects = qsa(".voice-select")

        log("Number of voices : " + TTSVars.voices.length)

        for (let s of selects) { // create <option>s
            let frag = document.createDocumentFragment();

            for (const voiceidx in TTSVars.voices) {
                let voice = TTSVars.voices[voiceidx]

                let opt = document.createElement('option');
                opt.text =  voice_name_filter( voice.name );
                opt.value = TT.quick_hash(voice.voiceURI)

                frag.appendChild(opt);
            }

            s.replaceChildren(frag);
        }
    }

        /**
         * Adds the slider updates
         */

    function slider_oninput(e) {
        let sout = e.target.dataset.for;
        if (sout = gid(sout)) {
            sout.innerText = e.target.value;
        }
    }

        // sets TTSVars.sayCmds for easy access, triggered by onchange of any command params

    function update_say_commands() {
        let cmds = qsa('[id^="sc-"]')
        let commands = {};

        cmds.forEach(s => {
            let index = parseInt(s.id.split("-")[1]);

            let cmd = s.value.trim().toLowerCase();
            cmd = cmd.split(' ').filter(e => e).join('');

            if (cmd.length === 0) return;

            if ( cmd[0] !== '!') cmd = "!" + cmd;
            s.value = cmd;

            commands[cmd] = get_voice_settings_by_index(index);
        });

        TTSVars.sayCmds = commands;
    }

        // select for voice onchange event

    function say_command_auto_test(e) {
        let vIdx = e.target.id.split("-")[1];
        //console.log(e.target.selectedIndex, e.target.selectedIndex + 1);
        //console.log(e.target.selectedIndex);
        //e.options[e.selectedIndex].text;
            // test voice uses the index + 1 of the select, not its option.
        test_voice(vIdx);
    }

        // test voice settings button

    function test_voice_onclick (e) {
        test_voice(e.target.dataset['index'])
    }

        // index is of the select's id, which is 1 based, not zero.  I should have used the selected index

    function test_voice(index) {
        let params = get_voice_settings_by_index(index);
        params.text = TTS_TEST_TEXT;
        params.immediate = true;
        params.volume = TTSVars.volumemaster;

        speech.speak(params);
    }

        // this command has a different version for the JANK
    ns.get_voice_settings_by_name = function(name) {
        return {...TTSVars.sayCmds[name]};
    }

        // grab parameters from the speech select which is 1, not zero based
        // the select's selectedIndex is used which I should have used throughout

    function get_voice_settings_by_index(index) {
        let rate = +gid('rv-'+index).value;
        let pitch = +gid('pv-'+index).value;
            //let vIdx = +gid('voiceid-'+index).value;  // now gets the hash
        let vIdx = +gid('v-'+index).selectedIndex
        let voice = TTSVars.voices[vIdx];

        return {rate, pitch, voice}
    }

        // flashers might end up common THE ARE - can rip this out

    function init_flasher_tech() {        // if a flasher is there set up a func
        let flashBox = gid('flasher');
        flashBox.onclick = stop_flash;  // allow a click to cancel

        TTSVars.flashActive = false;

        let flashFunc = () => {
            if (TTSVars.flashActive) return;
            start_flash();
        }

        if (flashBox) { console.log('FLASHER ASSIGNED');
            TTSVars.flashFunc = flashFunc;
        }
    }

    function start_flash() {
        TTSVars.flashActive = true;
        clearTimeout(TTSVars.flashSetTimeout);

        let flashBox = gid('flasher');
        flashBox.classList.add('flasher');

        TTSVars.flashSetTimeout = setTimeout(() => {
            stop_flash();
        }, TTSVars.flashDuration);
    }

    function stop_flash() {
        TTSVars.flashActive = false;
        clearTimeout(TTSVars.flashSetTimeout);

        let flashBox = gid('flasher');
        flashBox.classList.remove('flasher');
    }

    function speech_test () {
        speech.speak({text: "Testing the speech engine - beep boop beep", saynext: true});
    }

        // pause and resume checkbox

    function speech_pause_checkbox_onchange (e) {
        let t = e.target;
        if ( t.checked  ) {
            speech.pause();
        }
        else {
            //if (!speech.ss.paused) {    // EDGE doesn't do paused so it breaks pause on it.  fix for Chrome android and it DOES need it.  I need to set up an android detect
            if ( isAndroid ) {    // fix for Chrome android and it DOES need it.
                speech.cancel();    console.log( m("UNPAUSE CANCEL") );
            }
            speech.resume();
        }
    }

        // enabled checkbox clears the speech queue visually and aurally

    function speech_enabled_checkbox_onchange (e) {
        let t = e.target;
        if ( t.checked === false ) {
            speech.cancel();
            speech.clear();
            TTSVars.speech_list_clear();    // on screen list
        }
    }

        // display value //speech.utterance.volume = e.target.value; // can't change during

    function volume_master_slider_oninput(e) {
        gid('volumemasterdisplay').textContent = Math.round( e.target.value * 100.0 );
    }

        // creates a regex filter for the filter chars

    function filter_chars_onchange() {
        let chars = TTSVars.filterChars;
        // make sure no spaces
        chars = chars.replace(/\s/g, '');

        chars = chars.replace(/[\\\[\]\-^]/g, '\\$&');

        //chars = chars.replace(/\[/g, '\\[');
        //chars = chars.replace(/\]/g, '\\]');
        TTSVars.filterChars = chars;
        TTSVars.filterCharsRegex = new RegExp("["+chars+"]", "g");
        console.log("CHAAAANGE");
    }
})(UserMon);
/*
}   // try / SCOPE ENDS
catch (e) {
    console.error("Error in Chat to Speech", e);
    o("Error in chat to speech: " + e.toString());
}
//*/