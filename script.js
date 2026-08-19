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
          entries.forEach((entry) => {
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

  /* ---- Live Brussels clock (auto CEST/CET) ---- */
  const clockEl = document.querySelector(".clock");
  if (clockEl) {
    function render() {
      const now = new Date();
      const timeParts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Brussels",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(now);
      const get = (type) => timeParts.find((p) => p.type === type)?.value || "00";

      let tz = "CET";
      try {
        const offsetParts = new Intl.DateTimeFormat("en-US", {
          timeZone: "Europe/Brussels",
          timeZoneName: "longOffset",
        }).formatToParts(now);
        const offset = offsetParts.find((p) => p.type === "timeZoneName")?.value || "";
        tz = offset.includes("+02") ? "CEST" : "CET";
      } catch (e) {
        /* longOffset unsupported in older browsers; default to CET */
      }

      clockEl.innerHTML = `${get("hour")}:${get("minute")}:${get("second")}<span class="tz">${tz}</span>`;
    }
    render();
    setInterval(render, 1000);
  }

  /* ---- Animated stat counters ---- */
  const statEls = document.querySelectorAll(".stat-num[data-target]");
  if (statEls.length) {
    const animateStat = (el) => {
      const target = parseFloat(el.getAttribute("data-target"));
      const suffix = el.getAttribute("data-suffix") || "";
      const isInt = Number.isInteger(target);
      if (reduceMotion) {
        el.textContent = (isInt ? target : target.toFixed(1)) + suffix;
        return;
      }
      const duration = 1100;
      let start = null;
      function step(ts) {
        if (start === null) start = ts;
        const progress = Math.min(1, (ts - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const val = target * eased;
        el.textContent = (isInt ? Math.round(val) : val.toFixed(1)) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
    if ("IntersectionObserver" in window) {
      const statIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateStat(entry.target);
              statIo.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      statEls.forEach((el) => statIo.observe(el));
    } else {
      statEls.forEach(animateStat);
    }
  }

  /* ---- HUD corner brackets on cards ---- */
  document.querySelectorAll(".card").forEach((card) => {
    const tl = document.createElement("span");
    tl.className = "hud-corner tl";
    tl.setAttribute("aria-hidden", "true");
    const br = document.createElement("span");
    br.className = "hud-corner br";
    br.setAttribute("aria-hidden", "true");
    card.append(tl, br);
  });

  /* ---- Hero mouse-reactive glow ---- */
  const heroEl = document.querySelector(".hero");
  if (heroEl && !reduceMotion) {
    heroEl.addEventListener("mousemove", (e) => {
      const rect = heroEl.getBoundingClientRect();
      heroEl.style.setProperty("--mx", ((e.clientX - rect.left) / rect.width * 100) + "%");
      heroEl.style.setProperty("--my", ((e.clientY - rect.top) / rect.height * 100) + "%");
    });
  }

  /* ---- Background network canvas (nodes + packets) ---- */
  function initNetCanvas() {
    if (reduceMotion) return;
    const canvas = document.createElement("canvas");
    canvas.id = "net-canvas";
    document.body.prepend(canvas);
    const ctx = canvas.getContext("2d");
    let w, h, nodes;
    const LINE = "rgba(79, 184, 255, 0.14)";
    const NODE = "rgba(79, 184, 255, 0.4)";
    const PACKET_RGB = "95, 227, 161";
    const WHITE_RGB = "255, 255, 255";

    function lerpRGB(a, b, t) {
      const pa = a.split(",").map(Number);
      const pb = b.split(",").map(Number);
      const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
      const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
      const bch = Math.round(pa[2] + (pb[2] - pa[2]) * t);
      return r + "," + g + "," + bch;
    }

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.max(24, Math.min(70, Math.floor((w * h) / 24000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
      }));
    }
    resize();
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });

    const packets = [];
    function maybeSpawnPacket() {
      if (packets.length > 8 || Math.random() > 0.026) return;
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      let best = null, bestD = 150;
      nodes.forEach((n) => {
        if (n === a) return;
        const d = Math.hypot(n.x - a.x, n.y - a.y);
        if (d < bestD) { bestD = d; best = n; }
      });
      if (best) packets.push({ a, b: best, t: 0 });
    }

    let raf;
    function frame() {
      ctx.clearRect(0, 0, w, h);
      nodes.forEach((n) => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (d < 130) {
            ctx.strokeStyle = LINE;
            ctx.globalAlpha = 1 - d / 130;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      nodes.forEach((n) => {
        ctx.fillStyle = NODE;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
      maybeSpawnPacket();
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.t += 0.018;
        if (p.t >= 1) { packets.splice(i, 1); continue; }
        const x = p.a.x + (p.b.x - p.a.x) * p.t;
        const y = p.a.y + (p.b.y - p.a.y) * p.t;

        // Triangle pulse: 0 at either end of the hop, 1 at the midpoint —
        // packets surge as they cross, like a signal peaking mid-transit.
        const pulse = 1 - Math.abs(p.t - 0.5) * 2;
        const glowR = 3 + pulse * 5;
        const coreR = 1.8 + pulse * 1.3;

        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        glow.addColorStop(0, "rgba(" + PACKET_RGB + ", " + (0.3 + pulse * 0.35) + ")");
        glow.addColorStop(1, "rgba(" + PACKET_RGB + ", 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();

        const core = lerpRGB(PACKET_RGB, WHITE_RGB, Math.min(1, pulse * 1.2));
        ctx.fillStyle = "rgba(" + core + ", 0.95)";
        ctx.beginPath();
        ctx.arc(x, y, coreR, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(frame);
    });
  }

  /* ---- Decrypt-style headline reveal ---- */
  function initDecodeText() {
    const CHARS = "01ABCDEF#$%&*<>/\\[]{}=+";
    document.querySelectorAll(".decode").forEach((el) => {
      const finalText = el.textContent;
      if (reduceMotion) return;
      el.setAttribute("aria-label", finalText);
      const len = finalText.length;
      const duration = 650;
      let start = null;
      function step(ts) {
        if (start === null) start = ts;
        const progress = Math.min(1, (ts - start) / duration);
        const revealed = Math.floor(progress * len);
        let out = "";
        for (let i = 0; i < len; i++) {
          const ch = finalText[i];
          out += (ch === " " || i < revealed) ? ch : CHARS[(Math.random() * CHARS.length) | 0];
        }
        el.textContent = out;
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = finalText;
      }
      requestAnimationFrame(step);
    });
  }

  /* ---- Live traceroute hero ---- */
  function initTraceroute() {
    const term = document.querySelector(".term[data-live]");
    if (!term) return;

    const cmdEl = term.querySelector(".cmd");
    const cmdText = cmdEl ? cmdEl.getAttribute("data-text") || cmdEl.textContent : "";
    const hops = Array.from(term.querySelectorAll(".hop"));

    if (reduceMotion) {
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

    const kickoff = () => {
      if (cmdEl) {
        typeCmd(cmdText, cmdEl, () => setTimeout(() => revealHops(hops, 0), 150));
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
  }

  /* ---- Boot sequence (once per session), then reveal headline/traceroute ---- */
  function bootThenReveal(onReveal) {
    if (reduceMotion || sessionStorage.getItem("caer_booted")) {
      onReveal();
      return;
    }
    sessionStorage.setItem("caer_booted", "1");

    const overlay = document.createElement("div");
    overlay.className = "boot-screen";
    overlay.innerHTML =
      '<div class="boot-lines">' +
      '<div class="line" style="animation-delay:0ms">&gt; initializing secure session...</div>' +
      '<div class="line" style="animation-delay:200ms">&gt; handshake: <span class="ok">TLS 1.3 OK</span></div>' +
      '<div class="line" style="animation-delay:400ms">&gt; resolving caersultancy.com...</div>' +
      '<div class="line" style="animation-delay:600ms">&gt; route established <span class="ok">[6 hops]</span></div>' +
      '<div class="boot-bar-track"><div class="boot-bar-fill"></div></div>' +
      '<div class="boot-skip">press any key to skip</div>' +
      "</div>";
    document.body.prepend(overlay);
    requestAnimationFrame(() => {
      const fill = overlay.querySelector(".boot-bar-fill");
      if (fill) fill.style.width = "100%";
    });

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      overlay.classList.add("hidden");
      setTimeout(() => overlay.remove(), 550);
      window.removeEventListener("keydown", finish);
      window.removeEventListener("pointerdown", finish);
      onReveal();
    };
    setTimeout(finish, 1300);
    window.addEventListener("keydown", finish, { once: true });
    window.addEventListener("pointerdown", finish, { once: true });
  }

  /* ---- Hidden terminal (press ` to open) ---- */
  function initCliEasterEgg() {
    const overlay = document.createElement("div");
    overlay.className = "cli-overlay";
    overlay.innerHTML =
      '<div class="cli-panel" role="dialog" aria-label="Terminal">' +
      '<div class="cli-titlebar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span><span class="path">visitor@caersultancy: ~</span></div>' +
      '<div class="cli-output"></div>' +
      '<div class="cli-inputrow"><span class="prompt">$</span><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Terminal input" /></div>' +
      "</div>";
    document.body.appendChild(overlay);

    const outputEl = overlay.querySelector(".cli-output");
    const inputEl = overlay.querySelector("input");

    function escapeHtml(s) {
      const div = document.createElement("div");
      div.textContent = s;
      return div.innerHTML;
    }

    function printLine(html, cls) {
      const div = document.createElement("div");
      div.className = "cli-line" + (cls ? " " + cls : "");
      div.innerHTML = html;
      outputEl.appendChild(div);
      outputEl.scrollTop = outputEl.scrollHeight;
    }

    function goTo(page, delay) {
      setTimeout(() => { window.location.href = page; }, delay || 900);
    }

    const commands = {
      help() {
        printLine("available commands:");
        printLine("&nbsp;&nbsp;help&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;show this list");
        printLine("&nbsp;&nbsp;whoami&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;who you're talking to");
        printLine("&nbsp;&nbsp;ls&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;list pages");
        printLine("&nbsp;&nbsp;about&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;short bio");
        printLine("&nbsp;&nbsp;services&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;what I actually do");
        printLine("&nbsp;&nbsp;ping [host]&nbsp;&nbsp;&nbsp;&nbsp;ping a host (fake, but honest)");
        printLine("&nbsp;&nbsp;contact&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;get in touch");
        printLine("&nbsp;&nbsp;sudo hire-levi&nbsp;&nbsp;&nbsp;...try it");
        printLine("&nbsp;&nbsp;clear&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;clear the screen");
        printLine("&nbsp;&nbsp;exit&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;close this terminal");
      },
      whoami() {
        printLine("guest — evaluating whether this guy actually knows networking.");
        printLine("fair. try `services` or `ping caersultancy.com`.");
      },
      ls() {
        ["index.html", "services.html", "about.html", "contact.html"].forEach((p) => printLine("&nbsp;&nbsp;" + p));
      },
      cat(arg) {
        if (arg === "about.txt") {
          commands.about();
        } else {
          printLine("cat: " + escapeHtml(arg || "") + ": No such file", "err");
        }
      },
      about() {
        printLine("Levi Caers — independent network architect, Antwerp.");
        printLine("10+ years in enterprise networking. carried the pager. still does.");
        printLine("opening about.html ...", "ok");
        goTo("about.html");
      },
      services() {
        printLine("architecture & design, wireless & site design, security & NAC, cloud-managed networking, presales.", "ok");
        printLine("opening services.html ...", "ok");
        goTo("services.html");
      },
      ping(arg) {
        const host = arg || "caersultancy.com";
        printLine("PING " + escapeHtml(host) + ": 56 data bytes");
        let seq = 0;
        const iv = setInterval(() => {
          seq++;
          const t = (8 + Math.random() * 6).toFixed(1);
          printLine("64 bytes from " + escapeHtml(host) + ": icmp_seq=" + seq + " time=" + t + " ms");
          if (seq >= 3) {
            clearInterval(iv);
            printLine("--- " + escapeHtml(host) + " ping statistics ---", "ok");
            printLine("3 packets transmitted, 3 received, 0% packet loss", "ok");
          }
        }, 260);
      },
      contact() {
        printLine('mail: <a href="mailto:levi@caersultancy.com">levi@caersultancy.com</a>');
        printLine("opening contact.html ...", "ok");
        goTo("contact.html");
      },
      clear() {
        outputEl.innerHTML = "";
      },
      exit() {
        closeCli();
      },
    };

    function runSudo(rest) {
      if (rest.trim() === "hire-levi") {
        printLine("[sudo] password for visitor: ********", "ok");
        printLine("permission granted.", "ok");
        printLine("redirecting to contact.html ...", "ok");
        goTo("contact.html", 1000);
      } else {
        printLine("visitor is not in the sudoers file. this incident will be reported.", "err");
      }
    }

    const history = [];
    let historyIdx = -1;

    function handleCommand(raw) {
      const trimmed = raw.trim();
      printLine(escapeHtml(trimmed), "echo");
      if (!trimmed) return;
      history.push(trimmed);
      historyIdx = history.length;

      const parts = trimmed.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const rest = parts.slice(1).join(" ");

      if (cmd === "sudo") { runSudo(rest); return; }
      if (commands[cmd]) { commands[cmd](rest); return; }
      printLine("command not found: " + escapeHtml(cmd) + " — try `help`", "err");
    }

    function openCli() {
      if (overlay.classList.contains("open")) return;
      overlay.classList.add("open");
      if (!outputEl.childElementCount) {
        printLine("caersultancy terminal — type `help` to see what's here.", "ok");
        printLine("");
      }
      inputEl.value = "";
      setTimeout(() => inputEl.focus(), 50);
    }
    function closeCli() {
      overlay.classList.remove("open");
      inputEl.blur();
    }

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = inputEl.value;
        inputEl.value = "";
        handleCommand(val);
      } else if (e.key === "Escape") {
        closeCli();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (history.length) {
          historyIdx = Math.max(0, historyIdx - 1);
          inputEl.value = history[historyIdx] || "";
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (history.length) {
          historyIdx = Math.min(history.length, historyIdx + 1);
          inputEl.value = history[historyIdx] || "";
        }
      }
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeCli();
    });

    window.addEventListener("keydown", (e) => {
      if (overlay.classList.contains("open")) return;
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if ((e.key === "`" || e.key === "~") && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        openCli();
      }
    });

    const footerRow = document.querySelector("footer.site .footer-row");
    if (footerRow) {
      const hint = document.createElement("button");
      hint.type = "button";
      hint.className = "cli-hint";
      hint.innerHTML = 'press <kbd>~</kbd> for terminal';
      hint.addEventListener("click", openCli);
      footerRow.appendChild(hint);
    }
  }

  initNetCanvas();
  initCliEasterEgg();
  bootThenReveal(() => {
    initDecodeText();
    initTraceroute();
  });
})();
