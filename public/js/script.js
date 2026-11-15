// Global helpers loaded on every page.
(function () {
  "use strict";

  // 1. Bootstrap-style form validation + stop double submissions
  document.querySelectorAll(".needs-validation").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        // disable the submit button so a double-click cannot send the form twice
        const btn = form.querySelector("[data-submit-once]");
        if (btn) setTimeout(() => (btn.disabled = true), 0);
      }
      form.classList.add("was-validated");
    });
  });

  // 2. Booking form: min dates + live price estimate
  const bookingForm = document.querySelector(".booking-form");
  if (bookingForm) {
    const checkIn = bookingForm.querySelector("#checkIn");
    const checkOut = bookingForm.querySelector("#checkOut");
    const totalEl = document.getElementById("bookingTotal");
    const price = Number(bookingForm.dataset.price) || 0;

    // local-date "YYYY-MM-DD" (toISOString would shift the day in some time zones)
    const toISO = (d) =>
      d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const today = new Date();
    checkIn.min = toISO(today);
    checkOut.min = toISO(new Date(today.getTime() + 86400000));

    function update() {
      if (checkIn.value) {
        const next = new Date(checkIn.value + "T00:00:00");
        next.setDate(next.getDate() + 1);
        checkOut.min = toISO(next);
        if (checkOut.value && checkOut.value <= checkIn.value) checkOut.value = "";
      }
      if (checkIn.value && checkOut.value) {
        const nights = Math.round((new Date(checkOut.value) - new Date(checkIn.value)) / 86400000);
        if (nights > 0) {
          totalEl.textContent =
            nights + " night" + (nights > 1 ? "s" : "") + " × ₹" + price.toLocaleString("en-IN") +
            " = ₹" + (nights * price).toLocaleString("en-IN");
          totalEl.classList.remove("d-none");
          return;
        }
      }
      totalEl.classList.add("d-none");
    }
    checkIn.addEventListener("change", update);
    checkOut.addEventListener("change", update);
  }
})();
