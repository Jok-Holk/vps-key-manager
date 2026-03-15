// Entry point for renderer process — no require() here, all Node APIs via window.vpsControl (preload bridge)

function $(id) {
  return document.getElementById(id);
}

// Server URL — loaded from config on boot, fallback to empty
window.SERVER_URL = "";
async function initServerUrl() {
  const saved = await window.vpsControl.getServerUrl();
  window.SERVER_URL = saved || "";
  const input = $("server-url-input");
  if (input) input.value = window.SERVER_URL;
  updateServerUrlDisplay();
}

function updateServerUrlDisplay() {
  const display = $("server-url-display");
  if (display) display.textContent = window.SERVER_URL || "(not configured)";
}

function showToast(msg, isError = true) {
  const t = $("toast");
  t.textContent = msg;
  t.className = `toast ${isError ? "toast-error" : "toast-success"}`;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 3500);
}

function showScreen(name) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.add("hidden"));
  $(`screen-${name}`).classList.remove("hidden");
}

// Countdown timer for generated credentials (default 10 min)
let ttlTimer = null;
function startTTL(seconds = 600) {
  clearInterval(ttlTimer);
  let remain = seconds;
  const fill = $("ttl-fill");
  const timeEl = $("ttl-time");
  fill.style.width = "100%";
  fill.style.background = "#a855f7";

  ttlTimer = setInterval(() => {
    remain--;
    if (remain <= 0) {
      clearInterval(ttlTimer);
      $("cred-grid").classList.add("hidden");
      return;
    }
    const pct = (remain / seconds) * 100;
    fill.style.width = pct + "%";
    fill.style.background =
      pct < 20 ? "#f87171" : pct < 50 ? "#f59e0b" : "#a855f7";
    const m = String(Math.floor(remain / 60)).padStart(2, "0");
    const s = String(remain % 60).padStart(2, "0");
    timeEl.textContent = `${m}:${s}`;
  }, 1000);
}

