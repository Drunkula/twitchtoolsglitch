
document.title = "Ovo Averager";

gid("content").innerText = "Main loaded";

get_current_month();

ovo_login();
//ovo_fetch_day();

function get_current_month() {
    let da = new Date();

    let monthNum = da.getMonth() + 1; // 0 - 11
        // .toString() = Fri Feb 23 2024 17:05:48 GMT+0000 (Greenwich Mean Time)
    let d2s = da.toString();
    let dayParts = d2s.split(' ');

    let dbits = {
        dayW: dayParts[0],
        dayOfWeekN: da.getDay(),
        dom: da.getDate(),
        monthW: dayParts[1],

    }

    let options = {weekday: 'long'};
    console.log(da.toLocaleDateString(undefined, options));

    console.log("day bits", dbits);
}

async function ovo_fetch_day(d, m, y) {
    //let url = "https://smartpaymapi.ovoenergy.com/usage/api/half-hourly/23032775?date=${y}-${m}-${d}";
    let url = "https://smartpaymapi.ovoenergy.com/usage/api/half-hourly/23032775?date=2024-02-18";

    let opts = {
        mode: "no-cors",
        credentials: "include",
        headers: {
            "Access-Control-Allow-Origin": "https://ovoenergy.com"
        }
    }

    let res = await fetch(url, opts);

    odata = await res.json();

    console.log("Data", odata);
}

async function ovo_login() {
    let url = "https://my.ovoenergy.com/api/v2/auth/login";

    let me = {username: "damianmoore@yahoo.co.uk", password: "chickenOVO.69", rememberMe: true}

    let opts = {
        mode: "no-cors",
        credentials: "include",
        method: "POST",
        headers: {
            "Access-Control-Allow-Origin": "https://ovoenergy.com"
        },
        body: JSON.stringify(me)
    }

    let result;

    try {
        await fetch(url, opts);
    } catch (error) {
        console.log("bollocks", error);
        return
    }
    let rText = result.text();

    console.log("Login result: ", result.statusCode, rText);

        // ---------------------next

    let url2 = "https://smartpaym.ovoenergy.com/api/customer-and-account-ids"

    let opts2 = {
        mode: "no-cors",
        credentials: "include",
        headers: { "Access-Control-Allow-Origin": "https://ovoenergy.com" }
    }

    let res2 = await fetch(url2, opts2);

    console.log("PART 2", res2.text());

    ovo_fetch_day();
}
/*
https://forum.ovoenergy.com/my-account-140/can-we-get-access-to-the-ovo-energy-online-account-api-to-download-our-smart-meter-usage-data-58


 https://my.ovoenergy.com/api/v2/auth/login
 json in body:
 {
    "username": "...",
    "password": "...",
    "rememberMe": true
}
Save cookies for all future requests
*/