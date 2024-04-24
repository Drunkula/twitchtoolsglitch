/*
    JAVASCRIPT part returnto = string, from = object YTSock
*/
//import { Socketty } from "/scripts/Socketty.class.js";
import YTPlayer from "../scripts/yt/ytplayer.class.mod.js";
import SockMsgRouter from "../scripts/yt/sockmsgrouter.class.mod.js";

    // whether next or prev was last used
const DirFwd = 1;
const DirBack = -1;
    // Default playlist in config.mod.js

// essentially {these funcs} = {this object of funcs}

class YTController extends SockMsgRouter {
    myUID = (Math.random() * Date.now()).toString();
    myName = "YTController";    // set to a 'nice' name
    mySocketId = "";   // sent from streamerbot

    chatadds = false;   // do we add from chat !add commands

    returnto = null;

    //socket = new Socketty();    // url is set in constructor
    ytPlayer = new YTPlayer();
    yt;  // shortut to ytPlayer.player.  Don't use until player ready event

    // adding items to Queued can shuffle Queued or play next will just push
    playlist = [];        // this.playlistQueued of videoids
    playlistMap = new Map();    // "ytvideoid" => {title, adder, id(numeric)}
    playlistMapCounter = 1;     // each entry will have a numeric id to help with deleting, etc

    playlistCurrentId = null; // current id
    playlistPointer = 0;   // negative before playlist sent and playing the default video
    playlistNextCount = 0;  // videos queued as next - do not shuffle the last X elements of Queued

    isPaused = false;       // you can hard pause the player
    deleteOnError = true;   // removes from local list and sends a message to server
    //loopOnEnd = false;
    lastDirection = DirFwd; // which direction to keep going in case of error

    playlistLoaded = false;

    //* use defaults for now
    YTPSocketEvents = [
        //['message', e => this.message_handler(e)],
        ['open',  () => {
            out("!!!YT VERSION Socketty opened");
            window.sockOpenTime = -Infinity;

            //this.send_json({action: "iAmAPlayer", uid: this.myUID, name: this.myName});
            this.identify();

            if (this.playlistLoaded) return;
            this.send_json({action:"loadplaylist", name: ytparams.playlist});
        }],
        ['message', x => this.message_handler(x)]
    ]; //*/

        // can only be added after ready() so onReady won't be called
        // you need to add to this
    playerPostReadyEvents = [
        ['onStateChange', this.state_change_hander.bind(this)],
        ['onError', e => this.yt_player_play_error_handler(e)],
    ]

        // events that can be added before the youtube player is ready to play

    playerPreReadyEvents = [
        ['onReady', e => {
            out("--- Player is Ready ---");
            this.ytPlayer.player.setVolume(window.ytparams.volume ??= 100);
        }],
        //['onError', e => { out("Error: "+e.toString()); }]
    ];

        // messages will be like a format of "action" and "data"
        // replaces base class actions

