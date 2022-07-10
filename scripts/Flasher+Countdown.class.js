"use strict"
/*
	Actually I'm bundling the flasher and countdown

Can make this generic possibly with the use of an emitter

need div to flash or can create one with given text and inject it.
      <div id="flasher">
        <p>YOU'RE<br>MUTED!</p>
      </div>

new Flasher({
	cooldown: 300,
	message: "Can't\nHear\nYou"	// auto \n to <br>
	tickCallback: some_fn
})

new Countdown

time_add
time_decrease nah
set_time
get_time_remaining
clear
active()

not doing pause / resume
*/

class EventEmitter {
	_events = {};
	debug = true;

	constructor() {
	  //this._events = {};
	}

	on(name, listener) {
	  if (!this._events[name]) {
		this._events[name] = [];
	  }

	  this._events[name].push(listener);
	}
		// alias
	removeListener(name, listener) {
		this.off(name, listener);
	}

	off(name, listenerToRemove) {
		if (!this._events[name]) {
			//throw new Error(`Can't remove a listener. Event "${name}" doesn't exits.`);
			console.warn( `Can't remove a listener. Event "${name}" doesn't exits.` )
			return false;
	  	}
		let lB4 = this._events[name].length;
		const filterListeners = (listener) => listener !== listenerToRemove;
		this._events[name] = this._events[name].filter(filterListeners);
		return lB4 - this._events[name].length
	}

	emit(name, ...data) {
		if (!this._events[name]) {	// should this do an error - it just means there are no subscribers
			//throw new Error(`Can't emit an event. Event "${name}" doesn't exist.`);
			//console.warn(`Can't emit an event. Event "${name}" doesn't exist (has no listeners).`);
			return 0;
	  	}
			if (this.debug) console.log(`event ${name} has ${this._events[name].length} subscribers`);
	  	this._events[name].forEach( cb => cb(...data));

		return this._events[name].length;
	}
}

	/**
	 * Don't faff around with granularity, just one second at a time
	 *
	 * emits tick, finished
	 */

class Countdown extends EventEmitter {
	secondsDefault = 0;

	secondsRemaining = 0;
	_active = false;

	debug = false;

	intervalTimer = null;	// for setInterval

	constructor( secs ) {
		super();	// just in case

		if (secs !== undefined) {
			this.secondsDefault = parseInt(secs);
		}
	}
		// if active and no seconds do nothing
	start(seconds = null) {
		if (seconds !== null) {
			this.secondsDefault = parseInt(seconds)
		}

		this.secondsRemaining = this.secondsDefault;

		if (this._active) {
			return;
		}

		this.intervalTimer = setInterval( this.interval_callback.bind(this) , 1000);

		this._active = true;
		this.interval_callback();
	}

	reset() {
		this.start(this.secondsDefault);
	}

	set_time(seconds) {
		this.secondsRemaining = parseInt(seconds);
	}

	set_default(seconds) {
		this.secondsDefault = parseInt(seconds);
	}

	remaining() {
		return this.secondsRemaining;
	}

	add_secs(secs) {
		this.secondsRemaining += parseInt( secs )
	}

	active() {
		return this._active;
	}

	stop() {
		clearInterval(this.intervalTimer);
	}

		// remember to binding
	interval_callback() {
		if (!this._active) {	console.error("countdown interval timer WILL THIS EVER HAPPEN");
			clearInterval(this.intervalTimer);
			return;
		}

		this.emit('tick', this.secondsRemaining)
		if (this.debug) console.debug("ticking", this.secondsRemaining);

		if (this.secondsRemaining <= 0) {
			this._active = false;
			clearInterval(this.intervalTimer);
			this.emit('finished')

			return;
		}

		this.secondsRemaining--;
	}
}




	/**
	 * params in object secs and div which is the id of the flasher div
	 */


class Flasher {
	FLASH_DURATION = 2500;
	FLASHER_DIV_ID = 'flasher'

	flashActive = false;
	flashSetTimeout = null;

	constructor(params = { secs: 2.5, div: 'flasher' }) {
		if ("secs" in params)
			this.FLASH_DURATION = parseFloat( params.secs ) * 1000;

		if ("div" in params)
			this.FLASHER_DIV_ID = params.div;

		this.init_flasher_tech()
	}

	init_flasher_tech() {        // if a flasher is there set up a func
		let flasherDiv = gid(this.FLASHER_DIV_ID);

		if (flasherDiv) { console.log('FLASHER ASSIGNED');
			flasherDiv.onclick = this.stop_flash;  // allow a click to cancel
		} else console.warn("Flasher couldn't find a div with id", FLASHER_DIV_ID)
	}

	start_flash() {
		clearTimeout(this.flashSetTimeout);
		gid('flasher').classList.add('flasher');

		this.flashSetTimeout = setTimeout(this.stop_flash, this.FLASH_DURATION);
	}

	stop_flash() {
		let flashBox = gid('flasher');
		flashBox.classList.remove('flasher');
		clearTimeout(this.flashSetTimeout);
	}

}// flasher ends

/*

#flasher {
	display: none;
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: chartreuse;
	border: 26px solid rgb(81, 7, 116);
	font-size: 20vw;
	line-height: 30vh;
	font-weight: 1000;
	color: white;
	text-align: center;
	text-shadow: 5px 5px 5px #000;
	z-index: 1;
}
#flasher p {
	margin: 0;
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}

.flasher {
	display: block !important;
}
.flasher {
	-webkit-animation: yellow-fade 0.7s ease-in-out 0s;
	-moz-animation: yellow-fade 0.7s ease-in-out 0s;
	-o-animation: yellow-fade 0.7s ease-in-out 0s;
	animation: yellow-fade 0.7s ease-in-out 0s 10;
 }

@-webkit-keyframes yellow-fade {
	from {
	  background: rgba(238, 39, 13, 0);
	}
	to {
	  background: rgb(255, 0, 0);
	}
  }
  @-moz-keyframes yellow-fade {
	from {
	  background: rgba(238, 39, 13, 0);
	}
	to {
	  background: rgb(221, 0, 0);
	}
  }
  @keyframes yellow-fade {
	from {
	  background: rgba(238, 39, 13, 0);
	}
	to {
	  background: rgb(226, 90, 0);
	}
  }

*/