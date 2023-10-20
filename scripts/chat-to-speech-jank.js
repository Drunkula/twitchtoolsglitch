/** CHAT-TO-SPEECH-JAML.js
 *
 * Injects the old janky TTS function into the TTSMain namespace.  The borked version is fun.
 *
 * The try{} with strict 'namespacing' is replaced.
 */
"use strict"

    // try with strict will create an enclosed scope
//try {   // scope starts ( in case I can demodularise this )

    // our namespace
var TTSMain = TTSMain || {};
    // self executing function is passed TTSMain below
(function(ns) {
    console.log("########## INJECTING JANKY JANKERSON ############")

    //const TTSVars = TMIConfig.TTSVars;
        // this janky version references a 'global' value TMIConfig.TTSVars.sayCmds
    ns.get_voice_settings_by_name = function (sayCommand) {
        return TMIConfig.TTSVars.sayCmds[sayCommand];
    }

})(TTSMain);

/*
}   // try / SCOPE ENDS
catch (e) {
    console.error("Error in Chat to Speech", e);
    o("Error in chat to speech: " + e.toString());
}*/