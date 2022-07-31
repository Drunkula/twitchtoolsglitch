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
        flashEnabled: true,
        playSound: true,
        cooldownDefaultMins: 5, // all set with data-to...

        cooldownBtnText: 'n/a',     // "cache" for button output

        secsBeforeAlert : 15,       // in case you spot a chatter and want to add to the cooldown
        alertPending: false,

        alertSound: null,   // embedded sound item for alertSound.play()
        alertEnabled: true, // also set by checkbox

        cooldownSecsDiv: null,  // countdown display

        flasher: new Flasher(),
        countdown: new Countdown(),
    }
        // proxy me do - means observing in dev tools is easy
    const NCMVars = TMIConfig.NCMVars;

    const NCMEvents = [
        {selector: '#defaultcooldown', event: 'change', function: ncm_default_cooldown_input_onchange, params: {}},
        {selector: '.cooldown-set', event: 'click',     function: ncm_cooldown_time_btn_handlers, params: {}},
        {selector: '#flashtestbtn', event: 'click',     function: () => NCMVars.flasher.start_flash(), params: {}},
    ];

        // on window load

    window.addEventListener('load', (event) => {
        log('LOADED');

            // divs for countdowns
        NCMVars.cooldownSecsDiv = gid('cooldowncountdown');
        NCMVars.alertSound = document.getElementById('ding');

        TT.forms_init_common(); // channels populates form fields from url string
            // after init as defaults changed
        TT.add_events_common();
        TT.add_event_listeners(NCMEvents);

            // adds functions to buttons with confirm countdown
        let clearChatters = () => { o('', true); };
        TT.button_add_confirmed_func('.clearChatConf', clearChatters);

            // set after forms_init
        NCM_init_countdown();

            // main listener
        NCM_add_tmi_listener();

            // clicking the alert
        gid('alertnotification').onclick = () => {
            NCM_clear_final_coundown();
            NCM_init_countdown();
        }

            // autojoin
        if (TMIConfig.autojoin) { console.log(r("Auto Joining channels..."));
            TT.join_chans();
        }
    });// on load ends


    function NCM_init_countdown () {
        let countdown = NCMVars.countdown;
        countdown.set_default(NCMVars.cooldownDefaultMins * 60);
        countdown.on('tick', NCM_cooldown_tick_callback);
        countdown.start();
    }

        // MAIN Twitch listener

    function NCM_add_tmi_listener()
    {        // https://dev.twitch.tv/docs/irc/tags#globaluserstate-twitch-tags
        let lastMsgId = null;   // after a reconnect TMI sometimes sents repeats

        TT.cclient.on('message', (channel, userstate, message, self) => {
            if (NCMVars.countdown.active() || self || lastMsgId === userstate['id'] || NCMVars.alertPending ||
                NCMVars.alertEnabled === false || TMIConfig.perms.ignoredUsers.includes(userstate.username)             )
            {
                return;   // Don't listen to my own messages..
            }

            lastMsgId = userstate['id'];    // unique to every message

                // Handle different message types..
            switch(userstate["message-type"]) {
                case "chat": case "action": case "whisper":
                    o(`<span class="list-channel">${channel}</span> : <span class="list-user">${userstate['display-name']}</span> : <span class="list-message">${message}</span>`);
                    NCM_begin_final_countdown();
                    break;
                default: // pfff ?
                    break;
            }
        });
    }


        // pre-ding small popup - could use a second countdown but I can't be faffed

    function NCM_begin_final_countdown() {
        let secsB4Alert = NCMVars.secsBeforeAlert;
        let span4CountdownSecs = gid('alertcountdown');
        span4CountdownSecs.textContent = secsB4Alert;

        NCMVars.alertPending = true;
        NCM_show_final_countdown(true);

        NCMVars.finalCountdownSI = setInterval( () => {
            secsB4Alert--;
                // time been added or alert disabled ?
            if ( NCMVars.countdown.active() || NCMVars.alertEnabled === false ) {
                NCM_clear_final_coundown();  // cheat to stop countdown alert reshowing when +time buttons used
                return;
            }
                // FIRE!
            if (secsB4Alert <= 0) {
                NCM_alerts_fire();
                NCMVars.countdown.reset();
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
        NCM_show_final_countdown(false);
        NCMVars.alertPending = false;
    }

        // play the music, light the lights.

    function NCM_alerts_fire() {
        if ( NCMVars.playSound ) {
            NCMVars.alertSound.play()
                .catch(e => log('<rb>PLAY FAILED:</rb> '+e.toString())); //  you have to have interected with the document first
        }

        if ( NCMVars.flashEnabled ) {   // auto set data-tocheckbox
            NCMVars.flasher.start_flash();
        }
    }


        /**
         *  The input for default cooldown handler sets the value in the 'globals'
         */

    function ncm_default_cooldown_input_onchange (e) {
        let defCool = gid('defaultcooldown');

        defCool.onchange = (e) => {
            NCMVars.countdown.set_default( parseInt(e.target.value) * 60 );
            console.log('SETTING DEFAULT TO ', parseInt(e.target.value) * 60, 'minutes');
        }
    }

        // during the final countdown these values get bustesd

    function ncm_cooldown_time_btn_handlers(e) {
//        let btn = e.target;
        let addS = e.target.dataset['add'];

        if (addS === "clear") {            console.log("Clearing timeout");	// imagine their should be a function here
            NCMVars.countdown.set_time(0)
        }
        else {            //console.log('adding mini', addS,'to', NCMVars.cooldownSecsRemaining);            //NCMVars.cooldownSecsRemaining += ~~addS;	// integerise, otherwise it acts as a string
            NCMVars.countdown.add_secs(addS);
            NCMVars.countdown.start();
        }
    }


        /**
         *  Updates cooldown countdown output on each tick
         *
         * OLD comment said : decreases the timer and outputs the time remaining.  yes, it's got more than one duty
         */

    function NCM_cooldown_tick_callback(secs) {
        let out = '';

        if (secs > 0) {
            out = secs < 60 ? secs : Math.round(secs / 60) + 'm';
        }
        else {
            out = 'Over';
        }
            // don't redraw if the output hasn't changed (minutes / Over)
        if (NCMVars.cooldownBtnText != out) {
            NCMVars.cooldownBtnText= out;
            NCMVars.cooldownSecsDiv.textContent = out;
        }
    }



}//scope ends