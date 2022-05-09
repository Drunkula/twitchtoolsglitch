/**
 *  Alerts you to new chat messages on a cooldown
 *  SOLVED: FOUND A BUG - if you add time during coutdown then it only adds default time
 * FOUND A BUG - if you add time but a message comes in before the next interval the alert window can show again
 * so check_new_chat_message_alert gets called again
 */
"use strict"
//var channels = [ 'drunkula' ]//, 'alexisstrum', 'TheVillageRuse']//, 'dandidoesit' ]//, 'rusty836', 'kim_justice' ]
const TT_CHAT_MSG_COOLDOWN_MINS_MAX = 300;
const TT_CHAT_MSG_SECS_BEFORE_ALERT_MAX = 120;
    // regex's to match the input

var NCMVars = {
    onCooldown: true,
    cooldownDefaultSecs : 180,
    cooldownSecsRemaining : 180,  // that'll be changing

    secsBeforeAlert : 15,       // in case you spot a chatter and want to add to the cooldown

    alertPending: false,

    ignoredUsers: TMI_IGNORE_DEFAULT,

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

	let clearChatters = () => { o('', true); };
    //gid('clearmainout').addEventListener('click', clearChatters );
        // adds functions to buttons with confirm countdown
    button_add_confirmed_func('.clearChatConf', clearChatters);

    tt_forms_init_common(); // channels populates form fields from url string
    tt_forms_init_common_permissions(); // allonamed and checkboxes

        // main listener
    NCM_add_tmi_listener();
        // button that creates the link to the page
    add_bookmark_button_handler();
        // joins/leave channels on submit
    mainform_add_submit_handler();

    init_flasher_tech();

    init_cooldown_time_inc_buttons()

        // call AFTER form fields restore which is done in init_common

    if (!TMIConfig.$_GET['ignoredusers']) {
        gid('ignoredusers').value =  TMI_IGNORE_DEFAULT.join(' ');
    }

    set_ignored_users_onchange()
    set_default_cooldown_onchange();
    set_secs_before_alert_onchange();

        // clicking the alert
    gid('alertnotification').onclick = () => {
        NCM_clear_final_coundown();
        NCM_set_default_cooldown();
    }

        // divs for countdowns
    NCMVars.cooldownSecsDiv = gid('cooldowncountdown');
    NCMVars.cooldownDiv = gid('cooldownoutput')
    NCMVars.alertSound = document.getElementById('ding');

    setInterval(NCM_cooldown_interval_timer, 1000);

    // autojoin
    if (TMIConfig.autojoin) { console.log(r("Auto Joining channels..."));
        join_chans();
    }
});// on load ends


    // MAIN Twitch listener

