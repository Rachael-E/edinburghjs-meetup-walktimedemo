# Javascript Maps SDK Intro for Edinburgh JS

On the 21st November I gave a talk at the [EdinburghJS Meetup](https://www.meetup.com/edinburghjs/), hosted by [Jamie McHale](https://www.jamiemchale.com/journal/2023-11-22-edinburgh-js-maps-and-testing) in Fanduel, Edinburgh. I was invited to give an introduction to Esri technology and the [ArcGIS Maps SDK for Javascript](https://developers.arcgis.com/javascript/latest/) so I put together a simple demo that shows how to build a web app showing the location of trees within Edinburgh, using data from Edinburgh City Council. I included a service area operation (using an Esri hosted routing service) to display polygons reflecting an area you could walk to within 15 minutes, in order to show where two friends could meet from different locations within a 15 minute walk on a lunch time, and what trees they could see in the area of overlap.

You can watch the livestream recording of the talk and demo [here](https://www.youtube.com/watch?v=bwpkFsfIOQg).
 
<img width="1359" alt="Screenshot 2023-11-24 at 22 41 30" src="https://github.com/Rachael-E/edinburghjs-meetup-walktimedemo/assets/36415565/bb2b8e68-8430-4341-9ebf-c394a3d2a984">

## How to use the app

You will require an API Key from [developers.arcgis.com](https://developers.arcgis.com/javascript/latest/get-started/) to run this app and to authenticate the basemap and routing service. After forking the repo, simply run the index.html file in your browser. 

Use the basemap gallery widgit in the top right corner to change the basemap. Use the widget on the left side of the app to add the tree data with "Add tree layer". Click on the map to add locations plus their 15 min walk time polygon. Add two points on the map, then use "Find common areas" to find any overlap between the 15 min isochrones. An alert will appear to inform you how many trees are in that overlap area, and trees outside that area will be hidden. 

To see a simplified version of the trees using feature reduction, or clustering, use "Cluster data". Remove that effect with "Remove cluster effect". Reset the app with "Reset". Hover the mouse over any tree data when the clustering effect isn't active to see pop up information about the tree. 

![JSDemo](https://github.com/Rachael-E/edinburghjs-meetup-walktimedemo/assets/36415565/f0078883-f13f-4000-8266-427fd73cec38)

## Data

This app brings in data from an ArcGIS hosted [feature service](https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/All_Edinburgh_Trees/FeatureServer/0) created with data from Edinburgh City Council. The data layer was created by combining City of Edinburgh council tree data with University of Edinburgh campus tree data for King's Buildings and Pollock Halls. The tree data is Copyright City of Edinburgh Council, contains Ordnance Survey data © Crown copyright and database right 2023, used under the Open Government License v3.0 Copyright University of Edinburgh, 2023.

## How it was built
Built using the [ArcGIS Maps SDK for Javascript](https://developers.arcgis.com/javascript/latest/) and components from the [Calcite Design System](https://developers.arcgis.com/calcite-design-system/get-started/).


