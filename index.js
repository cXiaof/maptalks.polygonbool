import boolean from 'martinez-polygon-clipping'
import isEqual from 'lodash/isEqual'

const options = {}

export class PolygonBool extends maptalks.Class {
    constructor(options) {
        super(options)
        this._layerName = `${maptalks.INTERNAL_LAYER_PREFIX}_CDSP`
        this._chooseGeos = []
        this._colorHit = '#ffa400'
        this._colorChoose = '#00bcd4'
    }

    intersection(geometry, targets) {
        this._setTaskSafety('intersection')
        return this._initialTask(geometry, targets)
    }

    union(geometry, targets) {
        this._setTaskSafety('union')
        return this._initialTask(geometry, targets)
    }

    diff(geometry, targets) {
        this._setTaskSafety('diff')
        return this._initialTask(geometry, targets)
    }

    xor(geometry, targets) {
        this._setTaskSafety('xor')
        return this._initialTask(geometry, targets)
    }

    submit(callback = () => false) {
        this._dealWithTargets()
        callback(this._result)
        this.remove()
    }

    cancel() {
        this.remove()
    }

    remove() {
        const map = this._map
        if (this._chooseLayer) this._chooseLayer.remove()
        this._chooseGeos = []
        this._offMapEvents()
        delete this._result
        delete this._chooseLayer
        delete this._mousemove
        delete this._click
    }

    _setTaskSafety(task) {
        if (map._map_tool && drawTool instanceof maptalks.DrawTool) drawTool.disable()
        if (this.geometry) this.remove()
        this._task = task
    }

    _initialTask(geometry, targets) {
        if (this._checkAvailGeoType(geometry)) {
            this._savePrivateGeometry(geometry)
            if (this._checkAvailGeoType(targets)) targets = [targets]
            if (targets instanceof Array && targets.length > 0) this._dealWithTargets(targets)
            if (this._result) {
                const result = this._result
                this.remove()
                return result
            }
        }
    }

    _checkAvailGeoType(geo) {
        return geo instanceof maptalks.Polygon || geo instanceof maptalks.MultiPolygon
    }

    _savePrivateGeometry(geometry) {
        this.geometry = geometry
        this.layer = geometry._layer
        if (geometry.type.startsWith('Multi')) this.layer = geometry._geometries[0]._layer
        this._addTo(this.layer.map)
    }

    _addTo(map) {
        if (this._chooseLayer) this.remove()
        this._map = map
        this._chooseLayer = new maptalks.VectorLayer(this._layerName).addTo(map).bringToFront()
        this._registerMapEvents()
        return this
    }

    _registerMapEvents() {
        if (!this._mousemove) {
            const map = this._map
            this._mousemove = (e) => this._mousemoveEvents(e)
            this._click = (e) => this._clickEvents(e)
            map.on('mousemove', this._mousemove, this)
            map.on('click', this._click, this)
        }
    }

    _offMapEvents() {
        if (this._mousemove) {
            const map = this._map
            map.off('mousemove', this._mousemove, this)
            map.off('click', this._click, this)
        }
    }

    _mousemoveEvents(e) {
        let geos = []
        const coordSplit = this._getSafeCoords()
        this.layer.identify(e.coordinate).forEach((geo) => {
            const coord = this._getSafeCoords(geo)
            if (!isEqual(coord, coordSplit) && this._checkAvailGeoType(geo)) geos.push(geo)
        })
        this._updateHitGeo(geos)
    }

    _getSafeCoords(geo = this.geometry) {
        let coords = geo.getCoordinates()
        if (geo.options.numberOfShellPoints) {
            const { options } = geo
            const { numberOfShellPoints } = options
            options.numberOfShellPoints = 300
            geo.setOptions(options)
            coords = [geo.getShell()]
            options.numberOfShellPoints = numberOfShellPoints || 60
            geo.setOptions(options)
        }
        return coords
    }

    _updateHitGeo(geos) {
        const id = '_hit'
        if (this._needRefreshSymbol) {
            const hitGeoCopy = this._chooseLayer.getGeometryById(id)
            if (hitGeoCopy) {
                hitGeoCopy.remove()
                delete this.hitGeo
            }
            this._needRefreshSymbol = false
        }
        if (geos && geos.length > 0) {
            this._needRefreshSymbol = true
            this.hitGeo = geos[0]
            const hitSymbol = this._getSymbolOrDefault(this.hitGeo, 'Hit')
            this._copyGeoUpdateSymbol(this.hitGeo, hitSymbol).setId(id)
        }
    }

    _getSymbolOrDefault(geo, type) {
        let symbol = geo.getSymbol()
        const color = this[`_color${type}`]
        const lineWidth = 4
        if (symbol) {
            for (let key in symbol) {
                if (key.endsWith('Fill') || key.endsWith('Color')) symbol[key] = color
            }
            symbol.lineWidth = lineWidth
        } else symbol = { lineColor: color, lineWidth }
        return symbol
    }

    _copyGeoUpdateSymbol(geo, symbol) {
        const coords = this._getSafeCoords(geo)
        let result
        if (geo instanceof maptalks.Polygon) result = new maptalks.Polygon(coords)
        else result = new maptalks.MultiPolygon(coords)
        return result.updateSymbol(symbol).addTo(this._chooseLayer)
    }

    _clickEvents(e) {
        if (this.hitGeo) {
            const coordHit = this._getSafeCoords(this.hitGeo)
            this._setChooseGeosExceptHit(coordHit)
            this._updateChooseGeos()
        }
    }

    _setChooseGeosExceptHit(coordHit, hasTmp) {
        let chooseNext = []
        this._chooseGeos.forEach((geo) => {
            const coord = this._getSafeCoords(geo)
            if (!isEqual(coordHit, coord)) chooseNext.push(geo)
        })
        if (!hasTmp && chooseNext.length === this._chooseGeos.length)
            this._chooseGeos.push(this.hitGeo)
        else this._chooseGeos = chooseNext
    }

    _updateChooseGeos() {
        this._chooseLayer.clear()
        this._chooseGeos.forEach((geo) => {
            const chooseSymbol = this._getSymbolOrDefault(geo, 'Choose')
            this._copyGeoUpdateSymbol(geo, chooseSymbol)
        })
    }

    _dealWithTargets(targets = this._chooseGeos) {
        let result
        targets.forEach((target) => {
            if (result !== null) {
                if (result) result = this._getBoolResultGeo(target, result)
                else result = this._getBoolResultGeo(target)
            }
        })
        this._result = result
    }

    _getBoolResultGeo(target, geo = this.geometry) {
        let coords
        try {
            coords = boolean(
                this._getGeoJSONCoords(geo),
                this._getGeoJSONCoords(target),
                this._getBoolType()
            )
        } catch (e) {}
        const symbol = this.geometry.getSymbol()
        const properties = this.geometry.getProperties()
        if (!coords) return null
        let result
        if (coords.length === 1) result = new maptalks.Polygon(coords[0], { symbol, properties })
        else result = new maptalks.MultiPolygon(coords, { symbol, properties })
        return result
    }

    _getGeoJSONCoords(geo = this.geometry) {
        return geo.toGeoJSON().geometry.coordinates
    }

    _getBoolType() {
        const obj = {
            intersection: 0,
            union: 1,
            diff: 2,
            xor: 3
        }
        return obj[this._task]
    }
}

PolygonBool.mergeOptions(options)
