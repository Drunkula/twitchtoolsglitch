// helpers.js https://www.youtube.com/watch?v=EoUIS2PxKCs&t=107s

function qsa(query, el=document) {
	return [...el.querySelectorAll(query)];
}

function gid(id, el = document) {
    return el.getElementById(id);
}

function sleep(ms) {		// sleep(200).then(...)
	return new Promise(res => {
		setTimeout(res, ms)
	});
}

function docReady(fn) {
    // see if DOM is already available
    if (document.readyState === "complete" || document.readyState === "interactive") {
        // call on next available tick
        setTimeout(fn, 1);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}


function form_filter_commas_to_spaces(str) {
	str = str.match(/\w+/g);
	return str ? str.join(' ') : '';
}

    // adds data to the localstorage for this page
    // setItem getItem removeItem clear

function local_store_set(name, data) {
    console.log(localStorage);

    let namePath = name + window.location.pathname;
    localStorage.setItem(namePath, JSON.stringify(data));
}

    // url location of current page

function local_store_get (name) {
    console.log(localStorage);

    let namePath = name + window.location.pathname;
    return JSON.parse( localStorage.getItem(namePath) );
}