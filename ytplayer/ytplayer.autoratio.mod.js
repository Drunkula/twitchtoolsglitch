/**
 * Resize the player to 4:3 size when a real 4:3 video is present
 */
var playerContainer = document.getElementById("ytcontainer");

// what events does the YT internal player have?  onStateChange, that'll do
// https://developers.google.com/youtube/iframe_api_reference#Events

export async function auto_ratio_init() {
    ytcontainer.classList.add("youtube-player");
    await window.ytpc.ytPlayer.ytPlayerReady();
    ytpc.ytPlayer.addPlayerListener('onStateChange', auto_ratio_handler);
}

    // Playing seems to be the only reliable state to change ratio on.

export function auto_ratio_handler(p) {
    let vr = p.target.playerInfo.videoContentRect;
    let ratio = vr.height/vr.width;

    if (p.data === 1) // 1 = playing
    if (ratio  - 0.65 > 0) { // will be 0.75 or .5625, do a 'trick'
        playerContainer.classList.add("youtube-player-43");
    } else {
        playerContainer.classList.remove("youtube-player-43");
    }
}
/*
    let wideOr43 = (ratio - 0.6 > 0) ? "4:3" : "Widescreeen";
    console.log("STATE CHANGE", p);
    console.log("STATE: ", p.data, ytpc.ytPlayer.states[p.data], "for:", p.target.videoTitle);
    console.log(`Ratio: ${vr.height}/${vr.width} = ${vr.height/vr.width} guess: ${wideOr43}`);
*/