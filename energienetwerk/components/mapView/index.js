'use strict';

app.mapView = kendo.observable({
    onShow: function() {},
    afterShow: function() {}
});

// START_CUSTOM_CODE_mapView
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_mapView
(function(parent) {
    var dataProvider = app.data.energienetwerk,
        /// start global model properties
        /// end global model properties
        fetchFilteredData = function(paramFilter, searchFilter) {
            var model = parent.get('mapViewModel'),
                dataSource;

            if (model) {
                dataSource = model.get('dataSource');
            } else {
                parent.set('mapViewModel_delayedFetch', paramFilter || null);
                return;
            }

            if (paramFilter) {
                model.set('paramFilter', paramFilter);
            } else {
                model.set('paramFilter', undefined);
            }

            if (paramFilter && searchFilter) {
                dataSource.filter({
                    logic: 'and',
                    filters: [paramFilter, searchFilter]
                });
            } else if (paramFilter || searchFilter) {
                dataSource.filter(paramFilter || searchFilter);
            } else {
                dataSource.filter({});
            }
        },
        processImage = function(img) {

            function isAbsolute(img) {
                if  (img && (img.slice(0,  5)  ===  'http:' || img.slice(0,  6)  ===  'https:' || img.slice(0,  2)  ===  '//'  ||  img.slice(0,  5)  ===  'data:')) {
                    return true;
                }
                return false;
            }

            if (!img) {
                var empty1x1png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=';
                img = 'data:image/png;base64,' + empty1x1png;
            } else if (!isAbsolute(img)) {
                var setup = dataProvider.setup || {};
                img = setup.scheme + ':' + setup.url + setup.appId + '/Files/' + img + '/Download';
            }

            return img;
        },
        flattenLocationProperties = function(dataItem) {
            var propName, propValue,
                isLocation = function(value) {
                    return propValue && typeof propValue === 'object' &&
                        propValue.longitude && propValue.latitude;
                };

            for (propName in dataItem) {
                if (dataItem.hasOwnProperty(propName)) {
                    propValue = dataItem[propName];
                    if (isLocation(propValue)) {
                        dataItem[propName] =
                            kendo.format('Latitude: {0}, Longitude: {1}',
                                propValue.latitude, propValue.longitude);
                    }
                }
            }
        },
        getLocation = function(options) {
            var d = new $.Deferred();

            if (options === undefined) {
                options = {
                    enableHighAccuracy: true
                };
            }

            navigator.geolocation.getCurrentPosition(
                function(position) {
                    d.resolve(position);
                },
                function(error) {
                    d.reject(error);
                },
                options);

            return d.promise();
        },
        defaultMapContainer = 'mapViewModelMap',
        setupMapView = function(container) {
            if (!mapViewModel.map) {
                if (typeof container !== 'string') {
                    container = defaultMapContainer;
                }
                mapViewModel.map = L.map(container);
                mapViewModel.markersLayer = new L.FeatureGroup();

                var tileLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                    attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                    id: 'mapbox.streets',
                    accessToken: 'pk.eyJ1Ijoicm9sYW5kZGVwaWpwZXIiLCJhIjoiY2lyNjR5aTJrMDAwemlobm9kY3dpZnpjZCJ9.GZcY2N_EdUJgNAyGbGZ4uQ'
                });

                mapViewModel.map.addLayer(tileLayer);

                mapViewModel.map.addLayer(mapViewModel.markersLayer);
                mapViewModel.map.on('click', function(e) {
                    mapViewModel.set('itemDetailsVisible', false);
                });
            }

            addMarkersView();
        },
        addMarkersView = function() {
            getLocation()
                .then(function(userPosition) {
                    var marker,
                        currentMarker, currentMarkerIcon,
                        latLang,
                        position,
                        mapBounds,
                        data = mapViewModel.get('dataSource').data(),
                        userLatLang = L.latLng(userPosition.coords.latitude, userPosition.coords.longitude);

                    mapViewModel.map.setView(userLatLang, 15, {
                        animate: false
                    });
                    mapBounds = mapViewModel.map.getBounds();
                    mapViewModel.markersLayer.clearLayers();

                    for (var i = 0; i < data.length; i++) {

                        var Color;

                        switch (data[i].Type) {
                            case "Gasleiding":
                                    Color = "red";
                                    break;
                            case "Riool":
                                    Color = "yellow";
                                    break;
                            case "Waterleiding":
                                    Color = "blue";
                                    break;
                            default:
                                    Color = "black";
                        }

                        var polyline = L.polyline([], {color: Color}).addTo(mapViewModel.map);

                        position = data[i].BeginPunt || {};

                        if (position.hasOwnProperty('latitude') && position.hasOwnProperty('longitude')) {
                            latLang = [position.latitude, position.longitude];
                        } else if (position.hasOwnProperty('Latitude') && position.hasOwnProperty('Longitude')) {
                            latLang = [position.Latitude, position.Longitude];
                        }

                        if (latLang && latLang[0] !== undefined && latLang[1] !== undefined) {
                            marker = L.marker(latLang, {
                                uid: data[i].uid
                            });
                            mapBounds.extend(latLang);
                            mapViewModel.markersLayer.addLayer(marker);
                        }

                        polyline.addLatLng(latLang);

                        position = data[i].EindPunt || {};

                        if (position.hasOwnProperty('latitude') && position.hasOwnProperty('longitude')) {
                            latLang = [position.latitude, position.longitude];
                        } else if (position.hasOwnProperty('Latitude') && position.hasOwnProperty('Longitude')) {
                            latLang = [position.Latitude, position.Longitude];
                        }

                        if (latLang && latLang[0] !== undefined && latLang[1] !== undefined) {
                            marker = L.marker(latLang, {
                                uid: data[i].uid
                            });
                            mapBounds.extend(latLang);
                            mapViewModel.markersLayer.addLayer(marker);
                        }

                        polyline.addLatLng(latLang);
                    }

                    currentMarkerIcon = L.divIcon({
                        className: 'current-marker',
                        iconSize: [20, 20],
                        iconAnchor: [20, 20]
                    });

                    currentMarker = L.marker(userLatLang, {
                        icon: currentMarkerIcon
                    });

                    mapViewModel.markersLayer.addLayer(currentMarker);

                    mapViewModel.markersLayer.on('click', function(e) {
                        var marker, newItem;

                        marker = e.layer;
                        if (marker.options.icon.options.className.indexOf('current-marker') >= 0) {
                            return;
                        }

                        newItem = mapViewModel.setCurrentItemByUid(marker.options.uid);
                        mapViewModel.set('itemDetailsVisible', true);
                    });

                    mapViewModel.set('mapVisble', true);
                    mapViewModel.map.invalidateSize({
                        reset: true
                    });
                    mapViewModel.map.fitBounds(mapBounds, {
                        padding: [20, 20]
                    });
                    app.mobileApp.pane.loader.hide();
                })
                .then(null, function(error) {
                    app.mobileApp.pane.loader.hide();
                    alert('code: ' + error.code + '\n' + 'message: ' + error.message + '\n');
                });
        },

        dataSourceOptions = {
            type: 'everlive',
            transport: {
                typeName: 'Buis',
                dataProvider: dataProvider
            },
            change: function(e) {
                var data = this.data();
                for (var i = 0; i < data.length; i++) {
                    var dataItem = data[i];

                }
            },
            error: function(e) {
                app.mobileApp.pane.loader.hide();
                if (e.xhr) {
                    var errorText = "";
                    try {
                        errorText = JSON.stringify(e.xhr);
                    } catch (jsonErr) {
                        errorText = e.xhr.responseText || e.xhr.statusText || 'An error has occurred!';
                    }
                    alert(errorText);
                }
            },
            schema: {
                model: {
                    fields: {
                        'Type': {
                            field: 'Type',
                            defaultValue: ''
                        },
                    }
                }
            },
            serverFiltering: true,
            serverSorting: true,
            sort: {
                field: 'CreatedAt',
                dir: 'asc'
            },
        },
        /// start data sources
        /// end data sources
        mapViewModel = kendo.observable({
            _dataSourceOptions: dataSourceOptions,
            fixHierarchicalData: function(data) {
                var result = {},
                    layout = {};

                $.extend(true, result, data);

                (function removeNulls(obj) {
                    var i, name,
                        names = Object.getOwnPropertyNames(obj);

                    for (i = 0; i < names.length; i++) {
                        name = names[i];

                        if (obj[name] === null) {
                            delete obj[name];
                        } else if ($.type(obj[name]) === 'object') {
                            removeNulls(obj[name]);
                        }
                    }
                })(result);

                (function fix(source, layout) {
                    var i, j, name, srcObj, ltObj, type,
                        names = Object.getOwnPropertyNames(layout);

                    if ($.type(source) !== 'object') {
                        return;
                    }

                    for (i = 0; i < names.length; i++) {
                        name = names[i];
                        srcObj = source[name];
                        ltObj = layout[name];
                        type = $.type(srcObj);

                        if (type === 'undefined' || type === 'null') {
                            source[name] = ltObj;
                        } else {
                            if (srcObj.length > 0) {
                                for (j = 0; j < srcObj.length; j++) {
                                    fix(srcObj[j], ltObj[0]);
                                }
                            } else {
                                fix(srcObj, ltObj);
                            }
                        }
                    }
                })(result, layout);

                return result;
            },
            itemClick: function(e) {
                var dataItem = e.dataItem || mapViewModel.originalItem;

                app.mobileApp.navigate('#components/mapView/details.html?uid=' + dataItem.uid);

            },
            detailsShow: function(e) {
                var uid = e.view.params.uid,
                    dataSource = mapViewModel.get('dataSource'),
                    itemModel = dataSource.getByUid(uid);

                mapViewModel.setCurrentItemByUid(uid);

                /// start detail form show
                /// end detail form show
            },
            setCurrentItemByUid: function(uid) {
                var item = uid,
                    dataSource = mapViewModel.get('dataSource'),
                    itemModel = dataSource.getByUid(item);

                if (!itemModel.Type) {
                    itemModel.Type = String.fromCharCode(160);
                }

                mapViewModel.set('originalItem', itemModel);
                mapViewModel.set('currentItem',
                    mapViewModel.fixHierarchicalData(itemModel));

                /// start detail form initialization
                /// end detail form initialization

                return itemModel;
            },
            linkBind: function(linkString) {
                var linkChunks = linkString.split('|');
                if (linkChunks[0].length === 0) {
                    return this.get('currentItem.' + linkChunks[1]);
                }
                return linkChunks[0] + this.get('currentItem.' + linkChunks[1]);
            },
            imageBind: function(imageField) {
                if (!imageField) {
                    return;
                }
                if (imageField.indexOf('|') > -1) {
                    return processImage(this.get('currentItem.' + imageField.split('|')[0]));
                }
                return processImage(imageField);
            },
            currentItem: {}
        });

    if (typeof dataProvider.sbProviderReady === 'function') {
        dataProvider.sbProviderReady(function dl_sbProviderReady() {
            parent.set('mapViewModel', mapViewModel);
            var param = parent.get('mapViewModel_delayedFetch');
            if (typeof param !== 'undefined') {
                parent.set('mapViewModel_delayedFetch', undefined);
                fetchFilteredData(param);
            }
        });
    } else {
        parent.set('mapViewModel', mapViewModel);
    }

    parent.set('onShow', function(e) {
        var param = e.view.params.filter ? JSON.parse(e.view.params.filter) : null,
            isListmenu = false,
            backbutton = e.view.element && e.view.element.find('header [data-role="navbar"] .backButtonWrapper'),
            dataSourceOptions = mapViewModel.get('_dataSourceOptions'),
            dataSource;

        if (param || isListmenu) {
            backbutton.show();
            backbutton.css('visibility', 'visible');
        } else {
            if (e.view.element.find('header [data-role="navbar"] [data-role="button"]').length) {
                backbutton.hide();
            } else {
                backbutton.css('visibility', 'hidden');
            }
        }

        app.mobileApp.pane.loader.show();
        mapViewModel.set('mapVisble', false);
        mapViewModel.set('itemDetailsVisible', false);

        dataSource = new kendo.data.DataSource(dataSourceOptions);
        mapViewModel.set('dataSource', dataSource);
        dataSource.one('change', setupMapView);
        fetchFilteredData(param);
    });

    parent.set('onHide', function() {
        var dataSource = mapViewModel.get('dataSource');
        dataSource.unbind('change', setupMapView);
    });

})(app.mapView);

// START_CUSTOM_CODE_mapViewModel
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_mapViewModel