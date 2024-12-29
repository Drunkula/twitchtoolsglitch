//import SockMsgRouter from "../yt/sockmsgrouter.class.mod.js";

    // vars for storing / retrieving assigned ids
import Select from '/scripts/components/select-class.js';
import TTSMsgDisplay from "./tts-sb-msg-display.mod.js";

const msgDisp = new TTSMsgDisplay();

import { sockMsg } from './tts-sb.MAIN.mod.js';

export function view_setup() {
    let voiceSelect = new Select("myvoiceselect");
    let voiceFilterSelect = new Select("myvoiceselectfilter");

    //voiceSelect.replace_options([1,"shut", ["I gunn cut you", "your"], 3, "face", 2, [1, "I'm one again", {foo:"barr"}]]);
    //window.v = TTS.voiceSelect;
    //window.u = uSel;
    fill_myvoice_select(voiceSelect);   // takes a Select
    fill_myvoice_filter_select(voiceFilterSelect);

    voiceFilterSelect.on("change", filter_voices_select_onchange);
    //myVoicesSelect.sortByText = true;

    ignore_btn_init();
    delete_btn_init();

    //sockMsg.on("ignoredusers", x => console.log("iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiGOT AN IGNORED USER LIST", x));

    add_view_sockMsg_actions();

    // detail as they'll be sent a custom event
    msgDisp.addEventListener("deleteclick", e => msg_delete_send(e.detail));
    msgDisp.addEventListener("ignoreclick", e => user_ignore_send(e.detail));
    msgDisp.addEventListener("unignoreclick", e => user_unignore_send(e.detail));
}

function add_view_sockMsg_actions() {
    //sockMsg.actions.userlist = received_userlist;

    let actions = {
        displaymsg: d => msgDisp.speech_queue_add_entry(d.data),
        deletemessage: d => msgDisp.speech_queue_remove_entry(d.msgid),

            // these could be methods that update the ignored user list, or I could just broadcast a new list.
        ignoreuser: d => {
            TTS.userSelect.remove_by_value(d.data.userid);
            msgDisp.ignore_user(d.data.userid);
        },
        unignoreuser: d => {
            msgDisp.unignore_user(d.data.userid);
            TTS.userSelect.add(d.data.userid, d.data.username);
        },

        ignoredusers: received_ignored_list,

        deleteuser: d => TTS.userSelect.remove_by_value(d.data),

        userlist: received_userlist,

        nicknamelist: received_nicknames,
    }
        // for now just apply these
    sockMsg.actions = {...sockMsg.actions, ...actions};
}


function received_userlist(d) {
    toast("Received user list");
    console.log("RECIEVED A USER LIST", d);

    TTS.userSelect = new Select("userselect");
    TTS.userSelect.sortByText = true;
    TTS.userSelect.replace_options(d.users);
}

function received_ignored_list(d) {
    let ignoredDiv = gid("ignoreddiv");

    remove_children(ignoredDiv);

    let users = Object.entries(d.data);

    users.sort( (a,b) => a[1].toString().localeCompare(b[1].toString()) );

    let trAdd = entry => {
         let col = 'is-link';

        let span = dce("span");
        span.classList.add('tag', col, "is-medium", 'py-4', 'pr-1', 'm-2' );
        span.textContent = entry[1];

        let btn = dce("button");
        btn.classList.add("button", col, "is-small", "ml-1", "has-text-weight-bold");
        btn.textContent = "x";
        btn.addEventListener("click", x => user_unignore_send({userid: entry[0], username: entry[1]}) );

        span.append(btn);

        ignoredDiv.append(span);
    }

    for (let entry of users) {
        trAdd(entry);
    }
}

