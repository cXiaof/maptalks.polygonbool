import boolean from 'martinez-polygon-clipping'
import isEqual from 'lodash/isEqual'

const options = {
    includeSame: true,
    alterNative: []
}

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
        callback(this._result, this._deals)
        this.remove()
        return this
    }

    cancel() {
        this.remove()
        return this
    }

    remove() {
        const map = this._map
        if (this._chooseLayer) this._chooseLayer.remove()
        this._chooseGeos = []
        this._offMapEvents()
        delete this._result
        delete this._deals
        delete this._chooseLayer
        delete this._mousemove
        delete this._click
        return this
    }

    _setTaskSafety(task) {
        if (this.geometry) this.remove()
        this._task = task
    }

    _initialTask(geometry, targets) {
        if (this._checkAvailGeoType(geometry)) {
            if (targets === undefined) {
                this._savePrivateGeometry(geometry)
                this._chooseGeos = [geometry]
                this._updateChooseGeos()
            } else {
                this.geometry = geometry
                if (this._checkAvailGeoType(targets)) targets = [targets]
                if (targets instanceof Array && targets.length > 0)
                    this._dealWithTargets(targets)
                else this._result = geometry.copy()
                if (this._result) {
                    const result = this._result
                    this.remove()
                    return result
                }
            }
        }
    }

    _checkAvailGeoType(geo) {
        return (
            geo instanceof maptalks.Polygon ||
            geo instanceof maptalks.MultiPolygon
        )
    }

    _savePrivateGeometry(geometry) {
        this.geometry = geometry
        this.layer = geometry.getLayer()
        this._addTo(geometry.getMap())
    }

    _addTo(map) {
        if (this._chooseLayer) this.remove()
        if (map._map_tool && map._map_tool instanceof maptalks.DrawTool)
            map._map_tool.disable()
        this._map = map
        this._chooseLayer = new maptalks.VectorLayer(this._layerName)
            .addTo(map)
            .bringToFront()
        this._registerMapEvents()
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
        e.target.identify(
            {
                coordinate: e.coordinate,
                tolerance: 0.0001,
                layers: [this.layer.getId(), ...this.options['alterNative']]
            },
            (hits) =>
                hits.forEach((geo) => {
                    const coord = this._getSafeCoords(geo)
                    if (
                        !isEqual(coord, coordSplit) &&
                        this._checkAvailGeoType(geo)
                    )
                        geos.push(geo)
                })
        )
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
                if (key.endsWith('Fill') || key.endsWith('Color'))
                    symbol[key] = color
            }
            symbol.lineWidth = lineWidth
        } else symbol = { lineColor: color, lineWidth }
        return symbol
    }

    _copyGeoUpdateSymbol(geo, symbol) {
        const coords = this._getSafeCoords(geo)
        let result
        if (geo instanceof maptalks.Polygon)
            result = new maptalks.Polygon(coords)
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
        const chooseNext = this._chooseGeos.reduce((target, geo) => {
            const coord = this._getSafeCoords(geo)
            if (!isEqual(coordHit, coord)) target.push(geo)
            return target
        }, [])
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
        this._deals = targets.map((target) => {
            if (result !== null) {
                if (result) result = this._getBoolResultGeo(target, result)
                else result = this._getBoolResultGeo(target)
            }
            return target.copy()
        })
        result = this._checkUnexpectedVertux(result)
        this._result = result
    }

    _getBoolResultGeo(target, geo = this.geometry) {
        const tasks = ['intersection', 'union', 'diff', 'xor']
        const boolType = tasks.indexOf(this._task)
        const coordsTarget = this._getGeoJSONCoords(target)
        const coordsGeo = this._getGeoJSONCoords(geo)
        if (!this.options['includeSame'] && isEqual(coordsGeo, coordsTarget))
            return geo
        let coords
        try {
            coords = boolean(coordsGeo, coordsTarget, boolType)
        } catch (e) {}
        if (!coords) return null
        const options = {
            symbol: this.geometry.getSymbol(),
            properties: this.geometry.getProperties()
        }
        return coords.length === 1
            ? new maptalks.Polygon(coords[0], options)
            : new maptalks.MultiPolygon(coords, options)
    }

    _getGeoJSONCoords(geo = this.geometry) {
        return geo.toGeoJSON().geometry.coordinates
    }

    _checkUnexpectedVertux(geo) {
        if (!geo) return geo
        if (geo instanceof maptalks.Polygon) this._removeUnexpectedVertux(geo)
        else geo.forEach((polygon) => this._removeUnexpectedVertux(polygon))
        return geo
    }

    _removeUnexpectedVertux(geo) {
        const coordinates = this._getGeoJSONCoords(geo)
        let needReset = false
        const saveCoords = coordinates.map((coords) => {
            let saveCoordsItem = []
            for (let i = 0; i < coords.length; i++) {
                const coord = coords[i]
                saveCoordsItem.push(coord)
                const hasUnexpectedVertux = isEqual(coord, coords[i + 2])
                needReset = needReset || hasUnexpectedVertux
                if (i < coords.length - 2 && hasUnexpectedVertux) i += 2
            }
            return saveCoordsItem
        })
        if (needReset) geo.setCoordinates(saveCoordsItem)
    }
}

PolygonBool.mergeOptions(options)
