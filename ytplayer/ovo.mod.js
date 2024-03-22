import { errorMonitor } from "obs-websocket-js";

/*
If you login to ovo and then go to https://smartpaymapi.ovoenergy.com/ then fetch requests will work
e.g. https://smartpaymapi.ovoenergy.com/usage/api/half-hourly/23032775?date=2024-02-19

ACTUAL EMAIL TARGETS
Oct 10.92 | 10.3
Nov 8.80 | 8.80
Dec 9.85 (says 10.02 in a different email) 10.80
Jan 8.04 | 8.76
Feb | 10.52
Mar

https://forum.ovoenergy.com/my-account-140/can-we-get-access-to-the-ovo-energy-online-account-api-to-download-our-smart-meter-usage-data-58
OVO order of play:
https://my.ovoenergy.com/api/v2/auth/login POST
https://smartpaym.ovoenergy.com/api/customer-and-account-ids GET
https://smartpaymapi.ovoenergy.com/usage/api/half-hourly/23032775?date=2024-02-19 GET

let opts = {credentials: 'include', method: "POST"};
let login = fetch("https://my.ovoenergy.com/api/v2/auth/login", opts);

It's looking more and more that it'll be easier to just login to ovo, then go to the smart pay and just run a bookmarklet or paste a script

Bank holiday api!!
https://www.gov.uk/bank-holidays.json
*/
window.addEventListener('load', main);

//useUrl  = "https://smartpaymapi.ovoenergy.com/usage/api/half-hourly/23032775?date=";
useUrl  = "https://smartpaymapi.ovoenergy.com/usage/api/half-hourly/";
baseUrl = "https://smartpaymapi.ovoenergy.com";
errMsgNotLogged = `<div>Log into your Ovo account then <a href="${baseUrl}">Click Here</a>.</div>`;
bhdates = [];

(() => {
    if (!set_acct_num()) return errMsgNotLogged;
})();

// a=1;a=a.toString();a=a.length<2?'0'+a:a;
// a=1;a=a.toString().padStart(2,0)
// a=1;("0"+a).slice(-2))

async function process_bank_holidays() {
    bhdates = [];
    zone = "england-and-wales";// scotland northern-ireland
    bhr = await fetch("https://www.gov.uk/bank-holidays.json");
    if (bhr.ok) {
        bh = await bhr.json();
        for (d of bh[zone].events)
            bhdates.push(d.date);
    } else {
        console.log("Can't process bank holidays");
    }
}

function set_acct_num(){
    c = Object.fromEntries(document.cookie.split('; ').map(c => c.split('=')));
    v = c.mp_457e7322cdf0dcb51030b6a3bafd8805_mixpanel;
    if (v !== undefined) {
        acct = JSON.parse( decodeURIComponent(v) )
        acctid = acct["Account Id"];
    }
    //return true;
}

// // BST things need to be considered using the date ting
// oh ffs.  The hourly readings aren't matching up with their slot for the day.
// if date timezoneOffset isn't zero 7pm times are reported at 6pm

