// Used by the New and Edit listing pages: live image preview + AI description helper (New page only).
(function () {
  "use strict";

  // ----- live image preview -----
  const imageInput = document.getElementById("image");
  const preview = document.getElementById("image-preview");
  if (imageInput && preview) {
    imageInput.addEventListener("change", () => {
      const url = imageInput.value.trim();
      const img = preview.querySelector("img");
      if (/^https?:\/\//i.test(url)) {
        img.src = url;
        preview.hidden = false;
      } else {
        preview.hidden = true;
      }
    });
  }

  // ----- AI helper (only exists on the New page) -----
  const btn = document.getElementById("ai-generate-btn");
  if (!btn) return;
  const status = document.getElementById("ai-status");
  const val = (id) => document.getElementById(id).value.trim();

  function setStatus(text, color) {
    status.textContent = text;
    status.style.color = color;
  }

  btn.addEventListener("click", async () => {
    const payload = {
      location: val("ai-location"),
      propertyType: val("ai-propertyType"),
      bedrooms: Number(val("ai-bedrooms")) || null,
      amenities: val("ai-amenities"),
      nearbyAttractions: val("ai-nearby"),
      specialFeatures: val("ai-special"),
    };
    if (!payload.location) return setStatus("Please enter a location first.", "#b00020");

    btn.disabled = true;
    setStatus("Generating... (a few seconds)", "#6b7280");
    try {
      const res = await fetch("/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

      document.getElementById("listing-title").value = data.title || "";
      document.getElementById("listing-description").value = data.description || "";
      document.getElementById("listing-tags").value = (data.tags || []).join(", ");

      // Copy what the host already typed into the main form (only where it is still empty)
      const copy = (fromId, toId) => {
        const to = document.getElementById(toId);
        if (to && !to.value.trim() && val(fromId)) to.value = val(fromId);
      };
      copy("ai-location", "location");
      copy("ai-amenities", "amenities");
      copy("ai-nearby", "nearbyAttractions");
      copy("ai-bedrooms", "bedrooms");

      setStatus("Done! Review the text, then save.", "#15803d");
    } catch (err) {
      setStatus(err.message || "Something went wrong.", "#b00020");
    } finally {
      btn.disabled = false;
    }
  });
})();
