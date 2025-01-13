// main.js

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
  // Set up dimensions based on viewport
  const width = window.innerWidth * 0.95; // 95% of viewport width
  const height = window.innerHeight * 0.95; // 95% of viewport height

  // Create SVG container within aoa-viz
  const svg = d3
    .select(".aoa-viz")
    .append("svg")
    .attr("width", "95vw")
    .attr("height", "95vh")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  // Add resize handler
  window.addEventListener("resize", () => {
    const newWidth = window.innerWidth * 0.95;
    const newHeight = window.innerHeight * 0.95;
    svg
      .attr("width", "95vw")
      .attr("height", "95vh")
      .attr("viewBox", `0 0 ${newWidth} ${newHeight}`);

    // Update background and gradient line
    background.attr("width", newWidth - 50).attr("height", newHeight - 50);

    gradientLine.attr("width", newWidth - 100).attr("y", newHeight / 2 - 10);

    // Restart simulation to adjust positions
    if (simulation) {
      simulation.force("y", d3.forceY(newHeight / 2).strength(0.1));
      simulation.alpha(0.3).restart();
    }
  });

  // Append defs for patterns and filters
  const defs = svg.append("defs");

  // Define grayscale filter
  defs
    .append("filter")
    .attr("id", "grayscale")
    .append("feColorMatrix")
    .attr("type", "saturate")
    .attr("values", "0");

  // // ! Create background rectangle with gradient
  // const background = svg
  //   .append("rect")
  //   .attr("width", width - 50)
  //   .attr("height", height - 50)
  //   .attr("x", 25)
  //   .attr("y", 25)
  //   .attr("rx", 5)
  //   .attr("ry", 5)
  //   .style("stroke", "#ccc")
  //   .style("stroke-width", "1px")
  //   .attr("fill", "#FFFFFF");

  // Define linear gradient
  const gradient = defs
    .append("linearGradient")
    .attr("id", "gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%");

  gradient.append("stop").attr("offset", "0%").attr("stop-color", "#FFFFFF");

  gradient.append("stop").attr("offset", "100%").attr("stop-color", "#FBFF7C");

  // Add gradient line
  const gradientLine = svg
    .append("rect")
    .attr("width", width - 100) // Slightly narrower than background
    .attr("height", 20) // Fixed height instead of viewport units
    .attr("x", 50) // Center relative to background
    .attr("y", height / 2 - 10) // Center vertically
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("fill", "url(#gradient)");

  // Define circle radius for each prez - adjust based on screen size
  const baseRadius = 30;
  const radius =
    window.innerWidth <= 480 ? 20 : window.innerWidth <= 768 ? 30 : baseRadius;

  // ! Load data
  d3.json("results_with_affect_and_toxicity_updated.json").then(function (
    data
  ) {
    // Parse data and convert necessary fields to numbers
    data.forEach((d, i) => {
      d.aoa_percentage = +d.aoa_percentage;
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
      sentences: d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d.biggest_sentence_rating))
        .range([50, width - 50]),
      bigWords: d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d.avg_biggest_words_rating))
        .range([50, width - 50]),
      speech: d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d.aoa_percentage))
        .range([50, width - 50]),
    };

    // Create initial simulation with stronger collision force
    let simulation = d3
      .forceSimulation(data)
      .force(
        "x",
        d3.forceX((d) => xScales.speech(d.aoa_percentage)).strength(0.2)
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

    // Create button container within aoa-viz
    const buttonContainer = d3
      .select(".aoa-viz")
      .append("div")
      .attr("class", "button-container")
      .style("position", "absolute")
      .style("top", window.innerWidth <= 768 ? "20px" : "50px")
      .style("left", "50%")
      .style("transform", "translateX(-50%)")
      .style("display", "flex")
      .style("flex-direction", window.innerWidth <= 768 ? "column" : "row")
      .style("gap", window.innerWidth <= 768 ? "8px" : "5px")
      .style("width", window.innerWidth <= 768 ? "calc(100% - 48px)" : "auto");

    // Add buttons
    const buttons = [
      { id: "sentences-btn", text: "Mature Sentences", mode: "sentences" },
      { id: "bigWords-btn", text: "Mature Words", mode: "bigWords" },
      { id: "speech-btn", text: "Under 10 Comprehension", mode: "speech" },
    ];

    buttons.forEach((button) => {
      buttonContainer
        .append("button")
        .attr("id", button.id)
        .attr(
          "class",
          `toggle-btn ${button.mode === "sentences" ? "active" : ""}`
        )
        .text(button.text.toUpperCase())
        .style("font-family", "Averia Serif Libre")
        .style("font-size", "14px")
        .on("click", () => updateVisualization(button.mode));
    });

    // ! Axis Labels

    // Add labels container
    const labels = svg.append("g").attr("class", "axis-labels");

    function getFontSize() {
      return window.innerWidth <= 480
        ? "12px"
        : window.innerWidth <= 768
        ? "14px"
        : "16px";
    }

    function updateAxisLabels(mode) {
      const labels = {
        sentences: ["Lower AoA", "Higher AoA"],
        bigWords: ["Lower AoA", "Higher AoA"],
        speech: ["Lower Understanding", "Higher Understanding"],
      };

      // Update left label
      const leftGroup = d3
        .select(".aoa-viz .axis-labels .aoa-left-group")
        .attr("transform", `translate(${width * 0.35}, ${height - 90})`);

      // Add text first to measure its width
      const leftText = leftGroup
        .select("text")
        .text(labels[mode][0])
        .attr("text-anchor", "middle")
        .style("font-family", "RoughTypewriter")
        .style("font-size", getFontSize());

      // Get text width and position arrow accordingly
      const leftTextWidth = leftText.node().getBBox().width;

      leftGroup
        .select("image")
        .attr("x", -(leftTextWidth / 2 + 25))
        .attr("y", -12.5)
        .attr("width", 16)
        .attr("height", 16);

      // Update right label
      const rightGroup = d3
        .select(".aoa-viz .axis-labels .aoa-right-group")
        .attr("transform", `translate(${width * 0.65}, ${height - 90})`);

      // Add text first to measure its width
      const rightText = rightGroup
        .select("text")
        .text(labels[mode][1])
        .attr("text-anchor", "middle")
        .style("font-family", "RoughTypewriter")
        .style("font-size", getFontSize());

      // Get text width and position arrow accordingly
      const rightTextWidth = rightText.node().getBBox().width;

      rightGroup
        .select("image")
        .attr("x", rightTextWidth / 2 + 10)
        .attr("y", -12.5)
        .attr("width", 16)
        .attr("height", 16);
    }

    // Create initial label groups (simplified)
    const leftGroup = labels
      .append("g")
      .attr("class", "aoa-left-group left-group");

    leftGroup.append("text");
    leftGroup.append("image").attr("href", "assets/arrow-left.svg");

    const rightGroup = labels
      .append("g")
      .attr("class", "aoa-right-group right-group");

    rightGroup.append("text");
    rightGroup.append("image").attr("href", "assets/arrow-right.svg");

    // Set initial labels for speech mode
    updateAxisLabels("sentences");

    function updateVisualization(mode) {
      // Update button states
      d3.selectAll(".aoa-viz .toggle-btn").classed("active", false);
      d3.select(`.aoa-viz #${mode}-btn`).classed("active", true);

      // Update axis labels
      updateAxisLabels(mode);

      const forceX = d3
        .forceX((d) => {
          switch (mode) {
            case "sentences":
              return xScales.sentences(d.biggest_sentence_rating);
            case "bigWords":
              return xScales.bigWords(d.avg_biggest_words_rating);
            case "speech":
              return xScales.speech(d.aoa_percentage);
          }
        })
        .strength(0.2);

      simulation.force("x", forceX).alpha(0.7).restart();
    }

    function showTooltip(event, d) {
      const isMobile = window.innerWidth <= 768;
      const tooltipWidth = isMobile ? 250 : 300;

      let xPosition, yPosition;

      if (isMobile) {
        // Center the tooltip on mobile and position it in the middle of the screen
        xPosition = window.innerWidth / 2 - tooltipWidth / 2;
        yPosition = window.innerHeight / 3; // Position it higher up
      } else {
        // On desktop, position near the cursor
        xPosition =
          event.pageX > window.innerWidth / 2
            ? event.pageX - tooltipWidth - 10
            : event.pageX + 10;
        yPosition = event.pageY + 10;
      }

      tooltip
        .style("left", xPosition + "px")
        .style("top", yPosition + "px")
        .style("display", "block")
        .style("max-width", tooltipWidth + "px")
        .style("position", isMobile ? "fixed" : "absolute") // Use fixed positioning only on mobile
        .style("z-index", "1000"); // Ensure tooltip is above other elements

      const activeButtonId = d3
        .select(".aoa-viz .toggle-btn.active")
        .attr("id");
      let htmlContent = `<h3>${d.President} <span style="color: #ccc; font-size: 11px">${d.Years}</span></h3>`;

      if (activeButtonId === "sentences-btn") {
        htmlContent += `<strong>Sentence with highest average AoA: (<span class="data-point">${d.biggest_sentence_rating.toFixed(
          2
        )}</span>):</strong><br><span class="data-point">${
          d.biggest_sentence
        }</span><br><br>`;
        htmlContent += `<strong>Smallest Sentence (Rating: <span class="data-point">${d.smallest_sentence_rating.toFixed(
          2
        )}</span>):</strong><br><span class="data-point">${
          d.smallest_sentence
        }</span>`;
      } else if (activeButtonId === "bigWords-btn") {
        htmlContent += `Of the words in ${
          d.President
        }'s speech, the average age of acquisition for 'more mature' words is <span class="data-point">${d.avg_biggest_words_rating.toFixed(
          2
        )}</span>.<br><br>Words with highest AoA include:<br><br>`;
        if (
          Array.isArray(d.biggest_words) &&
          Array.isArray(d.biggest_words_definitions)
        ) {
          // Only show first three words
          const numWordsToShow = Math.min(3, d.biggest_words.length);
          for (let i = 0; i < numWordsToShow; i++) {
            const word = d.biggest_words[i];
            const definition =
              d.biggest_words_definitions[i] || "No definition available";
            // Capitalize first letter of word and definition, add period at end
            const capitalizedWord =
              word.charAt(0).toUpperCase() + word.slice(1);
            const capitalizedDef =
              definition.charAt(0).toUpperCase() + definition.slice(1);
            const formattedDef = capitalizedDef.endsWith(".")
              ? capitalizedDef
              : capitalizedDef + ".";
            htmlContent += `<strong><span class="data-point">${capitalizedWord}</span>:</strong> ${formattedDef}<br><br>`;
          }
        }
      } else if (activeButtonId === "speech-btn") {
        htmlContent += `A ten-year-old watching ${
          d.President
        }'s State of The Union speech could understand <span class="data-point">${d.aoa_percentage.toFixed(
          2
        )}%</span> of it.`;
      }

      tooltip.html(htmlContent);
      event.stopPropagation();
    }

    function hideTooltip() {
      tooltip.style("display", "none");
    }

    // Add touch event handling for mobile
    nodes.on("touchstart", function (event) {
      event.preventDefault();
      event.stopPropagation();
      const touch = event.touches[0];
      showTooltip(touch, d3.select(this).datum());
    });

    // Add touch event handling for document to close tooltip
    document.addEventListener(
      "touchstart",
      function (event) {
        const tooltip = document.getElementById("tooltip");
        if (
          tooltip &&
          !event.target.tagName === "circle" &&
          !tooltip.contains(event.target)
        ) {
          hideTooltip();
        }
      },
      { passive: false }
    );
  });
});