function NCM_add_tmi_listener()
{
    // https://dev.twitch.tv/docs/irc/tags#globaluserstate-twitch-tags
    let lastMsgId = null;   // after a reconnect TMI sometimes sents repeats

    cclient.on('message', (channel, userstate, message, self) => {
        if (self || lastMsgId === userstate['id']) return;   // Don't listen to my own messages..

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
 */


function check_new_chat_message_alert(user, channel, msg) {
    if (NCMVars.onCooldown || NCMVars.alertPending) {        //console.log('Still on a cooldown'); // DEBUG
        return;
    }
        // disabled
    if (gid('enablealert').checked === false) {
        return;
    }

    if ( NCMVars.ignoredUsers.includes(user.username) ) {
        console.log('IGNORING:', user.username);
        return;
    }

        // ding time
    NCM_begin_final_countdown();

    o(channel+' New Chat message from ' + user.username)
}

    // pre-ding

function NCM_begin_final_countdown() {

    let secsB4Alert = NCMVars.secsBeforeAlert;
    let span4CountdownSecs = gid('alertcountdown');
    span4CountdownSecs.innerText = secsB4Alert;

    NCMVars.alertPending = true;
    NCM_show_final_countdown(true);

    NCMVars.finalCountdownSI = setInterval( () => {
        secsB4Alert--;
            // time been added or alert disabled ?
        if ( NCMVars.cooldownSecsRemaining > 0 || !gid('enablealert').checked ) {
            NCM_clear_final_coundown();
                // cheat to stop countdown alert reshowing when +time buttons used
            NCMVars.onCooldown = true;
            return;
        }
            // FIRE!
        if (secsB4Alert <= 0) {
            NCM_alerts_fire();
            NCM_set_default_cooldown();
            NCM_clear_final_coundown();
        }

        span4CountdownSecs.innerText = secsB4Alert;
    }, 1000);
}

    // separation of concerns for once

function NCM_show_final_countdown(show = true) {
    if (show)
        gid('alertnotification').classList.remove('is-hidden');
    else
        gid('alertnotification').classList.add('is-hidden');
}

    // click on the alert does this, ding_time does it twice and clicking the notification

function NCM_clear_final_coundown() {
    clearInterval( NCMVars.finalCountdownSI );
    NCMVars.alertPending = false;
    NCM_show_final_countdown(false);
}

    // play the music, light the lights.

function NCM_alerts_fire() {
    if ( gid('playsound').checked ) {
        NCMVars.alertSound.play()
            .catch(e => log('<rb>PLAY FAILED:</rb> '+e.toString())); //  you have to have interected with the document first
    }

    if ( gid('flashscreen').checked ) {
        NCMVars.flashFunc();
    }
}

    // I'm getting into this micro func thing

function NCM_set_default_cooldown() {
    NCMVars.onCooldown = true;
    NCMVars.cooldownSecsRemaining = NCMVars.cooldownDefaultSecs;
}

    /**
     *  The update 'global' secsBeforeAlert after some validation
     */

function set_secs_before_alert_onchange() {
    let sbaInput = gid('secsbeforealert');

    sbaInput.onchange = () => {
        let secsB4Alert = ~~sbaInput.value; // int

        if (secsB4Alert < 0) secsB4Alert = 0;
        if (secsB4Alert > TT_CHAT_MSG_SECS_BEFORE_ALERT_MAX) secsB4Alert = TT_CHAT_MSG_SECS_BEFORE_ALERT_MAX;

        NCMVars.secsBeforeAlert = secsB4Alert;
        sbaInput.value = secsB4Alert;
        console.log('Secs Before Alert TO ', secsB4Alert, 'seconds');
    }

    sbaInput.onchange();
}


    /**
     *  The default cooldown minutes onchange handler sets the value in the 'globals'
     */

function set_default_cooldown_onchange() {
    let defCool = gid('defaultcooldown');

    defCool.onchange = () => {
        let coolMins = ~~defCool.value; // int

        if (coolMins < 0) coolMins = 0;
        if (coolMins > TT_CHAT_MSG_COOLDOWN_MINS_MAX) coolMins = TT_CHAT_MSG_COOLDOWN_MINS_MAX;

        NCMVars.cooldownDefaultSecs = coolMins * 60;

        defCool.value = coolMins;

        console.log('SETTING DEFAULT TO ', coolMins, 'minutes');
    }

    defCool.onchange();
}

function set_ignored_users_onchange() {
    let igUsrs = gid('ignoredusers');

    igUsrs.onchange = () => {
            // strip out the words
        let iu = igUsrs.value; // int
        iu = iu.match(/\w+/g);

        iu = iu ? iu.map(a => a.toLowerCase()) : [];

        NCMVars.ignoredUsers = iu;

        console.log('SETTING Ignored users config TO ', iu);
    }

    igUsrs.onchange();
}

    // during the final countdown these values get bustesd

function init_cooldown_time_inc_buttons() {
	var btns = qsa('.cooldown-set');

	btns.forEach( (btn) => {
		let addS = btn.dataset['add'];

		if (addS === "clear") {
			btn.onclick = () => {				console.log("Clearing timeout");	// imagine their should be a function here
				NCMVars.cooldownSecsRemaining = 0;
			}
		}
		else {
			btn.onclick = () => {   			console.log('adding mini', addS,'to', NCMVars.cooldownSecsRemaining);
				NCMVars.cooldownSecsRemaining += ~~addS;	// integerise, otherwise it acts as a string
			}
		}
	})
}


    // decreases the timer and outputs the time remaining.  yes, it's got more than one duty

function NCM_cooldown_interval_timer() {
    let out = '';

	if (NCMVars.cooldownSecsRemaining > 0) {
        NCMVars.onCooldown = true;    // saves checks when adding time

		if (NCMVars.cooldownSecsRemaining <= 60) {
			out = NCMVars.cooldownSecsRemaining;
		}
		else {
			out = Math.round(NCMVars.cooldownSecsRemaining / 60) + 'm';
		}

        NCMVars.cooldownSecsRemaining--;
    }
    else {
        NCMVars.onCooldown = false;
        out = 'Over';
    }

        // don't redraw if the output hasn't changed (minutes / Over)
    if (this.myLastIntOutput != out) {
        NCMVars.cooldownSecsDiv.innerText = out;
        this.myLastIntOutput = out;
    }
}




    // ***********************************************
    // *********** FLASHER FUNCS *********************
    // ***********************************************


function init_flasher_tech() {        // if a flasher is there set up a func

    let flashBox = gid('flasher');
    flashBox.onclick = stop_flash;  // allow a click to cancel

    let flashFunc = () => {
        clearTimeout(NCMVars.flashSetTimeout);

        flashBox.classList.add('flasher');

        NCMVars.flashSetTimeout = setTimeout(() => {
            flashBox.classList.remove('flasher');
        }, NCMVars.flashDuration);
    }

    if (flashBox) { console.log('FLASHER ASSIGNED');
        NCMVars.flashFunc = flashFunc;
    }

    document.getElementById('flashtestbtn').onclick = flashFunc;
}

function start_flash() {
    clearTimeout(NCMVars.flashSetTimeout);
    flashBox.classList.add('flasher');
    NCMVars.flashSetTimeout = setTimeout(stop_flash, NCMVars.flashDuration);
}

function stop_flash() {
    let flashBox = gid('flasher');
    flashBox.classList.remove('flasher');

    clearTimeout(NCMVars.flashSetTimeout);
}