/*
    Imports happen before any other code is run HERE, before even the first line of code happens

    To fix this we can put code we do want to run in a module and using window.clog = ... happens and the
    global value is then treated the way you'd hope it would.

*/
import "./setup.mod.js";   // creates clog and cclog globals, toast, has to be in module
import { cclog } from "./setup.mod.js";

import { view_setup } from "./tts-sb.VIEWS.js";

import SpeecherSB from "./SpeecherSB.class.js";
import SockMsgRouter from "../yt/sockmsgrouter.class.mod.js";

const SOCKET_PORT = 8083;   // SB TTS socket
const SOCKET_ADDR = `ws://localhost:${SOCKET_PORT}/`;
const SESSIONSTORAGE_ID_VAR = "tts-sb-id";
const SESSIONSTORAGE_SESSID_VAR = "tts-sb-sessid";

export const tts = new SpeecherSB();
export const ttsVoices = {};  // voiceURI: synth voice

export const sockMsg = new SockMsgRouter();

window.addEventListener('load', main);
window.out = x => x;    // for HTML output
window.TTS = {};    // our global
window.ttsv = ttsVoices;    // DEBUG

    // NAUGHTY but SpeecherSB doesn't have an id or sessionid
tts.id = ""; tts.sessionId = "";

window.tts = tts;

async function main() {
    let logDiv = gid("log");
    out = x => { let d = dce("div"); d.innerHTML = x; logDiv.appendChild(d); }

    window.addEventListener("beforeunload", x => before_unload_handler());

    add_sockMsg_actions();
    add_socket_events();
    add_tts_events();

    sockMsg.connect(SOCKET_ADDR);
    await sockMsg.ready();

    await init_ttsVoices();

    view_setup();

    tts.speak("");  // trigger the popup if necessary
}

    // creates the ttsVoices "map"

async function init_ttsVoices() {
    await tts.ready();

    let voices = tts.getVoices();

    for (let voice of voices) {
        ttsVoices[voice.voiceURI] = voice;
    }
}


function add_sockMsg_actions() {
    let enabled = gid("enabled");

    let actions = {
        consoleclear: d => console.clear(),
        consolelog: d => {cclog( d.message, d.colour);},

        // TTS actions

        speak: d => {
            if (enabled.checked === false) return;
            d = d.data;
            cclog("GOING TO SAY " + d.msg, "y");
            tts.speak(d, {msgid: d.msgid, userid: d.userid})
        }, // should check true / false so can send a speak failure

        cancelspeak: d => tts.cancel_speak_action(d),

        sendvoices: d => tts_send_voices_action(), // now this isn't good
        idassign:   d => tts_id_assign_action(d),
        reidentify: d => tts_identity_check_action(d),

        sendcapabilities: x => tts_identify_to_sb()
    }
        // for now just apply these
    sockMsg.actions = {...sockMsg.actions, ...actions};
}

function add_tts_events() {
    //tts.speech.utteranceOn
    tts.utteranceOn({
        error: e => {
            if (e.error === 'not-allowed') {
                TT.show_modal("clickPageModal");
                console.log("NOT ALLOWED UTTERANCE ERROR: ", e.target.extradata.msgid, e);
            } else {
                console.log(`UTTERANCE ERROR (${e.error}) for ${e.target.extradata.msgid}`);
            }
        },
    })

    //tts.speech.utteranceOn
    // entries that get stuck in the table do have a sending utterance started

     tts.utteranceOn
     ({
        end: e => {
            //console.log("ENDED", e);
            sockMsg.send_json({action: "utteranceended", data: e.target.extradata});
            cclog("SENDING UTTERANCE ENDED: " + e.target.extradata.msgid, "y");
        },
        error: e => {
            //console.log("STANDARD utterance error pack:", e.target.extradata);
            sockMsg.send_json({action:"utteranceerror", data: e.target.extradata, reason: e.error});
            cclog("SENDING UTTERANCE ERROR msgid: " + e.target.extradata.msgid + " " + e.target.text, "r");
        },
        start: e => {
            sockMsg.send_json({action:"speaking", data: e.target.extradata});
            cclog("SENDING UTTERANCE STARTED: " + e.target.extradata.msgid + " -> " + e.target.text);
        }
    });

    // cancelling can happen meaning ditch messages
    // x is an utterance
    tts.addEventListener("cancelled", e => {
        cclog("UTTERANCE CANCELLED", "r");
        console.log(e);
        // I don't think these are needed
        // e = e.detail;
        // sockMsg.send_json({action: "utteranceerror", data: e.extradata, reason: "cancelled"});
        // console.log("SENDING CANCELLED utterance error pack:", e.extradata.msgid, e.extradata);
    })

    tts.addEventListener("rejecting", e => {
        sockMsg.send_json("utteranceerror", e.detail);
    });

    // tts can cancel before speaking
}

