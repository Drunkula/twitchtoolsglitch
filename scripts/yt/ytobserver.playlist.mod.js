import {playlists, YTO, add_event_listeners} from "./ytobserver.main.mod.js"
import * as pl from "./ytobserver.getytpl.mod.js";

let editingUID = "", editingName = "";    // stored while editing


let playlistEvents = {
}; //add_event_listeners(playlistEvents);

// this will be a container for dealing with more of the
// playlist related functions
    /**
     * On SB end this relays the data straight through
     * using chatadd: true BREAKS newtonsoft and I have no idea why
     * @param {strng} x
     */

export function send_entries_to_player(x) {
    console.log("Send entries to player: ", x);

    let uid = window.get_select_val(x.target.dataset['toselectid']) ?? "players";
    let toName = window.get_select_text(x.target.dataset['toselectid']);

    let data = table_entries_to_array('playlist', true);
    let pack = {
        action: "playlistadd",
        to: uid,
        returnto: YTO.myUID,
        data,
        addnext: true,
        //chatadded: true, // this breaks it, chatAdded doesn't.  I thought this was just relaying, it shouldn't break.
        addaschatadded: true, // this gets through as does other random stuff
        shuffle: false
    }

    toast(`Sending <b>${data.length}</b> entries to <b>${toName}</b>`);
    YTO.send_json(pack);
}

    // sends a SINGLE video FROM ADD TEXT FIELD to the player

export function add_video_to_playlist() {
    if (gid("pladdlinkisplaylist").checked) return pl.add_ytplaylist_to_playlist();

    let video = gid("addvideotoplaylist").value;
    //adder = this will be a thing
    YTO.send_json({action: "addvideotoplaylist", video, uid: gid("loadplaylistselect").value, adder: gid("videoadder").value});
}

    // deletes from selected playLIST

export function delete_from_playlist() {
    // confirm set98
    if (gid('delplaylistconfirm').checked !== true) {
        toast("Confirm.  Checkbox.  It's there, right in the button.  It's there for your safety and guess what you do with it?", 'is-warning', 5000); return;
        return;
    }

    let entries = table_entries_to_array("playlisttable", true);
    let videoids = [];
    entries.forEach(x => videoids.push(x.videoid));
    console.log("videoids", videoids);

    if (!entries.length) {
        toast("Deleting nothing is soooo much fun.", 'is-warning', 3000); return;
    }

    let uid = gid("playlisttable").dataset["uid"];

    YTO.send_json({action: "deletefromplaylist", uid, videoids});
    gid('delplaylistconfirm').checked = false;
}

    // deletes selected entries from onscreen selections in the other <select>

export function delete_from_other_playlist() {
    let table = gid("playlisttable");
    if (!table) {
        toast("Load a playlist up.  Chivvy chivvy!", 'is-danger');        return;
    }

    // confirm set98
    if (gid('del-sel-from-pl-confirm').checked !== true) {
        toast("Confirm deleting these from the other playlist.", 'is-danger', 5000);
        return;
    }

    let delSrce = gid("playlisttable").dataset["uid"];
    let delFromListUid = gid("playlistcopytoplaylist").value;

    if (delSrce === delFromListUid) {
        toast("No.  I'm not deleting from the same table like that, do it like a normal person.", "is-warning"); return;
    }
    if ("" === delFromListUid) {
        toast("Select a playlist to delete the entries from, bonehead.", "is-warning"); return;
    }

    let entries = table_entries_to_array("playlisttable", true);
    let videoids = [];
    entries.forEach(x => videoids.push(x.videoid));

    console.log("videoids", videoids);
    if (!entries.length) {
        toast("Nothing delete-eddddd, cos you selected nuttthinggg.  Breeep broop zwwweeeep.", 'is-warning', 5000); return;
    }

    YTO.send_json({action: "deletefromplaylist", uid: delFromListUid, videoids});
    gid('del-sel-from-pl-confirm').checked = false;
}


    // sends all the videos in a playlist back

export function update_playlist_list() {//fromTable, btn) {
    let uid = gid("playlisttable").dataset["uid"];

    console.log("YOU WANT TO UPDATE TO PLAYLIST", uid);
        // can't copy to self
    if (!uid) {
        toast("Couldn't get uid from playlist table... odd.", 'is-danger');
        return;
    }
        //let table = gid(fromTable);
    let entries = table_entries_to_array("playlisttable");
    console.log("Entries", {action: "updateplaylistlist", uid, entries});

    if (!entries.length) {
        toast("The table has no entries: abandoning update.", 'is-warning', 5000);
        return;
    }

    YTO.send_json({action: "updateplaylistlist", uid, entries});
}

    // copies entries from the player or playlist table to the selected playlist

