// Twitch-Tools version
const TT_DEBUGGING = true;
tt_log = TT_DEBUGGING ? console.log : () => {};


docReady(init);


function init() {
	tt_log("Twitch Tools Javascript ok");

	init_dropdowns();
	init_modals();
	init_tabs();
	init_mobile_view_buttons();
	init_delete_buttons();

	return;	// there, I did it all natively
}

	// nothing to this

function init_dropdowns() {
	var dropDowns = document.querySelectorAll('.dropdown:not(.is-hoverable)');
	dropDowns.forEach(dd => {
		var dButton = dd.querySelector('button');

		dd.addEventListener('click', target => {
			dd.classList.toggle('is-active');
		});
	});
}

	// adding 'is-clipped' to html tag stops background scrolling.
	// .modal-dismiss can be added to anything to make it close the modal

function init_modals() {
	let triggers = document.querySelectorAll('.modal-trigger');
	let modals = [...document.getElementsByClassName('modal')];	// and arrays allow forEach, too.

	let h = document.getElementsByTagName('html')[0];
		// get modal ids from the data-target of buttons
	triggers.forEach( btn => {
		let modal = document.getElementById(btn.dataset.target);
		btn.addEventListener('click', () => {
			modal.classList.add('is-active');
			h.classList.add('is-clipped');	// stops background scrolling with mouse
		})
	})
		// attach close events to all the kids
	modals.forEach((modal) => {	// normally I dismiss on .modal-background but let's allow choice
		let addClose = modal.querySelectorAll('.modal-dismiss, .modal-close, .modal-card-head .delete');

		addClose.forEach(closeMe => {
			closeMe.addEventListener('click', () => {modal.classList.remove('is-active'); h.classList.remove('is-clipped');})
		})
	});
}


	/**
	 * Inits tabs in panels and regular tab sets
	 * Tab sets with the same data-target will be synced, tab sets with the same selector will be linked
	 * data targets must be a selector like #tabsetId or .has-class
	 *
	 * Note - it is up to you to make sure tabsets and their controlled content have the same number of
	 * .tab-pane to tabs.  Tabs activate by postion so if you move a tab or pane, rename the tabs
	 * - with simplicity comes danger.
	 */

function init_tabs() {
	let tabGroups = _discover_tabsets();

	if (Object.keys(tabGroups).length === 0)
		return;

	tt_log("Tab groups: ", tabGroups);

	/*	GROUPS {
			name : {
				sets: [setOfLis, setOfLis, setOf...]
				panes: nodes, can be many .tab-pane from different panels
			}
		}*/

	for( group in tabGroups ) {
		tt_log('group:', group);
			// go over each set adding a click - the click also has to reiterate over the groups
		let subSets = tabGroups[group].sets;
		let paneSet = tabGroups[group].panes;

		subSets.forEach( tabSet => {
			let tabSetLen = tabSet.length;

			tabSet.forEach( (tab, clickedTabIndex) => {

				tab.addEventListener('click', (e) => {
						// each group can have tabs controlling a number of panes, or multiple tab sets controlling one pane, group = {(}sets: [subset1, subset2, ...], panes: [paneset1, paneset2]}
					subSets.forEach( (tset) => {
						tset.forEach( (tab, index) => {
							if (index === clickedTabIndex) {
								tab.classList.add('is-active');
							} else {
								tab.classList.remove('is-active');
							}
						});
							// now the same for the panes using a filthy trick
						paneSet.forEach( (pane, pIdx) => {
							if ((pIdx%tabSetLen) === clickedTabIndex) { // <-- if you mess up, this might be why.  You had X tabs and Y panes and X != Y
								pane.classList.add('is-active');
							} else {
								pane.classList.remove('is-active');
							}
						});
					});
				});
			});
		});
	}	// for groups ends
}

	// helper for init_tabs

