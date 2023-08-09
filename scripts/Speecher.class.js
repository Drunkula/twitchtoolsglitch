/**
 * ERRORS: Where could they be?  Utterance is stored globally and in the this.utterance
 *
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
 * beforespeak - allows you to examine the utterance and call cancel_next()
 * queueing not implemented
 * voiceschanged (if number changes)
 * ready
 *
 *	In the pack you can specify {immediate: true} which will cancel, possibly add { saynext: true }
 *
 * NOTE queueid is added to each utterance
 */
"use strict"
	// these are an attempt to fix the failed end events with Edge does it fix it?  No.  So Maybe remove them
	// they were there to avoid garbage disposal
var TTS_GLOBAL_UTTERANCE;
var TTS_GLOBAL_UTTERANCE_OLD


{	// scope
	const hasProperty = (target = {}, prop) => prop in target || Object.hasOwn(target, prop) || !!target[prop]
	const OVC = 'onvoiceschanged';			// tired of typing and mistyping these
	const SS = window.speechSynthesis;
	const GETVOICES_MAX_TIMEOUT = 3000;
	const GETVOICES_CHECK_PERIOD = 250;

	const utteranceEvents = ['boundary', 'end', 'error', 'mark', 'pause', 'resume', 'start']

	const SPEECHER_LOGGING = true;

	const SPEECHER_log = SPEECHER_LOGGING ? console.debug : l => l;	// if you don't want logging

	class Speecher {
		ss = SS;

		speechQueueID = 0;	// incremented every time speak() is called
		speechQueueMap = new Map();		// IDs lets us easily delete / add

		currentSpeakingID = -1;		// so you can cancel the current uttance

		utterance = null; 		// new SpeechSynthesisUtterance();
		oldUtterance = null;	// to stop the old utterance being garbage collected before end event

		voices = [];
		voiceDefault = null;

		#isSpeaking = false;
		#isPaused = false;

		initialised = false;
		gotVoicesDebug = [];	// set with a string about how the voices were found

		#ovcInterval = null;	// for using the timer
		#voicesPromise = null;
		#voicesPromiseResolve = null;

		#readyResolve = null;
		#readyReject = null;
		#amIReady = null;
			// for adding events listeners
		#eventDummy = document.createElement('SpeecherEvents');
		#utterance_handlers = [];	// on events for utterances
		#cancelNextSpeak = false;	// can be changed during a beforespeak event


			// set up

		constructor(args = {maxTimeout: GETVOICES_MAX_TIMEOUT, period: GETVOICES_CHECK_PERIOD}) {
			this.ss.cancel();	// necessary if paused before reloading page
			//this.ss.resume();
			this.#amIReady = new Promise( (res, rej) => {
				this.#readyResolve = res;
				this.#readyReject = rej;
			});

			this.#set_onvoices_changed_handler()
			this.#voicesInitOnTimer(args)
		}

			// sets the onvoicechange event handler if present

		#set_onvoices_changed_handler() {
			let count = 1;

			if (hasProperty(SS, OVC)) {
				this.ss.addEventListener('voiceschanged', e => {
					let voices = this.ss.getVoices();

					let msg = `voiceschange ${e.timeStamp}ms on event #${count} with ${voices.length} found.`;
					this.gotVoicesDebug.push(msg)

					if (voices.length !== this.voices.length) {
						this.voices = voices;
						this.emit('voiceschanged', { debug: msg });
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
						SPEECHER_log(msg);
						this.gotVoicesDebug.push( msg );
						this.#imReady();
						this.emit('voiceschanged', { debug: msg });
					}

					iTmrMSecs += period;
					if (iTmrMSecs > maxTimeout) {
						clearInterval(this.#ovcInterval);

						if (!this.initialised) {
							this.gotVoicesDebug.push( "FAIL: MAXED OUT" );
							this.initialised = true;
							voicesPromiseResolve(false);
							this.#readyResolve(false);
						}
					}
				}

				this.#ovcInterval =  setInterval( _timerIntervalHandler, period);
				_timerIntervalHandler();
			})
		}

			// promise before initialised

		getVoices() {
			if (this.initialised) {
				return this.ss.getVoices();	// should I use ss?
			}
			return this.#voicesPromise;
		}
			// returns promise
		ready() {
			return this.#amIReady;
		}

		#imReady() {
			this.voices = this.ss.getVoices();
			this.#find_default_voice();
			this.initialised = true;

			this.#readyResolve(true);
			this.#voicesPromiseResolve(this.voices);

			this.emit('ready');
		}

			// add event handlers globally takes object { event : fn , event2 : fn} so multiple calls for same event

		on(evs) {
			utteranceEvents.forEach( ev => {
				if (evs[ev] && typeof evs[ev] === 'function') {
					//this.#utterance_handlers[ev] = evs[ev];	// add an object with the handler type
					console.log("Adding utterance event with on()", ev);
					this.#utterance_handlers.push( [ev, evs[ev]] )	;// = evs[ev];
				}
			})
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
			this.#sayQueueProcess();
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

			if (pack.saynext) {
				this.speechQueueMap = new Map( [ [this.speechQueueID, pack], ...this.speechQueueMap ] );

			} else {
				this.speechQueueMap.set(this.speechQueueID, pack);
			}

			SPEECHER_log("Speech Queue", this.speechQueueMap.size);
			this.#sayQueueProcess(pack.immediate);

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

		#validate_params(pObj) {		//_validate_params({pitch, rate, volume, voice, ...handlers}) {
			//let filtered = { handlers: {} };
			let filtered = { handlers: [] };

			let v = pObj.voice;
			filtered.voice = this.#is_voice(v) ? v : this.voiceDefault;

			const maxMins = {
				pitch: {min: 0.5, max: 2.0, default: 1.0},
				rate: {min: 0.1, max: 10.0, default: 1.0},
				volume: {min: 0.0, max: 1.0, default: 1.0}
			}
				// sets params to default if they exceed the max and min.  maybe I should clamp instead
			for (const key in maxMins) {
				const test = maxMins[key];
				filtered[key] = test.default;
				if (key in pObj) {
					let p = parseFloat( pObj[key] );
				 	if (p >= test.min && p <= test.max) {
						filtered[key] = p;
					}
				}
			}
				// makes sure handlers are functions
				// NOTE: this presumes that the passed events are in {event : function, ev:fn...} form while elsewhere they're not
			for (const uev of utteranceEvents) {
				if (uev in pObj && typeof pObj[uev] === 'function') {
					filtered.handlers[uev] = pObj[uev];
				}
			}

			return filtered;
		}

			// immediate ignores speaking and paused and throws it into the queue

		#sayQueueProcess(immediate = false) {
				// if it's already speaking return unless immediate is specified
			if ( !immediate && (this.ss.speaking || this.#isPaused || this.#isSpeaking) ) {
				//SPEECHER_log("Speaking, returning");
				return;
			}

			if (this.stopNow) {
				this.ss.cancel();
				this.#isSpeaking = false;
				return;
			}

			this.#isSpeaking = false;
				// I hate doing a while
			for ( const [id, pack] of this.speechQueueMap.entries() ) {
				if (!pack) {
					continue;
				}
				this.speechQueueMap.delete(id);

				if ( !this.#process_utterance(pack) ) {
					continue;	// pack was bad
				}
//console.log("THIS UTTERANCE", this.utterance);
				this.utterance.lang = this.utterance.voice?.lang ? this.utterance.voice.lang : 'en-GB';  // Android needs lang

//				SPEECHER_log("Queue ABOUT TO SAY:", this.utterance.text, this.utterance);
//				SPEECHER_log("Speech Queue AFTER", this.speechQueueMap.size);

				this.currentSpeakingID = id;
				this.utterance.queueid = id;
					// emit that we're about to speak and check for a cancel
				this.#cancelNextSpeak = false;
					// the utterance may be modified by receivers of he beforespeak event
				this.emit('beforespeak', { id });
					// they can call this.cancel_next() to stop this utterance
				if (this.#cancelNextSpeak) {
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
			TTS_GLOBAL_UTTERANCE_OLD = this.utterance;

				// is pack an utterance, object or string
			if ( typeof pack === 'string' ) {
				this.utterance = new SpeechSynthesisUtterance(pack);
				//SPEECHER_log("PACK IS STRING");
			} else if (pack instanceof SpeechSynthesisUtterance) {
				//SPEECHER_log("PACK IS utterance");
				this.utterance = pack;
			} else if (hasProperty(pack, 'text')) {	// obj I'm guessing
				//SPEECHER_log("PACK IS object");	// NOTE here pack handlers are {event:function, event2:function} which I'm not too fussed on.
				let u = new SpeechSynthesisUtterance(pack.text);	// might be the garbage collection issue

				let p = this.#validate_params(pack);
				this.#utterance_add_handlers(u, p.handlers);

				u.pitch = p.pitch; u.rate = p.rate; u.volume = p.volume; u.voice = p.voice;

				this.utterance = u;
			} else {
				SPEECHER_log("ERROR: speech pack is unknown", pack);
				this.utterance = new SpeechSynthesisUtterance("Error error error process utterance is where the bug is, tell Drunkula");
				TTS_GLOBAL_UTTERANCE = new SpeechSynthesisUtterance("Error error global utterance is the problem, tell Drunkula");
				return false;
			}

				// workaround for garbage collection?
			TTS_GLOBAL_UTTERANCE = this.utterance;

				// add our two default handlers
			this.utterance.addEventListener('end', (e) => {
				//console.log(m("UTTERANCE END EVENT") + ` for ${e.utterance.queueid} : ${e.utterance.text}`);
				this.#isSpeaking = false;
				this.#sayQueueProcess()
			});
			this.utterance.addEventListener('error', e => {
				//SPEECHER_log("UTTERANCE ERROR ", e);
				this.#isSpeaking = false;
				this.#sayQueueProcess();	// CRITICAL
			});

			this.#utterance_add_handlers(this.utterance, this.#utterance_handlers);

			return true;
		}

			// validate is a function?	No, it's done before
		#utterance_add_handlers(u, handlers) {
			for (const [ev, fn] of handlers) {
				if (utteranceEvents.includes(ev)) {					//u.addEventListener(ev, handlers[ev]);
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

		cancel_id(id) {
			id = parseInt(id);
			this.speechQueueMap.delete( id );
			if ( this.currentSpeakingID === id ) {
				this.ss.cancel();			// cancel calls end handler? it seems to
				this.#isSpeaking = false;
				//this._sayQueueProcess();	// don't know if I need this, does cancel fire the end event?
			}
		}

		queue_length() {
			return this.speechQueueMap.size;
		}

		// ************** EVENTS ************** //

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

