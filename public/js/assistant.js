// AI Travel Assistant (listings page). The server does all the searching; this file only
// sends the text, shows the summary, and inserts the card HTML the server rendered.
(function () {
  "use strict";
  const form = document.getElementById("assistant-form");
  if (!form) return; // not logged in -> no form

  const input = document.getElementById("assistant-input");
  const btn = document.getElementById("assistant-btn");
  const counter = document.getElementById("assistant-count");
  const errorBox = document.getElementById("assistant-error");
  const resultBox = document.getElementById("assistant-result");
  const summary = document.getElementById("result-summary-text");
  const notes = document.getElementById("result-notes");
  const criteriaLine = document.getElementById("result-criteria");
  const grid = document.getElementById("result-grid");
  const allListings = document.getElementById("all-listings");
  const btnLabel = btn.querySelector("span");

  input.addEventListener("input", () => (counter.textContent = input.value.length));

  document.querySelectorAll(".example-chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      input.value = chip.textContent;
      counter.textContent = input.value.length;
      input.focus();
    })
  );

  // Pressing Enter submits (Shift+Enter = new line)
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  function showError(message) {
    errorBox.textContent = message; // textContent => never interpreted as HTML
    errorBox.classList.remove("d-none");
    resultBox.classList.add("d-none");
  }

  function describeCriteria(c) {
    const parts = [];
    if (c.location) parts.push(c.location);
    if (c.propertyType) parts.push(c.propertyType);
    if (c.bedrooms !== null) parts.push(c.bedrooms + "+ bedrooms");
    if (c.guests !== null) parts.push(c.guests + "+ guests");
    if (c.minPrice !== null) parts.push("from ₹" + c.minPrice.toLocaleString("en-IN"));
    if (c.maxPrice !== null) parts.push("up to ₹" + c.maxPrice.toLocaleString("en-IN"));
    (c.preferences || []).forEach((p) => parts.push(p));
    return parts.length ? "I searched for: " + parts.join(" · ") : "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    errorBox.classList.add("d-none");
    if (query.length < 5) return showError("Please describe your trip in a few more words.");

    btn.disabled = true;
    btnLabel.textContent = "Searching…";
    try {
      const res = await fetch("/ai/assistant/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) return showError("Your session expired. Please log in again.");
      if (!res.ok) return showError(data.error || "Something went wrong. Please try again.");

      summary.textContent = data.summary || "";
      notes.innerHTML = "";
      (data.notes || []).forEach((n) => {
        const li = document.createElement("li");
        li.textContent = n;
        notes.appendChild(li);
      });
      criteriaLine.textContent = data.conflict ? "" : describeCriteria(data.criteria || {});
      // Card HTML was rendered by the server with EJS, which escapes all listing text
      grid.innerHTML = (data.html || []).join("");
      grid.classList.toggle("d-none", !(data.html || []).length);
      resultBox.classList.remove("d-none");
      allListings.classList.add("d-none");
      resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      showError("Could not reach the server. Check your connection and try again.");
    } finally {
      btn.disabled = false;
      btnLabel.textContent = "Search with AI";
    }
  });

  document.getElementById("result-clear").addEventListener("click", () => {
    resultBox.classList.add("d-none");
    allListings.classList.remove("d-none");
    grid.innerHTML = "";
  });
})();
