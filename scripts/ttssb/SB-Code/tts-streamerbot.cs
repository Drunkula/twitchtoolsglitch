using System;
using System.IO;    // File. load exists write
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System.Text.RegularExpressions;

/**
    c# tts version for Streamerbot
*/


public class CPHInline
{
    const string CONFIG_FILENAME = "AAAAAAAAAA-DATA-FILE-FROM-STREAMERBOT.json.txt";
    const string SOCKET_NAME = "TTS";
	int wssIndex;
    bool isCmd, isSocketMsg, isConnect, isDisconnect, isTwitchMessage, isPresentViewers, isTest;
    string socketId;

    bool isSpeaking = false;    // messages will be queued if we're still speaking.

    int identityCounter = 1;    // identity counter for connected browsers

    string lastUserid = "";
    string lastMsgId = "";
    DateTime lastMsgTime = DateTime.Now;

    TTSSettings settings = new TTSSettings();
    Dictionary<string, string> ignored = new Dictionary<string, string>();// {"userid":"name"};
    Dictionary<string, string> allowed = new Dictionary<string, string>();// {"userid":"name"};
    Dictionary<string, Nickname> nicknames = new Dictionary<string, Nickname>();
    Dictionary<string, string> usersPresent = new Dictionary<string, string>();
    Dictionary<string, Voice> customVoices = new Dictionary<string, Voice>();

    Queue<Message>msgQ = new Queue<Message>();

        // list of browser connections.  They'll have a string identity, a socket session id
    // sessionId => assignedId
    Dictionary<string, string> connectedBrowserIds = new Dictionary<string, string>();

    // connections and voices they handle sessionid => voiceURI lists
    Dictionary<string, List<string>> voiceHandlers = new Dictionary<string, List<string>>();

    // actually let's store the capabilities for all connected browsers
    // browserId => List<string>
    public void debug_dump() {
        var dump = new Dictionary<string, object>();

        dump.Add("action", "debugdump");
        dump.Add("connection count", this.connectedBrowserIds.Count);
        dump.Add("connections", this.connectedBrowserIds);
        dump.Add("isspeaking", this.isSpeaking);
        dump.Add("messagequeue", this.msgQ);
        //dump.Add("", this.);

        // send_action("debuginfo", dump);
        send_json(dump);
    }

    public bool Execute()
	{
		try {
            //retrieve_all_users();
            // message, message stripped, emoteCount, emotes (array), isAction, user (caps), userId, isSubscribed, isModerator, isVip
            isTwitchMessage = args["__source"].ToString() == "TwitchChatMessage";
                //!ignore.Contains(args["userName"].ToString());
            isSocketMsg  = args["__source"].ToString() == "WebsocketCustomServerMessage";
            isConnect    = args["__source"].ToString() == "WebsocketCustomServerOpen";
            isDisconnect = args["__source"].ToString() == "WebsocketCustomServerClose";
            isPresentViewers = args["__source"].ToString() == "TwitchPresentViewers";
            isTest = args["__source"].ToString() == "Test";

            // isTimeout = args["__source"].ToString() == "TwitchUserTimedOut"
            // isMsgDeleted = args["__source"].ToString() == "TwitchChatMessageDeleted" has targetMessageId userId user userName
            // "TwitchUserBanned" user userName userId

            if (isTwitchMessage) {
                twitch_msg_handler(args);
            }
            if (isSocketMsg) {
                socket_msg_handler(args);
            }
            if (isDisconnect) {
                disconnect_handler();
            }
            if (isPresentViewers) {
                if ( update_present_viewers() ) {
                    save_all_configs();
                    send_users();
                    send_json(new { action = "presentviewers", users = this.usersPresent });
                }
            }
            if (isTest) {
                if (args.ContainsKey("loadfromfile")) {load_all_configs(true); send_all_settings(); }
                if (args.ContainsKey("savetofile")) save_all_configs(true);
            }

        } catch (Exception e) {
            console_log(e.ToString());
            send_json(new { action = "exceptionargs", args });
        }

		// your main code goes here
		return true;
	}



