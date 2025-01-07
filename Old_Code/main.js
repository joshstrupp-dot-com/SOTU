// main.js

// Set up dimensions
const width = window.innerWidth - 200;
const height = window.innerHeight;

// Create SVG container
const svg = d3.select("#viz").attr("width", width).attr("height", height);

// Append defs for patterns and filters
const defs = svg.append("defs");

// Define grayscale filter
defs
  .append("filter")
  .attr("id", "grayscale")
  .append("feColorMatrix")
  .attr("type", "saturate")
  .attr("values", "0");

// Load data
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
      // Assign a unique pattern ID
      d.patternId = `pattern-${i}`;

      // Create a pattern for the image
      const pattern = defs
        .append("pattern")
        .attr("id", d.patternId)
        .attr("width", 1)
        .attr("height", 1)
        .attr("patternUnits", "objectBoundingBox");

      // Append the image to the pattern
      pattern
        .append("image")
        .attr("href", d.imagePath)
        .attr("width", 40) // Adjust based on circle radius
        .attr("height", 40)
        .attr("preserveAspectRatio", "xMidYMid slice")
        .attr("filter", "url(#grayscale)"); // Apply greyscale filter
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

  // Create initial simulation
  let simulation = d3
    .forceSimulation(data)
    .force("x", d3.forceX((d) => xScales.speech(d.avg_AoA)).strength(0.5))
    .force("y", d3.forceY(height / 2))
    .force("collide", d3.forceCollide(20).strength(0.7))
    .alphaDecay(0.02)
    .on("tick", ticked);

  // Create circles
  let nodes = svg
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("r", 20)
    .style("cursor", "pointer") // Add this line
    .attr("fill", function (d) {
      if (d.patternId) {
        return `url(#${d.patternId})`;
      } else {
        return "steelblue";
      }
    })
    .on("click", showTooltip);
  // .on("mouseout", hideTooltip);

  // Tooltip
  const tooltip = d3.select("#tooltip");

  // Prevent clicks inside the tooltip from closing it
  tooltip.on("click", function (event) {
    event.stopPropagation();
  });

  // Add this outside of your data loading function
  d3.select("body").on("click", function () {
    hideTooltip();
  });

  function ticked() {
    nodes.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  }

  // Toggle buttons
  d3.select("#speech-btn").on("click", () => updateVisualization("speech"));
  d3.select("#big-words-btn").on("click", () =>
    updateVisualization("bigWords")
  );
  d3.select("#small-words-btn").on("click", () =>
    updateVisualization("smallWords")
  );
  d3.select("#sentences-btn").on("click", () =>
    updateVisualization("sentences")
  );

  function updateVisualization(mode) {
    // Update active button styles
    d3.selectAll(".toggle-btn").classed("active", false);

    // Map modes to button IDs
    let buttonId;
    if (mode === "speech") {
      buttonId = "speech-btn";
    } else if (mode === "bigWords") {
      buttonId = "big-words-btn";
    } else if (mode === "smallWords") {
      buttonId = "small-words-btn";
    } else if (mode === "sentences") {
      buttonId = "sentences-btn";
    }

    // Set the active class on the correct button
    d3.select(`#${buttonId}`).classed("active", true);

    // Update simulation forces
    if (mode === "speech") {
      simulation.force(
        "x",
        d3.forceX((d) => xScales.speech(d.avg_AoA)).strength(0.5)
      );
    } else if (mode === "bigWords") {
      simulation.force(
        "x",
        d3
          .forceX((d) => xScales.bigWords(d.avg_biggest_words_rating))
          .strength(0.5)
      );
    } else if (mode === "smallWords") {
      simulation.force(
        "x",
        d3
          .forceX((d) => xScales.smallWords(d.avg_smallest_words_rating))
          .strength(0.5)
      );
    } else if (mode === "sentences") {
      simulation.force(
        "x",
        d3
          .forceX((d) => xScales.sentences(d.biggest_sentence_rating))
          .strength(0.5)
      );
    }

    simulation.alpha(0.1).restart();
  }

  function showTooltip(event, d) {
    // Position the tooltip near the cursor
    const [x, y] = d3.pointer(event);

    tooltip
      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY + 10 + "px")
      .style("display", "block");

    // Determine current mode
    const activeButtonId = d3.select(".toggle-btn.active").attr("id");

    // Start building the HTML content with the president's name as a header
    let htmlContent = `<h3>${d.President}</h3>`;

    if (activeButtonId === "speech-btn") {
      htmlContent += `A ${d.avg_AoA.toFixed(
        2
      )} year old could recognize every word in ${
        d.President
      }'s SOTU addresses.`;
    } else if (activeButtonId === "big-words-btn") {
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
      } else {
        htmlContent += "No big words data available.";
      }
    } else if (activeButtonId === "small-words-btn") {
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
      } else {
        htmlContent += "No small words data available.";
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

    // Prevent the click event from bubbling up to the body
    event.stopPropagation();
  }

  function hideTooltip() {
    tooltip.style("display", "none");
  }
});

// Create a new div
const LeftDiv = d3
  .select("body")
  .append("div")
  .attr("id", "new-div")
  .style("position", "absolute")
  .style("top", "0")
  .style("left", "0")
  .style("height", `${height}px`)
  .style("width", "100px");
//   .style("background-color", "#f0f0f0");
// Add text to the new div
LeftDiv.append("p")
  .text("Younger AoA")
  .style("position", "absolute")
  .style("top", "50%")
  .style("left", "50%")
  //   .style("transform", "translate(-50%, -50%)")
  .style("margin", "0")
  .style("font-size", "12px")
  .style("text-align", "center");

const RightDiv = d3
  .select("body")
  .append("div")
  .attr("id", "new-div")
  .style("position", "absolute")
  .style("top", "0")
  .style("right", "0")
  .style("height", `${height}px`)
  .style("width", "100px");
//   .style("background-color", "#f0f0f0");
// Add text to the new div
RightDiv.append("p")
  .text("Older AoA")
  .style("position", "absolute")
  .style("top", "50%")
  .style("right", "50%")
  //   .style("transform", "translate(-50%, -50%)")
  .style("margin", "0")
  .style("font-size", "12px")
  .style("text-align", "center");

// Adjust the SVG container to account for the new div
// svg.style("margin-left", "200px");

const topRightDiv = d3
  .select("body")
  .append("div")
  .attr("id", "top-right-div")
  .style("position", "absolute")
  .style("top", "0")
  .style("right", "0")
  .style("width", "33%")
  .style("height", "auto")
  .style("text-align", "right");

// Add text to the new div
topRightDiv
  .append("p")
  .text(
    "According to linguists, children learn the word “mom” at 2 and “preponderance” at 17. This age is known as the 'Age of Aquisition', or AoA. Armed with every State of the Union address for every president, we asked: which presidents dumb it down? Which use big words to impress? And which are just right?"
  )
  .style("margin", "50px")
  .style("font-size", "14px");

const bottomRightDiv = d3
  .select("body")
  .append("div")
  .attr("id", "bottom-right-div")
  .style("position", "absolute")
  .style("bottom", "50px")
  .style("right", "0")
  .style("width", "50%")
  .style("height", "auto")
  .style("text-align", "right");

// Add text to the new div
bottomRightDiv
  .append("a")
  .attr("href", "http://joshstrupp.com")
  .attr("target", "_blank") // Opens the link in a new tab
  .text("joshstrupp.com")
  .style("margin", "50px")
  .style("font-size", "14px");
