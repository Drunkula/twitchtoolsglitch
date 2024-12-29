/*
    STREAMERBOT Version

	Add list to the VISUAL queue - all html, no speech logic


    WHAT NEEDS TO CHANGE?

        Delete button needs to send a message up to the bot
        Ignore button needs to msg the bot

        table ids will now directly be message ids and not sq-123

    Extra methods needed

    ignore_user(userid)
    ignore_msg(msgid)

    delete_user(userid)
    delete_msg(msgid)

    OBSERVERS needed so we can send a message when ignore or delete are pressed
*/
import Emitter from "./Emitter.class.js";

const $speechQDiv = gid('speechqueue');
const $speechQOldDiv = gid('speechqueueold');

//const TTSVars = TT.config.TTSVars;

const TTS_MSG_ID_PREFIX = "";
const ALLOW_CLASS = 'is-success';
const IGNORE_CLASS = 'is-danger';

export default class TTSMsgDisplay extends Emitter
{	// SCOPE
    constructor() {
		super();
    }

        // used to get TTSVars.speech_queue_list_add({user: userstate["display-name"], text: message, id: nid, msgid})
		// receives a Message class
	speech_queue_add_entry( message ) {
		//console.log("SQ.add() GETS", data);
		let { msgDisplay, msgid, userCaps, userLower, userid } = message;	// user = caps, username = lower

		let frag = document.createDocumentFragment();

		let speechQRow = dce('nav');
		speechQRow.id = msgid;
		speechQRow.dataset.userid = userid;
		speechQRow.classList.add('speechQRow');

			// left = username (left, middle and right are flexbox items, order changed on media query)

		let usernameDiv = dce('div');
		usernameDiv.classList.add('speechQUser');
		usernameDiv.textContent = userCaps;

		let speech = dce('div');
		speech.classList.add('speechQText');
		speech.textContent = msgDisplay;

			// right = buttons

		let buttons = dce('div')
		buttons.classList.add('speechQButtons');

			// DELETE BUTTON
			// DELETE BUTTON
			// DELETE BUTTON

		let btnDel = dce('button');
		btnDel.dataset.msgid = msgid;
		btnDel.dataset.userid = userid;
		btnDel.master  = this;	// .master can be used as this in button handlers

		btnDel.textContent = 'del';
		btnDel.classList.add('button', 'is-warning', 'is-small', 'ml-2', 'deletebtn');
		btnDel.onclick = this.del_button_onclick;

			// BAN/IGNORE BUTTON
			// BAN/IGNORE BUTTON
			// BAN/IGNORE BUTTON

		let btnBan = dce('button');
		btnBan.textContent = 'ignore';
		btnBan.classList.add('button', 'is-danger', 'is-small', 'ignorebtn');
		btnBan.onclick = this.ignore_button_onclick;
		btnBan.dataset.userid = userid;
		btnBan.dataset.username = userCaps;	// user = cased, username = lower
		btnBan.master = this;

		buttons.appendChild(btnBan);
		buttons.appendChild(btnDel);
			// username - text - buttons
		speechQRow.append(usernameDiv, speech, buttons);

		frag.appendChild(speechQRow);
		$speechQDiv.appendChild(frag)
	}

		// transfers a message from the main queue to the old queue
		// include_id inserts a tag with the message id before the message

	speech_queue_entry_to_old_messages = function (id, addIdTag) {
		let nid = gid(TTS_MSG_ID_PREFIX + id);

		if (!nid) {
			console.log("*** ERROR: no speech queue entry with ID : "+id);
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
	speech_queue_add_tag(id, text, colour = "info") {
		let nid = gid(TTS_MSG_ID_PREFIX + id);

		if (!nid) {
			return;
		}

		let tagSpan = document.createElement("span");
		tagSpan.innerText = text;
		tagSpan.className = `tag is-${colour} mr-1`;
		nid.prepend(tagSpan);
	}

		// iteratively clear the html speech list

	speech_queue_clear() {
		while ($speechQDiv.firstChild) {
			$speechQDiv.removeChild($speechQDiv.lastChild);
		}
	}

		// remove with id but forcible if del button used

	speech_queue_remove_entry(id, force = false) {
		id = gid(TTS_MSG_ID_PREFIX + id);
		if ( !id  || ( id.frozen && force === false ) ) {
			return false;
		}
		id?.remove();
		return true;
	}

/* 	speech_queue_entry_freeze(id) {
		id = gid(TTS_MSG_ID_PREFIX + id);
		if (id) {
			id.frozen = true;
		}
	}
 */

        // emit that ignore pressed

    ignore_button_onclick(e) {
		let ds = e.target.dataset;

		if (ds.banned === "true")
        	e.target.master.emit("unignoreclick", ds);
		else
        	e.target.master.emit("ignoreclick", ds);
    }

		// ban freezes the current entry allowing you do unban.
		// on ban all the user's other entries are cleared and their name is added to ignored users.

	ignore_user(userid) {
		let sqUpcomingEntries = this.get_user_upcoming_msgs(userid); // ban buttons have user and data-id

		let userIgnoreBtns = this.get_user_ignore_btns(userid);	// for changing allows

		for (let iBtn of userIgnoreBtns) {
			iBtn.dataset.banned = true;
			iBtn.textContent = "un-ignore";
			iBtn.classList.remove(IGNORE_CLASS);
			iBtn.classList.add(ALLOW_CLASS);
		}
			//speech_queue_entry_freeze(id);	// stop the entry from being removed by a speech end event
		for (let upcomingEntry of sqUpcomingEntries) {	// only add tags to messages in main queue
			this.speech_queue_entry_to_old_messages(upcomingEntry.id);
			this.speech_queue_add_tag(upcomingEntry.id, "ignored", 'success');
		}

	}

	unignore_user(userid) {
		let userIgnoreBtns = this.get_user_ignore_btns(userid);

		for (let iBtn of userIgnoreBtns) {
			iBtn.dataset.banned = false;
			iBtn.textContent="ignore";
			iBtn.classList.remove(ALLOW_CLASS);
			iBtn.classList.add(IGNORE_CLASS);
		}
	}

	get_user_ignore_btns(userid) {
		return qsa(`.ignorebtn[data-userid="${userid}"]`);
	}
	get_user_upcoming_msgs(userid) {
		return qsa(`#speechqueue nav[data-userid="${userid}"]`);
	}

    remove_msg(msgid) {
        gid(TTS_MSG_ID_PREFIX + msgid)?.remove();
    }

		// delete buttons remove rows no problem

	del_button_onclick(e) {
		let ds = e.target.dataset;
 		e.target.master.emit("deleteclick", ds);//{action: "deleteclick", msgid:ds.msgid});
	}



		// document create element
	/* dce(i) {
		return document.createElement(i);
	} */

}	// SCOPE ENDS

export { TTSMsgDisplay } ;
