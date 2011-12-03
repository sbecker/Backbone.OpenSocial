window.AppDataStore = function(name) {
    var that = this;
    this.name = name;
    this.ids  = [];
    this.previouslyFetchedFromPipeline = false;

    osapi.appdata.get({
        fields:     [this.name],
        escapeType: opensocial.EscapeType.NONE
    }).execute(function(response){
        if(response.error) {
            // TODO: make sure console object exists
            console.log("Error " + response.error.code + " retrieving application data: " + response.error.message);
        } else if(response && _.keys(response).length == 1) {
            var userId = _.keys(response)[0];             // appdata for a user is stored nested under an object with the user's id as the name: {"<user-id>": {"<key-you-requested>":"value"}}
            var data   = response[userId][that.name];     // get at the actual data
            that.ids   = (typeof data != 'undefined' && data.split(",")) || []; // split the comma delimited string of IDs into a JS array
        } else {
            that.ids = []; // something else happened, assume no records exist
        }
    });

};

window.AppDataStore.Util = {

    // Generate four random hex digits.
    S4: function() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    },

    // Generate a pseudo-GUID by concatenating random hexadecimal.
    guid: function() {
        var S4 = AppDataStore.Util.S4;
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    }

};

_.extend(AppDataStore.prototype, {
    updateIds: function() {
        // Convert IDs to key/value JSON
        var data = {};
        data[this.name] = this.ids.join(",");

        // Update appdata with IDs
        osapi.appdata.update({data: data}).execute(function(response){
            if(response.error) {
                console.log("Error " + response.error.code + " updating application data: " + response.error.message);
            }
        });
    },

    updateModel: function(model, options) {
        options = this._defaultOptions(options);

        // Give model a (hopefully)-unique GUID, if it doesn't already
        if (!model.id) model.id = model.attributes.id = AppDataStore.Util.guid();

        // Convert model to key/value JSON
        var data = {};
        data[this.name + "-" + model.id] = JSON.stringify(model.toJSON());

        // Update appdata with model data
        osapi.appdata.update({data: data}).execute(function(response){
          if(response.error) {
            options.error("Error " + response.error.code + " updating application data: " + response.error.message);
          } else {
            options.success(response);
          }
        });

        // Update ID store if it doesn't already contain this model's ID
        if (!_.include(this.ids, model.id.toString())) {
          this.ids.push(model.id.toString());
          this.updateIds();
        }
    },

    // Add a model. Same as update(). Here for Backbone API compatiblity
    create: function(model, options) { this.updateModel(model, options); },

    // Update a model. Same as add(). Here for Backbone API compatiblity
    update: function(model, options) { this.updateModel(model, options); },

    // Retrieve a model by id.
    find: function(model, options) {
        options  = this._defaultOptions(options);
        var that = this;

        osapi.appdata.get({
            fields:     [this.name + "-" + model.id],
            escapeType: opensocial.EscapeType.NONE
        }).execute(function(response) {
            if(response.error) {
                options.error("Error " + response.error.code + " retrieving model: " + response.error.message);
            } else if(response && _.keys(response).length == 1) {
                var userId = _.keys(response)[0];
                var data   = response[userId][that.name + '-' + model.id];

                if(typeof data == 'undefined') {
                    options.error("Model not found.");
                } else {
                    var object = JSON.parse(data);
                    options.success(object);
                }
            } else {
                options.error("Model not found.");
            }
        });
    },

    // Return the array of all models currently in storage.
    findAll: function(options) {
        options = this._defaultOptions(options);
        var that = this;

        // build up a list of all the model keys, so we can find all in one request
        var modelKeys = _.map(this.ids, function(id){return that.name + "-" + id; });

        // Use data pipelined data if available
        if(this.isPipelined()) {
            options.success(this.findAllByPipeline());
            return;
        }

        osapi.appdata.get({
            fields:     modelKeys,
            escapeType: opensocial.EscapeType.NONE
        }).execute(function(response) {
            if(response.error) {
                options.error("Error " + response.error.code + " retrieving model: " + response.error.message);
            } else if(response && _.keys(response).length == 1) {
                var userId  = _.keys(response)[0];

                // convert each stringified JSON object back into JavaScript and return as an array
                var objects = _.map(modelKeys, function(modelKey) { return JSON.parse(response[userId][modelKey]);} )
                options.success(objects);
            } else {
                options.error("Models not found.");
            }
        });
    },

    // Delete a model from app data, returning it.
    destroy: function(model, options) {
        options = this._defaultOptions(options);

        // Remove model from AppData
        osapi.appdata['delete']({ // use bracket syntax because some browsers think "delete is a keyword"
            keys: [this.name + "-" + model.id] // osapi.appdata.delete() uses "keys" instead of "fields" like osapi.appdata.get()
        }).execute(function(response) {
            if(response.error) {
                options.error("Error " + response.error.code + " destroying model: " + response.error.message);
            } else {
                options.success(model);
            }
        });

        // Update ID store, removing this model's ID
        if (_.include(this.ids, model.id.toString())) {
            this.ids.push(model.id.toString());
            this.ids = _.reject(this.ids, function(id){return id == model.id.toString();});
            this.updateIds();
        }
    },

    isPipelined: function() {
        if(this.previouslyFetchedFromPipeline == true) return false;
        if(typeof opensocial == 'undefined' || typeof opensocial.data == 'undefined') return false;
        var dataContext = opensocial.data.getDataContext();
        if(typeof dataContext.getDataSet("viewer") == 'undefined' || typeof dataContext.getDataSet("appdata") == 'undefined') return false;
        var viewer  = dataContext.getDataSet("viewer");
        var appdata = dataContext.getDataSet("appdata");
        if(typeof appdata[viewer.id][this.name] == 'undefined') {
            return false;
        } else {
            return true;
        }
    },

    findAllByPipeline: function() {
        var that = this;

        var dataContext = opensocial.data.getDataContext();
        var viewer      = dataContext.getDataSet("viewer");
        var appdata     = dataContext.getDataSet("appdata");

        // parse initial feed data out of data pipelined data
        var idsString = appdata[viewer.id][this.name];
        var ids       = (typeof idsString == 'undefined' || idsString == "") ? [] : idsString.split(',');
        ids = _.reject(ids, function(id) { return id == "" }); // eliminate any empty string ids
        var objects   = _.map(ids, function(id) {
            return JSON.parse(appdata[viewer.id][that.name + "-" + id]);
        });
        this.previouslyFetchedFromPipeline = true;
        return objects;
    },

    _defaultOptions: function(options) {
        options = options || {};
        options.success = options.success || function() {};
        options.error   = options.error   || function() {};
        return options;
    },

});

// Override `Backbone.sync` to use delegate to the model or collection's
// *appDataStorage* property, which should be an instance of `AppDataStore`.
Backbone.sync = function(method, model, options, error) {

    // Backwards compatibility with Backbone <= 0.3.3
    if (typeof options == 'function') {
        options = {
            success: options,
            error: error
        };
    }

    var store = model.appDataStorage || model.collection.appDataStorage;


    switch (method) {
        case "read"   : model.id ? store.find(model, options) : store.findAll(options); break;
        case "create" : store.create(model, options);                                   break;
        case "update" : store.update(model, options);                                   break;
        case "delete" : store.destroy(model, options);                                  break;
    }

};