async function month_totals(mthOffset = 0) {
    let m = firstday_lastday(mthOffset);

url = useUrl + acctid + "?date=";
    dom = m.fdom; // 0 to 6
    url="https://smartpaymapi.ovoenergy.com/usage/api/half-hourly/23032775?date=";
    total427 = 0; total = 0;
    dom=4;
    pad=a=>("0"+a).slice(-2);
    year=2024;
    mth=pad(12);
    for (i = 1; i <= 31; i++) {
        //console.log(`${i} : ${dom} : ${(dom>0 && dom<6)?"yes":"no"}`)
        if (dom>0 && dom<6) {
            dts = `${year}-${mth}-`+pad(i);
            if (bhdates.contains(dts)) {console.log("bank holiday "+dts); continue;}
            furl=url+dts;
            //console.log(furl);
            data = await fetch(furl);   // ok: true or status: 200 check
            if (data.ok !== true) {
                console.log("bad response for", furl)
                continue;
            }
            //console.log(data);
            json = await data.json();
            //console.log(json);

            if (json.electricity) {
                ed = json.electricity.data;
                if (ed instanceof Array == false || ed.length != 48) {
                    console.log("1/2 hoursly data is not an array or of wrong length", ed);
                    //continue;
                }
                e427Tot = 0; dayTot = 0;
                for(hh=0; hh<ed.length; hh++) {
                    dayTot+=ed[hh].consumption;
                    d2d = new Date(ed[hh].interval.start);
                    tsh = d2d.getHours();
                    if (d2d.getTimezoneOffset() != 0) tsh++;
                    if (tsh >= 16 && tsh < 19)
                        e427Tot+=ed[hh].consumption;
                }
                total += dayTot; total427+=e427Tot;
                console.log(`${i} day ${e427Tot.toFixed(3)} / ${dayTot.toFixed(3)} %`, (100 * e427Tot / dayTot).toFixed(3), new Date(ed[hh].interval.start));
                if (json.electricity.next !== true)
                    break;
            }
        }
        dom = ++dom%7;
    }
    console.log(`TOTAL Month ${total427.toFixed(3)} / ${total.toFixed(3)} %`, total427/total * 100);
}

function firstday_lastday(mthOffset=0) {
    date = new Date();
    first = new Date(date.getFullYear(), date.getMonth() -mthOffset, 1);
    last = new Date(date.getFullYear(), date.getMonth() -mthOffset + 1, 0);
    let p =  {
        fdom: first.getDate(),
        ldom: last.getDate(),
        month: first.getMonth() + 1,
        mthName: first.toLocaleString('default', { month: 'long' }), year: first.getFullYear()}

    return p;
}
// oct 10.92, nov 8.80% matches 8.79775 pretty well

javascript:(()=>{
    document.body.innerHTML='<div id="foo">1</div>'; cnt=0; d=document.getElementById("foo"); setInterval(()=>d.innerText=cnt++, 1000);
    })();

async function main() {
    console.log("Main entry point init");
    out("Hello there.  Press F12 to open the dev console and observer messages");
        // it'll send 'closing' to streamerbot
    //window.addEventListener('beforeunload', () => ytpc.close());

    out("It ready")

    one_login();

    return;
}








// FUCK ALL THIS BELOW - FUCK LOGGING IN

    // none of the cors methods work.  Even running from ovo you get a page policy meta kick in the teeth.
async function one_login() {
    let url = "https://my.ovoenergy.com/api/v2/auth/login";
    //url = "https://google.co.uk";
    let opts = {
        credentials: 'include',
        mode: "no-cors",   // no-cors, *cors, same-origin
        //mode: "cors",   // no-cors, *cors, same-origin
        //mode: "same-origin",   // no-cors, *cors, same-origin
        method: "POST",
        body: JSON.stringify({username: "damianmoore@yahoo.co.uk", password: "chickenOVO.69", rememberMe: true}),
        headers: {
            'Accept': 'application/json, text/plain',
            'Content-Type': 'application/json;charset=UTF-8'
        }
    };

    let login = await fetch(url, opts);

    console.log("login", login);

/*     let j = await login.json();

    console.log("LOGIN RESULT", j);
 */}

function init_controls() {
    let controls = document.querySelectorAll(".controls li");

    for (const con of controls) {
        let action = con.dataset["action"];
        //con.addEventListener('click', e => ytpc.actions[action](e));
        con.addEventListener('click', e => ytpc.message_handler( action ));
    }
}

[ ['r', 1], ['g', 2], ['b', 4], ['w', 7], ['c', 6], ['m', 5], ['y', 3], ['k', 0] ]
.reduce(
    (cols, col) => window[col[0]] = f => `\x1b[1m\x1b[3${col[1]}m${f}\x1b[0m`, []
);

//main();   // this makes it work, and the player load

    // add it after you've added the api ready function or you'll miss the boat
/*
function insert_ytplayer_api() {
    var tag = document.createElement('script');

    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}*/