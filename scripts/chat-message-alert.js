/**
 *  Alerts you to new chat messages on a cooldown
 *  SOLVED: BUG - if you add time during coutdown then it only adds default time
 * FOUND A BUG - if you add time but a message comes in before the next interval the alert window can show again
 *  so check_new_chat_message_alert gets called again
 */
"use strict"

{// scope start
    const TT_CHAT_MSG_COOLDOWN_MINS_MAX = 300;
    const TT_CHAT_MSG_SECS_BEFORE_ALERT_MAX = 120;

        // regex's to match the input

    TMIConfig.NCMVars = {
        onCooldown: true,
        cooldownDefaultSecs : 180,
        cooldownSecsRemaining : 180,  // that'll be changing

        cooldownBtnText: 'n/a',

        secsBeforeAlert : 15,       // in case you spot a chatter and want to add to the cooldown

        alertPending: false,

        flashSetTimeout: null,
        flashDuration: 3500,    // milliseconds
        flashFunc: x => x,  // does nothing for now
        alertSound: null,   // embedded sound item for alertSound.play()

        cooldownDiv: null,
        cooldownSecsDiv: null
    }
        // proxy me do - means observing in dev tools is easy
    const NCMVars = TMIConfig.NCMVars;

    const NCMEvents = [
        {selector: '#defaultcooldown', event: 'change', function: ncm_default_cooldown_onchange, params: {}},
        {selector: '.cooldown-set', event: 'click', function: ncm_cooldown_inc, params: {}},
        {selector: '#secsbeforealert', event: 'click', function: ncm_secs_before_alert_onchange, params: {}},
    ];

        // on window load

    window.addEventListener('load', (event) => {
        log('LOADED');

        TT.forms_init_common(); // channels populates form fields from url string
            // after init as defaults changed
        TT.add_event_listeners(NCMEvents);

        let clearChatters = () => { o('', true); };

            // adds functions to buttons with confirm countdown
        TT.button_add_confirmed_func('.clearChatConf', clearChatters);

            // set after forms_init
        NCM_set_default_cooldown();

            // main listener
        NCM_add_tmi_listener();

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

        init_flasher_tech();

        // autojoin
        if (TMIConfig.autojoin) { console.log(r("Auto Joining channels..."));
            TT.join_chans();
        }
    });// on load ends


        // MAIN Twitch listener

    function NCM_add_tmi_listener()
    {
        // https://dev.twitch.tv/docs/irc/tags#globaluserstate-twitch-tags
        let lastMsgId = null;   // after a reconnect TMI sometimes sents repeats

        TT.cclient.on('message', (channel, userstate, message, self) => {
            if (self || lastMsgId === userstate['id']) return;   // Don't listen to my own messages..

            lastMsgId = userstate['id'];    // unique to every message

                // Handle different message types..
            switch(userstate["message-type"]) {
                case "action": case "chat": case "whisper":
                    NCM_check_new_chat_message_alert(userstate, channel, message);
                    break;
                default: // pfff ?
                    break;
            }
        });
    }


    /**
     *  sod the channel for now
     */


    function NCM_check_new_chat_message_alert(user, channel, msg) {
        if (NCMVars.onCooldown || NCMVars.alertPending) {        //console.log('Still on a cooldown'); // DEBUG
            return;
        }
            // disabled
        if (gid('enablealert').checked === false) {
            return;
        }

        if ( TMIConfig.perms.ignoredUsers.includes(user.username) ) {
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
        //if ( gid('playsound').checked ) {
        if ( NCMVars.playSound ) {
            NCMVars.alertSound.play()
                .catch(e => log('<rb>PLAY FAILED:</rb> '+e.toString())); //  you have to have interected with the document first
        }

        //if ( gid('flashscreen').checked ) {
        if ( NCMVars.flashEnabled ) {
            NCMVars.flashFunc();
        }
    }

        // I'm getting into this micro func thing

    function NCM_set_default_cooldown() {
        NCMVars.onCooldown = true;
        NCMVars.cooldownSecsRemaining = NCMVars.cooldownDefaultSecs;
    }

        // secs before input input change

    function ncm_secs_before_alert_onchange (e) {
        let f = e.target;

        let secsB4Alert = ~~f.value; // int

        if (secsB4Alert < 0) secsB4Alert = 0;
        if (secsB4Alert > TT_CHAT_MSG_SECS_BEFORE_ALERT_MAX) secsB4Alert = TT_CHAT_MSG_SECS_BEFORE_ALERT_MAX;

        NCMVars.secsBeforeAlert = secsB4Alert;
        f.value = secsB4Alert;
        console.log('Secs Before Alert TO ', secsB4Alert, 'seconds');
    }


        /**
         *  The default cooldown minutes onchange handler sets the value in the 'globals'
         */

    function ncm_default_cooldown_onchange (e) {
        let coolMins = ~~e.target.value; // int

        if (coolMins < 0) coolMins = 0;
        if (coolMins > TT_CHAT_MSG_COOLDOWN_MINS_MAX) coolMins = TT_CHAT_MSG_COOLDOWN_MINS_MAX;

        NCMVars.cooldownDefaultSecs = coolMins * 60;

        console.log('SETTING DEFAULT TO ', coolMins, 'minutes');
    }

        // during the final countdown these values get bustesd

    function ncm_cooldown_inc(e) {
        let btn = e.target;
        let addS = btn.dataset['add'];

        if (addS === "clear") {
            console.log("Clearing timeout");	// imagine their should be a function here
            NCMVars.cooldownSecsRemaining = 0;
        }
        else {
            console.log('adding mini', addS,'to', NCMVars.cooldownSecsRemaining);
            NCMVars.cooldownSecsRemaining += ~~addS;	// integerise, otherwise it acts as a string
        }
    }


        // decreases the timer and outputs the time remaining.  yes, it's got more than one duty

        /**
         *
         */

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
        if (NCMVars.cooldownBtnText != out) {
            NCMVars.cooldownSecsDiv.innerText = out;
            NCMVars.cooldownBtnText= out;
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

    /* function Xstart_flash() {
        clearTimeout(NCMVars.flashSetTimeout);
        flashBox.classList.add('flasher');
        NCMVars.flashSetTimeout = setTimeout(stop_flash, NCMVars.flashDuration);
    } */

    function stop_flash() {
        let flashBox = gid('flasher');
        flashBox.classList.remove('flasher');

        clearTimeout(NCMVars.flashSetTimeout);
    }

}//scope ends