    actions = {
        playvideo:  d => this.load_video(d.videoid, d.starttime),
        playsong:   d => this.play_song(d.id),  // sent by playlist double click
            // have chat ones and normal
        play:       d => this.play(),
        pause:      d => this.pause(),
        stop:       d => this.yt.stopVideo(),
        resume:     d => this.yt.playVideo(),
        fwd:        d => {clog("=========== fwd", d); this.yt.seekTo( this.yt.getCurrentTime() + d.data);},
        rwd:        d => {this.yt.seekTo( this.yt.getCurrentTime() - d.data);},
        next:       d => { this.next(); },
        prev:       d => { this.prev(); },

        chatplay:   d => { if (this.chatcmds) this.play() },
        chatpause:  d => { if (this.chatcmds) this.pause() },
        chatstop:   d => { if (this.chatcmds) this.yt.stopVideo() },
        chatresume: d => { if (this.chatcmds) this.yt.playVideo() },
        chatfwd:    d => { if (this.chatcmds) this.yt.seekTo( this.yt.getCurrentTime() + d.data);},
        chatrwd:    d => { if (this.chatcmds) this.yt.seekTo( this.yt.getCurrentTime() - d.data);},
        chatnext:   d => { if (this.chatcmds) this.next(); },
        chatprev:   d => { if (this.chatcmds) this.prev(); },
        chatshuffle:d => { if (this.chatcmds) this.shuffle(false); },

        shuffle:        d => { this.shuffle(false); this.dirty_announce("shuffle"); },
        shuffleall:     d => { this.shuffle(true); this.dirty_announce("shuffle"); },

        // needs to check if it's chat added
        playlistadd:    d => {if (this.playlist_add_handler(d)) this.dirty_announce("addedvideos");},
            // received entire thing
        fullplaylist:   d => { this.got_full_playlist(d); this.dirty_announce("fullplaylistload")}, // dirty ??
        loadplaylist:   d => this.send_json({action:"loadplaylist", name: ytparams.playlist}),
        // SENDS our playlist up, not received
        getplayerplaylist: e => this.send_whole_playlist(e),

        restart:    d => { this.yt.seekTo(0); this.play();},
        almostend:  d => { this.yt.seekTo( this.yt.getDuration() - 5); },
        "next()":       d => {this.yt.nextVideo()},
        "prev()":       d => {this.yt.previousVideo()},
            // SB broadcasts a list with players in the current scene.  Play if your name is in the list or pause
        allplayersplaypause: d => {
            if ( d.players.includes(this.myObsSourceName) )// IDEA && !thisIgnorePlayPause
                this.play();
            else
                this.pause();
        },

        volup:      d => {let v = this.yt.getVolume(); this.yt.setVolume(v + 5); clog(v);},
        voldown:    d => {let v = this.yt.getVolume(); this.yt.setVolume(v - 5); clog(v);},
        mutetoggle: d => this.yt.isMuted() ? this.yt.unMute() : this.yt.mute(),
        mute:       d => this.yt.mute(),
        unmute:     d => this.yt.unMute(),

        adddefaults:d => this.add_video_items(playlistDefaults),// REDUNDANT

        bigWidescreen:  d => this.yt.setSize(640, 360),
        big43:          d => this.yt.setSize(640, 480),
        smallWidescreen:d => this.yt.setSize(320, 180),
        small43:        d => this.yt.setSize(320, 240),
        title:          d => clog(this.yt.videoTitle),
        qualityget:     d => clog(this.yt.getAvailableQualityLevels()),

        sendmessage:    d => { clog("Sending:" + d.data); this.send(d.data); },

        clearvideos:d => { this.playlist = []; this.playlistPointer = 0; this.playlistMap.clear(); this.playlistNextCount = 0; this.dirty_announce("clearedplaylist"); },

        getvideoinfo:   d => {clog( this.yt.getVideoData() ); },


        consolelog: d => {clog( window[d.colour](d.message) );},

        connect:    d => ytpc.socketty.connect(),
        disconnect: d => ytpc.socketty.close(),
        f: d => {},
            // true = delete permanently, sends flag back to streamerbot
        //deletecurrentvideoperm: d => this.delete_current(true),
        //deletecurrentvideotemp: d => this.delete_current(false),

        deletefromplayer: d => { if (this.delete_vids(d.videoids) > 0) this.dirty_announce("deletedvids"); },

        nowandnext: d => this.now_and_next(d.data.howMany),
/*
        playlistcount: e => {
            clog("sending count:", this.playlist,length);
            this.send_json(this.get_reqpack({action: "playlistcount", count: this.playlist.length, to: this.returnto}));
        },*/

        identify: d => this.identify(), // SB broadcasts "identify" using null to go to all
        playersidentify: d => this.identify(), // SB broadcasts to all but only players have the action

        namechange: d => {this.myName = d.name; document.title = `(${d.name}) YT Player`},
        yourinfo: d => {this.myName = d.name; this.mySocketId = d.socketid; document.title = `(${d.name}) YT Player`},
    }

    // HAS A ytplayer
    // HAS A socket systems

    constructor() {
        super();    // initialise daddy
        clog("I am a YTController constructor.");
        this.add_socket_events(this.YTPSocketEvents);

        this.waitPlayerReady();
    }
        // create a reference to the players player when ready
    async waitPlayerReady() {
        this.add_player_pre_ready_events(); // NOT player events
        await this.ytPlayer.ytPlayerReady();
        this.add_player_ready_events();
        clog("Player ready, adding events.", this.ytPlayer.player);
        this.yt = this.ytPlayer.player;
    }

      // can only be called after ready()

    add_player_ready_events() {
        for (const pair of this.playerPostReadyEvents) {
            this.ytPlayer.player.addEventListener(pair[0], pair[1]);
        }
    }
        // can be called before ready()
    add_player_pre_ready_events() {
        for (const pair of this.playerPreReadyEvents) {
            this.ytPlayer.addEventListener(pair[0], pair[1]);
        }
    }

