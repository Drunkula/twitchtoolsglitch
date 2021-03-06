/*
	TT and TMIConfig will be our global repositories
	TT for functions, the other for each tool's vars - makes it easy to track in the console debugger
	TT.set_conf('some.var.name', value) can be used to set values in TMIConfig so you can
	use set_conf('MY_MODULE.someprop', value) to store local settings
*/
"use strict"

var _____MY_SPECIAL_DEBUG_DUMMY____ = 'dummy';	// properties are placed in order in window, so skip until we hit this
	// lets us list global vars from console to check for polluting the timelines (forgetting strict)
function TT_DEBUG_list_window() {
	let output = false;
	console.log('---------------------------');
	for(let b in window) {
		if(output && window.hasOwnProperty(b))
			console.log(b);
		if (b === "_____MY_SPECIAL_DEBUG_DUMMY____") output = true;
	}
	console.log('---------------------------');
	console.log("This", this);
}

var TT = {} // OUR NAMESPACE can't be a constant for now as I've used TT = TT || {} elsewhere

TT.TMI_DEFAULT_CHANNELS = 	[];		// could put this in a different file for easy user use
TT.TMI_DEFAULT_ALLOW_NAMED =[];		// these do work
TT.TMI_IGNORE_DEFAULT =		["nightbot", "streamelements", "moobot", "streamlabs", "fossabot", "songlistbot"]; // LOWERCASE

TT.MAGIC_CLASS_FORM_SAVE = '.form-save';


// NOTE - all .form-save items will have their onchange triggered
// NOTE - no they don't, now it's onchange items.

var TMIConfig = {	// MOST tools add their config to this to make observing easy
	autojoin: null,
	joinDebounceSecs: 3,
	restoredParams: [],	// values restored from the url string or localStorage - check on

	perms : {	// permissions to run commands
        allowEveryone : false,
        allowMods : true,
        allowVips : true,
        allowNamed : TT.TMI_DEFAULT_ALLOW_NAMED,
		ignoredUsers: TT.TMI_IGNORE_DEFAULT,
    }
}


	/**
	 * Repopulates form fields from url
	 * formats channels field
	 * ONCHANGE triggered on all .form-save fields after - not any more
	 */

TT.forms_init_common = function forms_init_common() {
	TMIConfig.restoredParams = TT.get_restore_params();

	TT.forms_init_common_permissions();
		// form values will overwrite defaults
	TT.restore_form_values(TT.MAGIC_CLASS_FORM_SAVE);

		// autojoin check
	if (TMIConfig.restoredParams['autojoin'] === "true") {
		TMIConfig.autojoin = true;
	}
	//trigger_onchange_on('input, select');
}

TT.add_events_common = function() {
	TT.add_event_listeners();
}

	// if permissions are used you'll have allownamed, everyone, mods, vips

TT.forms_init_common_permissions = function forms_init_common_permissions() {
	TT.init_channels_defaults();
	TT.allow_named_init_defaults();
	TT.ignored_users_init_defaults();
}

	// if no channels were in the request then use the defaults

TT.init_channels_defaults = function init_channels_defaults () {
	let channo = gid('channels');
	if (channo) {
		channo.value = TT.TMI_DEFAULT_CHANNELS.join(' ');
	}
}

	// set defaults on ignoredusers if nothing in restore

TT.ignored_users_init_defaults = function tt_ignored_users_init_defaults() {
	let igUsrs = gid('ignoredusers');
	if (!igUsrs) return;
	igUsrs.value = TT.TMI_IGNORE_DEFAULT.join(' ');
}

	// sets onchange event for the allowname field
	// COULD use the mapper and grab values out of where they save to populate

TT.allow_named_init_defaults = function allow_named_init_defaults() {
	let aNamed = gid('allownamed');
	if (!aNamed) return	//if (TMIConfig.restoredParams['allownamed'] === undefined)
	aNamed.value = TT.TMI_DEFAULT_ALLOW_NAMED.join(' ');
}

	// turning these into event emits to update the input would be overkill

TT.ignored_users_add = function(user) {
	user = user.toString().trim().toLowerCase();
	TMIConfig.perms.ignoredUsers.push(user);
	TMIConfig.perms.ignoredUsers = [...new Set(TMIConfig.perms.ignoredUsers)];
	gid('ignoredusers').value = TMIConfig.perms.ignoredUsers.join(' ');
	TT.url_populate();
}

