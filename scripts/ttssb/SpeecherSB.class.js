/**
 * A stripped down version of my speecher for Streamerbot.
 * It doesn't need to use a queueing system any more as SB will handle that
 * I also want to easily add data to utterances without going through the
 * 'beforespeak' event
 */

//import { cclog } from "./setup.mod.js";

	// scope
 const hasProperty = (target = {}, prop) => prop in target || Object.hasOwn(target, prop) || !!target[prop];
 //const SS = window.speechSynthesis;
 const GETVOICES_MAX_TIMEOUT = 3000;
 const GETVOICES_CHECK_PERIOD = 250;


const VOICE_MAX_MINS = {
    pitch: {min: 0.5, max: 2.0, default: 1.0},
    rate: {min: 0.1, max: 10.0, default: 1.0},
    volume: {min: 0.0, max: 1.0, default: 1.0}
}

 const utteranceEventTypes = ['boundary', 'end', 'error', 'mark', 'pause', 'resume', 'start']
 const SPEECHER_LOGGING = false;
 const SPEECHER_log = SPEECHER_LOGGING ? console.debug : l => l;	// if you don't want logging

/**
 *
 */

export default class SpeecherSB {
    ss = window.speechSynthesis;    // shortcut to window.speechSynthesis

    //  speechQueueID = 0;	// incremented every time speak() is called
    //  speechQueueMap = new Map();		// IDs lets us easily delete / add

    //  currentSpeakingID = -1;		// so you can cancel the current utterance

    utterance = null; 		// new SpeechSynthesisUtterance();
    oldUtterance = null;	// to stop the old utterance being garbage collected before end event
    voices = [];
    voiceMap = {};  // indexed by voiceURI

    voiceDefault = null;

    #isSpeaking = false;
    #isPaused = false;

    initialised = false;
    gotVoicesDebug = [];	// set with a string about how the voices were found

    #voicesChangedGetOnTimerInterval = null;	// for using the timer
    #voicesPromise = null;
    #voicesPromiseResolve = null;

    #readyResolve = null;
    #readyReject = null;
    #amIReadyPromise = null;
        // for adding events listeners
    #eventDummy = document.createElement('SpeecherEvents');
    #utterance_handlers = [];	// on events for utterances
    #cancelNextSpeak = false;	// can be changed in a beforespeak event listener by calling cancelNext()


        // set up

