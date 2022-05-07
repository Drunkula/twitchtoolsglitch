
	// add to the global pile
TMIConfig.mutedCooldownSecsRemaining = 180;
TMIConfig.mutedCooldownDefaultSeconds = 180;

let cooldownDiv, cooldownSecsDiv;

docReady( () => {
	init_cooldown_time_inc_buttons()

	cooldownSecsDiv = gid('cooldowncountdown');
	cooldownDiv = gid('cooldownoutput')

	setInterval(muted_cooldown_interval_timer, 50);// want 1000 in real use
});


function init_cooldown_time_inc_buttons() {
	var btns = qsa('.cooldown-set');

	btns.forEach( (btn) => {
		let addS = btn.dataset['add'];

		if (addS === "clear") {
			btn.onclick = () => {
				console.log("Clearing timeout");	// imagine their should be a function here
				TMIConfig.mutedCooldownSecsRemaining = 0;
			}
		}
		else {
			btn.onclick = () => {
				console.log('adding mini', addS,'to', TMIConfig.mutedCooldownSecsRemaining);
				TMIConfig.mutedCooldownSecsRemaining += ~~addS;	// integerise, otherwise it acts as a string
			}
		}
	})
}


let myLastIntOutput = null;

function muted_cooldown_interval_timer() {
	if (TMIConfig.mutedCooldownSecsRemaining >= 0) {

		let out = '';

		if (TMIConfig.mutedCooldownSecsRemaining <= 60) {
			out = TMIConfig.mutedCooldownSecsRemaining;
		}
		else {
			out = Math.round(TMIConfig.mutedCooldownSecsRemaining / 60) + 'm';
		}
			// was for accurate bug testing
	//	cooldownSecsDiv.innerHTML = TMIConfig.mutedCooldownSecsRemaining;

		if (myLastIntOutput != out)
			cooldownSecsDiv.innerHTML = out;

		myLastIntOutput = out;	// don't keep changing if it's on minutes

		TMIConfig.mutedCooldownSecsRemaining--;

		return;
	}

	cooldownSecsDiv.innerHTML = 'Done';
}