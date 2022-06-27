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
 *
 *
 */

{	// scope
	const hasProperty = (target = {}, prop) => prop in target || Object.hasOwn(target, prop) || !!target[prop]
	const OVC = 'onvoiceschanged';			// tired of typing and mistyping these
	const SS = window.speechSynthesis;
	const GETVOICES_MAX_TIMEOUT = 3000;
	const GETVOICES_CHECK_PERIOD = 250;

	const utteranceEvents = ['boundary', 'end', 'error', 'mark', 'pause', 'resume', 'start']

	const SPEECHER_log = function() { console.log(...arguments); }
	//const SPEECHER_Log = l => l;	// if you don't want logging

	class Speecher {
		ss = SS;
		speechQueue = [];
		utterance = new SpeechSynthesisUtterance();

		isSpeaking = false;
		isPaused = false;

		voices = [];
		voiceDefault = null;

		initialised = false;

		_ovcInterval = null;	// for using the timer
		_voicesPromise = null;
		_readyResolve = null;
		_readyReject = null;
		_amIReady = null;

		_handlers = [];	// on events

		gotVoicesDebug = '';	// set with a string about how the voices were found

		constructor(args = {maxTimeout: GETVOICES_MAX_TIMEOUT, period: GETVOICES_CHECK_PERIOD}) {
			this.ss.cancel();	// necessary if paused before reloading page
			//this.ss.resume();
			this._amIReady = new Promise( (res, rej) => {
				this._readyResolve = res;
				this._readyReject = rej;
			});

			this._set_onvoices_changed()
			this._voicesGetTimer(args)
				// trigger for browsers that don't fire OVC
			this.voices = this.ss.getVoices();
		}

			// sets the onvoicechange event handler if present

		_set_onvoices_changed() {
			if (hasProperty(SS, OVC)) {
				this.ss.addEventListener(OVC, e => {
					SPEECHER_log("INITIALISED VOICES with OVC ", this.voices.length, `after ${e.timeStamp} milliseconds`);
					//clearInterval( this.ovcInterval );	// Let it run anyway
					this.gotVoicesDebug += `voiceschange event initialised after ${e.timeStamp}ms `;
					this._imReady();
				});
			}
		}
			// currently letting the timer run even after other methods worked
		_voicesGetTimer(args) {
			let {maxTimeout, period} = args;
			let pCheck = 0;
			let numVoices = 0;

			this._voicesPromise = new Promise((voicesPromiseResolve, voicesPromiseReject) => {
				const _timerIntervalHandler = () => {
					let voices = this.ss.getVoices();

					SPEECHER_log("IN INTERVAL TIMER period", pCheck, "voices: ", voices.length);
						// actually let's keep the timer running
						// more added?
					if (voices.length !== numVoices) {
						//clearInterval(this.ovcInterval);
						this.gotVoicesDebug += `VoiceGetTimer on period ${pCheck} `;
						this._imReady();
						voicesPromiseResolve(this.voices);
						//this.gvReject("WHAT THE HELL!");
						numVoices = voices.length;
					}

					pCheck += period;
					if (pCheck > maxTimeout) {
						clearInterval(this._ovcInterval);

						if (!this.initialised) {
							this.gotVoicesDebug = "FAIL: MAXED OUT";
							this.initialised = true;
							voicesPromiseResolve(false);
							this._readyResolve(false);
							//this.readyReject("ERROR: Could not get voices");
							//voicesPromiseReject( `ERROR: failed to initialise voices after ${maxTimeout}ms` );
						}
					}
				}

				this._ovcInterval =  setInterval( _timerIntervalHandler, period);
			})
		}

			// promise before initialised

		getVoices() {
			if (this.initialised) {
				return this.ss.getVoices();	// should I use ss?
			}

			return this._voicesPromise;
		}

		ready() {
			return this._amIReady;
		}

		_imReady() {
			this.voices = this.ss.getVoices();
			this._find_default_voice();
			this.initialised = true;
			this._readyResolve(true);
		}

			// add event handlers globally

		on(evs) {
			utteranceEvents.forEach( ev => {
				if (evs[ev] && typeof evs[ev] === 'function') {
					this._handlers[ev] = evs[ev];
				}
			})
		}

		stop() {
			this.isSpeaking = false;
			this.stopNow = true;
			this.ss.cancel();	// removes queue
		}

		pause() {			//this.stopNow = true;
			//this.isSpeaking = false;	// UNSURE
			this.isPaused = true;
			this.ss.pause();
		}

		resume() {			//this.stopNow = false;
			SPEECHER_log("BEFORE RESUME", this.ss);
			//this.ss.pause();
			this.ss.resume();
			this.isPaused = false;
			this._sayQueueProcess();
		}

		cancel() {
			this.ss.cancel();
		}

		reset() {
			this.clear()
		}

		clear() {
			this.speechQueue = [];
		}

			// pack = {text, pitch, rate, voice}

		speak(pack)
		{
			this.stopNow = false;

			if (pack.immediate) {	// push to the front of the queue
				this.speechQueue.unshift(pack);
				this.ss.cancel();	// totally worth it.
			} else {
				this.speechQueue.push(pack);
			}

			SPEECHER_log("Speech Queue", this.speechQueue.length);
			this._sayQueueProcess(pack.immediate);
		}

		say(pack) {
			return this.speak(pack);
		}

		_is_voice(v) {
			return v && v.lang && v.name && v.voiceURI;
		}

		_validate_params(pObj) {		//_validate_params({pitch, rate, volume, voice, ...handlers}) {
			let filtered = { handlers: {} };

			let v = pObj.voice;
			filtered.voice = this._is_voice(v) ? v : this.voiceDefault;

			const maxMins = {
				pitch: {min: 0.5, max: 2.0, default: 1.0},
				rate: {min: 0.1, max: 10.0, default: 1.0},
				volume: {min: 0.0, max: 1.0, default: 1.0}
			}

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

			for (const uev of utteranceEvents) {
				if (uev in pObj && typeof pObj[uev] === 'function') {
					filtered.handlers[uev] = pObj[uev];
				}
			}

			return filtered;
		}

			// immediate ignores speaking and paused and throws it into the queue

		_sayQueueProcess(immediate = false) {
			if ( !immediate && (this.ss.speaking || this.isPaused || this.isSpeaking) ) {
				//SPEECHER_log("Speaking, returning");
				return;
			}

			if (this.stopNow) {
				this.ss.cancel();
				this.isSpeaking = false;
				return;
			}

			// oh my god - I thought shift was broken for sooo long
			let pack = this.speechQueue.shift();

			if (pack) {
				this._process_utterance(pack);

				SPEECHER_log("SPEAKSAY", this.utterance.text);

				this.isSpeaking = true;
				this.ss.speak(this.utterance)
				this.ss.resume();	// this has been necessary
			}
			else {
				this.isSpeaking = false;
			}
		}

		_process_utterance(pack) {
			this.isSpeaking = true;

			// is pack an utterance, object or string
			if ( typeof pack === 'string' ) {
				this.utterance = new SpeechSynthesisUtterance(pack);
				SPEECHER_log("PACK IS STRING");
			} else if (pack instanceof SpeechSynthesisUtterance) {
				SPEECHER_log("PACK IS utterance");
				this.utterance = pack;
			} else if (hasProperty(pack, 'text')) {	// obj I'm guessing
				SPEECHER_log("PACK IS object");
				let u = new SpeechSynthesisUtterance(pack.text);
				let p = this._validate_params(pack);
				this._add_handlers(u, p.handlers);

				u.pitch = p.pitch; u.rate = p.rate; u.volume = p.volume; u.voice = p.voice;

				this.utterance = u;
			} else {
				SPEECHER_log("ERROR: speech pack is unknown", pack);
				this.isSpeaking = false;
				return this._sayQueueProcess();
			}

			this.utterance.addEventListener('end', () => {
				this.isSpeaking = false;
				this._sayQueueProcess()
			});
			this.utterance.addEventListener('error', e => {
				SPEECHER_log("UTTERANCE ERROR ", e);
				this.isSpeaking = false;
				this._sayQueueProcess();
			});

			this._add_handlers(this.utterance, this._handlers);
		}

			// validate is a function?	No, it's done before
		_add_handlers(u, handlers) {
			for (const ev in handlers) {
				if (utteranceEvents.includes(ev)) {
					u.addEventListener(ev, handlers[ev]);
				}
			}
		}

		_find_default_voice() {
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
	}

	globalThis.Speecher = Speecher;
}	// scope end

