/*
	Add list to the VISUAL queue - all html, no speech logic
*/
"use strict"

{	// SCOPE

	const $speechQDiv = gid('speechqueue');
	const $speechQOldDiv = gid('speechqueueold');
	const TTSVars = TMIConfig.TTSVars;

	TTSVars.speech_queue_list_add = function speech_queue_add_entry( data ) {
		let { user, id, text, msgid } = data;

			// create a text entry

		let qID = "sq-" +  id;

		let frag = document.createDocumentFragment();

		let speechQRow = dce('nav');
		speechQRow.id = qID;
		speechQRow.dataset["msgid"] = msgid;	// the Twitch message id
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
		btnBan.textContent = 'ignore';
		btnBan.classList.add('button', 'is-danger', 'is-small');
		btnBan.onclick = ignore_button_onclick;
		btnBan.dataset.id = id;
		btnBan.dataset.user = user;

		buttons.appendChild(btnBan);
		buttons.appendChild(btnDel);
			// username - text - buttons
		speechQRow.append(username, speech, buttons);

		frag.appendChild(speechQRow);
		$speechQDiv.appendChild(frag)
	}

		// transfers a message from the main queue to the old queue
		// include_id inserts a tag with the message id before the message

	TTSVars.speech_queue_entry_to_old_messages = function (id, addIdTag) {
		let nid = gid('sq-' + id);

		if (!nid) {
			console.log("*** ERRROR: no speech queue entry with ID : "+id);
			return false;
		}
			// insert a div
		if (addIdTag) {
			speech_queue_add_tag(id, id, "info");
		}
			//$speechQOldDiv.appendChild(id);
		$speechQOldDiv.prepend(nid);
	}

		// colour can be info black dark light white primary link info success warning danger
		// "danger is-light" could also be used
	TTSVars.speech_queue_add_tag = function(id, text, colour = "info") {
		let nid = gid('sq-' + id);

		if (!nid) {
			return;
		}

		let tagSpan = document.createElement("span");
		tagSpan.innerText = text;
		tagSpan.className = `tag is-${colour} mr-1`;
		nid.prepend(tagSpan);
	}

		// iteratively clear the html speech list

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
		return true;
	}
		// returns the id of a row by its twitch message id
	TTSVars.speech_queue_msgid_to_id = function (msgid) {
		let el = document.querySelector(`[data-msgid="${msgid}"]`);
		if (el) return el["id"].split("-")[1];
		return false;
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

	function ignore_button_onclick(e) {
		const allowClass = 'is-info';
		const ignoreClass = 'is-danger';

		let user = e.target.dataset.user;
		let sqUpcomingEntries = qsa(`#speechqueue [data-user="${user}"]`); // ban buttons have user and data-id
		let sqAllEntries = qsa(`[data-user="${user}"]`);	// for changing allows
		let banned = e.target.dataset.banned

			// already ignored so allow and change button to allow on all
		if (banned === "true") {console.log("******* UN-ignoring", user);
			TT.ignored_users_remove(user);
			for (e of sqAllEntries) {
				e.dataset.banned = false;
				e.textContent="ignore";
				e.classList.remove(allowClass);
				e.classList.add(ignoreClass);
			 }
		}
		else {	// not ignored, so ban, stop all speech, add to bad users
			console.log("************* IGNORING", user);
			TT.ignored_users_add(user);
			for (e of sqAllEntries) {e.dataset.banned = true;
				e.textContent = "un-ignore";
				e.classList.remove(ignoreClass);
				e.classList.add(allowClass);
			}
				//speech_queue_entry_freeze(id);	// stop the entry from being removed by a speech end event
			for (e of sqUpcomingEntries) {	// only add tags to messages in main queue
				TTSVars.speecher.cancel_id(e.dataset.id);
				TTSVars.speech_queue_entry_to_old_messages(e.dataset.id);
				TTSVars.speech_queue_add_tag(e.dataset.id, "ignored", 'success');
			}
		}
	}

		// delete buttons remove rows no problem

	function del_button_onclick(e) {
		let isSpeaking = TTSVars.speecher.cancel_id(e.target.dataset.id);
			// delete this?  Yes, but if it's speaking then it stops it going into the history
		if (isSpeaking) {
			console.log("It's speaking");
			TTSVars.speech_queue_entry_to_old_messages(e.target.dataset.id);
		}
		else {
			console.log("Not speaking");
			gid('sq-' + e.target.dataset.id)?.remove();
		}
	}
		// document create element
	function dce(i) {
		return document.createElement(i);
	}

}	// SCOPE ENDS