        /**
         * splice out the current video and any nexts, put curr and nexts back to the start and reset the poi
         * Shuffles the playlist fully or leaves nexts
         * @param {bool} all true shuffles everything
         */

    shuffle(all = false) {//clog("Shuffly shuff shuff happan");
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

        // play the song by the video id sent

    play_song(id) {
        let time = 0;
        let newPlPos = this.playlist.indexOf(id);

        // got to deal with playnexts.
        if (newPlPos >= 0) {
            let fwdOffset = newPlPos - this.playlistPointer;
            //console.log("OLD POS, NEW POS, DIFFERENCE:", this.playlistPointer, newPlPos, fwdOffset);
            this.playlistPointer = newPlPos;
            // if you jump past queued zero it, jump back CLEARS queue - DEBUG: this is not ideal.
            if (fwdOffset > 0)
            {
                this.playlistNextCount -= fwdOffset;
                if (this.playlistNextCount < 0) this.playlistNextCount = 0;
            } else {
                this.playlistNextCount = 0
            }
        }

        time = ytpc.playlistMap.get(id)?.starttime;

        if (!this.isPaused) return this.load_video(id, time);

        this.cue_video(id, time);
    }

        // return pos
    next() {
        this.lastDirection = DirFwd;
        if (this.playlist.length === 0) {
            //this.playlistPointer = 0;
            return false;
        }

        //this.playlistPointer = ++this.playlistPointer >= this.playlist.length ? 0 : this.playlistPointer;
        this.playlistPointer = ++this.playlistPointer % this.playlist.length;

        if (this.playlistNextCount > 0) this.playlistNextCount--;

        let id = this.playlist[this.playlistPointer];
        let time = ytpc.playlistMap.get(id)?.starttime;

        if (!this.isPaused)
            return this.load_video(id, time);

        return this.cue_video(id, time);
    }

    /*
    */
    prev() {
        this.lastDirection = DirBack;

        let len = this.playlist.length;

        if (len === 0) {
            //this.playlistPointer = 0;
            return false;
        }

        if (this.playlistPointer <= 0) {
            this.playlistPointer = len - 1 ;
        } else {
            this.playlistPointer--;
        }

        this.playlistPointer = this.playlistPointer % this.playlist.length;

            // make the current video a forced next
        if ( this.playlistNextCount) {
            this.playlistNextCount++;
            if ( this.playlistNextCount >= len )
            this.playlistNextCount = len - 1;
        }

        let id = this.playlist[this.playlistPointer];
        let time = ytpc.playlistMap.get(id)?.starttime;

        if (!this.isPaused)
            return this.load_video(id, time);

        return this.cue_video(id, time);
    }
        // alias
    previous() {
        return this.prev();
    }



        /**
         * "playlistadd" can receive
         *   1 entry from chat with chatadded: true
         *   1 entry from observer, data is object vidinfo
         *   array of entries from observer, data is array
         */

    playlist_add_handler(d) {
        if (d.chatadded === true && this.chatadds === false) return;
        // result has {addCount, relative, position, success}
        let result = this.add_video_items(d.data, d.addnext ? true : false);

        console.log("RESULT OF THE CHAT ADDED THING: ", result);
// chatadded or d.data === object = single, d.data == array = multiples
        if (d.chatadded) {
            // ytparams.nan can be used to mute this.
            if (ytparams.nan === true)
                this.send_json({action: "chataddresult", result, data: d.data, player: this.get_player_info()});
            return;
        }
            // observer has sent 1 or many
        if (d.data instanceof Array) { // array of entries
            let r = {addCount: result.addCount, totalEntries: d.data.length}
            this.send_json({
                action: "relay", to: this.returnto,
                data: {action: "entriestoplayerresult", result: r, player: this.get_player_info()}
            });
        } else {
            this.send_json({
                action: "relay", to: this.returnto,
                data: {action: "playeraddresult", result, player: this.get_player_info(), data: d.data}
            });
        }

        return result.addCount;
    }

/*
https://youtube.googleapis.com/youtube/v3/videos?part=snippet&key=AIzaSyBRPuveJXC18b_bf6PIIUYFrkRwlGjK6P4&fields=items.snippet.description,items.snippet.title,items.snippet.channelTitle&id=Ks-_Mh1QhMc
https://youtube.googleapis.com/youtube/v3/videos?part=snippet&key=AIzaSyBRPuveJXC18b_bf6PIIUYFrkRwlGjK6P4&fields=items.snippet.description,items.snippet.title,items.snippet.channelTitle&id=%videoid%

    @returns {addCount, position, relative, success}
*/
    add_video_items(videoItem, isNext = false) {
        //clog("ADD next:", isNext);
            // isNext should be carried, yeah?
        let res = {};
        let addCount = 0;

        let add_entry_switch = videoItem => {
            switch(true) {
                case videoItem instanceof Object:   // vidInfo obj
                    return this.#add_entry(videoItem, isNext);
                    break;

                case typeof videoItem === "string": // assume video id
                    if (videoItem.length === 0) return;
                    return this.#add_entry({videoid: videoItem}, isNext);
                    break;

                default:
                    console.error("add_video_items() to player list unknown type: ", videoItem, typeof videoItem);
                    return {success: false, error: "Parameter passed unknown type, neither object nor string.", position: -1, relative: -1};
                    break;
            }
        }
            // if array pass each individually
        if (videoItem instanceof Array) {
            for (const entry of videoItem) {
                res = add_entry_switch(entry);
                if (res.success) addCount++;
                //console.log(res);
            }
        } else {
            res = add_entry_switch(videoItem);
            if (res.success) addCount++;
            //console.log(res);
        }

        res.addCount = addCount;

        return res;
    }

        // in reality I think using a "front splice" method where nexts are put at the start
        // is 'better' as less splices will happen toward the front of the array

        /**
         * Adds a SINGLE video entry to the playlist
         * @param {*} entry
         * @param {*} next
         * @returns {success: bool, position: absolute, relative: to playlistpointer, error: only on fail}
         */

    #add_entry(entry, next = false) {
        let {videoid, title="Unknown", channel = "Unknown", adder = "Unknown adder", starttime = 0} = entry;

        let posnA = this.playlist.indexOf(videoid);
            // already present, return relative position
        if (posnA >= 0) {
            let relative = posnA - this.playlistPointer;    // (posn - ptr + len) % len if you want to be 'like that' and avoid the if
            if (relative < 0) relative += this.playlist.length;
            return {success: false, error: "Already in playlist", position: posnA, relative};
        }

        this.playlistMap.set(videoid, {title, adder, channel, starttime: parseInt(starttime), "number": this.playlistMapCounter++});

        let len = this.playlist.length;

        if (len === 0) {
            this.playlist.push(videoid);
            return {success: true, position: 0, relative: 1};// yes 1 as unlisted video may be playing
        }

        if (next) {// this might go wrong if prevved to rear of list
            let posn = this.playlistPointer + this.playlistNextCount + 1;
            this.playlist.splice(posn, 0, videoid);
            this.playlistNextCount++;
            let relative = posn - this.playlistPointer;
            if (relative < 0) relative += this.playlist.length;
            return {success: true, position: posn, relative};
        }
        else
        {    // random position, let's do it the "cool" way without a front splice
            let avail = len - this.playlistNextCount;
            let posn = 1 + this.playlistPointer + this.playlistNextCount + Math.floor(Math.random() * avail);
                // ^ +1 so you never splice into position zero, instead use the end; functionally equivalent
            if (posn > len) {
                posn = posn - len;
                this.playlistPointer++; // it must move forward, wouldn't get that with a front splice
            }

            this.playlist.splice(posn, 0, videoid);
            let relative = posn - this.playlistPointer;
            if (relative < 0) relative += this.playlist.length;
            return {success: true, position: posn, relative};
        }

        // unreachable return {success: false, error: "Unknown", position: -1, relative: -1};
    }

