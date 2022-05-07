/**
 *  Detects phrases like 'you're muted' or can't hear you in the chat.
 *  TODO : add cooldown progressive button, cooldown counter
 *  MODAL for config values default timeout
 */
"use strict"
//var channels = [ 'drunkula' ]//, 'alexisstrum', 'TheVillageRuse']//, 'dandidoesit' ]//, 'rusty836', 'kim_justice' ]
const TT_MUTED_MINS_MAX = 300;
    // regex's to match the input
const muteRegexs = [/!muted/i, /\b[you|mic].*\bmute/i, /can[']?t.*hear.*you/i]

var chatMsgNewVars = {
    onCooldown: false,
    cooldownDefaultSecs : 181,
    cooldownSecsRemaining : 180,  // that'll be changing
    cooldownCallback : null,    // for setInterval

    flashSetTimeout: null,
    flashDuration: 3500,    // milliseconds
    flashFunc: x => x,  // does nothing for now
    alertSound: null,   // embedded sound item for alertSound.play()

    cooldownDiv: null,
    cooldownSecsDiv: null
}


    // on window load

window.addEventListener('load', (event) => {
    log('LOADED');

    gid('clearmainout').addEventListener('click', () => o('', true) );

    tt_forms_init_common(); // channels populates form fields from url string
    tt_forms_init_common_permissions(); // allonamed and checkboxes

    chatMsgNewVars.alertSound = document.getElementById('ding');


    // param can be chans or channels
        // auto sets array in TMIConfig.perms to lower case - set to a global system and we can put this as common
        // main listener
    add_new_chat_message_tmi_listener();
        // button that creates the link to the page
    add_bookmark_button_handler();
        // joins/leave channels on submit
    mainform_add_submit_handler();

    init_flasher_tech();

    init_cooldown_time_inc_buttons()

    set_default_cooldown_onchange();

    chatMsgNewVars.cooldownSecsDiv = gid('cooldowncountdown');
    chatMsgNewVars.cooldownDiv = gid('cooldownoutput')

    setInterval(muted_cooldown_interval_timer, 1000);// DEBUG want 1000 in real use
        // autojoin
    if (TMIConfig.autojoin) { console.log(r("Auto Joining channels..."));
        join_chans();
    }
});// on load ends


// I should of course include the channel, cclient is global
// tmi code is re-adding event listeners on disconnects

    // MAIN Twitch listener

function add_new_chat_message_tmi_listener()
{
    // https://dev.twitch.tv/docs/irc/tags#globaluserstate-twitch-tags
    let lastMsgId = null;   // after a reconnect TMI sometimes sents repeats

    cclient.on('message', (channel, userstate, message, self) => {
        if (self) return;   // Don't listen to my own messages..

        if (lastMsgId === userstate['id'])
            return;

        lastMsgId = userstate['id'];

            // Handle different message types..
        switch(userstate["message-type"]) {
            case "action": case "chat": case "whisper":
                check_new_chat_message_alert(userstate, channel, message);
                break;
            default: // pfff ?
                break;
        }
    });
}


/**
 *  sod the channel for now
 * @param {object} user
 * @param {string} msg
 * @returns
 */


function check_new_chat_message_alert(user, channel, msg) {
    if (chatMsgNewVars.onCooldown) {
        console.log('Still on a cooldown'); // DEBUG
        return;
    }
        // disabled

    if (gid('enablealert').checked === false) {
        return;
    }

    //user.mod bool user.user-type = "mod" badges: {vip: "1"} user.subscriber:bool
    var allowDing = false;
        // check permissions first
    switch (true) {
        case TMIConfig.perms.allowEveryone:
        case TMIConfig.perms.allowMods && user.mod:
        case TMIConfig.perms.allowVips && user.badges && user.badges.vip === "1":
        case TMIConfig.perms.allowNamed.includes(user.username):
        case user.badges && user.badges.broadcaster === "1":
            allowDing = true;
            break;

        default:
            allowDing = false;
            break;
    }

        // ding away
    if (allowDing) {
        for(let rgx of muteRegexs) {
            if (rgx.test(msg)) {
                log('Matched: ' + rgx.toString() + ' : '+ channel +' : ' + user.username);
                o(channel+' Ding allowed for ' + user.username)

                if ( gid('playsound').checked ) {
                    chatMsgNewVars.alertSound.play()
                        .catch(e => log('<rb>PLAY FAILED:</rb> '+e.toString())); //  you have to have interected with the document first
                }

                if ( gid('flashscreen').checked ) {
                    chatMsgNewVars.flashFunc();
                }

                //mutedVars.cooldownCallback = setInterval( () => mutedVars.onCooldown = false, mutedVars.cooldownSecs * 1000);

                chatMsgNewVars.onCooldown = true;
                chatMsgNewVars.cooldownSecsRemaining = chatMsgNewVars.cooldownDefaultSecs;

                break;

            }
        }
    }
}


    /**
     *  The default cooldown minutes onchange handler
     */

function set_default_cooldown_onchange() {
    let defCool = gid('defaultcooldown');

    defCool.onchange = () => {
        let coolMins = ~~defCool.value; // int

        if (coolMins < 0) coolMins = 0;
        if (coolMins > TT_MUTED_MINS_MAX) coolMins = TT_MUTED_MINS_MAX;

        chatMsgNewVars.cooldownDefaultSecs = coolMins * 60;

        defCool.value = coolMins;

        console.log('SETTING DEFAULT TO ', coolMins, 'minutes');
    }

    defCool.onchange();
}


docReady( () => {
});


function init_cooldown_time_inc_buttons() {
	var btns = qsa('.cooldown-set');

	btns.forEach( (btn) => {
		let addS = btn.dataset['add'];

		if (addS === "clear") {
			btn.onclick = () => {
				console.log("Clearing timeout");	// imagine their should be a function here
				chatMsgNewVars.cooldownSecsRemaining = 0;
			}
		}
		else {
			btn.onclick = () => {
				console.log('adding mini', addS,'to', chatMsgNewVars.cooldownSecsRemaining);
				chatMsgNewVars.cooldownSecsRemaining += ~~addS;	// integerise, otherwise it acts as a string
			}
		}
	})
}


    // decreases the timer and outputs the time remaining.  yes, it's got more than one duty

function muted_cooldown_interval_timer() {
	if (chatMsgNewVars.cooldownSecsRemaining > 0) {
        chatMsgNewVars.onCooldown = true;    // saves checks when adding time

		let out = '';

		if (chatMsgNewVars.cooldownSecsRemaining <= 60) {
			out = chatMsgNewVars.cooldownSecsRemaining;
		}
		else {
			out = Math.round(chatMsgNewVars.cooldownSecsRemaining / 60) + 'm';
		}
            // don't redraw if the output hasn't changed (minutes)
		if (this.myLastIntOutput != out)
			chatMsgNewVars.cooldownSecsDiv.innerHTML = out;

		this.myLastIntOutput = out;	// don't keep changing if it's on minutes

		chatMsgNewVars.cooldownSecsRemaining--;

		return;
	}
    else {
        chatMsgNewVars.onCooldown = false;
        chatMsgNewVars.cooldownSecsDiv.innerHTML = 'Over';
    }

}






function init_flasher_tech() {        // if a flasher is there set up a func

    let flashBox = gid('flasher');
    flashBox.onclick = stop_flash;  // allow a click to cancel

    let flashFunc = () => {
        clearTimeout(chatMsgNewVars.flashSetTimeout);

        flashBox.classList.add('flasher');

        chatMsgNewVars.flashSetTimeout = setTimeout(() => {
            flashBox.classList.remove('flasher');
        }, chatMsgNewVars.flashDuration);
    }

    if (flashBox) { console.log('FLASHER ASSIGNED');
        chatMsgNewVars.flashFunc = flashFunc;
    }

    document.getElementById('flashtestbtn').onclick = flashFunc;
}

function start_flash() {
    clearTimeout(chatMsgNewVars.flashSetTimeout);
    flashBox.classList.add('flasher');
    chatMsgNewVars.flashSetTimeout = setTimeout(stop_flash, chatMsgNewVars.flashDuration);
}

function stop_flash() {
    let flashBox = gid('flasher');
    flashBox.classList.remove('flasher');

    clearTimeout(chatMsgNewVars.flashSetTimeout);
}