function received_nicknames(d) {
    let nnDiv = gid("nicknametagpool");

    remove_children(nnDiv);

    let users = Object.entries(d.data);

    users.sort( (a,b) => a[1].toString().localeCompare(b[1].toString()) );

    let trAdd = entry => {
         let col = 'is-link';

        let span = dce("span");
        span.classList.add('tag', col, "is-medium", 'py-4', 'pr-1', 'm-2' );
        span.textContent = entry[1];

        let btn = dce("button");
        btn.classList.add("button", col, "is-small", "ml-1", "has-text-weight-bold");
        btn.textContent = "x";
        //btn.addEventListener("click", x => user_unignore_send({userid: entry[0], username: entry[1]}) );

        span.append(btn);

        nnDiv.append(span);
    }

    for (let entry of users) {
        trAdd(entry);
    }
}

function remove_children(el) {
    el.innerHTML = ""; return;
    let kids = el.childNodes;
    for (let kid of kids) {
        el.removeChild(kid);
    }
}


    // @param Select

function fill_myvoice_filter_select(select) {
    let voices = speechSynthesis.getVoices();

    let langs = [], langsR = [];

    voices.map( (v, index) => {
        let [lang, region] = v.lang.split('-');

            // name MAY NOT have a dash but URL always seems to
        let langW = v.voiceURI.split('- ');

            // format is like Microsoft Abeo Online (Natural) - English (Nigeria)
            // regex matches what's before the brackets and what's in them
            // now simplified
        if (langW.length > 1) {
            //let c = langW[1].match(/(\w*)\s\((.*)\)/);             //langs[lang] = c[1];
            langs[lang] = langW[1].split(" (")[0];
        }
    });
        // the object will be magically naturally sorted
    langs = Object.entries(langs);  // to [ [val, text], [val, text], ... ]
    langs.unshift(["", "All Voices", {"all": true}]);

    select.replace_options(langs);
}

function filter_voices_select_onchange(e) {
    let v = e.target.value;
    let target = gid(e.target.dataset["for"]);
    let opts = target.options;

    for (let opt of opts) {
        if (v === "" || opt.dataset['lang'] === v)
            opt.classList.remove("is-hidden");
        else
            opt.classList.add("is-hidden");
    }

/*     //var event = new Event("mousedown", {pointerX: 1, pointerY: 1});//, { bubbles: true, cancelable: true });
    var event = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true,
        //clientX: 20,
    });
    target.dispatchEvent(event);
    //node.dispatchEvent (event); */
}

    // @param Select

function fill_myvoice_select(select) {
    let voices = speechSynthesis.getVoices();

    let replacer = /(Microsoft\w*|Online \(Natural\))\w*/g;

    voices = voices.map((value, index) => [value.voiceURI, value.name.replace(replacer, ""), {"lang":value.lang.split("-")[0]}]);

    voices.sort( (a,b) => a[1].toString().localeCompare(b[1].toString()) );

    voices.unshift(["disabled", "My Voices"]);

    select.replace_options(voices);
    select.disable_by_value("disabled");
}

function ignore_btn_init() {
    let ignoreBtn = gid("ignoreuserbtn");
    if (!ignoreBtn) {
        console.log("ERROR: no ignore user button exists");
        return;
    }

    ignoreBtn.addEventListener("click", x => {
        //let us = gid("userselect");
        let data = {
            userid: TTS.userSelect.get_val(),
            username: TTS.userSelect.get_text()
        }
        sockMsg.send_json({action: "userignore", data})
    });
}

    /**
     * Deleting takes the user out of the list but they will return if they chat again.
     * It's to remove "noise" from lists where users might have only been to the channel once
     */

function delete_btn_init() {
    let dBtn = gid("deleteuserbtn");
    let delConf = gid("deleteuserconfirm");
        // stop the click passing up to the button
    delConf.addEventListener("click", x => x.stopPropagation());

    dBtn.addEventListener("click", x => {
        if (! delConf.checked )
            return;

        let data = {
            userid: TTS.userSelect.get_val(),
            username: TTS.userSelect.get_text()
        }

        sockMsg.send_json({action: "deleteuser", data});
        delConf.checked = false;
    })
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

// CustomEvent handler use detail
function msg_delete_send(data) {
    sockMsg.send_json({action: "deletemessage", data});
}

function create_ignored_user_table(d) {
    console.log("IGNORED USERS", d);
}