function add_socket_events() {
    sockMsg.socketEvents.push(['open', e => tts_identify_to_sb()]);

    sockMsg.add_socket_events();
}

async function tts_identify_to_sb(clearId = false) {
    //await tts.speech.ready();
    await tts.ready();

    if (clearId) {
        tts.id = ""; tts.sessionId = "";
    } else
    if (sessionStorage.getItem(SESSIONSTORAGE_ID_VAR) != undefined) {
        tts.id = sessionStorage[SESSIONSTORAGE_ID_VAR] ?? "";
        tts.sessionId = sessionStorage[SESSIONSTORAGE_SESSID_VAR] ?? "";
    }

    let voices = tts.getVoices().map(x => x.voiceURI);
    //this.speech.say("I have " + voices.length + " voices");
    toast("I have " + voices.length + " voices", "is-success");
    cclog("I have this many voices: " + voices.length, "y");
    cclog("Sending capabilities", "y");

    let pack = {
        action: "capabilities",
        id: tts.id,
        sessionId: tts.sessionId,
        numVoices: voices.length,
        voices,
    }

    console.log("Sending capabilities:", pack, "clearId:", clearId);

    sockMsg.send_json(pack);
}

        // action for SB sending "id"
function tts_id_assign_action(d) {
    tts.id = d.id;
    tts.sessionId = d.sessionId;
        // session storage works on a per-tab basis
    sessionStorage.setItem(SESSIONSTORAGE_ID_VAR, d.id);
    sessionStorage.setItem(SESSIONSTORAGE_SESSID_VAR, d.sessionId);

    document.title = d.id;
    clog("Setting id for TTS to ", d.id)
}

    // if this receives an id and session id  the same as this then  a new set is needed as this tab has been duplicated

function tts_identity_check_action(d) {
    //if (tts.id === d.id && tts.sessionId === d.sessionId) {
    if (tts.id === d.id && tts.sessionId !== d.sessionId) {
        cclog("************** I HAS BEEN BODAYSNAWTCHED!!!! ***************", "r");
        out(`<span class="has-text-danger has-text-weight-bold">BODYSNATCHED</span>`);
        tts_identify_to_sb(true);
    }
}


function tts_send_voices_action() {
    // let voices = tts.speech.getVoices().map(x => x.name);
    let voices = tts.getVoices().map(x => x.name);

    sockMsg.send_json({
        action: "voices",
        id: tts.id,
        sessionId: tts.sessionId,
        numVoices: voices.length,
        voices,
    });
}


function before_unload_handler() {
    clog("UNLOADING!!!!!!!!!!!!!!!!!!!!!!!!", "r");
    //if (tts.speaking()) tts.cancel();
    let pack = {
        action: "unloading",
        id: tts.id,
        sessionId: tts.sessionId,
    }

    sockMsg.send_json(pack);
}


    ////////////////////////////////////////////////////////
    ///////////////      HELPERS       /////////////////////
    ////////////////////////////////////////////////////////

function sleep(ms) {		// sleep(200).then(...)
	return new Promise(res => {
		setTimeout(res, ms);
	});
}

function dce(i) {
    return document.createElement(i);
}

window.dce = dce;