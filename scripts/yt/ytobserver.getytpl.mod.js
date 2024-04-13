const MAX_PLAYLIST_RESULTS = 500;   // 50 only per request.  Each request uses 1 daily quota of 10,000.  Searches use 100

let playlistUrl = "https://youtube.googleapis.com/v3/playlistItems?key=[YTAPIKEY]&part=snippet&fields=nextPageToken,items.snippet(title,videoOwnerChannelTitle,resourceId.videoId)&maxResults=100&playlistId=";

    /**
     * Handles the add click request when it's a playlist routed from add_video_to_playlist() in ytobserver.playlist.mod.js
     * gets the vidInfos and pushes them SB with the uid of the list
     * @returns nothing
     */

export async function add_ytplaylist_to_playlist() {
    if (YTO.ytApiKey === null) {
        toast("No API key has been sent by Streamerbot.  Can't fetch playlist", "is-danger");
        return;
    }

    let playlistuid = gid("loadplaylistselect").value;
    let adder = gid("videoadder").value;
    let apiKey = YTO.ytApiKey;

    if (playlistuid.length === 0) {
        toast("Choose a playlist to add the list to, you plum.", "is-danger");
        return;
    }

    let link = gid("addvideotoplaylist").value;

    let vidInfos = await fetch_yt_playlist_entries({apiKey, url: link, adder});

    if (vidInfos === null) {
        return;
    }

    if (vidInfos.length === 0) {
        toast("No videos were found in the playlist.", "is-danger");
        return;
    }

    let pack = {
        action: "copytoplaylist",
        returnto: YTO.myUID,
        uid: playlistuid,
        entries: vidInfos
    }

    YTO.send_json(pack);
}

/**
 *
 * @param {string url of playlist} plUrl
 * @param {string name of adder} adder
 * @returns array of VidInfo
 */

async function fetch_yt_playlist_entries(d) {
    let vInfos = [];
    let deletedVideos = 0;
    let pageToken = null;   // page tokens let us know there are more results to grab

    let plId = parse_playlist_id(d.url);

    if (plId === null) {
        toast("Error:  Couldn't get the playlist id from the url.", "is-danger");
        console.log("COULDN'T PARSE THE URL: " + d.url);
        return null;
    }

    let reqUrl = playlistUrl.replace("[YTAPIKEY]", d.apiKey) + plId;
    let fetchedPages = 0;
    let fetchedResults = 0;

    do {
        let rUrl = reqUrl + (pageToken ? `&pageToken=${pageToken}` : "");
        let res = await fetch(rUrl);
        res = await res.json();

        if (res.error) {
            toast("<b>Error:</b> " + res.error.message + " - Basically the playlist id is a load of tripe.  Maybe it's private or something.", "is-danger");
            return;
        }

        fetchedResults += res.items.length;

        for(let vi of res.items) {
            let title = vi.snippet.title;
            if (title === "Deleted video") {deletedVideos++; continue;}
            title = filter_video_title(title);

            vInfos.push({ title, channel: vi.snippet.videoOwnerChannelTitle, videoid: vi.snippet.resourceId.videoId, adder: d.adder });
        }
        if (fetchedResults >= MAX_PLAYLIST_RESULTS) break;
        // page tokens
        pageToken = res.nextPageToken;
    } while (++fetchedPages < MAX_PLAYLIST_RESULTS && pageToken);

    //console.log("V INFOS: ", vInfos);
    return vInfos;
}

function filter_video_title(title) {
    return title
        .replace(/\(official\b[^)]*\)/i, "")
        .replace(/hd remaster\w*/i, "")
        .replace(/\(\s*\)/, "")
        .replace(/\[\s*\]/, "")
        .trim()
        ;
}

function parse_playlist_id(link) {
    let rx = /list=([\w-]+)/
    let res = link.match(rx);
    return res ? res[1] : null;
}
















