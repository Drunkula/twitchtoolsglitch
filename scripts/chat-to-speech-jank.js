/** CHAT-TO-SPEECH-JANK.js
 * Injects the old janky TTS function into the TTSMain namespace.  The borked version is fun.
 */

console.log("########## INJECTING JANKY JANKERSON ############")
    // this janky version references the 'global' TT.config.TTSVars.sayCmds
TTSMain.get_voice_settings_by_name = function (name) {
    return TT.config.TTSVars.sayCmds[name];
}