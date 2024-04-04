/**
 * An attempt to resize the player to 4:3 size when a real 4:3 video is present
 *
 * I tried to do it by sucking the player with the iframe out but no go because of cors nonsense
 *
 * Need to resort to using the YT Api
 *
 */

const YT_ENTRIES_PER_PAGE = 50; // can only grab info for 50 videos per time playlist.slice(start, end)
const ytPlayerInfoAPI = "https://youtube.googleapis.com/youtube/v3/videos?part=player&key=AIzaSyBRPuveJXC18b_bf6PIIUYFrkRwlGjK6P4&id="
    // this won't get run until it's imported

var htmlPlayer; // the embedded lad to watch

console.log("Auto ratio script here...");

(async () => {
        // hold your horses, chum.

})();



export async function auto_ratio_init() {
    await ytpc.ytPlayer.ytIframeReady();


    await ytpc.ytPlayer.ytPlayerReady();



    let v = qsa("video");

    console.log("AUTO RATIO DISCOVERS VIDEO:", v);
}