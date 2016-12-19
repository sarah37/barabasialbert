var wGraph = 800
var hGraph = 800
var barWidth = 10

// how many edges does each incoming node form
var m = 1;

d3.select("#restartButton").on("click", function() {
    m = Number(document.getElementById("mRange").value)
    prefAt = document.getElementById("prefAt").checked
    console.log("m=", m, ", prefAt = ", prefAt)
    resetGraph();
})

// create svg
var graphSVG = d3.select("#graphDiv")
    .append("svg")
    .attr("height", hGraph)
    .attr("width", wGraph)

// create g elements for edges and nodes
var edgesG = graphSVG.append("g")
var nodesG = graphSVG.append("g")
//var statsG = statsSVG.append("g")

// initial graph: 2 connected nodes
var nodesD = [{"id": 1, "weight": 0}]
var nodesWeighted = [1]
var newNode = 1; // ids of existing nodes
var edgesD = []

// initialise variable to store max degree measured
var len = 0;

// scaling area of node to its degree
var rScale = d3.scalePow()
            .exponent(0.5)
            .domain([0,10])
            .range([1,15])

// initialise simulation
var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }))
    .force("charge", d3.forceManyBody().strength(-20))

simulation
  .nodes(nodesD)
  .on("tick", ticked);

simulation.force("link")
  .links(edgesD);

// initialise stats display
var margin = {top: 20, right: 20, bottom: 35, left: 35},
    wStats = 400 - margin.left - margin.right,
    hStats = 350 - margin.top - margin.bottom

// scales
var xScale = d3.scaleBand().rangeRound([0, wStats]).paddingInner([0.2]).paddingOuter([0.05])
var yScale = d3.scaleLinear().range([hStats,0])

// axes
var xAxis = d3.axisBottom().scale(xScale)
var yAxis = d3.axisLeft().scale(yScale)    

// append stats svg and g elements for chart and axes
var statsG = d3.select("#statsDiv").append("svg")
    .attr("width", wStats + margin.left + margin.right)
    .attr("height", hStats + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

statsG.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + hStats + ")")

statsG.append("g")
    .attr("class", "y axis")

statsG.append("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(270)")
    .attr("font-size", "14px")
    .attr("y", -20)
    .text("Number of nodes")

statsG.append("text")
    .attr("text-anchor", "end")
    .attr("font-size", "14px")
    .attr("x", wStats)
    .attr("y", 325)
    .text("Degree")

    

// this will create the initial display, afterwards, it will automatically add a new node every 2 seconds and update()
update()

// add a new node every two seconds
var twoSeconds = d3.interval(everyInterval, 2000);

function everyInterval () {
    newNode += 1;
    nodesD.push({"id": newNode, "weight": m}); // add new node
    for (var k=0; k<m; k++) {
        var tgt = chooseTarget(newNode-1)
        edgesD.push({source: newNode, target: tgt}); // add new link
        nodesWeighted.push(newNode, tgt) // add nodes to weighted list because they each have one more link now
        nodesD[tgt-1].weight += 1
    }
    update()
}

function update() {
    // update nodes and edges with the updated dataset, restart the simulation
    nodesG.selectAll(".node")
        .data(nodesD)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", function(d) {return rScale(d.weight)})
        .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    d3.selectAll(".node").transition().attr("r", function(d) {return rScale(d.weight)})
    
    edgesG.selectAll(".edge")
        .data(edgesD)
        .enter()
        .append("line")
        .attr("class", "edge")

    // restart force layout
    simulation.nodes(nodesD);
    simulation.force("link").links(edgesD);
    simulation.alpha(1).restart();

    // update stats display
    updateStats()
}

function ticked() {
    // assign updated positions to nodes and edges
    edgesG.selectAll(".edge")
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    nodesG.selectAll(".node")
        .attr("cx", function(d) { return d.x = Math.max(rScale(d.weight), Math.min(wGraph  - rScale(d.weight), d.x)); }) //  
        .attr("cy", function(d) { return d.y = Math.max(rScale(d.weight), Math.min(hGraph - rScale(d.weight), d.y)); });
}

function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

function chooseTarget() {
    // choose a target for an incoming node
    if (prefAt) {
        chosen = nodesWeighted[Math.floor((Math.random() * nodesWeighted.length))];    
    }
    else {
        chosen = nodesD[Math.floor(Math.random() * (nodesD.length-1))].id
    }
    
    return chosen
}

function updateStats() {
    // update stats bar chart
    var statsD = collectStats()

    // fix horizontal scale and axis
    keysList = [];
    for (var i=0; i<statsD.length; i++) {
        keysList.push(statsD[i][0])
    }
    xScale.domain(keysList)
    if (keysList.length>10) {
        xAxis.tickValues(keysList.filter(function(d,i) {return !(i%Math.round(keysList.length/10))}))
    }
    else {
        xAxis.tickValues(keysList)
    }

    // fix vertical scale and axis
    yScale.domain([0, d3.max(statsD, function(d) {return d[1]})])

    var maxYTick = d3.max(statsD, function(d) {return d[1]})
    if (maxYTick<10) {
        yAxis.ticks(maxYTick)
    }
    else {
        yAxis.ticks(10)
    }
    // if (maxYTick<10) {
    //     yAxis.tickValues(d3.range(maxYTick))
    // }
    // else {
    //     yAxis.tickValues()
    // }

    // var maxXTick = d3.max(statsD, function(d) {return d[0]})+1
    // if (maxXTick<10) {
    //     xAxis.tickValues(d3.range(maxXTick))
    // }
    // else {
    //     xAxis.tickValues().ticks(10)
    // }   
    

    // axes
    statsG.select(".x.axis").transition().duration(300).call(xAxis)
    statsG.select(".y.axis").transition().duration(300).call(yAxis)

    statsG.selectAll(".bar")
        .data(statsD)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", yScale(0))
        .attr("height", function(d) {return hStats-yScale(0)})

    // transition all new/ exisiting bars
    statsG.selectAll(".bar")
        .transition()
        .duration(300)
        .attr("x", function(d) {return xScale(Number(d[0])) })
        .attr("width", xScale.bandwidth())
        .attr("y", function(d) {return yScale(d[1])})
        .attr("height", function(d) {return hStats - yScale(d[1])})
}

function collectStats() {
    // collect stats
    // return an array [[degree, frequency], ...]
    var count = _.countBy(nodesD, function(n) {return n.weight})
    var keys = Object.keys(count).map(Number)
    len = d3.max([len, d3.max(keys)])
    countA = []
    for (var i=0; i<=len; i++) {
        countA.push([i, 0])
    }
    for (var i=0; i<keys.length; i++) {
        countA[keys[i]][1] = count[keys[i]]
    }
    return countA
}

function resetGraph() {
    // clearInterval(twoSeconds)
    // reset data
    nodesD = [{"id": 1, "weight": 0}]
    nodesWeighted = [1]
    newNode = 1; // ids of existing nodes
    edgesD = []
    len = 0

    // clear g elements
    d3.selectAll(".node").remove()
    d3.selectAll(".edge").remove()

    // restart timer
    // twoSeconds = d3.interval(everyInterval, 2000);
}