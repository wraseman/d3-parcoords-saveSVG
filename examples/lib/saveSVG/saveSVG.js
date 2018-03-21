function saveSVG(parcoords){
    // This is a bit of a hack, but here goes
    // we are going to replace the canvas.context with another context
    // that generates svg but has the same interface as a canvas.context. Next, we
    // extract the SVG from this. After this we put back the original
    // contexts. The reason for this last step is that
    // the scaling of the temporary context is wrong, probably due to retina
    // specific scaling moreover.

    // define layers
    // const layerNames = ["marks", "foreground", "brushed", "highlight"];
    let canvasArray = d3.selectAll("canvas");
    const layerNames = [];
    for (let i=0; i<canvasArray[0].length; i++) {
      layerNames[i] = canvasArray[0][i].className;
    }

    // create new contextx from each layer using canvas2svg (http://gliffy.github.io/canvas2svg/)
    const oldLayers = {};
    let oldLayerContext;
    let newLayerContext;
    let layerName;

    for (let i=0; i<layerNames.length; i++){
        layerName = layerNames[i];  // set current layer name

        oldLayerContext = parcoords.ctx[layerName];  // save canvas context so we can display it at the end
        newLayerContext = new C2S(d3.select('canvas').attr('width'), d3.select('canvas').attr('width'));  // create new, mock context using canvas2svg

        oldLayers[layerName] = oldLayerContext;  // save each original contexts
        parcoords.ctx[layerName] = newLayerContext;  // replace each original context with the canvas2svg mock context
    }
    parcoords.render();

    debugger;

    // serialize SVG element to XML document
  	const svgAxis = new XMLSerializer().serializeToString(d3.select("svg").node());
  	const axisXmlDocument = $.parseXML(svgAxis);

    // add a new node into which we are going to add the lines
    // by copying the node from the axis svg, we get the
    // transform and other info, so the lines and the axis are
    // positioned in the same way
    const oldNode = axisXmlDocument.getElementsByTagName('g')[0];
    const newNode = oldNode.cloneNode(true);
    while (newNode.hasChildNodes()){
        newNode.removeChild(newNode.lastChild);
    }

    // we add the new node at the top. groups are rendered on top of each other,
    // so by having the axis layer as last they are displayed on top,
    // this also motivated the order of the layerNames
    axisXmlDocument.documentElement.insertBefore(newNode, oldNode);

    // add all lines to the newly created node
    let svgLines;
    let xmlDocument;
    for (let i=0; i<layerNames.length; i++){
        // get svg for layer
        layerName = layerNames[i];
        svgLines = parcoords.ctx[layerName].getSerializedSvg(true);
        xmlDocument = $.parseXML(svgLines);

        // scale is set to 2,2 on retina screens, this is relevant for canvas
        // not for svg, so we explicitly overwrite it
        xmlDocument.getElementsByTagName("g")[0].setAttribute("transform", "scale(1,1)");

        // for convenience add the name of the layer to the group as class
        xmlDocument.getElementsByTagName("g")[0].setAttribute("class", layerName);

        // make <rect> transparent for each canvas layer
        if (layerName != "marks") {  // all layers have a <rect> element associated with it except for the "marks" layer
          xmlDocument.getElementsByTagName("g")[0].getElementsByTagName("rect")[0].setAttribute("fill", "none");
        }

        // add the group to the node
        // each layers has 2 nodes, a defs node and the actual svg
        // we can safely ignore the defs node
        newNode.appendChild(xmlDocument.documentElement.childNodes[1]);
    }

    // turn merged xml document into string
    const merged = new XMLSerializer().serializeToString(axisXmlDocument.documentElement);

    // turn the string into a blob and use FileSaver.js to enable saving it
    const blob = new Blob([merged], {type:"image/svg+xml"});
    saveAs(blob, "parcoords.svg");

    // we are done extracting the SVG information so
    // put the original canvas contexts back
    for (let i=0; i<layerNames.length; i++){
        parcoords.ctx[layerNames[i]] = oldLayers[layerNames[i]];
    }
    parcoords.render();
}
