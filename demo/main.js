const map = new maptalks.Map('map', {
    center: [121.387, 31.129],
    zoom: 14,
    baseLayer: new maptalks.TileLayer('base', {
        urlTemplate:
            'https://webrd{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        subdomains: ['01', '02', '03', '04'],
        maxAvailableZoom: 18,
        placeholder: true
    })
})

const pb = new maptalks.PolygonBool()
const layer = new maptalks.VectorLayer('sketchPad').addTo(map)
layer.on('addGeo', () =>
    layer
        .getGeometries()
        .forEach((geo) => geo.on('contextmenu', () => geo.setMenu(getOptions(geo)).openMenu()))
)

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

const modes = ['Polygon', 'Rectangle', 'Circle', 'Ellipse']
const getDrawModes = (attr) => {
    let arr = []
    modes.map((item) =>
        arr.push({
            item,
            click: () => {
                once = attr
                drawTool.setMode(item).enable()
            }
        })
    )
    return arr
}
const children = getDrawModes(false)
const childrenOnce = getDrawModes(true)

const toolbar = new maptalks.control.Toolbar({
    items: [
        {
            item: 'Draw',
            children
        },
        {
            item: 'DrawOnce',
            children: childrenOnce
        },
        {
            item: 'Stop',
            click: () => drawTool.disable()
        },
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

const renderDemoResult = (geo) => {
    if (geo) {
        const demoSymbol = {
            polygonFill: 'pink',
            lineWidth: 2
        }
        const id = 'demo'
        const demoGeo = layer.getGeometryById(id)
        if (demoGeo) demoGeo.updateSymbol(defaultSymbol).setId(undefined)
        geo.updateSymbol(demoSymbol)
            .addTo(layer)
            .setId(id)
    }
}

let targets = []
const getOptions = (geometry) => {
    return {
        items: [
            {
                item: 'intersection',
                click: () => {
                    const result = pb.intersection(geometry, targets)
                    renderDemoResult(result)
                }
            },
            '-',
            {
                item: 'union',
                click: () => {
                    const result = pb.union(geometry, targets)
                    renderDemoResult(result)
                }
            },
            '-',
            {
                item: 'diff',
                click: () => {
                    const result = pb.diff(geometry, targets)
                    renderDemoResult(result)
                }
            },
            '-',
            {
                item: 'xor',
                click: () => {
                    const result = pb.xor(geometry, targets)
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
                    pb.submit((result) => {
                        renderDemoResult(result)
                        targets = []
                    })
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
