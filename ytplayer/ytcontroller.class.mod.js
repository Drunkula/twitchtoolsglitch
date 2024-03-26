/*
    JAVASCRIPT part
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

    reqpack = null;    // some requests will have an observer's request details copied here for easy return
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
        play:       d => this.play(),
        playvideo:  d => this.load_video(d.videoid, d.starttime),
        playsong:   d => this.play_song(d.id),  // sent by playlist double click
        pause:      d => this.pause(),
        stop:       d => this.yt.stopVideo(),
        resume:     d => this.yt.playVideo(),
        restart:    d => { this.yt.seekTo(0); this.play();},
        fwd:        d => {clog("=========== fwd", d); this.yt.seekTo( this.yt.getCurrentTime() + d.data);},
        rwd:        d => {this.yt.seekTo( this.yt.getCurrentTime() - d.data);},
        almostend:  d => { this.yt.seekTo( this.yt.getDuration() - 5); },
        "next()":       d => {this.yt.nextVideo()},
        "prev()":       d => {this.yt.previousVideo()},

        allplayersplaypause: d => {
            console.log("GOT THE MESSSAGE TO DO THE THING!!!!!!!!!!!!");
            console.log("My obs source name : " + this.myObsSourceName);

            if ( d.players.includes(this.myObsSourceName) )
                this.play();
            else
                this.pause();
        },

        volup:      d => {let v = this.yt.getVolume(); this.yt.setVolume(v + 5); clog(v);},
        voldown:    d => {let v = this.yt.getVolume(); this.yt.setVolume(v - 5); clog(v);},
        mutetoggle: d => this.yt.isMuted() ? this.yt.unMute() : this.yt.mute(),
        mute:       d => this.yt.mute(),
        unmute:     d => this.yt.unMute(),

        adddefaults:d => this.add(playlistDefaults),

        big:            d => this.yt.setSize(640, 360),
        small:          d => this.yt.setSize(320, 180),
        title:          d => clog(this.yt.videoTitle),
        qualityget:     d => clog(this.yt.getAvailableQualityLevels()),

        sendmessage:    d => { clog("Sending:" + d.data); this.send(d.data); },
            // needs to check if it's chat added
        playlistadd:    d => { this.add(d.data, d.addnext ? true : false); },
            // received entire thing
        fullplaylist:   d => this.got_full_playlist(d),

        loadplaylist:   d => this.send_json({action:"loadplaylist", name: ytparams.playlist}),

        clearvideos:d => { this.playlist = []; this.playlistPointer = 0; this.playlistMap.clear(); this.playlistNextCount = 0;},
           // SENDS our playlist up, not received
        getplayerplaylist: e => this.send_whole_playlist(e),


        shuffle:        d => { this.shuffle(false); },
        shuffleall:     d => { this.shuffle(true); },
        getvideoinfo:   d => {clog( this.yt.getVideoData() ); },

        next:           d => { this.next(); },
        prev:           d => { this.prev(); },

        consolelog: d => {clog( window[d.colour](d.message) );},

        connect:    d => ytpc.socketty.connect(),
        disconnect: d => ytpc.socketty.close(),
        f: d => {},
            // true = delete permanently, sends flag back to streamerbot
        deletecurrentvideoperm: d => this.delete_current(true),
        deletecurrentvideotemp: d => this.delete_current(false),
        deletefromplayer: d => this.delete_vids(d.videoids),

        nowandnext: d => this.now_and_next(d.data.howMany),

        playlistcount: e => {
            clog("sending count:", this.playlist,length);
            this.send_json(this.get_reqpack({action: "playlistcount", count: this.playlist.length, to: this.returnto}));
        },

        identify: d => this.identify(), // SB broadcasts "identify" using null to go to all
        playersidentify: d => this.identify(), // SB broadcasts to all but only players have the action

        namechange: d => {this.myName = d.name; document.title = `(${d.name}) YT Player`},
        yourinfo: d => {this.myName = d.name; this.mySocketId = d.socketid; document.title = `(${d.name}) YT Player`},
    }

    // CPH.RunActionById("1a8f5a37-5107-420c-9dd5-4f863ce6ffd1", true);
    // HAS A ytplayer
    // HAS A socket systems

    constructor() {
        super();    // initialise daddy
        clog("I am a YTController constructor.");
        //this.insert_ytplayer_api();   // done in player contructor
        //this.add_socket_events();
        this.add_socket_events(this.YTPSocketEvents);

        this.waitPlayerReady();
    }
        // create a reference to the players player when ready
    async waitPlayerReady() {
        this.add_player_pre_ready_events(); // NOT player events
        await this.ytPlayer.playerReady();
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

        // splice out the current video and any nexts
        // shuffle everything
        // put curr and nexts back to the start and reset the pointer
    shuffle(all = false) {clog("Shuffly shuff shuff happan");
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
            console.log("OLD POS, NEW POS, DIFFERENCE:", this.playlistPointer, newPlPos, fwdOffset);
            this.playlistPointer = newPlPos;
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

/*
https://youtube.googleapis.com/youtube/v3/videos?part=snippet&key=AIzaSyBRPuveJXC18b_bf6PIIUYFrkRwlGjK6P4&fields=items.snippet.description,items.snippet.title,items.snippet.channelTitle&id=Ks-_Mh1QhMc
https://youtube.googleapis.com/youtube/v3/videos?part=snippet&key=AIzaSyBRPuveJXC18b_bf6PIIUYFrkRwlGjK6P4&fields=items.snippet.description,items.snippet.title,items.snippet.channelTitle&id=%videoid%

    videoItem: a singly id, a single {videoid, tltle, added}, this.playlistQueued of single ids, this.playlistQueued of {}
*/
    add(videoItem, isNext = false) {
        clog("ADD next:", isNext);
            // isNext should be carried, yeah?
        let add_entry_switch = videoItem => {
            switch(true) {
                case videoItem instanceof Object:   // are we allowing a map like object | //clog("-----------adding object"); |  //this.#add_entry(videoItem.videoid, videoItem.title, videoItem.adder, isNext);
                   this.#add_entry(videoItem, isNext);
                    break;

                case typeof videoItem === "string": // assume video id | //clog("----------adding string", videoItem);
                    if (videoItem.length === 0) return;
                    this.#add_entry({videoid: videoItem}, isNext);
                    break;

                default:
                    console.error("add() to player list unknown type: ", videoItem, typeof videoItem);
                    return;
                    break;
            }
        }

        if (videoItem instanceof Array) {
            for (const entry of videoItem) {
                add_entry_switch(entry, isNext);
            }
        } else {
            add_entry_switch(videoItem, isNext);
        }

        // clog("QUEUED AFTER:", this.playlistQueued);
        //console.clear();
        //clog("QUEUED AFTER:", this.playlistMap);

    }

        // in reality I think using a "front splice" method where nexts are put at the start
        // is 'better' as less splices will happen toward the front of the array

    #add_entry(entry, next = false) {
        let {videoid, title="Unknown", channel = "Unknown", adder = "Unknown adder", starttime = 0} = entry;

        //if (this.playlistMap.has(videoid))
        if (this.playlist.includes(videoid))
            return false;    // may bump this if addnext

        this.playlistMap.set(videoid, {title, adder, channel, starttime: parseInt(starttime), "number": this.playlistMapCounter++});

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
                this.returnto = data.returnto;
            else if (data.from)
                this.returnto = data.from.UID;
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
        reqpack: this.get_reqpack() };

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

    delete_current(perm = false) {
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
    }

        // vids = array
        // HEY HEY HEY HEY HEY HEY HEY HEY HEY HEY  Make this account for nexts
    delete_vids(vids) {
        let wasCurr = 0;
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

        // delete if it's in the next
        //console.log("DELETES", deletes, "was curr:", wasCurr);
        this.send_json({uid: this.myUID, name: this.myName, to: this.returnto, action:"playerdeletecount", count: deletes});
        this.send_json({uid: this.uid, to: this.returnto, action:"toast", message: `<b>${this.myName}</b> says\n${deletes} videoes I have deleted, father.`});
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

        this.add(d.data, true);//d.addnext);    // this addnext thing needs to change
            // CLUDGE UPDATE
        this.playlistNextCount=0;       // addnext adds in order

            // shuffle has a force on/off for updating playlist order
        if (d.forceshuffle !== undefined) {
            if (d.forceshuffle === true) this.shuffle(true);
        }
        else
        if (ytparams.shuffle === true || (ytparams.shuffle === null && d.shuffle === true)) {
            console.log("I AM SHUFFLING!");
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
            data: {
                playlistindex: this.playlistPointer,
                playlist: this.playlist,
                playlistmap: Object.fromEntries(this.playlistMap),
            },
            to: this.returnto ?? "observers"
        }
        this.get_reqpack(pack);
clog("SENDING BACK", pack);
        this.send_json(pack);
    }

        // copies back request pack from incoming json if present

    get_reqpack(o) {
        if (o != undefined) { o.reqpack = this.reqpack; return o;}
        else return this.reqpack;
    }

        // player info could be added at the streamerbot stage from the players dictionary
        // if done on every message that needs relaying to an observer that'll remove a stage
        // objs passed by ref so can just run as add_reqpack(obj) or console.log(add_reqpack(obj))

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

