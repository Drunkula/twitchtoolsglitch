/**
 * An attempt to resize the player to 4:3 size when a real 4:3 video is present
 *
 * I tried to do it by sucking the player with the iframe out but no go because of cors nonsense
 *
 * Need to resort to using the YT Api
 *
 */
/*
const YT_ENTRIES_PER_PAGE = 50; // can only grab info for 50 videos per time playlist.slice(start, end)
const ytPlayerInfoAPI = "https://youtube.googleapis.com/youtube/v3/videos?part=player&key=AIzaSyBRPuveJXC18b_bf6PIIUYFrkRwlGjK6P4&id="
// api key free call for a single video.  Includes width and height, typically 200 x 150 or 113
const ytOembedUrl = "https://www.youtube.com/oembed?format=json&url=https://youtu.be/4TV_128Fz2g";
    // this won't get run until it's imported
*/
var htmlPlayer; // the embedded lad to watch
var playerContainer = gid("ytcontainer");

// what events does the YT internal player have?  onStateChange, that'll do
// https://developers.google.com/youtube/iframe_api_reference#Events


export async function auto_ratio_init() {
    ytcontainer.classList.add("youtube-player");

    await window.ytpc.ytPlayer.ytPlayerReady();

    ytpc.ytPlayer.addPlayerListener('onStateChange', auto_ratio_handler);
}

    // states you can calc the thingy on: 1 playing, 2 paused mean's it's already played
    // NO -1 unstarted, 3 buffering,
export function auto_ratio_handler(p) {
    let vr = p.target.playerInfo.videoContentRect;// = {left, top, width, height}
    let ratio = vr.height/vr.width; // either 0.75 or 0.5625
/*
    let wideOr43 = (ratio - 0.6 > 0) ? "4:3" : "Widescreeen";
    console.log("STATE CHANGE", p);
    console.log("STATE: ", p.data, ytpc.ytPlayer.states[p.data], "for:", p.target.videoTitle);
    console.log(`Ratio: ${vr.height}/${vr.width} = ${vr.height/vr.width} guess: ${wideOr43}`);
*/
    if (p.data === 1)
    if (ratio  - 0.65 > 0) {
        playerContainer.classList.add("youtube-player-43");
    } else {
        playerContainer.classList.remove("youtube-player-43");
    }
}