'use strict';

const pjson = require('../package.json');
const utils = require('../util/utils');
const serializeapp = require('serializeapp');
const createSession = require('../util/session');
const log4js = require('log4js');
const logger = log4js.getLogger();
const request = require('request');

const nxPage = {
    "qTop": 0,
    "qLeft": 0,
    "qWidth": 0,
    "qHeight": 0
};

const fieldTypes = {
    discrete: "D",
    numeric: "N",
    timestamp: "T"
};

const measureTypes = {
    U: fieldTypes.discrete,
    A: fieldTypes.discrete,
    I: fieldTypes.numeric,
    R: fieldTypes.numeric,
    F: fieldTypes.numeric,
    M: fieldTypes.numeric,
    D: fieldTypes.timestamp,
    T: fieldTypes.timestamp,
    TS: fieldTypes.timestamp,
    IV: fieldTypes.discrete
};

const fieldTags = {
    date: "$date",
    timestamp: "$timestamp",
    ascii: "$ascii",
    text: "$text",
    numeric: "$numeric",
    integer: "$integer"
};

const typeRisotto = {
    qType: "q-risotto"
};

const hyperCubeDef = {
    qInfo: typeRisotto,
    qHyperCubeDef: {
        qDimensions: [],
        qMeasures: [],
        qInitialDataFetch: []
    }
}

/**
 * Our Qlik Sense Server information
 * Needs exported certificates from Qlik Sense QMC
 */
var r = request.defaults({
    rejectUnauthorized: false,
    host: 'localhost',
    // cert: fs.readFileSync(__dirname + '/client.pem'),
    // key: fs.readFileSync(__dirname + '/client_key.pem')
})

/**
 * Request ticket from QPS.
 * Adjust uri as needed.
 */
function getQlikSenseTicket(directory, user, callback) {    
    r.post({
        uri: 'https://localhost:4243/qps/ticket?xrfkey=abcdefghijklmnop',
        body: JSON.stringify({
            "UserDirectory": directory,
            "UserId": user,
            "Attributes": []
        }),
        headers: {
            'x-qlik-xrfkey': 'abcdefghijklmnop',
            'content-type': 'application/json'
        }
    }, function(err, res, body) {
        if(err) return callback(err);
        var ticket = JSON.parse(body)['Ticket'];
        
        callback(null, ticket);       
    });
};

// generate qHyperCubeDef object out of payload
function getHyperCubeFromPayload(payload, nxPage) {
    var hyperCube = JSON.parse(JSON.stringify(hyperCubeDef));

    if (payload) {
        if (payload instanceof Array) {
            // column list
            payload.forEach((e) => {
                if (typeof e === "string") {
                    if (e.trim().substring(0, 1) === "=") {
                        // measure
                        hyperCube.qHyperCubeDef.qMeasures.push({
                            qDef: { qDef: e }
                        });
                    } else {
                        // dimension
                        hyperCube.qHyperCubeDef.qDimensions.push({
                            qDef: { qFieldDefs: [e] },
                        });
                    }
                } else if (typeof e === "object") {
                    if (e.hasOwnProperty("qDef")) {
                        if (e.qDef.hasOwnProperty("qDef")) {
                            // measure
                            hyperCube.qHyperCubeDef.qMeasures.push(e);
                        } else if (e.qDef.hasOwnProperty("qFieldDefs")) {
                            // dimension
                            hyperCube.qHyperCubeDef.qDimensions.push(e);
                        }
                    }
                }
            });
        } else if (typeof payload === "object"){
            // hypercube object
            if (payload.hasOwnProperty('qHyperCubeDef')) {
                hyperCube.qHyperCubeDef = payload.qHyperCubeDef;
            } else {
                hyperCube.qHyperCubeDef = payload;
            }
        }
        hyperCube.qHyperCubeDef.qInitialDataFetch = [nxPage];
    }
    return hyperCube;
}

