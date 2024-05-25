
import "../Speecher.class.js"

const speech = new TT.Speecher();


console.log(speech);
let voices;

window.addEventListener('load', main);



        //speech.ss.speak(u);

        //speech.ss.speak("tell me what's happening");

    /*     sort_and_filter_voices(voices);
        //console.log("voices after", voices);
        console.log("langs", langs, Object.keys(langs).length);
        console.log("langsR", langsR, Object.keys(langsR).length);

        create_speech_selects_options(voices);
        create_speech_filters_options();

        add_event_listeners(VOICE_PICK_EVENTS);

        gid("testtext").value = TTS_TEST_TEXT;

        speech.addEventListener('voiceschanged', () => {
        voices = speechSynthesis.getVoices();
        sort_and_filter_voices(voices);

        create_speech_selects_options(voices);
        create_speech_filters_options();
    }); */

speech.addEventListener('error', e => console.log("SPEECHY ERROR HORROR", e));
speech.addEventListener('end', e => console.log("SPEECHER ENDED", e));

async function main() {
    console.log('waiting');
    await speech.ready();

    speech.utteranceOn({
        error: e => console.log("UTTERANCE ERROR:", e),
        end: e => console.log("UTTERANCE FINISHED", e),
        end: e => console.log("FINISH OF THE UTTERANCE")
    })

    await sleep(1000);

    console.log('ready');
    voices = speechSynthesis.getVoices();
    console.log("voices before", voices)

    speech.speak("Can you hear me, mother?");
}

function sleep(ms) {		// sleep(200).then(...)
	return new Promise(res => {
		setTimeout(res, ms);
	});
}