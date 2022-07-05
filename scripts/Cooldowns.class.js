/**
 * 	YES, this class is tied to the TMI userstate and not a separation of concerns
 * 	It is NOT flexible
 *
 * 	NOTE: if user cooldown time is <= global then a user one won't be set as there's no provision for clear global
 * 		Cooldowns are set on a channel basis so if you're using this with the speecher you might get more chat than you expect
 * 		simply set the channel to a common value if you don't want this behaviour.
 *
 * 	Set cooldown can take a [command OR category], [user], [global]
 *
 * 	USER Cooldown on Category ELSE Command
 *  GLOBAL Cooldown set on Category ELSE Command
 *
 *	command - not necessary if there's a category
 *	category - not necessary if there's a command
 *
 * 	MODS if modCooldown supplied and will also set GLOBAL
 *
 *	{
		channel,
		userstate,
		command,
		category,
		globalTimeout
		userTimeout
		modTimeout
 	}

	// if there's a global underway a user won't be set anyway IF CHECKED
	// if there's a category underway a user won't be set. IF CHECKED
*/
"use strict"

console.log("Cooldowns included");



{	// SCOPE

const log = console.log;
//const log = o => o;

class Cooldowns {
	cooldowns = new Map();
		// alway allow broadcaster ?
	allowBroadcaster = true;	// maybe not so useful for the public All-Chat

		// Do mods obey the global cooldown - hmmm - normal users do

		/**
		 *	Sets a value in the cooldown table that will automatically destruct after X seconds.
		 *	mods don't have cooldowns unless cooldownMod is set in the command
		 * @param {Objec} params object with details of command, category, cooldown times and TMI userstate
		 * @returns
		 */

	cooldown_set(params) {
		let {channel, userstate, command, category, globalCooldown = 0, userCooldown = 0, modCooldown = 0} = params;
			// user, mod and global								// can also check if #userstate.username = channel
		if (!userCooldown && !modCooldown && !globalCooldown || (userstate.badges?.broadcaster && this.allowBroadcaster) ) {
			return;
		}

		this._set_cooldown_user(params);
		this._set_cooldown_global(params);
	}

	_set_cooldown_user(params) {
		const {userstate, modCooldown, userCooldown, globalCooldown} = params;
			// check user so there's an option to block a category
		if (userstate) {
			if ( userstate.mod && modCooldown )
			{		// set a mod cooldown
				let index = this._cooldown_name_user(params);
				this._set_cooldown_pack(index, modCooldown);
				log("\tCOOLDOWN INDEX MOD:", index, `for ${modCooldown}`);
			} else if ( userCooldown > globalCooldown ) {
				let index = this._cooldown_name_user(params);
				this._set_cooldown_pack(index, userCooldown);
				log("\tCOOLDOWN INDEX STANDARD USER:", index, `for ${userCooldown}`);
			}
		}
	}

	_set_cooldown_global(params) {
		const {globalCooldown} = params;
		if (globalCooldown) {
			let index = this._cooldown_name_global(params);
			this._set_cooldown_pack(index, globalCooldown);
			log("\tCOOLDOWN INDEX GLOBAL:", index, `for ${globalCooldown}`);
		}
	}

	_set_cooldown_pack(index, cooldownSecs) {
		let cPack = {};

		if (this.cooldowns.has(index)) {
			cPack = this.cooldowns.get(index);
			clearTimeout(cPack.timeout);
		}

		cPack.timeSet = Date.now();
		cPack.seconds = cooldownSecs;
		cPack.timeout = setTimeout( () => {this.cooldowns.delete(index); log("Deleted", index);}, cooldownSecs * 1000);

		this.cooldowns.set(index, cPack)
	}

		// returns time left on cooldown in ms for user and global or false if neither are set

	cooldown_check(params) {
		let ret = {global: false, user: false, globalIndex: '', userIndex: ''}
		let found = false;

		if (params.userstate) {
			let cdIdxU = this._cooldown_name_user(params)

			if (this.cooldowns.has(cdIdxU)) {
				let cd = this.cooldowns.get(cdIdxU);
				ret.user = cd.seconds * 1000 - Date.now() + cd.timeSet;
				ret.userIndex = cdIdxU;
				found = true;
			}
		}

		let cdIdxG = this._cooldown_name_global(params)
		if (this.cooldowns.has(cdIdxG)) {
			let cd = this.cooldowns.get(cdIdxG);
			ret.global =  cd.seconds * 1000 - Date.now() + cd.timeSet;
			ret.globalIndex = cdIdxG;
			found = true;
		}

		return found ? ret : false;
	}

		// generates a cooldown index string based on the user and category or command

	_cooldown_name_user({channel, command, category, userstate}) {
		let cdIdx = channel;

		if (category)
			cdIdx += '#' + category;
		else if (command) {
			cdIdx += command;
		}
		else {
			console.error("Error: User COOLDOWN NEEDS CATEGORY OR COMMAND");
			//throw new Error("User cooldown needs a category or command")
			//return false;
		}

		cdIdx += '|' + userstate.username;
			// Just as a debugging aid
		if (userstate.mod) {
			cdIdx += ':mod';
		}

		return cdIdx;
	}

		//	global index string for the category (1st) or command (2nd)

	_cooldown_name_global({channel, command, category, userstate}) {
		let cdIdxC;
			// use category OR
		if (category)
			cdIdxC = channel + '#' + category + '|Category';
		else if (command) {
			cdIdxC = channel + command + '|Global';
		}
		else {
			console.error("Error: GLOBAL COOLDOWN NEEDS CATEGORY OR COMMAND");
			throw new Error("Global cooldown needs a category or command")
			return false;
		}
			// wondering if I should set up a different one for mods - yes I will

		return cdIdxC;
	}
}

//globalThis.Cooldowns = Cooldowns;
TT.Cooldowns = Cooldowns;

}	// END scope