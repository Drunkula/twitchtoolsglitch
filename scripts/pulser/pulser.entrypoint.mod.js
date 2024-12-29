/*
Chrome does things differently here. Instead of constantly storing the gamepad's
latest state in a variable it only stores a snapshot, so to do the same thing in
Chrome you have to keep polling it and then only use the Gamepad object in code
when it is available. We have done this below using setInterval(); once the object
is available the gamepad info is outputted, the game loop is started, and the
interval is cleared using clearInterval.

Taken from:
https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API

https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator/playEffect

https://luser.github.io/gamepadtest/
Ok - what can the pulser require

intensity sweep speed - time to go from min to max
intensity sweep min - goes from min to max
intensity sweep pattern - sin, saw, linear (easing?)

Pulse width 0 to 1
pulse speed (could use intensity sweep but it would on 0.8 always miss the peak of a saw)

A=0, B=1, X=2, Y=3, LB=4, RB=5, LT=6, RT=7, select=8, start=9,
D-Pad Up 12, Down 13, Left 14, Right 15
LT and RT also read .value for 0 to 1

## IMPORTANT ##
pad.buttons[] will change once and stay in that state.  Another call to navigator.getGamepads() must be used to poll current values
pad.connected DOES set itself to false without a re-poll


Overall strength
pad.vibrationActuator.playEffect('dual-rumble', {duration: 1030, strongMagnitude: 0.1, weakMagnitude: 1})
startDelay max 4000, duration max 5000
playEffect.then receives complete or preempted

PULSING x on, y off repeat.
  TIME is the issue here.  Currently we're dealing with "frames" of 100ms
    A start is adding fractional time rather than 1 to our total time counter

    simple case of pulse width 0.7 at 100 would be startDelay: 30, duration: 70 but apart from that
    Scenario: on 60 off 50 so 110 total.  60 less than 1 frame so fine - intensity doesn't change in that time
    rather than using start delay ons and offs should be used broken into chunks.  If an on/off changes during
    the sub frame then we add partial time.  Offs could be sent as a huge  lump.  e.g. if offs spanned 5.2 frames
    we could have an off of that length.

    Zero T is our basis for pulsing so we need the remainder of the time
    example: pulse width 40%, pulse time 0.6
    remaineder = T / pulsewidth e.g if we pulse every 0.6 seconds = 28.3333333
    0.33333 which is a 1/3rd of the way through the current pulse.
    Pulse width is 0.4 of the rate so it's ON

    Is the remainder of the pulse greater or less than our frame size of a 10th of a second?
    left = 0.4 - 0.33333 = 0.0666666
    Pulse for 0.06666 seconds, add 0.06666 to T

IDEA: Possible move time to integers.  Currently 1t = 100ms
In fact do I need a pulse granularity finer that that?
*/

try {
    //export const food = "chips";
} catch (error) {
    console.log("NOT A MODULE");
}
// how about
if (typeof exports === 'object' && typeof module === 'object') {
    // module.exports...
}