        // PLAYING, CUED, PAUSED, BUFFERING, UNSTARTED

    state_change_hander(e) {
            // DEBUG TEST
        switch (e.data) {
            case YT.PlayerState.ENDED:
                this.next();    // a now playing state needs to be sent up.  Could do on Playing
                break;

            case YT.PlayerState.PLAYING:    // sent after pause and stop
            case YT.PlayerState.CUED:
                //clog(this.ytPlayer.states[e.data], e.target.getVideoData());
                let vd = e.target.getVideoData();
                this.send_json({action: "currsongid", id: vd.video_id, title: vd.title, playlistpointer: this.playlistPointer,
                    playstate: this.ytPlayer.states[e.data], playerinfo: this.get_player_info()});
                break;

            default:    // paused, buffering, unstarted
                //clog("state", this.ytPlayer.states[e.data], e.target.getVideoData());
                break;
        }

    }

// debug console filter
// -url:https://play.google.com/ -url:chrome-extension://mnjggcdmjocbbbhaepdhchncahnbgone/js/content.js -url:https://www.youtube.com
// or use current context only
// handler for socket messages and string actions
//*

    message_handler(e) {
        let data = null, action, json = "not json";

        this.returnto = null;

        if (typeof e === "string") {
            action = e;
        } else {
            action = e.data;
        }
            // first letter { ?
        if (action[0] === '{')
        try {
            data = JSON.parse(action);
            action = data.action;
                // WARNING: DANGEROUS ASSUMPTION that from should be return to'd
            if (data.returnto)
                this.returnto = data.returnto;  // UID or "observers", "players" etc
            else if (data.from)
                this.returnto = data.from.UID;  // from is a YTSock UID, socket, name
        } catch (error) {
            clog("ERROR: Local message_handler:", e);
        }

        if (this.actions[action]) {
            this.actions[action](data);
        }
            // don't log everything
        if (["consolelog", "pong"].includes(action)) {
            return;
        }

        clog("Received action:", action, "JSON?", data);
            //this.send("Thanks, partner!")
    }

