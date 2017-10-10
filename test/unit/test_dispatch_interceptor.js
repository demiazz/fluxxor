var Fluxxor = require("../../"),
  JSDOM = require("jsdom").JSDOM;

var chai = require("chai"),
  expect = chai.expect;

var Store = Fluxxor.createStore({
  actions: {
    ACTIVATE: "handleActivate",
    LOAD_INITIAL_VALUE: "handleLoadInitialValue"
  },

  initialize: function() {
    this.activated = false;
    this.value = null;
  },

  handleActivate: function() {
    this.activated = true;
    this.emit("change");
  },

  handleLoadInitialValue: function() {
    this.value = "testing";
    this.emit("change");
  }
});

var actions = {
  activate: function(callback) {
    setTimeout(
      function() {
        try {
          this.dispatch("ACTIVATE");
          callback();
        } catch (ex) {
          if (ex instanceof chai.AssertionError) {
            throw ex;
          } else {
            callback(ex);
          }
        }
      }.bind(this)
    );
  },

  loadInitialValue: function() {
    this.dispatch("LOAD_INITIAL_VALUE");
  }
};

describe("Dispatch interceptor", function() {
  var React, TestUtils;
  var flux, App, ComponentA, ComponentB;

  beforeEach(function() {
    var jsdom = new JSDOM("<html><body></body></html>");
    global.window = jsdom.window;
    global.document = global.window.document;
    global.navigator = global.window.navigator;
    React = require("react/addons");
    TestUtils = React.addons.TestUtils;

    flux = new Fluxxor.Flux({ store: new Store() }, actions);

    App = React.createFactory(
      React.createClass({
        displayName: "App",
        mixins: [Fluxxor.FluxMixin(React), Fluxxor.StoreWatchMixin("store")],

        getStateFromFlux: function() {
          return {
            activated: this.getFlux().store("store").activated
          };
        },

        render: function() {
          return React.DOM.div({}, this.renderChild());
        },

        renderChild: function() {
          if (!this.state.activated) {
            return ComponentA();
          } else {
            return ComponentB();
          }
        }
      })
    );

    ComponentA = React.createFactory(
      React.createClass({
        displayName: "ComponentA",
        mixins: [Fluxxor.FluxMixin(React)],

        render: function() {
          return React.DOM.div();
        }
      })
    );

    ComponentB = React.createFactory(
      React.createClass({
        displayName: "ComponentB",
        mixins: [Fluxxor.FluxMixin(React), Fluxxor.StoreWatchMixin("store")],

        getStateFromFlux: function() {
          return {
            value: this.getFlux().store("store").value
          };
        },

        componentWillMount: function() {
          this.getFlux().actions.loadInitialValue();
        },

        render: function() {
          return React.DOM.div();
        }
      })
    );
  });

  afterEach(function() {
    delete global.window;
    delete global.document;
    delete global.navigator;
  });

  it("doesn't intercept by default", function(done) {
    TestUtils.renderIntoDocument(App({ flux: flux }));
    flux.actions.activate(function(err) {
      expect(err).to.match(/dispatch.*another action/);
      done();
    });
  });

  it("allows intercepting", function(done) {
    flux.setDispatchInterceptor(function(action, dispatch) {
      React.addons.batchedUpdates(function() {
        dispatch(action);
      });
    });

    TestUtils.renderIntoDocument(App({ flux: flux }));
    flux.actions.activate(function(err) {
      expect(err).to.be.undefined;
      done();
    });
  });

  it("allows nested interceptors", function(done) {
    var dispatches = 0;
    flux.setDispatchInterceptor(function(action, dispatch) {
      dispatches++;
      React.addons.batchedUpdates(function() {
        dispatch(action);
      });
    });

    TestUtils.renderIntoDocument(App({ flux: flux }));
    flux.actions.activate(function(err) {
      expect(err).to.be.undefined;
      expect(dispatches).to.eql(2);
      done();
    });
  });

  it("allows completely custom interceptors", function(done) {
    var dispatches = 0;
    flux.setDispatchInterceptor(function() {
      dispatches++;
    });

    TestUtils.renderIntoDocument(App({ flux: flux }));
    flux.actions.activate(function(err) {
      expect(err).to.be.undefined;
      expect(dispatches).to.eql(1);
      done();
    });
  });
});
