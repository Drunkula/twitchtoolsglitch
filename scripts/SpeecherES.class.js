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

import EasySpeech from "./easyspeech.module.js";

{	// scope
	const hasProperty = (target = {}, prop) => prop in target || Object.hasOwn(target, prop) || !!target[prop]
	const OVC = 'onvoiceschanged';			// tired of typing and mistyping these
	const SS = window.speechSynthesis;
	const GETVOICES_MAX_TIMEOUT = 3000;
	const GETVOICES_CHECK_PERIOD = 250;

	const utteranceEventList = ['boundary', 'end', 'error', 'mark', 'pause', 'resume', 'start']

	const SPEECHER_LOGGING = true;

	const SPEECHER_log = SPEECHER_LOGGING ? console.debug : l => l;	// if you don't want logging

	class SpeecherES {
		ss = SS;

		speechQueueID = 0;	// incremented every time speak() is called
		speechQueueMap = new Map();		// IDs lets us easily delete / add

		currentSpeakingID = -1;		// so you can cancel the current uttance

		voices = [];
		voiceDefault = null;

		#isSpeaking = false;
		#isPaused = false;
			// can set true in something like beforespeak - it really should go
		stopNow = false;

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
			// events called every time
		#utteranceHandlersGlobal = { };
			// events called once
		#utteranceHandlersOnce = { };		// added before speak and
			// default events global
		#utterenceHandlersDefaultGlobalLast = {
			end: [() => {this.#isSpeaking = false; this.#sayQueueProcess()}],
			error: [() => {this.#isSpeaking = false; this.#sayQueueProcess()}]
		}

		#cancelNextSpeak = false;	// can be changed during a beforespeak event

			// set up

		constructor(args = {maxTimeout: GETVOICES_MAX_TIMEOUT, period: GETVOICES_CHECK_PERIOD}) {
			// easyspeech init

			this.#amIReady = EasySpeech.init()
				.then( () => { this.#imReady(); });

			/* this.#amIReady = new Promise( (res, rej) => {
				this.#readyResolve = res;
				this.#readyReject = rej;
			}); */

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

					SPEECHER_log("- SpeecherES TIMER period", iTmrMSecs, "voices: ", voices.length, "current", this.voices.length);
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

			//this.#readyResolve(true);
			this.#voicesPromiseResolve(this.voices);

			this.emit('ready');
		}

			// add event handlers globally takes object
			// { event : fn , event2 : fn} so multiple calls for same event

		on(evs, once) {
			let evList = once ? this.#utteranceHandlersOnce : this.#utteranceHandlersGlobal;

			utteranceEventList.forEach( ev => {
				if (evs[ev] && typeof evs[ev] === 'function') {
					console.log("event pushing:", ev);

					if (Array.isArray( evList[ev] ) ) {
						evList[ev].push( evs[ev] );
					} else {
						evList[ev] = [ evs[ev] ]
					}
				}
			})
		}
			// lazy way of adding events once
		onOnce(evs) {
			this.on(evs, true);
		}

		stop() {
			this.#isSpeaking = false;
			this.stopNow = true;
			EasySpeech.cancel();
		}

		pause() {			//this.stopNow = true;
			//this.isSpeaking = false;	// UNSURE
			this.#isPaused = true;
			EasySpeech.pause();
		}

		resume() {			//this.stopNow = false;
			EasySpeech.resume();
			this.#isPaused = false;
			this.#sayQueueProcess();
		}
			// cancels the current speaking voice - end event will trigger
		cancel() {
			EasySpeech.cancel();
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

			// pack = {text, pitch, rate, voice, volume, handlers}, string or utterance
			// Returns ID of speech queue entry
			// pack can now contain handlers

		speak(pack)
		{
			this.stopNow = false;

				// if it's immediate put an earlier ID into the queue
			this.speechQueueID++;

			pack.queueid = this.speechQueueID;

				// immediate puts to the front of the map

			if (pack.immediate) {
				EasySpeech.cancel();
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

		#clamp_voice_params(pack) {		//_validate_params({pitch, rate, volume, voice, ...handlers}) {
			if ( !this.#is_voice(pack.voice) ) {
				pack.voice =  this.voiceDefault;
			}

			const maxMins = {
				pitch: {min: 0.5, max: 2.0, default: 1.0},
				rate: {min: 0.1, max: 10.0, default: 1.0},
				volume: {min: 0.0, max: 1.0, default: 1.0}
			}

			for (const key in maxMins) {
				const test = maxMins[key];

				if (key in pack) {
					let p = parseFloat( pack[key] );
					if (p < test.min || p > test.max) {
						pack[key] = test.default;
					}
				}
			}

			return pack;
		}

			// immediate ignores speaking and paused and throws it into the queue

		#sayQueueProcess(immediate = false) {
			//if ( !immediate && (this.ss.speaking || this.#isPaused || this.#isSpeaking) ) {
			if ( !immediate && (this.#isPaused || this.#isSpeaking) ) {
				SPEECHER_log("Speaking, returning");
				return;
			}

			if (this.stopNow) {
				EasySpeech.cancel();
				this.#isSpeaking = false;
				return;
			}

			this.#isSpeaking = false;
				// I hate doing a while
			for ( let [id, pack] of this.speechQueueMap.entries() ) {
				if (!pack) {
					continue;
				}
				this.speechQueueMap.delete(id);

				pack = this.#process_pack(pack);

				if ( !pack ) {
					continue;	// pack was bad
				}

//				SPEECHER_log("Speech Queue AFTER", this.speechQueueMap.size);
				this.currentSpeakingID = id;

					// emit that we're about to speak and check for a cancel
				this.#cancelNextSpeak = false;
				this.emit('beforespeak', { id, pack });
					// they can call this.cancel_next() to stop this utterance or add events
				if (this.#cancelNextSpeak) {
					continue;
				}

				this.#isSpeaking = true;

				pack = this.#pack_add_handlers(pack);

					// we need to add our local handlers to the pack and take out the ones passed
console.log("PACK BEFORE SPEECH", pack);
				EasySpeech.speak(pack);

				//this.ss.resume();	// this has been necessary, I think

				break;
			}
		}

			// turns a string or object into just the params for an utterance
			// and handlers are added to the #utteranceHandlersNext

		#process_pack(pack) {
				// is pack an utterance, object or string
			if ( typeof pack === 'string' ) {
				pack = {text: pack}
				//SPEECHER_log("PACK IS STRING");
			} else if (hasProperty(pack, 'text')) {	// obj I'm guessing
				//SPEECHER_log("PACK IS object");	// NOTE here pack handlers are {event:function, event2:function} which I'm not too fussed on.
			} else {
				SPEECHER_log("ERROR: speech pack is unknown", pack);
				console.error("ERROR: speech pack is unknown", pack)
				return {text: ''};
			}

			pack = this.#clamp_voice_params(pack);

			return pack;
		}

			// validate is a function?	No, it's done before
		#pack_add_handlers(pack) {	// u, handlers) {
			// create an uber object to be processed by events
			for (let event of utteranceEventList) {
				let eventPack = [];
						// crucial to be FIRST in the handler queue
				if (event === 'start' || event === 'error') {
					eventPack = [e => e.target.queueid = pack.queueid];
				}

				if ( typeof pack[event] === 'function' )
					eventPack.push(pack[event]);

				if ( !Array.isArray(this.#utteranceHandlersGlobal[event]) )
					this.#utteranceHandlersGlobal[event] = [];

				if ( !Array.isArray(this.#utteranceHandlersOnce[event]) )
					this.#utteranceHandlersOnce[event] = [];

				eventPack = [...eventPack, ...this.#utteranceHandlersOnce[event], ...this.#utteranceHandlersGlobal[event] ]

				if (this.#utterenceHandlersDefaultGlobalLast[event]) {
					eventPack = [...eventPack, ...this.#utterenceHandlersDefaultGlobalLast[event]];
				}

					// call each event from one callback
				if (eventPack.length) {
					pack[event] = (e) => {
//						console.log("Event.type", e.type, "handlers: ", eventPack.length);
						for(let handler of eventPack) {
							handler(e);
						}
					}
				} else {
					delete pack[event];
				}
			}

			delete pack.handlers;
			this.#utteranceHandlersOnce = [];

			return pack;
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
				this.#isSpeaking = false;
				EasySpeech.cancel();
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
	TT.Speecher = SpeecherES;
}	// scope end