    public void socket_msg_handler(Dictionary<string, object> args) {
        socketId = args["sessionId"].ToString(); // id of the calling socket

        string msg; // global usage
        JToken jsonData = null;

        string data = (string) args["data"];
        string action = data;
                                //console_log("data: " + data, "y");
            // is the data json?
        if (data[0] == '{') {
            jsonData = JToken.Parse(data);
                //console_log("json action:" + js["action"]);
                // TO can be used to override where the response is sent
                // it's the sender otherwise.  "observers" "players" and "any" are options
            /*
            if (js["to"] != null) {
                string to = process_to((string)js["to"]);
                if (to == null) {
                    console_log($"ERROR routing to [{js["to"]}] as no matching socket exists or 'observers', 'players', 'all'");
                    //return;
                } else {
                    socketId = to;
                }
            } */
            action = (string)jsonData["action"]; // it may be null but that'll mean nothing happens
        }

            // Where the MAGIC happens

        switch(action) {
            case "utteranceended":
                console_log("SB: Your utterance ended. GOT IT");
// disconnect may have to send a message end
                send_action("speechfinished",  jsonData["data"] );
                this.isSpeaking = false;
                this.queue_process();
                break;

            case "utteranceerror":
                send_action("SB: UTTERANCE ERROR RECEIVED",  jsonData["data"] );
                send_action("speechfinished",  jsonData["data"] );
                // process queue()
                this.isSpeaking = false;
                this.queue_process();
                break;

                     // the browser has started speaking
            case "speaking":
                //this.isSpeaking = true;
                send_action("currentlyspeaking", jsonData["data"]);
                break;


            case "capabilities":
                capabilities_handler(jsonData);

                // FOR NOW
                speech_cancel();
                this.queue_process();
                break;

            case "closing":
                console_log("Somebody's socket is closing : ", "y");

                disconnect_handler(false);  // actual close event, false = not custom closing message
                // FOR NOW
                speech_cancel();
                this.queue_process();

                break;

            case "unloading":
                // FOR NOW
                disconnect_handler(true);   // true means it was a custom message
                //speech_cancel();
                //this.queue_process();
                break;


            case "userunallow":
                alway_allow_handler(jsonData, false); // false = remove from always allowed
                break;

            case "userallow":
                alway_allow_handler(jsonData, true);
                break;

            case "userignore":
                ignore_handler(jsonData, true);
                break;

            case "userunignore":
                ignore_handler(jsonData, false);
                break;

            case "deleteuser":
                delete_user_handler(jsonData);
                break;

            case "deletemessage":
                send_json(new {action = "deletemessage", msgid = jsonData["data"]["msgid"]});
                break;

            case "settingschanged":
                update_settings_handler(jsonData);
                break;

            case "nicknamedelete":
                set_nickname_handler(jsonData, true);
                break;

            case "nicknameset":
                set_nickname_handler(jsonData);
                break;

            case "customvoiceset":
                set_custom_voice_handler(jsonData);
                break;

            case "customvoicedelete":
                set_custom_voice_handler(jsonData, true);
                break;

            case "nudge":   // the speech has got jammed, free it up
                queue_process();
                break;

            case "debugdump":
                debug_dump();
                break;

            case "debugsendcaps":
                send_action("sendcapabilities");
                break;

			case "ping":
				// dummy
				break;

            default:
                console_log("SB Got Socket Message: no handler for: '"+ action + "'");
                break;
        }
    }


    public void set_nickname_handler(JToken d, bool deleteNickname = false) {
        console_log("set nickname got: " + d);
        string userid =   d["userid"].ToString();
        string nickname = d["nickname"]?.ToString();

        if (nickname == "" || deleteNickname) {
            if (this.nicknames.ContainsKey(userid)) {
                this.nicknames.Remove(userid);
            }
        } else {
            string username = d["username"].ToString();
            this.nicknames[userid] = new Nickname{username = username, nickname = nickname};
        }

        save_all_configs();
        send_nicknames();
    }

