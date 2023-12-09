"use strict"

/*
    Should it emit on different states or just let others add listeners to the player / this
    The class already emits on every player state so let external code handle things to keep us simple

    you can loadPlaylist with a csv of ids
ccc
    Possibly have a nextvid NO - the player should be separate from the controller
*/
class YTPlayer {

    width = window.ytplayerXSize ??=  320;
    height = window.ytplayerYSize ??= 180;
    player = {};    // the youtube player
    playerDivName = "ytplayer";
    states = {};    // will reverse YT.PlayerState and be indexed by number
        // dummy element to attach custom events to
    #eventDummy = document.createElement('ytPlayerEvents');

        // youtube api has done its callback
    $readyResolve = null;
    $readyReject = null;
    #readyPromise = new Promise((res, rej) => {this.$readyResolve = res; this.$readyReject = rej;});
        // player within iframe is ready
    $playerReadyResolve = null;
    $playerReadyReject = null;
    #playerReadyPromise = new Promise((res, rej) => {this.$playerReadyResolve = res; this.$playerReadyReject = rej;});

        // the youtube api has called onYouTubeIframeAPIReady
    ready() {
        return this.#readyPromise;
    }
        // when the player in the youtube iframe is ready to play
    playerReady() {
        return this.#playerReadyPromise;
    }

    playerVars = {
        "autoplay": 1, //window.ytplayerAutoplay ??= 1
        'playsinline': 1,
        "controls": 0,
        "fs": 0,    // fullscreen buttons
        "rel": 0,   // related vids that channel only
        "iv_load_policy": 3, // annotations
        "mute": window.ytplayerMuted ??= 0
    }
    // onReady, onStateChange, onPlaybackQualityChange, onPlaybackRateChange, onError, onApiChange
    events = {
        'onReady': this.onPlayerReady.bind(this), // called once when the player first initialises
        'onStateChange': this.onPlayerStateChange.bind(this),
        'onError': this.onPlayerError.bind(this),
        'onPlaybackQualityChange': this.onPlayerQualityChange.bind(this),
        'onPlaybackRateChange': this.onPlayerPlaybackRateChange.bind(this),
        'onApiChange': this.onPlayerApiChange.bind(this)
    }

        // ********** CONTRUCT ********* //

        // NOTE: this does not init the iframe.  Do that when ready by awaiting .ready();
    constructor(divName = "ytplayer") {
        console.log("I am a YTPlayer constructor");

        this.playerDivName = divName;
            // this.ready() resolves once the api has been loaded
        this.insert_ytplayer_api();
    }

        // the iframe needs a video if playVideo is later called

    init_iframe(videoId) {
        console.log("YTPlayer.init_iframe(): ");
            // later player will emit onReady if it's successfully loaded a video
        this.player = new YT.Player(this.playerDivName, {
            width: this.width,
            height: this.height,
            videoId, // you can omit it but don't playVideo() the url stays the same in the iframe even on video changes
            playerVars: this.playerVars,
            events: this.events
        });

        if (!this.player) {
            console.error("Error: Unable to create Youtube player in YTPlayer.init_yt_ifram()");
            return false;
        }

        console.log("YTPlayer.init_iframe(): SUCCESS");
        return true;
    }

    play() {
        this.player.playVideo();
    }
        // return current pos
    stop() {
        this.player.stopVideo();// unstarted, cued after stopping
    }

        // void
    volume() {

    }
        // there's also player.getVideoInfo()
    get_title() {
        return this.player.videoTitle;
    }

    cue_next() {

    }

    play_next() {

    }

    // *********************** EVENT LISTENERS AND EMITTERS *****************************/
    // onReady, onStateChange, onPlaybackQualityChange, onPlaybackRateChange, onError, onApiChange

    addPlayerListener(event, listener) {
        this.player.addEventListener(event, listener);
    }
        // this is called only once
    onPlayerReady(event) {
        this.$playerReadyResolve(true);
        this.emit("onReady", event);
    }

    onPlayerStateChange(event) {
        this.emit("onStateChange", event);
    }

    onPlayerError(event) {
        this.emit("onError", event);
    }

    onPlayerQualityChange(event) {
        this.emit("onQualityChange", event);
    }

    onPlayerPlaybackRateChange(event) {
        this.emit("onRateChange", event);
    }

    onPlayerApiChange(event) {
        this.emit("onApiChange", event);
    }

    emit(event, data) {
        //console.log(`################ Emitting ${event}`)
        let e = new CustomEvent(event,
            { detail: {
                ...data,
                target: this.player,
            }
        });

        this.#eventDummy.dispatchEvent(e);
    }

    addEventListener(event, fn) {
        this.#eventDummy.addEventListener(event, fn);
    }
    removeEventListener(event, fn) {
        this.#eventDummy.removeEventListener(event, fn);
    }


    insert_ytplayer_api() {
        // onYouTubeIframeAPIReady function
        let whenYTFrameReady = function(event) {
            // this can be delayed until we want it this.player = this.init_yt_iframe();
            for ( const [name, num] of Object.entries(YT.PlayerState) ) {                //console.debug(name, num);
                this.states[num] = name;
            }
                //this.$readyReject("Error creating ytplayer in init_yt_iframe");
            console.log("YTPlayer ready() Promise RESOLVING true");
            this.$readyResolve(true);
        }
            // globalise it
        window.onYouTubeIframeAPIReady = whenYTFrameReady.bind(this);

        var tag = document.createElement('script');

        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

} // class end


export { YTPlayer };
export default YTPlayer;
