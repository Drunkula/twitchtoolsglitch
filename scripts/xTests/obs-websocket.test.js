"use strict"

const { r, g, b, w, c, m, y, k } = [ ['r', 1], ['g', 2], ['b', 4], ['w', 7], ['c', 6], ['m', 5], ['y', 3], ['k', 0] ]
	.reduce( (cols, col) => ( {...cols,  [col[0]]: f => `\x1b[1m\x1b[3${col[1]}m${f}\x1b[0m`} ), {});

const password = 'chicken';
let opts = {address: 'localhost:4444', password: password, secure: false};
opts = {address: '127.0.0.1:4444', password: password, secure: false};
const obs = new OBSWebSocket();

function main () {
	console.log("obs", obs);

	obs.on('ConnectionOpened', connection_established);
	obs.on('ConnectionClosed', connection_dropped);
	obs.on('AuthenticationSuccess', obs_auth_good_cb);
	obs.on('AuthenticationFailure', obs_auth_bad_cb);

	//obs.connect();
	obs.connect( opts )
		.then( d => {
			o("It connected...")
			console.log("Connection: ", d);

			get_scenes();
		})
		.catch(e => {
			o( "Connection failure " + e.toString() )
			console.error( e );
		});
}

function get_scenes() {
	obs.send('GetSceneList').then(data => {
		console.log("Scenes", data);
		data.scenes.forEach(scene => o2(scene.name))
		});
}

function connection_established(d) {
	console.log(y('CONNECTION ESTABLISHED: '), d);
}
function connection_dropped() {
	console.log( m('CONNECTION DROPPED EVENT') );
}
function obs_auth_good_cb() {
	console.log( y('OBS auth successful EVENT: ') );
/*
obs.send('Authenticate')
	.then(d => console.log(d))
	.catch(e => console.log(e)) //*/
}

function obs_auth_bad_cb(d) {
	console.log( m('OBS auth failure : '), d );
}

docReady(a => main())


function qsa(query, el=document) {
	return [...el.querySelectorAll(query)];
}
	// gid could cache results, qsa not really
function gid(id, el = document) {
	return el.getElementById(id);
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




function o(str, clearIt, after="<br/>", divId = 'mainoutput') {
	if (clearIt)
		document.getElementById(divId).innerHTML = '';

	if (!str) return;

	var ndiv = `<div onclick="this.remove()">${str + after}</div>`;
		// https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML
	document.getElementById(divId).insertAdjacentHTML('afterbegin', ndiv);
}

function o2(...strs) {
	if (!strs) return;

	//var ndiv = `<div onclick="this.remove()">${str + after}</div>`;
	var ndiv = `<div onclick="this.remove()">${strs.join(' ')}</div>`;
		// https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML
	gid('mainoutput').insertAdjacentHTML('beforeend', ndiv);
}
