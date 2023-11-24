require([
    "esri/config",
    "esri/Map",
    "esri/views/MapView",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand",
    "esri/rest/serviceArea",
    "esri/rest/support/ServiceAreaParameters",
    "esri/rest/support/FeatureSet",
    "esri/Graphic",
    "esri/rest/networkService",
    "esri/geometry/geometryEngine",
    "esri/layers/FeatureLayer",
    "esri/core/reactiveUtils",
    "esri/layers/support/FeatureFilter",
    "esri/core/promiseUtils",
    "esri/widgets/Feature"

], function (
    esriConfig,
    Map,
    MapView,
    BasemapGallery,
    Expand,
    serviceArea,
    ServiceAreaParams,
    FeatureSet,
    Graphic,
    networkService,
    geometryEngine,
    FeatureLayer,
    reactiveUtils,
    FeatureFilter,
    promiseUtils,
    Feature

) {

    (async () => {

        // Authenticate requests with an API key from developers.arcgis.com
        const apiKey = "YOUR_API_KEY";
        esriConfig.apiKey = apiKey;
        // REST service for calculating service areas
        const serviceAreaUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/ServiceAreas/NAServer/ServiceArea_World/";

        // Set up service area configurations
        let serviceAreaPolygons;
        const serviceDescription = await networkService.fetchServiceDescription(serviceAreaUrl, apiKey);
        const { supportedTravelModes } = serviceDescription; // get the walking time travel mode
        const walkingTimetravelMode = supportedTravelModes.find((mode) => mode.name === "Walking Time");

        // Create a new map and add it to the map view
        const map = new Map({
            basemap: "osm/standard",
        });

        const view = new MapView({
            map: map,
            center: [-3.210, 55.942], // Longitude, latitude (Fanduel, Edinburgh)
            zoom: 15,
            container: "viewDiv",
            popup: {
                defaultPopupTemplateEnabled: false // turn off pop ups to allow mouse over queries only
            }
        });

        // Set up mouse over widget for querying data
        const mouseOverGraphic = {
            popupTemplate: {
                content: "Mouse over features to show details..."
            }
        };

        // Provide graphic to a new instance of a Feature widget
        const mouseOverFeature = new Feature({
            graphic: mouseOverGraphic,
            map: view.map,
            spatialReference: view.spatialReference
        });

        view.ui.add(mouseOverFeature, "bottom-left");

        // Display a basemap gallery
        let basemapGallery = new BasemapGallery({
            view: view,
            container: "basemapGalleryDiv"
        });

        const bgExpand = new Expand({
            view,
            content: basemapGallery,
            expandIcon: "basemap"
        });
        view.ui.add(bgExpand, "top-right");
        view.ui.add(document.getElementById("calciteActionPad"), "top-left");

        // Display trees of Edinburgh (from a feature service, data Copyright City of Edinburgh Council)
        const featureLayer = new FeatureLayer({
            url:
                "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/All_Edinburgh_Trees/FeatureServer/0"
        });

        // Set up template for pop up
        const template = {
            title: "Tree Information",
            content: [
                {
                    type: "fields",
                    fieldInfos: [
                        {
                            fieldName: "DisplaySpecies",
                            label: "Tree species"
                        },
                        {
                            fieldName: "CommonName",
                            label: "Common name"
                        },
                        {
                            fieldName: "LatinName",
                            label: "Latin name"
                        },
                        {
                            fieldName: "AgeGroup",
                            label: "Rough age"
                        }
                    ]
                }
            ]
        };

        // Configure feature layer 
        featureLayer.popupEnabled = false; // disable mouse click pop ups
        featureLayer.popupTemplate = template; // template for mouse hover over
        featureLayer.renderer = {
            type: "simple",
            symbol: {
                type: "web-style",
                styleName: "Esri2DPointSymbolsStyle", // creates a new symbol from https://developers.arcgis.com/calcite-design-system/
                name: "park",
            }
        };

        // When the user clicks on the map, create a service area isochrone showing a 15 min walk time from location
        view.on("click", function (event) {
            const locationGraphic = createGraphic(event.mapPoint);
            const walkTimeCutoffs = [15]; // Minutes at 5km/hr
            const serviceAreaParams = createServiceAreaParams(locationGraphic, walkTimeCutoffs, view.spatialReference);
            solveServiceArea(serviceAreaUrl, serviceAreaParams);
        });

        const addLayerAction = document.getElementById('addLayer');
        let featureLayerView = null;

        addLayerAction.addEventListener('click', () => {
            map.add(featureLayer);
            // get the feature layer view and mouse over pop ups
            view.whenLayerView(featureLayer).then(function (layerView) {
                reactiveUtils.when(
                    () => !layerView.updating,
                    (val) => {
                        featureLayerView = layerView;

                        let highlight;
                        let objectId;

                        const debouncedUpdate = promiseUtils.debounce(async (event) => {
                            // Perform a hitTest on the View
                            const hitTest = await view.hitTest(event);
                            // Make sure graphic has a popupTemplate
                            const results = hitTest.results.filter((result) => {
                                return result.graphic.layer.popupTemplate;
                            });

                            const result = results[0];
                            const newObjectId = result?.graphic.attributes[featureLayer.objectIdField];

                            if (!newObjectId) {
                                highlight?.remove();
                                objectId = mouseOverFeature.graphic = null;
                            } else if (objectId !== newObjectId) {
                                highlight?.remove();
                                objectId = newObjectId;
                                mouseOverFeature.graphic = result.graphic;
                                highlight = layerView.highlight(result.graphic);
                            }
                        });

                        // Listen for the pointer-move event on the View
                        view.on("pointer-move", (event) => {
                            debouncedUpdate(event).catch((err) => {
                                if (!promiseUtils.isAbortError(err)) {
                                    throw err;
                                }
                            });
                        });
                    }
                );
            });
        })

        const alertBox = document.getElementById('alert');
        const alertTitle = document.getElementById('alertTitle');
        const reset = document.getElementById('reset');
        
        // Removes data clustering and service areas
        reset.addEventListener('click', () => {
            featureLayer.featureReduction = null;
            view.graphics.removeAll();
            featureLayerView.filter = null;
            alertBox.open = false;
        })

        // Applies clustering to tree data layer
        const handleClustering = document.getElementById('clustering');
        handleClustering.addEventListener('click', () => {
            handleFeatureReduction(featureLayer);
        })

        // Removes clustering from tree data layer
        const handleRemoveClustering = document.getElementById('removeClustering');
        handleRemoveClustering.addEventListener('click', () => {
            featureLayer.featureReduction = null;
        })

        // Finds intersection of first two geometries from service area, zooms to it and counts features visible
        const findOverlapAction = document.getElementById('commonAreas');
        findOverlapAction.addEventListener('click', async () => {

            const geometryArray = [];
            let firstPolygonGraphicGeometry = null;
            let secondPolygonGraphicGeometry = null;
            view.graphics.forEach(function (graphic) {
                if (graphic.geometry.type === "polygon") {
                    geometryArray.push(graphic.geometry);
                }
            });

            if (geometryArray.length >= 2) {
                firstPolygonGraphicGeometry = geometryArray[0];
                secondPolygonGraphicGeometry = geometryArray[1];

                const intersectingPolygon = geometryEngine.intersect(firstPolygonGraphicGeometry, secondPolygonGraphicGeometry);

                view.graphics.removeAll();
                const newGraphic = new Graphic({
                    geometry: intersectingPolygon,
                    outline: {  // autocasts as new SimpleLineSymbol()
                        type: "simple-line",
                        color: [0, 0, 255],
                        width: "2px",
                        join: "round"
                    },
                    symbol: {
                        type: "simple-fill",
                        style: "solid",
                        color: [104, 195, 163, 0.25]
                    }
                });

                view.graphics.add(newGraphic);

                if (view.graphics.length >= 1) {
                    view.goTo(newGraphic.geometry.extent);

                    featureLayerView.filter = new FeatureFilter({
                        geometry: newGraphic.geometry,
                        spatialRelationship: "intersects",
                        units: "miles"
                    });

                    const count = await featureLayerView.queryFeatureCount();

                    // featureLayer.queryFeatureCount().then(function (numFeatures) {
                    //     console.log(numFeatures);
                    // })
                    alertBox.open = true;
                    alertTitle.textContent = "There are " + count + " trees to see.";
                };
            }
        });

        // Create the location graphic
        function createGraphic(point) {
            const graphic = new Graphic({
                geometry: point,
                symbol: {
                    type: "web-style",
                    styleName: "Esri2DPointSymbolsStyle",
                    name: "esri-pin-2",
                }
            });

            view.graphics.add(graphic);
            return graphic;
        }

        // Creates the service area parameters for the clicked location, input walk time and spatial reference
        function createServiceAreaParams(locationGraphic, walkTimeCutoffs, outSpatialReference) {

            // Create one or more locations (facilities) to solve for
            const featureSet = new FeatureSet({
                features: [locationGraphic]
            });

            // Set all of the input parameters for the service
            const taskParameters = new ServiceAreaParams({
                facilities: featureSet,
                defaultBreaks: walkTimeCutoffs,
                trimOuterPolygon: true,
                travelMode: walkingTimetravelMode,
                outSpatialReference: outSpatialReference
            });
            return taskParameters;

        }

        // Solves the service area response by drawing returned information on the map
        function solveServiceArea(url, serviceAreaParams) {

            return serviceArea.solve(url, serviceAreaParams)
                .then(function (result) {
                    if (result.serviceAreaPolygons.features.length) {
                        // Draw each service area polygon
                        serviceAreaPolygons = result.serviceAreaPolygons;
                        serviceAreaPolygons.features.forEach(function (graphic) {
                            graphic.symbol = {
                                type: "simple-fill",
                                color: "rgba(245,161,145,.25)"
                            }
                            view.graphics.add(graphic, 0);
                        });

                    }
                }, function (error) {
                    console.log(error);
                });
        }

        // Handles the feature reduction (clustering) effect of the data
        function handleFeatureReduction(featureLayer) {
            featureLayer.featureReduction = {
                type: "cluster",
                clusterRadius: "50px",
                clusterMinSize: "25px",
                clusterMaxSize: "50px"
            };
        }
    })();
});
