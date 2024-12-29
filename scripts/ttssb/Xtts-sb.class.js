import SpeecherSB from "./SpeecherSB.class.js";

/*
    REDUNDANT
    Being as SB will be handlling all the queueing and I have to jump through hoops I think a stripped down
    speecher that will add message ids to the utterances will make things easier.
*/

/**
 *
 */

//export default class TTSStreamerbot extends SockMsgRouter {
export default class TTSStreamerbot {
    // speech needs to be here
    speech = new SpeecherSB();
    id = "";        // assigned by SB on connect
    sessionId = ""; // assigned by SB on connect.  Can be used for a broadcast that's also targetting

    constructor() {
        //super();
        console.log("I am a TTSStreamerbot contructer");
        console.log("this.socketEvents", this.socketEvents);

        this.init_tts();
    }

        // receives msgid, userid, username, user, emotecount, emotes array, msg
        // need to get the msgid into the utterance

        // speak returns a speech queue id that is sent with the "beforespeak" event
        // we can use this to store a message id

    speak(d) {
        console.log("speak() GOT THIS:", d);
        if (true || d.id === this.id) { // eventually a browser's id will know if it's to speak

        }

        if ( this.speech.speak(d.msg, {msgid: d.msgid, userid: d.userid}) ) {
            return true;
        }

        // tell the bot that the message failed
        //this.send_json({action:"speakfailure", data:d});

        return false;
    }

// ALL OF THESE are coupled

    cancel_speak_action(d) {
        // if we're speaking and the id is the same then cancel or just cancel - whatever
        this.speech.cancel();
    }

    async init_tts() {
        return await this.speech.ready();

        this.speech.addEventListener('error', e => { cclog("SPEECH ERROR", "r"); console.log(e); });
        this.speech.addEventListener('end', e => console.log("SPEECHER ENDED", e));
        this.speech.addEventListener('beforespeak', e => console.log("BEFORE SPEAK CALLED", e));
    }
}   // CLASS


