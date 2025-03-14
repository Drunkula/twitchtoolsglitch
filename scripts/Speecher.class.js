/**
 * My Speech engine with bits learned from EasySpeech
 *
 * Basically setting up getVoices with a delay if onvoiceschanged isn't availabled
 *
 *	Normally onvoiceschanged is triggered in under a second
 *
 * 	Firefox can't be trusted to use SpeechSynthesis.speaking so isSpeaking is back
 *	On an utterance error make sure to set isSpeaking false and process the queue
 *
 * 	NOTE: easyspeech says long texts stall in some browsers and calls pause() resume() every 5 seconds
 *
 * 	EDGE has random onvoiceschanged that's causing my selects to repopulate, check the number of voices has actually changed
 *
 * 	TODO
 * 		add events externally
 *
 *	In the pack you can specify {immediate: true} which will cancel, possibly add { saynext: true }
 *
 * NOTE queueid is added to each utterance
 *
 *
 * EVENTS the speecher has.  Use addEventListener(what, fn);
 * 	ready - the speecher is ready
 * 	voiceschanged - the number of found voices has been updated.  Edge causes this to happen too often
 * 	beforespeak - the utterance is ready to be fired.  Watchers can modify it or cancel with cancel_next()
 *  cancelled - cancel_next was called on the about to be spoken pack
 * 	cancelledcurrent - the current talking voice has been cancelled
 * 	rejected - the speech pack was bad
 *
 * .utteranceOn() adds events that will be applied to the utterance.  Takes {eventname:fn, ...}
 *
 *
 * NOTE: A new utterance is created every time.  Reuse is allowed but some browsers may have problems
 *
 * THE CODE IS A MESS:
 * 	some funcs return filtered / checked data
 *	some funcs modify the utterance or our properties
 */
"use strict"
	// these are an attempt to fix the failed end events with Edge does it fix it?  No.
//var TTS_GLOBAL_UTTERANCE;
//var TTS_GLOBAL_UTTERANCE_OLD;
//var TTS_GLOBAL_UTTERANCE_ARRAY = [];

