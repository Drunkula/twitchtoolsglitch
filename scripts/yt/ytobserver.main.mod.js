import SockMsgRouter from "./sockmsgrouter.class.mod.js";
import {move_table_rows} from "./observer.helpers.mod.js";
import * as l from "./ytobserver.playlist.mod.js";

export let playlists = {};// uid keyed playlists

window.clog = console.log;
document.title = "YT Observer";
    // https://www.npmjs.com/package/bulma-toast BULMA TOAST BULMA TOAST is messing with my scrollIntoView
dataset_click_events_assign(); // adds send actions to button

//document.getElementsByTagName("html")[0].style["position"]="relative";

let htmlEvents = [
    // playER page
    //{selector: ".player-controls .delete-permanently", event: "click", function: () => delete_vids(true)},
    {selector: ".player-controls .delete-playeronly", event: "click", function: () => delete_player_only(false)},

    {selector: ".player-controls .rowsup", event: "click", function: x => move_table_rows('playertable', "up")},
    {selector: ".player-controls .rowsdown", event: "click", function: x => move_table_rows('playertable', "down")},
    {selector: ".player-controls .rowstotop", event: "click", function: x => {move_table_rows('playertable', "top")}},
    {selector: ".player-controls .rowstobottom", event: "click", function: x => {move_table_rows('playertable', "bottom")}},

    {selector: "#sendlisttoplayer", event: "click", function: x => send_playlist_to_player()},
    {selector: ".player-controls .addvideobtn", event: "click", function: x => add_video_to_player()},
    // select all checkbox player
    {selector: "#checkallplayer", event: "click", function: x => {
        let c = x.target.checked; qsa("#playertable input[type='checkbox']").forEach(e => e.checked = c);}
    },

     {selector: "#playerselect", event: "change", function: x => {if (gid("autoloadplayerlist").checked) get_players_list();}, params: {}},
     {selector: "#playerselectgetbtn", event: "click", function: get_players_list, params: {}},

    ////////// PLAYLIST //////////
    ////////// PLAYLIST //////////
    ////////// PLAYLIST //////////

    {selector: "#loadplaylistselect", event: "change", function: x => l.send_load_playlist_cmd(x), params: {}},
    {selector: "#getplaylistbtn", event: "click", function: x => l.send_load_playlist_cmd(x), params: {}},

    {selector: ".playlist-controls .clearchecks", event: "click", function: x => qsa('#playlisttable input[type=checkbox]:checked').forEach(x=>x.checked=false)},
    {selector: ".playlist-controls .setchecks", event: "click", function: x => qsa('#playlisttable input[type=checkbox]').forEach(x=>x.checked=true)},


    {selector: ".player-controls .clearchecks", event: "click", function: x => qsa('#playertable input[type=checkbox]:checked').forEach(x=>x.checked=false)},
    {selector: ".player-controls .setchecks", event: "click", function: x => qsa('#playertable input[type=checkbox]').forEach(x=>x.checked=true)},

    {selector: ".playlist-controls .rowsup", event: "click", function: x => {update_playlist_set_btn_state(true); move_table_rows('playlisttable', "up")}},
    {selector: ".playlist-controls .rowsdown", event: "click", function: x => {update_playlist_set_btn_state(true); move_table_rows('playlisttable', "down")}},
    {selector: ".playlist-controls .rowstotop", event: "click", function: x => {update_playlist_set_btn_state(true); move_table_rows('playlisttable', "top")}},
    {selector: ".playlist-controls .rowstobottom", event: "click", function: x => {update_playlist_set_btn_state(true); move_table_rows('playlisttable', "bottom")}},

    {selector: ".playlist-controls .delete-permanently", event: "click", function: () => l.delete_from_playlist(true)},
    {selector: ".playlist-controls .addvideobtn", event: "click", function: x => l.add_video_to_playlist()},

    {selector: "#delplaylistconfirm, #destroyplaylistconfirm", event: "click", function: x => x.stopPropagation()},

    {selector: ".playlist-controls .savetoplaylist", event: "click", function: e => l.copy_to_playlist("playlisttable", e)},
    {selector: ".player-controls .savetoplaylist", event: "click", function: e => l.copy_to_playlist("playertable", e)},
    // updateplaylistlist sends the list back to the playlist
    {selector: "#updateplaylistlistbtn", event: "click", function: l.update_playlist_list},
    // updateplaylist updates name, shuffle, store !add

    {selector: "#updateplaylistbtn", event: "click", function: l.update_playlist_verify},   // inside modal
    {selector: "#createplaylistbtn", event: "click", function: l.create_playlist_verify},   // inside modal
    {selector: "#destroyplaylistbtn", event: "click", function: l.delete_playlist_verify}, // inside modal

    {selector: "#editplaylistshowmodalbtn", event: "click", function: l.edit_modal_show}, // inside modal

    // entries in playlist send to player
    {selector: ".sendtoplayer", event: "click", function: l.send_entries_to_player},

    {selector: "#addvideotoplayer, #addvideotoplaylist", event: "contextmenu", function: e => e.target.value=""},
    {selector: "#addvideotoplayer, #addvideotoplaylist", event: "dblclick", function: e => e.target.value=""},

];  add_event_listeners(htmlEvents);