module.exports = {
    // path: '/'
    about: (request, reply) => {
        var _qtproduct = '',
            _global = {};
        const session = createSession();
        
       return session.open()
            .then(global => {
                _global = global;
                return global.qTProduct();
            })
            .then(prod => {
                _qtproduct = prod;
                return _global.productVersion();
            })
            .then(vers => {
                session.close();
                return {
                    name: pjson.name,
                    version: pjson.version,
                    description: pjson.description,
                    author: pjson.author,
                    license: pjson.license,
                    qtProduct: _qtproduct,
                    qtVersion: vers,
                    state: 'cooking'
                };
            })
            .catch(error => {
                console.error('Error occured:', error);
                return {error: error.message};
            });


    },

    // path: '/{param*}' 
    public: {
        directory: {
            path: 'public',
            listing: true,
            index: 'index.html'
        }
    },

    // path: '/v1/docs'
    docs: (request, reply) => {
        var _global = {};
        const session = createSession();
        return session.open()
            .then((global) => {
                _global = global;
                return global.getDocList();
            })
            .then(list => {
                session.close();
                return {
                    qDocList: list
                };
            })
            .catch(error => {
                console.error('Error occured:', error);
                return {error: error.message};
            });
    },

    // path: '/v1/doc/{docId}'
    doc: (request, reply) => {
        var _global = {};
        logger.info("doc", request.params.docId);
        const session = createSession(request.params.docId);
        return session.open()
            .then(global => {
                _global = global;
                return global.openDoc(request.params.docId, "", "", "", true);
            })
            .then(doc => doc.getAppLayout())
            .then((layout) => {
                session.close();
                return {
                    qLayout: layout
                };
            })
            .catch(error => {
                console.error('Error occured:', error);
                return {error: error.message};
            });
    },

    // path: '/v1/doc/{docId}/objects'
    objects: (request, reply) => {
        logger.info("doc objects", request.params.docId);
        var _global = {};
        const session = createSession(request.params.docId);
        return session.open()
            .then(global => {
                _global = global;
                return global.openDoc(request.params.docId, "", "", "", true);
            })
            .then(doc => doc.getAllInfos())
            .then(infos => {
                session.close();
                return {
                    qInfos: infos.qInfos || infos
                };
            })
            .catch(error => {
                console.error('Error occured:', error);
                return {error: error.message};
            });
    },

    // path: '/v1/doc/{docId}/serialize'
    serialize: (request, reply) => {
        logger.info("doc objects", request.params.docId);
        var _global = {};
        const session = createSession(request.params.docId);
        return session.open()
            .then(global => {
                _global = global;
                return global.openDoc(request.params.docId, "", "", "", true);
            })
            .then(doc => serializeapp(doc))
            .then(results => {
                session.close();
                return results;
            })
            .catch(error => {
                console.error('Error occured:', error);
                return {error: error.message};
            });
    },

    // path: '/v1/doc/{docId}/object/{objId}'
    objectId: (request, reply) => {
        logger.info("doc", request.params.docId, "object", request.params.objId);
        var _global = {};
        const session = createSession(request.params.docId);
        return session.open()
            .then(global => {
                _global = global;
                return global.openDoc(request.params.docId, "", "", "", true);
            })
            .then(doc => doc.getObject(request.params.objId))
            .then(object => {
                if (object) {
                    return object.getProperties()
                } else {
                    session.close();
                    return {};
                }
            })
            .then(props => {
                session.close();
                return {
                    qProp: props
                };
            })
            .catch(error => {
                console.error('Error occured:', error);
                return {error: error.message};
            });
    },

    //path '/v1/doc/{docId}/object/{objId}/imgExport'
    imgExport: (request, reply) => {
        // logger.info("doc", request.params.docId, "object", request.params.objId);

        var config = {
            host: "localhost",
            prefix: "/",
            port: 443,
            isSecure: true
        };
        
        require(['js/qlik'], function(qlik) {
            var global = qlik.getGlobal(config);
            reply('test');
        });
    },
    // path: '/v1/doc/{docId}/object/{objId}/layout'
    objectLayout: (request, reply) => {
        logger.info("doc", request.params.docId, "object", request.params.objId, "layout");
        var _global = {};
        const session = createSession(request.params.docId);
        session.open()
            .then(global => {
                _global = global;
                return global.openDoc(request.params.docId);
            })
            .then(doc => doc.getObject(request.params.objId))
            .then(object => object.getLayout())
            .then(layout => {
                session.close();
                reply({
                    qLayout: layout
                });
            })
            .catch(error => {
                console.error('Error occured:', error);
                reply({error: error.message});
            });
    },

    // path: '/v1/doc/{docId}/object/{objId}/data'
    objectData: (request, reply) => {
        logger.info("doc", request.params.docId, "object", request.params.objId, "data");
        var _global = {};
        const session = createSession(request.params.docId);
        var nxPageToGet = nxPage;
        var w = 1, h = 10000;
        return session.open()
            .then(global => {
                _global = global;
                return global.openDoc(request.params.docId);
            })
            .then(doc => doc.getObject(request.params.objId))
            .then(object =>
                object.getLayout()
                    .then(layout => {
                        // TODO: implement paging
                        if (layout.hasOwnProperty('qHyperCube')) {
                            w = layout.qHyperCube.qDimensionInfo.length + layout.qHyperCube.qMeasureInfo.length;
                            if (w > 1) {
                                h = Math.floor(10000 / w);
                            }
                            nxPageToGet.qWidth = w;
                            nxPageToGet.qHeight = h;
                            return object.getHyperCubeData("/qHyperCubeDef", [nxPageToGet]);
                        } else if (layout.hasOwnProperty('qListObject')) {
                            nxPageToGet.qWidth = w;
                            nxPageToGet.qHeight = h;
                            return object.getListObjectData("/qListObjectDef", [nxPageToGet]);
                        } else {
                            return {};
                        }
                    }))
            .then(data => {
                session.close();
                return data;
            })
            .catch(error => {
                console.error('Error occured:', error);
                return {error: error.message};
            });
    },

    // path: '/v1/doc/{docId}/object/{objId}/pivotdata'
    objectPivotdata: (request, reply) => {
        logger.info("doc", request.params.docId, "object", request.params.objId, "pivotdata");
        var _global = {};
        const session = createSession(request.params.docId);
        var nxPageToGet = nxPage;
        var w = 1, h = 10000;
        return session.open()
            .then(global => {
                _global = global;
                return global.openDoc(request.params.docId);
            })
            .then(doc => doc.getObject(request.params.objId))
            .then(object =>
                object.getLayout()
                    .then(layout => {
                        if (layout.hasOwnProperty('qHyperCube')) {
                            if (layout.qHyperCube.hasOwnProperty('qPivotDataPages')) {
                                //return layout.qHyperCube.qPivotDataPages;
                                w = layout.qHyperCube.qDimensionInfo.length + layout.qHyperCube.qMeasureInfo.length;
                                if (w > 1) {
                                    h = Math.floor(10000 / w);
                                }
                                nxPageToGet.qWidth = w;
                                nxPageToGet.qHeight = h;
                                return object.getHyperCubePivotData("/qHyperCubeDef", [nxPageToGet]);
                            } else {
                                return [];
                            }
                        } else {
                            return [];
                        }
                    }))
            .then(data => {
                session.close();
                return data;
            })
            .catch(error => {
                console.error('Error occured:', error);
                return {error: error.message};
            });
    },

    // path: '/v1/doc/{docId}/object/{objId}/layers'
    objectLayers: (request, reply) => {
        logger.info("doc", request.params.docId, "object", request.params.objId, "layers");
        var _global = {};
        const session = createSession(request.params.docId);
        return session.open()
            .then(global => {
                _global = global;
                return global.openDoc(request.params.docId);
            })
            .then(doc => doc.getObject(request.params.objId))
            .then(object =>
                object.getLayout()
                    .then((layout) => {
                        if (layout.hasOwnProperty('layers')) {
                            return layout.layers;
                        } else {
                            return [];
                        }
                    }))
            .then(layers => {
                session.close();
                return {
                    layers: layers
                };
            })
            .catch(error => {
                console.error('Error occured:', error);
                return {error: error.message};
            });
    },

    // path: '/v1/doc/{docId}/hypercube'
    hyperCube: (request, reply) => {
        logger.info("doc", request.params.docId, "hypercube");
        var _global = {};
        const session = createSession(request.params.docId);
        return session.open()
            .then(global => {
                _global = global;
                return global.openDoc(request.params.docId);
            })
            .then(doc => {
                var hyperCube = getHyperCubeFromPayload(request.payload, nxPage);
                return doc.createSessionObject(hyperCube);
            })
            .then(obj =>
                obj.getLayout()
                    .then(layout => {
                        if (layout.hasOwnProperty('qHyperCube')) {
                            return layout.qHyperCube;
                        } else {
                            return {};
                        }
                    })
            )
            .then(cube => {
                session.close();
                return {
                    qHyperCube: cube
                };
            })
            .catch(error => {
                console.error('Error occured:', error);
                return {error: error.message};
            });
    },

    // path: '/v1/doc/{docId}/hypercube/size'
    hyperCubeSize: (request, reply) => {
        logger.info("doc", request.params.docId, "hypercube size");
        var _global = {};
        const session = createSession(request.params.docId);
        var res = {};
        return session.open()
            .then(global => {
                _global = global;
                return global.openDoc(request.params.docId);
            })
            .then(doc => {
                var hyperCube = getHyperCubeFromPayload(request.payload, nxPage);
                return doc.createSessionObject(hyperCube);
            })
            .then(obj =>
                obj.getLayout()
                    .then(layout => {
                        if (layout.hasOwnProperty('qHyperCube') && layout.qHyperCube.hasOwnProperty('qSize')) {
                            res = {
                                columns: layout.qHyperCube.qSize.qcx,
                                rows: layout.qHyperCube.qSize.qcy,
                                pages: Math.ceil((layout.qHyperCube.qSize.qcx * layout.qHyperCube.qSize.qcy) / 10000)
                            };
                            return res;
                        } else {
                            return {};
                        }
                    })
            )
            .then(area => {
                session.close();
                return area;
            })
            .catch(error => {
                console.error('Error occured:', error);
                return {error: error.message};
            });
    },

    // path: '/v1/doc/{docId}/hypercube/json/{pageNo*}'
    hyperCubeJson: (request, reply) => {
        logger.info("doc", request.params.docId, "hypercube/json");
        var _global = {};
        const session = createSession(request.params.docId);
        var w = 0, h = 10000, t = 0, page = 1;
        var nxPageToGet = nxPage;
        if (request.params.hasOwnProperty('pageNo')) {
            try {
                page = parseInt(request.params.pageNo, 10);
            } catch (error) {
                logger.error(error);
            }
        }
        return session.open()
            .then(global => {
                _global = global;
                return global.openDoc(request.params.docId);
            })
            .then(doc => {
                try {
                    logger.info(JSON.stringify(request.payload, null, 4));
                } catch (e) {
                }
                var hyperCube = getHyperCubeFromPayload(request.payload, nxPage);
                if (hyperCube.qHyperCubeDef.hasOwnProperty('qDimensions')) {
                    w += hyperCube.qHyperCubeDef.qDimensions.length;
                }
                if (hyperCube.qHyperCubeDef.hasOwnProperty('qMeasures')) {
                    w += hyperCube.qHyperCubeDef.qMeasures.length;
                }
                if (w > 1) {
                    h = Math.floor(10000 / w);
                }
                if (page > 1) {
                    t = h * (page - 1);
                }
                // nxPageToGet used later for getHyperCubeDate                       
                nxPageToGet.qTop = t;
                nxPageToGet.qWidth = w;
                nxPageToGet.qHeight = h;
                logger.info("hyperCube", JSON.stringify(hyperCube,null,4));
                logger.info("nxPageToGet", nxPageToGet);
                return doc.createSessionObject(hyperCube);
            })
            .then(obj =>
                obj.getLayout()
                    .then(layout => {
                        if (layout.hasOwnProperty('qHyperCube')) {
                            return layout.qHyperCube;
                        } else {
                            return {};
                        }
                    })
                    .catch(utils.genericCatch)
                    .then(layout => {
                        var names = [],
                            types = [];
                        if (layout.hasOwnProperty('qDimensionInfo')) {
                            layout.qDimensionInfo.forEach((dim) => {
                                names.push(dim.qFallbackTitle);
                                if (dim.qTags.indexOf(fieldTags.date) > -1 || dim.qTags.indexOf(fieldTags.timestamp) > -1) {
                                    types.push(fieldTypes.timestamp);
                                } else {
                                    types.push(dim.qDimensionType);
                                }
                            });
                        }
                        if (layout.hasOwnProperty('qMeasureInfo')) {
                            layout.qMeasureInfo.forEach((measure) => {
                                names.push(measure.qFallbackTitle);
                                types.push(measureTypes[measure.qNumFormat.qType]);
                            });
                        }
                        logger.info('fieldNames:', names, 'fieldTypes:', types);

                        return obj.getHyperCubeData("/qHyperCubeDef", [nxPageToGet])
                            .then(cube => {
                                session.close();
                                var res = [];
                                if (cube.length > 0 && cube[0].hasOwnProperty('qMatrix')) {
                                    cube[0].qMatrix.forEach(row => {
                                        var resVal = {};
                                        row.forEach((value, i) => {
                                            if (value.hasOwnProperty('qIsNull') && value.qIsNull) {
                                                resVal[names[i]] = null;
                                            } else {
                                                if (types[i] == fieldTypes.discrete) {
                                                    if (value.hasOwnProperty('qNum') && !isNaN(value.qNum)) {
                                                        resVal[names[i]] = value.qNum;
                                                    } else if (value.hasOwnProperty('qText')) {
                                                        resVal[names[i]] = value.qText;
                                                    } else {
                                                        resVal[names[i]] = "null";
                                                    }
                                                } else if (types[i] == fieldTypes.numeric) {
                                                    resVal[names[i]] = value.qNum;
                                                } else if (types[i] == fieldTypes.timestamp) {
                                                    resVal[names[i]] = utils.dateFromQlikNumber(value.qNum).toJSON();
                                                }
                                            }
                                        });
                                        res.push(resVal);
                                    });
                                }
                                return res;
                            });
                    })
                )
            .then(res => {
                return res;
            })
            .catch(error => {
                console.error('Error occured:', error);
                return {error: error.message};
            });
    }

}