    constructor(args = {maxTimeout: GETVOICES_MAX_TIMEOUT, period: GETVOICES_CHECK_PERIOD}) {
        this.ss.cancel();	// necessary if paused before reloading page
        //this.ss.resume();
        this.#amIReadyPromise = new Promise( (res, rej) => {
            this.#readyResolve = res;
            this.#readyReject = rej;
        });

        this.#set_onvoices_changed_handler();
        this.#voicesInitOnTimer(args);
    }

        // currently letting the timer run even after other methods worked

    #set_voices() {
        this.voices = this.ss.getVoices();
        this.voiceMap = {};
        this.voices.map(v => this.voiceMap[v.voiceURI] = v);
    }

    #voicesInitOnTimer(args) {
        let {maxTimeout, period} = args;
        let iTmrMSecs = 0;

        this.#voicesPromise = new Promise((voicesPromiseResolve, voicesPromiseReject) => {
            this.#voicesPromiseResolve = voicesPromiseResolve;

            const _timerIntervalHandler = () => {
                let voices = this.ss.getVoices();

                SPEECHER_log("- IN INTERVAL TIMER period", iTmrMSecs, "voices: ", voices.length, "current", this.voices.length);
                    // actually let's keep the timer running
                if (voices.length !== this.voices.length) {
                    let msg = `VoiceGetTimer change on period ${iTmrMSecs}ms found ${voices.length}, previously : ${this.voices.length}`

                    this.#set_voices();

                    SPEECHER_log(msg);
                    this.gotVoicesDebug.push( msg );
                    this.#imReady();
                    this.emit("voiceschanged", { debug: msg });
                }

                iTmrMSecs += period;
                if (iTmrMSecs > maxTimeout) {
                    clearInterval(this.#voicesChangedGetOnTimerInterval);

                    if (!this.initialised) {
                        this.gotVoicesDebug.push( "FAIL: MAXED OUT" );
                        this.initialised = true;
                        voicesPromiseResolve(false);
                        this.#readyResolve(false);
                    }
                }
            }

            this.#voicesChangedGetOnTimerInterval =  setInterval( _timerIntervalHandler, period);
            _timerIntervalHandler();
        })
    }

        // promise return before initialised

    getVoices() {
        if (this.initialised) {
            return this.ss.getVoices();	// should I use ss?
        }
        return this.#voicesPromise;
    }
        // returns promise of true / false
    ready() {
        return this.#amIReadyPromise;
    }

    #imReady() {
        this.#find_default_voice();
        this.initialised = true;

        this.#readyResolve(true);
        this.#voicesPromiseResolve(this.voices);

        this.emit("ready");
    }

    speaking() {
        return this.ss.speaking;
    }

    stop() {
        this.#isSpeaking = false;
        this.stopNow = true;
        this.ss.cancel();
    }

    pause() {			//this.stopNow = true;
        //this.isSpeaking = false;	// UNSURE
        this.#isPaused = true;
        this.ss.pause();
    }

    resume() {			//this.stopNow = false;
        this.ss.resume();
        this.#isPaused = false;
    }
        // cancels the current speaking voice - end event will trigger
    cancel() {
        this.ss.cancel();
    }
        //
    reset() {
        this.clear()
        this.cancel();
    }
        // empties the queue
    clear() {
        this.speechQueueMap.clear();
    }

        // pack = {text, pitch, rate, voice, volume}, string or utterance
        // Returns ID of speech queue entry

    speak(pack, utteranceData = {})
    {          // not just relying on #isSpeaking has fixed this
console.log("#isSpeaking: ", this.#isSpeaking, "ss.speaking", this.ss.speaking, "ss.pending", this.ss.pending, utteranceData.msgid);
console.log("speak() : PACK IS", pack);
            // isSpeaking is unreliable.  Queued entries have got stuck because ss.speaking is true when #isSpeaking is false.  Could cancel every time
            //if (this.#isSpeaking) { // || this.ss.speaking || this.ss.pending) {
        if (this.ss.speaking) {    // <-- most reliable check
            this.#isSpeaking = false;
            this.ss.cancel(); // triggers an utterance 'interrupted' error
            // so cancelled handlers don't need to send a SB message if there's an error handler
            this.emit("cancelled", this.utterance);

console.log("CANCELLING: ", this.utterance.extradata.msgid, this.utterance.text);
        }

        let utterance = this.#create_utterance(pack, utteranceData);
//console.log("Utterance created:", utterance);
        if (utterance === false) {
             this.emit("rejecting", { pack, utteranceData });
             cclog("REJECT REJECT UTTERANCE REJECT:", "m");
             console.log("pack for reject", pack);
             return false;
        }

        utterance.lang = utterance.voice?.lang ? utterance.voice.lang : 'en-GB';  // Android needs lang
        this.utterance = utterance;

            // can be changed during "beforespeak" event handlers.  Gives a chance to attach extra handlers
        this.#cancelNextSpeak = false;
        this.emit("beforespeak", { utterance, utteranceData });

        if (this.#cancelNextSpeak) {
            this.emit("cancelled", utterance);
            return false;
        }
//console.log("ABOUT TO UTTER:", utterance);
        this.#isSpeaking = true;
        this.ss.speak(utterance);

        return true;
    }

        // alias
    say(pack, e = {}) {
        return this.speak(pack, e);
    }

        // test SpeechSynthesis voice (EasySpeech method)
    #is_voice(v) {
        return v && v.lang && v.name && v.voiceURI;
    }

        // returns filtered voice, pitch, volume, rate and utterance handlers

    #validate_params(params) {		//_validate_params({pitch, rate, volume, voice, ...handlers}) {
        let filtered = { handlers: [] };

        //let v = params.voice;
        //filtered.voice = this.#is_voice(v) ? v : this.voiceDefault;
        let vUri = params.voiceURI;
        filtered.voice = this.voiceMap[vUri] ?? this.voiceDefault;

        for (const key in VOICE_MAX_MINS) {
            const test = VOICE_MAX_MINS[key];
            filtered[key] = test.default;
            if (key in params) {
                let p = parseFloat( params[key] );
                if (p >= test.min && p <= test.max) {
                    filtered[key] = p;
                }
            }
        }
            // makes sure handlers are functions
            // NOTE: this presumes that the passed events are in {event : function, ev:fn...} form while elsewhere they're not
        for (const uev of utteranceEventTypes) {
            if (uev in params && typeof params[uev] === 'function') {
                filtered.handlers[uev] = params[uev];
            }
        }

        return filtered;
    }

        // immediate ignores speaking and paused and throws it into the queue


        // turns a string, object or utterance into this.utterance
        // and adds any custom handlers as well as native end and error