export function copy_to_playlist(fromTable, btn) {
    let uid = gid(btn.target.dataset["toselectid"]).value;
    console.log("YOU WANT TO COPY TO PLAYLIST", fromTable, btn.target.dataset, uid);

        // can't copy to self

    if (!uid) {
        toast("Choose somewhere to COPY TO you festering twat", 'is-danger');        return;
    }

    let table = gid(fromTable);
    if (!table) {
        toast("Load something first you fucking imbecile.", 'is-danger');        return;
    }

    if (table.dataset && table.dataset["uid"] === uid) {
        toast("You can't copy from a souce to the same source you prick.", "is-danger"); return;
    }

    let entries = table_entries_to_array(fromTable, true);
    console.log("Entries", entries);

    if (!entries.length) {
        toast("Yes, I'm going to copy exactly nothing to the playlist.  That's worth my time.", 'is-warning', 5000); return;
    }

    YTO.send_json({action: "copytoplaylist", uid, entries});
}

    // creates a table from the playlist data

export function received_playlist(d) {
    update_playlist_set_btn_state(false);

    let playlist = d.list;
    console.log("playlist", playlist);

    let t = dce("table"); t.classList.add("table");
    t.id="playlisttable"; t.dataset["uid"] = d.uid; t.dataset["name"] = d.name;
    t.width="100%";
        // first empty as checkbox, could add checkbox: true and id that could be used for select all
    let th = table_row({checkboxid: "checkallplaylist", checkbox: 1, isHeader: true, data: ["Song", "Adder"]});
    th.classList.add("is-selected");
    t.append( th );

    //let selectedRow = null;

    let counter = 0;
    for (let e of d.list) {
        let tr = table_row({checkbox: 1, data: [e.title, e.adder]});
        tr.dataset["videoid"] = e.videoid;
        tr.dataset["channel"] = e.channel;
        tr.dataset["starttime"] = e.starttime;
        t.append( tr );
        counter++;
    }

    gid("playlist").replaceChildren(t);
        // check all
    gid("checkallplaylist").addEventListener('change', x => {
        let c = x.target.checked;
        qsa("#playlisttable input[type='checkbox']").forEach(e => e.checked = c);});

        // shift clicking
    let clickIndex = 0; // <-- closure will use this
    let cBxs = qsa("#playlisttable input[type='checkbox']").slice(1);
    qsa("#playlisttable input[type='checkbox']").slice(1).forEach(x => x.addEventListener("click", x => {
        let newClickIndex = cBxs.indexOf(x.target);
        if (x.shiftKey === true) {
            let checkState = cBxs[newClickIndex].checked;//tRows[from].checked === tRows[to].checked ? true : false;
            let [from, to] = newClickIndex > clickIndex ? [clickIndex, newClickIndex] : [newClickIndex, clickIndex];
            for (let i = from; i <= to; i++) {
                cBxs[i].checked = checkState;
            }
        }
        clickIndex = newClickIndex;
    }));
}

    // sends the load playlist command

export function send_load_playlist_cmd() {
    let uid = gid("loadplaylistselect").value;
    if (!uid) return;
    YTO.send_json({action: "sendplaylist", uid});
}

    // update the viewed table if the auto checkbox is set

export function player_dirty_handler(d) {
    if ( ! gid("autoloadplayerlist").checked ) return;

    let table = gid("playertable");
    if (!table) return;

    if (table.dataset['uid'] === d.player.uid) {
        YTO.send_json({action: "getplayerplaylist", to: d.player.uid});
    }
}

    // update the viewed table if the auto checkbox is set

export function playlist_dirty_handler(d) {
    if ( ! gid("autoloadplaylist").checked ) return;

    let table = gid("playlisttable");
    if (!table) return;

    if (table.dataset['uid'] === d.uid) {
        YTO.send_json({action: "sendplaylist", uid: d.uid});
    }
}


    // OBS's browser doesn't allow the use of :has() so let's change things
export function table_entries_to_array(tableId, onlyChecked = false) {
    let rows = [];
    if (onlyChecked) {
        let cbxs = qsa(`#${tableId} input:checked`);
        cbxs.forEach(x => {
            let r = x.parentNode.parentNode;
            if (r.dataset['videoid']) rows.push(r);
        });
    } else {
        // nope let chk = onlyChecked ? ":has(input:checked)" : '';
        let q = `#${tableId} tr:not(:first-child)`;
        rows = qsa(q);
    }
                            //console.log("rows:", rows);
    let res = [];
    for (let tr of rows) {
        let e = {...tr.dataset, title: tr.children[1].textContent, adder: tr.children[2].textContent};
        res.push(e);
    }
//console.log("e", res);
    return res;
}

    // create table make sure name filled

