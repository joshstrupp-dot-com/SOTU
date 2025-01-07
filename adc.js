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
  d3.json("results2_updates.json").then(function (data) {
    // Parse data and convert necessary fields to numbers
    data.forEach((d, i) => {
      d.avg_AoA = +d.avg_AoA;
      d.avg_biggest_words_rating = +d.avg_biggest_words_rating;
      d.avg_smallest_words_rating = +d.avg_smallest_words_rating;
      d.biggest_sentence_rating = +d.biggest_sentence_rating;
      d.smallest_sentence_rating = +d.smallest_sentence_rating;

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
        .domain(d3.extent(data, (d) => d.avg_AoA))
        .range([50, width - 50]),
      bigWords: d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d.avg_biggest_words_rating))
        .range([50, width - 50]),
      smallWords: d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d.avg_smallest_words_rating))
        .range([50, width - 50]),
      sentences: d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d.biggest_sentence_rating))
        .range([50, width - 50]),
    };

    // Create initial simulation with stronger collision force
    let simulation = d3
      .forceSimulation(data)
      .force("x", d3.forceX((d) => xScales.speech(d.avg_AoA)).strength(0.2))
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
      { id: "speech-btn", text: "Speech", mode: "speech" },
      { id: "bigWords-btn", text: "Big Words", mode: "bigWords" },
      { id: "smallWords-btn", text: "Small Words", mode: "smallWords" },
      { id: "sentences-btn", text: "Sentences", mode: "sentences" },
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
        speech: ["Younger AoA", "Older AoA"],
        bigWords: ["Lower Rating", "Higher Rating"],
        smallWords: ["Lower Rating", "Higher Rating"],
        sentences: ["Lower Rating", "Higher Rating"],
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
      .text("Younger AoA");

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
      .text("Older AoA");

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
              return xScales.speech(d.avg_AoA);
            case "bigWords":
              return xScales.bigWords(d.avg_biggest_words_rating);
            case "smallWords":
              return xScales.smallWords(d.avg_smallest_words_rating);
            case "sentences":
              return xScales.sentences(d.biggest_sentence_rating);
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
        htmlContent += `A ${d.avg_AoA.toFixed(
          2
        )} year old could recognize every word in ${
          d.President
        }'s SOTU addresses.`;
      } else if (activeButtonId === "bigWords-btn") {
        htmlContent += `Average Big Words Rating: ${d.avg_biggest_words_rating.toFixed(
          2
        )}<br><br>`;
        if (
          Array.isArray(d.biggest_words) &&
          Array.isArray(d.biggest_words_definitions)
        ) {
          d.biggest_words.forEach((word, i) => {
            const definition =
              d.biggest_words_definitions[i] || "No definition available";
            htmlContent += `<strong>${word}:</strong> ${definition}<br>`;
          });
        }
      } else if (activeButtonId === "smallWords-btn") {
        htmlContent += `Average Small Words Rating: ${d.avg_smallest_words_rating.toFixed(
          2
        )}<br><br>`;
        if (
          Array.isArray(d.smallest_words) &&
          Array.isArray(d.smallest_words_definitions)
        ) {
          d.smallest_words.forEach((word, i) => {
            const definition =
              d.smallest_words_definitions[i] || "No definition available";
            htmlContent += `<strong>${word}:</strong> ${definition}<br>`;
          });
        }
      } else if (activeButtonId === "sentences-btn") {
        htmlContent += `<strong>Biggest Sentence (Rating: ${d.biggest_sentence_rating.toFixed(
          2
        )}):</strong><br>${d.biggest_sentence}<br><br>`;
        htmlContent += `<strong>Smallest Sentence (Rating: ${d.smallest_sentence_rating.toFixed(
          2
        )}):</strong><br>${d.smallest_sentence}`;
      }

      tooltip.html(htmlContent);
      event.stopPropagation();
    }

    function hideTooltip() {
      tooltip.style("display", "none");
    }
  });
});
