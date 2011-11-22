describe("Fake OSAPI appdata", function() {

    beforeEach(function() {
        // add some fake data
        this.viewerId = osapi.appdata._userId;
        osapi.appdata._appdata = {"foo": "foo-value", "bar": "bar-value"};
        osapi.appdata._error = null;
    });

    describe("get()", function() {
        it("should return an object with an execute function", function() {
            var query = osapi.appdata.get({fields: ['foo']});
            expect(typeof query).toEqual('object');
            expect(typeof query.execute).toEqual('function');
        });

        it("should return the data for the keys specified", function() {
            var that = this;
            osapi.appdata.get({fields: ['foo']}).execute(function(response) {
                var userAppData = response[that.viewerId];
                expect(_.keys(userAppData)).toEqual(['foo']);
                expect(userAppData['foo']).toEqual('foo-value');
            });
        });

        it("should return the data for all keys if no fields specified", function() {
            var that = this;
            osapi.appdata.get().execute(function(response) {
                var userAppData = response[that.viewerId];
                expect(_.keys(userAppData)).toEqual(['foo', 'bar']);
            });
        });

        it("should return an error response if _error is set", function() {
            osapi.appdata._error = {code: 404, message: "not found"};
            osapi.appdata.get().execute(function(response) {
                expect(typeof response.error).toEqual('object');
                expect(response.error.code).toEqual(404);
                expect(response.error.message).toEqual("not found");
            });
        });
    });

    describe("update()", function() {
        it("should set appdata for the data key/values passed in", function() {
            osapi.appdata.update({data: {"name": "value"}}).execute(function(response) {
                expect(osapi.appdata._appdata['name']).toEqual('value');
            });
        });

        it("should not overwrite appdata for the data key/values not passed in", function() {
            osapi.appdata.update({data: {"name": "value"}}).execute(function(response) {
                expect(osapi.appdata._appdata['foo']).toEqual('foo-value');
            });
        });

        it("should return an empty object upon success", function() {
            osapi.appdata.update({data: {'name': 'value'}}).execute(function(response) {
                expect(response).toEqual({});
            });
        });
    });

    describe("delete()", function() {
        it("should remove appdata for the keys passed in", function() {
            expect(typeof osapi.appdata._appdata['foo']).toEqual('string');

            osapi.appdata['delete']({keys: ['foo']}).execute(function(response) {
                expect(typeof osapi.appdata._appdata['foo']).toEqual('undefined');
            });
        });

        it("should return an object containing the key/value pair(s) that were deleted", function() {
            osapi.appdata['delete']({keys: ['foo']}).execute(function(response) {
                expect(typeof response['foo']).toEqual("string");
            });
        });
    });

});