export function create_playlist_verify() {
    let pack = {};
    pack.name = gid("createplaylistname").value.trim();
    pack.shuffle = gid("createplaylistshuffle").checked;
    pack.storePerm = gid("createplayliststoreperm").checked

    if (!pack.name) {
        toast("Name of playlist is drivel.", 'is-danger', 5000);
        return;
    }

    pack.action = "createplaylist";
    YTO.send_json(pack);
}

    // message informing of creation

export function on_playlist_created(d) {

    let nameI = gid("createplaylistname");
    let name = nameI.value;

    toast(`Playlist <b>${d.playlist.name}</b> created`, "is-link");

    if (d.playlist.name === name) {
        nameI.value = "";
        TT.hide_modal("createlistmodal");
    }
    // update the playlists
    YTO.send( "getplaylists" );
}

    // a playlist has been updated

export function on_playlist_updated(d) {
    YTO.send( "getplaylists" );
    TT.hide_modal("editlistmodal");

    let msg = "<div>Playlist Updated.<div>";
    if (d.name !== d.oldname) {
        msg += `<div><b>${d.oldname}</b> renamed <b>${d.name}</b></div>`;
    }
    toast(msg, "is-info", 6000, {dismissible: true});
}

    // fill the fields, pop up the modal

export function edit_modal_show() {
    let uid = get_select_val("loadplaylistselect");

    if (!uid) {
        toast_raw({message: "Select a playlist from the dropdown first.",
        type: "is-danger",
        animate: {in: "tada", out: "hinge", duration: "5s"}, position: "top-center"})
        return;
    }
    editingUID = uid;
    editingName = get_select_text("loadplaylistselect");
    //toast("Editing " + editingName);

    let pl = playlists[uid];
    let nameI = gid("editplaylistname");
    let destroyBtn = gid("destroyplaylistbtn");
    let disabled = pl.name.toLowerCase() === "default";

    nameI.disabled = disabled; destroyBtn.disabled = disabled;

    gid('destroyplaylistconfirm').checked = false;
    gid("editplaylistname").value = pl.name;
    gid("editplaylistshuffle").checked = pl.shuffle;
    gid("editplayliststoreperm").checked = pl.storePerm;

    TT.show_modal("editlistmodal");
}

    // make sure name isn't empty

export function update_playlist_verify() {
    let name = gid("editplaylistname").value.trim();
    let shuffle = gid("editplaylistshuffle").checked;
    let storePerm = gid("editplayliststoreperm").checked;

    if (!name) {
        toast("FAIL:  Name can't be blank you muppet.", 'is-danger');
        return;
    }

    let oldname = playlists[editingUID].name;
    //toast("Sending update stuff..."+oldname+" -> "+name);
    // let the server reject an attempt to name to Default or to a duplicate name.
    // it should allow naming to default if default doesn't exist

    YTO.send_json({action: "updateplaylist", uid: editingUID, name, shuffle, storePerm, oldname});
}


    // delete that playlist, not if it's 'Default'

export function delete_playlist_verify() {
    let dConf = gid("destroyplaylistconfirm");
    if (!dConf.checked) {
        toast("Confirm auto-destruct sequence 11A2B", "is-danger");
        return;
    }
    dConf.checked = false;

    if (gid("editplaylistname").value.toLowerCase === "default") {
        toast("No deleting of the default playlist.  No.", "is-danger");
        return;
    }

    YTO.send_json({action: "deleteplaylist", uid: editingUID});
}
    // notifies that a playlist has gone
export function on_playlist_deleted(d) {
    TT.hide_modal("editlistmodal");
    toast(`Playlist <strong>${d.name}</strong> deleted.\n${d.count} entries were lost at sea.`, "is-link", 10000, {dismissible: true});
}

    // replace all the videos in a player - acts as if the player requested a playlist

export function player_playlist_replace(e) {
    // ids for the selects
    let player = e.target.dataset["playerselect"];
    let list = e.target.dataset["listselect"];

    let listuid = window.get_select_val(list);
    let playlistName = window.get_select_text(list);

    if ( listuid === "") {
        toast("Select a playlist", "is-danger");
        return;
    }

    let playerUid = window.get_select_val(player);
    let playerName = window.get_select_text(player)

    if (playerUid === "players") {
        toast("Replacing all playlists in all players is too dangerous.  Choose a player");
        return;
    }

        // need the playlist NAME to avoid writing code
    let pack = {
        action: "loadplaylist",
        name: playlistName,
        to: playerUid,
    }

    YTO.send_json(pack);

    toast(`Replacing <b>${playerName}'s</b> playlist with <b>${playlistName}</b>`);
}