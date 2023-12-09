// Javascript

export let config = {
    player: {
    width: 320,
    height: 240,
    playerDiv: "ytplayer",
    autoplayer: false
    },

    // socket

    socketty: {
        socketUrl: "ws://127.0.0.1:8081/",
        //socketUrl: "ws://127.0.0.1:7580/",  // speaker bot, it doesn't emit
    }

}

    // just for testing

export let playlistDefaults = [
    "ed8QTKtLxKs",
    "LECSVlc6O1g", // we're not candy
    "hFtfMtFSD8A",
    "QM_kJkChgrc",
    'fqACWyzdkh8',
    "57QRuxfWkyU",

];


//export { config };

/*
Direct Debit prices quoted on chat for direct debit
Unit rate (anytime):

£0.0706 per kWh

Standing charge:

£0.3270 per day  That is for gas

12:15 PM
Business said

Unit rate (anytime):

£0.2751 per kWh

Standing charge:

£0.5753 per da this is for elec

12:14 PM

These prices are no cheaper


https://speaker.bot/guide/api/websocket/requests/
*/
