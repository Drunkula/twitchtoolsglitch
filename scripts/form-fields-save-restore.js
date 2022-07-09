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
		uri.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
	});

	return uri.join('&');
}


	/**
	 *
	 * @param {string} selector selector for form items
	 * @param {string} paramString string to decode
	 * @param {bool} idIfNoName use element's id if no name
	 * @param {bool} localStorageFallback use localStorage if paramString fail
	 */

 TT.restore_form_values = function restore_form_values(selector = '.form-save', paramString = window.location.search, idIfNoName = true, localStorageFallback = true) {
//function restore_form_values({selector = '.form-save', paramString = window.location.search, idIfNoName = true, localStorageFallback = true}) {
	let inputs = document.querySelectorAll(selector);

	if (!paramString && localStorageFallback) {
		paramString = TT.localstore_load();
	}

	let getVars = TT.param_string_to_array(paramString);

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
			default:
				//console.log(`getVars[${name}] = ${getVars[name]} : decoded = `, decodeURIComponent(getVars[name]));
				field.value = decodeURIComponent(getVars[name]);
				if (field.classList.contains('form-filter-spaces-to-commas')) {
					field.value = TT.form_filter_commas_to_spaces(field.value);
				}
				break;
		}
	});
}

	// breaks uri string into key/value pairs

TT.param_string_to_array = function param_string_to_array( params = window.location.search ) {
	let getVars = [];
	//decodeURI(params).replace(/[?&]+([^=&]+)=([^&]*)/gi, function(a,name,value){getVars[name] = value;});
	decodeURI(params).replace(/[?&]?([^=&]+)=([^&]*)/gi, function(a,name,value){getVars[name] = value;});
	return getVars;
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



}	// scope