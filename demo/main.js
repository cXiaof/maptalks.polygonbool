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
            }
        }
    ]
}).addTo(map)

// Menu options
const renderDemoResult = (result, deals, task) => {
    console.log(result, deals, task)
    const id = 'demo'
    const demoGeo = layer.getGeometryById(id)
    if (demoGeo) demoGeo.updateSymbol(defaultSymbol).setId(undefined)
    if (result) {
        result.addTo(layer).setId(id)
        result.updateSymbol({ polygonFill: 'pink', lineWidth: 2 })
    }
}

let result = {}
const getOptions = (geometry) => {
    const tasks = ['intersection', 'union', 'diff', 'xor']
    const tasksItems = tasks.reduce((target, task) => {
        if (target.length > 0) target.push('-')
        target.push({
            item: `operation: ${task}`,
            click: () => pb[task](geometry)
        })
        return target
    }, [])
    return {
        items: [
            ...tasksItems,
            '-',
            { item: 'submit', click: () => pb.submit(renderDemoResult) },
            '-',
            { item: 'cancel', click: () => pb.cancel() }
        ]
    }
}

// new tip Panel
const textPanel = new maptalks.control.Panel({
    position: 'bottom-left',
    draggable: true,
    custom: false,
    content: `
        Click a type in <b>Draw</b> or <b>Draw Once</b> to draw geometry, and click<br />
        <b>Stop</b> to stop drawing.<br />
        Contextmenu on a geometry open the menu, choose a task and<br />
        start to choose geometry or geometries as targets, click it when<br />
        it's color be changed.<br />
        Finaly, Contextmenu on the geometry again, click <b>submit</b> and see<br />
        the effect.<br />
        <br />
        点击<b>Draw</b>或<b>Draw Once</b>里的类型开始画相应的图形， 点击<b>Stop</b>停止。<br />
        右键你要操作的图形，选择一种模式（交集/并集/排除/异或），然后开<br />
        始选择一个或多个目标图形，被命中时图形会变色。<br />
        最后再次右键你要操作的图形，点击<b>submit</b>查看效果。
    `,
    closeButton: true
})
map.addControl(textPanel)
