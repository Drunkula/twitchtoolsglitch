/*
	Add list to the visual queue
*/

{	// SCOPE

	const $speechQDiv = gid('speechqueue')

TTSVars.speech_queue_list_add = function speech_queue_add_entry( data ) {
	let { user, id, text } = data;

		// create a text entry

	let qID = "sq-" +  id;

	let frag = document.createDocumentFragment();

	let speechQRow = dce('nav');
	speechQRow.id = qID;
	speechQRow.classList.add('speechQRow');
				//btnDel.textContent = 'del';

	// level-left -> level-item
		// left = name, text

	let username = dce('div');
	username.classList.add('speechQUser');
	username.textContent = user;

	let speech = dce('div');
	speech.classList.add('speechQText');
	speech.textContent = text;

//	ll.appendChild(speech);

		// right = buttons

	let buttons = dce('div')
	buttons.classList.add('speechQButtons');

		// create a delete button and a ban button
	let btnDel = dce('button');
	btnDel.textContent = 'del';
	btnDel.classList.add('button', 'is-warning', 'is-small', 'ml-2');
	btnDel.onclick = del_button_onclick;
	btnDel.dataset.id = id;

	let btnBan = dce('button');
	btnBan.textContent = 'ban';
	btnBan.classList.add('button', 'is-danger', 'is-small');
	btnBan.onclick = ban_button_onclick;
	btnBan.dataset.id = id;
	btnBan.dataset.user = user;

	buttons.appendChild(btnBan);
	buttons.appendChild(btnDel);

	speechQRow.appendChild(username)
	speechQRow.appendChild(speech)
	speechQRow.appendChild(buttons)
/*
	btnItem = dce('div');
	btnItem.classList.add('level-item');
	btnItem.appendChild(btnDel);
	lr.appendChild(btnItem);
	level.appendChild(left)
	level.appendChild(speech)
	level.appendChild(right)
*/

	frag.appendChild(speechQRow);

	$speechQDiv.appendChild(frag)
	// add to nave
}

TTSVars.speech_list_clear = function speech_queue_clear() {
	while ($speechQDiv.firstChild) {
		$speechQDiv.removeChild($speechQDiv.lastChild);
	}
}

	// bans and unbans users, also removing all their entries from the speech queue

function ban_button_onclick(e) {
	let user = e.target.dataset.user;
	let sameUser = qsa(`[data-user="${user}"]`)
	let id = e.target.dataset.id;
	let banned = e.target.dataset.banned

		// already banned so unban
	if (banned === "true") {console.log("UNBANNING", user);
		TT.ignored_users_remove(user);
			// unban removes all entries
		sameUser.forEach(e => {
			TTSVars.speech_queue_remove_entry(e.dataset.id, true);
		})
	}
	else {	// not banned, so ban, stop all speech, add to bad users
		console.log("BANNING", user);
		TT.ignored_users_add(user);
		TTSVars.speech_queue_entry_freeze(id);	// stop the entry from being removed by a speech end event
			//
		sameUser.forEach(e => {
			TTSVars.speecher.cancel_id(e.dataset.id);

			if (e.dataset.id !== id ) {
				TTSVars.speech_queue_remove_entry(e.dataset.id, true);
			} else {
				e.textContent = "unban";
				e.dataset.banned = "true";
			}
		})
	}
}

	// remove with id but forcible if del button used

TTSVars.speech_queue_remove_entry = function spq_remove(id, force = false) {
	id = gid('sq-' + id);
	if ( !id  || ( id.frozen && force === false ) ) {
		return false;
	}

	id.remove();
}
	// freeze row if ban hit
TTSVars.speech_queue_entry_freeze = function spq_remove(id, force = false) {
	id = gid('sq-' + id);
	if (id) {
		id.frozen = true;
	}
}


function del_button_onclick(e) {
	TTSVars.speecher.cancel_id(e.target.dataset.id);
	// delete this?
	gid('sq-' + e.target.dataset.id)?.remove();
}
	// document create element
function dce(i) {
	return document.createElement(i);
}


}	// SCOPE ENDS