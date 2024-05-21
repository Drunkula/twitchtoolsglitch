//const TT = window.TT;

const speech = new TT.Speecher();

const SPEECH_START_TIMEOUT_MS = 2000;     // seconds that speech has to start before it's cancelled
const SPEECH_END_TIMEOUT_MS = 20000;     // seconds that speech has to end before it's cancelled
const TTS_TEST_TEXT = "I am the test.  Yay I am doing a test now. 1 2 3 4 5, 12345";

langs = {};
langsR = {};

let VOICE_PICK_EVENTS = [
        // want this it happen AFTER update_say_commands
    {selector: ".voice-select", event: 'change', function: test_voice_onclick, params: {noAutoChange: true,}},

    {selector: '.voice-filter', event: 'change', function: select_filter_onchange, params: {}},

    {selector: 'button[data-for]', event: 'click', function: test_voice_onclick, params: {}},

//    {selector: 'input[type="range"]', event: 'input', function: slider_oninput, params: {}},

//    {selector: '#volumemaster', event: 'input', function: volume_master_slider_oninput, params: {}},
];

let voices;

window.addEventListener('load', async (event) => {
    await speech.ready();

    voices = speechSynthesis.getVoices();
    //console.log("voices before", voices)

    sort_and_filter_voices(voices);
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
    });
});


    // copying all the properties of a voice doesn't make it a voice and it can't be used to set the voice of an utterance.
    // Even though you can't REPLACE the name in a SpeecSynthesis voice you can ADD an extra property
    //
    /**
     * ADDS "nicename" to each voice to allow sorting and removes Microsoft/Google
     * @param {Speecher voice list} voices
     * @returns
     */

function sort_and_filter_voices(voices) {
    let voice_name_filter = (v => v.replace(/Microsoft\s*|Google\s*/, ''));
    let vnf2 = v => v.replace("Republic of North Macedonia", 'RNM');

        // array returned by speechSynthesis.getVoices() is immutable.   // let vsc = structuredClone(voices);  // nope   //voices = JSON.parse(JSON.stringify(voices));    // NOPE
    for (let v of voices) {            //let vf = {...v};// nope //let vf = structuredClone(v);  // nope
        //console.log(v.lang)
        let [subLang, sl2] = v.lang.split('-');
        let langW = v.name.split('-')[1];

        let c = langW.match(/(\w*)\s\((.*)\)/);

        //console.log(v.lang);
        //console.log(c);

        langs[subLang] = c[1];
        langsR[sl2] = c[2];
        v.nicename = vnf2(voice_name_filter(v.name));
    }

    return voices.sort( (a, b) => a.nicename.localeCompare(b.nicename) );
}


    /**
     *  Adds the <option>s to the selects
     *  Do BEFORE restoring the defaults
     */

function create_speech_selects_options (voices) {
    //let voice_name_filter = (v => v.replace(/Microsoft\s*|Google\s*/, ''))

    let selects = qsa(".voice-select")

    //log("Number of voices : " + TTSVars.voices.length)

        // voices contains names, voiceURI, default, lang, localService

    for (let s of selects) { // create <option>s
        let frag = document.createDocumentFragment();

        //for (const voiceidx in TTSVars.voices) {
        for (let voice of voices) {
            //let voice = TTSVars.voices[voiceidx]
            let opt = document.createElement('option');
            opt.text =  voice.nicename;
            opt.dataset.lang = voice.lang.split('-')[0];
            opt.value = voice;
            opt.dataset.v = voice;
//console.log("voice for select",voice);
            frag.appendChild(opt);
        }

        s.replaceChildren(frag);
    }
}

function create_speech_filters_options (voices) {
    let selects = qsa(".voice-filter")
    let source = langs;

    //source["All"] = "Filter Voices";
console.log(source);
    for (let s of selects) { // create <option>s
        let frag = document.createDocumentFragment();

        let opt = document.createElement('option');
        opt.text = "Filter";
        opt.value = "";
        frag.appendChild(opt);

        for (let c in source) {
            let opt = document.createElement('option');
            opt.text =  source[c];
            //opt.dataset.lang = voice.lang.split('-')[0];
            opt.value = c;

            frag.appendChild(opt);
        }

        s.replaceChildren(frag);
    }
}

    // filter

function select_filter_onchange(e) {
    let v = e.target.value;
    let targ = e.target.dataset["for"];

    targ = '#'+targ+" option";

    console.log("FILTER:", v, targ);
    //console.log( e.target

    let opts = qsa(targ);

    console.log("OPTS", opts);

    for (let opt of opts) {
        console.log(opt.value);
        if (v === "" || opt.dataset['lang'] === v)
            opt.classList.remove("is-hidden");
        else
            opt.classList.add("is-hidden");
    }
}

function test_voice_onclick (e) {
    if (e.type === "change") {
        console.log("YOU CHANGED THE SELECT THING!");
    }
// lazy
    let targ = e.type === "change" ? e.target.id : e.target.dataset['for'];
    test_voice(targ);
}

function test_voice(id) {
    let params = get_voice_settings_by_id(id);
    params.text = gid("testtext").value;
    params.immediate = true;
    params.volume = gid("volumemaster").value;

    speech.speak(params);
}

function get_voice_settings_by_id(id) {
    let idNum = id.split("-")[1];

    let rate = +gid('rate-'+idNum).value;
    let pitch = +gid('pitch-'+idNum).value;
        //let vIdx = +gid('voiceid-'+index).value;  // now gets the hash
    let vIdx = +gid('v-'+idNum).selectedIndex
    let voice = gid(id).value;
    voice = voices[vIdx];

    console.log("SELECT INDEX", vIdx, rate, pitch, id, voice);
    console.log("nice name", voice.nicename);

    return {rate, pitch, voice}
}


add_event_listeners = function(events = TT_EVENT_ITEMS) {
    let chEv = new Event('change');
    let inpEv = new Event('input');

    for (const ev of events) {
        let fs = qsa(ev.selector);
        for (const f of fs) {
            f.addEventListener(ev.event, ev.function);

            if (ev.event === 'change' && ev.params?.noAutoChange !== true) {
                f.dispatchEvent(chEv);
            } else
            if (ev.event === 'input') {
                f.dispatchEvent(inpEv);
            }
        }
    }
}