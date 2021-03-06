import boolean from 'martinez-polygon-clipping'
import isEqual from 'lodash.isequal'
import tail from 'lodash.tail'

const uid = 'polygonbool@cXiaof'
const options = {
    includeSame: true,
    alterNative: [],
    colorHit: '#ffa400',
    colorChosen: '#00bcd4',
}

export class PolygonBool extends maptalks.Class {
    constructor(options) {
        super(options)
        this._layerName = `${maptalks.INTERNAL_LAYER_PREFIX}${uid}`
        this._chooseGeos = []
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
        const targets = tail(this._chooseGeos)
        const result = this._dealWithTargets(targets)
        callback(result, this._deals, this._task)
        this.remove()
    }

    cancel() {
        this.remove()
    }

    remove() {
        if (this._chooseLayer) this._chooseLayer.remove()
        this._chooseGeos = []
        this._offMapEvents()
        delete this._result
        delete this._deals
        delete this._chooseLayer
        delete this._mousemove
        delete this._click
    }

    _setTaskSafety(task) {
        if (this.geometry) this.remove()
        const boolTypes = ['intersection', 'union', 'diff', 'xor']
        this._task = task
        this._boolType = boolTypes.indexOf(task)
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
                let result = geometry.copy()
                if (targets instanceof Array && targets.length > 0)
                    result = this._dealWithTargets(targets)
                this.remove()
                return result
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
        map.on('mousemove', this._mousemoveEvents, this)
        map.on('click', this._clickEvents, this)
    }

    _offMapEvents() {
        map.off('mousemove', this._mousemoveEvents, this)
        map.off('click', this._clickEvents, this)
    }

    _mousemoveEvents(e) {
        let geos = []
        const coordSplit = this._getSafeCoords()
        e.target.identify(
            {
                coordinate: e.coordinate,
                tolerance: 0.0001,
                layers: [this.layer.getId(), ...this.options['alterNative']],
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
        const color = this.options[`color${type}`]
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

    _clickEvents() {
        if (this.hitGeo) {
            const coordHit = this._getSafeCoords(this.hitGeo)
            this._setChooseGeosExceptHit(coordHit)
            this._updateChooseGeos()
        }
    }

    _setChooseGeosExceptHit(coordHit) {
        const chooseNext = this._chooseGeos.reduce((target, geo, i) => {
            const coord = this._getSafeCoords(geo)
            if (i > 0 && isEqual(coordHit, coord)) return target
            target.push(geo)
            return target
        }, [])
        if (chooseNext.length === this._chooseGeos.length)
            this._chooseGeos.push(this.hitGeo)
        else this._chooseGeos = chooseNext
    }

    _updateChooseGeos() {
        this._chooseLayer.clear()
        this._chooseGeos.forEach((geo) => {
            const chooseSymbol = this._getSymbolOrDefault(geo, 'Chosen')
            this._copyGeoUpdateSymbol(geo, chooseSymbol)
        })
    }

    _dealWithTargets(targets) {
        let result
        this._deals = targets.map((target) => {
            if (result !== null) {
                if (result) result = this._getBoolResultGeo(target, result)
                else result = this._getBoolResultGeo(target)
            }
            return target.copy()
        })
        if (result) {
            result.setSymbol(this.geometry.getSymbol())
            result.setProperties(this.geometry.getProperties())
            return result
        }
    }

    _getBoolResultGeo(target, geo = this.geometry) {
        const coordsGeo = this._getGeoJSONCoords(geo)
        const coordsTarget = this._getGeoJSONCoords(target)
        if (!this.options['includeSame'] && isEqual(coordsGeo, coordsTarget))
            return geo
        let coords
        try {
            coords = boolean(coordsGeo, coordsTarget, this._boolType)
        } catch (e) {}
        coords = this._removeUnexpectedLine(coords)
        if (!coords) return null
        return coords.length === 1
            ? new maptalks.Polygon(coords[0])
            : new maptalks.MultiPolygon(coords)
    }

    _getGeoJSONCoords(geo = this.geometry) {
        return geo.toGeoJSON().geometry.coordinates
    }

    _removeUnexpectedLine(coords) {
        const safeCoords = coords.reduce((target1, coords1) => {
            const safeCoords1 = coords1.reduce((target2, coords2) => {
                if (coords2.length > 3) target2.push(coords2)
                return target2
            }, [])
            if (safeCoords1.length > 0) target1.push(safeCoords1)
            return target1
        }, [])
        if (safeCoords.length === 0) return null
        return safeCoords
    }
}

PolygonBool.mergeOptions(options)
