//import SockMsgRouter from "../yt/sockmsgrouter.class.mod.js";

    // vars for storing / retrieving assigned ids
import Select from '/scripts/components/select-class.js';
import TTSMsgDisplay from "./tts-sb-msg-display.mod.js";
import { sockMsg, ttsVoices } from './tts-sb.MAIN.mod.js';

const msgQ = new TTSMsgDisplay();

const userSelect = new Select("userselect");    // main tab
const nicknameSelect = new Select("nicknameuserselect"); // nicknames in options
    // voice select page
const customVoiceUserSelect = new Select("customvoiceuserselect");
const customVoiceSelect = new Select("customvoiceselect");
const customVoiceFilterSelect = new Select("customvoiceselectfilter");

let customVoiceStore = {};  // TTS will need access
    //
    window.cvs = customVoiceSelect;
    window.cvf = customVoiceFilterSelect;
    window.cvu = customVoiceUserSelect;

let nickNamesStore = {};
let userListStore = {};

window.nns = nickNamesStore;
window.uls = userListStore;


export function view_setup() {
    selects_init();

    ignore_btn_init();
    delete_user_btn_init();
    allow_btn_init();
    create_nickname_btn_init();
    set_custom_voice_btn_init();

    //sockMsg.on("ignoredusers", x => console.log("iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiGOT AN IGNORED USER LIST", x));

    add_view_sockMsg_actions();

    // detail as they'll be sent a custom event
    msgQ.addEventListener("deleteclick", e => msg_delete_send(e.detail));
    msgQ.addEventListener("ignoreclick", e => user_ignore_send(e.detail));
    msgQ.addEventListener("unignoreclick", e => user_unignore_send(e.detail));

    tag_show_delete_buttons_init();


        // checkboxes within buttons will click the button unless this is done

    let stopCheckboxPropagation = function (x) {
        x.stopPropagation();
    }

    for (let cBox of qsa("input[type=checkbox]").filter(e => e.parentNode.constructor === HTMLButtonElement)) {
        cBox.addEventListener("click", stopCheckboxPropagation);
    }

    for (let s of qsa(".tts-setting")) {
        s.addEventListener("change", settings_send);
    }

        // nudge button - leaving here as I'll remove later
    let nudge = gid("nudgettsbtn");
    nudge.addEventListener("click", x => sockMsg.send_json({action:"nudge"}));
        // navbar tab buttons unset all delete checkboxes
    for (let btn of qsa(".navbar-item ul")) {
        btn.addEventListener("click", uncheck_tag_delete_boxes_clear);
    }
        // debug button
    gid("debugttsbtn").addEventListener("click", x => sockMsg.send_json({action: "debugdump"}));
    gid("debugsendcapsbtn").addEventListener("click", x => sockMsg.send_json({action: "debugsendcaps"}));
}

function add_view_sockMsg_actions() {
    //sockMsg.actions.userlist = received_userlist;

    let actions = {
        displaymsg: d => msgQ.speech_queue_add_entry(d.data),
        deletemessage: d => msgQ.speech_queue_remove_entry(d.msgid),

            // these could be methods that update the ignored user list, or I could just broadcast a new list.
        ignoreuser: d => {
            userSelect.remove_by_value(d.data.userid);
            msgQ.ignore_user(d.data.userid);
        },
        unignoreuser: d => {
            msgQ.unignore_user(d.data.userid);
            userSelect.add(d.data.userid, d.data.username);
        },

        ignoredusers: received_ignored_list,

        allowedusers: received_allowed_list,

        deleteuser: d => userSelect.remove_by_value(d.data),

        userlist: received_userlist,

        nicknamelist: received_nicknames,

        settings: received_settings,

        customvoices: received_custom_voices
    }
        // for now just apply these
    sockMsg.actions = {...sockMsg.actions, ...actions};

    sockMsg.on("speechfinished", utterance_ended_handler);
}

