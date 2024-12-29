/* In SB when looking to see if a browser can handle a voice I could have this structure
lists indexed by sessionid
sess1
    List uris
sess2
    List uris

Then foreach over and check the list - super easy

OR have a list of uris and a list of sessionids

uri1
    sessid1
    sessid2

Which is of course "nice" but horrendous to maintain when a browser disconnects

*/

/**
You should be able to add your own handlers to the tts

And should it even be the tts.  At the moment the sockmessage router has single actions
for each message but what if you want to do something like this
 */

msgRouter.on("ignoredusers", d => ignored_thing_1(d));
msgRouter.on("ignoredusers", d => another_ignored_thing(d));

/*  You have to keep updating the actions for the thing

    currently we have a tts that is a sock message router and buttons and selects that want to send or
    respond to messages have to go through the router.

    Simpler to have a global sock message router or have one

    CHANGED:
    Refactored to have as TTS inherited from SockMsgRouter and had to be talked to
        SockMessageRouter
        MessageDisplayer
        TTS

    Then the TTS and MessageDisplayer don't need to know a damned thing about each other

    BY REMOVING the TTSStreamerbot class we now have to keep track of
    id and sessionId elsewhere
*/

/*
PROBLEM: When you don't receive a message ended message
    WHY:
        Browser closed: I got unloading and socketClosed
        disconnected:
*/

/*
*   What will this need to do?
*   Store the settings
*   Socket messages
*   Queue
*   Connected browsers
*   Voices can still have a command like !ptt as well as user
*
*   Fallback to other connected speech engine if voice isn't present.
*
*   On a browser's connect voices can be checked against it
*
*     When a tab is duplicated it duplicates sessionStorage so the id and sessionId of another tab can be sent
*   this suggests that sessionIds should always be used for targetted actions but that all browsers will receive.
*   e.g. you want all browsers to display that a message is playing but only one will play the voice
*
*   allVoicesHandlers[browserID]
*   browserConnections[sessionId]
*
*   So a duplicate will "steal" the id of the previous browser.
*       Solution: send out a action that'll tell a connection to reidentify if
            ID is the same as the new id but the session id is different

    !chatban !ttsban !chatallow !ttsallow
    !ttsoff !ttson
*/
/*
nicename: "WanLung Online (Natural) - Chinese (Hong Kong)"
default: false
lang:"zh-HK"
localService:false
name:"Microsoft WanLung Online (Natural) - Chinese (Hong Kong)"
voiceURI: "Microsoft WanLung Online (Natural) - Chinese (Hong Kong)"

/*
We get the custom voice list and it contains values we don't have.
Still want it to appear in the list so we need to add it to the voices DONE currently just adding voices we don't have

let the tts have voices indexed by the URI
when the custom voices turn up check we have them all
    NO: add voiceURI -> {name, isExternal} we'll know because it's not a speechSynthesisVoice


SB voice handlers like this

    Dictionary<connection, Voices>

    if a user has a custom voice

    if (hasCustomVoice(userid)) {
        foreach (connection in browsers) {
            if (browsers['connection'].Contains(voiceWeWant)) {
                toSelectedBrowser.speak()
                break;
            }
        }

        notHandled ?
    }

Defaults for each browser?  We want to set up a default and some fallbacks


BUG Ignored users and userspresent can go out of sync so a user is in both.  Remedy
*/