
/**
 * Listeners will get a CustomEvent
 *
 * .detail will contain the data sent out
 * .type will have the event name
 */


export default class Emitter {
    #eventDummy = document.createElement('EmitterFakeDomTarget');

    constructor() {

    }

    emit(event, data) {
        let e = new CustomEvent(event,
            { detail: {
                ...data
            }
        });

        this.#eventDummy.dispatchEvent(e);
    }

    addEventListener(event, fn) {
        this.#eventDummy.addEventListener(event, fn);
    }
    removeEventListener(event, fn) {
        this.#eventDummy.removeEventListener(event, fn);
    }
}