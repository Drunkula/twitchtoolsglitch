

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

function move_table_rows(tableid, up = true) {
    let tbl = gid(tableid);
    let rows = qsa(`#${tableid} tr:has(input:checked):not(:first-child)`);

    if (!rows.length) return false;

    if (up) {
        if (rows[0].previousSibling === tbl.firstChild) {            // have reached the header
            rows[0].previousSibling.after(...rows);
        } else {
            rows[0].previousSibling.before(...rows);
        }
        rows[0].scrollIntoView({behavior: "smooth", block: "center"});
    } else {
        let last = rows.length - 1;
        if (rows[last].nextSibling) {
            rows[last].nextSibling.after(...rows);
        } else {
            rows[last].after(...rows);
        }
        rows[last].scrollIntoView({behavior: "smooth", block: "center"});
    }

    return true;
}

window.mtr = move_table_rows;

export {move_table_rows};