function selects_init() {
    let voiceSelect = new Select("myvoiceselect");
    let myVoiceFilterSelect = new Select("myvoiceselectfilter");

    fill_voice_select(voiceSelect);   // takes a Select
    fill_voice_filter_select(myVoiceFilterSelect);

        // voice select page

    fill_voice_select(customVoiceSelect);   // takes a Select
    fill_voice_filter_select(customVoiceFilterSelect);

    myVoiceFilterSelect.on("change", voices_filter_select_onchange);
    customVoiceFilterSelect.on("change", voices_filter_select_onchange);

    customVoiceUserSelect.on("change", custom_voice_user_select_onchange);

    nickname_select_init();

    userSelect.sortByText = true;
    nicknameSelect.sortByText = true;
    customVoiceUserSelect.sortByText = true;
}

function received_userlist(d) {
    toast("Received user list");
    console.log("RECIEVED A USER LIST", d);

    userListStore = d.users;
    //window.uls = Object.entries(d.users);
    update_selects();
}

function received_ignored_list(d) {
    let ignoredDiv = gid("ignoreddiv");

    remove_children(ignoredDiv);

    let users = Object.entries(d.data);

    users.sort( (a,b) => a[1].localeCompare(b[1]) );

    for (let entry of users) {
        ignoredTagPoolAdd(entry, ignoredDiv);
    }
}

function ignoredTagPoolAdd(entry, ignoredDiv) {
    let col = 'is-link';

    let span = create_tag(entry[1]);
    let btn = create_tag_del_button(col);
    btn.addEventListener("click", x => user_unignore_send({userid: entry[0], username: entry[1]}) );

    span.append(btn);

    ignoredDiv.append(span);
}

function received_allowed_list(d) {
    let allowedDiv = gid("alloweddiv");

    remove_children(allowedDiv);

    let users = Object.entries(d.data);

    users.sort( (a,b) => a[1].localeCompare(b[1]) );

    let trAdd = entry => {
        let col = 'is-link';

        let tag = create_tag(entry[1], col);
        let btn = create_tag_del_button();

        btn.addEventListener("click", x => user_unallowed_send({userid: entry[0], username: entry[1]}) );
        tag.append(btn);

        allowedDiv.append(tag);
    }

    for (let entry of users) {
        trAdd(entry);
    }
}

function create_tag(text, classis = "is-link") {
    let span = dce("span");
    span.classList.add('tag', classis, "is-medium", 'p-4', 'pr-1', 'm-2' );
    span.textContent = text;
    return span;
}

function create_tag_del_button(addClass="is-link") {
    let btn = dce("button");
    btn.classList.add("button", addClass, "is-small", "ml-1", "has-text-weight-bold");
    btn.textContent = "x";
    return btn;
}

function received_nicknames(d) {
    nickNamesStore = d.nicknames;
    update_selects();

    let nnDiv = gid("nicknametagpool");

    remove_children(nnDiv);

    let users = Object.entries(d.nicknames);//.map(x => [x[0], x[1].username]);

    users.sort( (a,b) => a[1].username.localeCompare(b[1].username) );

    let nnInput = gid("nicknametext");
    let tagClickk = function (e) {
        let userid = e.target.dataset["userid"];
        nicknameSelect.select_val(userid);

        nnInput.value = nickNamesStore[userid].nickname;
    }

    let addNicknameTag = entry => {
        let col = 'is-link';

        let span = create_tag(entry[1].username + " : " + entry[1].nickname, col);
        span.dataset["userid"] = entry[0];
        span.addEventListener("click", tagClickk);

        let btn = create_tag_del_button(col);
        btn.addEventListener("click", nickname_delete_send);

        span.append(btn);
        nnDiv.append(span);
    }

    for (let entry of users) {
        addNicknameTag(entry);
    }
}
    // needs to add voices to the voices select if they don't exist