   public void set_custom_voice_handler(JToken d, bool delete = false) {
        console_log("set custom voice got: " + d);

        string userid =   d["userid"].ToString();

        if (delete == false) {
            Voice voice = new Voice();
            voice.userid = userid;
            voice.username = d["username"].ToString();
            voice.uri = d["voiceURI"].ToString();
            voice.pitch = float.Parse( d["pitch"].ToString() );
            voice.rate = float.Parse( d["rate"].ToString() );

            this.customVoices[voice.userid] = voice;
        } else {
            this.customVoices.Remove(userid);
        }

        save_all_configs();
        send_voices();
    }

        /**
        *   Unignored users have to be readded to usersPresent
        */

    public void ignore_handler(JToken d, bool ignore) {
        string sendAction = ignore ? "ignoreuser" : "unignoreuser";

        send_action(sendAction, new {userid = d["data"]["userid"].ToString(), username = d["data"]["username"].ToString()});

        string userid = d["data"]["userid"].ToString();
        string username = d["data"]["username"].ToString();

        if (ignore) {
            ignored[userid] = username;
            usersPresent.Remove(userid);
            allowed.Remove(userid);
        } else {
            ignored.Remove(userid);
            usersPresent.Add(userid, username);
        }

        save_all_configs();
        send_ignored();
    }

    public void alway_allow_handler(JToken d, bool allow = true) {
        string userid = d["data"]["userid"].ToString();
        string username = d["data"]["username"].ToString();

        if (allow) {
            ignored.Remove(userid);
            allowed[userid] = username;
        } else {
            allowed.Remove(userid);
        }


        save_all_configs();
        send_ignored();
        send_allowed();
    }

    public void delete_user_handler(JToken d) {
        string userid = d["data"]["userid"].ToString();

        if (usersPresent.ContainsKey(userid)) {
            usersPresent.Remove(userid);
            //send_users();
            send_action("deleteuser", userid);
            save_all_configs();
        }
    }

    public void send_ignored() {
        send_action( "ignoredusers", this.ignored );
    }

    public void send_allowed() {
        send_action( "allowedusers", this.allowed );
    }

        // users currently present
    public void send_users() {
        send_json( new { action = "userlist", users = this.usersPresent });
    }

        // users currently present
    public void send_nicknames() {
        send_json( new { action = "nicknamelist", nicknames = this.nicknames });
    }

    public void send_settings() {
        send_action( "settings", this.settings);
    }

    public void send_voices() {
        send_action("customvoices", this.customVoices);
    }

        // return a string id for the browser
    public string get_new_id() {
        string id;

        do {
            id = "My-Id-Is-" + this.identityCounter++;
        //} while ( this.connectedBrowserIds.ContainsKey(id) );
        } while ( this.connectedBrowserIds.ContainsValue(id) );

        return id;
    }


    /**
    *   Browsers will send their old id and session id on connection - they may be blank if first contact

    so what the fuck I doing here?
    If you have the same id you keep it even if it's kidnapped then a recheck goes out

    want a map of
    voices[sessionid] => voices

    browsers:

        I come in with my id - if it's a previous id I get to keep it

    */

    public void capabilities_handler(JToken js)
    {
        string id = "", oldSessId = "", nowSessionId = "";

        id = js["id"]?.ToString() ?? "";
        oldSessId = js["sessionId"]?.ToString() ?? "";
        nowSessionId = args["sessionId"].ToString();

        console_log("Your previous id, session id was : " + id + ", "+ oldSessId);
            // if the id is unidentified or still in the browsers
        if (this.connectedBrowserIds.ContainsKey(oldSessId))
        {
            id = this.connectedBrowserIds[oldSessId];
            console_log("You were previously connected as: " + id);
        }
        else if (id == "" || this.connectedBrowserIds.ContainsValue(id))
        {
            id = get_new_id();
            console_log("You need a new id: " + id);
        }
            // remove their old voice handlers
        remove_browser(oldSessId);

            //  console_log("Sending ID info to " + id + " with sessid: " + nowSessionId);

        send_id_assign(id, nowSessionId);

        this.voiceHandlers[nowSessionId] = js["voices"].ToObject<List<string>>();
        this.connectedBrowserIds[nowSessionId] = id;
// CAREFUL of key errors in comments
            console_log("Confirmed: " + this.voiceHandlers[nowSessionId].Count + " first voice: " + this.voiceHandlers[nowSessionId][0], "y");
            console_log("Num of browsers:" + connectedBrowserIds.Count);

        send_all_settings();

        //var data = GetVarPerm<Dictionary<string, object>>("TTS_DATA");        //send_action("TTS_DATA:", data);

        // DEBUG: so exceptions can be seen as you can't in Init()
        //load_all_configs();

            // if a browser has the same id but not the session id then you've been duplicated so reidentify
        send_reidentify(id, nowSessionId);
    }

