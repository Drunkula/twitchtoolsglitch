//const MAGIC_CLASS_IGNORED_USERS = '';
//const MAGIC_CLASS_JOIN = '';
//const MAGIC_CLASS_ARRAY_LC = '.toarraylc';	// add to TTVars as an array of lower case
"use strict";
	// doesn't trigger an event
	// Common events
	// ADDS TT.add_event_listeners

(function(ns) {	// SCOPE using jQuery methodology

	const ONCHANGE_URL_UPDATE_DELAY_MS = 100;
	const MAGIC_CLASS_URLPOPULATE_BTN = '.urlpopulate';
	const MAGIC_CLASS_URLPOPULATE_ONCHANGE = '.urlpopulateoc';


	const TT_EVENT_ITEMS = [
		{selector: '#mainform', event: 'submit', function: join_chans_submit_handler, params: {}},

		{selector: '#loglabel', event: 'click', function: () => log('', true), params: {}},

//		{selector: '#channels', event: 'change', function: url_populate_onchange, params: {}},

		{selector: '[data-toarray]', event: 'change', function: set_conf_array, params: {}},
		{selector: '[data-toarraylc]', event: 'change', function: set_conf_array_lc, params: {}},

		{selector: '[data-toint]', event: 'change', function: set_conf_int, params: {}},
		{selector: '[data-tofloat]', event: 'change', function: set_conf_float, params: {}},
		{selector: '[data-tostr]', event: 'change', function: set_conf_string, params: {}},
		{selector: '[data-tostrlc]', event: 'change', function: set_conf_string_lc, params: {}},
		{selector: '[data-tocheckbox]', event: 'change', function: set_conf_checkbox, params: {}},

		{selector: '.urlpopulate', event: 'click', function: ns.url_populate, params: {}},
			// any change in any .form-save value updates the url
		{selector: '.form-save', event: 'change', function: url_populate_onchange, params: {}},
	]

		// adds event listeners - if it's onchange it's triggered

	ns.add_event_listeners = function(events = TT_EVENT_ITEMS) {
		let chEv = new Event('change');
		let inpEv = new Event('input');

		for (const ev of events) {
			let fs = qsa(ev.selector);
			for (const f of fs) {
				f.addEventListener(ev.event, ev.function);
					// array or string then dispatch those events
/* 				if (ev.triggers) {
					// for the future, but for now lazy below
				}
 */					// LAZY, dangerous, might change this to params having triggers
				if (ev.event === 'change') {
					f.dispatchEvent(chEv);
				} else
				if (ev.event === 'input') {
					f.dispatchEvent(inpEv);
				}
			}
		}
	}

		// maps to a bool

	function set_conf_checkbox(e) {//	verify_data_varname(e);
		return TT.set_conf(e.target.dataset.tocheckbox, e.target.checked)
	}

		// maps to int checking max and min

	function set_conf_int(e) {	//verify_data_varname(e);
		let valOrig = e.target.value;	// will be string

		let i = parseInt(e.target.value);

		if ( isNaN(i) ) {
			i = parseInt(e.target.defaultValue);
		}

		if (e.target.max) {
			let m = parseInt(e.target.max);
			if (i > m) {
				i = m;
			}
		}
		if (e.target.min) {
			let m = parseInt(e.target.min);
			if (i < m) {console.log("to int less min");
				i = m;
			}
		}
			// update original if it's a wrongun
		if (i.toString() !== valOrig) e.target.value = i.toString();
			// set the var
		return TT.set_conf(e.target.dataset.toint, i);
	}

		// maps to int checking max and min

	function set_conf_float(e) {	//verify_data_varname(e);
		let valOrig = e.target.value;
		let i = parseFloat(valOrig);

		if ( isNaN(i) ) {
			i = parseFloat(e.target.defaultValue);
		}

		if (e.target.max) {
			let m = parseFloat(e.target.max);
			if (i > m) {
				i = m;
			}
		}

		if (e.target.min) {
			let m = parseFloat(e.target.min);
			if (i < m) {
				i = m;
			}
		}

		if (i.toString() !== valOrig) e.target.value = i.toString();

		return TT.set_conf(e.target.dataset.tofloat, i);
	}


	function set_conf_string_lc(e) {	//verify_data_varname(e);
		return TT.set_conf(e.target.dataset.tostrlc, e.target.value.trim().toLowerCase())
	}

	function set_conf_string(e) {
		return TT.set_conf(e.target.dataset.tostr, e.target.value.trim())
	}

		/**
		 * maps to an array in TMIConfig where fields are lower cased
		 * @param {*} event
		 */

	function set_conf_array_lc(e) {
		let v = e.target.value.toLowerCase();
		let v2a = split_to_array(v);
		TT.set_conf(e.target.dataset.toarraylc, v2a);
	}

	function set_conf_array(e) {	//verify_data_varname(event);
		let v2a = split_to_array(e.target.value);		// allows you to use props.multi.deep
		TT.set_conf(e.target.dataset.toarray, v2a);
		return v2a;
	}

		// string to array of 'usual' characters
	function split_to_array(str) {
		return str.split(/[^a-zA-Z0-9-_]/).filter(e => e);
	}


		// populates the url but on a slight delay - lets other onchange processing happen first

	function url_populate_onchange() {
		let setIval = this.si ? this.si : null;

		clearTimeout(setIval)
		this.si = setTimeout(() => ns.url_populate(), ONCHANGE_URL_UPDATE_DELAY_MS);
	}

		// changes the url link and populates the thingy

	ns.url_populate = function url_populate() {
		let urlParams = TT.inputs_to_uri_string(TT.MAGIC_CLASS_FORM_SAVE, true);

		urlParams = 'autojoin=true&' + urlParams;
			// sets the value in localStorage to use in form values restore
		TT.localstore_save(urlParams);
		let url = window.location.origin + window.location.pathname + '?' + urlParams;

		history.replaceState({}, null, url);
			// fill the link box
		let urlBox = gid('linkurl');
		if (urlBox) urlBox.value = url;
	}


	// common form submit handler for joining channels

	function join_chans_submit_handler(e) {
		e.preventDefault();	// do not remove this

		const joinBtn = gid('join');

		if (joinBtn.disabled)   // debouncing
			return;

		joinBtn.disabled = true;
		setTimeout(()=>joinBtn.disabled = false, TMIConfig.joinDebounceSecs * 1000);

		TT.join_chans();

		gid('logbox')?.classList.remove('is-hidden');

		return false;	// needed to stop form submitting
	}


})(TT = TT || {});

/*

*/