function received_custom_voices(d) {
    let voices = d.data;    // obj with userid as the key
    let cvPool = gid("voicetagpool");

    customVoiceStore = voices;

    remove_children(cvPool);

    voices = Object.entries(voices);
console.log("CUSTOM VOICE ENTRYES", voices);
    //users.sort( (a,b) => a[1].toString().localeCompare(b[1].toString()) );
    voices.sort( (a,b) => a[1]["username"].localeCompare(b[1]["username"]) );

    for (let [userid, voice] of voices) {
            // is the voice from a different browser?
        if ( !ttsVoices.hasOwnProperty(voice.uri) ) {
            console.log("NO WE DON'T HANDLE THE VOICE FOR", voice, customVoiceFilterSelect.get_val("external"));

            ttsVoices[voice.uri] = {
                name: cleanup_voice_name(voice.uri) + " (External)",
                voiceURI: voice.uri, lang:"external-External"
            }

            if ( customVoiceFilterSelect.has_val("external") === false ) {
                customVoiceFilterSelect.add("external", "External");
            }
        }

        voiceTagPoolAdd(userid, voice,cvPool);
    }

    fill_voice_select(customVoiceSelect);   // takes a Select
    customVoiceUserSelect.trigger_onchange();
    customVoiceFilterSelect.trigger_onchange();
}


function voiceTagPoolAdd(userid, voiceInfo, cvPool) {
    let col = 'is-link';

    let span = create_tag(voiceInfo["username"], col);
    let btn = create_tag_del_button(col);

    // span.addEventListener("click", e => {user_custom_voice_selected(e.target.dataset["userid"]);});
    span.addEventListener("click", e => {user_custom_voice_selected(userid);});
    btn.addEventListener("click", custom_voice_del_handler);
        //user_unignore_send({userid: entry[0], username: entry[1]}) );

    span.dataset["userid"] = userid;

    span.append(btn);

    cvPool.append(span);
}

function custom_voice_del_handler(e) {
    e.stopPropagation();
    let userid = e.target.parentNode.dataset["userid"];
    sockMsg.send_json({action: "customvoicedelete", userid});
}


    // Changes custom voice select and pitch/rate and user select.  custom user select and tag clicks use this.
function user_custom_voice_selected(userid) {
    let voiceURI = "", pitch = 1, rate = 1;

    if (customVoiceStore.hasOwnProperty(userid)) {
        voiceURI = customVoiceStore[userid].uri;
        pitch = customVoiceStore[userid].pitch;
        rate = customVoiceStore[userid].rate;
    }

    customVoiceUserSelect.select_val(userid);
    customVoiceSelect.select_val(voiceURI);
    gid("pitch").value = pitch;
    gid("rate").value = rate;
}

function update_selects() {
    window.nns = nickNamesStore;
    window.uls = userListStore;

    userSelect.replace_options( userListStore );
        // will need its own additions like nicknames
    customVoiceUserSelect.replace_options( userListStore );

    nicknameSelect.replace_options( userListStore );
        // nickname select can add extra entries that aren't in the main userlist
    for (let nickId in nickNamesStore) {
        if (userListStore[nickId] === undefined) {
            nicknameSelect.add(nickId, nickNamesStore[nickId].username);
        }
    }

    nicknameSelect.trigger_onchange();
}

    // nickname onchange fills the text field
function nickname_select_init() {
    let nnText = gid("nicknametext");
    nicknameSelect.on("change", e => {
        let val = e.target.value;
        nnText.value = nickNamesStore[val]?.nickname ?? "";
    })
}


// FEEELS OUT OF PLACE
function utterance_ended_handler(d) {
    console.log("SPEECHENDED Received for: ", d.data.msgid);
    msgQ.speech_queue_entry_to_old_messages(d.data.msgid);
}

    // @param Select

function fill_voice_filter_select(select) {
    let voices = speechSynthesis.getVoices();

    let langs = [], langsR = [];

    voices.map( (v, index) => {
        let [lang, region] = v.lang.split('-');
            // name MAY NOT have a dash but URL always seems to
            // format is like Microsoft Abeo Online (Natural) - English (Nigeria)
        let langW = v.voiceURI.split('- '); // = 0: ...(Natural), 1: English (Nigeria)
            // regex matches what's before the brackets and what's in them.  Now simplified
        if (langW.length > 1) {            //let c = langW[1].match(/(\w*)\s\((.*)\)/);             //langs[lang] = c[1];
            langs[lang] = langW[1].split(" (")[0]; // English (Nigeria) -> English
        }
    });
        // the object will be magically naturally sorted
    langs = Object.entries(langs);  // to [ [val, text], [val, text], ... ]
    langs.unshift(["", "All Voices", {"all": true}]);

    select.replace_options(langs);
}
    // sets custom voice select when user is changed
