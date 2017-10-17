import _isFunction from "lodash/isFunction";

import Store from "./store";
import { eachKeyValue } from "./utils";

const RESERVED_KEYS = ["flux", "waitFor"];

function createStore(spec) {
  for (let i = 0; i < RESERVED_KEYS.length; i += 1) {
    const key = RESERVED_KEYS[i];

    if (spec[key]) {
      throw new Error(`Reserved key '${key}' found in store definition`);
    }
  }

  class ConcreteStore extends Store {
    constructor(options = {}) {
      super();

      eachKeyValue(spec, (key, value) => {
        if (key === "actions") {
          this.bindActions(value);
        } else if (key === "initialize") {
          // do nothing
        } else if (_isFunction(value)) {
          this[key] = value.bind(this);
        } else {
          this[key] = value;
        }
      });

      if (spec.initialize) {
        spec.initialize.call(this, options);
      }
    }
  }

  return ConcreteStore;
}

export default createStore;
