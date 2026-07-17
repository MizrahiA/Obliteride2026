/* Lantern Sky — app logic: starfield, floating lanterns, donate/unlock flow. */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  // ------------------------------------------------------------ data layer
  const hasSupabase =
    CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase;
  const db = hasSupabase
    ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
    : null;

  const DEMO_TRIBUTES = [
    { type: "memory", message: "Grandpa Joe — you taught me to ride, and to never quit a climb.", display_name: "Sarah M.", show_name: true },
    { type: "honor", message: "For my sister Dana, two years cancer-free and stronger than ever. 💪", display_name: "Ben", show_name: true },
    { type: "message", message: "Ride like the wind, Avi! Every mile matters.", display_name: "", show_name: false },
    { type: "memory", message: "In loving memory of Aunt Miriam, who lit up every room.", display_name: "The Cohen family", show_name: true },
    { type: "honor", message: "For every nurse on the 7th floor at Fred Hutch — thank you.", display_name: "", show_name: false },
    { type: "message", message: "Obliterate cancer. We're all riding with you in spirit! 🚴", display_name: "Priya", show_name: true },
  ];

  async function fetchTributes() {
    if (!db) {
      $("#demo-note").classList.remove("hidden");
      return DEMO_TRIBUTES;
    }
    const { data, error } = await db
      .from("tributes")
      .select("type, message, display_name, show_name")
      .eq("approved", true)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Failed to load tributes:", error);
      return [];
    }
    return data;
  }

  async function submitTribute(tribute) {
    if (!db) {
      // Demo mode: pretend it worked and float it immediately.
      spawnLantern(tribute, true);
      return { error: null };
    }
    return db.from("tributes").insert({ ...tribute, approved: false });
  }

  // ------------------------------------------------------------- starfield
  const canvas = $("#stars");
  const ctx = canvas.getContext("2d");
  let stars = [];

  function buildStars() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const count = Math.floor((canvas.width * canvas.height) / 6000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.85,
      r: Math.random() * 1.3 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.8,
    }));
  }

  // Occasional shooting stars streaking across the sky.
  let shootingStars = [];
  function spawnShootingStar() {
    const startX = Math.random() * canvas.width * 0.6;
    const startY = Math.random() * canvas.height * 0.35;
    const angle = (Math.PI / 5) + Math.random() * (Math.PI / 10); // downward-right
    const speed = 9 + Math.random() * 5;
    shootingStars.push({
      x: startX, y: startY,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 1,
    });
    setTimeout(spawnShootingStar, 7000 + Math.random() * 11000);
  }
  setTimeout(spawnShootingStar, 4000 + Math.random() * 6000);

  function drawStars(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fdf6d8";
    for (const s of stars) {
      const twinkle = Math.sin(s.phase + t * 0.0011 * s.speed) * Math.sin(s.phase * 1.7 + t * 0.0003);
      ctx.globalAlpha = Math.max(0.15, 0.55 + 0.45 * twinkle);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    shootingStars = shootingStars.filter((sh) => sh.life > 0);
    for (const sh of shootingStars) {
      const tailX = sh.x - sh.vx * 3.2;
      const tailY = sh.y - sh.vy * 3.2;
      const grad = ctx.createLinearGradient(sh.x, sh.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255, 250, 230, ${sh.life})`);
      grad.addColorStop(1, "rgba(255, 250, 230, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      sh.x += sh.vx;
      sh.y += sh.vy;
      sh.life -= 0.02;
    }
  }

  window.addEventListener("resize", buildStars);
  buildStars();

  // -------------------------------------------------------------- lanterns
  const field = $("#lantern-field");
  const lanterns = []; // { el, x, y, vy, sway, swaySpeed, phase, ceiling }
  const TYPE_LABEL = { honor: "In honor of", memory: "In memory of", message: "A message for the ride" };
  const TYPE_GLOW = { honor: "var(--blossom)", memory: "var(--amber)", message: "var(--ember)" };
  let count = 0;

  // Lanterns must never drift up behind the header text or buttons.
  function headerClearance() {
    const header = document.querySelector(".site-header");
    return header.getBoundingClientRect().bottom + 24;
  }

  // For "In honor of" / "In memory of" tributes, a clean "First Last"
  // style entry (e.g. "Avi Mizrahi") displays as "Avi M" for privacy.
  // Anything longer or punctuated reads as a fuller message rather than
  // a bare name, so it's left exactly as written.
  function honoreeDisplay(tribute) {
    const text = tribute.message.trim();
    if (tribute.type !== "honor" && tribute.type !== "memory") return text;
    const words = text.split(/\s+/);
    if (words.length < 2 || words.length > 4) return text;
    if (/[,.;:!?]/.test(text.slice(0, -1))) return text;
    if (!words.every((w) => /^[A-Za-z'-]+\.?$/.test(w))) return text;
    const first = words[0];
    const last = words[words.length - 1];
    return `${first} ${last[0].toUpperCase()}`;
  }

  function spawnLantern(tribute, fromBottom = false) {
    const el = document.createElement("button");
    el.className = `lantern lantern--${tribute.type}`;
    el.innerHTML = `<div class="paper"></div>`;
    el.setAttribute("aria-label", `${TYPE_LABEL[tribute.type]}: ${honoreeDisplay(tribute)}`);
    el.addEventListener("click", () => showDetail(tribute));
    field.appendChild(el);

    const W = window.innerWidth;
    const H = window.innerHeight;
    // In-memory lanterns rise highest; others settle in the mid-sky.
    // Never above the header's bottom edge, no matter the tribute type.
    const clearance = headerClearance();
    const ceiling = Math.max(
      clearance,
      tribute.type === "memory" ? H * (0.06 + Math.random() * 0.14)
                                : H * (0.2 + Math.random() * 0.3)
    );
    lanterns.push({
      el,
      x: W * (0.05 + Math.random() * 0.9),
      y: fromBottom ? H + 60 : ceiling + Math.random() * H * 0.35,
      vy: 0.12 + Math.random() * 0.1,
      sway: 12 + Math.random() * 22,
      swaySpeed: 0.0004 + Math.random() * 0.0005,
      phase: Math.random() * Math.PI * 2,
      // Slow, wide wander so lanterns cover real ground as they rise, on
      // top of the quick sway above.
      driftAmp: 50 + Math.random() * 90,
      driftSpeed: 0.00008 + Math.random() * 0.00010,
      driftPhase: Math.random() * Math.PI * 2,
      // How strongly this particular lantern responds to a wind gust, how
      // long the gust takes to reach it (so the gust travels across the
      // sky rather than every lantern moving in lockstep), and its own
      // little eddy so the push curls instead of sweeping in one flat line.
      windFactor: 0.7 + Math.random() * 0.6,
      windLag: Math.random() * 2200,
      swirlPhase: Math.random() * Math.PI * 2,
      swirlFreq: 1.3 + Math.random() * 1.4,
      rot: 0,
      ceiling,
    });

    count += 1;
    $("#lantern-count").textContent = count;
  }

  // Occasional wind gusts sweep the lanterns sideways in a soft, swirling
  // curl — not a synchronized shove — then let them settle back to their
  // normal float. Each lantern feels the gust at a slightly different
  // moment (windLag) and with its own little eddy (swirlPhase/swirlFreq)
  // layered on top of the main push, so it reads as one fluid gust moving
  // through the scene rather than every lantern snapping in lockstep.
  let activeGust = null;
  function triggerGust() {
    activeGust = {
      start: performance.now(),
      duration: 6500 + Math.random() * 3000,
      strength: (55 + Math.random() * 85) * (Math.random() < 0.5 ? -1 : 1),
    };
    setTimeout(triggerGust, 18000 + Math.random() * 20000);
  }
  setTimeout(triggerGust, 7000 + Math.random() * 9000);

  const smoothstep = (a, b, x) => {
    const p = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return p * p * (3 - 2 * p);
  };

  function windForLantern(t, l) {
    if (!activeGust) return 0;
    const elapsed = t - activeGust.start - l.windLag;
    if (elapsed < 0 || elapsed > activeGust.duration) return 0;
    const progress = elapsed / activeGust.duration;
    // Gentle rise, gentle fall — no sharp corners anywhere in the curve.
    const envelope = smoothstep(0, 0.4, progress) * (1 - smoothstep(0.6, 1, progress));
    // A slow eddy riding on top of the main push, so the lantern curls
    // through the gust instead of sliding in a single flat line.
    const swirl = Math.sin(progress * Math.PI * l.swirlFreq + l.swirlPhase) * 0.3 + 0.7;
    return activeGust.strength * envelope * swirl;
  }

  function stepLanterns(t) {
    const W = window.innerWidth;
    for (const l of lanterns) {
      if (l.y > l.ceiling) l.y -= l.vy;
      const windX = windForLantern(t, l) * l.windFactor;
      const x =
        l.x +
        Math.sin(l.phase + t * l.swaySpeed) * l.sway +
        Math.sin(l.driftPhase + t * l.driftSpeed) * l.driftAmp +
        windX;
      const clampedX = Math.min(Math.max(x, -20), W - 16);
      // Rotation eases toward its target rather than snapping to it, so
      // the tilt trails the motion like a lantern actually catching air.
      const targetRot = Math.max(-14, Math.min(14, windX * 0.1));
      l.rot += (targetRot - l.rot) * 0.05;
      l.el.style.transform =
        `translate(${clampedX}px, ${l.y}px) rotate(${l.rot.toFixed(2)}deg)`;
    }
  }

  function loop(t) {
    drawStars(t);
    stepLanterns(t);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ---------------------------------------------------------- detail modal
  function showDetail(tribute) {
    const card = $("#detail-card");
    card.style.setProperty("--glow", TYPE_GLOW[tribute.type]);
    $("#detail-type").textContent = TYPE_LABEL[tribute.type];
    $("#detail-message").textContent = honoreeDisplay(tribute);
    const nameEl = $("#detail-name");
    if (tribute.show_name && tribute.display_name) {
      nameEl.textContent = `— ${tribute.display_name}`;
      nameEl.classList.remove("hidden");
    } else {
      nameEl.textContent = "";
      nameEl.classList.add("hidden");
    }
    $("#detail-backdrop").classList.remove("hidden");
  }

  // ------------------------------------------------------------- flow modal
  const flowBackdrop = $("#flow-backdrop");
  const steps = { donate: $("#step-donate"), form: $("#step-form"), thanks: $("#step-thanks") };

  function showStep(name) {
    Object.values(steps).forEach((s) => s.classList.add("hidden"));
    steps[name].classList.remove("hidden");
  }

  function openFlow(step) {
    showStep(step);
    flowBackdrop.classList.remove("hidden");
    if (step === "donate") {
      $("#confirm-donated").classList.add("hidden");
    }
  }

  $("#open-flow").addEventListener("click", () => openFlow("donate"));
  $("#have-code").addEventListener("click", () => openFlow("form"));

  $("#donate-link").href = CONFIG.DONATION_URL;
  $("#donate-link").addEventListener("click", () => {
    // Once they've visited the donation page, let them confirm and continue.
    setTimeout(() => $("#confirm-donated").classList.remove("hidden"), 800);
  });
  $("#confirm-donated").addEventListener("click", () => showStep("form"));

  // --------------------------------------------------------------- the form
  const messageInput = $("#message-input");
  const PLACEHOLDERS = {
    honor: "e.g. Grandma Ruth, the toughest person I know",
    memory: "e.g. Uncle David — we ride so no one else has to say goodbye too soon",
    message: "e.g. Go Avi! Pedal hard, we believe in you!",
  };
  const LABELS = {
    honor: "Who are you honoring?",
    memory: "Who are you remembering?",
    message: "What's your message?",
  };

  messageInput.maxLength = CONFIG.MAX_MESSAGE_LENGTH;
  $("#char-max").textContent = CONFIG.MAX_MESSAGE_LENGTH;
  messageInput.addEventListener("input", () => {
    $("#char-count").textContent = messageInput.value.length;
  });

  document.querySelectorAll('input[name="type"]').forEach((radio) =>
    radio.addEventListener("change", () => {
      $("#message-label").textContent = LABELS[radio.value];
      messageInput.placeholder = PLACEHOLDERS[radio.value];
    })
  );

  $("#tribute-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#submit-btn");
    btn.disabled = true;
    btn.textContent = "Lighting your lantern…";

    const tribute = {
      type: document.querySelector('input[name="type"]:checked').value,
      message: messageInput.value.trim().slice(0, CONFIG.MAX_MESSAGE_LENGTH),
      display_name: $("#name-input").value.trim().slice(0, 60),
      show_name: $("#show-name").checked,
    };

    const { error } = await submitTribute(tribute);
    btn.disabled = false;
    btn.textContent = "Release my lantern 🏮";

    if (error) {
      console.error(error);
      const errEl = $("#submit-error");
      errEl.textContent = "Something went wrong — please try again in a moment.";
      errEl.classList.remove("hidden");
      return;
    }
    $("#tribute-form").reset();
    $("#char-count").textContent = "0";
    showStep("thanks");
  });

  // ------------------------------------------------------------ modal close
  document.querySelectorAll("[data-close]").forEach((el) =>
    el.addEventListener("click", () => {
      $("#detail-backdrop").classList.add("hidden");
      flowBackdrop.classList.add("hidden");
    })
  );
  document.querySelectorAll(".modal-backdrop").forEach((bd) =>
    bd.addEventListener("click", (e) => {
      if (e.target === bd) bd.classList.add("hidden");
    })
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      $("#detail-backdrop").classList.add("hidden");
      flowBackdrop.classList.add("hidden");
    }
  });

  // ---------------------------------------------------------------- kickoff
  fetchTributes().then((tributes) => {
    tributes.forEach((tr, i) => setTimeout(() => spawnLantern(tr), i * 350));
  });
})();
