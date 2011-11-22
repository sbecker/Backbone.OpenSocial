// Depends on Underscore.js

var opensocial = {
    "EscapeType": {
        "HTML_ESCAPE": "htmlEscape",
        "NONE": 'none'
    }
};

var osapi = {};
osapi.appdata = {
    _userId: 2002, // fake out current user id
    _appdata: {},  // in memory key/value store
    _error: null,

    get: function(options) {
        return this._generateExecuteMethod(function() {
            options = options || {};
            var data = {};
            var fields = options.fields || [];
            if(fields.length > 0) {
                _.each(fields, function(field) {
                    if(typeof osapi.appdata._appdata[field] != 'undefined') {
                        data[field] = osapi.appdata._appdata[field];
                    }
                });
            } else {
                data = _.clone(osapi.appdata._appdata);
            }

            // create userId nested result object
            var result = {};
            result[osapi.appdata._userId] = data;

            return result;
        });
    },

    update: function(options) {
        return this._generateExecuteMethod(function() {
            options = options || {};
            var data = options.data || {};
            _.each(_.keys(data), function(key) {
                osapi.appdata._appdata[key] = data[key];
            });

            return {};
        });
    },

    "delete": function(options) {
        return this._generateExecuteMethod(function() {
            options = options || {};
            var keys = options.keys || [],
                result = {};

            _.each(keys, function(key) {
                if(typeof osapi.appdata._appdata[key] != 'undefined') {
                    result[key] = osapi.appdata._appdata[key];
                    delete osapi.appdata._appdata[key];
                }
            });

            return result;
        });
    },

    _generateExecuteMethod: function(request) {
        return {
            execute: function(callback) {
                if(osapi.appdata._error) {
                    callback({error: osapi.appdata._error});
                } else {
                    callback(request());
                }
            }
        };
    }

};