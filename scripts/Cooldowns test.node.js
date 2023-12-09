console.log("\x1bc");
(() => {
	let _f = { r, g, b, w, c, m, y, k } = [ ['r', 1], ['g', 2], ['b', 4], ['w', 7], ['c', 6], ['m', 5], ['y', 3], ['k', 0] ]
		.reduce( (cols, col) => ( {...cols,  [col[0]]: f => `\x1b[1m\x1b[3${col[1]}m${f}\x1b[0m`} ), {});
})();

let sp = require('./Cooldowns.class');

console.log("SP, sp");

let cools = new Cooldown();

console.log("Cools : ", cools);


let fakeMod = {
	username: "Mr Mod",
	mod: true
}

let fakeUser1 = {
	username: "Std User #1"
}

let fakeUser2 = {
	username: "Std User #TWO"
}

let pack1 = {channel: 'fakechan1', userstate: fakeMod, modCooldown: 3, globalCooldown: 7, userCooldown: 5, command: "!modcommand"}

let pack2 = {channel: 'fakechan1', userstate: fakeUser1, modCooldown: 3, globalCooldown: 8, userCooldown: 5, category: 'aCategory', command: "!dont"}
let pack3 = {channel: 'fakechan1', userstate: fakeUser2, modCooldown: 3, globalCooldown: 6, userCooldown: 5, category: 'aCategory', command: "!matter"}

let pack4 = {channel: 'fakechan1', userstate: fakeUser1, userCooldown: 5, command: "!matters"}
let pack5 = {channel: 'fakechan1', userstate: fakeUser1, userCooldown: 5, command: "!matters"}
let pack6 = {channel: 'fakechan1', userstate: fakeUser1, userCooldown: 5, command: "!DIFFERENT"}

	// BAD PACK
let pack7 = {channel: 'fakechan1', userstate: fakeUser1, userCooldown: 5}

let res;

res = cools.cooldown_check(pack1);
console.log("Exists pack1", res);

//console.log("Setting pack1", pack1);
res = cools.cooldown_set(pack1)

res = cools.cooldown_check(pack1);
console.log("Exists pack1", res);

	// category

res = cools.cooldown_check(pack2);
console.log("Exists pack2", res);

//console.log("Setting pack2", pack1);
res = cools.cooldown_set(pack2)

res = cools.cooldown_check(pack3);
console.log("Exists pack3", res);

	// user single command

res = cools.cooldown_check(pack4);
console.log("Exists pack4", res);

//console.log("Setting pack4", pack4);
res = cools.cooldown_set(pack4)

res = cools.cooldown_check(pack5);
console.log("Exists pack5", res);

res = cools.cooldown_check(pack6);
console.log("Exists pack6", res);

try {
	res = cools.cooldown_check(pack7);
	console.log("Exists pack6", res);
} catch (e) {
	console.log( r("OMLAWD an error : "), e.toString() );
}