        //

    yt_player_play_error_handler(e) {
        clog(`playlist error [${e.data}] for id`, this.playlistCurrentId);
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

            this.send_json({action:"videoplaybackerror",
                videoid: this.playlistCurrentId,
                errorcode: e.data,
                title: v.title,
                adder: v.adder,
                playerinfo: this.get_player_info(),
            });
        }
            // zero length checked there
        if (this.lastDirection === DirFwd)
            this.next();
        else
            this.prev();
    }
        // both of these check they're connected


    now_and_next(howMany) {
        if (!ytparams.nan) {
            clog("I don't now and next, darling for I am " + this.myName);
            return;
        }

        clog("THEY WANT THIS MANY NOW AND NEXTS:", howMany);

        if (howMany > this.playlist.length) howMany = this.playlist.length;

            // ok, what if we wrap around? then need the slice before

        let start = this.playlistPointer;
        let end = this.playlistPointer + howMany;
        let ids = this.playlist.slice( this.playlistPointer, end);
            // was end > size of list and is there enough at the start?

        clog(`Start: ${start} end: ${end} so initially have`, ids);

        if (end > this.playlist.length) {
            end = end % this.playlist.length;
//clog("END LONG modding: ", end);
            //if (end > start) end = start;
//clog(`They also need 0 to ${end} added`, this.playlist.slice(0, end));
            ids = [...ids, ...this.playlist.slice(0, end)];
        }

        clog("THEY GET", ids);

        let titles = new Array(ids.length);
        let adders = new Array(ids.length);

        for (let index = 0; index < ids.length; index++) {
            const id = ids[index];
            titles[index] = this.playlistMap.has(id) ? this.playlistMap.get(id).title : "unknown";
            adders[index] = this.playlistMap.has(id) ? this.playlistMap.get(id).adder : "unknown";
        }

        let obj = { action: "nowandnext", count: ids.length, titles,
            playerinfo: this.get_player_info(),
        };

        if (howMany == 1) {
            obj = { action: "currsonginfo",
                title: titles[0],
                adder: adders[0],
                duration: this.yt.getDuration(),
                time: this.yt.getCurrentTime(),
                queueposition: this.playlistPointer,
                playerinfo: this.get_player_info(),
                to: this.returnto
            };
        }

        this.send_json(obj);
    }

        // delete current video and report its id back to the master

