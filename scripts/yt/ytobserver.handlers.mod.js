import {add_video_to_player, send_playlist_to_player, get_players_list, delete_player_only} from "./ytobserver.main.mod.js";
import * as l from "./ytobserver.playlist.mod.js";
import {move_table_rows} from "./observer.helpers.mod.js";

    // buttons, selects
export default
[
    // playER page
    //{selector: ".player-controls .delete-permanently", event: "click", function: () => delete_vids(true)},
    {selector: ".player-controls .delete-playeronly", event: "click", function: () => delete_player_only(false)},
    {selector: "#sendlisttoplayer", event: "click", function: x => send_playlist_to_player()},
    // MOVING ROWS
    {selector: ".player-controls .rowsup", event: "click", function: x => move_table_rows('playertable', "up")},
    {selector: ".player-controls .rowsdown", event: "click", function: x => move_table_rows('playertable', "down")},
    {selector: ".player-controls .rowstotop", event: "click", function: x => {move_table_rows('playertable', "top")}},
    {selector: ".player-controls .rowstobottom", event: "click", function: x => {move_table_rows('playertable', "bottom")}},

    // select all checkbox player
    {selector: "#checkallplayer", event: "click", function: x => {
        let c = x.target.checked; qsa("#playertable input[type='checkbox']").forEach(e => e.checked = c);}
    },
    {selector: ".player-controls .clearchecks", event: "click", function: x => qsa('#playertable input[type=checkbox]:checked').forEach(x=>x.checked=false)},
    {selector: ".player-controls .setchecks", event: "click", function: x => qsa('#playertable input[type=checkbox]').forEach(x=>x.checked=true)},


    {selector: "#playerselect", event: "change", function: x => {if (gid("autoloadplayerlist").checked) get_players_list();}, params: {}},
    {selector: "#playerselectgetbtn", event: "click", function: get_players_list, params: {}},

    ////////// PLAYLIST //////////
    ////////// PLAYLIST //////////
    ////////// PLAYLIST //////////

    {selector: "#loadplaylistselect", event: "change", function: x => l.send_load_playlist_cmd(x), params: {}},
    {selector: "#getplaylistbtn", event: "click", function: x => l.send_load_playlist_cmd(x), params: {}},

    {selector: ".playlist-controls .clearchecks", event: "click", function: x => qsa('#playlisttable input[type=checkbox]:checked').forEach(x=>x.checked=false)},
    {selector: ".playlist-controls .setchecks", event: "click", function: x => qsa('#playlisttable input[type=checkbox]').forEach(x=>x.checked=true)},

    {selector: ".playlist-controls .rowsup", event: "click", function: x => {update_playlist_set_btn_state(true); move_table_rows('playlisttable', "up")}},
    {selector: ".playlist-controls .rowsdown", event: "click", function: x => {update_playlist_set_btn_state(true); move_table_rows('playlisttable', "down")}},
    {selector: ".playlist-controls .rowstotop", event: "click", function: x => {update_playlist_set_btn_state(true); move_table_rows('playlisttable', "top")}},
    {selector: ".playlist-controls .rowstobottom", event: "click", function: x => {update_playlist_set_btn_state(true); move_table_rows('playlisttable', "bottom")}},

    {selector: ".playlist-controls .delete-permanently", event: "click", function: () => l.delete_from_playlist(true)},
    {selector: ".playlist-controls .addvideobtn", event: "click", function: x => l.add_video_to_playlist()},

    {selector: "#delplaylistconfirm, #destroyplaylistconfirm, #del-sel-from-pl-confirm", event: "click", function: x => x.stopPropagation()},

    {selector: ".playlist-controls .savetoplaylist", event: "click", function: e => l.copy_to_playlist("playlisttable", e)},
    {selector: "#updateplaylistlistbtn", event: "click", function: l.update_playlist_list},
    {selector: "#updateplaylistbtn", event: "click", function: l.update_playlist_verify},   // inside modal
    {selector: "#createplaylistbtn", event: "click", function: l.create_playlist_verify},   // inside modal
    {selector: "#destroyplaylistbtn", event: "click", function: l.delete_playlist_verify}, // inside modal

    {selector: "#editplaylistshowmodalbtn", event: "click", function: l.edit_modal_show}, // inside modal


    {selector: ".player-controls .savetoplaylist", event: "click", function: e => l.copy_to_playlist("playertable", e)},
    // updateplaylistlist sends the list back to the playlist
    // updateplaylist updates name, shuffle, store !add

        // SEND ALL CHECKED in a playist to player
    {selector: ".sendtoplayer", event: "click", function: l.send_entries_to_player},
        // SEND single entr in ADD VIDEO  to player
    {selector: ".player-controls .addvideobtn", event: "click", function: x => add_video_to_player()},
        // clear add video button
    {selector: "#addvideotoplayer, #addvideotoplaylist", event: "contextmenu", function: e => e.target.value=""},
    {selector: "#addvideotoplayer, #addvideotoplaylist", event: "dblclick", function: e => e.target.value=""},

        // delete items from a playlist
    {selector: "#del-sel-from-pl", event: "click", function: l.delete_from_other_playlist},

        // full replace button
    {selector: ".load-playlist", event: "click", function: l.player_playlist_replace}

];