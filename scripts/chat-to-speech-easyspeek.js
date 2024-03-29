/**	https://www.npmjs.com/package/easy-speech
 * https://github.com/jankapunkt/easy-speech/blob/HEAD/API.md
 * If I changed this to Easyspeek how would it work?
 *
 * I don't have direct contact to the utterance to add the queueid so I'd have
 * to pass in closures for start and end
 *
 *
 *
 *
 */
"use strict"
// no, need to do this in a new speecher class
//import EasySpeech from "./easyspeech.module.js";

TT.config.TTSVars = {       // more props added from forms
    flashSetTimeout: null,
    flashDuration: 3500,    // milliseconds
    flashFunc: x => x,      // does nothing for now
        // updated by the speecher callbacks and speech parameter onchanges
    voices: [],
    sayCmds: {},
    voiceHashToIndex: new Map(),
}


try {   // scope starts ( in case I can demodularise this )
    const ALL_CHAT_RANDOM_VOICE = true; // disable for server

    const TTSVars = TT.config.TTSVars;
    const TTS_MOD_COOLDOWN = 5;
    const TTS_TEST_TEXT = "Testing the voice one two three";

    const emote_filter = new Emoter()
    TT.emote_filter = emote_filter;

    const cooldowns = new TT.Cooldowns();

    const SPEECH_START_TIMEOUT_MS = 2000;     // seconds that speech has to start before it's cancelled
    const SPEECH_END_TIMEOUT_MS = 20000;     // seconds that speech has to end before it's cancelled

    const speech = new TT.Speecher();
        // edge is the one that stalls
    const isEdgeChrome = window.navigator.userAgent.toLowerCase().includes('edg/');
    const isAndroid = window.navigator.userAgent.toLowerCase().includes('android');
    const isChrome = window.navigator.userAgent.toLowerCase().includes('chrome');

    TTSVars.speecher = speech;
    add_speecher_global_utterance_events(speech);	// can still work

        // quick hashing for voice ids in the url
    TT.quick_hash = str => str.split('').map(v=>v.charCodeAt(0)).reduce((a,v)=>a+((a<<7)+(a<<3))^v).toString(16);

    speech.addEventListener('voicessschanged', e => {
        console.debug("VOICES HAVE CHANGED in Speech", e);
    })


    let TTS_EVENTS = [
        {selector: '#saycmds [id^="sc-"], #saycmds input[type="range"], #saycmds select',
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
            TTSVars.voices = speech.getVoices();
            create_speech_selects_options();  // must be done BEFORE init common

            speech.addEventListener('voiceschanged', () => {
                console.log("VOICES HAVE CHANGED AND I AM LISTENING!!!");
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

            TT.forms_init_tmi();    // BEFORE common
            TT.forms_init_common(); // restores forms and sets up common permissions doesn't triggers ONCHANGE

            if (TTSVars.voices.length) {
                TT.restore_form_values(".voice-select");
            }

            TT.add_events_common();  // Should I wait until AFTER the SPEECH are populated? triggers onchange on .form-save
            TT.add_event_listeners(TTS_EVENTS);

                // main listener
            add_chat_to_speech_tmi_listener();
            init_flasher_tech();

            if (TT.initialUrlParamsToArray['autojoin']) {
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

    function entry_deque(e) {
        try {
            TTSVars.speech_queue_remove_entry(e.target.queueid);
        } catch (error) {
            console.error(error)
            console.error(`Error removing speech queue row # ${e.target.queueid} on utterance end event`)
        }
    }

        // add the form things

    function add_speecher_global_utterance_events(speech) {
        let pause_it = e => {
            try {                            //TTSVars.speech_queue_remove_entry(e.target.queueid);
                    console.debug(`PAUSED: Paused: ${speech.ss.paused}, Pending: ${speech.ss.pending}, Speaking: ${speech.ss.speaking}`)
                } catch (error) {
                    console.error(error)
                }
            }

        let resume_it = e => {
                try {
                    console.log( y("SPEECH RESUME"), `Paused: ${speech.ss.paused}, Pending: ${speech.ss.pending}, Speaking: ${speech.ss.speaking}`);
                } catch (error) {
                    console.error(error)
                }
            }

        speech.on({ end: (e) => { console.log("END EVENT FIRED FOR", e.utterance.queueid, e.utterance.text);} })
        speech.on({ start: (e) => { console.log("START EVENT FIRED FOR", e, e.utterance.queueid, e.utterance.text);} })

        speech.on({ error: speech_error_callback });
        speech.on({ error: entry_deque, end: entry_deque, pause: pause_it, resume: resume_it });

        speech.addEventListener('beforespeak', (data) => {
//            console.log("BEFORE SPEAK DATA:", data);
            data.detail.pack.volume = TTSVars.volumemaster;
        })

            // add timeouts for when things goes wrong

        if (isEdgeChrome) {
            add_edge_end_workaround();
        }
    }   // END add global utterance events


        /**
         * Timeouts for each speech entry in case the end event fails to fire - only needed on Edge so far.
         * edge sometimes garbage collects the utterance which causes no end event
         * it's possible these might no longer be needed if the garbage collection issue is solved by oldUtterance in the speecher class
         */

    function add_edge_end_workaround () {
        console.log( y("********* ADDING EDGE no end event workaround ***********") );

        speech.addEventListener('beforespeak', (data) => {
            let qid = data.detail.id;
            //console.debug("SETTING TIMEOUT FOR ID", qid);
                                            // NOTE: this WILL kill any paused speeches if you leave it
            let speech_end_TO_callback =  () => {    //function speech_timeout(queueid) {
                console.error(`EEEEEEEE speech_end_timeout error EEEEEEE cancelling queueid: ${qid} with text "${data.detail.pack.text}" voice: ${data.detail.pack.voice.voiceURI}`);
                console.debug("Detail", data.detail);
                //console.debug("Speecher state: ",  TTSVars.speecher);
                TTSVars.speecher.cancel_id(qid);    // might automatically deque
                entry_deque( {target: {queueid: qid}} );// may be triggered by cancel_id triggering end
            }

            let end_TO  = setTimeout(speech_end_TO_callback, SPEECH_END_TIMEOUT_MS);
                // start timeout also clears end
            let speech_start_TO_callback = () => {    //function speech_timeout(queueid) {
                console.error(`XXXXXXXXXXX speech_start_timeout error XXXXXXXXXXXXX cancelling queueid: ${qid} with text "${data.detail.pack.text}" voice: ${data.detail.pack.voice.voiceURI}`);
                //console.debug("Speecher state: ",  TTSVars.speecher);
                clearTimeout(end_TO);
                TTSVars.speecher.cancel_id(qid);
                entry_deque( {target: {queueid: qid}} );
            }

            let start_TO = setTimeout(speech_start_TO_callback, SPEECH_START_TIMEOUT_MS);

                // add start end end events to the utterance.
            speech.onOnce( {start: e => clearTimeout( start_TO ), end: clearTimeout( end_TO) });
        });
    }


    /* function tts_init_forms() {
        TT.forms_init_common();
    } */


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

                        if (ALL_CHAT_RANDOM_VOICE)
                        {
                            let vIdx = Math.floor(Math.random() * TTSVars.voices.length);
                            let voice = TTSVars.voices[vIdx]; console.log("RAND VOICE", voice.name);
                            sayCmdPack.params = { rate: 1.3, pitch: 1.0, voice }
                        } else {
                            sayCmdPack.params = get_voice_settings( voiceIndex );
                        }
                    } else {
                        commandSliceOffset = sayCommand.length + 1;
                        sayCmdPack.params = TTSVars.sayCmds[sayCommand]
                    }

                    sayCmdPack.command = sayCommand;

                    if ( ! TTSVars.chatReadEmotes ) {
                        message = emote_filter.filter(message, userstate);
                    }
                        // if we're here
                    message = message.slice(commandSliceOffset).trim();
                    console.log(userstate['display-name'], "message length:", message.length);
                    if (message.length === 0) { console.log("message zero returning");
                        return;
                    }
                    if (message.length < 4) {
                        console.log("Short message check: ", encodeURIComponent(message));
                        for (let i = 0; i < message.length; i++) {
                            console.log(i, message.charCodeAt(i) );
                            //console.log( message.code(i) );
                        }
                    }

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

console.debug("COMMAND PACK", sayCmdPack);

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
        let cmds = qsa('[id^="sc-"]')
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

}   // try / SCOPE ENDS
catch (e) {
    console.error("Error in Chat to Speech", e);
    o("Error in chat to speech: " + e.toString());
}