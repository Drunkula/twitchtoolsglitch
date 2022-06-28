/**
 * 	Category
 *
 * 	User + Channel
 *
 *	Global
 *
 *	So what would you pass
 *
 *	userstate
 *	user timeout secs
 *	mod timeout secs
 *	global timeout secs
 *	category
 *	command - not necessary if there's a category
 *
 *	Do we care about mods / broadcaster ?
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

	STRATEGY
	If it'a category then use global ?

	CATEGORY
		Sets USER and/or CATEGORY

	GLOBAL but no category - sets for command


	// if there's a global underway a user won't be set anyway
	// if there's a category underway a user won't be set.
	// so category AND user or GLOBAL and user will be set at the same time
	// as long as user > global

	// category = global

	// get - check category, check user
	// if no category command = category

	// so we need a category/command name AND a user one
 */

console.log("Cooldowns included");



{	// SCOPE

const log = console.log;
//const log = o => o;

class Cooldowns {
	cooldowns = new Map();
		// alway allow broadcaster ?
	allowBroadcaster = true;	// maybe not so useful for the public

	// set a value in the cooldown table that will automatically destruct after X seconds.
	// mods don't have cooldowns unless cooldownMod is set in the command
	// categories can cause a cooldown on many commands block the command again

	// Do mods obey the global cooldown - hmmm - normal users do

	cooldown_set(params) {
		let {channel, userstate, command, category, globalCooldown = 0, userCooldown = 0, modCooldown = 0} = params;
			// user, mod and global								// can also check if #userstate.username = channel
		if (!userCooldown && !modCooldown && !globalCooldown || (userstate.badges?.broadcaster && this.allowBroadcaster) ) {
			return;
		}
			// if commands are in a category all the ones in the category get blocked until the cooldown is set
			// should a mod set a cooldown on the category if they have no cooldown ?  Let's say no
			// are they a mod ?
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

		if (globalCooldown) {
			let index = this._cooldown_name_global(params);
			log("\tCOOLDOWN INDEX GLOBAL:", index, `for ${globalCooldown}`);
			this._set_cooldown_pack(index, globalCooldown);
		}
	}

	_set_cooldown_pack(index, cooldown) {
		let cPack = {};

		if (this.cooldowns.has(index)) {
			cPack = this.cooldowns.get(index);
			clearTimeout(cPack.timeout);
		}

		cPack.timeSet = Date.now();
		cPack.seconds = cooldown;
		cPack.timeout = setTimeout( () => {this.cooldowns.delete(index); log("Deleted", index);}, cooldown * 1000);

		this.cooldowns.set(index, cPack)
	}

		// returns time left on cooldown in ms for user and global

	cooldown_check(params) {
		var cdIdxU = this._cooldown_name_user(params)
		let found = false;
		let ret = {global: false, user: false}

		if (this.cooldowns.has(cdIdxU)) {
			let cd = this.cooldowns.get(cdIdxU);
			ret.user = cd.seconds * 1000 - Date.now() + cd.timeSet;
			ret.userIndex = cdIdxU;
			found = true;
		}

		var cdIdxG = this._cooldown_name_global(params)
		if (this.cooldowns.has(cdIdxG)) {
			let cd = this.cooldowns.get(cdIdxG);
			ret.global =  cd.seconds * 1000 - Date.now() + cd.timeSet;
			ret.globalIndex = cdIdxG;
			found = true;
		}

		if (found) return ret;

		return false;
	}

		// generate the cooldown name separators avoid clash with user names
		// I need a remove cooldown

	_cooldown_name_user({channel, command, category, userstate}) {
		var cdIdx = channel;

		if (category)
			cdIdx += '#' + category;
		else {
			cdIdx += command;
		}

		cdIdx += '|' + userstate.username;
			// wondering if I should set up a different one for mods - yes I will even though it won't matter
		if (userstate.mod) {
			cdIdx += ':mod';
		}

		return cdIdx;
	}

		//	global for the command / category

	_cooldown_name_global({channel, command, category, userstate}) {
		let cdIdxC;
			// use category OR
		if (category)
			cdIdxC = channel + '#' + category;
		else if (command) {
			cdIdxC = channel + command + '|' + "Global";
		}
		else {
			log("Error: GLOBAL COOLDOWN NEEDS CATEGORY OR COMMAND");
			throw new Error("Global cooldown needs a category or command")
			return false;
		}
			// wondering if I should set up a different one for mods - yes I will

		return cdIdxC;
	}
}

globalThis.Cooldowns = Cooldowns;

}	// END scope