class YTObserver extends SockMsgRouter {
    myUID = (Math.random() * Date.now()).toString();
    myName = "YTObserver Default";  // sent to Streamerbot for id purposed.  It might send a replacement back
    mySocketId = null;

    actions = {
        allplayerlistdata: received_player_playlist,
        currsongid: received_songid,
        consolelog: d => {clog( ccols[d.colour](d.message) );},
            // never used
        setid: x => this.myUID = x.id,

        // request responses
        identify: d => this.identify(),
        yourinfo: d => {this.myName = d.name; this.mySocketId = d.socketid; document.title = `(${d.name}) YT Observer`},
        namechange: d => {this.myName = d.name; document.title = `({d.name}) YT Observer`},
        players: d => players_select_update(d),
        playlists: d => playlist_selects_update(d),
        playlistdata: d => l.received_playlist(d.data),
            // SB notification of new playlist
        playlistcreated: d => l.on_playlist_created(d),

        playlistdeleted: x => l.on_playlist_deleted(x),
        playlistupdated: x => l.on_playlist_updated(x),

        chatlockoutstate: got_chat_lockout_status,
        permstorestate: got_storage_status,

        toast: d => toast_raw(d.data)
    };
        // identify myself to SB
    identify() {
        this.send_json({action: "identify", type: "observer", uid: this.myUID, name: this.myName});
    }

    ytoSockEvents = [
        ['open', () => {
            this.identify();
            clog("OPENED SOCKET - sending identify");
        }],
        ['close', e => clog("Observer Socket closed", e)]
    ];

    constructor() {
        super();
            // add default and custom
        this.add_socket_events();
        this.add_socket_events(this.ytoSockEvents);
    }
}

export let YTO = new YTObserver();
YTO.myName = new window.URLSearchParams( window.location.search ).get("id") ?? YTO.myName;
YTO.connect();
window.YTO = YTO;// so console debug

    // sends a video to the player

function add_video_to_player() {
    let video = gid("addvideotoplayer").value;
    YTO.send_json({action: "addvideotoplayer", video, to: gid("playerselect").value});
}

function update_playlist_set_btn_state(on = true) {
    gid("updateplaylistlistbtn").disabled = !on;
}
window.update_playlist_set_btn_state = update_playlist_set_btn_state;
    // sends delete permanently info to player

function delete_player_only(perm = false) {
        // get the selected playlist boxes
    // obs fix let rows = qsa("#playerplaylist tr:has(input[type=checkbox]:checked)");
    let rows = [];
    let cbxs = qsa("#playerplaylist input:checked");
    cbxs.forEach(x => {
        let r = x.parentNode.parentNode;
        if (r.dataset['videoid']) rows.push(r);
    });


    if (!rows.length) {
        toast("No videos selected for player to delete.");
        return;
    }

    let videoids = [];
    for (let tr of rows) {
        videoids.push(tr.dataset["videoid"]);
    }

    let to = gid("playerselect").value;
    let text = get_select_text("playerselect");

    toast(`Sending <strong>${videoids.length}</strong> entries to <strong>${text}</strong> for removal.`);
    YTO.send_json({action:"deletefromplayer", videoids, to, returnto: YTO.myUID});
}

    // sends the table back to the player