function custom_voice_user_select_onchange(e) {
    let userid = e.target.value;
    user_custom_voice_selected(userid);
    // let selVal = customVoiceStore[userid]?.uri ?? "";
    // customVoiceSelect.select_val(selVal);
}

    // hides options dependent on filter
function voices_filter_select_onchange(e) {
    let v = e.target.value;
    let target = gid(e.target.dataset["for"]);
    let opts = target.options;

    for (let opt of opts) {
        if (v === "" || opt.dataset["lang"] === v)
            opt.classList.remove("is-hidden");
        else
            opt.classList.add("is-hidden");
    }
}

    // @param Select

function fill_voice_select(select) {
    let voices = Object.entries(ttsVoices);

    voices = voices.map((value, index) =>
        [value[0], cleanup_voice_name(value[1].name), {"lang":value[1].lang.split("-")[0]}]);
    voices.sort( (a,b) => a[1].toString().localeCompare(b[1].toString()) );

    voices.unshift(["", "Default"]);

    select.replace_options(voices);
    //select.disable_by_value("");
}

    // shortens and de-uglifies

function cleanup_voice_name(name) {
    let replacer = /(Microsoft\w*|Online \(Natural\)| Traditional)\w*/g;
    let replaceNMD = /Republic of North Macedonia/g;
    let replaceMan = /\(.*Mandarin.*\)/;
    let replaceMulti = /Multilingual/;
    let replaceUAE = /United Arab Emirates/;

    return name
        .replace(replacer, "")
        .replace(replaceNMD, "NMD")
        .replace(replaceUAE, "UAE")
        .replace(replaceMulti, " Multi")
        .replace(replaceMan, "(Mandarin)")
}

function ignore_btn_init() {
    let ignoreBtn = gid("ignoreuserbtn");
    if (!ignoreBtn) {
        console.error("ERROR: no ignore user button exists");
        return;
    }

    ignoreBtn.addEventListener("click", x => {
        let data = {
            userid: userSelect.get_val(),
            username: userSelect.get_text()
        }
        sockMsg.send_json({action: "userignore", data});
        userSelect.focus();
    });
}

function allow_btn_init() {
    let allowBtn = gid("alwaysallowuserbtn");
    if (!allowBtn) {
        console.error("ERROR: no allow user user button exists");
        return;
    }

    allowBtn.addEventListener("click", x => {
        let data = {
            userid: userSelect.get_val(),
            username: userSelect.get_text()
        }
        sockMsg.send_json({action: "userallow", data});
        userSelect.focus();
    });
}

    /**
     * Deleting takes the user out of the list but they will return if they chat again.
     * It's to remove "noise" from lists where users might have only been to the channel once
     */

function delete_user_btn_init() {
    let dBtn = gid("deleteuserbtn");
    let delConf = gid("deleteuserconfirm");

    dBtn.addEventListener("click", x => {
        if (! delConf.checked )
            return;

        let data = {
            userid: userSelect.get_val(),
            username: userSelect.get_text()
        }

        sockMsg.send_json({action: "deleteuser", data});
        delConf.checked = false;
    })
}

function create_nickname_btn_init() {
    let nnUpdBtn = gid("nicknameupdatebtn");
    let nnText = gid("nicknametext");
    let nnNameSelect = gid("nicknameuserselect");

    nnUpdBtn.addEventListener("click", function() {
        let userid = nicknameSelect.get_val();
        let username = nicknameSelect.get_text();
        let nickname = nnText.value.trim();

        sockMsg.send_json({action: "nicknameset", userid, username, nickname});

        nnNameSelect.focus();   // can quickly add multiples by pressing down
    });
        // allow enter to set the nickname
    let nickTextInput = gid("nicknametext");
    nickTextInput.addEventListener("keyup", x => {
        if (x.key === "Enter") {
            nnUpdBtn.click();
        }
    });
}

