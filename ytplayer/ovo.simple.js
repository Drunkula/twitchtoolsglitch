
zone="england-and-wales";// scotland northern-ireland
l=console.log; pad=a=>("0"+a).slice(-2);gid=x=>document.getElementById(x);
bhdates=[];spx=0;
url="https://smartpaymapi.ovoenergy.com/usage/api/half-hourly/";
errLgin=x=>o('<b>ERROR:</b> [<a href="https://account.ovoenergy.com/">CLICK HERE to sign into your Ovo account first.</a>]');
errLoc=x=>o('<b>ERROR:</b> <a href="https://smartpaymapi.ovoenergy.com/">CLICK HERE</a> ignore the onscreen message then try again.');

(async ()=>{
    setup();

    if (!set_acct_num()) {errLgin(); return;}
    if (window.location.host != "smartpaymapi.ovoenergy.com") {errLoc(); return;}

    url=url+acctid+"?date=";
    try {
        bhr = await fetch("https://www.gov.uk/bank-holidays.json");
        if (bhr.ok) {
            bh = await bhr.json();
            for (d of bh[zone].events)
                bhdates.push(d.date);
                l("got bank holidays")
        }
    } catch (e) {
        o("Can't process bank holidays")
    }

    o("Press F12 for more info");
    for(let m=0; m<6; m++)
    await main(m);
})();

async function main(mPast=0) {
    fdld = firstday_lastday(mPast);

    total427 = 0; total = 0;
    dow=fdld.fdom;
    year=fdld.year;
    mth=pad(fdld.month);

    l("Month: ", fdld.mthName);
    o("Month: "+fdld.mthName);

    for (i = 1; i <= fdld.ldom; i++) {
        if (dow>0 && dow<6) {
            dts = `${year}-${mth}-`+pad(i);
            if (bhdates.includes(dts)) {l("bank holiday "+dts); continue;}
            furl=url+dts;
            data = await fetch(furl);   // ok: true or status: 200 check
            if (data.ok !== true) {
                l("bad response for", furl)
                continue;
            }

            spin();
            json = await data.json();

            if (json.electricity) {
                ed = json.electricity.data;
                if (ed instanceof Array == false || ed.length != 48) {
                    l("1/2 hoursly data is not an array or of wrong length", ed);
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
                l(`${i} day ${e427Tot.toFixed(3)} / ${dayTot.toFixed(3)} %`, (100 * e427Tot / dayTot).toFixed(3));
                if (json.electricity.next !== true)
                    break;
            }
        }
        dow = ++dow%7;
    }
    lm = `TOTAL Month %${(total427/total * 100).toFixed(2)}  [${total427.toFixed(3)} / ${total.toFixed(3)}]`;
    l(lm);
    o(lm);
}

function firstday_lastday(mthOffset=0) {
    date = new Date();
    first = new Date(date.getFullYear(), date.getMonth() -mthOffset, 1);
    last = new Date(date.getFullYear(), date.getMonth() -mthOffset + 1, 0);
    let p =  {
        fdom: first.getDay(),
        ldom: last.getDate(),
        month: first.getMonth() + 1,
        mthName: first.toLocaleString('default', { month: 'long' }), year: first.getFullYear()}
    return p;
}

function set_acct_num(){
    c = Object.fromEntries(document.cookie.split('; ').map(c => c.split('=')));
    v = c.mp_457e7322cdf0dcb51030b6a3bafd8805_mixpanel;
    if (v !== undefined) {
        acct = JSON.parse( decodeURIComponent(v) )
        acctid = acct["Account Id"];
        if (acctid)
            return true;
    }
    return false;
}

function o() {
    for(q of arguments){
        nd=document.createElement("div"); nd.innerHTML=q;
        msgs.append(nd);
    }
}

function setup(){
    document.body.innerHTML = '<div>Working: [<span id="X">+</span>]<p><div id="msgs"></div></div>';
    mDiv=gid("msgs");
    xDiv=gid("X");
}

function spin() {
    spx=!spx;
    xDiv.innerText = spx?'◉':"◎";
}