/**
 * Class to construct / insert / select /react to changes on a select
 *
 *
 */

let dce = x => document.createElement(x);

export default class Select {

    #id = null;  // html id of the element
    #selectNode = null;

    selectedValue = null;
    staySelected = true;    // if the entries change keep the selected value

    sortByText = false;      //
    sortByValues = false;   //

        // any events that might be tied to the select
    events = [];


    constructor(id = null) {
        if (id !== null)
            this.id = id;
    }

        // if the id is of an existing element it

    set id(val) {
        let selNode = gid(val);
        console.log("SETTING select id to ", val, selNode);

        // check if selNode's constructor is HTMLSelectElement

        if (selNode) {
            if (selNode.constructor !== HTMLSelectElement) {
                console.warn(`Select class WARNING: The element with the id "${val}" is not a select element.  It is ${selNode.constructor}`)
            }
            this.#selectNode = selNode;
            this.selectedValue = this.get_val(val);
        } else {
            this.#selectNode = dce("select");
            this.#selectNode.id = val;
        }
            // set as it may be created later
        this.#id = val;
    }

    get id() {
        return this.#id;
    }


    // select by index, select by text?

        // set to a selected value
    select_val(val) {
        let opts = this.#selectNode ?.options ?? gid(this.#id)?.options ?? null;

        if (!opts) return false;

        for (let opt of opts) {
            if (opt.value === val) {
                opt.selected = true;
                return true;
            }
        }

        return false;
    }

        // get selected value
    get_val(value = null) {
        let select = this.#selectNode ?? gid(this.#id) ?? null;
        this.selectedValue = select?.selectedIndex >= 0 ? select.options[select.selectedIndex].value : null;
        return this.selectedValue;
    }
        // alias for get_val
        value = this.get_val;

    has_val(value) {
        let select = this.#selectNode ?? gid(this.#id) ?? null;
        if (select === null) return false;
        for (let opt of select.options) {
            if (opt.value === value)
                return true;
        }
        return false;
    }

    // get selected text
    get_text = function get_select_text() {
        let select = this.#selectNode ?? gid(this.#id) ?? null;
        return select?.selectedIndex >= 0 ? select.options[select.selectedIndex].text : null;
    }

    text = this.get_text;

        // CUT AND PASTE so needs changing
        // *param object key -> value
        // array of key/value pairs [ [key, value], [key,value], ...  ]
        // array of single values

        // if it already exists.... pffft

    create(options = [], noReplace = false) {
        if (!this.#id.toString().length) {
            console.error("ERROR: Can't create a select with no id");
            toast("Set an id for the select first", "is-error", 8000);
            return false;
        }

        let sel = document.createElement('select');
        sel.id = this.#id;

        let opts = this.create_options(options);
        if (opts) {
            sel.replaceChildren(...opts);
        }

        if (noReplace === false) this.#selectNode = sel;

        return sel;
    }

        // select with our id must exist

