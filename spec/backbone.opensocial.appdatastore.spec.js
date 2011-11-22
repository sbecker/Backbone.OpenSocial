describe("AppDataStore", function() {

    beforeEach(function() {
        this.feedStore = new AppDataStore('feeds');
        osapi.appdata._appdata = {};
        osapi.appdata._error = null;
    });

    it("should exist", function() {
        expect(typeof window.AppDataStore).toEqual('function');
    });

    describe("initialization", function() {

        it("should have a name", function() {
            expect(this.feedStore.name).toEqual('feeds');
        });

        it("should have an array of IDs", function() {
            expect(_.isArray(this.feedStore.ids)).toEqual(true);
        });

        it("should request the feed ids from osapi.appdata", function() {
            spyOn(osapi.appdata, 'get').andCallThrough();
            var fooStore = new AppDataStore('foo');
            expect(osapi.appdata.get).toHaveBeenCalledWith({fields: ['foo'], escapeType: 'none'});
        });

        it("should request the feed ids from osapi.appdata", function() {
            osapi.appdata._appdata = {"foo": "id1,id2,id3"};
            var fooStore = new AppDataStore('foo');
            expect(fooStore.ids).toEqual(['id1', 'id2', 'id3']);
        });

        it("should set its id array to an empty array, if it doesn't exist in appdata", function() {
            osapi.appdata._appdata = {"not-foo": "id1,id2,id3"};
            var fooStore = new AppDataStore('foo');
            expect(fooStore.ids).toEqual([]);
        });

    });

    describe("Utility functions", function() {
        describe("S4", function() {
            it("should generate 4 random hex digits", function() {
                var result = AppDataStore.Util.S4();
                expect(result).toMatch(/^[a-f0-9]{4}$/);
            });
        });

        describe("guid", function() {
            it("should generate a pseudo-GUID XXXXYYYY-XXXX-XXXX-XXXX-XXXXYYYYZZZZ by concatenating random hexadecimal", function() {
                var result = AppDataStore.Util.guid().split('-');
                expect(result.length).toEqual(5);
                expect(result[0]).toMatch(/^[a-f0-9]{8}$/);
                expect(result[1]).toMatch(/^[a-f0-9]{4}$/);
                expect(result[2]).toMatch(/^[a-f0-9]{4}$/);
                expect(result[3]).toMatch(/^[a-f0-9]{4}$/);
                expect(result[4]).toMatch(/^[a-f0-9]{12}$/);
            });
        });
    });

    describe("instance methods", function() {

        describe("updateIds", function() {
            it("should save the id array into osapi appdata as a comma delimited string, with the store's name as the key", function() {
                spyOn(osapi.appdata, 'update').andCallThrough();
                this.feedStore.ids = ['a','b','c'];
                this.feedStore.updateIds();
                expect(osapi.appdata.update).toHaveBeenCalledWith({data: {'feeds': 'a,b,c'}});
                expect(osapi.appdata._appdata['feeds']).toEqual('a,b,c'); // Dependency: Fake OSAPI AppData
            });

            it("should log error to console if one occurred", function() {
                osapi.appdata._error = {code: 404, message: "not found"}; // Dependency: Fake OSAPI AppData
                spyOn(console, 'log').andCallThrough();
                this.feedStore.ids = ['a','b','c'];
                this.feedStore.updateIds();
                expect(console.log).toHaveBeenCalledWith('Error 404 updating application data: not found');
            });
        });

        describe("updateModel", function() {
            beforeEach(function() {
                this.fakeModel = {
                    attributes: {"foo": "bar", "foo2": "bar2"},
                    toJSON: function() { return this.attributes; }
                };
            });

            it("should give the model a unique GUID if it doesn't have one", function() {
                this.feedStore.updateModel(this.fakeModel);
                expect(typeof this.fakeModel.attributes.id).toEqual("string");
            });

            it("should not give the model a unique GUID if it does have one", function() {
                this.fakeModel.id = this.fakeModel.attributes.id = 'already-set';
                this.feedStore.updateModel(this.fakeModel);
                expect(this.fakeModel.id).toEqual("already-set");
                expect(this.fakeModel.attributes.id).toEqual("already-set");
            });

            it("should update appdata with model attribute data as JSON", function() {
                this.feedStore.updateModel(this.fakeModel);
                expect(typeof osapi.appdata._appdata['feeds-' + this.fakeModel.id]).toEqual('string');

                var jsonString = osapi.appdata._appdata['feeds-' + this.fakeModel.id];
                var jsonObj    = JSON.parse(jsonString);
                expect(jsonObj).toEqual(this.fakeModel.attributes);
            });

            it("should call error callback if one occurred", function() {
                var errorSpy = jasmine.createSpy('errorSpy');
                osapi.appdata._error = {code: 500, message: "internal server error"}; // Dependency: Fake OSAPI AppData
                this.feedStore.updateModel(this.fakeModel, {error: errorSpy});
                expect(errorSpy).toHaveBeenCalledWith("Error 500 updating application data: internal server error");
            });

            it("should update the ID store if it doesn't contain this model's ID", function() {
                spyOn(this.feedStore, 'updateIds').andCallThrough();
                expect(this.feedStore.ids).toEqual([]);

                this.feedStore.updateModel(this.fakeModel);

                expect(this.feedStore.updateIds).toHaveBeenCalled();
                expect(this.feedStore.ids).toEqual([this.fakeModel.id]);
            });

            it("should not update the ID store if it does contain this model's ID", function() {
                this.fakeModel.id = this.fakeModel.attributes.id = 'fake-id';
                this.feedStore.ids = [this.fakeModel.id];

                spyOn(this.feedStore, 'updateIds').andCallThrough();
                this.feedStore.updateModel(this.fakeModel);

                expect(this.feedStore.updateIds.callCount).toEqual(0);
                expect(this.feedStore.ids).toEqual([this.fakeModel.id]);
            });
        });

        describe("create", function() {
            it("should call updateModel", function() {
                spyOn(this.feedStore, 'updateModel');
                this.feedStore.create({'foo': 'bar'}, {success: 'fake'});
                expect(this.feedStore.updateModel).toHaveBeenCalledWith({'foo': 'bar'}, {success: 'fake'});
            });
        });

        describe("update", function() {
            it("should call updateModel", function() {
                spyOn(this.feedStore, 'updateModel');
                this.feedStore.update({'foo': 'bar'}, {success: 'fake'});
                expect(this.feedStore.updateModel).toHaveBeenCalledWith({'foo': 'bar'}, {success: 'fake'});
            });
        });

        describe("find", function() {

            beforeEach(function() {
                osapi.appdata._appdata = {
                    'feeds'     : '123',
                    'feeds-123' : '{"foo": "bar", "id": "123"}'
                };
                this.fakeModel = {id: '123'};
            });

            it("should retrieve a model by id from osapi appdata", function() {
                spyOn(osapi.appdata, 'get').andCallThrough();
                this.feedStore.find(this.fakeModel);
                expect(osapi.appdata.get).toHaveBeenCalledWith({fields : [ 'feeds-123' ], escapeType : 'none'});
            })

            it("should call success callback if found", function() {
                var successSpy = jasmine.createSpy('successSpy');
                this.feedStore.find(this.fakeModel, {success: successSpy});
                expect(successSpy).toHaveBeenCalledWith({foo: 'bar', id: '123'});
            });

            it("should call error callback if the id exists in appdata but the model doesn't", function() {
                osapi.appdata._appdata = {'feeds': '123'};

                var errorSpy = jasmine.createSpy('errorSpy');
                this.feedStore.find(this.fakeModel, {error: errorSpy});

                expect(errorSpy).toHaveBeenCalledWith("Model not found.");
            })

            it("should call error callback if model could not be found", function() {
                // mock osapi.appdata.get().execute() so it calls the callback with an empty response object
                spyOn(osapi.appdata, 'get').andReturn({
                    execute: function(callback) { callback({}); }
                });

                var errorSpy = jasmine.createSpy('errorSpy');
                this.feedStore.find(this.fakeModel, {error: errorSpy});

                expect(errorSpy).toHaveBeenCalledWith("Model not found.");
            });

            it("should call error callback if an error occurred in the request", function() {
                osapi.appdata._error = {code: 500, message: 'internal error'};

                var errorSpy = jasmine.createSpy('successSpy');
                this.feedStore.find(this.fakeModel, {error: errorSpy});

                expect(errorSpy).toHaveBeenCalledWith("Error 500 retrieving model: internal error");
            });

        });

        describe("findAll", function() {
            beforeEach(function() {
                this.feedStore.ids = [123,124,125];
                osapi.appdata._appdata = {
                    'feeds'     : '123,124,125',
                    'feeds-123' : '{"foo": "a", "id": "123"}',
                    'feeds-124' : '{"foo": "b", "id": "124"}',
                    'feeds-125' : '{"foo": "c", "id": "125"}'
                };
            });

            it("should retrieve all models by id from osapi appdata", function() {
                spyOn(osapi.appdata, 'get').andCallThrough();
                this.feedStore.findAll();
                expect(osapi.appdata.get).toHaveBeenCalledWith({
                    fields : [ 'feeds-123','feeds-124','feeds-125' ],
                    escapeType : 'none'
                });
            });

            it("should use data pipelined data if available", function() {
                spyOn(this.feedStore, 'isPipelined').andReturn(true);
                spyOn(this.feedStore, 'findAllByPipeline').andReturn("<pipeline-data>");
                var successSpy = jasmine.createSpy('successSpy');
                this.feedStore.findAll({success: successSpy});
                expect(successSpy).toHaveBeenCalledWith('<pipeline-data>');
            });

            it("should call the success callback with an array of objects deserialized from JSON", function() {
                var successSpy = jasmine.createSpy('successSpy');
                this.feedStore.findAll({success: successSpy});
                expect(successSpy).toHaveBeenCalledWith([
                    {foo: 'a', id: '123'},
                    {foo: 'b', id: '124'},
                    {foo: 'c', id: '125'}
                ]);
            });

            it("should call error callback if models could not be found", function() {
                // mock osapi.appdata.get().execute() so it calls the callback with an empty response object
                spyOn(osapi.appdata, 'get').andReturn({
                    execute: function(callback) { callback({}); }
                });

                var errorSpy = jasmine.createSpy('errorSpy');
                this.feedStore.findAll({error: errorSpy});

                expect(errorSpy).toHaveBeenCalledWith("Models not found.");
            });

            it("should call error callback if an error occurred in the request", function() {
                osapi.appdata._error = {code: 500, message: 'internal error'};

                var errorSpy = jasmine.createSpy('errorSpy');
                this.feedStore.findAll({error: errorSpy});

                expect(errorSpy).toHaveBeenCalledWith("Error 500 retrieving model: internal error");
            });
        });

        describe("destroy", function() {
            beforeEach(function() {
                this.feedStore.ids = [123,124,125];
                osapi.appdata._appdata = {
                    'feeds'     : '123,124,125',
                    'feeds-123' : '{"foo": "a", "id": "123"}',
                    'feeds-124' : '{"foo": "b", "id": "124"}',
                    'feeds-125' : '{"foo": "c", "id": "125"}'
                };
                this.fakeModel = {foo: 'a', id: '123'};
            });

            it("should call osapi.appdata.delete with the key of the model to delete", function() {
                spyOn(osapi.appdata, 'delete').andCallThrough();
                this.feedStore.destroy(this.fakeModel);
                expect(osapi.appdata['delete']).toHaveBeenCalledWith({
                    keys: [ 'feeds-123' ],
                });
            });

            it("should return the model if delete was successful", function() {
                var successSpy = jasmine.createSpy('successSpy');
                this.feedStore.destroy(this.fakeModel, {success: successSpy});
                expect(successSpy).toHaveBeenCalledWith({foo: 'a', id: '123'});
            });

            it("should call error callback if an error occurred in the request", function() {
                osapi.appdata._error = {code: 500, message: 'internal error'};

                var errorSpy = jasmine.createSpy('errorSpy');
                this.feedStore.destroy(this.fakeModel, {error: errorSpy});

                expect(errorSpy).toHaveBeenCalledWith("Error 500 destroying model: internal error");
            });
        });

        describe("data pipelining", function() {
            beforeEach(function() {
                // stub out JS for retrieving opensocial data pipeline data
                opensocial.data = opensocial.data || {};
                opensocial.data._datasets = {
                    "viewer": {id: 2002},
                    "appdata": {
                        "2002": {
                            "feeds"     : '123,124,125',
                            "feeds-123" : '{"id": 123, "foo": "a"}',
                            "feeds-124" : '{"id": 124, "foo": "b"}',
                            "feeds-125" : '{"id": 125, "foo": "c"}'
                        }
                    }
                };
                opensocial.data.getDataContext = function() {
                    return {
                        getDataSet: function(name) {
                            return opensocial.data._datasets[name];
                        }
                    }
                }
            });

            afterEach(function() {
                // undo stubbing out of opensocial data pipeline
                delete window.opensocial;
            })

            describe("isPipelined", function() {
                it("should return false if it's been previously fetched from the pipeline", function() {
                    this.feedStore.previouslyFetchedFromPipeline = true;
                    expect(this.feedStore.isPipelined()).toBeFalsy();
                });

                it("should return false if opensocial.data is not defined", function() {
                    delete opensocial.data;
                    expect(this.feedStore.isPipelined()).toBeFalsy();
                });

                it("should return false if pipelined datasets for 'viewer' and 'appdata' are not present", function() {
                    opensocial.data._datasets = {};
                    expect(this.feedStore.isPipelined()).toBeFalsy();
                });

                it("should return false if there is no appdata for this data store", function() {
                    delete opensocial.data._datasets.appdata["2002"].feeds;
                    expect(this.feedStore.isPipelined()).toBeFalsy();
                });

                it("should return true if there is appdata for this data store", function() {
                    expect(this.feedStore.isPipelined()).toBeTruthy();
                });

            });

            describe("findAllByPipeline", function() {
                it("should parse the JSON data from the pipelined 'viewer' and 'appdata' datasets and return an array of objects", function() {
                    var objects = this.feedStore.findAllByPipeline();
                    expect(objects).toEqual([
                        {"id": 123, "foo": "a"},
                        {"id": 124, "foo": "b"},
                        {"id": 125, "foo": "c"}
                    ]);
                });

                it("should set previouslyFetchedFromPipeline to true", function() {
                    expect(this.feedStore.previouslyFetchedFromPipeline).toBeFalsy();
                    this.feedStore.findAllByPipeline();
                    expect(this.feedStore.previouslyFetchedFromPipeline).toBeTruthy();
                });
            });
        });

    });

    describe("Backbone.sync", function() {
        beforeEach(function() {
            this.fakeStore = {
                find    : function() {},
                findAll : function() {},
                create  : function() {},
                update  : function() {},
                destroy : function() {}
            };
            this.fakeModel = {
                id: 1,
                appDataStorage: this.fakeStore
            };
            this.requestOptions = {};
        });

        it("should delegate to the model's appDataStorage property", function() {
            spyOn(this.fakeStore, 'find').andCallThrough();
            Backbone.sync("read", this.fakeModel, this.requestOptions);
            expect(this.fakeStore.find).toHaveBeenCalledWith(this.fakeModel, this.requestOptions);
        });

        it("should delegate to the collection's appDataStorage property if model does not have one", function() {
            this.fakeModel = {
                id: 1,
                collection: {
                    appDataStorage: this.fakeStore
                }
            };
            spyOn(this.fakeStore, 'find').andReturn(true);
            Backbone.sync("read", this.fakeModel, this.requestOptions);
        });

        it("should call findAll on the AppDataStore if model does not have an id (collection)", function() {
            delete this.fakeModel.id;
            spyOn(this.fakeStore, 'findAll').andReturn(true);
            Backbone.sync("read", this.fakeModel, this.requestOptions);
            expect(this.fakeStore.findAll).toHaveBeenCalledWith(this.requestOptions);
        });

        it("should call create on the AppDataStore if method is create", function() {
            spyOn(this.fakeStore, 'create').andReturn(true);
            Backbone.sync("create", this.fakeModel, this.requestOptions);
            expect(this.fakeStore.create).toHaveBeenCalledWith(this.fakeModel, this.requestOptions);
        });

        it("should call update on the AppDataStore if method is update", function() {
            spyOn(this.fakeStore, 'update').andReturn(true);
            Backbone.sync("update", this.fakeModel, this.requestOptions);
            expect(this.fakeStore.update).toHaveBeenCalledWith(this.fakeModel, this.requestOptions);
        });

        it("should call destroy on the AppDataStore if method is delete", function() {
            spyOn(this.fakeStore, 'destroy').andReturn(true);
            Backbone.sync("delete", this.fakeModel, this.requestOptions);
            expect(this.fakeStore.destroy).toHaveBeenCalledWith(this.fakeModel, this.requestOptions);
        });

        it("should convert success / failure functions to an options object to maintain compatibility with Backbone <= 0.3.3", function() {
            var successFunction = function() {return "success!";};
            var errorFunction   = function() {return "error!";};

            var optionsObject = {
                success: successFunction,
                error: errorFunction
            };

            spyOn(this.fakeStore, 'create').andReturn(true);

            // call with individual functions
            Backbone.sync("create", this.fakeModel, successFunction, errorFunction);

            // expect appDataStore.create to be called with an options object
            expect(this.fakeStore.create).toHaveBeenCalledWith(this.fakeModel, optionsObject);
        });
    });
});

