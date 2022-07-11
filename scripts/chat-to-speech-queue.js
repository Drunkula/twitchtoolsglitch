/*
	Add list to the visual queue
*/
"use strict"

{	// SCOPE

	const $speechQDiv = gid('speechqueue')
	const TTSVars = TMIConfig.TTSVars;

	TTSVars.speech_queue_list_add = function speech_queue_add_entry( data ) {
		let { user, id, text } = data;

			// create a text entry

		let qID = "sq-" +  id;

		let frag = document.createDocumentFragment();

		let speechQRow = dce('nav');
		speechQRow.id = qID;
		speechQRow.classList.add('speechQRow');

			// left = username (left, middle and right are flexbox items, order changed on media query)

		let username = dce('div');
		username.classList.add('speechQUser');
		username.textContent = user;

		let speech = dce('div');
		speech.classList.add('speechQText');
		speech.textContent = text;

			// right = buttons

		let buttons = dce('div')
		buttons.classList.add('speechQButtons');

			// create a delete button
		let btnDel = dce('button');
		btnDel.textContent = 'del';
		btnDel.classList.add('button', 'is-warning', 'is-small', 'ml-2');
		btnDel.onclick = del_button_onclick;
		btnDel.dataset.id = id;
			// and a ban button
		let btnBan = dce('button');
		btnBan.textContent = 'ban';
		btnBan.classList.add('button', 'is-danger', 'is-small');
		btnBan.onclick = ban_button_onclick;
		btnBan.dataset.id = id;
		btnBan.dataset.user = user;

		buttons.appendChild(btnBan);
		buttons.appendChild(btnDel);
			// username - text - buttons
		speechQRow.append(username, speech, buttons);
/* 		speechQRow.appendChild(username)
		speechQRow.appendChild(speech)
		speechQRow.appendChild(buttons)
 */
		frag.appendChild(speechQRow);
		$speechQDiv.appendChild(frag)
	}

	TTSVars.speech_list_clear = function speech_queue_clear() {
		while ($speechQDiv.firstChild) {
			$speechQDiv.removeChild($speechQDiv.lastChild);
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

		// freeze row if ban hit - stops utterance end events clearing the row

	function speech_queue_entry_freeze(id) {
		id = gid('sq-' + id);
		if (id) {
			id.frozen = true;
		}
	}

		// ban freezes the current entry allowing you do unban.
		// on ban all the user's other entries are cleared and their name is added to ignored users.

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
			speech_queue_entry_freeze(id);	// stop the entry from being removed by a speech end event
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

		// delete buttons remove rows no problem

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