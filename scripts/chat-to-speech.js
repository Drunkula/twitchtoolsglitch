/** CHAT-TO-SPEECH.js
 *
 *  THIS IS OFFICIALY A MESS as I'm not splitting into smaller files like you're really do.
 *
 *  The EDGE stalling problem with this might need a new strategy:
 *      Start a shorter timeout that'll be cancelled on utterance start
 *      Start a longer timeout that'll be cancelled on utterence end.  This must allow speaking time so maybe 20 seconds plus.
 *
 *  The timeouts don't come in the order you might expect, a new start can fire before the end of another so adding
 *  timeouts on the start means they can be cancelled by the end event if you're not somehow doing 'tricks'
 *
 *  PAUSING FIRES END EVENTS for some browsers.
 *
 *  **** EASYSPEECH.voices() CAN'T BE TRUSTED as it doesn't update itself onvoiceschanged a second time ****
 *  EASYSPEECH doesn't queue utterances unlike the real thing.  I get the feeling I could have done all
 *  this natively - it was only the getVoices thing I was worried about.
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


try {   // scope starts ( in case I can demodularise this )
    const TTSVars = TMIConfig.TTSVars;
    const TTS_MOD_COOLDOWN = 5;
    const TTS_TEST_TEXT = "Testing the voice one two three";

    const emote_filter = new Emoter()
    TT.emote_filter = emote_filter;

    const cooldowns = new TT.Cooldowns();

    const SPEECH_START_TIMEOUT_MS = 2000;     // seconds that speech has to start before it's cancelled
    const SPEECH_END_TIMEOUT_MS = 20000;     // seconds that speech has to end before it's cancelled

    const speech = new TT.Speecher();
    TTSVars.speecher = speech;
    add_speecher_global_utterance_events(speech);

        // quick hashing for voice ids in the url
    TT.quick_hash = str => str.split('').map(v=>v.charCodeAt(0)).reduce((a,v)=>a+((a<<7)+(a<<3))^v).toString(16);

    speech.addEventListener('voicessschanged', e => {
        console.debug("VOICES HAVE CHANGED in Speech", e);
    })

    let TTS_EVENTS = [
        {selector: '#saycmds [id^="saycmd-"], #saycmds input[type="range"], #saycmds select',
            event: 'change', function: update_say_commands, params: {}},
        {selector: '#speechtestbtn', event: 'click', function: speech_test, params: {}},

        {selector: '#cancelbtn', event: 'click', function: () => speech.cancel(), params: {}},

        {selector: '#saycmds button[data-index]', event: 'click', function: test_voice_onclick, params: {}},
        {selector: 'input[type="range"]', event: 'input', function: slider_oninput, params: {}},

        {selector: '#enablespeech', event: 'change', function: speech_enabled_checkbox_onchange, params: {}},

        {selector: '#pausespeech', event: 'change', function: speech_pause_checkbox_onchange, params: {}},

        {selector: '#volumemaster', event: 'input', function: volume_master_slider_oninput, params: {}},
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


        // add the form things

    function add_speecher_global_utterance_events(speech) {

        let entry_deque = function(e) {
            try {
                TTSVars.speech_queue_remove_entry(e.target.queueid);
            } catch (error) {
                console.error(error)
                console.error(`Error removing speech queue row # ${e.target.queueid} on utterance end event`)
            }
        }

        let pause_it = e => {
            try {                            //TTSVars.speech_queue_remove_entry(e.target.queueid);
                    log(`PAUSED: Paused: ${speech.ss.paused}, Pending: ${speech.ss.pending}, Speaking: ${speech.ss.speaking}`)
                    //console.log(e);
                    console.log( g("SPEECH PAUSE"), `Paused: ${speech.ss.paused}, Pending: ${speech.ss.pending}, Speaking: ${speech.ss.speaking}`);
                } catch (error) {
                    console.error(error)
                }
            }

        let resume_it = e => {
                try {
                    log(`RESUME: Paused: ${speech.ss.paused}, Pending: ${speech.ss.pending}, Speaking: ${speech.ss.speaking}`);
                    console.log( y("SPEECH RESUME"), `Paused: ${speech.ss.paused}, Pending: ${speech.ss.pending}, Speaking: ${speech.ss.speaking}`);
                } catch (error) {
                    console.error(error)
                }
            }

        speech.on({ error: speech_error_callback });
        speech.on({ error: entry_deque, end: entry_deque, pause: pause_it, resume: resume_it });
        speech.on({ start: (e) => { console.log("START EVENT FIRED FOR", e.utterance.queueid);} })
        speech.on({ end: (e) => { console.log("END EVENT FIRED FOR", e.utterance.queueid);} })

        speech.addEventListener('beforespeak', () => speech.utterance.volume = TTSVars.volumemaster)
            // add timeouts for when things goes wrong - possibly should deque
        speech.addEventListener('beforespeak', (data) => {
            let qid = data.detail.id;
            console.log("SETTING TIMEOUT FOR ID", qid);

            let speech_end_TO =  () => {    //function speech_timeout(queueid) {
                console.log(`EEEEEEEE speech_end_timeout EEEEEEE cancelling queueid: ${qid}`);
                TTSVars.speecher.cancel_id(qid);    // might automatically deque
                entry_deque( {target: {queueid: qid}} );// may be triggered by cancel_id triggering end
            }

            let end_TO  = setTimeout(speech_end_TO, SPEECH_END_TIMEOUT_MS);
                // start timeout also clears end
            let speech_start_TO = () => {    //function speech_timeout(queueid) {
                console.log(`XXXXXXXXXXX speech_start_timeout XXXXXXXXXXXXX cancelling queueid: ${qid}`);
                clearTimeout(speech_end_TO);
                TTSVars.speecher.cancel_id(qid);
                entry_deque( {target: {queueid: qid}} );
            }

            let start_TO = setTimeout(speech_start_TO, SPEECH_START_TIMEOUT_MS);

                // add start end end events to the utterance.
            data.detail.utterance.addEventListener( 'start', a => clearTimeout( start_TO ) );
            data.detail.utterance.addEventListener( 'end', a => clearTimeout( end_TO ) );
        });
    }


function tts_init_forms() {
    TT.forms_init_common();
}


        // async so we can await readyness

    async function init_speecher() {
        log("Initialising Speech engine");

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
    };

        // I should of course include the channel, cclient is global
        // tmi code is re-adding event listeners on disconnects
        // MAIN Twitch listener

    function add_chat_to_speech_tmi_listener()
    {       // https://dev.twitch.tv/docs/irc/tags#globaluserstate-twitch-tags
        let lastMsgId = null;   // after a reconnect TMI sometimes sents repeats

        TT.cclient.on('message', (channel, userstate, message, self) => {
            if (self || TTSVars.chatEnabled === false) return;   // Don't listen to my own messages..

            if (lastMsgId === userstate['id']) {  // had a case of double messaging
                return;
            }
            lastMsgId = userstate['id'];    // unique to every message

            if (TTSVars.chatQueueLimit && speech.queue_length() >= TTSVars.chatQueueLimit) {
                // emit(queuetoolong)
                return;
            }

                // are they permitted ?
            if (! TT.user_permitted( userstate )) { console.debug("USER NOT PERMITTED", userstate['username']);
                return false;
            }

                // Handle different message types..
            switch(userstate["message-type"]) {
                case "action": case "chat": case "whisper":
                        // filter out emotes
                    let sayCommand = is_say_command(message);  // returns !command / false
                    let sayCmdPack = {};
                    let commandSliceOffset = 0   // amount to strip from message

                    if (sayCommand === false) {
                        if ( !TTSVars.chatReadAll || ('!' === message[0]) && TTSVars.chatReadOtherCommands !== true) {
                            return;
                        }
                            // create an all-chat say command
                        sayCommand = '!all-chat'
                        sayCmdPack.params = get_voice_settings(1);
                    } else {
                        commandSliceOffset = sayCommand.length + 1;
                        sayCmdPack.params = TTSVars.sayCmds[sayCommand]
                    }

                    sayCmdPack.command = sayCommand;

                    if ( ! TTSVars.chatReadEmotes ) {
                        message = emote_filter.filter(message, userstate);
                    }
                        // if we're here
                    message = message.slice(commandSliceOffset);
                    if (message.length === 0) return;

                    sayCmdPack.message = message;
                        // if read all create a fake say command

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
                    cooldowns.cooldown_set(cooldownParams)

                        // event handlers for utterance
console.log("COMMAND PACK", sayCmdPack);
                        // on "beforespeak" event I should start a timer to check that the voice does start
                    // sayCmdPack.params.start = (e) => { console.debug ("UTTERANCE STARTED", e) }
                    // luckily the speecher has a cancel_id(id) function

                        // Display BEFORE calling say so errors automatically cull the row.

                    let nid = speech.next_id();
                    TTSVars.speech_queue_list_add({user: userstate["display-name"], text: message, id: nid})

                        // this actually writes to the global params
                    sayCmdPack.params.text = add_speech_before_after(message, userstate, channel);
                    speech.say(sayCmdPack.params);

                    break;
                default: // pfff ?
                    break;
            }
        });
    }

        // adds tagged strings before and after the message

    function add_speech_before_after(msg, state, channel) {
        if (TTSVars.chatSayBefore || TTSVars.chatSayAfter) {
            let name = state['display-name'].replace(/_/g, ' ');

            // if no digits in username
            if ( !TTSVars.chatReadNameDigits ) {
                name = name.replace(/\d/g, ' ')
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
        } else {
            console.error("SPEECH ERROR:", e);
        }
    }

        // Does the text match one of the defined !command text inputs
        // returns obj {command: "!say", rest: "after command", params: [voices pitch/rate paramaters matching the !command]
        // filter emotes BEFORE calling this
    function is_say_command (str) {
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
        let selects = qsa(".voice-select")

        log("Number of voices : " + TTSVars.voices.length)

        for (let s of selects) { // create <option>s
            let frag = document.createDocumentFragment();

            for (const voiceidx in TTSVars.voices) {
                let voice = TTSVars.voices[voiceidx]

                let opt = document.createElement('option');
                opt.text =  voice.name;
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
        let cmds = qsa('[id^="saycmd-"]')
        let commands = {};

        cmds.forEach(s => {
            let index = parseInt(s.id.split("-")[1]);

            let cmd = s.value.trim().toLowerCase();
            cmd = cmd.split(' ').filter(e => e).join('');

            if (cmd.length === 0) return;

            if ( cmd[0] !== '!') cmd = "!" + cmd;
            s.value = cmd;

            commands[cmd] = get_voice_settings(index);
        });

        TTSVars.sayCmds = commands;
    }

        // test voice settings button

    function test_voice_onclick (e) {
        test_voice(e.target.dataset['index'])
    }

    function test_voice(index) {
        let params = get_voice_settings(index);
        params.text = TTS_TEST_TEXT;
        params.immediate = true;
        params.volume = TTSVars.volumemaster;

        speech.speak(params);
    }


        // grab parameters from the speech setting 1, not zero based

    function get_voice_settings(index) {
        let rate = +gid('rateval-'+index).value;
        let pitch = +gid('pitchval-'+index).value;
            //let vIdx = +gid('voiceid-'+index).value;  // now gets the hash
        let vIdx = +gid('voiceid-'+index).selectedIndex
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
            if (!speech.ss.paused) {    // fix for Chrome android
                speech.cancel();
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

}   // try / SCOPE ENDS
catch (e) {
    console.error("Error in Chat to Speech", e);
    o("Error in chat to speech: " + e.toString());
}