{	// scope
	const hasProperty = (target = {}, prop) => prop in target || Object.hasOwn(target, prop) || !!target[prop];
	const OVC = 'onvoiceschanged';			// tired of typing and mistyping these
	const SS = window.speechSynthesis;
	const GETVOICES_MAX_TIMEOUT = 3000;
	const GETVOICES_CHECK_PERIOD = 250;

	const utteranceEventTypes = ['boundary', 'end', 'error', 'mark', 'pause', 'resume', 'start']

	const SPEECHER_LOGGING = false;

	const SPEECHER_log = SPEECHER_LOGGING ? console.debug : l => l;	// if you don't want logging

	class Speecher {
		ss = SS;

		speechQueueID = 0;	// incremented every time speak() is called
		speechQueueMap = new Map();		// IDs lets us easily delete / add

		currentSpeakingID = -1;		// so you can cancel the current utterance

		utterance = null; 		// new SpeechSynthesisUtterance();
		oldUtterance = null;	// to stop the old utterance being garbage collected before end event
		voices = [];
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

			// sets the onvoicechange event handler if present

		#set_onvoices_changed_handler() {
			let count = 1;

			if (hasProperty(SS, OVC)) {
				this.ss.addEventListener('voiceschanged', e => {
					let voices = this.ss.getVoices();

					let msg = `voiceschanged ${e.timeStamp}ms on event #${count} with ${voices.length} found.`;
					this.gotVoicesDebug.push(msg);	// debug log

					if (voices.length !== this.voices.length) {
						this.voices = voices;
						this.emit("voiceschanged", { debug: msg });
					}

					SPEECHER_log("** ONVOICESCHANGED :", msg);
					//clearInterval( this.ovcInterval );	// Let it run
					this.#imReady();
					count++;
				});
			}
		}

			// currently letting the timer run even after other methods worked

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

						this.voices = voices;

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
			// this.voices = this.ss.getVoices();
			this.#find_default_voice();
			this.initialised = true;

			this.#readyResolve(true);
			this.#voicesPromiseResolve(this.voices);

			this.emit("ready");
		}

		stop() {
			this.#isSpeaking = false;
			this.stopNow = true;
			this.ss.cancel();
		}

		pause() {			//this.stopNow = true;
			this.isSpeaking = false;	// UNSURE
			this.#isPaused = true;
			this.ss.pause();
		}

		resume() {			//this.stopNow = false;
			this.ss.resume();
			this.#isPaused = false;
			this.sayQueueProcess();
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

		speak(pack)
		{
			this.stopNow = false;

				// if it's immediate put an earlier ID into the queue
			this.speechQueueID++;

				// immediate puts to the front of the map

			if (pack.immediate) {
				this.ss.cancel();	// stop the current voice
				pack.saynext = true;
			}
				// saynext without immediate will not top the current voice
				// WHEN IT WAS JANKY the packs were being passed by reference, now a next object is created
				// that could be overcome with pack = {...pack} in this method but I want to keep a janky version
			if (pack.saynext) {
				this.speechQueueMap = new Map( [ [this.speechQueueID, pack], ...this.speechQueueMap ] );
			} else {
				this.speechQueueMap.set(this.speechQueueID, pack);
			}

			SPEECHER_log("Speech Queue", this.speechQueueMap.size);
			this.sayQueueProcess(pack.immediate);

			return this.speechQueueID;
		}
			// alias
		say(pack) {
			return this.speak(pack);
		}
			// test SpeechSynthesis voice (EasySpeech method)
		#is_voice(v) {
			return v && v.lang && v.name && v.voiceURI;
		}

			// returns filtered voice, pitch, volume, rate and utterance handlers

		#validate_params(params) {		//_validate_params({pitch, rate, volume, voice, ...handlers}) {
			let filtered = { handlers: [] };

			let v = params.voice;
			filtered.voice = this.#is_voice(v) ? v : this.voiceDefault;

			const maxMins = {
				pitch: {min: 0.5, max: 2.0, default: 1.0},
				rate: {min: 0.1, max: 10.0, default: 1.0},
				volume: {min: 0.0, max: 1.0, default: 1.0}
			}

			for (const key in maxMins) {
				const test = maxMins[key];
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

		sayQueueProcess(immediate = false) {
			if ( !immediate && (this.ss.speaking || this.#isPaused) ) { // || this.#isSpeaking) ) {
				console.log("Not speaking as not immediate, am speaking or paused.");
				return;
			}

			this.#isSpeaking = false;

			if (this.stopNow) {
				this.ss.cancel();
				return;
			}
				// I hate doing a while
				// is deleting from the Map while iterating through it a bad idea?  No.  The iterator uses Next()

			for ( const [id, pack] of this.speechQueueMap.entries() ) {
				this.speechQueueMap.delete(id); // needs to happen immediately
				/* Removing this for now Oct 23 and always deleting.  Maybe it's the cause of the madness
				if (!pack) { // what exactly is this test ? I used to do this BEFORE the map delete
					continue;
				} */

// SHOULD I EMIT A "BAD ENTRY" so that any visually queued entries can be deleted.  I think so
				if ( !this.#process_utterance(pack) ) {
					this.emit("rejecting", { id, pack });
					continue;	// pack was bad
				}
					// ABOVE process utterance sets this.utterance
				this.utterance.lang = this.utterance.voice?.lang ? this.utterance.voice.lang : 'en-GB';  // Android needs lang

				this.currentSpeakingID = id;
				this.utterance.queueid = id;

					// emit that we're about to speak and check for a cancel
					// listeners can call this.cancel_next() to stop this utterance
				this.#cancelNextSpeak = false;
				this.emit("beforespeak", { id });
				if (this.#cancelNextSpeak) {
					this.emit("cancelled", id);
					continue;
				}

				this.#isSpeaking = true;
				this.ss.speak(this.utterance)
				this.ss.resume();	// this has been necessary, I think

				break;
			}
		}

			// turns a string, object or utterance into this.utterance
			// and adds any custom handlers as well as native end and error

		#process_utterance(pack) {
			this.oldUtterance = this.utterance;
//TTS_GLOBAL_UTTERANCE_OLD = this.utterance;

				// is pack an utterance, object or string
			if ( typeof pack === 'string' ) {
				this.utterance = new SpeechSynthesisUtterance(pack);
				SPEECHER_log("PACK IS STRING");
			} else if (pack instanceof SpeechSynthesisUtterance) {
				SPEECHER_log("PACK IS utterance");
				this.utterance = pack;
			} else if (hasProperty(pack, 'text')) {	// obj I'm guessing
				SPEECHER_log("PACK IS object", pack);	// NOTE here pack handlers are {event:function, event2:function} which I'm not too fussed on.
				let u = new SpeechSynthesisUtterance(pack.text);	// might be the garbage collection issue

				let p = this.#validate_params(pack);
				this.#utterance_add_handlers(u, p.handlers);

				u.pitch = p.pitch; u.rate = p.rate; u.volume = p.volume; u.voice = p.voice;

				this.utterance = u;
			} else {
				SPEECHER_log("ERROR: speech pack is unknown", pack);
				return false;
			}

				// workaround for garbage collection?
//TTS_GLOBAL_UTTERANCE = this.utterance;

				// add our two default handlers
			this.utterance.addEventListener('end', (e) => {
				//console.log(m("UTTERANCE END EVENT") + ` for ${e.utterance.queueid} : ${e.utterance.text}`);
				this.#isSpeaking = false;
				this.currentSpeakingID = -1;
				this.sayQueueProcess()
			});
			this.utterance.addEventListener('error', e => {
				SPEECHER_log("UTTERANCE ERROR ", e);
				this.#isSpeaking = false;
				this.currentSpeakingID = -1;
				this.sayQueueProcess();	// CRITICAL
			});

			this.#utterance_add_handlers(this.utterance, this.#utterance_handlers);

			return true;
		}

			// validate is a function?	No, it's done before
		#utterance_add_handlers(u, handlers) {
			for (const [ev, fn] of handlers) {
				if (utteranceEventTypes.includes(ev)) {
					//u.addEventListener(ev, handlers[ev]);
					u.addEventListener(ev, fn);
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

			// call during a "beforespeak" event to cancel the next speaking voice

		cancel_next() {
			this.#cancelNextSpeak = true;
		}

			// cancel by id if it's in the shifting id queue it doesn't matter
			// returns TRUE if it was speaking the message

		cancel_id(id) {
			id = parseInt(id);
			this.speechQueueMap.delete( id );

			if ( this.currentSpeakingID === id ) {
				this.#isSpeaking = false;
				this.ss.cancel();			// cancel calls end handler? it seems to
				//this._sayQueueProcess();	// don't know if I need this, does cancel fire the end event?
				this.emit("cancelledcurrent", {"id" : id,
					"utterance" : this.utterance
				});

				//this.currentSpeakingID = -1;

				return true;
			}

			return false;
		}

		queue_length() {
			return this.speechQueueMap.size;
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
			let e = new CustomEvent(event, { detail: {
				...data,
				target: this,
				utterance: this.utterance,
				queue: this.speechQueueMap,
				voices: this.voices }
			});

			this.#eventDummy.dispatchEvent(e);
		}

		addEventListener(event, fn) {
			this.#eventDummy.addEventListener(event, fn)
		}

		next_id() {
			return this.speechQueueID + 1;
		}
	}	// CLASS ENDS


	//globalThis.Speecher = Speecher;
	TT.Speecher = Speecher;
}	// scope end

