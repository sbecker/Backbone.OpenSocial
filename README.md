# Backbone Opensocial
## AppDataStore
AppDataStore is an OpenSocial adapter for Backbone data persistence. It is a drop in replacement for Backbone.Sync() to handle saving to an OpenSocial container's AppData store.

### Usage
Include Backbone.OpenSocial.AppData after having included Backbone.js

    <script type="text/javascript" src="backbone.js"></script>
    <script type="text/javascript" src="backbone.opensocial.appdata.js"></script>

Create your collections like so:

    window.SomeCollection = Backbone.Collection.extend({
      
      appDataStorage: new AppDataStore("SomeCollection"), // Unique name within your app.
      
      // ... everything else is normal.
      
    });

### Running Specs

The test specs are written using [Jasmine.js](http://pivotal.github.com/jasmine/). Open spec/spec.html in your browser to run the suite.

Feel free to use Backbone as you usually would, this is a drop-in replacement.

## Credits

Thanks to [Jerome Gravel-Niquet](https://github.com/jeromegn) for the [Backbone.localStorage](https://github.com/jeromegn/Backbone.localStorage) adapter which served as an example for how to build this.
