// main.js

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
  // Set up dimensions based on adc-viz
  const svgSection = document.querySelector(".adc-viz");
  const width = svgSection.clientWidth;
  const height = svgSection.clientHeight;

  // Create SVG container within adc-viz
  const svg = d3
    .select(".adc-viz")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  // Append defs for patterns and filters
  const defs = svg.append("defs");

  // Define grayscale filter
  defs
    .append("filter")
    .attr("id", "grayscale")
    .append("feColorMatrix")
    .attr("type", "saturate")
    .attr("values", "0");

  // ! Create background rectangle with gradient
  const background = svg
    .append("rect")
    .attr("width", width)
    .attr("height", "90vh") // Match height to container
    .attr("x", 0)
    .attr("y", 0)
    .attr("rx", 5)
    .attr("ry", 5)
    .style("stroke", "black")
    .style("stroke-width", "1px")
    .attr("fill", "url(#adc-gradient)");

  // Define linear gradient
  const gradient = defs
    .append("linearGradient")
    .attr("id", "adc-gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%");

  gradient.append("stop").attr("offset", "0%").attr("stop-color", "#FFFFFF");

  gradient.append("stop").attr("offset", "100%").attr("stop-color", "#FFD966");

  // ! Define circle radius for each prez
  const radius = 30; // Circle radius

  // ! Load data
  d3.json("results_with_affect_and_toxicity_updated.json").then(function (
    data
  ) {
    // Parse data and convert necessary fields to numbers
    data.forEach((d, i) => {
      d.arousal_high_pct = +d.arousal_high_pct;
      d.dominance_low_pct = +d.dominance_low_pct;
      d.concreteness_high_pct = +d.concreteness_high_pct;

      // Check if imagePath exists
      if (d.imagePath) {
        d.patternId = `pattern-${i}`;

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
          .attr("filter", "url(#grayscale)");
      }
    });

    // Set up scales for different modes
    const xScales = {
      speech: d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d.arousal_high_pct))
        .range([50, width - 50]),
      bigWords: d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d.dominance_low_pct))
        .range([50, width - 50]),
      smallWords: d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d.concreteness_high_pct))
        .range([50, width - 50]),
    };

    // Create initial simulation with stronger collision force
    let simulation = d3
      .forceSimulation(data)
      .force(
        "x",
        d3.forceX((d) => xScales.speech(d.arousal_high_pct)).strength(0.2)
      )
      .force("y", d3.forceY(height / 2).strength(0.1))
      .force("collide", d3.forceCollide(radius + 1).strength(1)) // Increased strength and added 1px buffer
      .velocityDecay(0.3)
      .alphaDecay(0.05)
      .on("tick", ticked);

    // Create circles
    let nodes = svg
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("r", radius)
      .style("cursor", "pointer")
      .attr("fill", function (d) {
        return d.patternId ? `url(#${d.patternId})` : "steelblue";
      })
      .on("click", showTooltip);

    // Create tooltip div if it doesn't exist
    const tooltipDiv = d3.select("body").selectAll("#tooltip").data([0]);
    const tooltip = tooltipDiv
      .enter()
      .append("div")
      .attr("id", "tooltip")
      .style("display", "none")
      .merge(tooltipDiv);

    // Prevent clicks inside tooltip from closing it
    tooltip.on("click", function (event) {
      event.stopPropagation();
    });

    // Add body click handler to close tooltip
    d3.select("body").on("click", hideTooltip);

    function ticked() {
      svg
        .selectAll("circle")
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y);
    }

    // ! Buttons

    // Create button container within adc-viz
    const buttonContainer = d3
      .select(".adc-viz")
      .append("div")
      .attr("class", "button-container")
      .style("position", "absolute")
      .style("top", "90px")
      .style("left", "50%")
      .style("transform", "translateX(-50%)");

    // Add buttons
    const buttons = [
      { id: "speech-btn", text: "Arousal", mode: "speech" },
      { id: "bigWords-btn", text: "Dominance", mode: "bigWords" },
      { id: "smallWords-btn", text: "Concreteness", mode: "smallWords" },
    ];

    buttons.forEach((button) => {
      buttonContainer
        .append("button")
        .attr("id", button.id)
        .attr("class", `toggle-btn ${button.mode === "speech" ? "active" : ""}`)
        .text(button.text.toUpperCase())
        .style("font-family", "Averia Serif Libre")
        .style("font-size", "14px")
        .on("click", () => updateVisualization(button.mode));
    });

    // ! Axis Labels

    // Add labels container
    const labels = svg.append("g").attr("class", "axis-labels");

    function updateAxisLabels(mode) {
      const labels = {
        speech: ["Lower Arousal", "Higher Arousal"],
        bigWords: ["Lower Dominance", "Higher Dominance"],
        smallWords: ["Lower Concreteness", "Higher Concreteness"],
      };

      // Update left label
      const leftGroup = d3
        .select(".axis-labels .left-group")
        .attr("transform", `translate(${width * 0.4}, ${height - 90})`);

      // Add text first to measure its width
      const leftText = leftGroup
        .select("text")
        .text(labels[mode][0])
        .attr("text-anchor", "middle")
        .style("font-family", "RoughTypewriter")
        .style("font-size", "16px");

      // Get text width and position arrow accordingly
      const leftTextWidth = leftText.node().getBBox().width;

      leftGroup
        .select("image")
        .attr("x", -(leftTextWidth / 2 + 25)) // Position arrow to the left of text with padding
        .attr("y", -12.5)
        .attr("width", 16)
        .attr("height", 16);

      // Update right label
      const rightGroup = d3
        .select(".axis-labels .right-group")
        .attr("transform", `translate(${width * 0.6}, ${height - 90})`);

      // Add text first to measure its width
      const rightText = rightGroup
        .select("text")
        .text(labels[mode][1])
        .attr("text-anchor", "middle")
        .style("font-family", "RoughTypewriter")
        .style("font-size", "16px");

      // Get text width and position arrow accordingly
      const rightTextWidth = rightText.node().getBBox().width;

      rightGroup
        .select("image")
        .attr("x", rightTextWidth / 2 + 10) // Position arrow to the right of text with padding
        .attr("y", -12.5)
        .attr("width", 16)
        .attr("height", 16);
    }

    // Create initial label groups (simplified)
    const leftGroup = labels
      .append("g")
      .attr("class", "left-group")
      .attr("transform", `translate(${width * 0.4}, ${height - 90})`);

    leftGroup
      .append("text")
      .attr("text-anchor", "middle")
      .style("font-family", "RoughTypewriter")
      .style("font-size", "16px")
      .text("Lower Arousal");

    leftGroup
      .append("image")
      .attr("href", "assets/arrow-left.svg")
      .attr("x", -69.3125)
      .attr("y", -12.5)
      .attr("width", 16)
      .attr("height", 16);

    const rightGroup = labels
      .append("g")
      .attr("class", "right-group")
      .attr("transform", `translate(${width * 0.6}, ${height - 90})`);

    rightGroup
      .append("text")
      .attr("text-anchor", "middle")
      .style("font-family", "RoughTypewriter")
      .style("font-size", "16px")
      .text("Higher Arousal");

    rightGroup
      .append("image")
      .attr("href", "assets/arrow-right.svg")
      .attr("x", 45.33203125)
      .attr("y", -12.5)
      .attr("width", 16)
      .attr("height", 16);

    // Set initial labels for speech mode
    updateAxisLabels("speech");

    function updateVisualization(mode) {
      // Update button states
      d3.selectAll(".toggle-btn").classed("active", false);
      d3.select(`#${mode}-btn`).classed("active", true);

      // Update axis labels
      updateAxisLabels(mode);

      const forceX = d3
        .forceX((d) => {
          switch (mode) {
            case "speech":
              return xScales.speech(d.arousal_high_pct);
            case "bigWords":
              return xScales.bigWords(d.dominance_low_pct);
            case "smallWords":
              return xScales.smallWords(d.concreteness_high_pct);
          }
        })
        .strength(0.2);

      simulation.force("x", forceX).alpha(0.7).restart();
    }

    function showTooltip(event, d) {
      const [x, y] = d3.pointer(event);

      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px")
        .style("display", "block");

      const activeButtonId = d3.select(".toggle-btn.active").attr("id");
      let htmlContent = `<h3>${d.President}</h3>`;

      if (activeButtonId === "speech-btn") {
        // Extract just the words from the highest arousal words
        const highArousalWords = d.arousal_extremes.highest.map(
          (item) => item[0]
        );
        const formattedWords = highArousalWords.join('," "');

        htmlContent += `${d.arousal_high_pct.toFixed(2)}% of ${
          d.President
        }'s State of the Union speeches are categorized as "highly arousing." Some of these words include "${formattedWords}."`;
      } else if (activeButtonId === "bigWords-btn") {
        // Extract just the words from the lowest dominance words
        const lowDominanceWords = d.dominance_extremes.lowest.map(
          (item) => item[0]
        );
        const formattedWords = lowDominanceWords.join('," "');

        htmlContent += `${d.dominance_low_pct.toFixed(2)}% of ${
          d.President
        }'s State of the Union speeches are categorized as "high dominance." Some of these words include "${formattedWords}."`;
      } else if (activeButtonId === "smallWords-btn") {
        // Extract just the words from the highest concreteness words
        const highConcreteWords = d.concreteness_extremes.highest.map(
          (item) => item[0]
        );
        const formattedWords = highConcreteWords.join('," "');

        htmlContent += `${d.concreteness_high_pct.toFixed(2)}% of ${
          d.President
        }'s State of the Union speeches are categorized as "highly concrete." Some of these words include "${formattedWords}."`;
      }

      tooltip.html(htmlContent);
      event.stopPropagation();
    }

    function hideTooltip() {
      tooltip.style("display", "none");
    }
  });
});
