"use strict"

// does an object have the property
const hasProperty = (target = {}, prop) => prop in target || Object.hasOwn(target, prop) || !!target[prop]

// helpers.js https://www.youtube.com/watch?v=EoUIS2PxKCs&t=107s

function qsa(query, el=document) {
	return [...el.querySelectorAll(query)];
}

function qs(query, el=document) {
    return el.querySelector(query);
}

function gid(id, el = document) {
    return el.getElementById(id);
}

function dce(i) {
    return document.createElement(i);
}

function sleep(ms) {		// sleep(200).then(...)
	return new Promise(res => {
		setTimeout(res, ms)
	});
}

    // {id:, data:} or []
function table_row(params = {}) {
    let rdata = params instanceof Array ? params : params.data;
    if (rdata.length <= 0) return;

    let row = dce("tr");
    if (params.id) row.id = params.id;

    let isHdr = params.isHeader ??= false;

    let hasCbox = params.checkbox !== undefined;

    for (let cell of rdata) {
        let c = isHdr ? dce("th") : dce("td");
        c.innerHTML = cell;
        row.append(c);
    }


    if (hasCbox) {
        let cboxfirst = true;
        if (params.checkboxPos === "end") cboxfirst = false;
        //let c = isHdr ? dce("th") : dce("td");
        let cbx = dce("input");
        cbx.type = "checkbox";
        cbx.value = params.checkbox;
        if (params.checkboxid) cbx.id = params.checkboxid;
        //c.append(cbx);
        let c = isHdr ? dce("th") : dce("td");
        c.append(cbx);
        if (cboxfirst) row.prepend(c);
        else row.append(c);
    }

    return row;
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
    //console.log(localStorage);

    let namePath = name + window.location.pathname;
    localStorage.setItem(namePath, JSON.stringify(data));
}

    // url location of current page

function local_store_get (name) {
    //console.log(localStorage);

    let namePath = name + window.location.pathname;
    return JSON.parse( localStorage.getItem(namePath) );
}