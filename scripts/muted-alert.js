/**
 *  Detects phrases like 'you're muted' or can't hear you in the chat.
 *  TODO : add cooldown progressive button, cooldown counter
 *  MODAL for config values default timeout
 */
 "use strict"

 {   // SCOPE

 //const TT_MUTED_MINS_MAX = 300;   // done in input
     // regex's to match the input
 const muteRegexs = [/!muted/i, /\b[you|mic].*\bmute/i, /can[']?t.*hear.*you/i]

 TMIConfig.MUTEDVars = {
    alertEnabled: true, // 3 set by data-tocheckbo
    soundEnabled: true,
    flashEnabled: true,

     cooldownBtnText: null, // 'cache' for button text changing
     cooldownSecsDiv: null, // is legit

     alertSound: null,   // embedded sound item for alertSound.play()

     flasher: new Flasher(),
     countdown: new Countdown(),
}

const MUTEDVars = TMIConfig.MUTEDVars;

     // on window load

window.addEventListener('load', (event) => {
    gid('clearmainout').addEventListener('click', () => o('', true) );

    TT.forms_init_common(); // channels populates form fields from url string

    MUTEDVars.alertSound = gid('ding');
        // main listener
    MUTED_tmi_add_message_listener();
    MUTED_init_cooldown_time_plus_buttons()
    MUTED_add_default_cooldown_onchange();

    MUTEDVars.cooldownSecsDiv = gid('cooldowncountdown');

    MUTED_init_countdown();

        // autojoin
    if (TMIConfig.autojoin) { console.log(r("Auto Joining channels..."));
        TT.join_chans();
    }

    gid('flashtestbtn').onclick = MUTEDVars.flasher.start_flash.bind(MUTEDVars.flasher);
});// on load ends


function MUTED_init_countdown () {
    let countdown = MUTEDVars.countdown;
    countdown.set_time(MUTEDVars.cooldownDefaultMins * 60);
    countdown.on('tick', MUTED_cooldown_tick_callback);
    countdown.start();
}

     // I should of course include the channel, cclient is global
     // tmi code is re-adding event listeners on disconnects
     // MAIN Twitch listener

function MUTED_tmi_add_message_listener()
{       // https://dev.twitch.tv/docs/irc/tags#globaluserstate-twitch-tags
    let lastMsgId = null;   // after a reconnect TMI sometimes sents repeats

    TT.cclient.on('message', (channel, userstate, message, self) => {
        if ( MUTEDVars.countdown.active() || MUTEDVars.alertEnabled === false || self) {
            return;
        }

        if (lastMsgId === userstate['id'])
            return;

        lastMsgId = userstate['id'];    // unique to every message

            // Handle different message types..
        switch(userstate["message-type"]) {
            case "chat":
                MUTED_check_tmi_message(userstate, channel, message);
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

 function MUTED_check_tmi_message(user, channel, msg) {
     let allowDing = TT.user_permitted(user);

         // ding away
     if (allowDing) {
         for(let rgx of muteRegexs) {
             if (rgx.test(msg)) {
                 log('Matched: ' + rgx.toString() + ' : '+ channel +' : ' + user.username);
                 o(channel+' Ding allowed for ' + user.username)

                 if ( MUTEDVars.soundEnabled ) {
                     MUTEDVars.alertSound.play()
                         .catch(e => log('<rb>PLAY FAILED:</rb> '+e.toString())); //  you have to have interected with the document first
                 }

                 if ( MUTEDVars.soundEnabled ) {
                     MUTEDVars.flasher.start_flash();
                 }

                 MUTEDVars.countdown.reset();
                 break;
             }
         }// for end
     }// if end
 }



     /**
      *  The default cooldown minutes onchange handler
      */

 function MUTED_add_default_cooldown_onchange() {
     gid('defaultcooldown').onchange = (e) => {
         MUTEDVars.countdown.set_default( parseInt(e.target.value) * 60 );         //console.log('SETTING DEFAULT TO ', parseInt(e.target.value) * 60, 'minutes');
     }
 }

    // easily absorb into add_events

 function MUTED_init_cooldown_time_plus_buttons() {
     let btns = qsa('.cooldown-set');

     btns.forEach( (btn) => {
         let addS = btn.dataset['add'];

         if (addS === "clear") {
             btn.onclick = () => {                 //console.log("Clearing timeout");	// imagine their should be a function here
                 MUTEDVars.countdown.set_time(0);
             }
         }
         else {
             btn.onclick = () => {                 //console.log('adding mini', addS,'to', MUTEDVars.countdown.remaining());
                 MUTEDVars.countdown.add_secs(addS);
                 MUTEDVars.countdown.start();
             }
         }
     })
 }


     // listens to countdown 'tick' event and converts the seconds to output

function MUTED_cooldown_tick_callback(secs) {
    let out = '';

    if (secs > 0) {
        out = secs < 60 ? secs : Math.round(secs / 60) + 'm';
    } else {
        out = 'Over';
    }
        // cache adjusting the DOM
    if (MUTEDVars.cooldownBtnText != out) {
        MUTEDVars.cooldownBtnText = out;
        MUTEDVars.cooldownSecsDiv.textContent = out;
    }
 }

 }   // scope