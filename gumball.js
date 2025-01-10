document.addEventListener("DOMContentLoaded", () => {
  // Set up dimensions based on container
  const container = d3.select(".gumball-viz");
  const width = container.node().getBoundingClientRect().width;
  const height = container.node().getBoundingClientRect().height;

  // Create SVG container
  const svg = container
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`);

  // Append defs for patterns and filters
  const defs = svg.append("defs");

  // Define grayscale filter
  defs
    .append("filter")
    .attr("id", "grayscale-gumball")
    .append("feColorMatrix")
    .attr("type", "saturate")
    .attr("values", "0");

  // Define circle radius - doubled size
  const radius = 40;

  // Load data
  d3.json("results_with_affect_and_toxicity_updated.json").then(function (
    data
  ) {
    // Initialize node positions at the top, spread out more horizontally
    data.forEach((d, i) => {
      d.x = width / 2 + (Math.random() - 0.5) * width * 0.6;
      d.y = -radius * 3 * (i + 1);

      // Create pattern for president image
      if (d.imagePath) {
        d.patternId = `pattern-gumball-${i}`;
        const pattern = defs
          .append("pattern")
          .attr("id", d.patternId)
          .attr("width", 1)
          .attr("height", 1)
          .attr("patternUnits", "objectBoundingBox");

        pattern
          .append("image")
          .attr("href", d.imagePath)
          .attr("width", radius * 2)
          .attr("height", radius * 2)
          .attr("preserveAspectRatio", "xMidYMid slice")
          .attr("filter", "url(#grayscale-gumball)");
      }
    });

    // Create circles
    const nodes = svg
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("r", radius)
      .attr("fill", (d) => (d.patternId ? `url(#${d.patternId})` : "steelblue"))
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .style("stroke", "#ccc")
      .style("stroke-width", "1px");

    // Define target point for bottom-right clustering
    const targetX = width - radius * 3;
    const targetY = height - radius * 3;

    // Custom force to handle bottom-right clustering
    function clusteringForce(alpha) {
      const k = 0.2 * alpha; // Strength of attraction to target point

      return function (d) {
        // Calculate direction to target
        const dx = targetX - d.x;
        const dy = targetY - d.y;

        // Apply force toward target
        d.vx += dx * k;
        d.vy += dy * k;
      };
    }

    // Add gentle floating motion function
    function floatingForce(alpha) {
      const time = Date.now() * 0.001;
      return function (d) {
        d.vy += Math.sin(time + d.x) * 0.1 * alpha;
        d.vx += Math.cos(time + d.y) * 0.05 * alpha;
      };
    }

    // Set up forces for physics simulation
    const simulation = d3
      .forceSimulation(data)
      .force("gravity", d3.forceY(height - radius).strength(0.3))
      .force("gravityX", d3.forceX(width - radius).strength(0.3))
      .force("cluster", clusteringForce)
      .force("collide", d3.forceCollide(radius).strength(0.8).iterations(2))
      .force("floating", floatingForce)
      .velocityDecay(0.9)
      .alphaMin(0.001)
      .alphaDecay(0.001)
      .alpha(0.1);

    // Prevent simulation from stopping
    simulation.on("end", () => {
      simulation.alpha(0.1).alphaDecay(0).restart();
    });

    // Update circle positions on each tick
    simulation.on("tick", () => {
      data.forEach((d) => {
        // Add dampening to prevent excessive motion
        if (Math.abs(d.vy) > 0.5) d.vy *= 0.9;
        if (Math.abs(d.vx) > 0.3) d.vx *= 0.9;

        // Keep circles within bounds with some padding
        const padding = radius * 1.5;
        d.x = Math.max(radius, Math.min(width - padding, d.x));
        d.y = Math.min(height - padding, Math.max(radius, d.y));
      });

      nodes.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });

    // Remove walls since we're using natural clustering
    svg.selectAll(".wall").remove();
  });
});
