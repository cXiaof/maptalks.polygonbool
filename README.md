# maptalks.polygonbool

A tool to do boolean operation of Polygon and MultiPolygon.

## Examples

### [DEMO](https://cxiaof.github.io/maptalks.polygonbool/demo/index.html)

## Install

-   Install with npm: `npm install maptalks.polygonbool`.
-   Download from [dist directory](https://github.com/cXiaof/maptalks.polygonbool/tree/master/dist).
-   Use jsdelivr CDN: `https://cdn.jsdelivr.net/npm/maptalks.polygonbool/dist/maptalks.polygonbool.min.js`

## Usage

As a plugin, `maptalks.polygonbool` must be loaded after `maptalks.js` in browsers. You can also use `'import { PolygonBool } from "maptalks.polygonbool"` when developing with webpack.

```html
<!-- ... -->
<script src="https://cdn.jsdelivr.net/npm/maptalks.geosplit/dist/maptalks.polygonbool.min.js"></script>
<!-- ... -->
```

```javascript
// new PolygonBool and layer
const ms = new maptalks.PolygonBool()
const layer = new maptalks.VectorLayer('v').addTo(map)

// use PolygonBool API, targets is not necessary parameters and if no targets user will choose geometry on the map
// get details in API Reference
```

## API Reference

```javascript
new maptalks.PolygonBool()
// new maptalks.PolygonBool({ includeSame: false, alterNative: ['foo_layer_id', 'bar_layer_id'] })
```

-   options
    -   includeSame **boolean** decide if exclude geometry with same coordinates, default is true
    -   alterNative **Array** layer names of layer which you need to choose geometry on

`intersection(geometry, targets)` if no targets, start choose mode on map

`union(geometry, targets)` same as above

`diff(geometry, targets)` same as above

`xor(geometry, targets)` same as above

`submit(callback)` callback can get three attr, the result, deals(targets or choose-targets) and task name.

`cancel()`

`remove()`

## Contributing

We welcome any kind of contributions including issue reportings, pull requests, documentation corrections, feature requests and any other helps.

## Develop

The only source file is `index.js`.

It is written in ES6, transpiled by [babel](https://babeljs.io/) and tested with [mocha](https://mochajs.org) and [expect.js](https://github.com/Automattic/expect.js).

### Scripts

-   Install dependencies

```shell
$ npm install
```

-   Watch source changes and generate runnable bundle repeatedly

```shell
$ gulp watch
```

-   Tests

```shell
$ npm test
```

-   Watch source changes and run tests repeatedly

```shell
$ gulp tdd
```

-   Package and generate minified bundles to dist directory

```shell
$ gulp minify
```

-   Lint

```shell
$ npm run lint
```

## More Things

-   [maptalks.autoadsorb](https://github.com/cXiaof/maptalks.autoadsorb/issues)
-   [maptalks.multisuite](https://github.com/cXiaof/maptalks.multisuite/issues)
-   [maptalks.geosplit](https://github.com/cXiaof/maptalks.geosplit/issues)
-   [maptalks.polygonbool](https://github.com/cXiaof/maptalks.polygonbool/issues)
-   [maptalks.geo2img](https://github.com/cXiaof/maptalks.geo2img/issues)
-   [maptalks.control.compass](https://github.com/cXiaof/maptalks.control.compass/issues)
-   [maptalks.autogradual](https://github.com/cXiaof/maptalks.autogradual/issues)