// this is a module.  You don't need to worry about this
;(()=> {
    "use strict"
    const PULSE_TIME = 100;   // if I use intervals / next rather than animation

    const PULSEWIDTH_K  = 3.0;
    const PULSERATE_K   = 3.0;
    const PWM_RATE_K    = 1.0;  // pulse width modulation now, is it?

    const INTENSITY_K   = 0.01;
    const LEFT_RIGHT_K  = 0.1;

    const OFF_TIME_MAX  = 4000;   // milliseconds startDelay can be
    const ON_TIME_MAX   = 5000;    // longest allowed pulse time

    // so I can monitor in browser
    var pad = window.pad = null;
    window.padIndex = null;

    const PULSE_EVENTS = [
        {selector: '#enabled', event: 'change', function: vibrate_enabled_toggle, params: {}},
        {selector: '#minstrengthl', event: 'change', function: e => { if (e.target.value > gid("maxstrengthl").value) set_n_change("maxstrengthl", e.target.value); }, params: {}},
        {selector: '#maxstrengthl', event: 'change', function: e => { if (e.target.value < gid("minstrengthl").value) set_n_change("minstrengthl", e.target.value); }, params: {}},
        {selector: '#minstrengthr', event: 'change', function: e => { if (e.target.value > gid("maxstrengthr").value) set_n_change("maxstrengthr", e.target.value); }, params: {}},
        {selector: '#maxstrengthr', event: 'change', function: e => { if (e.target.value < gid("minstrengthr").value) set_n_change("minstrengthr", e.target.value); }, params: {}},
    ];

    var pads = navigator.getGamepads();
    var t = 0;
    var active = false;
    //var pad;

    // let's think of an algorithm.  Time might as well increase with every "animation" frame
    // all sliders go fro 0.0 to 1.0 to make things simple
    function get_intensity(t) {
        let {maxstrengthl, minstrengthl, maxstrengthr, minstrengthr, leftrightrate, pulsewidth, pulserate, pulsing, intensityrate} = TT.config.Pulser;

        let sinIntensity =  Math.sin(t * intensityrate  * INTENSITY_K);
        let sinIntensityABS = Math.abs( sinIntensity );
        console.log("sin intensity", sinIntensity);

        let strengthL, strengthR;
        let deltaL = maxstrengthl - minstrengthl;
        let deltaR = maxstrengthr - minstrengthr;

        strengthL = deltaL === 0 || intensityrate === 0 ? maxstrengthl :
            minstrengthl + sinIntensityABS * deltaL;

        strengthR = deltaR === 0 || intensityrate === 0 ? maxstrengthr :
            minstrengthr + sinIntensityABS * deltaR;

        if (TT.config.Pulser.lrsweep) {
            strengthL = intensityrate === 0 ? maxstrengthl :
            minstrengthl + deltaL * (1.0 + sinIntensity) / 2;

            strengthR = intensityrate === 0 ? maxstrengthr :
            minstrengthr + deltaR * (1.0 - sinIntensity) / 2;
        }

            // ok so sin is going to go from -1 to 1.  e.g. right at 1 = max, -1 = min
// rub over them for now
        /*
        if (leftrightrate > 0.0) {
            let sinLR = Math.sin( leftrightrate * t * LEFT_RIGHT_K );
            let deltaL = maxstrengthl - minstrengthl;
            let deltaR = maxstrengthr - minstrengthr;
            // -1 = min + (deltaL - deltaL) / 2 = min
            // 1 = min + (deltaL + deltaL) / 2 = max
            // how to out of phase this
            // how about deltaL -
            strengthR = minstrengthr + (deltaR - sinLR * deltaR) / 2;
            strengthL = minstrengthl + (deltaL + sinLR * deltaL) / 2;
        }/*/

        if ( pulsing && false == is_pulse_on(t) ) {
            strengthR = minstrengthr;
            strengthL = minstrengthl;
        }

        if (!TT.config.Pulser.rightenabled)
            strengthR = 0;

        if (!TT.config.Pulser.leftenabled)
            strengthL = 0;


        return {strengthL, strengthR};
    }

        // is the pulse on or off based on the current time and pulse rate and width

    function is_pulse_on(t) {
        let {pulsewidth, pulserate} = TT.config.Pulser;

        let pulseLength = (pulserate * 50 * PULSE_TIME);

        let fractionLeft = (t / pulseLength) % 1;

console.log("PULSE Length:", pulseLength, "fraction left: ", fractionLeft, "width:", pulsewidth,
"on/off:", pulsewidth >= fractionLeft ? "ON" : "OFF");

        return pulsewidth >= fractionLeft;
        // dividing our current time by that and seeing if the fractional part is
    }

        // sends vibrate messages to pad

    function vibrate(stop = false) {
        //if (!pad) return;
        if (!pad || !TT.config.Pulser.enabled)
            return;

        if (stop) {
            //pad.vibrationActuator.reset();
            set_n_change('enabled', false);
            TT.config.Pulser.enabled = false;
            stop_all_vibs();
            return;
        }

        var deltaT = PULSE_TIME;    // this will change with pulsing

        let {strengthL, strengthR} = get_intensity(t);

        console.log("strength", strengthL, strengthR);
            // let's just do the main
            // new calls kill old ones
        pad.vibrationActuator.playEffect('dual-rumble', {
            startDelay: 0,
            duration: deltaT,
            weakMagnitude: strengthR,
            strongMagnitude: strengthL,
        })
        .then(x => {  // 'complete' it finished 'preempted' it was reset or another pulse sent
            if (x === 'complete')
                vibrate();
            }
        );

        t += deltaT;
    }

        // enabled button handler

    function vibrate_enabled_toggle(e) {
        let on = e.target.checked;
        if (on) {
            active = true; console.log("on");
            vibrate();
        } else {
            active = false; console.log("off");
        }
    }

        //* Keypresses will enable / disable vibrates

    window.addEventListener("keypress", x => {
        set_n_change('enabled', !active);
    });//*/

    //console.log("type of export", typeof export);

    window.addEventListener('load', () => {
        TT.forms_init_common();
        TT.add_events_common();
        TT.add_event_listeners(PULSE_EVENTS);
    });

    window.addEventListener('gamepadconnected', e => {
        pad = e.gamepad;
        padIndex = e.gamepad.index;
        pad = navigator.getGamepads()[e.gamepad.index]; // just in case this solves the buttons not unpressing
        con_status(e.gamepad.index + " : " + e.gamepad.id); console.log("connected", e);
        vibrate();
    });

    window.addEventListener("beforeunload", x => {
        //pad = null; // this or enabled = false to stop the playEffect.then on the next iteration
        //TT.config.Pulser.enabled = false; // doesn't work alone
        stop_all_vibs();    // if playEffect().then checks for preempted works alone else the .then event may start it again
    });

    window.addEventListener('gamepaddisconnected', e => {
        //pad = null;
        con_status("No");
    } );

    function stop_all_vibs() {
        for (let pad of navigator.getGamepads()) {
            if (pad) pad.vibrationActuator.reset();
        }
    }

        // I think the buttons must have a sticky state that you reset after polling

    function btns_pressed() {
        let pressed = [];
        let any = 0;
        let newPad = navigator.getGamepads()[padIndex];

        if (newPad) {
            for(let i = 0; i < pad.buttons.length; i++) {
                //if (newPad.buttons[i].pressed) {
                if (newPad.buttons[i].pressed != pad.buttons[i].pressed) {
                    any++;
                    pressed.push(i);
                }
            }

            if (any)
                console.log(count, "buttons", pressed, pressed.length, any, pad.timestamp);

            // pad presses seem to be "sticky", cleared when a new request from getGamepads is made.
            // this should make sure no presses are missed
            pad = newPad;//navigator.getGamepads()[padIndex];
        }
        return pressed;
    }

    function con_status(text) {
        gid("connected").innerText = text;
    }


        // crap, can't do this

    function set_n_change(id, value) {
        let e = gid(id);
        let changeIt = false;

        if (e.type === 'checkbox') {
            if (e.checked !== value) {
                e.checked = value;
                changeIt = true;
            }
        }
        if (e.value !== value) {
            e.value = value;
            changeIt = true;
        }
        //*
        if (changeIt) {
            e.dispatchEvent( new Event("change") );
        }//*/
    }

    let count = 0;

    function main() {
        if (count++ > 1400) return;

        document.title = count;

        btns_pressed();

        requestAnimationFrame(main);
    }

    function main2() {
        if (count++ > 800) return;

        document.title = count;

        btns_pressed();

        setTimeout(main2, 100);
    }

    //main2();

    requestAnimationFrame(main);

})();

