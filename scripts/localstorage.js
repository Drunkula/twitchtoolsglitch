"use strict"

	 // window onload

 window.addEventListener('load', () => {
//	log('LOADED');

	TT.forms_init_common();
	//TT.forms_init_tmi();

	TT.add_events_common();

	let clearChatters = () => { o('', true); };
	let resetChatters = () => { NCNChatterSet.clear(); o('', true); }

	//gid('clearnew').onclick = clearChatters;
	//gid('resetnew').onclick = resetChatters;

	console.log(localStorage);
	console.log(localStorage[0]);

	//let locA = [...localStorage];

	let frag = document.createDocumentFragment();

	for (let i = 0; i < localStorage.length; i++) {
		let k = localStorage.key(i);
		let entry = localStorage.getItem(k);
		console.log(entry);

		let d = document.createElement('div')
		d.classList.add('mb-2');

		let b = document.createElement('button');
		b.classList.add('button', 'is-small', 'is-info');
		b.textContent = "delete";

		b.onclick = () => {d.remove(); localStorage.removeItem(k);}

		d.appendChild(document.createTextNode(k + ' : ' + entry.substring(0, 80) + ' '));
		d.appendChild(b);

		frag.appendChild(d);
	}

	gid('mainoutput').appendChild(frag);
});

