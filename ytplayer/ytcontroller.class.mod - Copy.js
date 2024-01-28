/*
    JAVASCRIPT part
*/
import { Socketty } from "/scripts/Socketty.class.js";
import { YTPlayer } from "./ytplayer.class.mod.js";

    // whether next or prev was last used
const DirFwd = 1;
const DirBack = -1;
    // Default playlist in config.mod.js

// essentially {these funcs} = {this object of funcs}

class YTController {

    socket = new Socketty();    // url is set in constructor
    ytPlayer = new YTPlayer();
    yt;  // shortut to ytPlayer.player.  Don't use until player ready event

    // adding items to Queued can shuffle Queued or play next will just push
    playlist = [];        // this.playlistQueued of videoids
    playlistMap = new Map();    // "ytvideoid" => {title, adder, id(numeric)}
    playlistMapCounter = 1;     // each entry will have a numeric id to help with deleting, etc

    playlistCurrentId = null; // current id
    playlistPointer = 0;
    playlistNextCount = 0;  // videos queued as next - do not shuffle the last X elements of Queued

    isPaused = false;       // you can hard pause the player
    deleteOnError = true;   // removes from local list and sends a message to server
    //loopOnEnd = false;
    lastDirection = DirFwd; // which direction to keep going in case of error

    playlistLoaded = false;

    socketEvents = [
        ['message', e => this.message_handler(e)],
        ['open',  () => { out("!!!YT VERSION Socketty opened");
                    window.sockOpenTime = -Infinity;
                    // really I should check if this is a re-open and set a loaded state
                    // this is a fudge.  I should

                    if (this.playlistLoaded) return;

                    this.send("loadplaylist");
                }],

        ['close', () => {   // out first time then only every 30 seconds
            let now = performance.now();
            let last = window.sockOpenTime ??= -Infinity;  // doesn't exist?  Warn first time with nullish coalescing assignment
            if (now - last > 30000) {
                out("!!YT VERSION Oh noes, socketty closed");
                window.sockOpenTime = now;
            }
        }],

        ['Xerror', x => out("!!!YT VERSION Socketty error!", x.toString())]
    ];

        // can only be added after ready() so onReady won't be called
        // you need to add to this
    playerEvents = [
        ['onStateChange', this.state_change_hander.bind(this)],
        ['onError', e => this.error_handler(e)],
    ]

    thisEvents = [
        ['onReady', e => { out("--- Player is Ready ---"); this.ytPlayer.player.setVolume(window.ytplayerVolume ??= 100);}],
        ['onError', e => { out("WTF HAPPNIN BRO?"); }]
    ];

        // messages will be like a format of "action" and "data"

    actions = {
        play:       d => this.play(),
        playvideo:  d => this.load_video(d.videoid),
        pause:      d => this.pause(),
        stop:       d => this.yt.stopVideo(),
        resume:     d => this.yt.playVideo(),
        restart:    d => { this.yt.seekTo(0); this.play();},
        fwd:        d => {clog("=========== fwd", d); this.yt.seekTo( this.yt.getCurrentTime() + d.data);},
        rwd:        d => {this.yt.seekTo( this.yt.getCurrentTime() - d.data);},
        almostend:  d => { this.yt.seekTo( this.yt.getDuration() - 5); },
        "next()":       d => {this.yt.nextVideo()},
        "prev()":       d => {this.yt.previousVideo()},

        volup:      d => {let v = this.yt.getVolume(); this.yt.setVolume(v + 5); clog(v);},
        voldown:    d => {let v = this.yt.getVolume(); this.yt.setVolume(v - 5); clog(v);},
        mutetoggle: d => this.yt.isMuted() ? this.yt.unMute() : this.yt.mute(),

        adddefaults:d => this.add(playlistDefaults),

        big:        d => this.yt.setSize(640, 360),
        small:      d => this.yt.setSize(320, 180),
        title:      d => clog(this.yt.videoTitle),
        qualityget: d => clog(this.yt.getAvailableQualityLevels()),

        sendmessage:d => { this.send(d.data); },
        playlistadd:d => { this.add(d.data, d.addnext ? true : false); },
            // the entire thing
        fullplaylist:d => { this.playlistLoaded = true; this.add(d.data, true); this.shuffle(true); this.playlistPointer = -1; this.next(); },

        shuffle:    d => { this.shuffle(false); },
        shuffleall: d => { this.shuffle(true); },
        getvideoinfo: d => {clog( this.yt.getVideoData() ); },

        next:       d => { this.next(); },
        prev:       d => { this.prev(); },

        clearvideos:d => { this.playlist = []; this.playlistPointer = 0; this.playlistMap.clear(); this.playlistNextCount = 0;},

        consolelog: d => {clog( window[d.colour](d.message) );},

        connect:    d => ytpc.socket.connect(),
        disconnect: d => ytpc.socket.close(),
        f: d => {},

        nowandnext: d => this.now_and_next(d.data.howMany),

        playlistcount: e => {
            clog("sending count:", this.playlist,length);
            this.send_json({action: "playlistcount", count: this.playlist.length});
        },

        getwholeplaylist: e => this.send_whole_playlist()
    }

