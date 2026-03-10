function $(id) { return document.getElementById(id); }

function showToast(msg, isError = true) {
  const t = $("toast");
  t.textContent = msg;
  t.className = `toast ${isError ? "toast-error" : "toast-success"}`;
  setTimeout(() => t.classList.add("hidden"), 3500);
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  $(`screen-${name}`).classList.remove("hidden");
}

let ttlTimer = null;

function startTTL() {
  clearInterval(ttlTimer);
  let remain = 600;
  const fill = $("ttl-fill");
  const timeEl = $("ttl-time");

  fill.style.background = "#a855f7";
  fill.style.width = "100%";

  ttlTimer = setInterval(() => {
    remain--;
    if (remain <= 0) {
      clearInterval(ttlTimer);
      $("cred-grid").classList.add("hidden");
      return;
    }
    const pct = (remain / 600) * 100;
    fill.style.width = pct + "%";
    if (pct < 20)      fill.style.background = "#f87171";
    else if (pct < 50) fill.style.background = "#f59e0b";

    const m = String(Math.floor(remain / 60)).padStart(2, "0");
    const s = String(remain % 60).padStart(2, "0");
    timeEl.textContent = `${m}:${s}`;
  }, 1000);
}

// Delegate copy button clicks via event bubbling
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-copy");
  if (!btn) return;
  const target = $(btn.dataset.target);
  if (!target) return;
  navigator.clipboard.writeText(target.textContent.trim());
  btn.textContent = "Copied!";
  btn.classList.add("copied");
  setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 2000);
});

document.addEventListener("DOMContentLoaded", async () => {

  const hasKey = await window.vpsControl.hasKeypair();
  if (hasKey) {
    showScreen("main");
    $("key-status").textContent = "Active";
    $("key-status").classList.add("green");
  } else {
    showScreen("setup");
  }

  $("btn-generate-key").addEventListener("click", async () => {
    $("btn-generate-key").textContent = "Generating...";
    $("btn-generate-key").disabled = true;
    try {
      const { publicKey } = await window.vpsControl.generateKey();
      showScreen("main");
      $("key-status").textContent = "Active";
      $("key-status").classList.add("green");
      // Show public key immediately so user can copy it into server .env
      $("pubkey-text").textContent = publicKey;
      $("pubkey-box").classList.remove("hidden");
      showToast("Keypair generated! Copy public key → paste into PUBLIC_KEY_ED25519 in server .env", false);
    } catch (err) {
      showToast("Failed to generate keypair: " + err.message);
      $("btn-generate-key").textContent = "Generate Keypair";
      $("btn-generate-key").disabled = false;
    }
  });

  $("btn-get-pass").addEventListener("click", async () => {
    const icon = $("btn-icon");
    const text = $("btn-text");
    icon.style.animation = "spin 0.7s linear infinite";
    text.textContent = "Signing challenge...";
    $("btn-get-pass").disabled = true;

    try {
      const { key, pass } = await window.vpsControl.generatePass();
      $("val-key").textContent = key;
      $("val-pass").textContent = pass;
      $("cred-grid").classList.remove("hidden");
      startTTL();
    } catch (err) {
      showToast(err.message ?? "Failed");
    } finally {
      icon.style.animation = "none";
      icon.textContent = "🔑";
      text.textContent = "Regenerate";
      $("btn-get-pass").disabled = false;
    }
  });

  $("btn-show-pubkey").addEventListener("click", async () => {
    const box = $("pubkey-box");
    if (!box.classList.contains("hidden")) {
      box.classList.add("hidden");
      $("btn-show-pubkey").textContent = "Show Key";
      return;
    }
    const pubkey = await window.vpsControl.getPublicKey();
    if (pubkey) {
      $("pubkey-text").textContent = pubkey;
      box.classList.remove("hidden");
      $("btn-show-pubkey").textContent = "Hide Key";
    }
  });
});