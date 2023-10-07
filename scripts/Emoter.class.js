"use strict"
/*
	Yes it would be easier and more efficient to throw all globals together and all
	channel emotes from different services together.

	BTTV channel response has
		avatar: jpeg url
		bots: array of bot names
		channelEmotes array
			id
			code <-- what we want, the name like poggers or something
			imageType: png/gif whatever
			userId: channel's id
		sharedEmotes
			as above but the user ids change


	:something: also seems to be a common way of encoding emotes - oh no, they get converted to unicode
	name to id endpoint has cors error and has fields id, login, display-name,

	In the constructor pass an object with a filters property with a combo of plain, twitch, bttv, franker in an array

	7tv https://openbase.com/js/twitch-webchat/documentation
	global: 'https://api.7tv.app/v2/emotes/global'
  	user/channel: 'https://api.7tv.app/v2/users/:userId/emotes'
	can be name OR id
*/


{	// scope start

const BTTV_CHANNEL_ENDPOINT = "https://api.betterttv.net/3/cached/users/twitch/";	// + CHANNEL ID not name
const BTTV_GLOBAL_ENDPOINT	= "https://api.betterttv.net/3/cached/emotes/global";

const FRANKER_CHANNEL_ENDPOINT = "https://api.frankerfacez.com/v1/room/id/"; // + channel id
const FRANKER_GLOBAL_ENDPOINT = "https://api.frankerfacez.com/v1/set/global";

const SEVENTV_CHANNEL_ENDPOINT = 'https://api.7tv.app/v2/users/:userId/emotes'
const SEVENTV_GLOBAL_ENDPOINT = 'https://api.7tv.app/v2/emotes/global'

const CHAN_NAME_TO_ID_ENDPOINT = "https://dadoschyt.de/api/tmt/user/"; // + string bloody cors problem
/*
{"data":[{"
	id":"71092938",
	"login":"xqc",
	"display_name":"xQc",
	"type":"",
	"broadcaster_type":"partner",
	"description":"THE BEST AT ABSOLUTELY EVERYTHING. THE JUICER. LEADER OF THE JUICERS.",
	"profile_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/xqc-profile_image-9298dca608632101-300x300.jpeg",
	"offline_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/dc330b28-9c9f-4df4-b8b6-ff56b3c094fd-channel_offline_image-1920x1080.png",
	"view_count":524730962,
	"created_at":"2014-09-12T23:50:05Z"}]}

	random links

	https://api.frankerfacez.com/v1/room/id/71092938

	https://api.frankerfacez.com/v1/set/global

*/

class Emoter {
	channelsBTTV = {};
	globalsBTTV =  [];

	channelsFFZ = {}
	globalsFFZ = [];

	channels7TV = {}
	globals7TV = [];

	filtersAuto = {}

	constructor( {filters} = {filters: ['twitch', 'bttv', 'ffz', '7tv', 'plain']} ) {
		if ( filters ) {
			if (!Array.isArray(filters)) filters = [filters];

			this.filtersAuto = filters;

			if (filters.includes('bttv'))
				this.fetch_bttv_globals()

			if (filters.includes('ffz'))
				this.fetch_ffz_globals();

			if (filters.includes('7tv'))
				this.fetch_7tv_globals();
		}
	}

		// oh arse - it's a channel ID - ok if you're using tmi, which this will be, though 7tv can use names it's easier to keep it consistent
	async fetch(chanId, args = {bttv: true, ffz: true, "7tv": true}) {
		let waits = []
		if (args.bttv) {
			waits.push( this.fetch_bttv_channel(chanId) )
		}
		if (args.ffz) {
			waits.push( this.fetch_ffz_channel(chanId) )
		}
		if (args['7tv']) {
			waits.push( this.fetch_7tv_channel(chanId) )
		}

		return Promise.allSettled(waits);
	}

		//*************** BTTV **********************/
		//*************** BTTV **********************/
		//*************** BTTV **********************/

		// emotes for that channel id

	async fetch_bttv_channel(chanId) {
		let url =  BTTV_CHANNEL_ENDPOINT + chanId;

		this.channelsBTTV[chanId] = this.channelsBTTV[chanId] || [];

		return fetch(url)
			.then(response => response.json())
			.then( data => this._process_bttv_channel_data(data, chanId) )
			//.catch( e => { console.error("Error getting BTTV for ", chanId, e.toString()); return false; } )
	}

	_process_bttv_channel_data(d, chanId) {		//console.log("_add_bttv processing", d);		console.log("_add ARGRS", arguments);		console.log("add bttv for", chanId);		console.log(this.channels[chanId]);
		d.channelEmotes.forEach( e => this.channelsBTTV[chanId].push(e.code) )
		d.sharedEmotes.forEach( e => this.channelsBTTV[chanId].push(e.code) )
					//console.debug(`BTTV ${chanId} length: `, this.channels[chanId].length, this.channels[chanId]);
		return this.channelsBTTV[chanId];
	}

	async fetch_bttv_globals() {
		return fetch(BTTV_GLOBAL_ENDPOINT)
			.then(response => response.json())
			.then( data => this._process_bttv_globals_data(data) )
			.catch( e => console.error("Error on BTTV globals", e.toString() ) )
	}

	_process_bttv_globals_data(a) {
		a.forEach( e => this.globalsBTTV.push(e.code) )
//		console.debug("BTTV globals length: ", this.globals.length, this.globals);
		return this.globalsBTTV;
	}

		// ********************** FRANKER *****************************
		// ********************** FRANKER *****************************
		// ********************** FRANKER *****************************
		// https://api.frankerfacez.com/v1/room/id/71092938

	async fetch_ffz_channel(chanId) {
		let url =  FRANKER_CHANNEL_ENDPOINT + chanId;

		this.channelsFFZ[chanId] = this.channelsFFZ[chanId] || [];

		return fetch(url)
			.then(response => response.json())
			.then( data => this._process_ffz_channel(data, chanId) )
			.catch( e => { console.error("Error getting FRANKER for ", chanId, e.toString()); return ["nothig"]; } )
	}

	_process_ffz_channel(d, chanId) {
		if (d.error) {
			console.warn("Error on FFZ", d)
			return [];
		}

		let sets = d.sets;
			// room { room, sets : {12345.emoticons}} emoticons: {id, name <- want, height, width, public, hidden, urls}
		for (let setId in sets) {
			let set = sets[setId].emoticons;//			console.log("FRANKER SET ID", set);
			set.forEach( s => this.channelsFFZ[chanId].push(s.name) );
		}

		return this.channelsFFZ[chanId];
	}

	_process_ffz_globals(a) {
		let sets = a.sets;
		for (let setId in sets) {
			let set = sets[setId].emoticons;//			console.log("FRANKER SET ID", set);
			set.forEach( s => this.globalsFFZ.push(s.name) );
		}
		return this.globalsFFZ;
	}

	async fetch_ffz_globals() {
		return fetch(FRANKER_GLOBAL_ENDPOINT)
			.then(response => response.json())
			.then( data => this._process_ffz_globals(data) )
			.catch( e => console.error("Error FFZ Globals", e.toString() ) )
	}

		// ********************** 7TV *****************************
		// ********************** 7TV *****************************
		// ********************** 7TV *****************************

		async fetch_7tv_channel(chanId) {
			let url =  SEVENTV_CHANNEL_ENDPOINT.replace(':userId', chanId);

			this.channels7TV[chanId] = this.channels7TV[chanId] || [];

			return fetch(url)
				.then(response => response.json())
				.then( data => this._process_7tv_channel(data, chanId) )
				.catch( e => { console.error("Error getting 7tv for ", chanId, e); return ["nothig"]; } )
		}

		_process_7tv_channel(d, chanId) {
			if (d.error) {
				console.warn('Error on 7tv channel', d)
				return [];
			}
				// please let this work, it's pretty
			d.forEach( ({name}) => this.channels7TV[chanId].push(name))
			return this.channels7TV[chanId];
		}

		async fetch_7tv_globals() {
			return fetch(SEVENTV_GLOBAL_ENDPOINT)
				.then(response => response.json())
				.then( data => this._process_7tv_globals(data) )
				.catch( e => console.error("Error", e.toString() ) )
		}

		_process_7tv_globals(d) {
			if (d.error) {
				console.warn('Error on 7tv globals', d)
				return [];
			}console.log("7TV", d);
				// please let this work, it's pretty
			d.forEach( ({name}) => this.globals7TV.push(name))
			return this.globals7TV;
		}




		// FILTERS

	filter_emotes_generic(msg, chanId, personal, global) {
		let msgA = msg.split(' ');
			// if it's in globals or channel then return false from filter.
		msgA = msgA.filter( w => {
			return !global.includes(w)} )

		if (chanId in personal) {
			msgA = msgA.filter( w => {
				return !personal[chanId].includes(w)
			})
		}

		return msgA.join(' ');
	}

		// Twitch uses a series of offsets in the userstate and must be performed first

	TWITCH_EMOTE_PATTERN = /(\d+)-(\d+)/g;	// raw emotes has start/end offsets

	filter_twitch_emotes(msg, state) {			//if (state["emotes-raw"] === null) return msg;
			// matchAll returns an array iterator, convert to an array
		let pos, posns = [...state["emotes-raw"].matchAll(this.TWITCH_EMOTE_PATTERN)];
			// AHH - they're NOT arrayed in order, need to do a sort on these and BOOM
		posns = posns.map(v => [ parseInt(v[1]), parseInt(v[2])]  );
		posns = posns.sort( (a, b) => a[0] - b[0] );

		while (pos = posns.pop()) {            //msg = msg.slice(0, p1) + msg.slice(p2 + 1);   // WORKS
			msg = msg.slice(0, pos[0]) + msg.slice(pos[1] + 1);   // WORKS
		}
			//console.log("emotes RETURNING\n", msg.trim(), "\nfrom\n", orig, "length:", msg.trim().length);
		return msg.trim();
	}

		// global filter ; message = string, opts = object

	UNICODE_EMOTE_REGEX = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g

	filter(message, userstate, opts = {}) {
		let filters = opts.filters ? opts.filters : this.filtersAuto;
		let chanId = userstate['room-id'];

			// ALWAYS twitch first

		if ( filters.includes("twitch") && userstate['emotes-raw'] !== null ) {	// must pass the message state for raw emotes
			message = this.filter_twitch_emotes(message, userstate);
			console.log(`twitch filtered:`, message);
		}
//*
		if ( filters.includes('plain') ) {
			message = message.replace( this.UNICODE_EMOTE_REGEX, '' );
	//			console.log("Regex filtered:", message);
		}//*/

		if ( filters.includes("bttv") ) {
			message = this.filter_emotes_generic( message, chanId, this.channelsBTTV, this.globalsBTTV );
//			console.log(`bttv filtered:`, message);
		}
		if ( filters.includes("ffz") ) {
			message = this.filter_emotes_generic( message, chanId, this.channelsFFZ, this.globalsFFZ );
//			console.log(`franker filtered:`, message);
		}
		if ( filters.includes("7tv") ) {
			message = this.filter_emotes_generic( message, chanId, this.channels7TV, this.globals7TV );
//			console.log(`7TV filtered:`, message);
		}

		return message;
	}
}


globalThis.Emoter = Emoter;


}	// scope end