// Ping /api/auth/nonce to check if server is reachable
async function checkServerStatus() {
  const dot = $("server-dot");
  const label = $("server-label");
  try {
    const res = await fetch(`${window.SERVER_URL}/api/auth/nonce`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error();
    dot.style.cssText =
      "background:#4ade80;box-shadow:0 0 8px rgba(74,222,128,0.9)";
    label.style.color = "#4ade80";
    label.textContent = "Server Online";
    return true;
  } catch {
    dot.style.cssText =
      "background:#f87171;box-shadow:0 0 8px rgba(248,113,113,0.9)";
    label.style.color = "#f87171";
    label.textContent = "Server Offline";
    return false;
  }
}

// Verify this device's keypair is trusted by the server (full challenge-response, no creds issued)
async function checkDeviceAuth() {
  const statusEl = $("key-status");
  const authEl = $("auth-status");
  statusEl.textContent = "Checking...";
  statusEl.style.color = "rgba(255,255,255,0.38)";
  try {
    const nonceRes = await fetch(`${window.SERVER_URL}/api/auth/nonce`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!nonceRes.ok) throw new Error("Server unreachable");

    const { nonce } = await nonceRes.json();
    const signature = await window.vpsControl.signNonce(nonce);
    const verifyRes = await fetch(`${window.SERVER_URL}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // dryRun: true — server verifies signature without issuing key+pass
      body: JSON.stringify({ nonce, signature, dryRun: true }),
    });

    if (verifyRes.ok) {
      statusEl.textContent = "Authorized ✓";
      statusEl.style.color = "#4ade80";
      if (authEl) {
        authEl.textContent = "Trusted Device";
        authEl.style.color = "#4ade80";
      }
    } else {
      statusEl.textContent = "Not authorized";
      statusEl.style.color = "#f87171";
      if (authEl) {
        authEl.textContent =
          "Key mismatch — update PUBLIC_KEY_ED25519 on server";
        authEl.style.color = "#f87171";
      }
    }
  } catch (err) {
    statusEl.textContent = "Check failed";
    statusEl.style.color = "#f59e0b";
  }
}

// Copy button — delegates via event bubbling
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-copy");
  if (!btn) return;
  const el = $(btn.dataset.target);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent.trim());
  const orig = btn.textContent;
  btn.textContent = "Copied!";
  btn.classList.add("copied");
  setTimeout(() => {
    btn.textContent = orig;
    btn.classList.remove("copied");
  }, 2000);
});

document.addEventListener("DOMContentLoaded", async () => {
  // Load server URL first
  await initServerUrl();

  // Check server on load, then every 30s
  checkServerStatus();
  setInterval(checkServerStatus, 30000);

  // Server URL save button
  const btnSaveUrl = $("btn-save-url");
  if (btnSaveUrl) {
    btnSaveUrl.addEventListener("click", async () => {
      const input = $("server-url-input");
      const url = (input?.value ?? "").trim().replace(/\/+$/, "");
      if (!url) {
        showToast("Enter a valid URL");
        return;
      }
      await window.vpsControl.setServerUrl(url);
      window.SERVER_URL = url;
      updateServerUrlDisplay();
      checkServerStatus();
      showToast("Server URL saved!", false);
    });
  }

  const hasKey = await window.vpsControl.hasKeypair();
  if (hasKey) {
    showScreen("main");
    checkDeviceAuth();
  } else {
    showScreen("setup");
  }

  // Generate new keypair (first run)
  $("btn-generate-key").addEventListener("click", async () => {
    const btn = $("btn-generate-key");
    btn.textContent = "Generating...";
    btn.disabled = true;
    try {
      const { publicKey } = await window.vpsControl.generateKey();
      showScreen("main");
      $("pubkey-text").textContent = publicKey;
      $("pubkey-box").classList.remove("hidden");
      $("btn-show-pubkey").textContent = "Hide Key";
      checkDeviceAuth();
      showToast(
        "Keypair generated! Copy the public key → paste into PUBLIC_KEY_ED25519 on server.",
        false,
      );
    } catch (err) {
      showToast("Failed: " + err.message);
      btn.textContent = "Generate Keypair";
      btn.disabled = false;
    }
  });

  // Request one-time key + pass from server
  $("btn-get-pass").addEventListener("click", async () => {
    const icon = $("btn-icon");
    const text = $("btn-text");
    const btn = $("btn-get-pass");
    icon.style.animation = "spin 0.7s linear infinite";
    text.textContent = "Signing challenge...";
    btn.disabled = true;
    try {
      const online = await checkServerStatus();
      if (!online) {
        showToast("Server is offline.");
        return;
      }
      const { key, pass } = await window.vpsControl.generatePass();
      $("val-key").textContent = key;
      $("val-pass").textContent = pass;
      $("cred-grid").classList.remove("hidden");
      startTTL(600);
      showToast("Done! Credentials valid for 10 minutes.", false);
    } catch (err) {
      showToast(err.message ?? "Failed");
    } finally {
      icon.style.animation = "";
      icon.textContent = "⚡";
      text.textContent = "Regenerate";
      btn.disabled = false;
    }
  });

  // Toggle public key visibility
  $("btn-show-pubkey").addEventListener("click", async () => {
    const box = $("pubkey-box");
    const btn = $("btn-show-pubkey");
    if (!box.classList.contains("hidden")) {
      box.classList.add("hidden");
      btn.textContent = "Show Key";
      return;
    }
    const pubkey = await window.vpsControl.getPublicKey();
    if (pubkey) {
      $("pubkey-text").textContent = pubkey;
      box.classList.remove("hidden");
      btn.textContent = "Hide Key";
    }
  });

  // Manual re-check device authorization
  $("btn-recheck").addEventListener("click", async () => {
    const btn = $("btn-recheck");
    btn.textContent = "Checking...";
    btn.disabled = true;
    await checkDeviceAuth();
    btn.textContent = "Re-check";
    btn.disabled = false;
  });

  // Export keypair: encrypt private key with user password → save as .vpskey file
  $("btn-export").addEventListener("click", async () => {
    const password = $("transfer-password").value.trim();
    if (!password) {
      showToast("Enter a password to encrypt the export file.");
      return;
    }
    const btn = $("btn-export");
    btn.disabled = true;
    btn.textContent = "Exporting...";
    try {
      const result = await window.vpsControl.exportKey(password);
      if (result.cancelled) return;
      if (result.success) {
        showToast(
          "Exported! Transfer the .vpskey file to the other machine.",
          false,
        );
        $("transfer-password").value = "";
      } else {
        showToast(result.error ?? "Export failed");
      }
    } catch (err) {
      showToast(err.message ?? "Export failed");
    } finally {
      btn.disabled = false;
      btn.textContent = "↑ Export .vpskey";
    }
  });

  // Import keypair: read .vpskey file, decrypt with password → store in OS-encrypted storage
  $("btn-import").addEventListener("click", async () => {
    const password = $("transfer-password").value.trim();
    if (!password) {
      showToast("Enter the password used when exporting.");
      return;
    }
    const btn = $("btn-import");
    btn.disabled = true;
    btn.textContent = "Importing...";
    try {
      const result = await window.vpsControl.importKey(password);
      if (result.cancelled) return;
      if (result.success) {
        showToast("Keypair imported! This device is now authorized.", false);
        $("transfer-password").value = "";
        showScreen("main");
        checkDeviceAuth();
      } else {
        showToast(result.error ?? "Wrong password or corrupted file.");
      }
    } catch (err) {
      showToast(err.message ?? "Import failed");
    } finally {
      btn.disabled = false;
      btn.textContent = "↓ Import .vpskey";
    }
  });
});