/*     delete_current(perm = false) {
        let videoid = this.playlistCurrentId;
            // filter the array or splice?  Filtering 'safer'

        if (this.playlist[this.playlistPointer] === videoid) {
            let gone = this.playlist.splice( this.playlistPointer, 1 );
            if (gone.length) {
                let vidinfo = this.playlistMap.get(gone[0]);

                this.playlistMap.delete(gone[0]);
                this.playlistPointer--;// these really should be replaced with play_song(this.playlist[this.playlistPointer])
                this.next();
                    // destructure vidinfo into the returning object
                let pack = {action: "videodeleted", id: gone[0], permanent: perm, ...vidinfo, playerinfo: this.get_player_info()};
                this.send_json(pack);
            }
        }

        // this.next();
    } */

        /**
         * param vids = array of video ids
         * returns number of deletes
         */

    delete_vids(vids) {
        let wasCurr = 0;// a count where deleted video would be the one playing
        let deletes = 0;
        for (let v of vids) {
            let pos = this.delete(v);   // has spliced out
            if (pos >= 0) {// -1 if video not found
                    // is the position within the number of playnexts, if so reduce
                deletes++;
                let delPosDiff = pos - this.playlistPointer;

                if (delPosDiff == 0) {
                    wasCurr++;
                } else { // is it in the group of nexts?
                    if (delPosDiff > 0 && delPosDiff <= this.playlistNextCount)
                        this.playlistNextCount--;
                    else
                        if (pos < this.playlistPointer) this.playlistPointer--;
                }
            }
        }

        if (wasCurr) {
            this.playlistNextCount -= --wasCurr;// lower all but one when curr vids as next reduces by 1
            this.playlistPointer--;
            this.next();
        }

//        this.send_json({uid: this.myUID, name: this.myName, to: this.returnto, action:"playerdeletecount", count: deletes});
        this.send_json({action: "relay", to: this.returnto, data: {action:"playerdeletecount", count: deletes, player: this.get_player_info()}});

        this.send_json({action:"toast", uid: this.uid, to: this.returnto,
            message: `<b>${this.myName}</b> says\n${deletes} videos I have deleted, father.`});

        return deletes;
    }

        // single id, url, playlist position

    delete(videoid) {
        let idx = this.playlist.indexOf(videoid);

        if (idx >= 0) {
            this.playlist.splice(idx, 1);
            this.playlistMap.delete(videoid);
        }
            // not yet done
        return idx;
    }


    load_video(id, time = 0) {
        this.playlistCurrentId = id;
        this.yt.loadVideoById(id, time);
    }

    cue_video(id, time) {
        this.playlistCurrentId = id;
        this.yt.cueVideoById(id, time);
    }

    play() {
        this.yt.playVideo();
        this.isPaused = false;
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

        // load the entire playlist

    got_full_playlist(d) {
        // if (this.playlistLoaded) return;
        this.playlistLoaded = true;
        this.playlist = [];
        this.playlistMap.clear();
        this.playlistNextCount = 0;
        this.playlistPointer = d.playlistpos ?? 0;

        this.add_video_items(d.data, true);//d.addnext);    // this addnext thing needs to change
            // CLUDGE UPDATE
        this.playlistNextCount=0;       // addnext adds in order

            // shuffle has a force on/off for updating playlist order
        if (d.forceshuffle !== undefined) {
            if (d.forceshuffle === true) this.shuffle(true);
        }
        else
        if (ytparams.shuffle === true || (ytparams.shuffle === null && d.shuffle === true)) {
            this.shuffle(true);
        }

            // leave current video playing if same as received
        if (this.playlist[this.playlistPointer] !== this.playlistCurrentId) {
            this.play_song(this.playlist[this.playlistPointer]);
        }
    }

    send_whole_playlist(request) {
        let pack = {
            action: "allplaylistdata",
            playerinfo: this.get_player_info(),
            to: this.returnto ?? "observers",
            data: {
                playlistindex: this.playlistPointer,
                playlist: this.playlist,
                playlistmap: Object.fromEntries(this.playlistMap),
            }
        }
// clog("SENDING BACK", pack);
        this.send_json(pack);
    }

        // observers can decide whether to request an updated playlist

    dirty_announce(reason = "unknown") {
        let pack = {
            action: "relay",
            to: "observers",
            data: {
                action: "playlistdirty",
                reason,
                player: this.get_player_info()
            }
        }
        this.send_json(pack);
    }
        // player info could be added at the streamerbot stage from the players dictionary
        // if done on every message that needs relaying to an observer that'll remove a stage
        // objs passed by ref so can just run as add_reqpack(obj) or console.log(add_reqpack(obj))
        // [long time later.... ummm, what?]

    get_player_info(o) { //
        return {uid: this.myUID, name: this.myName, socketid: this.mySocketId};
    }

        // lets streamerbot know what we are

    identify() {
        let me = this.get_player_info();
        me.type = "player";
        me.action = "identify";
        this.send_json(me);
    }
}


export default YTController;

