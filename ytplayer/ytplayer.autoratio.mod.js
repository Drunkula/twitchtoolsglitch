/**
 * Resize the player to 4:3 size when a real 4:3 video is present
 */
var playerContainer = document.getElementById("ytcontainer");
var ytIframe;

// what events does the YT internal player have?  onStateChange, that'll do
// https://developers.google.com/youtube/iframe_api_reference#Events

export async function auto_ratio_init() {
    ytcontainer.classList.add("youtube-player");
    await window.ytpc.ytPlayer.ytPlayerReady();
    ytpc.ytPlayer.addPlayerListener('onStateChange', auto_ratio_handler);
    ytIframe = document.getElementById("ytplayer");
}

    // Playing seems to be the only reliable state to change ratio on.

export function auto_ratio_handler(p) {
    let vr = p.target.playerInfo.videoContentRect;
    let ratio = vr.height/vr.width;

    //let holderRatio = playerContainer.clientHeight / playerContainer.clientWidth;
    //let holderRatio = document.documentElement.clientHeight / document.documentElement.clientWidth;
    //document.documentElement.clientHeight
/*
    ytpc.send_json({action:"relay", to: "all", data: {
            action: "consolelog",
            message:`window inner w x h = ${window.innerWidth} x ${window.innerHeight}`,
            colour: "y"
        }
    });
    ytpc.send_json({action:"relay", to: "all", data: {
            action: "consolelog",
            message:`Doc Element w x h = ${document.documentElement.clientWidth} x ${document.documentElement.clientHeight}`,
            colour: "y"
        }
    });
*/
    if (p.data === 1) // 1 = playing
    /*
    if (ratio > holderRatio) {
        ytplayer.style.width = `${100 * holderRatio / ratio}%`;
    }*/
    if (ratio  - 0.65 > 0) { // will be 0.75 or .5625, do a 'trick'
        //ytplayer.style.width = `${56.25 / ratio}%`;
        //playerContainer.classList.add("youtube-player-43");
        //ytplayer.style.width="75%";
    }
    else {
        //playerContainer.classList.remove("youtube-player-43");
        ytplayer.style.width="100%";
    }
}
/*
let wideOr43 = (ratio - 0.6 > 0) ? "4:3" : "Widescreeen";
console.log("STATE CHANGE", p);
console.log("STATE: ", p.data, ytpc.ytPlayer.states[p.data], "for:", p.target.videoTitle);
console.log(`Ratio: ${vr.height}/${vr.width} = ${vr.height/vr.width} guess: ${wideOr43}`);
*/