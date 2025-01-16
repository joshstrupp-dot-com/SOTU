// Create an Intersection Observer
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      // Add 'visible' class when element enters viewport
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        // Once the animation is done, we can stop observing the element
        observer.unobserve(entry.target);
      }
    });
  },
  {
    // Element becomes visible when 20% of it is in viewport
    threshold: 0.2,
    // Start animation slightly before element enters viewport
    rootMargin: "50px",
  }
);

// Elements to observe
const sections = document.querySelectorAll(`
  .intro,
  .aoa-text-section,
  .aoa-right-column,
  .aoa-viz,
  .adc-text-section,
  .adc-left-column,
  .adc-viz,
  .toxicity-text-section,
  .toxicity-right-column,
  .toxicity-viz,
  .conclusion
`);

// Start observing each section
sections.forEach((section) => {
  observer.observe(section);
});
