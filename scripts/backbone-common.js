/*
	TT and TT.config will be our global repositories
	TT for functions, the other for each tool's vars - makes it easy to track in the console debugger
	TT.set_conf('some.var.name', value) can be used to set values in TT.config so you can
	use set_conf('MY_MODULE.someprop', value) to store local settings
*/
"use strict"

var _____MY_SPECIAL_DEBUG_DUMMY____ = 'dummy';	// properties are placed in order in window, so skip until we hit this
// lets us list global vars from console to check for polluting the timelines (forgetting strict)
// SHOW GLOBALS I've added to window
function TT_DEBUG_My_Globals() {
	let output = false;
	console.log('---------------------------');
	for (let b in window) {
		if (output && window.hasOwnProperty(b))
			console.log(b);
		if (b === "_____MY_SPECIAL_DEBUG_DUMMY____") output = true;
	}
	console.log('---------------------------');
	console.log("This", this);
}


var TT = {  // OUR NAMESPACE can't be a constant for now as I've used TT = TT || {} elsewhere
	initialUrlParamsToArray: [],	// url INITIAL values before restore params chages4
	MAGIC_CLASS_FORM_SAVE: '.form-save',
	config: {}
}

// NOTE - all .form-save items will have their onchange triggered
// NOTE - no they don't, now it's onchange items.

/**
 * Repopulates form fields from url
 * formats channels field
 * ONCHANGE triggered on all .form-save fields after - not any more
 */

TT.forms_init_common = function forms_init_common() {
	TT.initialUrlParamsToArray = TT.get_restore_params();	// checked by TMI init
		// form values will overwrite defaults
	TT.restore_form_values(TT.MAGIC_CLASS_FORM_SAVE);
	//trigger_onchange_on('input, select');
}

TT.add_events_common = function () {
	TT.add_event_listeners();
}

// trigger onchange events to populate certain elements
/*
TT.trigger_onchange_on = function trigger_onchange_on(selector) {
	let ev = new Event('change');

	let flds = qsa(selector);

	flds.forEach(element => {
		element.dispatchEvent(ev);
	});
}*/


// **************** GLOBAL HELPERS ***************** //

function qsa(query, el = document) {
	return [...el.querySelectorAll(query)];
}
// gid could cache results, qsa not really
function gid(id, el = document) {
	return el.getElementById(id);
}

// colours for console output - make global, why not

var { r, g, b, w, c, m, y, k } = [['r', 1], ['g', 2], ['b', 4], ['w', 7], ['c', 6], ['m', 5], ['y', 3], ['k', 0]]
	.reduce((cols, col) => ({ ...cols, [col[0]]: f => `\x1b[1m\x1b[3${col[1]}m${f}\x1b[0m` }), {});


function sleep(ms) {		// sleep(200).then(...)
	return new Promise(res => {
		setTimeout(res, ms)
	});
}


// delete buttons have a data target selector

function docReady(fn) {
	// see if DOM is already available
	if (document.readyState === "complete" || document.readyState === "interactive") {
		// call on next available tick
		setTimeout(fn, 1);
	} else {
		document.addEventListener("DOMContentLoaded", fn);
	}
}


/**
 * Simple outputs to named divs  = real laziness
 * @param {string} str
 * @param {bool} clearIt
 * @returns
 */

function o(str, clearIt, after = "<br/>", divId = 'mainoutput') {
	if (clearIt)
		document.getElementById(divId).innerHTML = '';

	if (!str) return;

	var ndiv = `<div onclick="this.remove()">${str + after}</div>`;
	// https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML
	document.getElementById(divId).insertAdjacentHTML('afterbegin', ndiv);
}

// as above but multi args and in order

function o2(...strs) {
	if (!strs) return;
	var ndiv = `<div onclick="this.remove()">${strs.join(' ')}</div>`;

	gid('mainoutput').insertAdjacentHTML('beforeend', ndiv);
}


/**
  * Output to that div top first
  * @param {string} str
  * @param {bool} clearIt
  * @returns
  */

function log(str, clearIt, after = "<br/>") {
	if (clearIt)
		return document.getElementById('log').innerHTML = str + after;

	// https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML
	document.getElementById('log').insertAdjacentHTML('afterbegin', str + after);
}