function set_custom_voice_btn_init() {
    let nnUpdBtn = gid("customvoicesetbtn");
    let pitchInput = gid("pitch");
    let rateInput = gid("rate");

    nnUpdBtn.addEventListener("click", function() {
        let voiceURI = customVoiceSelect.get_val();
        let userid = customVoiceUserSelect.get_val();
        let username = customVoiceUserSelect.get_text();
        let pitch = pitchInput.value;
        let rate = rateInput.value;

        let action = voiceURI === "" ? "customvoiceremove" : "customvoiceset";

        sockMsg.send_json({action, userid, username, voiceURI, pitch, rate});
    });
}

    // CustomEvent handler use detail
function user_ignore_send(data) {
    console.log("ignore send", data);
    sockMsg.send_json({action: "userignore", data});
}

    // CustomEvent handler use detail
function user_unignore_send(data) {
    console.log("unignore send", data);
    sockMsg.send_json({action: "userunignore", data});
}

    // User is no longer on the allowed list
function user_unallowed_send(data) {
    console.log("unALLOW send", data);
    sockMsg.send_json({action: "userunallow", data});
}

function custom_voice_delete_send(userid) {
    sockMsg.send_json({action: "customvoicedelete", userid});
}

function nickname_delete_send(e) {
    e.stopPropagation();
    let userid = e.target.parentNode.dataset["userid"];
    sockMsg.send_json({action: "nicknamedelete", userid});
}
// CustomEvent handler use detail
function msg_delete_send(data) {
    sockMsg.send_json({action: "deletemessage", data});
}

function settings_send() {
    let settings = qsa(".tts-setting");

    let data = {};

    for (let input of settings) {
        switch (input.type) {
            case "checkbox":
                data[input.id] = input.checked;
                break

            case "number":
                //console.log("value min max default", input.value, input.min, input.max, input.defaultValue, input.value > input.max, input.value < input.min);
                if (input.value === '') input.value = input.defaultValue;
                if (parseInt(input.value) > parseInt(input.max)) input.value = input.max;
                if (parseInt(input.value) < parseInt(input.min)) input.value = input.min;
            case "textarea":
            case "text":
                data[input.id] = input.value.trim();
                break;
        }
    }

//    console.log("SETTINGS PACK", data);

    sockMsg.send_json({action: "settingschanged", data});
}

function received_settings(d) {
    // console.log("SEEETTTEEEEENGS", d);
    let settings = d.data;
        // object with keys being the form ids
    for (let setting in settings) {
        let input = gid(setting);

        if (input === null) continue;

        switch (input.type) {
            case "checkbox":
                input.checked = settings[setting];
                break

            case "textarea":
            case "text":
            case "number":
                if (input.value === '') input.value = input.defaultValue;
                input.value = settings[setting];
                break;
        }
    }
}

    /**
     * sets up a change on checkboxes that will show and hide delete buttons
     */

function tag_show_delete_buttons_init() {
    let cboxes = qsa(".hide-button-toggle")

    for (let chk of cboxes) {
        chk.addEventListener("change", e => {
            let toggleOn = e.target.dataset["for"];
            if (e.target.checked)
                gid(toggleOn).classList.add("show-buttons");
            else
                gid(toggleOn).classList.remove("show-buttons");
        });
    }
}

    // unsets the cleckboxes for all - delete buttons - set on top nav buttons click

function uncheck_tag_delete_boxes_clear() {
    let buttons = qsa(".hide-button-toggle");
    let change = new Event("change");

    for (let btn of buttons) {
        btn.checked = false;
        btn.dispatchEvent(change);
    }
}

function remove_children(el) {
    el.innerHTML = ""; return;
    let kids = el.childNodes;
    for (let kid of kids) {
        el.removeChild(kid);
    }
}