    public void send_id_assign(string id, string sessionId) {
        send_json(new { action = "idassign", id, sessionId }, sessionId);
    }

    public void send_all_settings() {
        send_settings();
        send_users();
        send_ignored();
        send_allowed();
        send_nicknames();
        send_voices();
    }

        // removes browser from our handlers on socket disconnec (also used on custom "closing" action)

    public void disconnect_handler(bool customMessage = false) {
        console_log("Disconnect: Removing entries for " + args["sessionId"].ToString(), "r");
        console_log("Was custom close message: " + (customMessage ? "YES" : "NO"));

        remove_browser( args["sessionId"].ToString() );

        // reassess the handled voices
    }

    public void remove_browser( string prevSessId ) {
        // browserConnections = sessionId => niceId
        // allVoiceHandlers = niceId => voices array
        this.connectedBrowserIds.Remove(prevSessId);
        this.voiceHandlers.Remove(prevSessId);

        return;
        string id = this.connectedBrowserIds.ContainsKey(prevSessId) ? this.connectedBrowserIds[prevSessId] : null;

        if (id != null) {
            this.voiceHandlers.Remove(id);
            this.connectedBrowserIds.Remove(prevSessId);
        }
    }

    public void remove_voice_handler( string sessId ) {
        this.voiceHandlers.Remove(sessId);
        // browserConnections = sessionId => niceId```
        // allVoiceHandlers = niceId => voices array
    }


        // notifies browsers should reidentify if they have matching id and session id
        // can happen when you duplicate a tab.  id and sessionId are stored in sessionStorage which get duplicated

    public void send_reidentify(string id, string sessionId) {
        if (sessionId == "") return;
        send_json(new {action = "reidentify", id, sessionId});
    }


    public void twitch_msg_handler(Dictionary<string, object> args) {
        if (!is_user_permitted())
            return;

        // user is cased, username lower
        string userid = args["userId"].ToString();
        string userLower = args["userName"].ToString();
        string userCaps = args["user"].ToString();
        string msgid = args["msgId"].ToString();

        if ( !usersPresent.ContainsKey( userid )  ) {
            usersPresent.Add(userid, userCaps);
            send_users();
            save_all_configs();
        }

        // well that was easy.  Byeee emotes
        string msg = settings.readEmotes ? args["message"].ToString() : args["messageStripped"].ToString();

            // if (is_user_blocked...)
        var message = new Message();

        message.msgid = msgid;
        message.msgDisplay = msg;
        message.userid = userid;
        message.userCaps = userCaps;
        message.userLower = userLower;

        message.msg = is_prefix_suffix_required() ? speech_add_prefix_suffix(msg, userid, userCaps) : msg;

            /// SPEAKING PART ///
            /// SPEAKING PART ///
            /// SPEAKING PART ///

        send_action("displaymsg", message);
        this.msgQ.Enqueue(message);

        update_last_message_time();

        if (!this.isSpeaking) {
            this.queue_process();
        }
        //send_action("speak", sayPack); // for now
    }

    public void queue_process() {
        this.isSpeaking = false;
        console_log("SPEAK ABOUT TO HAPPAN - num browsers: " + this.connectedBrowserIds.Count);
            // leave everything in the queue if nobody is there to hear
        if (is_browser_connected() == false) return;

        Message msg;
        Voice? voice;
        // if messages
        while (this.msgQ.Count > 0) {
            msg = this.msgQ.Dequeue();
                // they may have become ignored since being queued
            if ( this.ignored.ContainsKey(msg.userid) )
                continue;

            this.isSpeaking = true;
            this.lastMsgId = msg.msgid;
            string browserTarget = null;

            voice = get_user_voice(msg.userid);
            if (voice != null) {
                msg.pitch = voice.pitch;
                msg.rate = voice.rate;
                msg.voiceURI = voice.uri;

                browserTarget = get_voice_handler(voice.uri);
            }

            console_log("BROWSER TARGET:" + browserTarget);
                // need to find a browser if it's null
            send_action("speak", msg, browserTarget);
            break;
        }
    }