    // CPH.RunActionById("1a8f5a37-5107-420c-9dd5-4f863ce6ffd1", true);
    // HAS A ytplayer
    // HAS A socket systems

    constructor() {
        clog("I am a YTController constructor.");
        //this.insert_ytplayer_api();   // done in player contructor
        this.add_socket_events();

        this.convenience();
    }
        // create a reference to the players player when ready
    async convenience() {
        this.add_this_events(); // NOT player events
        await this.ytPlayer.playerReady();
        this.add_player_events();
        clog("Player ready, adding events.", this.ytPlayer.player);
        this.yt = this.ytPlayer.player;
    }

    add_socket_events() {
        for (const pair of this.socketEvents) {
            this.socket.addEventListener(pair[0], pair[1]);
        }
    }
        // can only be called after ready()
    add_player_events() {
        for (const pair of this.playerEvents) {
            this.ytPlayer.player.addEventListener(pair[0], pair[1]);
        }
    }
        // can be called before ready()
    add_this_events() {
        for (const pair of this.thisEvents) {
            this.ytPlayer.addEventListener(pair[0], pair[1]);
        }
    }

        // splice out the current video and any nexts
        // shuffle everything
        // put curr and nexts back to the start and reset the pointer
    shuffle(all = false) {
        let m, currAndNexts, t, i;

        if (all) {
            currAndNexts = [];
            this.playlistNextCount = 0;
        } else {
            currAndNexts = this.playlist.splice(this.playlistPointer, 1 + this.playlistNextCount);
        }

        m = this.playlist.length;

        while (m) {
            // Pick a remaining element…
            i = Math.floor(Math.random() * m--);
                // And swap it with the current element.
            t = this.playlist[m];
            this.playlist[m] = this.playlist[i];
            this.playlist[i] = t;
        }
            // you could push them onto the end but stop microing
        this.playlist.unshift(...currAndNexts);
        this.playlistPointer = 0;
    }

        // return pos
    next() {
        this.lastDirection = DirFwd;
        if (this.playlist.length === 0) return false;

        //this.playlistPointer = ++this.playlistPointer >= this.playlist.length ? 0 : this.playlistPointer;
        this.playlistPointer = ++this.playlistPointer % this.playlist.length;

        if (this.playlistNextCount > 0) this.playlistNextCount--;

        let id = this.playlist[this.playlistPointer];

        if (!this.isPaused)
            return this.load_video(id);

        return this.cue_video(id);
        //clog(this.playlist[this.playlistPointer]);
        return id;
    }

