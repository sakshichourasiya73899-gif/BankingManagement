/* =========================================================
   NeoBank — Banking Management System
   Pure HTML/CSS/JS, persistence via localStorage
   ========================================================= */

const STORAGE_KEY = "neobank_account_v1";

/* ---------- Storage helpers ---------- */
function loadAccount() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load account", e);
    return null;
  }
}

function saveAccount(account) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
}

function clearAccount() {
  localStorage.removeItem(STORAGE_KEY);
}

/* ---------- Utilities ---------- */
function generateAccountNumber() {
  // 12-digit pseudo-random account number
  let n = "";
  for (let i = 0; i < 12; i++) n += Math.floor(Math.random() * 10);
  return n.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
}

function formatMoney(value) {
  const v = Number(value) || 0;
  return v.toLocaleString("en-US", { style: "currency", currency: "INR" });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.className = "toast";
  }, 2600);
}

/* ---------- Navigation ---------- */
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === id);
  });
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const section = btn.dataset.section;
    if (!loadAccount()) {
      showToast("Create an account first", "error");
      showSection("no-account");
      return;
    }
    showSection(section);
    refreshUI();
  });
});

document.querySelectorAll("[data-jump]").forEach(btn => {
  btn.addEventListener("click", () => {
    showSection(btn.dataset.jump);
    refreshUI();
  });
});

/* ---------- Create account ---------- */
document.getElementById("create-account-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("holder-name").value.trim();
  const opening = parseFloat(document.getElementById("opening-balance").value);

  if (!name) return showToast("Please enter your name", "error");
  if (isNaN(opening) || opening < 0) return showToast("Invalid opening balance", "error");

  const account = {
    holderName: name,
    accountNumber: generateAccountNumber(),
    balance: opening,
    createdAt: new Date().toISOString(),
    transactions: []
  };

  if (opening > 0) {
    account.transactions.push({
      type: "deposit",
      amount: opening,
      note: "Opening deposit",
      date: new Date().toISOString(),
      balanceAfter: opening
    });
  }

  saveAccount(account);
  showToast("Account created successfully");
  showSection("dashboard");
  refreshUI();
});

/* ---------- Deposit ---------- */
document.getElementById("deposit-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const account = loadAccount();
  if (!account) return showToast("No account found", "error");

  const amount = parseFloat(document.getElementById("deposit-amount").value);
  const note = document.getElementById("deposit-note").value.trim() || "Deposit";

  if (isNaN(amount) || amount <= 0) return showToast("Enter a valid amount", "error");

  account.balance += amount;
  account.transactions.unshift({
    type: "deposit",
    amount,
    note,
    date: new Date().toISOString(),
    balanceAfter: account.balance
  });

  saveAccount(account);
  document.getElementById("deposit-form").reset();
  showToast(`Deposited ${formatMoney(amount)}`);
  refreshUI();
});

/* ---------- Withdraw ---------- */
document.getElementById("withdraw-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const account = loadAccount();
  if (!account) return showToast("No account found", "error");

  const amount = parseFloat(document.getElementById("withdraw-amount").value);
  const note = document.getElementById("withdraw-note").value.trim() || "Withdrawal";

  if (isNaN(amount) || amount <= 0) return showToast("Enter a valid amount", "error");
  if (amount > account.balance) return showToast("Insufficient funds — overdraft blocked", "error");

  account.balance -= amount;
  account.transactions.unshift({
    type: "withdraw",
    amount,
    note,
    date: new Date().toISOString(),
    balanceAfter: account.balance
  });

  saveAccount(account);
  document.getElementById("withdraw-form").reset();
  showToast(`Withdrew ${formatMoney(amount)}`);
  refreshUI();
});

/* ---------- Delete account ---------- */
document.getElementById("delete-account-btn").addEventListener("click", () => {
  if (!confirm("Delete your account permanently? This cannot be undone.")) return;
  clearAccount();
  showToast("Account deleted", "success");
  showSection("no-account");
  refreshUI();
});

/* ---------- Reset all ---------- */
document.getElementById("reset-all-btn").addEventListener("click", () => {
  if (!confirm("Reset ALL stored data? This will wipe everything.")) return;
  clearAccount();
  showToast("All data reset", "success");
  showSection("no-account");
  refreshUI();
});

/* ---------- Render UI ---------- */
function renderTransactions(list, container, limit = null) {
  container.innerHTML = "";
  const items = limit ? list.slice(0, limit) : list;

  if (items.length === 0) {
    container.innerHTML = `<li class="empty">No transactions yet.</li>`;
    return;
  }

  items.forEach(tx => {
    const li = document.createElement("li");
    li.className = "tx-item";
    li.innerHTML = `
      <div class="tx-left">
        <div class="tx-icon ${tx.type}">${tx.type === "deposit" ? "↓" : "↑"}</div>
        <div class="tx-meta">
          <span class="tx-type">${tx.note}</span>
          <span class="tx-date">${formatDate(tx.date)}</span>
        </div>
      </div>
      <div class="tx-amount ${tx.type}">
        ${tx.type === "deposit" ? "+" : "−"}${formatMoney(tx.amount)}
      </div>
    `;
    container.appendChild(li);
  });
}

function refreshUI() {
  const account = loadAccount();

  if (!account) {
    showSection("no-account");
    return;
  }

  // Dashboard
  document.getElementById("dash-name").textContent = account.holderName;
  document.getElementById("dash-balance").textContent = formatMoney(account.balance);
  document.getElementById("dash-account").textContent = account.accountNumber;
  document.getElementById("dash-tx-count").textContent = account.transactions.length;
  renderTransactions(account.transactions, document.getElementById("dash-recent"), 5);

  // Account details
  document.getElementById("acc-name").textContent = account.holderName;
  document.getElementById("acc-number").textContent = account.accountNumber;
  document.getElementById("acc-balance").textContent = formatMoney(account.balance);
  document.getElementById("acc-created").textContent = formatDate(account.createdAt);

  // Deposit / withdraw current balance hint
  document.getElementById("deposit-balance").textContent = formatMoney(account.balance);
  document.getElementById("withdraw-balance").textContent = formatMoney(account.balance);

  // Full history
  const histEl = document.getElementById("full-history");
  const emptyEl = document.getElementById("empty-history");
  if (account.transactions.length === 0) {
    histEl.innerHTML = "";
    emptyEl.style.display = "block";
  } else {
    emptyEl.style.display = "none";
    renderTransactions(account.transactions, histEl);
  }
}

/* ---------- Boot ---------- */
(function init() {
  const account = loadAccount();
  if (account) {
    showSection("dashboard");
  } else {
    showSection("no-account");
  }
  refreshUI();
})();