        /** session id for a browser that can handle the voice */
    public string get_voice_handler(string voiceURI) {

        foreach(var item in this.voiceHandlers) {
            if (item.Value.Contains(voiceURI))
                return item.Key;
        }

        return null;
    }
        /**  */
    public Voice? get_user_voice(string userid) {
        if ( this.customVoices.ContainsKey(userid) )
            return this.customVoices[userid];

        return null;
    }


        // nickname ? : name convert otherwise
    public string speech_add_prefix_suffix(string msg, string userid, string username) {

        string prefix = this.settings.sayBefore;
        string suffix = this.settings.sayAfter;

        if (this.nicknames.ContainsKey(userid)) {
            username = this.nicknames[userid].nickname;
        } else {
            username = name_convert(username);
        }

        if (prefix.Length > 0) {
            prefix = prefix.Replace("{user}", username) + " ";
        }

        if (suffix.Length > 0) {
            suffix = suffix.Replace("{user}", username);
        }

        return prefix + msg + " " + suffix;
    }
        // replaces underscores and breaks on capitals so JohnBoyJones_III -> John Boy Jones III
    public string name_convert(string username) {
        username = username.Replace('_', ' ');  // char
        string reggie = @"([a-z]+)([A-Z])";
        return Regex.Replace(username, reggie, "$1 $2");
    }

        // shortcut for nudgine the message queue

    public void speech_cancel() {
        this.send_action("speechfinished", new {msgid = this.lastMsgId, userid = this.lastUserid});
        this.isSpeaking = false;
        this.queue_process();
    }

        // if there's a don't repeat name interval

    public void update_last_message_time() {
        lastUserid = args["userId"].ToString();
        lastMsgTime = DateTime.Now;
    }

    public bool is_prefix_suffix_required() {
        if (settings.nameSuppressSeconds == 0) return true;

        if (args["userId"].ToString() != lastUserid) return true;

        double diffSeconds = (DateTime.Now - lastMsgTime).TotalSeconds;
        if (diffSeconds >= settings.nameSuppressSeconds) return true;

        return false;
    }

    public bool is_user_permitted() {
        string userid = args["userId"].ToString();

        switch (true) {	// block first
			case true when this.ignored.ContainsKey( userid ):
				return false;
			case true when this.settings.allowEveryone:
			case true when this.settings.allowMods && (bool)args["isModerator"]:
			case true when this.settings.allowVips && is_vip():  // I've had this not work
			case true when this.settings.allowSubs && (bool)args["isSubscribed"]:
			case true when this.allowed.ContainsKey( userid ):
			//case this.settings.allowNamed.includes(user.username):
			case true when args["broadcastUser"] == args["user"]:
				return true;
				break;

			default:
				return false;
				break;
        }
    }

    public bool is_vip() {
        if ( (bool)args["isVip"] ) return true;

        var badges = JsonConvert.DeserializeObject<List<Badge>>(JsonConvert.SerializeObject(args["badges"]));

        foreach (var badge in  badges) {
            if (badge.name == "vip") {
                return true;
            }
        }

        return false;
    }

    public bool is_browser_connected() {
        return this.connectedBrowserIds.Count > 0;
    }

    public void Init() {
        wssIndex = CPH.WebsocketCustomServerGetConnectionByName(SOCKET_NAME);
        console_log("WSS Index for the socket stored");
        load_all_configs();

        //send_action("sendcapabilities");
        // this might be easier
        CPH.WebsocketCustomServerCloseAllSessions(wssIndex);
    }

    public void Dispose() {
        // this think this is the problem
        //save_all_configs();
    }

        // handler for when settings are messaged

    public void update_settings_handler(JToken json) {
        try {
            var settingsNew = GetFromSerialized<TTSSettings>(json["data"]);

            this.settings = settingsNew;
            save_all_configs();
            send_settings();
        } catch (Exception e) {
            console_log(e.ToString());
        }
    }


