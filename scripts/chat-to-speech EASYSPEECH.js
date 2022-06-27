/** CHAT-TO-SPEECH.js
 * Microsoft Natasha Online (Natural) - English (Australia)
 * Microsoft Xiaoyi Online (Natural) - Chinese (Mainland) like a baby
 * Microsoft Sreymom Online (Natural) - Khmer (Cambodia) child like
 * Microsoft Everita Online (Natural) - Latvian (Latvia) possibly sad
 * Microsoft Sapna Online (Natural) - Kannada (India) possibly sexy
 * Microsoft Aigul Online (Natural) - Kazakh (Kazakhstan) poss sexy
 * Microsoft HiuMaan Online (Natural) - Chinese (Hong Kong)
 * Microsoft Anu Online (Natural) - Estonian (Estonia) possibly funny
 * Microsoft Marija Online (Natural) - Macedonian (Republic of North Macedonia) seems very good
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
 * speechSynthesis has properties speaking pending and paused
 *  speaking and pending can be used with the queue
 *
 * ss.paused isn't enough with queue processing so use a property
 *
 * TO DO
 *
 *  Cooldowns
 *  read numbers option
 *  POSSIBLE - follower only
 *  FILTER OUT ICONS
 *
 *  If it starts with ! but isn't a command maybe don't read it out
 *
 *  https://github.com/jankapunkt/easy-speech/blob/master/API.md#module_EasySpeech
 *  Defaults https://github.com/jankapunkt/easy-speech/blob/master/API.md#module_EasySpeech--module.exports..EasySpeech.defaults
 *
 * EasySpeech.status() returns a shallow copy has SpeechSynthesis
 * EasySpeech.detect() returns a shallow copy has SpeechSynthesis
 *
 */
"use strict"

    // THIS IS A MODULE - no need to hide anything

import EasySpeech from "./easyspeech.module.js";

//const TT_MUTED_MINS_MAX = 300;
    // regex's to match the input

TMIConfig.TTSVars = {
    cooldownUsers: new Set(),

    cooldownGlobalActive: false,
    cooldownDefaultSecs : 181,
    cooldownSecsRemaining : 180,  // that'll be changing
    cooldownCallback : null,    // for setInterval
    cooldownDiv: null,
    cooldownSecsDiv: null,

    flashSetTimeout: null,
    flashDuration: 3500,    // milliseconds
    flashFunc: x => x,  // does nothing for now
//    alertSound: null,   // embedded sound item for alertSound.play()

    voices: [],
    sayCmds: {}
}

class Speecher {
	speechQueue = [];
//	isSpeaking = false;
    isPaused = false;

	stop() {
		//this.isSpeaking = false;
		this.stopNow = true;
		EasySpeech.pause();
	}

	pause() {
		//this.stopNow = true;
        this.isPaused = true;
		EasySpeech.pause();
	}

	resume() {
		//this.stopNow = false;
        this.isPaused = false;
		EasySpeech.resume();
		this.sayQueueProcess();
	}

    cancel() {
        EasySpeech.cancel();
    }

    reset() {
        EasySpeech.reset();
    }

    clear() {
        this.speechQueue = [];
    }

		// pack = {text, pitch, rate, voice}

	say(pack)
	{
		this.stopNow = false;
		this.speechQueue.push(pack);

		console.log("Speech Queue", this.speechQueue.length);
		//console.log("ss", TTSVars.ss);
		//if (!this.isSpeaking)
		if (!TTSVars.ss.speaking || this.isPaused)   // should probably check paused
            this.sayQueueProcess();
	}