// remove the 'this' aspect
    #create_utterance(pack, extraData = {}) {
        this.oldUtterance = this.utterance;
        let utterance;

        if ( typeof pack === 'string' ) {
           utterance = new SpeechSynthesisUtterance(pack);
           SPEECHER_log("create_utterance(): PACK IS STRING");
        } else if (pack instanceof SpeechSynthesisUtterance) {
            SPEECHER_log("create_utterance(): PACK IS utterance");
            utterance = pack;
        } else if (hasProperty(pack, 'msg')) {	// obj I'm guessing
            SPEECHER_log("create_utterance(): PACK IS object", pack);	// NOTE here pack handlers are {event:function, event2:function} which I'm not too fussed on.
            let u = new SpeechSynthesisUtterance(pack.msg);	// might be the garbage collection issue

            let p = this.#validate_params(pack);
            this.#utterance_add_handlers(u, p.handlers);

// console.log("PACK AFTER VALIDATE", p);	// NOTE here pack handlers are {event:function, event2:function} which I'm not too fussed on.
            u.pitch = p.pitch; u.rate = p.rate; u.volume = p.volume;
            u.voice = p.voice;  // validate selects the voice
            utterance = u;
// console.log("VOICE USING", u.voice, p.voiceURI, this.voiceMap);
        } else {
            SPEECHER_log("create_utterance(): ERROR: speech pack is unknown", pack);
            return false;
        }

           // add extra info such as users, msgid, etc
        //Object.apply(this.utterance, extraData);    // all know this is going to change to
        utterance.extradata = extraData;

            // workaround for garbage collection?//TTS_GLOBAL_UTTERANCE = this.utterance;

            // add our two default handlers
        utterance.addEventListener('end', e => {
            this.#isSpeaking = false;
            //console.log(m("UTTERANCE END EVENT") + ` for ${e.utterance.queueid} : ${e.utterance.text}`);
            cclog("UTTERANCE END EVENT", "m");
        });
        utterance.addEventListener('error', e => {
            this.#isSpeaking = false;
            SPEECHER_log("UTTERANCE ERROR ", e);
        });

        this.#utterance_add_handlers(utterance, this.#utterance_handlers);

        //return true;
        return utterance;
    }


        // validate is a function?	No, it's done before
    #utterance_add_handlers(utterance, handlers) {
        for (const [ev, fn] of handlers) {
            if (utteranceEventTypes.includes(ev)) {
                //u.addEventListener(ev, handlers[ev]);
                utterance.addEventListener(ev, fn);
            }
        }
    }

    #find_default_voice() {
        let v =	this.voices.find(v => v.default);

        if (!v) {
            let lang = navigator.language || navigator.languages[0] || navigator.userLanguage;
            v = this.voices.find(v => v.lang === lang);
        }
        if (!v) {
            v = this.voices[0];
        }

        this.voiceDefault = v;
    }



    // ************** EVENTS ************** //

        /**
         * Adds events to all utterances provided as an object with the keys as the events
         * Multiple handlers for the same event will require multiple calls
         * e.g {error: e => some_func(), end: end_handler}
         * Events are boundary end error mark pause resume start
         * @param {object} evs
         */

    utteranceOn(evs) {
        utteranceEventTypes.forEach( ev => {
            if (evs[ev] && typeof evs[ev] === 'function') {
                //this.#utterance_handlers[ev] = evs[ev];	// add an object with the handler type
                console.log("ADDING EVENT: ", ev);
                this.#utterance_handlers.push( [ev, evs[ev]] )	;// = evs[ev];
            }
        })
    }

    // *** Speecher events **** //

    emit(event, data) {
        let e = new CustomEvent(event, {detail: data});
        this.#eventDummy.dispatchEvent(e);
    }

    // adds to the events I'll fire using emit()

    addEventListener(event, fn) {
        this.#eventDummy.addEventListener(event, fn)
    }

         // sets the onvoicechange event handler if present

    #set_onvoices_changed_handler() {
        let count = 1;

        if (hasProperty(this.ss, 'onvoiceschanged')) {
            this.ss.addEventListener('voiceschanged', e => {
                let voices = this.ss.getVoices();

                let msg = `voiceschanged ${e.timeStamp}ms on event #${count} with ${voices.length} found.`;
                this.gotVoicesDebug.push(msg);	// debug log

                if (voices.length !== this.voices.length) {
                    this.#set_voices();
                    this.emit("voiceschanged", { debug: msg });
                }

                SPEECHER_log("** ONVOICESCHANGED :", msg);
                //clearInterval( this.ovcInterval );	// Let it run
                this.#imReady();
                count++;
            });
        }
    }

}	// CLASS ENDS