function send_playlist_to_player() {
    let data = l.table_entries_to_array('playerplaylist');
    let playlistpos = qsa("#playertable tr:not(:first-child)").indexOf(qs("#playertable tr.is-selected"));

    if (playlistpos < 0) playlistpos = 0;
    let pack = {
        action: "sendfullplaylisttoplayer",
        to: gid("playerselect").value,
        data,
        playlistpos,
        shuffle: false,
        forceshuffle: false,
        addnext: true
    }

    toast(`Updated order sent to <strong>${get_select_text("playerselect")}</strong>.  ${data.length} entres.`);
    YTO.send_json(pack);
}


    // highlights the row with the current song
    // OH FFS, bulma toast messes up the scrolling

function received_songid(d) {
    let t = gid("playertable");
    if (!t || t.dataset["uid"] !== d.playerinfo["uid"]) return;   // table isn't displayed

    let currRows = qsa("#playerplaylist tr");
    currRows.forEach(element => {
        if (element.dataset["videoid"] == d.id) {
            element.classList.add("is-selected");
            //*
            setTimeout(() =>
                    // block center+smooth not working too well brave
                element.scrollIntoView({behavior: "smooth", block: "start"})// start end center nearest SONG ID ONE
            , 1); // block: start center end nearest
            //*/
            //element.parentNode.scrollTop = element.offsetTop;
        } else  // inline also start end nearest center
            element.classList.remove('is-selected');
    });
}

    // get playing list from player in #playerselect

function get_players_list() {
    let select = gid("playerselect");
    let uid = select.selectedIndex >= 0 ? select.options[select.selectedIndex].value : "players";
    //let uid = gid("playerselect").value;

    if (uid == "players") return;
    console.log("UID UID", uid);
    YTO.send_json({action: "getplayerplaylist", to: uid})
}

    // create options for players select

function players_select_update(d) {
    let selects = qsa(".playerselect");

    toast('Number of players: ' + Object.keys(d.players).length, "is-info", 4000, {position: "top-left", animate: {in: "backInRight"}});

    for (let select of selects) {
        let currSel = select.selectedIndex >= 0 ? select.options[select.selectedIndex].value : null;
        let opts = [];
        let o1 = dce("option");
        o1.text = "All Players"; o1.value="players";
        opts.push(o1);

        for (let p in d.players) {
            let opt = dce("option");
            opt.value = d.players[p].UID;
            opt.text = d.players[p].name;
            opt.dataset["socketid"] = p;
            if (opt.value === currSel) opt.selected = 'selected';
            opts.push(opt);
        }
        select.replaceChildren(...opts);
    }
}

    // create options for players select

function playlist_selects_update(d) {
    let selects = qsa(".playlistselect");

    toast('Number of playlists: ' + d.lists.length, 'is-link', 4000, {position: "top-left", animate: {in: "backInRight"}});
        // update global playlists
    for (let p of d.lists) {
        playlists[p.uid] = p;
    }

    for (let select of selects) {
        //console.log("sELECT", select);
        let currSel = select.selectedIndex >= 0 ? select.options[select.selectedIndex].value : null;
        let opts = [];
        let o1 = dce("option");

        o1.text = "Choose"; o1.value="";
        opts.push(o1);

        for (let p of d.lists) {
            let opt = dce("option");
            opt.value = p.uid;
            opt.text = p.name;
            //console.log("SELECT BUILD", p);
            //opt.dataset["socketid"] = p;
            if (opt.value === currSel) opt.selected = 'selected';
            opts.push(opt);
        }

        select.replaceChildren(...opts);
    }
}

function got_chat_lockout_status(d) {
    let msg = "<b>Rabble</b> chat commands are " + (d.state ? "<b>Denied</b>" : "<b>Allowed</b>");
    toast(msg, "is-info", 4000, {position: "top-left"});

    gid("chatlockoutstatus").innerText = d.state ? "BLOCKED" : "ALLOWED";
}

