// new Map
const map = new maptalks.Map('map', {
    center: [121.387, 31.129],
    zoom: 14,
    baseLayer: new maptalks.TileLayer('base', {
        urlTemplate:
            'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c', 'd'],
        attribution:
            '&copy; <a href="http://osm.org">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/">CARTO</a>',
        maxAvailableZoom: 18,
        placeholder: true
    }),
    scaleControl: { position: 'bottom-right', metric: true, imperial: true },
    zoomControl: {
        position: { top: 80, right: 20 },
        slider: false,
        zoomLevel: true
    },
    spatialReference: {
        projection: 'EPSG:3857',
        resolutions: (function() {
            const resolutions = []
            const d = 2 * 6378137 * Math.PI
            for (let i = 0; i < 22; i++) {
                resolutions[i] = d / (256 * Math.pow(2, i))
            }
            return resolutions
        })(),
        fullExtent: {
            top: 6378137 * Math.PI,
            bottom: -6378137 * Math.PI,
            left: -6378137 * Math.PI,
            right: 6378137 * Math.PI
        }
    }
})
new maptalks.CompassControl({
    position: 'top-right'
}).addTo(map)

const pb = new maptalks.PolygonBool()
const layer = new maptalks.VectorLayer('sketchPad').addTo(map)
layer.on('addGeo', () =>
    layer.forEach((geo) =>
        geo.on('contextmenu', () => geo.setMenu(getOptions(geo)).openMenu())
    )
)

// add DrawTool
let once = false
const defaultSymbol = {
    polygonFill: '#ebebeb',
    polygonOpacity: 0.2,
    lineColor: 'black',
    lineWidth: 1
}
const drawTool = new maptalks.DrawTool({ mode: 'Point' })
    .setSymbol(defaultSymbol)
    .addTo(map)
    .disable()
drawTool.on('drawend', (param) => {
    const { geometry } = param
    geometry.addTo(layer)
    if (once) drawTool.disable()
})

// new Toolbar
const modes = ['Polygon', 'Rectangle', 'Circle', 'Ellipse']
const getDrawModes = (attr) =>
    modes.map((mode) => ({
        item: mode,
        click: () => {
            once = attr
            drawTool.setMode(mode).enable()
        }
    }))
const children = getDrawModes(false)
const childrenOnce = getDrawModes(true)

const toolbar = new maptalks.control.Toolbar({
    position: 'top-left',
    items: [
        { item: 'Draw', children },
        { item: 'DrawOnce', children: childrenOnce },
        { item: 'Stop', click: () => drawTool.disable() },
        {
            item: 'Clear',
            click: () => {
                layer.clear()
                pb.cancel()
                targets = []
            }
        }
    ]
}).addTo(map)

// Menu options
const renderDemoResult = (geo) => {
    if (geo) {
        const demoSymbol = { polygonFill: 'pink', lineWidth: 2 }
        const id = 'demo'
        const demoGeo = layer.getGeometryById(id)
        if (demoGeo) demoGeo.updateSymbol(defaultSymbol).setId(undefined)
        geo.updateSymbol(demoSymbol)
            .addTo(layer)
            .setId(id)
    }
}

let targets = []
let result = {}
const getOptions = (geometry) => {
    return {
        items: [
            {
                item: 'intersection',
                click: () => {
                    if (targets.length > 0)
                        result = pb.intersection(geometry, targets)
                    else result = pb.intersection(geometry)
                    renderDemoResult(result)
                }
            },
            '-',
            {
                item: 'union',
                click: () => {
                    if (targets.length > 0) result = pb.union(geometry, targets)
                    else result = pb.union(geometry)
                    renderDemoResult(result)
                }
            },
            '-',
            {
                item: 'diff',
                click: () => {
                    if (targets.length > 0) result = pb.diff(geometry, targets)
                    else result = pb.diff(geometry)
                    renderDemoResult(result)
                }
            },
            '-',
            {
                item: 'xor',
                click: () => {
                    if (targets.length > 0) result = pb.xor(geometry, targets)
                    else result = pb.xor(geometry)
                    renderDemoResult(result)
                }
            },
            '-',
            {
                item: 'push to targets',
                click: () => targets.push(geometry)
            },
            '-',
            {
                item: 'submit',
                click: () =>
                    pb.submit((result, deals) => {
                        renderDemoResult(result)
                        console.log(result, deals)
                        targets = []
                    })
            },
            '-',
            {
                item: 'example: diff all',
                click: () => {
                    const id = '_diffAll'
                    geometry.setId(id)
                    let geos = []
                    layer.getGeometries().forEach((geo) => {
                        if (geo.getId() !== id) geos.push(geo)
                    })
                    const result = pb.diff(geometry, geos)
                    renderDemoResult(result)
                    geometry.remove()
                }
            },
            '-',
            {
                item: 'cancel',
                click: () => {
                    pb.cancel()
                    targets = []
                }
            }
        ]
    }
}