    replace_options(options) {
        if (!this.#selectNode) {
            this.#id = this.#id;
            if (!this.#selectNode) {
                toast("Can't replace options on select with id: " + this.#id, "is-danger", 8000);
                console.error("ERROR replace_options error on select with id: " + this.#id);
                return false;
            }
        }
            // selected may carry over
        this.selectedValue = this.get_val();

        let opts = this.create_options(options);

        if (opts) {
            this.#selectNode.replaceChildren(...opts);
        }
// console.log("OPTIONS", opts);
        this.selectedValue = this.get_val();

        return true;
    }

        /**
         *
         * @param {Array, object, map} options
         * @returns bool
         */

    create_options(options = []) {
        //console.log("Create options received:", options);
        // ensure opts is [[key,val], [key,val], [key,val]]
        if (Array.isArray(options)) {  // if single values, not pairs then create pairs
            options = [...options] ; // create a copy so we don't affect the passed array

            for (let idx = 0; idx < options.length; idx++) {
                if (options[idx] instanceof Array) {
                    if (options[idx].length < 2) { // array of arrays but they're singular - weird
                        options[idx] = [options[idx][0], options[idx][0]];
                        console.log("Maiking [0, 1]", options[idx][0]);
                    } else {    // a single value, make the text the value
                        //console.log("It's a pair length", options[idx].length, options[idx][0], options[idx][1] );
                        let extra = options[idx].length > 2 ? options[idx][2] : {}
                        options[idx] = [options[idx][0], options[idx][1], extra];
                    }
                } else {
                    options[idx] = [options[idx], options[idx]];
                }
            }
            //options = opts;
        } else if (options?.constructor === Object) {    //console.log("IIIIIIIIIIIIIIIIIT's an OBJECT", options);
            options = Object.keys(options).map(k => [k, options[k]]);
        } else if (options?.constructor === Map) {       //console.log("IIIIIIIIIIIIIIIIIT's an MAPPPP", options);
            options = options.entries().toArray();
        } else {
            console.error("Select.create_options() passed neither an object nor array", options);
            return false;
        }

        // console.log("OPTIONS FOR CREATE:", options);

        let opts = [];
        // let o1 = dce("option");
            // an initial value.  We could add this to the class
        //o1.text = "Choose"; o1.value="";
        //.push(o1);
            // alpha sort the object's keys
        if ( this.sortByText ) {
            options.sort( (a,b) => a[1].toString().localeCompare(b[1].toString()) );
        } else if ( this.sortByValues ) {
            options.sort( (a,b) => a[0].localeCompare(b[0]) );
        }

        for (let o of options) {
            let extra = o.length > 2 ? o[2] : {}
            let opt = this.create_option(o[0], o[1], extra);

            if (this.staySelected && opt.value === this.selectedValue) opt.selected = 'selected';
            opts.push(opt);
        }

        return opts;
    }


    create_option(val, text, dataset = {}) {
        // console.log("create_option received", val, text, dataset);
        let opt = dce("option");
        opt.value = val; opt.text = text;
        if (Object.keys(dataset).length) {
            Object.assign(opt.dataset, dataset);
        }

        return opt;
    }


        // adds an option.  Extras are properties that will be added to the option
        // obeys this.sortByVal or sortByText

    add(val, text, dataset = {}) {
        if (val === undefined || text === undefined) {
            console.error("Select.add() given bad things., val, text")
            return false;
        }

        let opt = this.create_option(val, text, dataset);

            // null defaults to end
        let insertIndex = null;
        let opts = this.#selectNode.options;
            // sorted ? Brute force the index rather than binary division
        if (this.sortByText) {  // would this really be useful as a smaller func get_insert_index(...
            for (insertIndex = 0 ; insertIndex < opts.length ; insertIndex++) {
                if ( opts[insertIndex].text.toString().localeCompare(text) >= 0) {
                    break;
                }
            }
        } else if (this.sortByValues) {
            for (insertIndex = 0 ; insertIndex < opts.length ; insertIndex++) {
                if ( opts[insertIndex].value.toString().localeCompare(val) >= 0) {
                    break;
                }
            }
        }

        this.#selectNode.options.add(opt, insertIndex);
    }

        /**
         *
         * @param {any} value to compare
         * @param {select element, options collection, id of a select or null} options options to search through, default = use ours
         */

    disable_by_value(val, options = null) {
        options = this.options_validate(options);

        if (options === false) return;

        for(let opt of options) {
            if (opt.value === val) {
                opt.disabled = true;
            }
        }
    }

    enable_by_value(val, options = null) {
        options = this.options_validate(options);

        if (options === false) return;

        for(let opt of options) {
            if (opt.value === val) {
                opt.disabled = false;
            }
        }
    }

        // last param moonlights it to remove by text
    remove_by_value(val, limit = null, byText = false) {
        let removed = 0;

        let options = this.options_validate();

        if (options === false) return false;

        let selectedIndex = this.#selectNode.selectedIndex;
        let index = 0;

        for (let opt of options) {
            if (limit !== null && remove >= limit) break;

            let compare = byText === false ? opt.value : opt.text

            if (compare === val) {
                opt.remove();   // hopefully won't cause issues
                removed++;
                    // if an entry has been pulled under us reduce the selected index
                    // selected index goes to zero when the option is removed
                if (index < selectedIndex) selectedIndex--;
            }

            index++;
        }

            // restore the selected index
        let optsLen = this.#selectNode.options.length;
        this.#selectNode.selectedIndex = selectedIndex >= optsLen ? optsLen -1 : selectedIndex;

        return removed;
    }

    remove_by_text(text, limit) {
        return this.remove_by_value(text, limit, true);
    }

        /**
         *  Returns valid options for a select element, select options, a select id or this classes select
         * @param {any} value to compare
         * @param {select element, options collection, id of a select or null} options options to search through, default = use ours
         */

    options_validate(options) {
        if (options === null || options === undefined) {
            options = this.#selectNode?.options;    // I should check
        }

        if (options?.constructor !== HTMLOptionsCollection) {
            if (options?.constructor === HTMLSelectElement ) {
                return options.options;
            } else
            if (options?.constructor === String) {
                let o = gid(options)?.options;
                if (o === undefined) {
                    return false;
                }
                return o;
            } else {
                console.error("Select.options_validate() has no valid options source");
                toast("Select.options_validate()  has no valid options source.", "is-danger", 8000);
                return false;
            }
        }

        return options;
    }

    trigger_onchange() {
        let chEv = new Event('change');
        this.#selectNode.dispatchEvent(chEv);
    }

        // gets the "HTML" for dom insertion

    get_dom_node() {
        return this.#selectNode;
    }

    on(event, fn) {
        this.#selectNode.addEventListener(event, fn);
    }

    focus() {
        this.#selectNode?.focus();
    }
}