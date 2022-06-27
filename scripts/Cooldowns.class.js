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
 */



class Cooldown {
	cooldowns = new Map();

	// set a value in the cooldown table that will automatically destruct after X seconds.
	// mods don't have cooldowns unless cooldownMod is set in the command
	// categories block the command again

	// NEED TO SET FOR A USER / CATEGORY / GLOBAL LEVEL
	// Do mods obey the global cooldown - hmmm - normal users do

	cmd_cooldown_set(params) {
		{channel, userstate, command, category, globalCooldown, userCooldown, modCooldown} = params;

		if (!userCooldown && !modCooldown) {
			return;
		}
		// if commands are in a category all the ones in the category get blocked until the cooldown is set
		var cdIdx, cooldown, cPack = {};

		// if there's only a mod cooldown what to do?
		if (userstate.mod) {
			if (!(cooldown = modCooldown)) {
				return false;
			}
			else {	// they won't use the cooldown

			}
		} else if (userCooldown) {
			cooldown = userCooldown;
		}
		else {
			return false;
		}

		cdIdx = this._cooldown_name(params)
			// take the old cooldown and delete its timer
		if (this.cooldowns.has(cdIdx)) {
			cPack = this.cooldowns.get(cdIdx);
			clearTimeout(cPack.timeout);
		}

		cPack.timeSet = Date.now();
		cPack.seconds = cooldown;
		cPack.timeout = setTimeout( () => {this.cooldowns.delete(cdIdx);}, cooldown * 1000);

		this.cooldowns.set(cdIdx, cPack)

		return cPack;
	}

		// returns time left on cooldown in ms

	//cooldown_check(channel, cmd, comPack, user) {
	cooldown_check(params) {
		var cdIdx = this._cooldown_name(params)

		if (this.cooldowns.has(cdIdx)) {
			let cd = this.cooldowns.get(cdIdx);
			return cd.seconds * 1000 - Date.now() + cd.timeSet;
		}

		return false;
	}

		// generate the cooldown name separators avoid clash with user names
		// I need a remove cooldown

	_cooldown_name({channel, command, category, userstate}) {
		var cdIdx;

		if (category)
			cdIdx = channel + '#' + category;
		else {
			cdIdx = channel + cmd + '|' + userstate.username;
		}
			// wondering if I should set up a different one for mods - yes I will
		if (userstate.mod) {
			cdIdx += ':mod';
		}

		return cdIdx;
	}

}