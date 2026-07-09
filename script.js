// ===== Caersultancy site interactions =====
(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Mobile nav toggle ---- */
  const toggle = document.querySelector(".nav-toggle");
  const mobileNav = document.querySelector(".mobile-nav");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", () => {
      const open = mobileNav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.classList.toggle("open", open);
    });
    mobileNav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        mobileNav.classList.remove("open");
        toggle.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ---- Scroll reveal ---- */
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
              const el = entry.target;
              const delay = Array.from(revealEls).indexOf(el) % 6;
              el.style.transitionDelay = (delay * 60) + "ms";
              el.classList.add("is-visible");
              io.unobserve(el);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      revealEls.forEach((el) => io.observe(el));
    }
  }

  /* ---- Live traceroute hero ---- */
  const term = document.querySelector(".term[data-live]");
  if (!term) return;

  const cmdEl = term.querySelector(".cmd");
  const cmdText = cmdEl ? cmdEl.getAttribute("data-text") || cmdEl.textContent : "";
  const hops = Array.from(term.querySelectorAll(".hop"));

  if (reduceMotion) {
    // Show everything immediately, no animation
    if (cmdEl) cmdEl.textContent = cmdText;
    hops.forEach((h) => {
      const msEl = h.querySelector(".ms");
      if (msEl) {
        const n = parseInt(msEl.textContent.trim(), 10);
        if (!isNaN(n)) msEl.textContent = n + "ms";
      }
      h.classList.add("shown");
    });
    return;
  }

  // Prep: hide hops (JS is present, so it's safe to hide before animating), clear cmd text for typing
  if (cmdEl) cmdEl.textContent = "";
  hops.forEach((h) => {
    h.classList.add("js-hide");
    h.classList.remove("shown");
  });

  function typeCmd(text, el, done) {
    let i = 0;
    el.classList.add("typing");
    const iv = setInterval(() => {
      el.textContent = text.slice(0, i + 1);
      i++;
      if (i >= text.length) {
        clearInterval(iv);
        el.classList.remove("typing");
        done();
      }
    }, 28);
  }

  function revealHops(list, idx) {
    if (idx >= list.length) return;
    const hop = list[idx];
    hop.classList.add("shown");
    const msEl = hop.querySelector(".ms");
    if (msEl) {
      const target = msEl.textContent.trim();
      const num = parseInt(target, 10);
      if (!isNaN(num)) {
        let cur = 0;
        const step = Math.max(1, Math.round(num / 10));
        msEl.textContent = "0ms";
        const iv = setInterval(() => {
          cur += step;
          if (cur >= num) {
            msEl.textContent = num + "ms";
            clearInterval(iv);
          } else {
            msEl.textContent = cur + "ms";
          }
        }, 16);
      }
    }
    setTimeout(() => revealHops(list, idx + 1), 220);
  }

  // Kick off once hero is in view (or immediately if already visible)
  const kickoff = () => {
    if (cmdEl) {
      typeCmd(cmdText, cmdEl, () => {
        setTimeout(() => revealHops(hops, 0), 150);
      });
    } else {
      revealHops(hops, 0);
    }
  };

  if ("IntersectionObserver" in window) {
    const heroIo = new IntersectionObserver(
      (entries, obs) => {
        if (entries[0].isIntersecting) {
          kickoff();
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    heroIo.observe(term);
  } else {
    kickoff();
  }
})();