TT.ignored_users_remove = function(user) {
	user = user.toString().trim().toLowerCase();
	let uset = new Set(TMIConfig.perms.ignoredUsers);
	uset.delete(user);
	TMIConfig.perms.ignoredUsers = [...uset];
	gid('ignoredusers').value = TMIConfig.perms.ignoredUsers.join(' ');
	TT.url_populate();
}

	// user allowed to do the command?

TT.user_permitted = function user_permitted(user) {
	let allowed = false;

	switch (true) {	// block first
		case TMIConfig.perms.ignoredUsers.includes(user.username):
			allowed = false;
			break;
		case TMIConfig.perms.allowEveryone:
		case TMIConfig.perms.allowMods && user.mod:
		case TMIConfig.perms.allowVips && user.badges && user.badges.vip === "1":
		case TMIConfig.perms.allowNamed.includes(user.username):
		case user.badges && user.badges.broadcaster === "1":
			allowed = true;
			break;

		default:
			allowed = false;
			break;
	}

	return allowed;
}


	/** Store data in localStorage called urlParams */
TT.localstore_save = function page_params_set(data) {//	TT.local_store_set('urlParams', data);
	let namePath = "urlParams" + window.location.pathname;
    localStorage.setItem(namePath, JSON.stringify(data));
}

TT.localstore_load = function page_params_get() {
	let namePath = 'urlParams' + window.location.pathname;
    return JSON.parse( localStorage.getItem(namePath) );
	//return TT.local_store_get('urlParams');
}

	// selects get or localStorage for form repopulation

TT.get_restore_params = function get_restore_params() {
	let getU = TT.query_string_params_to_array();

	if (Object.keys(getU).length) {
		console.info('get_restore_params using '+ g('get'));
		return getU;
	}
		// local storage?
	let lParams = TT.param_string_to_array( TT.localstore_load() )

	if (Object.keys(lParams).length) {
		console.info('get_restore_params using ' + g('localStorage'));
		return lParams;
	}

	return false;
}

	// returns array from url?foo=bar parameters will be needed for minified versions

TT.query_string_params_to_array = function get_query_string_params() {
	let getVars = {};
	decodeURI(window.location.href).replace(/[?&]+([^=&]+)=([^&]*)/gi,
		function(a,name,value){getVars[name]=value;});
	return getVars;
}

	/**
	 *	Set a property in TMIConfig - deep allowed like 'foo.bar.doo'
	 * @param {string} path of property e.g. "someprop" or "some.deeper.prop"
	 * @param {*} val
	 */

TT.set_conf = function set_conf(path, val) {
	let sp = path.split('.')
	let last = sp.pop();

	let ref = sp.reduce( (prev, curr) => {
		if (prev[curr] === undefined) {
			prev[curr] = {}
		}
		return prev[curr]
	}, TMIConfig)

	ref[last] = val;
}

	// trigger onchange events to populate certain elements

TT.trigger_onchange_on = function trigger_onchange_on(selector) {
	let ev = new Event('change');

	let flds = qsa(selector);

	flds.forEach(element => {
		element.dispatchEvent(ev);
	});
}


	// **************** GLOBAL HELPERS ***************** //

function qsa(query, el=document) {
	return [...el.querySelectorAll(query)];
}
	// gid could cache results, qsa not really
function gid(id, el = document) {
	return el.getElementById(id);
}

	// colours for console output - make global, why not

var { r, g, b, w, c, m, y, k } = [ ['r', 1], ['g', 2], ['b', 4], ['w', 7], ['c', 6], ['m', 5], ['y', 3], ['k', 0] ]
.reduce( (cols, col) => ( {...cols,  [col[0]]: f => `\x1b[1m\x1b[3${col[1]}m${f}\x1b[0m`} ), {});


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

function o(str, clearIt, after="<br/>", divId = 'mainoutput') {
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

function log(str, clearIt, after="<br/>") {
	if (clearIt)
		return document.getElementById('log').innerHTML = str + after;

	// https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML
	document.getElementById('log').insertAdjacentHTML('afterbegin', str + after);
}