        // saves all users ever to a persisted var

    public void save_all_configs(bool toFile = false) {
        CPH.SetGlobalVar("TTS_ALL_USERS", this.usersPresent, true);
        CPH.SetGlobalVar("TTS_IGNORED", this.ignored, true);

        var dataToSave = new Dictionary<string, object>();

        dataToSave.Add("usersPresent", this.usersPresent);
        dataToSave.Add("ignored", this.ignored);
        dataToSave.Add("allowed", this.allowed);
        dataToSave.Add("settings", this.settings);
        dataToSave.Add("nicknames", this.nicknames);
        dataToSave.Add("voices", this.customVoices);

        // CPH.SetGlobalVar("TTS_DATA", dataToSave, true); // too complex
        CPH.SetGlobalVar("TTS_DATA", JsonConvert.SerializeObject(dataToSave), true);

        if (toFile) {
            CPH.SetGlobalVar("TTS_DATA", JsonConvert.SerializeObject(dataToSave), true);
            string jsIndented   = JsonConvert.SerializeObject(dataToSave, Formatting.Indented);
            File.WriteAllText(CONFIG_FILENAME, jsIndented);
            console_log("************** Saved all configs to file ***************");
        }
    }

    public void load_all_configs(bool fromFile = false) {
        //this.usersPresent = CPH.GetGlobalVar<Dictionary<string, string>>("TTS_ALL_USERS", true) ?? this.usersPresent;
/*      var up = CPH.GetGlobalVar<Dictionary<string, string>>("TTS_ALL_USERS", true);
        if (up != null) {
		   this.usersPresent = up;
        }

        } */

        Dictionary<string, object> data;

        //*  Works.  Files are stored in the streamerbot directory
        if (fromFile) {
            string json = File.ReadAllText( CONFIG_FILENAME );
            console_log("* * * * SUCCESSFUL LOAD from FILE: " + CONFIG_FILENAME, "g");
            data = JsonConvert.DeserializeObject<Dictionary<string, object>>(json);
        } else
        {
            data = GetVarPerm<Dictionary<string, object>>("TTS_DATA");
        }

         // send_action("alldata stored:", data);

        if (data != null) {

            if (data.ContainsKey("ignored")) {
                this.ignored = JsonConvert.DeserializeObject<Dictionary<string, string>>(data["ignored"].ToString());
            }
            if (data.ContainsKey("allowed")) {
                this.allowed = JsonConvert.DeserializeObject<Dictionary<string, string>>(data["allowed"].ToString());
            }

            if (data.ContainsKey("usersPresent")) {
                this.usersPresent = GetFromSerialized<Dictionary<string, string>>(data["usersPresent"]);
            }

            if (data.ContainsKey("settings")) {
                this.settings = GetFromSerialized<TTSSettings>(data["settings"]);
            }

            if (data.ContainsKey("nicknames")) {
                this.nicknames = GetFromSerialized<Dictionary<string, Nickname>>(data["nicknames"]);
            }

            if (data.ContainsKey("voices")) {
                this.customVoices = GetFromSerialized<Dictionary<string, Voice>>(data["voices"]);
            }

        } else console_log("*************************** DATA NULL, that's crap. *******************************");
    }

        // using object lets us pass JTokens as well as strings
    public T GetFromSerialized<T>(object o) {
        return JsonConvert.DeserializeObject<T>(o.ToString());
    }

        // GetGlobalVar shits the bed on some types

    public T GetVarPerm<T>(string varname) {
        var json = CPH.GetGlobalVar<string>(varname, true);

        if (json == null) {
            return default(T);
        }
            // build in get method can't do this
        return JsonConvert.DeserializeObject<T>(json);
    }

        /**
        * METHOD CALLED by the other TTS action.
        * A different action will use SB's get random users to populate a var we can integrate
        */