	sayQueueProcess() {
		//if (this.isSpeaking) {            //console.log("NO SPEEK - A ALREADY SPEAK");
        if ( TTSVars.ss.speaking || this.isPaused ) {
            return;
        }

		if (this.stopNow) {
			EasySpeech.cancel();
			//this.isSpeaking = false;
			return;
		}

		//this.isSpeaking = true;
			// oh my god - I thought shift was broken for sooo long
		let pack = this.speechQueue.shift();

		if ( pack ) {
			//console.log("USING PACK", pack, "Now Q SIZE", this.speechQueue.length);
			EasySpeech.speak(pack)
                .then( () => {
                    //this.isSpeaking = false;
                    this.sayQueueProcess()
                } )
                .catch(e => {   // no page interaction - clear isSpeaking
                    //this.isSpeaking = false;
                });
		}
		else {
			//this.isSpeaking = false;
		}
	}
}



try {   // scope starts ( in case I can demodularise this )
    var TTSVars = TMIConfig.TTSVars;
    const TTS_TEST_TEXT = "Testing the voice one two three";
    const speech = new Speecher;

    let TTS_EVENTS = [
        {selector: '#saycmds [id^="saycmd-"], #saycmds input[type="range"], #saycmds select',
            event: 'change', function: update_say_commands, params: {}},
        {selector: '#speechtestbtn', event: 'click', function: speech_test, params: {}},
        {selector: '#saycmds button[data-index]', event: 'click', function: test_voice_onclick, params: {}},
        {selector: 'input[type="range"]', event: 'input', function: slider_oninput, params: {}},

        {selector: '#enablespeech', event: 'change', function: speech_enabled_onchange, params: {}},

        {selector: '#pausespeech', event: 'change', function: speech_pause_onchange, params: {}},
    ];

    async function init_easyspeech() {
        log("Initialising Speech engine");

        let caps = EasySpeech.detect();

        TTSVars.ss = speechSynthesis;

        console.log("EasySpeech.detect()", caps);
        log("Speech Synthesis " + caps['speechSynthesis'].toString())

        let res = await EasySpeech.init();

        log("Engine Initialised");

        console.log("Status", EasySpeech.status()); // has speechSynthesis
        console.log("easy speech", EasySpeech);

        // boundary end error mark pause resume start - see docs
        EasySpeech.on({'voiceschanged': () => o('VOICES CHANGE WELL THIS WORKS')})// no, sadly, but it should but I could just attach to the system speech
        EasySpeech.on({'error': speek_error});// this is legit
        //EasySpeech.on({'start': e => console.log('start', e.target.text)})
        //EasySpeech.on({'boundary': () => console.log('boundary WELL THIS WORKS')})

        //TTSVars.voices = EasySpeech.voices(); NO, you can't be trusted
        TTSVars.voices = speechSynthesis.getVoices();

        EasySpeech.defaults({rate: 1, error: (e) => console.log("EASYSPEECH ERROR DEFAULT", e)});

        return res;
    };

        // on window load

    window.addEventListener('load', async (event) => {
        let isError = false;

            // can we set an onvoices change?

        init_easyspeech().then(() => {
            // set up the voice selects
            create_speech_selects_options();  // must be done BEFORE init common
            // channels populates form fields from url string

            let caps = EasySpeech.detect();

            if ( caps.onvoiceschanged ) {
                speechSynthesis.addEventListener('voiceschanged', () => {
                    console.log(g("VOICES HAVE CHANGED ss version:"), speechSynthesis.getVoices());
                    console.log( "ES version", EasySpeech.voices() );
                    console.log( speechSynthesis  );
                    console.log( EasySpeech );

                    //TTSVars.voices = EasySpeech.voices();
                    TTSVars.voices = speechSynthesis.getVoices();
                    console.log("NUMBER OF VOICES: ", TTSVars.voices.length);
                    create_speech_selects_options();
                })
            }


            TT.forms_init_common();

            TT.add_event_listeners(TTS_EVENTS);
                // set the default values

            if (TMIConfig.autojoin) {
                console.log(r("Auto Joining channels..."));
                TT.join_chans();
            }
        })
        .catch( e => {
            log('<b>INIT ERROR:</b> ' + e.toString())
            o(e.toString(), true)
            o('<h4 class="subtitle is-4">Please try a different browser</h4>')
            o('<h3 class="title is-3">Sadly No Speech available</h3>')
        })

        if (isError) {
            return;
        }

        //gid('clearmainout').addEventListener('click', () => o('', true) );

            // auto sets array in TMIConfig.perms to lower case - set to a global system and we can put this as common
            // main listener
        add_chat_to_speech_tmi_listener();
        init_flasher_tech();

        TTSVars.cooldownSecsDiv = gid('cooldowncountdown');
        TTSVars.cooldownDiv = gid('cooldownoutput')
    });// on load ends


        // I should of course include the channel, cclient is global
        // tmi code is re-adding event listeners on disconnects
        // MAIN Twitch listener

    function add_chat_to_speech_tmi_listener()
    {       // https://dev.twitch.tv/docs/irc/tags#globaluserstate-twitch-tags
        let lastMsgId = null;   // after a reconnect TMI sometimes sents repeats

        cclient.on('message', (channel, userstate, message, self) => {
            if (self || TTSVars.chatEnabled === false) return;   // Don't listen to my own messages..

            if (lastMsgId === userstate['id']) {  // had a case of double messaging
                return;
            }

            lastMsgId = userstate['id'];    // unique to every message

                // are they permitted ?
            if (! TT.user_permitted( userstate )) { // console.log("USER NOT PERMITTED", userstate['username']);
                return false;
            }

                // Handle different message types..
            switch(userstate["message-type"]) {
                case "action": case "chat": case "whisper":
                    // check if the user or global timeout is in effect.

                    // filter out emotes
                    if ( ! TTSVars.chatReadEmotes && userstate['emotes-raw'] !== null) {
                        message = filter_out_emotes(message, userstate);
                    }

                    let isSayCmd = is_say_command(message);  // returns obj or false
//                    console.log("is_say_command: ", isSayCmd);

                    if (!isSayCmd) {
                        if (! TTSVars.chatReadOtherCommands && '!' === message[0]) {
                            return;
                        }

                        if (TTSVars.chatReadAll) {
                            let params = get_speech_vars(1);

                            isSayCmd = { // command rest params (voice)
                                command: 'all-chat',
                                rest: message,  // use first voice by default
                                params
                            }
                        } else {
                            return;
                        }
                    }

                        // let's commands still be used

                    if (isSayCmd.rest === '') return;

                    let name = userstate['display-name'].replace(/_/g, ' ');

                        // if no digits in username
                    if ( !TTSVars.chatReadNameDigits ) {
                            name = name.replace(/\d/g, ' ')
                    }
                        // this actually writes to the global params
                    isSayCmd.params.text = isSayCmd.rest + ' said ' + name;// or username;

                    speech.say(isSayCmd.params);
                    /* EasySpeech.speak()
                    .then(e => console.log("finished", isSpeak.params))
                    .catch(e => e);   // let the on handler deal with it */


                    break;
                default: // pfff ?
                    break;
            }
        });
    }


        /*  They are ZERO based and 0 10 would be 11 characters
        emotes: array DOESN'T have them in order
            245: ['10-24']
            28087: ['41-47']
            300425351: ['26-39']
        raw HAS them in order so you can reverse through them
        emotes-raw: "245:10-24/300425351:26-39/28087:41-47"
        */

    const EMOTE_PATTERN = /(\d+)-(\d+)/g;

    function filter_out_emotes(msg, state) {
        if (state["emotes-raw"] === null) return msg;

        let pos, posns = [...state["emotes-raw"].matchAll(EMOTE_PATTERN)];

            //let orig = msg; console.log("emotes", state["emotes-raw"], state.emotes, "I found", posns.length);
            // in reverse
        while (pos = posns.pop()) {            //msg = msg.slice(0, p1) + msg.slice(p2 + 1);   // WORKS
            msg = msg.slice(0, +pos[1]) + msg.slice(+pos[2] + 1);   // WORKS
        }
            //console.log("emotes RETURNING\n", msg.trim(), "\nfrom\n", orig, "length:", msg.trim().length);
        return msg.trim();
    }

        // if browser requires interaction before allowing speech then flash the screen

    function speek_error(e) {
        if (e.error === "not-allowed") {
            TTSVars.flashFunc();
        }
    }

        // commands must always start with !
        // returns rest of string without command
        // filter emotes BEFORE calling this
    function is_say_command (str) {
        if (str[0] === '!') {	// get the first word with ! lowercased
            var words = str.split(' ').filter(e => e);
                // rest of first word to lower case
            var inCmd = words[0].toLowerCase();
                                                        //console.log(`words`, words);
            if (inCmd in TTSVars.sayCmds) {
                words.shift();  // get rid of command
                return {
                    command: inCmd,
                    rest: words.join(' '),
                    params: TTSVars.sayCmds[inCmd]
                }
            }
        }

        return false;
    }


    /**
     *  Adds the <option>s to the selects
     *  Do BEFORE restoring the defaults
     */

    function create_speech_selects_options () {
        let selects = qsa("#saycmds select")

        log("Number of voices : " + TTSVars.voices.length)

        for (let s of selects) { // create <option>s
            let frag = document.createDocumentFragment();

            for (const voiceidx in TTSVars.voices) {
                let voice = TTSVars.voices[voiceidx]
                let opt = document.createElement('option');
                opt.value = voiceidx;
                opt.text =  voice.name;
                opt.dataset['voiceindex'] = voiceidx;

                frag.appendChild(opt);
            }

            //s.appendChild(frag);
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

    function test_voice_onclick (e) {
        test_voice(e.target.dataset['index'])
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

            commands[cmd] = get_speech_vars(index);
        });

        console.log("COMMANDS AFTER", commands);

        TTSVars.sayCmds = commands;
    }

        // test speak button

    function test_voice(index) {
        let vals = ['rateval', 'pitchval', 'voiceid']

        let rate = +gid('rateval-'+index).value;
        let pitch = +gid('pitchval-'+index).value;

        let vIdx = gid('voiceid-'+index).value;
        let voice = TTSVars.voices[vIdx];
        console.log("voice index", vIdx);

        let params = get_speech_vars(index);
        params.text = TTS_TEST_TEXT;

        EasySpeech.speak(params);
    }

        // grab parameters from the speech setting 1, not zero based

    function get_speech_vars(index) {
        let rate = +gid('rateval-'+index).value;
        let pitch = +gid('pitchval-'+index).value;
        let vIdx = +gid('voiceid-'+index).value;
        let voice = TTSVars.voices[vIdx];

        return {rate, pitch, voice}
    }


        // flashers might end up common

    function init_flasher_tech() {        // if a flasher is there set up a func
        let flashBox = gid('flasher');
        flashBox.onclick = stop_flash;  // allow a click to cancel

        let flashFunc = () => {
            clearTimeout(TTSVars.flashSetTimeout);

            flashBox.classList.add('flasher');

            TTSVars.flashSetTimeout = setTimeout(() => {
                flashBox.classList.remove('flasher');
            }, TTSVars.flashDuration);
        }

        if (flashBox) { console.log('FLASHER ASSIGNED');
            TTSVars.flashFunc = flashFunc;
        }
    }


    function stop_flash() {
        let flashBox = gid('flasher');
        flashBox.classList.remove('flasher');

        clearTimeout(TTSVars.flashSetTimeout);
    }

    function speech_test () {
        EasySpeech.speak({text: "Testing the speech engine - beep boop beep"});
    }

        // clears the speech queue

    function speech_pause_onchange (e) {
        let t = e.target;
        if ( t.checked  ) {
            speech.pause();
        }
        else {
            speech.resume();
        }
    }

    function speech_enabled_onchange (e) {
        let t = e.target;
        if ( t.checked === false ) {
            //speech.isSpeaking = false;
            speech.cancel();
            speech.clear();
            //speech.reset();
        }
        else {
            //speech.isSpeaking = false;
            //speech.resume();
            //speech.sayQueueProcess();
        }
    }

}   // SCOPE ENDS
catch (e) {
    console.log("Errorrr", e);
    o("Error: " + e.toString());
}