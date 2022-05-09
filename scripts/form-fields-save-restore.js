const FORM_RESTORE_VERBOSE = false;
/**
 *	Returns form fields are uri encode pairs separated by &
	*	Fields should have a name, and ideally should be inputs
	* @param {string} selectors e.g. "#myform input"
	* @returns
	*/

function inputs_to_uri_string(selectors, idIfNoName = true, asObject = false) {
	let inputs = document.querySelectorAll(selectors);
	let uri = [];

	inputs.forEach( field => {
		let value;

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
				value = field.value;
				if (field.classList.contains('form-filter-spaces-to-commas')) {
					value = form_filter_spaces_to_commas(value);
				}
				break;
		}
			// stupid field names might happen
		uri.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
		//uri[encodeURIComponent(name)] = encodeURIComponent(value) ;	// this might bite me
	});

	//if (asObject) return uri;	let a = [];	for(f in uri) a.push(`${f}=${uri[f]}`);

	return uri.join('&');
}


	/**
	 *
	 * @param {string} selector selector of fields to replace e.g. #myform input -
	 * @param {bool} idIfNoName use the items id if it doesn't have a name
	 * @param {mixed} uristringOrUseWindow a string to decode or of true window.location.href is used
	 */

function restore_form_values(selector, idIfNoName = true, uristringOrUseWindow = true) {
	let inputs = document.querySelectorAll(selector);

	let params = uristringOrUseWindow === true ? window.location.search : uristringOrUseWindow;
	let getVars = [];

	decodeURI(params).replace(/[?&]+([^=&]+)=([^&]*)/gi, function(a,name,value){getVars[name] = value;});

	inputs.forEach( field => {
		const name = field.name ? field.name : (idIfNoName && field.id ? field.id : null);

		if ( !name) {
			if (FORM_RESTORE_VERBOSE) console.log("restore_form_values : Field does not have a name : ", field);
			return;
		}

		if ( !(name in getVars) ) {
			if (FORM_RESTORE_VERBOSE) console.log("restore_form_values : field has no url match : ", name)
			return;
		}

		if ( !field.type ) {
			if (FORM_RESTORE_VERBOSE) console.log("restore_form_values : field has no type : ", field)
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
				field.value = decodeURIComponent(getVars[name]);
				if (field.classList.contains('form-filter-spaces-to-commas')) {
					field.value = form_filter_commas_to_spaces(field.value);
				}
				break;
		}
	});
}


	// simple filters, actually doesn't look for spaces

function form_filter_spaces_to_commas(str) {
	str = str.match(/\w+/g);
	return str ? str.join(',') : '';
}

function form_filter_commas_to_spaces(str) {
	str = str.match(/\w+/g);
	return str ? str.join(' ') : '';
}