    public bool integrate_passed_users() {
        const string ARG_NAME = "TWITCH_USERS_FROM_RANDOM";
        if (args.ContainsKey(ARG_NAME) == false) {
            console_log("ERROR: Can't integrate users - argument is not set");
            return false;
        }

        var users = new Dictionary<string, string>();

        if (! CPH.TryGetArg(ARG_NAME, out users) ) {
            console_log("FAIL to get argument " + ARG_NAME);
            return false;
        }

        int integrated = 0;

        foreach(var user in users) {
            if (this.usersPresent.ContainsKey(user.Key))
                continue;

            if (this.ignored.ContainsKey(user.Key))
                continue;

            this.usersPresent.Add(user.Key, user.Value);
            integrated++;
        }

        send_users();
        console_log("INTEGRATED some viewers.  Number: " + integrated, "y");

        return true;
    }

    public bool update_present_viewers() {
        // args["users"] is a List of Dictionary<string, object> s:id s:userName s:display int:role b:isSubscribed
        bool listUpdated = false;

        foreach(var user in (List<Dictionary<string, object>>) args["users"] ) {
            string userid = user["id"].ToString();

            try {
                if (this.usersPresent.ContainsKey(userid) || this.ignored.ContainsKey(userid))
                    continue;
            } catch (Exception e) {
                console_log("It's this bit that's fucked");
                console_log(e.ToString());
            }

            listUpdated = true;
            this.usersPresent.Add(user["id"].ToString(), user["display"].ToString());
        }

        return listUpdated;
    }


    ////////////////////////////////////////////
    ///// SOCKET SENDING STUFF /////////////////
    ////////////////////////////////////////////


    public void send_action(string action, object data = null, string? socketId = null) {
    	if (data == null) data = "";
        var toSend = new {
            action,
            data
        };

        send_json(toSend, socketId);
    }

    public void send_json(object o, string? socketId = null) {
        send(JsonConvert.SerializeObject(o), socketId);
    }

    public void send(string msg, string? socketId = null) {
    	CPH.WebsocketCustomServerBroadcast(msg, socketId, wssIndex);
	}


	//////////////////////////////
	//////// CONSOLE LOGGING /////
	//////////////////////////////

	public void console_log(string message, string colour = "g", string? socketId = null) {
        if (colour == "" || colour == null) {
            colour = "w";
        }

        send_json(new {message, colour, action = "consolelog"});
    }

    public bool console_clear() {
		send_action("consoleclear");
		return true;
	}


    public void say(string w2s, bool bot = true) {
        CPH.SendMessage(w2s, bot);
    }
}


public class Nickname {
	public Nickname() {}
	public Nickname(string user, string nick) {
		username = user;
		nickname = nick;
	}
    public string username {get; set;} // capitalised
    public string nickname {get; set;}
}

// messages for the queue

public class Message {
    public string msgid;
    public string userid;
    public string userCaps;
    public string userLower;

    public string msg;  // suffix, etc added
    public string msgDisplay;  // as received with/without emotes
    public string voiceURI;
    public double pitch;
    public double rate;
}


public class TTSSettings
{
    public string sayBefore = "{user} says";
    public string sayAfter  = "";

    public Dictionary<string, string> wordFilters; // a word filter.  Possibly allow wildcards / regex
    public string stripChars = "\\/#_()€¥¢©®™~¿[]{}<>¡`;÷|¦¬×§¶°";  // simple filter

        // permissions
    public bool allowEveryone = true;
    public bool allowMods = true;
    public bool allowVips = true;
    public bool allowSubs = true;

        // what to read
    public bool readAllChat = true;
    public bool readEmotes = false;
    public bool readNameDigits = false;
    public bool readCommands = false;
    public bool stickyRandVoice = true;

    public int chatQueueLimit = 50;
    public int historyQueueLimit = 100;

    public int globalCooldown = 0;
    public int userCooldown = 0;
        // if the user speaks within this time limit then don't say their name
    public int nameSuppressSeconds = 15;
    public int messageTimeLimit = 30;
    public bool removeModeratedMessages = true;
        // default voice(s). will be checked against browsers.  Not present, tell first connected to use their default
}

public class Voice
{
    public string userid;
    public string username;
    public string browser;  //
    public string uri;      // voice's main identifier
    public float pitch = 1; // typically min = 0.5, max = 2]~
    public float rate = 1;
}

public class Badge
{
    public string name { get; set; }
    public string version { get; set; }
    public string imageUrl { get; set; }
}

