

    // shows a toast message
    // https://animate.style/
function toast(message, type="is-info", duration = 4000, extras = {}) {
    bulmaToast.toast({ message, type, duration, ...extras });
}

window.toast = toast;

function toast_raw(d) {
    bulmaToast.toast(d);//, animate: {in: "backInLeft", out: "fadeOutBottomLeft"} });
}

bulmaToast.setDefaults({ animate: {in: "backInLeft", out: "fadeOutBottomLeft"}, duration: 4000 });
window.toast_raw = toast_raw;


window.get_select_val = function get_select_val(id) {
    let select = gid(id);
    return select.selectedIndex >= 0 ? select.options[select.selectedIndex].value : null;
}
window.get_select_text = function get_select_text(id) {
    let select = gid(id);
    return select.selectedIndex >= 0 ? select.options[select.selectedIndex].text : null;
}

// table rows have first cell with a checked checkbox
// first child is a header so don't go before

function move_table_rows(tableid, direction="up") {
    let tbl = gid(tableid);
    // OBS browser strikes again let rows = qsa(`#${tableid} tr:has(input:checked):not(:first-child)`);
    let rows = [];
    let cbxs = qsa(`#${tableid} input:checked`);
    cbxs.forEach(x => {
        let r = x.parentNode.parentNode;
        if (r.dataset['videoid']) rows.push(r);
    });

    if (direction === "top") {
        tbl.firstChild.scrollIntoView({behavior: "smooth", block:"end", inline:"start"})
    }
    else if (direction === "bottom") {
        tbl.lastChild.scrollIntoView({behavior: "smooth", block:"end", inline:"start"})
    }

    if (!rows.length) return false;

    switch(direction) {
        case "up":
            if (rows[0].previousSibling === tbl.firstChild) {            // have reached the header
                rows[0].previousSibling.after(...rows);
            } else {
                rows[0].previousSibling.before(...rows);
            }
            rows[0].scrollIntoView({behavior: "smooth", block: "nearest", inline: "start"});
            break;
        case "down":
            let last = rows.length - 1;
            if (rows[last].nextSibling) {
                rows[last].nextSibling.after(...rows);
            } else {
                rows[last].after(...rows);
            }
            rows[last].scrollIntoView({behavior: "smooth", block: "nearest", inline: "start"});
            break;
        case "top":
            tbl.firstChild.after(...rows);
            break;
        case "bottom":
            tbl.lastChild.after(...rows);
            break;
    }

    return true;
}

window.mtr = move_table_rows;

export {move_table_rows};