    /*
    */
    prev() {
        this.lastDirection = DirBack;

        let len = this.playlist.length;

        if (len === 0) return false;

        if (this.playlistPointer === 0) {
            this.playlistPointer = len - 1;
        } else {
            this.playlistPointer--;
        }
            // make the current video a forced next
        this.playlistNextCount++;
        if ( this.playlistNextCount >= len )
            this.playlistNextCount = len - 1;

        let id = this.playlist[this.playlistPointer]

        if (!this.isPaused)
           return this.load_video(id);

        return this.cue_video(id);
    }
        // alias
    previous() {
        return this.prev();
    }

/*
https://youtube.googleapis.com/youtube/v3/videos?part=snippet&key=AIzaSyBRPuveJXC18b_bf6PIIUYFrkRwlGjK6P4&fields=items.snippet.description,items.snippet.title,items.snippet.channelTitle&id=Ks-_Mh1QhMc
https://youtube.googleapis.com/youtube/v3/videos?part=snippet&key=AIzaSyBRPuveJXC18b_bf6PIIUYFrkRwlGjK6P4&fields=items.snippet.description,items.snippet.title,items.snippet.channelTitle&id=%videoid%

    videoItem: a singly id, a single {videoid, tltle, added}, this.playlistQueued of single ids, this.playlistQueued of {}
*/
    add(videoItem, isNext = false) {
        switch ( true ) {
            case videoItem instanceof Array:
                //clog("-----------adding this.playlistQueued");
                for (const entry of videoItem) {
                    if (typeof entry === "string") {
                        if (entry.length === 0) return; // DEBUG check for 11 really
                        this.#add_entry(entry, null, null, isNext);
                    }
                    else
                        this.#add_entry(entry.videoid, entry.title, entry.adder, isNext);
                }
                break;

            case videoItem instanceof Object:   // are we allowing a map like object
                //clog("-----------adding object");
                this.#add_entry(videoItem.videoid, videoItem.title, videoItem.adder, isNext);
                break;


            case typeof videoItem === "string":
                //clog("----------adding string", videoItem);
                if (videoItem.length === 0) return;
                this.#add_entry(videoItem, null, null, isNext);
                break;

            default:
                console.error("add() to player list unknown type: ", videoItem, typeof videoItem);
        }

        // clog("QUEUED AFTER:", this.playlistQueued);
        //console.clear();
        //clog("QUEUED AFTER:", this.playlistMap);

    }

        // in reality I think using a "front splice" method where nexts are put at the start
        // is 'better' as less splices will happen toward the front of the array

    #add_entry(videoid, title="Unknown", adder = "Unknown adder", next = false) {
        if (this.playlistMap.has(videoid))
            return false;    // may bump this if addnext

        this.playlistMap.set(videoid, {title, adder, "number": this.playlistMapCounter++});

        let len = this.playlist.length;

        if (len === 0) {
            this.playlist.push(videoid);
            return;
        }

        if (next) {// this might go wrong if prevved to rear of list
            let posn = this.playlistPointer + this.playlistNextCount + 1;
            this.playlist.splice(posn, 0, videoid);
            this.playlistNextCount++;
            //clog("posn next", posn);
        } else {    // random position, let's do it the "cool" way without a front splice
            let avail = len - this.playlistNextCount;
            let posn = 1 + this.playlistPointer + this.playlistNextCount + Math.floor(Math.random() * avail);
                // ^ +1 so you never splice into position zero, instead use the end; functionally equivalent
            if (posn > len) {
                posn = posn - len;
                this.playlistPointer++; // it must move forward, wouldn't get that with a front splice
                //clog("POSI b4", t, "to", posn);
            }/*  else {
                clog("POSI b4", posn);
            } */

            this.playlist.splice(posn, 0, videoid);
        }

        return true;
    }

    state_change_hander(e) {
       // clog("STATE:", this.ytPlayer.states[e.data]);
            // DEBUG TEST
        switch (e.data) {
            case YT.PlayerState.ENDED:
                this.next();    // a now playing state needs to be sent up.  Could do on Playing
                break;

            case YT.PlayerState.PLAYING:    // sent after pause and stop
                clog("Playing: ", e.target.getVideoData());
                this.send_json({action: "currsongid", data: e.target.getVideoData().video_id});
                break;

            default:
                //clog("state", this.ytPlayer.states[e.data]);
                break;
        }

    }
