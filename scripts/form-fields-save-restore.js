'use strict'

{	// SCOPE

const FORM_RESTORE_VERBOSE = false;
	/**
 	*	Returns form fields as uri encode pairs separated by &
	*	Fields should have a name, and ideally should be inputs
	* @param {string} selectors e.g. "#myform input"
	* @param {string} idIfNoName bool use the items id if there's no name property
	* @returns
	*/

TT.inputs_to_uri_string = function inputs_to_uri_string(selectors = '.form-save', idIfNoName = true, asObject = false) {
	let inputs = document.querySelectorAll(selectors);
	let uri = [];

	inputs.forEach( field => {
		let value;
			// use id if no name property
		const name = field.name ? field.name : (idIfNoName && field.id ? field.id : null);

		if (!name) {
			console.error("inputs_to_uri_string : Field does not have a name : ", field);
			return;
		}

		switch(field.type) {
			case 'reset': case 'submit': case 'image':
				return;
			case 'radio':
				if (!field.checked) return;	// could just skip this
				value = field.value;
				break;
			case 'checkbox':
				value = field.checked;
				break;
			default:
				value = field.value.trim();
				if (field.classList.contains('form-filter-spaces-to-commas')) {
					value = TT.form_filter_spaces_to_commas(value);
				}
				break;
		}
			// stupid field names might happen
// console.log(`${name} : ${value} => ${encodeURIComponent(value)}`)
		 try {
			uri.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
		 } catch (e) {
			console.error("ERROR encoding URI Component:", e);
		 }
		//uri.push(`${name}=${value}`);
	});

	return uri.join('&');
	//return encodeURI(uri.join('&'));
}


	/**
	 *
	 * @param {string} selector selector for form items
	 * @param {string} paramString string to decode
	 * @param {bool} idIfNoName use element's id if no name
	 * @param {bool} localStorageFallback use localStorage if paramString fail
	 */

let restore_opts_default = {
	paramString: window.location.search,
	idIfNoName: true,
	localStorageFallback: true,
	useCached: false	// use values in TT.initialUrlParamsToArray
}

 //TT.restore_form_values = function restore_form_values(selector = '.form-save', opts = restore_opts_default) {
TT.restore_form_values = function restore_form_values(selector = '.form-save', opts)
{
	let optsGroup = {...restore_opts_default, ...opts}

	let { paramString, idIfNoName, localStorageFallback, useCached } = optsGroup;
	//console.log("Got Opts", optsGroup);

	let inputs = document.querySelectorAll(selector);

	if (!paramString && localStorageFallback) {
		console.log("USING LOCAL STORAGE");
		paramString = TT.localstore_load();
	}

	let getVars = TT.query_string_params_to_array(paramString);
		// so far restored params are NEVER used
	if (useCached && Object.keys(TT.initialUrlParamsToArray).length) {
		console.log("*********************** USING CACHED VARS OK ***************************", TT.initialUrlParamsToArray);
		getVars = TT.initialUrlParamsToArray;
	}

	inputs.forEach( field => {
		const name = field.name ? field.name : (idIfNoName && field.id ? field.id : null);

		if ( !name) {
			if (FORM_RESTORE_VERBOSE) console.error("restore_form_values : Field does not have a name : ", field);
			return;
		}

		if ( !(name in getVars) ) {
			if (FORM_RESTORE_VERBOSE) console.error("restore_form_values : field has no url match : ", name)
			return;
		}

		if ( !field.type ) {
			if (FORM_RESTORE_VERBOSE) console.error("restore_form_values : field has no type : ", field)
			return;
		}

		switch(field.type) {
			case 'reset': case 'submit': case 'image':
				return;
			case 'radio':
				if (field.value === getVars[name]) {
					field.checked = true
				} else {
					field.checked = false;
				}
				break;
			case 'checkbox':
				if (getVars[name] == "true") {
					field.checked = true;
				} else {
					field.checked = false;
				}
				break;
			default:	// works for selects
											//console.log(`Setting ${field.id} to ${getVars[name]}`);
				field.value = getVars[name]; // they're decoded now

				if (field.classList.contains('form-filter-spaces-to-commas')) {
					field.value = TT.form_filter_commas_to_spaces(field.value);
				}
				break;
		}
	});
}

	// simple filters, actually doesn't look for spaces

TT.form_filter_spaces_to_commas = function form_filter_spaces_to_commas(str) {
	str = str.match(/\w+/g);
	return str ? str.join(',') : '';
}

TT.form_filter_commas_to_spaces = function form_filter_commas_to_spaces(str) {
	str = str.match(/\w+/g);
	return str ? str.join(' ') : '';
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

console.log("Params from query string:",Object.keys(getU).length, "Param string length:", window.location.search.length);

	if (Object.keys(getU).length) {
		return getU;
	}
		// local storage?
	let lsParams = TT.query_string_params_to_array( TT.localstore_load() ); // <- defined in backbone

	if (Object.keys(lsParams).length) {
		console.info('get_restore_params using ' + g('localStorage'));
		return lsParams;
	}

	return false;
}

	// returns array from url?foo=bar parameters will be needed for minified versions

TT.query_string_params_to_array = function get_query_string_params(params = window.location.search) {
	let getVars = {};
	//decodeURI(window).replace(/[?&]+([^=&]+)=([^&]*)/gi, function(a,name,value){getVars[name]=value;});
	try {
		if (params[0] === '?') params = params.substring(1);
		params.split("&").forEach(a => {
			let [name, value] = a.split("=");
			if (value !== undefined)
				getVars[decodeURIComponent(name)] = decodeURIComponent(value);
		});
	} catch (e) {
		console.log("ERROR: quert_string_params_to_array -", e);
	}
	return getVars;
}

}	// scope