function got_storage_status(d) {
    toast("<b>Permanent Storage</b> is  " + (d.state ? "<b>Enabled</b>" : "<b>Disabled</b>"), "is-info", 4000, {position: "top-left", animate:{in:"backInRight"}});
    gid("storagestatus").innerText = d.state ? "ON" : "OFF";
}

    // creates a table from the playlist data

function received_player_playlist(d) {
    let pl = JSON.parse(d.data);

    let {playlist, playlistmap, playlistindex} = pl.data;
    console.log("all playlist data", pl)
    //console.log("playlist", playlist);

    let t = dce("table"); t.classList.add("table", "is-hoverable");
    t.dataset["uid"] = pl.playerinfo["uid"];
    t.id = "playertable"
        // first empty as checkbox, could add checkbox: true and id that could be used for select all
    t.append( table_row({isHeader: true, data: ["Song", "Adder"], checkbox: "checkall", checkboxid: "checkallplayer"}) );

    let selectedRow = null;

    let counter = 0;
    for (let id of playlist) {
        let tr = table_row({data: [playlistmap[id].title, playlistmap[id].adder], checkbox: ""});
        tr.dataset["videoid"] = id;
        tr.dataset["channel"] = playlistmap[id].channel;
        tr.dataset["starttime"] = playlistmap[id].starttime;
        if (counter === playlistindex) { tr.classList.add("is-selected"); selectedRow = tr; }
        t.append( tr );
        counter++;

        tr.addEventListener('dblclick', e => YTO.send_json({action: "playsong", id, to: gid("playerselect").value}) );
        // could be rewritten as the below without a need for a 'playsong' action in SB
        // tr.addEventListener('dblclick', e => YTO.send_json( {action: "relay", to: gid("playerselect").value, data: {action:"playsong", id}}) );
    }

    gid("playerplaylist").replaceChildren(t);
    if (selectedRow) selectedRow.scrollIntoView({behavior: "smooth", block: "center"});

    gid("checkallplayer").addEventListener('change', x => {
        let c = x.target.checked;
        qsa("#playertable input[type='checkbox']").forEach(e => e.checked = c);});
}

    // adds events like click, change to elements

export function add_event_listeners(events) {
    let chEv = new Event('change');
    let inpEv = new Event('input');

    for (const ev of events) {
        let fs = qsa(ev.selector);
        for (const f of fs) {
            f.addEventListener(ev.event, ev.function);
				// LAZY, dangerous, might change this to params having triggers
            if (ev.event === 'change' && ev.params?.noAutoChange !== true) {
                f.dispatchEvent(chEv);
            } else
            if (ev.event === 'input') {
                f.dispatchEvent(inpEv);
            }
        }
    }
}


    // sets up dataset-action(s)

function dataset_click_events_assign() {
    let select = gid("playerselect");
        // data-send includes TO
    let controls = qsa("[data-send]");
    for (const con of controls) {
        let sstr = con.dataset["send"];
        con.addEventListener('click', e => {
            let pack = {action: sstr, to: select.value};
            YTO.send_json(pack);
            //YTO.send(sstr);
        });
    }
        // relay sends the string through, uses TO
    controls = qsa("[data-relay]");
    for (const con of controls) {
        let data = con.dataset["relay"];
        con.addEventListener('click', e => {
            let pack = {action: "relay", data, to: select.value};
            YTO.send_json(pack);
            //YTO.send(sstr);
        });
    }
        // data-get no TO so routed back
    controls = qsa("[data-get]");
    for (const con of controls) {
        let action = con.dataset["get"];
        con.addEventListener('click', e => {
            let pack = {action};
            YTO.send_json(pack);
            //YTO.send(sstr);
        });
    }

}

    // adds console colour commands

let ccols = {};
[ ['r', 1], ['g', 2], ['b', 4], ['w', 7], ['c', 6], ['m', 5], ['y', 3], ['k', 0] ]
.reduce(
    (X, c) => ccols[c[0]] = f => `\x1b[1m\x1b[3${c[1]}m${f}\x1b[0m`, []
);