// debug console filter
// -url:https://play.google.com/ -url:chrome-extension://mnjggcdmjocbbbhaepdhchncahnbgone/js/content.js -url:https://www.youtube.com
// or use current context only
// handler for socket messages and string actions

    message_handler(e) {
        let data = null, action, json = "not json";

        if (typeof e === "string") {
            action = e;
        } else {
            action = e.data;
        }

        if (action[0] === '{')
        try {
            json = JSON.parse(action);
            action = json.action;
            data = json;
        } catch (error) {
            clog("message_hander:", e);
            clog("ERROR:", error.toString());
        }

        if (this.actions[action]) {
            this.actions[action](data);
        }
            // don't log everything
        if (["consolelog", "pong"].includes(action)) {
            return;
        }

        clog("Action:", action, "JSON?", json);
            //this.send("Thanks, partner!")
    }

    error_handler(e) {
        clog("playlist error for id", this.playlistCurrentId);
        clog(e);
        // SHOULD check if e.data = 150 or 151 or whatever
        let deleted = false;

        if (this.deleteOnError) {
            //clog("Deleting", this.playlistCurrent,"position", this.playlistPointer);
            let v = this.playlistMap.get(this.playlistCurrentId);

            this.playlist.splice(this.playlistPointer, 1);
            this.playlistMap.delete(this.playlistCurrentId);

            if (this.lastDirection === DirFwd) {
                this.playlistPointer--; // because next()
            }

            this.send_json({action:"playlistdeleted",
                videoid: this.playlistCurrentId,
                errorcode: e.data,
                title: v.title,
                adder: v.adder});
        }
            // zero length checked there
        if (this.lastDirection === DirFwd)
            this.next();
        else
            this.prev();
    }
        // both of these check they're connected


    now_and_next(howMany) {
        console.log("THEY WANT THIS MANY NOW AND NEXTS:", howMany);

        if (howMany > this.playlist.length) howMany = this.playlist.length;

            // ok, what if we wrap around? then need the slice before

        let start = this.playlistPointer;
        let end = this.playlistPointer + howMany;
        let ids = this.playlist.slice( this.playlistPointer, end);
            // was end > size of list and is there enough at the start?

        console.log(`Start: ${start} end: ${end} so initially have`, ids);

        if (end > this.playlist.length) {
            end = end % this.playlist.length;
//console.log("END LONG modding: ", end);
            //if (end > start) end = start;
//console.log(`They also need 0 to ${end} added`, this.playlist.slice(0, end));
            ids = [...ids, ...this.playlist.slice(0, end)];
        }

        console.log("THEY GET", ids);

        let titles = new Array(ids.length);
        let adders = new Array(ids.length);

        for (let index = 0; index < ids.length; index++) {
            const id = ids[index];
            titles[index] = this.playlistMap.has(id) ? this.playlistMap.get(id).title : "unknown";
            adders[index] = this.playlistMap.has(id) ? this.playlistMap.get(id).adder : "unknown";
        }

        let obj = { action: "nowandnext", count: ids.length, titles };

        if (howMany == 1) {
            obj = { action: "currsonginfo",
                title: titles[0],
                adder: adders[0],
                duration: this.yt.getDuration(),
                time: this.yt.getCurrentTime(),
                queueposition: this.playlistPointer
            };
        }

        this.send_json(obj);
    }

    send(data) {
        return this.socket.send(data);
    }

    send_json(obj) {
        return this.socket.send( JSON.stringify(obj) );
    }

    load_video(id) {
        this.playlistCurrentId = id;
        this.yt.loadVideoById(id);
    }

    cue_video(id) {
        this.playlistCurrentId = id;
        this.yt.cueVideoById(id);
    }

    play() {
        this.yt.playVideo();
        this.isPaused = false;
    }

        // single id, url, playlist position
    delete(videoItem) {
        let delCount = 0;
        let idx = this.playlist.indexOf(videoItem);

        if (idx >= 0) {
            this.playlist.splice(idx, 1);
            this.playlistMap.delete(videoItem);
        }
            // not yet done
        return delCount;
    }

    current_video_info() {
        return this.yt.getVideoData();
    }

    pause() {
        this.isPaused = true;
        this.yt.pauseVideo();
    }

    is_paused() {
        return this.isPaused;
    }

    send_whole_playlist() {
        let pack = {
            action: "allplaylistdata",
            data: {
                playlist: this.playlist,
                playlistmap: Object.fromEntries(this.playlistMap),
                playlistindex: this.playlistPointer,
            }
        }

        this.send_json(pack);
    }
}

    // why don't classes hoist
//let YTP = new YTController();

export default YTController;