function _discover_tabsets() {
	var tabSets = document.querySelectorAll('.tabs, .panel-tabs')

	var targetSets = {};// setName : { sets[], targetPanes } many tabsets might be grouped
		// group the tabsets by target and check their target exists
	tabSets.forEach( tabSet => {
		let ttarget = tabSet.dataset.target;

		if (!ttarget) {
			tt_log('No tab target defined for tab set');  return;
		}

		let targetPanes = document.querySelectorAll(ttarget + ' .tab-pane');

		if (!targetPanes.length) {
			tt_log("Target panes don't exist for ", ttarget + ' .tab-pane');	return;
		}
			// .tabs uses li, .panel-tabs uses a
		var selector = tabSet.classList.contains('tabs') ? 'li' : 'a';
		var actualTabs = tabSet.querySelectorAll(selector);
			// add the group to the targetSets object
		if (!targetSets[ttarget])
			targetSets[ttarget] = {sets: [], panes: targetPanes}

		targetSets[ttarget].sets.push(actualTabs);
	});

	return targetSets;
}


	// this looks for all buttons and adds the confirm thingy

function button_add_confirmed_func(query, func, seconds = 3) {
	var cButs = document.querySelectorAll(query);
										//console.log("Found for", query, cButs);
	cButs.forEach(btn => {
		//	console.log(btn.innerHTML);
		let btnTxt = btn.innerHTML;
		let countdown = seconds;
		let toggle = 1;
		let confirmCountdownUnderway = false;
		let bWidth = btn.offsetWidth;
		let maxWidth = bWidth;
		let btnInterval;	// setInterval

		let resetBtn = () => {
			clearInterval(btnInterval);
			confirmCountdownUnderway = false;
			countdown = seconds;
			btn.innerHTML = btnTxt;
			// btn.style.width = bWidth+'px';	// comment to leave at new size
		}
			// add click event

		btn.onclick = async () => {
			if (confirmCountdownUnderway) {	// carry out the callback if we're in the countdown
				func();
				resetBtn();
				return;
			}

			confirmCountdownUnderway = true;

			btnInterval = setInterval( (function() {
				if (countdown === 0) {
					resetBtn();
					return;
				}
					//console.log('width from style: ', btn.style.width)
				let c = `Confirm ${countdown}`;
				countdown--;

				btn.innerHTML = c;
				//toggle = !toggle;

				if (btn.offsetWidth > maxWidth) {
					maxWidth = btn.offsetWidth;
				} else if (btn.offsetWidth < maxWidth) {
					btn.style.width = maxWidth + 'px';
				}
					// function is immediately invoked and returns itself to the interval
				return arguments.callee;
			})(), 1000 );
		}
	});	// end of cbutsForeach
}

	// set up mobile view buttons

function init_mobile_view_buttons() {
	let mobileViewOn = 0;

	let btns = document.querySelectorAll('.mobile-view-btn');
	let mobViewItems = document.querySelectorAll('.not-mobile-view, .navbar');

		// I could add is-hidden but immediately thought .hidden-mobile
	btns.forEach(btn => {
		btn.addEventListener('click', () => {
			mobileViewOn = !mobileViewOn;

			if (mobileViewOn) {	// was is-hidden-mobile
				mobViewItems.forEach(i => i.classList.add('is-hidden'));
			} else {
				mobViewItems.forEach(i => i.classList.remove('is-hidden'));
			}
		});
	});
}

	// delete buttons have a data target selector

function init_delete_buttons() {
	var delBtns = qsa('button.delete');

	delBtns.forEach( btn => {
		//if (btn.dataset?.target) {
		if (btn.dataset && btn.dataset.target) {
			let targets = qsa(btn.dataset.target);
			if (targets.length) {
				btn.addEventListener('click', () => {
					targets.forEach(t => t.classList.add('is-hidden'));
				})
			}
		}
	});
}

	// **************** HELPERS ***************** //

function docReady(fn) {
    // see if DOM is already available
    if (document.readyState === "complete" || document.readyState === "interactive") {
        // call on next available tick
        setTimeout(fn, 1);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

function qsa(query, el=document) {
	return [...el.querySelectorAll(query)];
}

function gid(id, el = document) {
    return el.getElementById(id);
}

	// colours for console output

var funcs = { r, g, b, w, c, m, y, k } = [ ['r', 1], ['g', 2], ['b', 4], ['w', 7], ['c', 6], ['m', 5], ['y', 3], ['k', 0] ]
.reduce(// wtf is going on, why the brackets?
	(cols, col) => ( {...cols,  [col[0]]: f => `\x1b[1m\x1b[3${col[1]}m${f}\x1b[0m`} )
	, {}
);


function sleep(ms) {		// sleep(200).then(...)
	return new Promise(res => {
		setTimeout(res, ms)
	});
}