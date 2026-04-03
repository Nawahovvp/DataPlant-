﻿// Login-related variables and functions
const loginModal = document.getElementById("loginModal");
const appContent = document.getElementById("appContent");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const rememberMeInput = document.getElementById("rememberMe");
const errorMessage = document.getElementById("errorMessage");
const togglePassword = document.getElementById("togglePassword");
const userInfoInMenu = document.getElementById("userInfoInMenu");
const displayUserNameInMenu = document.getElementById("displayUserNameInMenu");
const displayUnit = document.getElementById("displayUnit");
const displayPlant = document.getElementById("displayPlant");
const quickSettingButton = document.getElementById("quickSettingButton");
const quickSettingPopover = document.getElementById("quickSettingPopover");
const quickSettingClose = document.getElementById("quickSettingClose");
const quickUserName = document.getElementById("quickUserName");
const quickUnit = document.getElementById("quickUnit");
const quickPlant = document.getElementById("quickPlant");
const quickEmp = document.getElementById("quickEmp");
const quickTheme = document.getElementById("quickTheme");
const quickLogout = document.getElementById("quickLogout");
const logoutButtonInMenu = document.getElementById("logoutButtonInMenu");
const themeButton = document.getElementById("themeButton");
const hamburgerIcon = document.getElementById("hamburgerIcon");
const settingsDropdown = document.getElementById("settingsDropdown");
const employeeSheetID = '1eqVoLsZxGguEbRCC5rdI4iMVtQ7CK4T3uXRdx8zE3uw';
const employeeSheetName = 'EmployeeWeb';
const employeeUrl = `https://opensheet.elk.sh/${employeeSheetID}/${employeeSheetName}`;
// Toggle password visibility
togglePassword.addEventListener('click', () => {
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  passwordInput.setAttribute('type', type);
  togglePassword.classList.toggle('fa-eye');
  togglePassword.classList.toggle('fa-eye-slash');
});
// Hamburger Menu Toggle
if (hamburgerIcon) {
  hamburgerIcon.addEventListener('click', () => {
    settingsDropdown.classList.toggle('show');
  });
}
// Quick Setting sheet
function openQuickSetting() {
  if (!quickSettingPopover) return;
  if (quickSettingPopover.classList.contains('show')) { closeQuickSetting(); return; }
  const username = localStorage.getItem('userName') || '-';
  const unit = localStorage.getItem('userUnit') || '-';
  const plant = localStorage.getItem('userPlant') || '-';
  const emp = localStorage.getItem('username') || '-';
  quickUserName.textContent = username;
  quickUnit.textContent = unit;
  quickPlant.textContent = plant;
  quickEmp.textContent = emp;
  quickSettingPopover.classList.add('show');
}
function closeQuickSetting() {
  if (quickSettingPopover) quickSettingPopover.classList.remove('show');
}
quickSettingButton.addEventListener('click', openQuickSetting);
quickSettingClose.addEventListener('click', closeQuickSetting);
quickTheme.addEventListener('click', () => {
  closeQuickSetting();
  settingModal.style.display = 'block';
});
quickLogout.addEventListener('click', () => {
  closeQuickSetting();
  handleLogout();
});
// Close dropdown / popover when clicking outside
document.addEventListener('click', (e) => {
  if (settingsDropdown && hamburgerIcon) {
    if (!settingsDropdown.contains(e.target) && !hamburgerIcon.contains(e.target)) {
      settingsDropdown.classList.remove('show');
    }
  }
  if (quickSettingPopover && quickSettingButton) {
    if (!quickSettingPopover.contains(e.target) && !quickSettingButton.contains(e.target)) {
      closeQuickSetting();
    }
  }
});

// Helper function for successful login
function completeLogin(user, username) {
  // Save session
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('username', username);
  localStorage.setItem('userName', user.Name);
  localStorage.setItem('userUnit', user.หน่วยงาน || '-');
  localStorage.setItem('userPlant', user.Plant || '-');
  if (rememberMeInput.checked) {
    localStorage.setItem('rememberMe', 'true');
    localStorage.setItem('savedUsername', username);
  }
  // Success
  hideLoading();
  loginModal.classList.add('hidden');
  appContent.classList.add('logged-in');
  setUserInfoDisplays(user.Name, user.หน่วยงาน || '-', user.Plant || '-', username);
  if (userInfoInMenu) userInfoInMenu.style.display = 'block';
  document.getElementById('searchInput').focus(); // Auto-focus search
  // Load app data
  initApp();
}

// Handle login form submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  errorMessage.style.display = 'none';
  // Basic input validation
  if (!username || username.length !== 7 || !username.startsWith('7')) {
    showError('รหัสพนักงานต้องเป็น 7 หลักและเริ่มต้นด้วย 7');
    return;
  }
  if (!password || password.length !== 4) {
    showError('รหัสผ่านต้องเป็น 4 หลัก');
    return;
  }
  const derivedPassword = username.slice(-4);
  if (password !== derivedPassword) {
    showError('รหัสผ่านไม่ถูกต้อง (ใช้ 4 หลักสุดท้ายของรหัสพนักงาน)');
    return;
  }

  // 1. Try Cache First (ตรวจสอบจากแคชก่อนเพื่อความเร็ว)
  const cachedEmpStr = localStorage.getItem('app_cached_employees');
  if (cachedEmpStr) {
    try {
      const emps = JSON.parse(cachedEmpStr);
      const cachedUser = emps.find(emp => emp.IDRec === username);
      if (cachedUser && cachedUser.Name) {
        completeLogin(cachedUser, username);
        return; // เข้าสู่ระบบทันทีโดยไม่ต้องโหลดใหม่
      }
    } catch (err) { console.warn("Cache parse error", err); }
  }

  // Show loading in modal
  showLoading();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    const response = await fetch(employeeUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(response.status === 403 ? 'CORS/Access Denied' : 'Fetch Failed');
    }
    const employees = await response.json();

    // Update Cache (บันทึกข้อมูลลงแคช)
    localStorage.setItem('app_cached_employees', JSON.stringify(employees));

    // Find user
    const user = employees.find(emp => emp.IDRec === username);
    if (!user || !user.Name) {
      throw new Error('User not found');
    }

    completeLogin(user, username);

  } catch (error) {
    hideLoading();
    if (error.name === 'AbortError') {
      Swal.fire('Timeout', 'การเชื่อมต่อช้าเกิน 30 วินาที กรุณาลองใหม่', 'error');
    } else if (error.message.includes('403') || error.message.includes('CORS')) {
      Swal.fire('Access Denied', 'ไม่สามารถเข้าถึงข้อมูลพนักงานได้ กรุณาติดต่อผู้ดูแล', 'error');
    } else if (error.message === 'User not found') {
      showError('ไม่พบข้อมูลพนักงานนี้');
    } else {
      Swal.fire('Network Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่', 'error');
    }
  }
});
// Show error in modal
function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.style.display = 'block';
}
// Check login status on load
function checkLoginStatus() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (isLoggedIn) {
    const username = localStorage.getItem('username');
    const userName = localStorage.getItem('userName');
    const userUnit = localStorage.getItem('userUnit');
    const userPlant = localStorage.getItem('userPlant');
    if (username && userName) {
      // Validate with derived password (quick check)
      const derivedPassword = username.slice(-4);
      // Assume valid if stored; in production, re-validate with fetch if needed
      loginModal.classList.add('hidden');
      appContent.classList.add('logged-in');
      setUserInfoDisplays(userName, userUnit || '-', userPlant || '-', username);
      if (userInfoInMenu) userInfoInMenu.style.display = 'block';
      if (localStorage.getItem('rememberMe') === 'true') {
        usernameInput.value = localStorage.getItem('savedUsername') || '';
      }
      document.getElementById('searchInput').focus();
      initApp();
      return true;
    }
  }
  // Show login modal
  loginModal.classList.remove('hidden');
  usernameInput.focus();
  return false;
}
// Handle logout
if (logoutButtonInMenu) logoutButtonInMenu.addEventListener('click', handleLogout);
function handleLogout() {
  localStorage.clear(); // Clear all keys
  settingsDropdown.classList.remove('show');
  location.reload(); // Reload to show login
}
// Theme button in menu
if (themeButton) {
  themeButton.addEventListener('click', () => {
    settingModal.style.display = 'block';
    settingsDropdown.classList.remove('show');
  });
}
// Enter key support for login
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !appContent.classList.contains('logged-in')) {
    loginForm.dispatchEvent(new Event('submit'));
  }
});
// App Initialization (original code wrapped)
let allData = [];
const selectedTickets = new Set();
let requestQuantities = {};
let currentPage = 1;
let itemsPerPage = 20;
let sortConfig = { column: 'DayRepair', direction: 'desc' };
let teamChart = null;
let dashboardFilter = null;
let callTypeCards = {};
let currentTicketNumber = null;
let currentRowData = null;
const sheetID = '1dzE4Xjc7H0OtNUmne62u0jFQT-CiGsG2eBo-1v6mrZk';
const sheetName = 'Coll_Stock';
const url = `https://opensheet.elk.sh/${sheetID}/${sheetName}`;
const updateSheetName = 'Update';
const updateUrl = `https://opensheet.elk.sh/${sheetID}/${updateSheetName}`;
const requestSheetID = '1xyy70cq2vAxGv4gPIGiL_xA5czDXqS2i6YYqW4yEVbE';
const requestSheetName = 'Request';
const requestUrl = `https://opensheet.elk.sh/${requestSheetID}/${encodeURIComponent(requestSheetName)}`;
const modal = document.getElementById("detailModal");
const graphModal = document.getElementById("graphModal");
const summaryModal = document.getElementById("summaryModal");
const spareSummaryModal = document.getElementById("spareSummaryModal");
const settingModal = document.getElementById("settingModal");
const modalContent = document.getElementById("modalContent");
const closeModal = document.getElementById("closeModal");
const closeGraphModal = document.getElementById("closeGraphModal");
const closeSummaryModal = document.getElementById("closeSummaryModal");
const closeSpareSummaryModal = document.getElementById("closeSpareSummaryModal");
const closeSettingModal = document.getElementById("closeSettingModal");
const employeeFilter = document.getElementById("employeeFilter");
const pendingFilter = document.getElementById("pendingFilter");
const stockFilter = document.getElementById("stockFilter");
const statusCallFilter = document.getElementById("statusCallFilter");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const printTableButton = document.getElementById("printTableButton");
const excelButton = document.getElementById("excelButton");
const summaryButton = document.getElementById("summaryButton");
const settingButton = document.getElementById("settingButton");
const updateGuideButton = document.getElementById("updateGuideButton");
const refreshButton = document.getElementById("refreshButton");
const selectAllCheckbox = document.getElementById("selectAllCheckbox");
const tableBody = document.querySelector("#data-table tbody");
const pageNumbersContainer = document.getElementById("pageNumbers");
const firstPageButton = document.getElementById("firstPage");
const prevPageButton = document.getElementById("prevPage");
const nextPageButton = document.getElementById("nextPage");
const lastPageButton = document.getElementById("lastPage");
const itemsPerPageSelect = document.getElementById("itemsPerPage");
const graphWarning = document.getElementById("graphWarning");
const summaryContent = document.getElementById("summaryContent");
const spareSummaryContent = document.getElementById("spareSummaryContent");
const updateValueSpan = document.getElementById("updateValue");
const updateValueHidden = document.getElementById("updateValueHidden");
const loadingDiv = document.getElementById("loading");
const callTypeDashboard = document.getElementById("callTypeDashboard");
// Dashboard cards
const totalCard = document.getElementById("totalCard");
const pendingCard = document.getElementById("pendingCard");
const successCard = document.getElementById("successCard");
const waitingResponseCard = document.getElementById("waitingResponseCard");
const over7Card = document.getElementById("over7Card");
const requestCard = document.getElementById("requestCard");
const nawaCard = document.getElementById("nawaCard");
const maxCard = document.getElementById("maxCard");
const graphCard = document.getElementById("graphCard");
const spareSummaryCard = document.getElementById("spareSummaryCard");
function showLoading() {
  loadingDiv.classList.add('show');
}
function hideLoading() {
  loadingDiv.classList.remove('show');
}
function getCleanTeamPlant(tp) {
  return (tp || "").replace(/Stock\s*/gi, '').trim();
}
function setUserInfoDisplays(name, unit, plant, emp) {
  if (displayUserNameInMenu) displayUserNameInMenu.textContent = name;
  if (displayUnit) displayUnit.textContent = unit || '-';
  if (displayPlant) displayPlant.textContent = plant || '-';
  if (quickUserName) quickUserName.textContent = name;
  if (quickUnit) quickUnit.textContent = unit || '-';
  if (quickPlant) quickPlant.textContent = plant || '-';
  if (quickEmp) quickEmp.textContent = emp || '-';
}
const normalizePendingUnit = (val) => (val || "").toString().toLowerCase().replace(/\s+/g, '');
const REQUEST_PENDING_TARGETS = [
  "stockวิภาวดี62",
  "stockvibhavadi62",
  "สต๊อกวิภาวดี62",
  "วิภาวดี62",
  "vibhavadi62"
];
const REQUEST_STATUS_TARGET = "รอเบิก";

function calculateStatusX(allData) {
  allData.forEach(row => {
    let statusX = "รอของเข้า"; // Default

    const mat = normalizeMaterial(row["Material"]);
    const hasNoMaterial = !mat || mat === "-" || mat === "";

    if (hasNoMaterial) {
      statusX = "ขอซื้อขอซ่อม";
    } else {
      const qtyPlant = row["QtyPlant"];
      const hasQtyPlant = qtyPlant && qtyPlant !== "" && qtyPlant !== "-" && qtyPlant !== "0";

      if (hasQtyPlant) {
        statusX = "สำเร็จ";
      } else {
        // Missing QtyPlant
        const nawa = row["Nawa"];
        const hasNawa = nawa && nawa !== "" && nawa !== "-" && nawa !== "0";

        if (hasNawa) {
          statusX = "เบิกนวนคร";
        } else {
          const vipa = row["Vipa"];
          const hasVipa = vipa && vipa !== "" && vipa !== "-" && vipa !== "0";

          if (hasVipa) {
            statusX = "เบิกวิภาวดี";
          }
        }
      }
    }
    row.StatusX = statusX;
  });
}

function calculateTicketStatus(data) {
  const ticketGroups = {};
  data.forEach(row => {
    const ticket = row["Ticket Number"];
    if (!ticket) return;
    if (!ticketGroups[ticket]) ticketGroups[ticket] = [];
    ticketGroups[ticket].push(row);
  });

  Object.keys(ticketGroups).forEach(ticket => {
    const rows = ticketGroups[ticket];
    let statusCall = "รอของเข้า"; // Default

    if (rows.some(r => r.StatusX === "ขอซื้อขอซ่อม")) {
      statusCall = "ขอซื้อขอซ่อม";
    } else if (rows.some(r => r.StatusX === "รอของเข้า")) {
      statusCall = "รอของเข้า";
    } else if (rows.some(r => r.StatusX === "เบิกนวนคร" || r.StatusX === "เบิกวิภาวดี")) {
      statusCall = "เบิกศูนย์อะไหล่";
    } else if (rows.some(r => r.StatusX === "สำเร็จ" || r.StatusX === "ระหว่างขนส่ง")) {
      statusCall = "สำเร็จ";
    }

    rows.forEach(r => r.StatusCall = statusCall);
  });
}

function computeRequestQuantities(data) {
  const result = {};
  if (!Array.isArray(data)) return result;
  data.forEach(row => {
    const status = (row?.status ?? row?.Status ?? row?.STATUS ?? row?.สถานะ ?? row?.["status"] ?? row?.["Status"] ?? "").toString().trim();
    if (status && status !== REQUEST_STATUS_TARGET) return;
    const material = normalizeMaterial(
      row?.Material ??
      row?.material ??
      row?.MaterialCode ??
      row?.materialcode ??
      row?.Material_Code ??
      row?.Material_code ??
      row?.["Material Code"] ??
      row?.["material code"] ??
      row?.Mat ??
      row?.mat ??
      row?.Item ??
      row?.item ??
      ""
    );
    if (!material) return;
    const qtyRaw = row?.quantity ?? row?.Quantity ?? row?.Qty ?? row?.qty ?? row?.จำนวน ?? row?.จำนวนเบิก ?? row?.["จำนวนเบิก"] ?? row?.["Quantity Order"] ?? row?.["QtyOrder"];
    const qty = parseFloat((qtyRaw ?? "").toString().replace(/,/g, ''));
    if (Number.isNaN(qty)) return;
    result[material] = (result[material] || 0) + qty;
  });
  return result;
}
function normalizeMaterial(mat) {
  return (mat || "").toString().trim().replace(/\s+/g, '').toUpperCase();
}
// PO Data Variables
let poQuantities = {};
let poRawData = [];
const poSheetID = '1SPPy8uru1aCZZ-t8fLPYPx_Up-CamdaIoAbRN7fYD_o';
const poSheetName = 'PO สั่งของ';
const poUrl = `https://opensheet.elk.sh/${poSheetID}/${encodeURIComponent(poSheetName)}`;

// PR Data Variables
let prQuantities = {};
let prRawData = [];
const prSheetID = '1SPPy8uru1aCZZ-t8fLPYPx_Up-CamdaIoAbRN7fYD_o';
const prSheetName = 'PR สั่งของ';
const prUrl = `https://opensheet.elk.sh/${prSheetID}/${encodeURIComponent(prSheetName)}`;

async function loadPrQuantities() {
  console.log("[pr] fetch start", prUrl);
  try {
    const response = await fetch(prUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`PR sheet fetch failed (${response.status})`);
    const data = await response.json();
    prRawData = data;
    prQuantities = computePrQuantities(data);
    console.log("[pr] fetch ok, items:", Object.keys(prQuantities).length);
    return prQuantities;
  } catch (err) {
    console.warn("[pr] fetch fail", err);
    return {};
  }
}

function computePrQuantities(data) {
  const result = {};
  if (!Array.isArray(data)) return result;
  data.forEach(row => {
    const material = normalizeMaterial(row["Material"] || "");
    if (!material) return;
    const req = parseFloat((row["Quantity requested"] || "0").toString().replace(/,/g, '')) || 0;
    const ord = parseFloat((row["Quantity ordered"] || "0").toString().replace(/,/g, '')) || 0;
    const qty = req - ord;
    if (qty > 0) {
      result[material] = (result[material] || 0) + qty;
    }
  });
  return result;
}

function getPrValue(material) {
  const key = normalizeMaterial(material);
  if (!key) return "";
  const qty = prQuantities[key] ?? null;
  if (qty == null) return "";
  return Number.isInteger(qty) ? qty.toString() : qty.toFixed(2);
}

function getPoValue(material) {
  const key = normalizeMaterial(material);
  if (!key) return "";
  const qty = poQuantities[key] ?? null;
  if (qty == null) return "";
  return Number.isInteger(qty) ? qty.toString() : qty.toFixed(2);
}

function updateRequestCells() {
  const cells = document.querySelectorAll("td.request-cell");
  console.log("[request] updateRequestCells start, cells:", cells.length);
  cells.forEach(td => {
    const mat = td.dataset.material || "";
    const pending = td.dataset.pending || "";
    const val = getRequestValue(mat, pending);
    td.innerHTML = "";
    const numericVal = parseFloat(val);
    const shouldShowPill = !isNaN(numericVal) && numericVal > 0;
    if (shouldShowPill) {
      const pill = document.createElement("span");
      pill.className = "request-pill";
      pill.textContent = val;
      td.appendChild(pill);
    } else {
      td.textContent = "";
    }
  });
  console.log("[request] updateRequestCells done");
}

function getRequestValue(material, pendingUnit) {
  const pending = normalizePendingUnit(pendingUnit);
  if (pending && !REQUEST_PENDING_TARGETS.some(t => pending.includes(t))) return "";
  const key = normalizeMaterial(material);
  if (!key) return "";
  const qty = requestQuantities[key] ?? null;
  if (qty == null) return "";
  return Number.isInteger(qty) ? qty.toString() : qty.toFixed(2);
}

function showOtherPlantDetails(material, description = "") {
  const modal = document.getElementById("otherPlantModal");
  const contentDiv = document.getElementById("otherPlantContent");
  if (!modal || !contentDiv) return;

  const closeBtn = document.getElementById("closeOtherPlantModal");
  if (closeBtn) {
    closeBtn.onclick = function () {
      modal.style.display = "none";
    };
  }

  const currentOnClick = window.onclick;
  window.onclick = function (event) {
    if (event.target == modal) {
      modal.style.display = "none";
    } else if (typeof currentOnClick === "function") {
      currentOnClick(event);
    }
  };

  const descHtml = description ? ` ${description}` : "";
  let html = `<div style="margin-bottom: 15px;"><strong>Material:</strong> ${material}${descHtml}</div>`;

  const mat = normalizeMaterial(material);
  const details = otherPlantDetailsData[mat];
  if (!details || details.length === 0) {
    html += "<p style='color: #666;'>ไม่พบรายละเอียดพื้นที่อื่นสำหรับ Material นี้</p>";
  } else {
    // Reverse map Plant codes (e.g., 0326) back to name (e.g. วิภาวดี 62)
    const reversePlantMap = {};
    for (const [name, code] of Object.entries(PLANT_MAPPING)) {
      reversePlantMap[code] = name.replace(/^Stock\s+/i, '').trim(); // Remove "Stock " prefix
    }

    // Group values by plant to show distinct totals
    const grouped = {};
    details.forEach(item => {
      grouped[item.plant] = (grouped[item.plant] || 0) + item.qty;
    });

    // Convert to array and sort
    const sortedDetails = [];
    for (const plant in grouped) {
      const gQty = grouped[plant];
      const displayName = reversePlantMap[plant] || plant;
      sortedDetails.push({ plantCode: plant, displayName, qty: gQty });
    }

    // Sort: No "SA " first, then by quantity descending
    sortedDetails.sort((a, b) => {
      const aHasSa = a.displayName.startsWith("SA ");
      const bHasSa = b.displayName.startsWith("SA ");

      if (aHasSa !== bHasSa) {
        return aHasSa ? 1 : -1; // Without "SA" comes first
      }

      return b.qty - a.qty; // Within same group, sort descending by qty
    });

    html += `
      <table style="width:100%; border-collapse: collapse; margin-top: 10px;" class="detail-table">
        <thead>
          <tr style="background:#f1f1f1;">
            <th style="padding:10px; border:1px solid #ccc; text-align:left;">Plant</th>
            <th style="padding:10px; border:1px solid #ccc; text-align:center;">จำนวน</th>
          </tr>
        </thead>
        <tbody>
    `;

    let total = 0;
    sortedDetails.forEach(item => {
      total += item.qty;
      html += `
        <tr>
          <td style="padding:10px; border:1px solid #ccc;">${item.displayName}</td>
          <td style="padding:10px; border:1px solid #ccc; text-align:center;">${item.qty.toLocaleString()}</td>
        </tr>
      `;
    });

    html += `
        <tr style="background:#f9f9f9;">
          <td style="padding:10px; border:1px solid #ccc; font-weight:bold; text-align:right;">รวม</td>
          <td style="padding:10px; border:1px solid #ccc; text-align:center; font-weight:bold; color: #20c997;">${total.toLocaleString()}</td>
        </tr>
      </tbody>
      </table>
    `;
  }

  contentDiv.innerHTML = html;
  modal.style.display = "block";
}

function showPrDetails(material, description = "") {
  const mat = normalizeMaterial(material);
  if (!prRawData || prRawData.length === 0) {
    Swal.fire('Info', 'ข้อมูล PR ยังโหลดไม่เสร็จสมบูรณ์', 'info');
    return;
  }
  const details = prRawData.filter(row => {
    const rMat = normalizeMaterial(row["Material"] || "");
    const req = parseFloat((row["Quantity requested"] || "0").toString().replace(/,/g, '')) || 0;
    const ord = parseFloat((row["Quantity ordered"] || "0").toString().replace(/,/g, '')) || 0;
    const qty = req - ord;
    return rMat === mat && qty > 0;
  });

  if (details.length === 0) {
    Swal.fire('Info', 'ไม่พบรายละเอียด PR', 'info');
    return;
  }

  let html = `<h3 style="color:var(--header-bg); margin-bottom:15px;">รายละเอียด PR: ${material} ${description}</h3>`;
  html += `<div style="overflow-x:auto;"><table class="detail-table" style="width:100%;">
    <thead>
      <tr>
        <th style="text-align:center;">Requisition date</th>
        <th style="text-align:center;">Purchase Requisition</th>
        <th style="text-align:center;">จำนวน</th>
      </tr>
    </thead>
    <tbody>`;

  details.forEach(row => {
    const date = row["Requisition date"] || "-";
    const doc = row["Purchase Requisition"] || "-";
    const req = parseFloat((row["Quantity requested"] || "0").toString().replace(/,/g, '')) || 0;
    const ord = parseFloat((row["Quantity ordered"] || "0").toString().replace(/,/g, '')) || 0;
    const qty = req - ord;

    html += `<tr>
      <td style="text-align:center;">${date}</td>
      <td style="text-align:center;">${doc}</td>
      <td style="text-align:center;">${qty}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  modalContent.innerHTML = html;
  modal.style.zIndex = "1100";
  modal.style.display = "block";
}

async function loadPoQuantities() {
  console.log("[po] fetch start", poUrl);
  try {
    const response = await fetch(poUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`PO sheet fetch failed (${response.status})`);
    const data = await response.json();
    poRawData = data;
    poQuantities = computePoQuantities(data);
    console.log("[po] fetch ok, items:", Object.keys(poQuantities).length);
    return poQuantities;
  } catch (err) {
    console.warn("[po] fetch fail", err);
    return {};
  }
}

function computePoQuantities(data) {
  const result = {};
  if (!Array.isArray(data)) return result;
  data.forEach(row => {
    const material = normalizeMaterial(row["Material"] || "");
    if (!material) return;
    const qtyRaw = row["Still to be delivered (qty)"];
    const qty = parseFloat((qtyRaw + "").replace(/,/g, ''));
    if (!isNaN(qty) && qty > 0) {
      result[material] = (result[material] || 0) + qty;
    }
  });
  return result;
}

function getPoValue(material) {
  const key = normalizeMaterial(material);
  if (!key) return "-";
  const qty = poQuantities[key] ?? null;
  if (qty == null) return "-";
  return Number.isInteger(qty) ? qty.toString() : qty.toFixed(2);
}

function showPoDetails(material, description = "") {
  const mat = normalizeMaterial(material);
  if (!poRawData || poRawData.length === 0) {
    Swal.fire('Info', 'ข้อมูล PO ยังโหลดไม่เสร็จสมบูรณ์', 'info');
    return;
  }
  const details = poRawData.filter(row => {
    const rMat = normalizeMaterial(row["Material"] || "");
    const qty = parseFloat((row["Still to be delivered (qty)"] + "").replace(/,/g, ''));
    return rMat === mat && !isNaN(qty) && qty > 0;
  });

  if (details.length === 0) {
    Swal.fire('Info', 'ไม่พบรายละเอียด PO', 'info');
    return;
  }

  let html = `<h3 style="color:var(--header-bg); margin-bottom:15px;">รายละเอียด PO: ${material} ${description}</h3>`;
  html += `<div style="overflow-x:auto;"><table class="detail-table" style="width:100%;">
    <thead>
      <tr>
        <th style="text-align:center;">กำหนดส่ง</th>
        <th style="text-align:center;">Purchasing Document</th>
        <th style="text-align:center;">จำนวน</th>
      </tr>
    </thead>
    <tbody>`;

  details.forEach(row => {
    const date = row["Document Date"] || row["Date"] || row["Delivery Date"] || row["Deliv.Date"] || "-";
    const doc = row["Purchasing Document"] || row["Purch.Doc."] || "-";
    const qty = row["Still to be delivered (qty)"] || "-";
    html += `<tr>
      <td style="text-align:center;">${date}</td>
      <td style="text-align:center;">${doc}</td>
      <td style="text-align:center;">${qty}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  modalContent.innerHTML = html;
  modal.style.zIndex = "1100";
  modal.style.display = "block";
}

async function loadRequestQuantities() {
  console.log("[request] fetch start", requestUrl);
  const response = await fetch(requestUrl, { cache: 'no-store' });
  if (!response.ok) {
    let body = "";
    try { body = await response.text(); } catch (_) { body = ""; }
    console.warn("[request] fetch fail", response.status, body);
    throw new Error(`Request sheet fetch failed (${response.status}) ${body ? `- ${body}` : ""}`.trim());
  }
  const data = await response.json();
  requestQuantities = computeRequestQuantities(data);
  console.log("[request] fetch ok, rows:", Array.isArray(data) ? data.length : 0, "materials:", Object.keys(requestQuantities).length);
  return requestQuantities;
}

async function refreshRequestColumn() {
  try {
    await Promise.all([loadRequestQuantities(), loadPoQuantities()]);
  } catch (err) {
    console.warn('Refresh failed:', err);
  }
  updateRequestCells();
  // We might want to update PO cells too if we make them dynamic, but for now re-render table is safer or just reload.
  filterAndRenderTable();
}
function updateRequestCells() {
  const cells = document.querySelectorAll("td.request-cell");
  console.log("[request] updateRequestCells start, cells:", cells.length);
  cells.forEach(td => {
    const mat = td.dataset.material || "";
    const pending = td.dataset.pending || "";
    const val = getRequestValue(mat, pending);
    td.innerHTML = "";
    const numericVal = parseFloat(val);
    const shouldShowPill = !isNaN(numericVal) && numericVal > 0;
    if (shouldShowPill) {
      const pill = document.createElement("span");
      pill.className = "request-pill";
      pill.textContent = val;
      td.appendChild(pill);
    } else {
      td.textContent = "-";
    }
  });
  console.log("[request] updateRequestCells done");
}
function getRequestValue(material, pendingUnit) {
  const pending = normalizePendingUnit(pendingUnit);
  if (pending && !REQUEST_PENDING_TARGETS.some(t => pending.includes(t))) return "-";
  const key = normalizeMaterial(material);
  if (!key) return "-";
  const qty = requestQuantities[key] ?? null;
  if (qty == null) return "-";
  return Number.isInteger(qty) ? qty.toString() : qty.toFixed(2);
}
/** ฟังก์ชันจัดการธีม */
function setTheme(theme) {
  document.body.className = theme === 'dark' ? 'dark-theme' : '';
  localStorage.setItem('theme', theme);
}
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
  document.querySelector(`input[value="${savedTheme}"]`).checked = true;
}
// Event listeners สำหรับ setting modal
if (settingButton) {
  settingButton.addEventListener('click', () => { settingModal.style.display = 'block'; });
}
if (updateGuideButton) {
  updateGuideButton.addEventListener('click', () => {
    Swal.fire({
      title: 'วิธีอัพข้อมูล',
      html: `
            <ol style="text-align:left; padding-left:18px; line-height:1.6;">
              <li>ดึงข้อมูล Call ค้างทั้งหมด (หัวข้อที่ 3: รายการงานสำหรับติดตาม Call ค้าง และ OverP)</li>
              <li>ไม่ต้องใส่อะไร แล้วกดปุ่ม "ค้นหา"</li>
              <li>หน้า Call แสดงข้อมูลทั้งหมด กดปุ่ม "Excel" เพื่อดาวน์โหลด</li>
              <li>กลับมาที่หน้าคลังสินค้า Dashboard Call แล้วกดปุ่ม "Data"</li>
              <li>เปิดไฟล์ปลายทาง แล้ว Import ข้อมูลจาก Excel ที่ดาวน์โหลด</li>
              <li>เลือก Import &gt; Upload &gt; เลือกไฟล์ Excel &gt; แทนที่สเปรดชีต &gt; ตกลง</li>
              <li>รอระบบรีเฟรชประมาณ 15 วินาที จากนั้นปิดไฟล์ เป็นอันเสร็จ</li>
            </ol>
          `,
      confirmButtonText: 'รับทราบ',
      width: 600
    });
  });
}
if (refreshButton) {
  refreshButton.addEventListener('click', () => {
    initApp();
  });
}
closeSettingModal.onclick = () => { settingModal.style.display = 'none'; };
document.querySelectorAll('input[name="theme"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    setTheme(e.target.value);
  });
});
window.addEventListener('click', (e) => {
  if (e.target === settingModal) {
    settingModal.style.display = 'none';
  }
});
function updateActiveCard(cardId) {
  // Clear active from all dashboard cards
  document.querySelectorAll('.dashboard-card').forEach(card => card.classList.remove('active'));
  if (cardId) {
    const card = document.getElementById(cardId);
    if (card) card.classList.add('active');
  }
}
/** อ่าน Description รองรับสะกดหลายแบบ */
function getDesc(row) {
  return (row["Description"] ?? row["Discription"] ?? row["Discrtiption"] ?? "-");
}
function extractDate(dateTimeStr) {
  if (!dateTimeStr || typeof dateTimeStr !== 'string') return dateTimeStr || "-";
  const match = dateTimeStr.match(/^(\d{2}\/\d{2}\/\d{4})/);
  return match ? match[1] : dateTimeStr;
}
function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (!parts) return null;
  const [, day, month, year, hour, minute, second] = parts;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour) || 0, parseInt(minute) || 0, parseInt(second) || 0);
}
function matchesKeyword(row, keyword) {
  if (!keyword) return true;
  const cleanRowTP = getCleanTeamPlant(row["TeamPlant"]);
  return (
    (row["DayRepair"] || "").toString().toLowerCase().includes(keyword) ||
    (row["DateTime"] || "").toLowerCase().includes(keyword) ||
    (row["Ticket Number"] || "").toLowerCase().includes(keyword) ||
    (row["Brand"] || "").toLowerCase().includes(keyword) ||
    (row["Call Type"] || "").toLowerCase().includes(keyword) ||
    (row["Team"] || "").toLowerCase().includes(keyword) ||
    cleanRowTP.toLowerCase().includes(keyword) ||
    (row["ค้างหน่วยงาน"] || "").toLowerCase().includes(keyword) ||
    (row["Material"] || "").toLowerCase().includes(keyword) ||
    (getDesc(row) || "").toLowerCase().includes(keyword) ||
    (getRequestValue(row["Material"], row["ค้างหน่วยงาน"]) || "").toString().toLowerCase().includes(keyword) ||
    (row["Nawa"] || "").toLowerCase().includes(keyword) ||
    (row["Vipa"] || "").toLowerCase().includes(keyword) ||
    (row["QtyPlant"] || "").toLowerCase().includes(keyword) ||
    (row["คลังตอบ"] || "").toLowerCase().includes(keyword) ||
    (row["UserAns"] || "").toLowerCase().includes(keyword) ||
    (row["วันที่ตอบ"] || "").toLowerCase().includes(keyword) ||
    (row["StatusCall"] || "").toLowerCase().includes(keyword)
  );
}
function getFilteredDataForContext(excludeType) {
  const selectedTeamPlant = employeeFilter.value;
  const selectedPending = pendingFilter.value;
  const selectedStock = stockFilter.value;
  const selectedStatusCall = statusCallFilter.value;
  const keyword = searchInput.value.toLowerCase().trim();

  return allData.filter(row => {
    if (!row) return false;
    const cleanRowTP = getCleanTeamPlant(row["TeamPlant"]);

    if (excludeType !== 'teamPlant' && selectedTeamPlant && cleanRowTP !== selectedTeamPlant) return false;
    if (excludeType !== 'pending' && selectedPending && (row["ค้างหน่วยงาน"] || "") !== selectedPending) return false;
    if (excludeType !== 'stock' && selectedStock && (row["คลังตอบ"] || "") !== selectedStock) return false;
    if (excludeType !== 'status' && selectedStatusCall && (row.StatusX || "") !== selectedStatusCall) return false;

    return matchesKeyword(row, keyword);
  });
}
function applyDashboardFilter(data, filter) {
  if (!filter || !data) return data;
  if (filter.startsWith('calltype_')) {
    const type = filter.split('_')[1];
    return data.filter(row => (row["Call Type"] || "") === type);
  }
  switch (filter) {
    case 'pending':
      return data.filter(row => (row.StatusCall || "") === "รอของเข้า");
    case 'success':
      return data.filter(row => (row.StatusCall || "") === "สำเร็จ");
    case 'waitingResponse':
      return data.filter(row => (row["คลังตอบ"] || "") === "รอตรวจสอบ");
    case 'over7':
      return data.filter(row => {
        const day = parseFloat(row["DayRepair"] || 0);
        return day > 7;
      });
    case 'request':
      return data.filter(row => (row.StatusCall || "") === "ขอซื้อขอซ่อม");
    case 'nawaVipa':
      return data.filter(row => (row.StatusCall || "") === "เบิกศูนย์อะไหล่");
    default:
      return data;
  }
}
function getBaseFilteredData() {
  return getFilteredDataForContext(null);
}
/** คำนวณเมตริก Dashboard - เปลี่ยนอ้างอิงเป็นค้างหน่วยงาน */
// คำนวณเมตริก Dashboard - เปลี่ยนอ้างอิงเป็นค้างหน่วยงาน และใช้เงื่อนไข StatusX ใหม่
function calculateDashboardMetrics(data) {
  const waitingResponseTickets = new Set();
  const pendingTickets = new Set(); // Call ค้าง (รอของเข้า)
  const successTickets = new Set(); // Call (ระหว่างขนส่ง)
  const nawaVipaTickets = new Set(); // Call (เบิกศูนย์อะไหล่)
  const over7Tickets = new Set();
  const requestTickets = new Set(); // Call (ขอซื้อขอซ่อม)
  const pendingUnitTicketCounts = {};

  // Group by Ticket first
  const ticketGroups = {};
  data.forEach(row => {
    const ticket = row["Ticket Number"];
    if (!ticket) return;
    if (!ticketGroups[ticket]) ticketGroups[ticket] = [];
    ticketGroups[ticket].push(row);
  });

  const totalCalls = Object.keys(ticketGroups).length;
  const totalItems = data.length;

  Object.keys(ticketGroups).forEach(ticket => {
    const rows = ticketGroups[ticket];
    const statusGroup = rows[0].StatusCall; // ใช้สถานะรวม (StatusGroup)

    // 1. Call (รอของเข้า)
    if (statusGroup === "รอของเข้า") {
      pendingTickets.add(ticket);
    }

    // 2. Call (ระหว่างขนส่ง) - เงื่อนไข สถานะรวม = สำเร็จ
    if (statusGroup === "สำเร็จ") {
      successTickets.add(ticket);
    }

    // 3. Call (เบิกศูนย์อะไหล่)
    if (statusGroup === "เบิกศูนย์อะไหล่") {
      nawaVipaTickets.add(ticket);
    }

    // 4. Call (ขอซื้อขอซ่อม)
    if (statusGroup === "ขอซื้อขอซ่อม") {
      requestTickets.add(ticket);
    }

    // Existing Logic Preserved
    if (rows.some(r => (r["คลังตอบ"] || "") === "รอตรวจสอบ")) {
      waitingResponseTickets.add(ticket);
    }

    if (rows.some(r => (parseFloat(r["DayRepair"]) || 0) > 7)) {
      over7Tickets.add(ticket);
    }

    // Count for Max Pending Unit
    rows.forEach(r => {
      const pendingUnit = r["ค้างหน่วยงาน"] || "ไม่ระบุ";
      if (!pendingUnitTicketCounts[pendingUnit]) pendingUnitTicketCounts[pendingUnit] = new Set();
      pendingUnitTicketCounts[pendingUnit].add(ticket);
    });
  });

  const callsPending = pendingTickets.size;
  const callsSuccess = successTickets.size;
  const callsNawaVipa = nawaVipaTickets.size;
  const callsWaitingResponse = waitingResponseTickets.size;
  const callsOver7 = over7Tickets.size;
  const callsRequest = requestTickets.size;
  const pendingUnitCounts = Object.fromEntries(Object.entries(pendingUnitTicketCounts).map(([pendingUnit, set]) => [pendingUnit, set.size]));
  const maxPendingUnitEntry = Object.entries(pendingUnitCounts).length > 0 ? Object.entries(pendingUnitCounts).reduce((a, b) => a[1] > b[1] ? a : b) : null;
  const maxPendingUnit = maxPendingUnitEntry ? maxPendingUnitEntry[0] : '-';

  return {
    totalCalls,
    totalItems,
    callsPending,
    callsSuccess,
    callsNawaVipa,
    callsWaitingResponse,
    callsOver7,
    callsRequest,
    maxPendingUnit
  };
}
function calculateCallTypeMetrics(data) {
  const ticketSet = new Set();
  const callTypeCounts = {};
  data.forEach(row => {
    const ticket = row["Ticket Number"];
    if (!ticket || ticketSet.has(ticket)) return;
    ticketSet.add(ticket);
    const ct = row["Call Type"] || 'อื่นๆ';
    if (!callTypeCounts[ct]) callTypeCounts[ct] = 0;
    callTypeCounts[ct]++;
  });
  return { callTypeCounts, total: ticketSet.size };
}
function updateCallTypeDashboard(data) {
  const metrics = calculateCallTypeMetrics(data);
  const { callTypeCounts, total } = metrics;
  callTypeDashboard.innerHTML = '';
  callTypeCards = {};
  Object.entries(callTypeCounts).forEach(([type, count]) => {
    const card = document.createElement('div');
    card.id = `calltype_${type}Card`;
    card.className = 'dashboard-card';
    let colorClass = 'calltype-other-card';
    if (type === 'P') colorClass = 'calltype-p-card';
    else if (type === 'C') colorClass = 'calltype-c-card';
    else if (type === 'B') colorClass = 'calltype-b-card';
    else if (type === 'U') colorClass = 'calltype-u-card';
    card.classList.add(colorClass);
    const percent = total > 0 ? (count / total * 100).toFixed(0) : 0;
    card.innerHTML = `
          <h3>${type}</h3>
          <div class="value">${count}</div>
          <div class="progress-container"><div class="progress-bar" style="width: ${percent}%;"></div></div>
          <div class="progress-text">${percent}%</div>
        `;
    card.addEventListener('click', () => {
      dashboardFilter = `calltype_${type}`;
      filterAndRenderTable();
    });
    callTypeDashboard.appendChild(card);
    callTypeCards[type] = card;
  });
  // Set active state for the current call type filter if applicable
  if (dashboardFilter && dashboardFilter.startsWith('calltype_')) {
    const activeType = dashboardFilter.split('_')[1];
    const activeCard = callTypeCards[activeType];
    if (activeCard) {
      activeCard.classList.add('active');
    }
  }
}
function fetchUpdateDate() {
  fetch(updateUrl)
    .then(r => r.json())
    .then(updateData => {
      if (!updateData || updateData.length === 0) {
        updateValueSpan.textContent = 'ไม่มีข้อมูล';
        if (updateValueHidden) updateValueHidden.textContent = 'ไม่มีข้อมูล';
        return;
      }
      let maxDate = null, maxDateStr = '';
      updateData.forEach(row => {
        // รองรับชื่อคอลัมน์หลายแบบ (Case-insensitive)
        let dateStr = row['Date'] || row['date'] || row['Update'] || row['update'] || row['Timestamp'] || row['timestamp'] || row['Data Update'] || row['Last Update'];

        if (!dateStr) {
          const key = Object.keys(row).find(k => /date|update|time/i.test(k));
          if (key) dateStr = row[key];
        }

        if (!dateStr) return;

        let parsedDate = parseDate(dateStr);
        // Fallback: ถ้า parseDate แบบเดิมไม่ได้ ให้ลองใช้ Date constructor ปกติ
        if (!parsedDate) {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) parsedDate = d;
        }

        if (parsedDate && (!maxDate || parsedDate > maxDate)) { maxDate = parsedDate; maxDateStr = dateStr; }
      });
      const displayTxt = maxDateStr || 'ไม่มีข้อมูล';
      updateValueSpan.textContent = displayTxt;
      if (updateValueHidden) updateValueHidden.textContent = displayTxt;
    })
    .catch(() => {
      updateValueSpan.textContent = 'ไม่มีข้อมูล';
      if (updateValueHidden) updateValueHidden.textContent = 'ไม่มีข้อมูล';
    });
}
function escapeCSVValue(value) {
  if (value == null) return '""';
  const stringValue = value.toString();
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}
function exportToCSV() {
  if (!allData || allData.length === 0) { alert("ไม่มีข้อมูลในระบบสำหรับการส่งออก CSV"); return; }
  const baseFilteredData = getBaseFilteredData();
  let filteredData = applyDashboardFilter([...baseFilteredData], dashboardFilter);
  if (filteredData.length === 0) { alert("ไม่มีข้อมูลที่ตรงกับเงื่อนไขการกรอง"); return; }
  filteredData.sort((a, b) => {
    let dayA = parseFloat(a["DayRepair"]) || 0;
    let dayB = parseFloat(b["DayRepair"]) || 0;
    let ticketA = a["Ticket Number"] || "";
    let ticketB = b["Ticket Number"] || "";
    if (dayA !== dayB) return dayB - dayA;
    return ticketA.localeCompare(ticketB);
  });
  const columns = ["DayRepair", "DateTime", "Ticket Number", "Brand", "Call Type", "Team", "TeamPlant", "ค้างหน่วยงาน", "Material", "Description", "PR", "PO", "วันที่ตอบ", "UserAns"];
  const displayColumns = { "DayRepair": "ผ่านมา", "DateTime": "วันที่แจ้ง", "Ticket Number": "Ticket Number", "Brand": "Brand", "Call Type": "Call Type", "Team": "Team", "TeamPlant": "ศูนย์พื้นที่", "ค้างหน่วยงาน": "ค้างหน่วยงาน", "Material": "Material", "Description": "Description", "PR": "PR สั่งของ", "PO": "PO สั่งของ", "วันที่ตอบ": "วันที่ตอบ", "UserAns": "ผู้แจ้ง" };
  const csvRows = [];
  csvRows.push(columns.map(col => `"${displayColumns[col]}"`).join(','));
  filteredData.forEach(row => {
    const rowData = columns.map(col => {
      let value;
      if (col === "Description") value = getDesc(row);
      else if (col === "DateTime") value = extractDate(row[col] || "-");
      else if (col === "PO") value = getPoValue(row["Material"]);
      else if (col === "PR") value = getPrValue(row["Material"]);
      else value = row[col] || "-";
      if (col === "DayRepair") value = isNaN(parseFloat(value)) ? "-" : parseFloat(value).toFixed(0);
      return escapeCSVValue(value);
    });
    csvRows.push(rowData.join(','));
  });
  const csvContent = csvRows.join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `report_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
/** พิมพ์จากโมดัล: ใช้ currentRowData ให้ตรงกับรายละเอียดที่เห็น */
function printModalContent() {
  if (!currentRowData) { alert("ไม่พบข้อมูลสำหรับการพิมพ์"); return; }
  const modalData = currentRowData;
  const desc = getDesc(modalData);
  const stickerContent = `
        <div><span class="label">Team:</span> <span class="value team-brand">${modalData["Team"] || "-"}</span></div>
        <div><span class="label">Brand:</span> <span class="value team-brand">${modalData["Brand"] || "-"}</span></div>
        <div><span class="label">Call Type:</span> <span class="value">${modalData["Call Type"] || "-"}</span></div>
        <div><span class="label">วันที่แจ้ง:</span> <span class="value">${extractDate(modalData["DateTime"] || "-")}</span></div>
        <div><span class="label">Ticket Number:</span> <span class="value">${modalData["Ticket Number"] || "-"}</span></div>
        <div><span class="label">ศูนย์พื้นที่:</span> <span class="value">${getCleanTeamPlant(modalData["TeamPlant"]) || "-"}</span></div>
        <div><span class="label">Material:</span> <span class="value">${modalData["Material"] || "-"}</span></div>
        <div class="description"><span class="label">Description:</span> <span class="value">${desc || "-"}</span></div>
      `;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
        <html>
          <head>
            <title>พิมพ์รายละเอียด</title>
            <style>
              body { font-family: 'Prompt', sans-serif; margin: 0; padding: 0; }
              .sticker { width: 80mm; height: 100mm; border: 1px solid #000; padding: 2mm; box-sizing: border-box; font-size: 13pt; line-height: 1.3; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
              .sticker div { margin-bottom: 1.5mm; overflow-wrap: break-word; }
              .sticker div.description { flex: 1; }
              .sticker .label { font-weight: bold; color: #000; font-size: 14pt; }
              .sticker .value { color: #000; }
              .sticker .value.team-brand { font-size: 20pt; font-weight: bold; }
              h2 { font-size: 14pt; color: #000; margin: 1.5mm 0; }
              @media print {
                body { margin: 0; }
                @page { size: 80mm 100mm; margin: 0; }
              }
            </style>
          </head>
          <body onload="window.print()">
            <div class="sticker">
              <h2>รายละเอียด</h2>
              ${stickerContent}
            </div>
          </body>
        </html>
      `);
  printWindow.document.close();
}
/** Order จากโมดัล: แสดง Popup ด้วย SweetAlert2 */
function orderModalContent() {
  if (!currentRowData) {
    Swal.fire('ผิดพลาด', 'ไม่พบข้อมูลสำหรับการ Order', 'error');
    return;
  }

  // ตรวจสอบสิทธิ์
  if (!canUserOrder()) {
    Swal.fire({
      icon: 'warning',
      title: 'คุณมิอาจก้าวร่วงสิทธินี้ได้ ',
      text: 'สิทธินี้มีไว้สำหรับ แผนกคลัง Spare part วิภาวดี 62 และ แผนกคลังวัตถุดิบ เท่านั้น',
      confirmButtonText: 'OK นะ'
    });
    return;
  }

  const modalData = currentRowData;
  const desc = getDesc(modalData);
  const userName = localStorage.getItem('userName') || 'ไม่ระบุ';
  const userPlant = localStorage.getItem('userPlant') || '-';
  const employeeCode = localStorage.getItem('username') || '-'; // รหัสพนักงาน 7 หลัก
  const customer = `${modalData["Team"] || "-"} (${modalData["Brand"] || "-"})`;
  const defaultPhone = "0909082850";
  // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
  // URL ของ Google Apps Script Web App (เปลี่ยนเป็นของคุณจริง ๆ)
  const gasUrl = 'https://script.google.com/macros/s/AKfycbycEiGdjEFmLSPSqgBUBBntG0OnaatLTkNozlZTn0RRgZHiuL9HCWisIsmMqth9Dzrv/exec';
  // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
  Swal.fire({
    title: 'เบิกอะไหล่นอกรอบ',
    html: `
          <div style="text-align: left; font-family: 'Prompt', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
              <h3 style="margin: 0 0 10px 0; text-align: center; color: #fff; font-size: 18px;"><i class="fas fa-shopping-cart"></i> รายละเอียดการเบิก</h3>
              <div style="display: flex; flex-direction: column; gap: 8px; font-size: 14px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                  <strong style="color: #ffd700;">Material:</strong>
                  <span style="text-align: right; flex: 1;">${modalData["Material"] || "-"}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                  <strong style="color: #ffd700;">Description:</strong>
                  <span style="text-align: right; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${desc || "-"}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                  <strong style="color: #ffd700;">Ticket Number:</strong>
                  <span style="text-align: right; flex: 1;">${modalData["Ticket Number"] || "-"}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                  <strong style="color: #ffd700;">Call Type:</strong>
                  <span style="text-align: right; flex: 1;">${modalData["Call Type"] || "-"}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                  <strong style="color: #ffd700;">User:</strong>
                  <span style="text-align: right; flex: 1;">${userName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                  <strong style="color: #ffd700;">Plant:</strong>
                  <span style="text-align: right; flex: 1;">${userPlant}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                  <strong style="color: #ffd700;">Customer:</strong>
                  <span style="text-align: right; flex: 1; font-weight: bold; color: #fff;">${customer}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">
                  <strong style="color: #ffd700;">เบอร์ติดต่อ:</strong>
                  <span style="text-align: right; flex: 1; font-weight: bold; color: #fff;">${defaultPhone}</span>
                </div>
              </div>
            </div>
            <label for="quantity" style="display: block; margin-top: 10px; font-weight: bold; color: #fff; font-size: 14px;">จำนวน:</label>
            <input type="number" id="quantity" value="1" min="1" style="width: 100%; padding: 10px; margin-bottom: 10px; border: none; border-radius: 8px; background: rgba(255,255,255,0.9); font-size: 16px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
          </div>
        `,
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#28a745',
    cancelButtonColor: '#dc3545',
    preConfirm: () => {
      const quantity = document.getElementById('quantity').value.trim();
      if (!quantity || parseInt(quantity) < 1) {
        Swal.showValidationMessage('กรุณากรอกจำนวนที่ถูกต้อง (อย่างน้อย 1)');
        return false;
      }
      return { quantity };
    }
  }).then((result) => {
    if (result.isConfirmed) {
      const { quantity } = result.value;

      // --- Optimistic UI Update (Background Mode) ---

      // 1. Prepare Payload
      const jsonPayload = {
        material: modalData["Material"] || "-",
        description: desc || "-",
        quantity: quantity,
        contact: defaultPhone,
        employeeCode: employeeCode,
        team: customer,
        employeeName: userName,
        callNumber: modalData["Ticket Number"] || "-",
        callType: modalData["Call Type"] || "-",
        remark: "",
        status: "รอเบิก",
        plant: userPlant
      };

      // 2. Optimistic Update Local State
      const localKey = normalizeMaterial(jsonPayload.material);
      const localQty = parseFloat(quantity);
      const previousQty = requestQuantities[localKey] || 0; // Backup for rollback

      if (localKey && !Number.isNaN(localQty)) {
        requestQuantities[localKey] = previousQty + localQty;
        // Save to cache immediately to persist across reloads
        localStorage.setItem('app_cached_requestQuantities', JSON.stringify(requestQuantities));
      }

      // 3. Update UI Immediately
      if (modal) modal.style.display = "none";
      filterAndRenderTable();

      // 4. Show "Saved" Toast Immediately
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: false,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer)
          toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
      });

      Toast.fire({
        icon: 'success',
        title: 'Success',
        customClass: {
          popup: 'round-success-toast'
        }
      });

      // 5. Background Fetch (Fire and Forget / Handle Error)
      (async () => {
        try {
          updateSyncStatus('syncing');
          const response = await fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `action=insertRequest&payload=${encodeURIComponent(JSON.stringify(jsonPayload))}`
          });

          // Since mode is 'no-cors', we can't read response status/body properly in many cases.
          // But if it doesn't throw, we assume network request went out.
          // However, to be safe and consistent with previous logic if possible:
          // *Previous logic used no-cors but tried to read text? That usually fails or returns empty.*
          // Let's assume clear success if no error thrown.

          console.log('Background sync sent for:', jsonPayload.material);
          updateSyncStatus('success');

          // Optionally refresh data to be sure after a delay
          setTimeout(() => { refreshRequestColumn(); }, 5000);

        } catch (err) {
          console.error("Background sync failed:", err);
          updateSyncStatus('error');

          // Revert Optimistic Update
          if (localKey) {
            requestQuantities[localKey] = previousQty;
            localStorage.setItem('app_cached_requestQuantities', JSON.stringify(requestQuantities));
            filterAndRenderTable(); // Re-render to show reverted state
          }

          Swal.fire({
            icon: 'error',
            title: 'ส่งข้อมูลไม่สำเร็จ',
            text: 'กรุณาลองใหม่อีกครั้ง หรือตรวจสอบอินเทอร์เน็ต'
          });
        }
      })();
    }
  });
}
/** พิมพ์สติ๊กเกอร์จากหน้าหลัก */
function printTable() {
  const baseFilteredData = getBaseFilteredData();
  let filteredData = applyDashboardFilter([...baseFilteredData], dashboardFilter);
  // If user selected tickets via checkbox, narrow to those
  if (selectedTickets.size > 0) {
    filteredData = filteredData.filter(row => selectedTickets.has(row["Ticket Number"]));
  }
  if (filteredData.length === 0) { alert("ไม่มีข้อมูลที่ตรงกับเงื่อนไขการค้นหา"); return; }
  filteredData.sort((a, b) => {
    let dayA = parseFloat(a["DayRepair"]) || 0;
    let dayB = parseFloat(b["DayRepair"]) || 0;
    let ticketA = a["Ticket Number"] || "";
    let ticketB = b["Ticket Number"] || "";
    if (dayA !== dayB) return dayB - dayA;
    return ticketA.localeCompare(ticketB);
  });
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedData = selectedTickets.size > 0 ? filteredData : filteredData.slice(startIdx, endIdx);
  const stickersHtml = paginatedData.map(row => {
    const desc = getDesc(row);
    return `
          <div class="sticker">
            <div><span class="label">Team:</span> <span class="value team-brand">${row["Team"] || "-"}</span></div>
            <div><span class="label">Brand:</span> <span class="value team-brand">${row["Brand"] || "-"}</span></div>
            <div><span class="label">Call Type:</span> <span class="value">${row["Call Type"] || "-"}</span></div>
            <div><span class="label">วันที่แจ้ง:</span> <span class="value">${extractDate(row["DateTime"] || "-")}</span></div>
            <div><span class="label">Ticket Number:</span> <span class="value">${row["Ticket Number"] || "-"}</span></div>
            <div><span class="label">ศูนย์พื้นที่:</span> <span class="value">${getCleanTeamPlant(row["TeamPlant"]) || "-"}</span></div>
            <div><span class="label">Material:</span> <span class="value">${row["Material"] || "-"}</span></div>
            <div class="description"><span class="label">Description:</span> <span class="value">${desc || "-"}</span></div>
          </div>
        `;
  }).join('');
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
        <html>
          <head>
            <title>พิมพ์สติ๊กเกอร์</title>
            <style>
              body { font-family: 'Prompt', sans-serif; margin: 0; padding: 0; }
              .sticker { width: 80mm; height: 100mm; border: 1px solid #000; padding: 2mm; box-sizing: border-box; font-size: 13pt; line-height: 1.3; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
              .sticker div { margin-bottom: 1.5mm; overflow-wrap: break-word; }
              .sticker div.description { flex: 1; }
              .sticker .label { font-weight: bold; color: #000; font-size: 14pt; }
              .sticker .value { color: #000; }
              .sticker .value.team-brand { font-size: 16pt; font-weight: bold; }
              @media print {
                body { margin: 0; }
                @page { size: 80mm 100mm; margin: 0; }
              }
            </style>
          </head>
          <body onload="window.print()">
            ${stickersHtml}
          </body>
        </html>
      `);
  printWindow.document.close();
}
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
}
const totalPlugin = {
  id: 'totalLabel',
  afterDatasetsDraw: function (chart) {
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    chart.data.labels.forEach((label, index) => {
      let total = 0;
      let topY = chart.chartArea.bottom;
      chart.data.datasets.forEach((dataset) => {
        const value = dataset.data[index] || 0;
        total += value;
        if (value > 0) {
          const dsIndex = chart.data.datasets.findIndex(d => d === dataset);
          const meta = chart.getDatasetMeta(dsIndex);
          const bar = meta.data[index];
          topY = Math.min(topY, bar.y);
        }
      });
      if (total > 0) {
        const x = chart.scales.x.getPixelForValue(index);
        ctx.fillText(total.toString(), x, topY - 10);
      }
    });
    ctx.restore();
  }
};
function showGraph() {
  const baseFilteredData = getBaseFilteredData();
  let filteredData = applyDashboardFilter([...baseFilteredData], dashboardFilter);
  if (filteredData.length === 0) {
    graphWarning.textContent = "ไม่มีข้อมูลสำหรับแสดงกราฟ";
    graphModal.style.display = "block";
    return;
  }
  const pivotData = {};
  const pendingUnitsRaw = filteredData.map(row => row["ค้างหน่วยงาน"] || "ไม่ระบุ");
  let pendingUnits = [...new Set(pendingUnitsRaw)].sort();
  const statusCalls = [...new Set(filteredData.map(row => row["StatusCall"] || "ไม่ระบุ"))].sort();
  pendingUnits.forEach(pendingUnit => {
    pivotData[pendingUnit] = {};
    statusCalls.forEach(status => { pivotData[pendingUnit][status] = 0; });
  });
  const ticketCounts = {};
  filteredData.forEach(row => {
    const ticket = row["Ticket Number"];
    if (!ticketCounts[ticket]) {
      const pendingUnit = row["ค้างหน่วยงาน"] || "ไม่ระบุ";
      const status = row["StatusCall"] || "ไม่ระบุ";
      pivotData[pendingUnit][status]++;
      ticketCounts[ticket] = true;
    }
  });
  // ✅ คำนวณผลรวมสำหรับแต่ละค้างหน่วยงานและเรียงลำดับจากมากไปน้อย
  const pendingUnitTotals = {};
  pendingUnits.forEach(pendingUnit => {
    pendingUnitTotals[pendingUnit] = statusCalls.reduce((sum, status) => sum + (pivotData[pendingUnit][status] || 0), 0);
  });
  pendingUnits.sort((a, b) => pendingUnitTotals[b] - pendingUnitTotals[a]);
  const colors = {
    "รอของเข้า": '#dc3545',       // สีแดง (Pending)
    "สำเร็จ": '#28a745',          // สีเขียว (Success)
    "ระหว่างขนส่ง": '#28a745',    // สีเขียว (Alias)
    "เบิกศูนย์อะไหล่": '#6f42c1', // สีม่วง (Nawa/Vipa)
    "ขอซื้อขอซ่อม": '#20c997',    // สีเขียวอมฟ้า (Request)
    "ไม่ระบุ": '#6c757d'          // สีเทา
  };
  const datasets = statusCalls.filter(status => status !== "ไม่ระบุ" && Object.values(pivotData).some(pu => pu[status] > 0)).map(status => {
    const colorKey = status === "สำเร็จ" ? "ระหว่างขนส่ง" : status;
    const rgb = hexToRgb(colors[colorKey] || '#6c757d');
    return {
      label: status === "สำเร็จ" ? "ระหว่างขนส่ง" : status,
      data: pendingUnits.map(pendingUnit => pivotData[pendingUnit][status] || 0),
      borderColor: colors[colorKey] || '#6c757d',
      backgroundColor: rgb ? `rgba(${rgb}, 0.8)` : '#6c757d',
      borderWidth: 2,
      borderRadius: 4,
      stack: 'CallStack'
    };
  });
  let limitedUnits = pendingUnits;
  let warningMessage = "";
  if (pendingUnits.length > 50) {
    limitedUnits = pendingUnits.slice(0, 50);
    warningMessage = `แสดงเฉพาะ 50 ค้างหน่วยงานแรกจากทั้งหมด ${pendingUnits.length} เนื่องจากข้อจำกัดด้านการแสดงผล`;
  }
  const limitedDatasets = datasets.map(ds => ({
    ...ds,
    data: limitedUnits.map(pendingUnit => pivotData[pendingUnit][ds.label === "ระหว่างขนส่ง" ? "สำเร็จ" : ds.label] || 0)
  }));
  graphWarning.textContent = warningMessage;
  if (limitedUnits.length === 0) { graphWarning.textContent = "ไม่มีข้อมูลสำหรับแสดงกราฟ"; graphModal.style.display = "block"; return; }
  if (teamChart) teamChart.destroy();
  const ctx = document.getElementById('teamChart').getContext('2d');
  teamChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: limitedUnits,
      datasets: limitedDatasets
    },
    options: {
      responsive: true,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      animation: {
        duration: 2000,
        easing: 'easeOutQuart'
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            display: false
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      onClick: (event, elements, chart) => {
        if (elements.length > 0) {
          const element = elements[0];
          const index = element.index;
          const pendingUnit = chart.data.labels[index];
          pendingFilter.value = pendingUnit;
          // Reset other filters to show all data for this pendingUnit
          employeeFilter.value = "";
          stockFilter.value = "";
          statusCallFilter.value = "";
          searchInput.value = "";
          dashboardFilter = null;
          updateActiveCard(null);
          filterAndRenderTable();
          // graphModal.style.display = "none"; // ลบการปิด modal เพื่อให้กราฟยังคงแสดงข้อมูลทั้งหมด
        }
      },
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: function (context) {
              return `ค้างหน่วยงาน: ${context[0].label}`;
            },
            label: function (context) {
              // ✅ แสดงเฉพาะสถานะที่มีข้อมูล (> 0) เท่านั้น
              if (context.parsed.y > 0) {
                return `${context.dataset.label}: ${context.parsed.y} Call`;
              }
              return null; // ข้ามการแสดงถ้า = 0
            },
            footer: function (context) {
              // ✅ คำนวณผลรวมเฉพาะสถานะที่มีข้อมูล (> 0)
              let total = 0;
              context.forEach(function (ctx) {
                if (ctx.parsed.y > 0) {
                  total += ctx.parsed.y;
                }
              });
              return `รวม: ${total} Call`;
            }
          }
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        }
      }
    },
    plugins: [totalPlugin]
  });
  graphModal.style.display = "block";
}
function showSummary() {
  const baseFilteredData = getBaseFilteredData();
  let filteredData = applyDashboardFilter([...baseFilteredData], dashboardFilter);
  const uniqueTickets = [...new Set(filteredData.map(row => row["Ticket Number"]).filter(Boolean))].length;
  const totalCalls = uniqueTickets;
  const pivotData = {};
  const teamPlants = [...new Set(filteredData.map(row => getCleanTeamPlant(row["TeamPlant"] || "ไม่ระบุ")))].sort();
  const statusCalls = [...new Set(filteredData.map(row => row["StatusCall"] || "ไม่ระบุ"))].sort();
  const pendingUnits = [...new Set(filteredData.map(row => row["ค้างหน่วยงาน"] || "ไม่ระบุ"))].sort();
  const orderedPendingUnits = ["NEC_ยกเลิกผลิต"].filter(unit => pendingUnits.includes(unit));
  teamPlants.forEach(teamPlant => {
    pivotData[teamPlant] = {};
    statusCalls.forEach(status => { pivotData[teamPlant][status] = 0; });
    pendingUnits.forEach(pending => { pivotData[teamPlant][pending] = 0; });
  });
  const ticketCounts = {};
  filteredData.forEach(row => {
    const ticket = row["Ticket Number"];
    if (!ticketCounts[ticket]) {
      const teamPlant = getCleanTeamPlant(row["TeamPlant"] || "ไม่ระบุ");
      const status = row["StatusCall"] || "ไม่ระบุ";
      const pending = row["ค้างหน่วยงาน"] || "ไม่ระบุ";
      pivotData[teamPlant][status]++;
      pivotData[teamPlant][pending]++;
      ticketCounts[ticket] = true;
    }
  });
  const teamPlantTotals = teamPlants.map(teamPlant => {
    const total = Object.keys(pivotData[teamPlant]).reduce((sum, key) => {
      if (statusCalls.includes(key)) return sum + pivotData[teamPlant][key];
      return sum;
    }, 0);
    return { teamPlant, total, ...pivotData[teamPlant] };
  }).sort((a, b) => b.total - a.total);
  // ✅ ใส่คลาส summary-table เพื่อให้คอลัมน์ "รวม" จัดกึ่งกลาง
  let pivotTableHtml = `
        <table class='detail-table summary-table'>
          <thead>
            <tr>
              <th>ศูนย์พื้นที่</th>
              <th class='fixed-width'>รวม</th>
              ${statusCalls.map(status => `<th class='fixed-width'>${status}</th>`).join('')}
              ${orderedPendingUnits.map(pending => `<th class='fixed-width'>${pending}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${teamPlantTotals.map(({ teamPlant, total }) => `
              <tr>
                <td>${teamPlant}</td>
                <td class='fixed-width'>${total === 0 ? '-' : total}</td>
                ${statusCalls.map(status => `<td class='fixed-width'>${pivotData[teamPlant][status] === 0 ? '-' : pivotData[teamPlant][status]}</td>`).join('')}
                ${orderedPendingUnits.map(pending => `<td class='fixed-width'>${pivotData[teamPlant][pending] === 0 ? '-' : pivotData[teamPlant][pending]}</td>`).join('')}
              </tr>
            `).join('')}
            <tr>
              <td><strong>รวม</strong></td>
              <td class='fixed-width'><strong>${totalCalls === 0 ? '-' : totalCalls}</strong></td>
              ${statusCalls.map(status => {
    const totalStatus = teamPlants.reduce((sum, teamPlant) => sum + pivotData[teamPlant][status], 0);
    return `<td class='fixed-width'><strong>${totalStatus === 0 ? '-' : totalStatus}</strong></td>`;
  }).join('')}
              ${orderedPendingUnits.map(pending => {
    const totalPending = teamPlants.reduce((sum, teamPlant) => sum + pivotData[teamPlant][pending], 0);
    return `<td class='fixed-width'><strong>${totalPending === 0 ? '-' : totalPending}</strong></td>`;
  }).join('')}
            </tr>
          </tbody>
        </table>
      `;
  let summaryHtml = `
        <div><span class='label'>จำนวน Call ทั้งหมด:</span> <span class='value'>${totalCalls} Call</span></div>
        <h3>จำนวน Call ค้างตามศูนย์พื้นที่และสถานะ Call</h3>
        ${pivotTableHtml}
      `;
  summaryContent.innerHTML = summaryHtml;
  summaryModal.style.display = "block";
}
function showSpareSummary() {
  const baseFilteredData = getBaseFilteredData();
  let filteredData = baseFilteredData.filter(row => (row["StatusCall"] || "").trim() === "รอของเข้า");
  filteredData = applyDashboardFilter(filteredData, dashboardFilter);

  if (filteredData.length === 0) {
    spareSummaryContent.innerHTML = `
      <div style="text-align:center; padding: 40px; color: var(--text-secondary);">
        <i class="fas fa-box-open" style="font-size: 48px; margin-bottom: 10px; opacity: 0.5;"></i>
        <p>ไม่พบรายการอะไหล่รอของเข้า</p>
      </div>`;
    spareSummaryModal.style.display = "block";
    return;
  }

  // --- 1. Prepare Data ---
  const pivotData = {};
  const pendingUnitsSet = new Set();
  let totalQuantity = 0;

  // Collect all potential columns (Pending Units)
  filteredData.forEach(row => {
    const unit = (row["ค้างหน่วยงาน"] || "ไม่ระบุ").replace(/Stock\s*/gi, '').trim();
    if (unit) pendingUnitsSet.add(unit);
  });

  const pendingUnits = [...pendingUnitsSet].sort();

  // Populate Pivot Data
  filteredData.forEach(row => {
    const matDesc = row["Material"] + '|' + getDesc(row);
    const pending = (row["ค้างหน่วยงาน"] || "ไม่ระบุ").replace(/Stock\s*/gi, '').trim();

    if (!pivotData[matDesc]) {
      pivotData[matDesc] = { total: 0 };
      pendingUnits.forEach(u => pivotData[matDesc][u] = 0);
    }

    if (pending) {
      pivotData[matDesc].total++;
      pivotData[matDesc][pending]++;
      totalQuantity++;
    }
  });

  const materials = Object.keys(pivotData);
  const sortedMaterials = materials.sort((a, b) => pivotData[b].total - pivotData[a].total);
  const topMaterial = sortedMaterials.length > 0 ? (() => {
    const parts = sortedMaterials[0].split('|');
    return `${parts[0]}\t${parts[1]}`;
  })() : '-';

  // --- 2. Build Modern HTML ---
  let html = `
    <!-- Header Summary Cards -->
    <div class="spare-header">
      <div class="spare-title"><i class="fas fa-cube"></i> สรุปรายการอะไหล่ (รอของเข้า)</div>
      <div class="pill">${filteredData.length} รายการ</div>
    </div>
    
    <div class="spare-body">
      <div class="spare-stats" style="grid-template-columns: 1fr 1fr 2.5fr;">
        <div class="stat-card">
            <div class="stat-label">จำนวนรายการรวม</div>
            <div class="stat-value" style="color: var(--info-color);">${materials.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">จำนวนชิ้นรวม</div>
            <div class="stat-value" style="color: var(--warning-color);">${totalQuantity}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">รอมากที่สุด</div>
            <div class="stat-value" style="color: var(--danger-color); font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${topMaterial}">${topMaterial}</div>
        </div>
      </div>

      <div class="spare-table">
        <table class="detail-table">
          <thead>
            <tr>
              <th style="width: 15%;">Material</th>
              <th style="width: 30%;">Description</th>
              <th style="width: 8%;">PR</th>
              <th style="width: 8%;">PO</th>
              <th class='fixed-width' style="background: rgba(0,0,0,0.02);">รวม</th>
              ${pendingUnits.map(pending => `<th class='fixed-width'>${pending}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${sortedMaterials.map(matDesc => {
    const [material, description] = matDesc.split('|');
    const data = pivotData[matDesc];
    const prVal = getPrValue(material);
    let prDisplay = '-';
    if (prVal && prVal !== '-' && parseFloat(prVal) > 0) {
      prDisplay = `<span class="request-pill js-pr-details" data-material="${material}" data-description="${description.replace(/"/g, '&quot;')}" style="background-color: #e83e8c; color: #ffffff; cursor: pointer;">${prVal}</span>`;
    }
    const poVal = getPoValue(material);
    let poDisplay = '-';
    if (poVal && poVal !== '-' && parseFloat(poVal) > 0) {
      poDisplay = `<span class="request-pill js-po-details" data-material="${material}" data-description="${description.replace(/"/g, '&quot;')}" style="background-color: #0d6efd; color: #ffffff; cursor: pointer;">${poVal}</span>`;
    }
    return `
                  <tr>
                    <td style="font-weight:600; color:var(--text-primary);">${material}</td>
                    <td style="font-size:12px; color:var(--text-secondary);">${description}</td>
                    <td style="text-align:center;">${prDisplay}</td>
                    <td style="text-align:center;">${poDisplay}</td>
                    <td class='fixed-width' style="font-weight:bold; background: rgba(0,0,0,0.02);">${data.total === 0 ? '-' : data.total}</td>
                    ${pendingUnits.map(pending => {
      const count = data[pending];
      const style = count > 0 ? 'font-weight:bold; color:var(--danger-color);' : 'color:#ccc;';
      return `<td class='fixed-width' style="${style}">${count === 0 ? '-' : count}</td>`
    }).join('')}
                  </tr>
                `;
  }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  spareSummaryContent.innerHTML = html;
  spareSummaryContent.querySelectorAll('.js-po-details').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      showPoDetails(el.dataset.material, el.dataset.description);
    });
  });
  spareSummaryContent.querySelectorAll('.js-pr-details').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      showPrDetails(el.dataset.material, el.dataset.description);
    });
  });
  spareSummaryModal.style.display = "block";
}
function printSummaryContent() {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
        <html>
          <head>
            <title>พิมพ์สรุปข้อมูล</title>
            <style>
              body { font-family: 'Prompt', sans-serif; margin: 10mm; padding: 0; }
              h2, h3 { color: #000; margin: 10px 0; }
              .detail-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              .detail-table th, .detail-table td { padding: 8px; border: 1px solid #ccc; text-align: center; }
              .detail-table th { background-color: #007bff; color: white; }
              .detail-table tr:nth-child(even) { background-color: #f9f9f9; }
              .detail-table th:not(:first-child), .detail-table td:not(:first-child) { width: 80px; min-width: 80px; max-width: 80px; }
              .detail-table th:first-child, .detail-table td:first-child { width: auto; min-width: 120px; }
              .label { font-weight: bold; color: #007bff; }
              .value { color: #000; }
              /* ✅ กึ่งกลางคอลัมน์ "รวม" ในหน้าพิมพ์ด้วย */
              .summary-table th:nth-child(2), .summary-table td:nth-child(2){ text-align:center !important; }
              @media print { body { margin: 0; } @page { margin: 10mm; } }
            </style>
          </head>
          <body onload="window.print()">
            <h2>สรุปข้อมูล Call ค้าง</h2>
            ${summaryContent.innerHTML}
          </body>
        </html>
      `);
  printWindow.document.close();
}
function printSpareSummaryContent() {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
        <html>
          <head>
            <title>พิมพ์สรุปอะไหล่</title>
            <style>
              body { font-family: 'Prompt', sans-serif; margin: 10mm; padding: 0; }
              h2, h3 { color: #000; margin: 10px 0; }
              .detail-table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: auto; }
              .detail-table th, .detail-table td {
                padding: 4px 6px;
                border: 1px solid #ccc;
                text-align: center;
                font-size: 11px;
                word-break: break-word;
              }
              .detail-table th { background-color: #007bff; color: white; }
              .detail-table tr:nth-child(even) { background-color: #f9f9f9; }
              .detail-table th:first-child, .detail-table td:first-child { min-width: 80px; text-align: left; }
              .detail-table th:nth-child(2), .detail-table td:nth-child(2) { text-align: left; }
              .detail-table th:nth-child(3), .detail-table td:nth-child(3) { text-align: center; }
              .detail-table th:nth-child(4), .detail-table td:nth-child(4) { text-align: center; }
              @media print { body { margin: 0; } @page { margin: 10mm; } }
            </style>
          </head>
          <body onload="window.print()">
            <h2>สรุปอะไหล่ (รอของเข้า)</h2>
            ${spareSummaryContent.innerHTML}
          </body>
        </html>
      `);
  printWindow.document.close();
}
// Dashboard click events
totalCard.addEventListener('click', () => {
  dashboardFilter = null;
  updateActiveCard('totalCard');
  // ✅ เพิ่ม: Reset filters กลับไปค่าตั้งต้นเพื่อแสดง Call ทั้งหมด
  employeeFilter.value = "";
  pendingFilter.value = "";
  stockFilter.value = "";
  statusCallFilter.value = "";
  searchInput.value = "";
  filterAndRenderTable();
});
pendingCard.addEventListener('click', () => {
  dashboardFilter = 'pending';
  updateActiveCard('pendingCard');
  filterAndRenderTable();
});
successCard.addEventListener('click', () => {
  dashboardFilter = 'success';
  updateActiveCard('successCard');
  filterAndRenderTable();
});
waitingResponseCard.addEventListener('click', () => {
  dashboardFilter = 'waitingResponse';
  updateActiveCard('waitingResponseCard');
  filterAndRenderTable();
});
over7Card.addEventListener('click', () => {
  dashboardFilter = 'over7';
  updateActiveCard('over7Card');
  filterAndRenderTable();
});
requestCard.addEventListener('click', () => {
  dashboardFilter = 'request';
  updateActiveCard('requestCard');
  filterAndRenderTable();
});
nawaCard.addEventListener('click', () => {
  dashboardFilter = 'nawaVipa';
  updateActiveCard('nawaCard');
  filterAndRenderTable();
});
maxCard.addEventListener('click', () => {
  const base = getBaseFilteredData();
  if (base.length === 0) return;
  const metrics = calculateDashboardMetrics(base);
  const maxPU = metrics.maxPendingUnit;
  if (maxPU !== '-') {
    pendingFilter.value = maxPU;
    dashboardFilter = null;
    updateActiveCard('maxCard');
    filterAndRenderTable();
  }
});
graphCard.addEventListener('click', showGraph);
spareSummaryCard.addEventListener('click', showSpareSummary);
// ปิดโมดัล
closeModal.onclick = () => { modal.style.display = "none"; currentTicketNumber = null; currentRowData = null; };
closeGraphModal.onclick = () => graphModal.style.display = "none";
closeSummaryModal.onclick = () => summaryModal.style.display = "none";
closeSpareSummaryModal.onclick = () => spareSummaryModal.style.display = "none";
window.onclick = e => {
  if (e.target == modal) { modal.style.display = "none"; currentTicketNumber = null; currentRowData = null; }
  if (e.target == graphModal) graphModal.style.display = "none";
  if (e.target == summaryModal) summaryModal.style.display = "none";
  if (e.target == spareSummaryModal) spareSummaryModal.style.display = "none";
};
// ปุ่มต่าง ๆ
excelButton.addEventListener("click", exportToCSV);
summaryButton.addEventListener("click", showSummary);
itemsPerPageSelect.addEventListener("change", e => { itemsPerPage = parseInt(e.target.value); currentPage = 1; filterAndRenderTable(); });
searchInput.addEventListener("input", () => { currentPage = 1; filterAndRenderTable(); });
searchButton.addEventListener("click", filterAndRenderTable);
printTableButton.addEventListener("click", printTable);
const STATUS_COLORS = {
  "รอของเข้า": "var(--danger-color)",
  "สำเร็จ": "var(--success-color)",
  "ระหว่างขนส่ง": "var(--success-color)",
  "เบิกนวนคร": "var(--info-color)",
  "เบิกวิภาวดี": "#fd7e14",
  "ขอซื้อขอซ่อม": "#20c997",
  "เบิกศูนย์อะไหล่": "var(--info-color)",
  "รอตรวจสอบ": "var(--danger-color)",
  "ดำเนินการแล้ว": "var(--success-color)"
};

function createFilterButton(label, value, count, currentValue, onClick, textColor) {
  const btn = document.createElement("button");
  const isActive = currentValue === value;
  btn.className = `modern-filter-btn ${isActive ? 'active' : ''}`;
  btn.onclick = onClick;

  if (textColor && !isActive) {
    btn.style.color = textColor;
    btn.style.fontWeight = "bold"; // Make colored text bold for better visibility
  }

  // Label text
  btn.appendChild(document.createTextNode(label));

  // Badge (only if count is defined)
  if (count !== undefined) {
    const badge = document.createElement("span");
    badge.className = "filter-badge";
    badge.textContent = count;
    btn.appendChild(badge);
  }

  return btn;
}

function populateTeamPlantFilter(data) {
  if (!data) data = [];
  employeeFilter.innerHTML = '';
  if (typeof employeeFilter.value === 'undefined') employeeFilter.value = "";
  let currentVal = employeeFilter.value;

  const ticketSets = {};
  data.forEach(row => {
    const tp = getCleanTeamPlant(row["TeamPlant"]);
    const ticket = row["Ticket Number"];
    if (tp && ticket) {
      if (!ticketSets[tp]) ticketSets[tp] = new Set();
      ticketSets[tp].add(ticket);
    }
  });
  const counts = {};
  Object.keys(ticketSets).forEach(tp => counts[tp] = ticketSets[tp].size);
  const teamPlants = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  if (currentVal && !teamPlants.includes(currentVal)) {
    currentVal = "";
    employeeFilter.value = "";
  }

  employeeFilter.appendChild(createFilterButton("ทั้งหมด", "", undefined, currentVal, () => {
    employeeFilter.value = "";
    filterAndRenderTable();
  }));

  teamPlants.forEach(teamPlant => {
    employeeFilter.appendChild(createFilterButton(teamPlant, teamPlant, counts[teamPlant], currentVal, () => {
      employeeFilter.value = teamPlant;
      filterAndRenderTable();
    }));
  });
}

function updatePendingFilter(data) {
  if (!data) data = [];
  pendingFilter.innerHTML = '';
  if (typeof pendingFilter.value === 'undefined') pendingFilter.value = "";
  const currentPendingValue = pendingFilter.value;

  const ticketSets = {};
  data.forEach(row => {
    const unit = row["ค้างหน่วยงาน"];
    const ticket = row["Ticket Number"];
    if (unit && ticket) {
      if (!ticketSets[unit]) ticketSets[unit] = new Set();
      ticketSets[unit].add(ticket);
    }
  });
  const counts = {};
  Object.keys(ticketSets).forEach(unit => counts[unit] = ticketSets[unit].size);
  const pendingUnits = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  let activeValue = currentPendingValue;
  if (activeValue && !pendingUnits.includes(activeValue)) activeValue = "";
  pendingFilter.value = activeValue;

  pendingFilter.appendChild(createFilterButton("ทั้งหมด", "", undefined, activeValue, () => {
    pendingFilter.value = "";
    filterAndRenderTable();
  }));

  pendingUnits.forEach(unit => {
    pendingFilter.appendChild(createFilterButton(unit, unit, counts[unit], activeValue, () => {
      pendingFilter.value = unit;
      filterAndRenderTable();
    }));
  });
}

function updateStockFilter(data) {
  if (!data) data = [];
  stockFilter.innerHTML = '';
  if (typeof stockFilter.value === 'undefined') stockFilter.value = "";
  const currentStockValue = stockFilter.value;

  const ticketSets = {};
  data.forEach(row => {
    const stock = row["คลังตอบ"];
    const ticket = row["Ticket Number"];
    if (stock && ticket) {
      if (!ticketSets[stock]) ticketSets[stock] = new Set();
      ticketSets[stock].add(ticket);
    }
  });
  const counts = {};
  Object.keys(ticketSets).forEach(key => counts[key] = ticketSets[key].size);
  const stockResponses = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  let activeValue = currentStockValue;
  if (activeValue && !stockResponses.includes(activeValue)) activeValue = "";
  stockFilter.value = activeValue;

  stockFilter.appendChild(createFilterButton("ทั้งหมด", "", undefined, activeValue, () => {
    stockFilter.value = "";
    filterAndRenderTable();
  }));

  stockResponses.forEach(stock => {
    stockFilter.appendChild(createFilterButton(stock, stock, counts[stock], activeValue, () => {
      stockFilter.value = stock;
      filterAndRenderTable();
    }, STATUS_COLORS[stock]));
  });
}

function updateStatusCallFilter(data) {
  if (!data) data = [];
  statusCallFilter.innerHTML = '';
  if (typeof statusCallFilter.value === 'undefined') statusCallFilter.value = "";
  const currentStatusCallValue = statusCallFilter.value;

  const ticketSets = {};
  data.forEach(row => {
    const status = row.StatusX;
    const ticket = row["Ticket Number"];
    if (status && ticket) {
      if (!ticketSets[status]) ticketSets[status] = new Set();
      ticketSets[status].add(ticket);
    }
  });
  const counts = {};
  Object.keys(ticketSets).forEach(key => counts[key] = ticketSets[key].size);
  const statusCalls = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  let activeValue = currentStatusCallValue;
  if (activeValue && !statusCalls.includes(activeValue)) activeValue = "";
  statusCallFilter.value = activeValue;

  statusCallFilter.appendChild(createFilterButton("ทั้งหมด", "", undefined, activeValue, () => {
    statusCallFilter.value = "";
    filterAndRenderTable();
  }));

  statusCalls.forEach(status => {
    statusCallFilter.appendChild(createFilterButton(status, status, counts[status], activeValue, () => {
      statusCallFilter.value = status;
      filterAndRenderTable();
    }, STATUS_COLORS[status]));
  });
}
function addSortListeners() {
  const sortableHeaders = document.querySelectorAll("th.sortable");
  sortableHeaders.forEach(header => {
    header.addEventListener("click", () => {
      const column = header.getAttribute("data-column");
      if (sortConfig.column === column) sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
      else { sortConfig.column = column; sortConfig.direction = 'asc'; }
      updateSortArrows();
      filterAndRenderTable();
    });
  });
}
function updateSortArrows() {
  const sortableHeaders = document.querySelectorAll("th.sortable");
  sortableHeaders.forEach(header => {
    const arrow = header.querySelector(".arrow");
    const column = header.getAttribute("data-column");
    arrow.textContent = (column === sortConfig.column) ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '';
  });
}
function filterAndRenderTable() {
  // Calculate StatusX for all rows first
  calculateStatusX(allData);
  calculateTicketStatus(allData);

  const baseFilteredData = getBaseFilteredData();
  let filteredData = applyDashboardFilter([...baseFilteredData], dashboardFilter);

  // Update Dropdowns with Mutual Filtering (apply dashboardFilter)
  populateTeamPlantFilter(applyDashboardFilter(getFilteredDataForContext('teamPlant'), dashboardFilter));
  updatePendingFilter(applyDashboardFilter(getFilteredDataForContext('pending'), dashboardFilter));
  updateStockFilter(applyDashboardFilter(getFilteredDataForContext('stock'), dashboardFilter));
  updateStatusCallFilter(applyDashboardFilter(getFilteredDataForContext('status'), dashboardFilter));

  // Update Dashboard Metrics
  const metrics = calculateDashboardMetrics(filteredData);
  document.getElementById("totalCalls").textContent = metrics.totalCalls;

  document.getElementById("callsPending").textContent = metrics.callsPending;
  document.getElementById("callsSuccess").textContent = metrics.callsSuccess;
  document.getElementById("callsNawaVipa").textContent = metrics.callsNawaVipa;
  document.getElementById("callsWaitingResponse").textContent = metrics.callsWaitingResponse;
  document.getElementById("callsOver7").textContent = metrics.callsOver7;
  document.getElementById("callsRequest").textContent = metrics.callsRequest;
  document.getElementById("maxPendingUnit").textContent = metrics.maxPendingUnit;
  // Update Progress Bars and Percent Texts
  const total = metrics.totalCalls || 0;
  const calculatePercent = (value) => total > 0 ? ((value / total) * 100).toFixed(0) : 0;
  document.getElementById("totalProgress").style.width = "100%";
  document.getElementById("totalPercent").textContent = "100%";

  document.getElementById("pendingProgress").style.width = `${calculatePercent(metrics.callsPending)}%`;
  document.getElementById("pendingPercent").textContent = `${calculatePercent(metrics.callsPending)}%`;
  document.getElementById("successProgress").style.width = `${calculatePercent(metrics.callsSuccess)}%`;
  document.getElementById("successPercent").textContent = `${calculatePercent(metrics.callsSuccess)}%`;
  document.getElementById("nawaProgress").style.width = `${calculatePercent(metrics.callsNawaVipa)}%`;
  document.getElementById("nawaPercent").textContent = `${calculatePercent(metrics.callsNawaVipa)}%`;
  document.getElementById("requestProgress").style.width = `${calculatePercent(metrics.callsRequest)}%`;
  document.getElementById("requestPercent").textContent = `${calculatePercent(metrics.callsRequest)}%`;
  document.getElementById("over7Progress").style.width = `${calculatePercent(metrics.callsOver7)}%`;
  document.getElementById("over7Percent").textContent = `${calculatePercent(metrics.callsOver7)}%`;
  document.getElementById("waitingResponseProgress").style.width = `${calculatePercent(metrics.callsWaitingResponse)}%`;
  document.getElementById("waitingResponsePercent").textContent = `${calculatePercent(metrics.callsWaitingResponse)}%`;

  // Update Call Type Dashboard
  // ถ้า filter เป็น Call Type ให้ใช้ baseFilteredData เพื่อไม่ให้การ์ดหาย
  // ถ้า filter เป็นอย่างอื่น (เช่น Pending) ให้ใช้ filteredData เพื่อแสดงสัดส่วนของ Pending
  const callTypeData = (dashboardFilter && dashboardFilter.startsWith('calltype_')) ? baseFilteredData : filteredData;
  updateCallTypeDashboard(callTypeData);

  if (sortConfig.column) {
    filteredData.sort((a, b) => {
      let valueA = sortConfig.column === "StatusCall" ? (a.StatusX || "") : (a[sortConfig.column] ?? (sortConfig.column === "Description" ? getDesc(a) : ""));
      let valueB = sortConfig.column === "StatusCall" ? (b.StatusX || "") : (b[sortConfig.column] ?? (sortConfig.column === "Description" ? getDesc(b) : ""));
      if (sortConfig.column === 'DayRepair') {
        let dayA = parseFloat(valueA) || 0, dayB = parseFloat(valueB) || 0;
        let ticketA = a["Ticket Number"] || "", ticketB = b["Ticket Number"] || "";
        if (dayA !== dayB) return sortConfig.direction === 'asc' ? dayA - dayB : dayB - dayA;
        return ticketA.localeCompare(ticketB);
      } else if (sortConfig.column === 'Request') {
        const reqA = parseFloat(getRequestValue(a["Material"], a["ค้างหน่วยงาน"])) || 0;
        const reqB = parseFloat(getRequestValue(b["Material"], b["ค้างหน่วยงาน"])) || 0;
        if (reqA !== reqB) return sortConfig.direction === 'asc' ? reqA - reqB : reqB - reqA;
        return (a["Ticket Number"] || "").localeCompare(b["Ticket Number"] || "");
      } else {
        valueA = valueA.toString().toLowerCase(); valueB = valueB.toString().toLowerCase();
        return sortConfig.direction === 'asc'
          ? (valueA > valueB ? 1 : valueA < valueB ? -1 : 0)
          : (valueA < valueB ? 1 : valueA > valueB ? -1 : 0);
      }
    });
  } else {
    filteredData.sort((a, b) => {
      let dayA = parseFloat(a["DayRepair"]) || 0;
      let dayB = parseFloat(b["DayRepair"]) || 0;
      let ticketA = a["Ticket Number"] || "";
      let ticketB = b["Ticket Number"] || "";
      if (dayA !== dayB) return dayB - dayA;
      return ticketA.localeCompare(ticketB);
    });
  }

  renderTable(filteredData);
}
function renderTable(data) {
  tableBody.innerHTML = '';
  if (!data || data.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="20">ไม่มีข้อมูลที่ตรงกับเงื่อนไข</td></tr>';
    return;
  }
  const frag = document.createDocumentFragment();
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedData = data.slice(startIdx, endIdx);
  const ticketGroups = {};
  data.forEach(row => {
    const ticket = row["Ticket Number"];
    if (!ticketGroups[ticket]) ticketGroups[ticket] = [];
    ticketGroups[ticket].push(row);
  });
  const uniqueTickets = Object.keys(ticketGroups).sort();
  const colorMap = {};
  uniqueTickets.forEach((ticket, index) => { colorMap[ticket] = index % 2 === 0 ? "yellow-light" : "pink-pastel"; });
  paginatedData.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.style.animationDelay = `${i * 0.05}s`;
    const ticket = row["Ticket Number"];
    tr.className = colorMap[ticket] || "yellow-light";
    const columns = ["Select", "StatusGroup", "DayRepair", "DateTime", "Brand", "Call Type", "Team", "TeamPlant", "ค้างหน่วยงาน", "Ticket Number", "Material", "Description", "Rebuilt", "PR", "PO", "Nawa", "Vipa", "Request", "QtyPlant", "OtherPlant", "คลังตอบ", "StatusCall", "วันที่ตอบ", "UserAns", "Answer1"];
    columns.forEach(col => {
      const td = document.createElement("td");
      let cellValue;
      if (col === "Select") {
        td.style.textAlign = "center";
        td.style.width = "40px";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = selectedTickets.has(ticket);
        cb.addEventListener("change", () => {
          if (cb.checked) selectedTickets.add(ticket);
          else selectedTickets.delete(ticket);
          updateSelectAllState(paginatedData);
        });
        td.appendChild(cb);
        tr.appendChild(td);
        return;
      }

      const smallColumns = ["PR", "PO", "Nawa", "Vipa", "Request", "QtyPlant", "OtherPlant", "DayRepair"];
      if (smallColumns.includes(col)) {
        td.style.width = "50px";
        td.style.maxWidth = "50px";
      }
      const mediumColumns = ["Rebuilt", "คลังตอบ", "DateTime"];
      if (mediumColumns.includes(col)) {
        td.style.width = "75px";
        td.style.maxWidth = "75px";
      }

      if (col === "Description") cellValue = getDesc(row);
      else if (col === "Request") cellValue = getRequestValue(row["Material"], row["ค้างหน่วยงาน"]);
      else if (col === "Rebuilt") {
        td.innerHTML = ""; // Clear content
        cellValue = getMainSapValue(row["Material"]); // This function now returns strict null for empty/- logic
        if (cellValue) {
          // Use innerHTML with inline styles to guarantee appearance
          td.innerHTML = `<span class="request-pill" style="background-color: #0d6efd !important; color: #ffffff !important; display: inline-flex; align-items: center; justify-content: center; padding: 2px 8px; border-radius: 99px; font-weight: bold; min-width: 24px;">${cellValue}</span>`;
          td.style.textAlign = "center";
        }
      }
      else if (col === "PO") {
        td.textContent = "";
        cellValue = getPoValue(row["Material"]);
        const val = parseFloat(cellValue);
        if (!isNaN(val) && val > 0) {
          const pill = document.createElement("span");
          pill.className = "request-pill";
          pill.style.backgroundColor = "#0d6efd";
          pill.style.color = "#ffffff";
          pill.textContent = cellValue;
          td.appendChild(pill);
        } else {
          td.textContent = "-";
        }
      }
      else if (col === "StatusCall") cellValue = row.StatusX; // StatusX renamed to StatusCall
      else if (col === "StatusGroup") cellValue = row.StatusCall; // Group Status renamed to StatusGroup
      else cellValue = row[col];

      if (col === "TeamPlant") {
        cellValue = getCleanTeamPlant(cellValue);
      }
      let displayValue = cellValue;
      if (col === "DateTime") {
        displayValue = extractDate(cellValue);
      }
      if (col === "DayRepair") {
        displayValue = isNaN(parseFloat(displayValue)) ? "-" : parseFloat(displayValue).toFixed(0);
      } else if (col === "คลังตอบ") {
        if (cellValue === "ดำเนินการแล้ว") { displayValue = "ดำเนินการแล้ว"; td.style.color = "var(--success-color)"; td.style.fontWeight = "bold"; }
        else if (cellValue === "รอตรวจสอบ") { displayValue = "รอตรวจสอบ"; td.style.color = "var(--danger-color)"; td.style.fontWeight = "bold"; }
      } else if (col === "StatusCall" || col === "StatusGroup") {
        if (cellValue === "รอของเข้า") { td.style.color = "var(--danger-color)"; td.style.fontWeight = "bold"; }
        else if (cellValue === "สำเร็จ") { td.style.color = "var(--success-color)"; td.style.fontWeight = "bold"; }
        else if (cellValue === "ระหว่างขนส่ง") { td.style.color = "var(--success-color)"; td.style.fontWeight = "bold"; }
        else if (cellValue === "เบิกนวนคร") { td.style.color = "var(--info-color)"; td.style.fontWeight = "bold"; }
        else if (cellValue === "เบิกวิภาวดี") { td.style.color = "#fd7e14"; td.style.fontWeight = "bold"; }
        else if (cellValue === "ขอซื้อขอซ่อม") { td.style.color = "#20c997"; td.style.fontWeight = "bold"; } // Changed to Teal
        else if (cellValue === "เบิกศูนย์อะไหล่") { td.style.color = "var(--info-color)"; td.style.fontWeight = "bold"; }
        else { td.style.color = "var(--text-secondary)"; }
      }
      if (col === "Request") {
        td.classList.add("request-cell");
        td.dataset.material = normalizeMaterial(row["Material"]);
        td.dataset.pending = row["ค้างหน่วยงาน"] || "";
        const numericVal = parseFloat(displayValue);
        const shouldShowPill = !isNaN(numericVal) && numericVal > 0;
        if (shouldShowPill) {
          const pill = document.createElement("span");
          pill.className = "request-pill";
          pill.textContent = displayValue;
          td.appendChild(pill);
        } else {
          td.textContent = "";
        }
      } else if (col === "Nawa") {
        td.textContent = "";
        const nawaVal = parseFloat((row["Nawa"] || "0").toString().replace(/,/g, ''));
        if (nawaVal > 0) {
          const pill = document.createElement("span");
          pill.className = "request-pill";
          pill.style.backgroundColor = "var(--success-color)";
          pill.textContent = displayValue;
          td.appendChild(pill);
        } else {
          td.textContent = (displayValue === "0" || displayValue === 0) ? "" : displayValue;
        }
        const pendingUnit = (row["ค้างหน่วยงาน"] || "").trim();
        if (nawaVal > 0 && pendingUnit === "Stock วิภาวดี 62") {
          td.style.cursor = "pointer";
          td.onclick = () => { currentRowData = row; orderModalContent(); };
        }
      } else if (col === "Vipa") {
        td.textContent = "";
        const vipaVal = parseFloat((row["Vipa"] || "0").toString().replace(/,/g, ''));
        if (vipaVal > 0) {
          const pill = document.createElement("span");
          pill.className = "request-pill";
          pill.style.backgroundColor = "#fd7e14";
          pill.textContent = displayValue;
          td.appendChild(pill);
        } else {
          td.textContent = (displayValue === "0" || displayValue === 0) ? "" : displayValue;
        }
        const pendingUnit = (row["ค้างหน่วยงาน"] || "").trim();
        if (vipaVal > 0 && pendingUnit === "Stock วิภาวดี 62") {
          td.style.cursor = "pointer";
          td.onclick = () => { currentRowData = row; printModalContent(); };
        }
      } else if (col === "QtyPlant") {
        td.textContent = "";
        const qtyVal = parseFloat((row["QtyPlant"] || "0").toString().replace(/,/g, ''));
        if (qtyVal > 0) {
          const pill = document.createElement("span");
          pill.className = "request-pill";
          pill.style.backgroundColor = "#6f42c1"; // Purple
          pill.textContent = displayValue;
          td.appendChild(pill);
        } else {
          td.textContent = (displayValue === "0" || displayValue === 0) ? "" : displayValue;
        }
      } else if (col === "OtherPlant") {
        td.textContent = "";
        const otherVal = parseFloat((row["OtherPlant"] || "0").toString().replace(/,/g, ''));
        if (otherVal > 0) {
          const pill = document.createElement("span");
          pill.className = "request-pill";
          pill.style.backgroundColor = "#20c997"; // Teal
          pill.textContent = displayValue;
          pill.style.cursor = "pointer";
          pill.onclick = (e) => {
            e.stopPropagation();
            showOtherPlantDetails(row["Material"], getDesc(row));
          };
          td.appendChild(pill);
        } else {
          td.textContent = (displayValue === "0" || displayValue === 0) ? "" : displayValue;
        }
      } else if (col === "PR") {
        td.textContent = "";
        const prVal = getPrValue(row["Material"]);
        const val = parseFloat((prVal || "0").toString().replace(/,/g, ''));
        if (!isNaN(val) && val > 0) {
          const pill = document.createElement("span");
          pill.className = "request-pill";
          pill.style.backgroundColor = "#e83e8c";
          pill.style.color = "#ffffff";
          pill.textContent = prVal;
          pill.style.cursor = "pointer";
          pill.onclick = (e) => {
            e.stopPropagation();
            showPrDetails(row["Material"], getDesc(row));
          };
          td.appendChild(pill);
        } else {
          td.textContent = "";
        }
      } else if (col === "PO") {
        td.textContent = "";
        const poVal = parseFloat((cellValue || "0").toString().replace(/,/g, ''));
        if (poVal > 0) {
          const pill = document.createElement("span");
          pill.className = "request-pill";
          pill.style.backgroundColor = "#0d6efd";
          pill.style.color = "#ffffff";
          pill.textContent = displayValue;
          pill.style.cursor = "pointer";
          pill.onclick = (e) => {
            e.stopPropagation();
            showPoDetails(row["Material"], getDesc(row));
          };
          td.appendChild(pill);
        } else {
          td.textContent = "";
        }
      } else if (col === "Rebuilt") {
        td.innerHTML = "";
        if (displayValue && displayValue !== "-" && displayValue !== "0") {
          td.innerHTML = `<span class="request-pill" style="background-color: #0d6efd !important; color: #ffffff !important; display: inline-flex; align-items: center; justify-content: center; padding: 2px 8px; border-radius: 99px; font-weight: bold; min-width: 24px;">${displayValue}</span>`;
          td.style.textAlign = "center";
        } else {
          td.textContent = "";
        }
      } else {
        td.textContent = (displayValue === "0" || displayValue === 0) ? "" : displayValue;
      }
      if (col === "Answer1") { td.style.textAlign = "left"; }
      td.classList.add("text-left");
      td.dataset.column = col; // Add data-column attribute
      tr.appendChild(td);
    });
    const detailTd = document.createElement("td");
    const btn = document.createElement("button");
    btn.textContent = "ดูรายละเอียด";
    btn.className = "detail-button";
    btn.onclick = () => {
      currentTicketNumber = row["Ticket Number"];
      currentRowData = row; // เก็บแถวปัจจุบันสำหรับพิมพ์จากโมดัล
      const timeline = row["TimeLine"] || "";
      let timelineHtml = '<table class="timeline-table"><thead><tr style="font-size: 12px; text-align: center;"><th style="width: 50px;">วันที่</th><th>ค้างหน่วยงาน</th><th>ผู้แจ้ง</th><th style="width: 50px; max-width: 50px; overflow: hidden; padding: 1px;">ใช้เวลาดำเนินการแจ้ง</th><th>แจ้งค้าง</th><th style="width: 60%;">รายละเอียด</th></tr></thead><tbody>';
      if (timeline) {
        const events = timeline.split('|');
        let previousDateObj = null;
        let previousPendingUnitStr = '-';

        events.forEach(event => {
          let eventTrim = event.trim();
          if (eventTrim) {
            let date = ''; let person = ''; let status = ''; let details = ''; let pendingUnit = '-'; let duration = '';

            // 1. Extract Date
            const dateMatch = eventTrim.match(/^(\d{2}\.\d{2})\s/);
            let currentDateObj = null;

            if (dateMatch) {
              date = dateMatch[1];
              eventTrim = eventTrim.slice(dateMatch[0].length);

              // Date Parsing Logic
              const [day, month] = date.split('.').map(Number);
              if (day && month) {
                const today = new Date();
                let year = today.getFullYear();
                let tempDate = new Date(year, month - 1, day);

                // If tempDate is more than 6 months in the future, assume it's last year
                if (tempDate.getTime() > today.getTime() + (180 * 24 * 60 * 60 * 1000)) {
                  year--;
                  tempDate = new Date(year, month - 1, day);
                }
                currentDateObj = tempDate;
              }
            }

            // Calculate Duration
            if (currentDateObj) {
              if (previousDateObj) {
                const diffTime = Math.abs(currentDateObj - previousDateObj);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                duration = diffDays.toString();
              } else {
                duration = '';
              }
              previousDateObj = currentDateObj;
            } else {
              duration = '';
            }

            // 2. Extract Person
            if (eventTrim.startsWith('Backlog ')) { person = 'Backlog'; eventTrim = eventTrim.slice(8); }
            else if (eventTrim.startsWith('คุณ')) {
              const personEnd = eventTrim.indexOf(' ', 3);
              if (personEnd > -1) { person = eventTrim.slice(0, personEnd); eventTrim = eventTrim.slice(personEnd + 1); }
              else { person = eventTrim; eventTrim = ''; }
            } else if (eventTrim.startsWith('-')) {
              const personEnd = eventTrim.indexOf(' ', 1);
              if (personEnd > -1) { person = '-'; eventTrim = eventTrim.slice(personEnd + 1); }
            }

            // 3. Extract Pending Unit Logic
            const pendingMarker = "แจ้งค้าง_";
            const pendingIndex = eventTrim.indexOf(pendingMarker);

            if (pendingIndex !== -1) {
              let tempText = eventTrim.substring(pendingIndex + pendingMarker.length);

              const stopKeywords = ['รอ', 'เกิน', 'จัด', 'อยู่', 'ส่ง', 'จอง', 'ซ่อม'];
              let minIndex = tempText.length;

              stopKeywords.forEach(keyword => {
                const index = tempText.indexOf(keyword);
                if (index !== -1 && index < minIndex) {
                  minIndex = index;
                }
              });

              pendingUnit = tempText.substring(0, minIndex).trim();

              // Fallback: Use first word if result is empty but text exists
              if (!pendingUnit && tempText.length > 0) {
                const firstSpace = tempText.indexOf(' ');
                if (firstSpace > -1) pendingUnit = tempText.substring(0, firstSpace).trim();
                else pendingUnit = tempText.trim();
              }
            }
            if (!pendingUnit) pendingUnit = '-';

            // Fallback from Status text if needed and date is present
            if ((!pendingUnit || pendingUnit === '-' || pendingUnit === '') && date) {
              if (eventTrim.startsWith('แจ้งค้าง_')) {
                const pureStatus = eventTrim.substring(9).trim();
                const spaceIdx = pureStatus.indexOf(' ');
                if (spaceIdx > -1) pendingUnit = pureStatus.substring(0, spaceIdx);
                else pendingUnit = pureStatus;
              }
              if (!pendingUnit) pendingUnit = '-';
            }

            // 4. Extract Status & Details
            if (eventTrim.startsWith('แจ้งค้าง_')) {
              const statusEnd = eventTrim.indexOf(' ', 9);
              if (statusEnd > -1) {
                status = eventTrim.slice(0, statusEnd);
                details = eventTrim.slice(statusEnd + 1);
              } else {
                status = eventTrim;
                details = '';
              }
            } else {
              const statusEnd = eventTrim.indexOf(' ');
              if (statusEnd > -1) {
                status = eventTrim.slice(0, statusEnd);
                details = eventTrim.slice(statusEnd + 1);
              } else {
                status = eventTrim;
                details = '';
              }
            }
            if (details.trim() === '-') details = '';

            // Combined Status and Details
            const combinedDetails = `<span style="font-weight:bold;">${status || '-'}</span><br>${details || ''}`;

            // LOGIC: Show Tracked Pending Unit only on rows with Date.
            // If row has no date (detail row), show '-'.
            let displayPendingUnit = '-';
            if (date) {
              displayPendingUnit = previousPendingUnitStr;
            }

            timelineHtml += `<tr><td>${date || '-'}</td><td style="color:#28a745;">${displayPendingUnit}</td><td>${person || '-'}</td><td style="text-align:center; font-weight:bold; color:#0d6efd;">${duration}</td><td style="color:#dc3545;">${pendingUnit}</td><td>${combinedDetails}</td></tr>`;

            // Only update the tracker if we have a real pending unit (not empty/dash)
            // This prevents detail rows (which often have pendingUnit='-') from resetting our tracker.
            if (pendingUnit && pendingUnit !== '-' && pendingUnit.trim() !== '') {
              previousPendingUnitStr = pendingUnit;
            }
          }
        });
      }
      timelineHtml += '</tbody></table>';
      modalContent.innerHTML = `
            <div><span class="label">ผ่านมา:</span> <span class="value">${row["DayRepair"] || "-"}</span></div>
            <div><span class="label">วันที่แจ้ง:</span> <span class="value">${extractDate(row["DateTime"] || "-")}</span></div>
            <div><span class="label">Ticket Number:</span> <span class="value">${row["Ticket Number"] || "-"}</span></div>
            <div><span class="label">Brand:</span> <span class="value">${row["Brand"] || "-"}</span></div>
            <div><span class="label">Call Type:</span> <span class="value">${row["Call Type"] || "-"}</span></div>
            <div><span class="label">Team:</span> <span class="value">${row["Team"] || "-"}</span></div>
            <div><span class="label">ศูนย์พื้นที่:</span> <span class="value">${getCleanTeamPlant(row["TeamPlant"]) || "-"}</span></div>
            <div><span class="label">ค้างหน่วยงาน:</span> <span class="value">${row["ค้างหน่วยงาน"] || "-"}</span></div>
            <div><span class="label">Material:</span> <span class="value">${row["Material"] || "-"}</span></div>
            <div><span class="label">Description:</span> <span class="value">${getDesc(row) || "-"}</span></div>
            <div><span class="label">นวนคร:</span> <span class="value">${row["Nawa"] || "-"}</span></div>
            <div><span class="label">วิภาวดี:</span> <span class="value">${row["Vipa"] || "-"}</span></div>
            <div><span class="label">นอกรอบ:</span> <span class="value">${getRequestValue(row["Material"], row["ค้างหน่วยงาน"])}</span></div>
            <div><span class="label">ศูนย์พื้นที่:</span> <span class="value">${row["QtyPlant"] || "-"}</span></div>
            <div><span class="label">คลังตอบ:</span> <span class="value">${row["คลังตอบ"] || "-"}</span></div>
            <div><span class="label">สถานะ Call:</span> <span class="value">${row["StatusCall"] || "-"}</span></div>
            <div><span class="label">วันที่ตอบ:</span> <span class="value">${row["วันที่ตอบ"] || "-"}</span></div>
            <div><span class="label">ผู้แจ้ง:</span> <span class="value">${row["UserAns"] || "-"}</span></div>
            <div><span class="label">แจ้งผล:</span> <span class="value">${row["Answer1"] || "-"}</span></div>
            <h3>ประวัติ Timeline</h3>
            ${timelineHtml}
          `;
      modal.style.display = "block";
    };
    detailTd.appendChild(btn);
    tr.appendChild(detailTd);
    frag.appendChild(tr);
  });
  tableBody.appendChild(frag);
  updatePagination(data.length);
  updateSelectAllState(paginatedData);
}
function updatePagination(totalItems) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  currentPage = Math.min(currentPage, totalPages);
  if (currentPage < 1) currentPage = 1;
  pageNumbersContainer.innerHTML = '';
  const maxPageButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
  if (endPage - startPage + 1 < maxPageButtons) startPage = Math.max(1, endPage - maxPageButtons + 1);
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = "page-number";
    if (i === currentPage) btn.classList.add("active");
    btn.addEventListener("click", () => { currentPage = i; filterAndRenderTable(); });
    pageNumbersContainer.appendChild(btn);
  }
  firstPageButton.disabled = currentPage === 1;
  prevPageButton.disabled = currentPage === 1;
  nextPageButton.disabled = currentPage === totalPages;
  lastPageButton.disabled = currentPage === totalPages;
  firstPageButton.onclick = () => { currentPage = 1; filterAndRenderTable(); };
  prevPageButton.onclick = () => { if (currentPage > 1) { currentPage--; filterAndRenderTable(); } };
  nextPageButton.onclick = () => { if (currentPage < totalPages) { currentPage++; filterAndRenderTable(); } };
  lastPageButton.onclick = () => { currentPage = totalPages; filterAndRenderTable(); };
}
function updateSelectAllState(currentPageData) {
  if (!selectAllCheckbox) return;
  if (!currentPageData || currentPageData.length === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
    return;
  }
  const tickets = currentPageData.map(r => r["Ticket Number"]);
  const allSelected = tickets.every(t => selectedTickets.has(t));
  const someSelected = tickets.some(t => selectedTickets.has(t));
  selectAllCheckbox.checked = allSelected;
  selectAllCheckbox.indeterminate = !allSelected && someSelected;
}
if (selectAllCheckbox) {
  selectAllCheckbox.addEventListener("change", () => {
    const baseFilteredData = getBaseFilteredData();
    let filteredData = applyDashboardFilter([...baseFilteredData], dashboardFilter);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedData = filteredData.slice(startIdx, endIdx);
    paginatedData.forEach(row => {
      const ticket = row["Ticket Number"];
      if (!ticket) return;
      if (selectAllCheckbox.checked) selectedTickets.add(ticket);
      else selectedTickets.delete(ticket);
    });
    updateSelectAllState(paginatedData);
    renderTable(filteredData);
  });
}
// Initialize App (load data after login)
// Initialize App (Instant Load: Cache First -> Background Fetch)
const syncStatusEl = document.getElementById('syncStatus');
function updateSyncStatus(state) {
  if (!syncStatusEl) return;
  syncStatusEl.className = 'sync-status'; // Reset
  if (state === 'syncing') {
    syncStatusEl.classList.add('syncing');
    syncStatusEl.title = "กำลังซิงค์ข้อมูลกับ Server...";
  } else if (state === 'success') {
    syncStatusEl.classList.add('success');
    syncStatusEl.title = "ข้อมูลเป็นปัจจุบัน";
  } else if (state === 'error') {
    syncStatusEl.classList.add('error');
    syncStatusEl.title = "การซิงค์ข้อมูลขัดข้อง";
  } else {
    syncStatusEl.title = "สถานะการซิงค์ข้อมูล";
  }
}

// Main SAP Data Variables
let mainSapData = [];
const mainSapSheetID = '1CkfOIe2nDYBLs5aPGkPyZhOeqJkyS7UQ6tuMzxy-mfk';
const mainSapSheetName = 'mainsap';
const mainSapUrl = `https://opensheet.elk.sh/${mainSapSheetID}/${mainSapSheetName}`;

// Vipa Data Variables
let vipaStockData = {};
const vipaSheetID = '1gtZLR5Tm574o5xRbdrRm9yFzRukGx_UAzUnoah36cxQ';
const vipaSheetName = 'Sheet1';
const vipaUrl = `https://opensheet.elk.sh/${vipaSheetID}/${vipaSheetName}`;

// Nawa Data Variables
let nawaStockData = {};
const nawaSheetID = '1x-B1xekpMm4p7fkKucvLjaewtp66uGIp8ZIxJJZAxMk';
const nawaSheetName = 'Sheet1';
const nawaUrl = `https://opensheet.elk.sh/${nawaSheetID}/${nawaSheetName}`;

async function loadMainSapData() {
  console.log("[mainsap] fetch start", mainSapUrl);
  try {
    const response = await fetch(mainSapUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Main SAP sheet fetch failed (${response.status})`);
    const data = await response.json();
    mainSapData = data;
    console.log("[mainsap] fetch ok, items:", mainSapData.length);
    return mainSapData;
  } catch (err) {
    console.warn("[mainsap] fetch fail", err);
    return [];
  }
}

// Plant Stock Data Variables
let plantStockData = {}; // Maps "Plant_Material" to summed qty
let otherPlantStockData = {}; // Maps "Material" to summed qty independently of Plant
let otherPlantDetailsData = {}; // Maps "Material" to array of {plant, qty} objects for the modal popup
const plantStockSheetID = '1OtcgbmQdrI3gKJCGiDge6xuOsrT0GPxdKeFPjpvK3Rg';
const plantStockSheetName = 'Sheet1';
const plantStockUrl = `https://opensheet.elk.sh/${plantStockSheetID}/${plantStockSheetName}`;

// Plant Pending Unit Data Variables
const PLANT_MAPPING = {
  "Stock กทม": "0301",
  "Stock คลังระยอง": "0369",
  "Stock วิภาวดี 62": "0326",
  "Stock ขอนแก่น": "0319",
  "Stock โคราช": "0309",
  "Stock เชียงใหม่": "0366",
  "Stock พระราม 3": "0304",
  "Stock พิษณุโลก": "0312",
  "Stock ภูเก็ต": "0313",
  "Stock ราชบุรี": "0305",
  "Stock ลำปาง": "0320",
  "Stock ศรีราชา": "0311",
  "Stock สุราษฎร์": "0307",
  "Stock ประเวศ": "0330",
  // New additional mappings
  "Stock SA ฉะเชิงเทรา": "0367",
  "Stock SA บางบัวทอง": "0364",
  "Stock SA ปัตตานี": "0324",
  "Stock SA ปากเกร็ด": "0363",
  "Stock SA ร้อยเอ็ด": "0368",
  "Stock SA ลำลูกกา": "0323",
  "Stock SA สงขลา": "0303",
  "Stock SA สมุทรปราการ": "0365",
  "Stock SA หนองแขม": "0362",
  "Stock SA อยุธยา": "0315",
  "Stock SA อุดรธานี1": "0310",
  "Stock SA อุดรธานี2": "0322"
};

function getMainSapValue(material) {
  const key = normalizeMaterial(material);
  if (!key) return null;
  const found = mainSapData.find(row => normalizeMaterial(row["Material"]) === key);
  let val = found ? found["Rebuilt"] : null;

  // Strict cleaning
  if (val === null || val === undefined) return null;
  val = String(val).trim();

  if (val === "" || val === "-" || val === "0") return null; // Also hide 0 if that's desired, or remove 0 check if needed
  return val;
}

// Fetch Vipa Data
async function loadVipaData() {
  console.log("[vipa] fetch start", vipaUrl);
  try {
    const response = await fetch(vipaUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Vipa sheet fetch failed (${response.status})`);
    const data = await response.json();
    vipaStockData = computeStockQuantities(data);
    console.log("[vipa] fetch ok, items:", Object.keys(vipaStockData).length);
    return vipaStockData;
  } catch (err) {
    console.warn("[vipa] fetch fail", err);
    return {};
  }
}

// Fetch Nawa Data
async function loadNawaData() {
  console.log("[nawa] fetch start", nawaUrl);
  try {
    const response = await fetch(nawaUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Nawa sheet fetch failed (${response.status})`);
    const data = await response.json();
    nawaStockData = computeStockQuantities(data);
    console.log("[nawa] fetch ok, items:", Object.keys(nawaStockData).length);
    return nawaStockData;
  } catch (err) {
    console.warn("[nawa] fetch fail", err);
    return {};
  }
}

// Fetch Plant Stock Data
async function loadPlantStockData() {
  console.log("[plant stock] fetch start", plantStockUrl);
  try {
    const response = await fetch(plantStockUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Plant stock sheet fetch failed (${response.status})`);
    const data = await response.json();
    plantStockData = computePlantStockQuantities(data);
    console.log("[plant stock] fetch ok, items:", Object.keys(plantStockData).length);
    return plantStockData;
  } catch (err) {
    console.warn("[plant stock] fetch fail", err);
    return {};
  }
}

function computePlantStockQuantities(data) {
  const plantStockResult = {};
  const otherPlantResult = {};
  otherPlantDetailsData = {}; // Clear previous data

  if (!Array.isArray(data)) return plantStockResult;
  data.forEach(row => {
    const material = normalizeMaterial(row["Material"] || "");
    const plant = (row["Plant"] || "").toString().trim();
    if (!material) return;

    const qtyRaw = row["Unrestricted"];
    const qty = parseFloat((qtyRaw + "").replace(/,/g, ''));
    if (!isNaN(qty)) {
      // Plant-specific aggregation
      if (plant) {
        const key = `${plant}_${material}`;
        plantStockResult[key] = (plantStockResult[key] || 0) + qty;

        // Modal detail append
        if (!otherPlantDetailsData[material]) {
          otherPlantDetailsData[material] = [];
        }
        otherPlantDetailsData[material].push({ plant: plant, qty: qty });
      }

      // Global material aggregation for OtherPlant
      otherPlantResult[material] = (otherPlantResult[material] || 0) + qty;
    }
  });

  otherPlantStockData = otherPlantResult; // Assign global variable
  return plantStockResult;
}

function computeStockQuantities(data) {
  const result = {};
  if (!Array.isArray(data)) return result;
  data.forEach(row => {
    const material = normalizeMaterial(row["Material"] || "");
    if (!material) return;
    const qtyRaw = row["Unrestricted"];
    const qty = parseFloat((qtyRaw + "").replace(/,/g, ''));
    if (!isNaN(qty)) {
      result[material] = qty; // Assuming material is unique, overwrite or sum (depending on data structure, we'll overwrite as per standard lookup)
    }
  });
  return result;
}

function applyStockDataToAllData(data) {
  if (!Array.isArray(data)) return;
  data.forEach(row => {
    const material = normalizeMaterial(row["Material"]);
    if (!material) return;

    // Apply Vipa
    if (vipaStockData[material] !== undefined) {
      row["Vipa"] = vipaStockData[material];
    }
    // Apply Nawa
    if (nawaStockData[material] !== undefined) {
      row["Nawa"] = nawaStockData[material];
    }

    // Convert 0 to empty for better UI display
    if (row["Vipa"] === 0 || row["Vipa"] === "0") {
      row["Vipa"] = "";
    }
    if (row["Nawa"] === 0 || row["Nawa"] === "0") {
      row["Nawa"] = "";
    }

    // Apply Plant mapping based on Pending Unit (ค้างหน่วยงาน)
    const pendingUnitRaw = (row["ค้างหน่วยงาน"] || "").trim();
    if (pendingUnitRaw && PLANT_MAPPING[pendingUnitRaw]) {
      row["Plant"] = PLANT_MAPPING[pendingUnitRaw];
    } else {
      row["Plant"] = "";
    }

    // Apply Plant Stock data securely to QtyPlant
    if (row["Plant"]) {
      const plantStockKey = `${row["Plant"]}_${material}`;
      if (plantStockData[plantStockKey] !== undefined) {
        row["QtyPlant"] = plantStockData[plantStockKey];
      }
    }

    // Convert 0 to empty for better UI display on QtyPlant
    if (row["QtyPlant"] === 0 || row["QtyPlant"] === "0") {
      row["QtyPlant"] = "";
    }

    // Apply OtherPlant mapped from otherPlantStockData
    if (otherPlantStockData[material] !== undefined) {
      row["OtherPlant"] = otherPlantStockData[material];
    }
    if (row["OtherPlant"] === 0 || row["OtherPlant"] === "0") {
      row["OtherPlant"] = "";
    }

  });
}

function ensureTableHeaders() {
  const theadRow = document.querySelector("#data-table thead tr");
  if (!theadRow) return;

  const createHeader = (text, key) => {
    const th = document.createElement("th");
    th.textContent = text;
    th.dataset.column = key;
    th.className = "sortable";
    th.style.textAlign = "center";
    th.addEventListener("click", () => {
      if (sortConfig.column === key) sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
      else { sortConfig.column = key; sortConfig.direction = 'asc'; }
      updateSortArrows();
      filterAndRenderTable();
    });
    const arrow = document.createElement("span");
    arrow.className = "arrow";
    th.appendChild(arrow);

    // Set small width for specific columns
    const smallColumns = ["PR", "PO", "Nawa", "Vipa", "Request", "QtyPlant", "OtherPlant", "DayRepair"];
    if (smallColumns.includes(key)) {
      th.style.width = "50px";
      th.style.maxWidth = "50px";
    }

    const mediumColumns = ["Rebuilt", "คลังตอบ", "DateTime"];
    if (mediumColumns.includes(key)) {
      th.style.width = "75px";
      th.style.maxWidth = "75px";
    }

    return th;
  };

  const existingHeaders = Array.from(theadRow.children);
  const hasStatusCall = existingHeaders.some(th => th.dataset.column === "StatusCall");
  const hasStatusGroup = existingHeaders.some(th => th.dataset.column === "StatusGroup");
  const hasPR = existingHeaders.some(th => th.dataset.column === "PR");
  const hasRebuilt = existingHeaders.some(th => th.dataset.column === "Rebuilt");

  // 1. ตรวจสอบและเพิ่มหัวตาราง ทดแทน (Rebuilt) ต่อจาก Description
  if (!hasRebuilt) {
    const descHeader = Array.from(theadRow.children).find(th => th.dataset.column === "Description" || th.textContent.trim() === "Description");
    if (descHeader) {
      const th = createHeader("ทดแทน", "Rebuilt");
      if (descHeader.nextSibling) theadRow.insertBefore(th, descHeader.nextSibling);
      else theadRow.appendChild(th);
    }
  }

  // 2. ตรวจสอบและเพิ่มหัวตาราง PR ต่อจาก Rebuilt (หรือ Description ถ้าไม่มี Rebuilt)
  if (!hasPR) {
    // Refresh headers list as DOM changed
    const currentHeaders = Array.from(theadRow.children);
    let anchor = currentHeaders.find(th => th.dataset.column === "Rebuilt");
    if (!anchor) {
      // Fallback to Description
      anchor = currentHeaders.find(th => th.dataset.column === "Description" || th.textContent.trim() === "Description");
    }

    if (anchor) {
      const th = createHeader("PR", "PR");
      if (anchor.nextSibling) theadRow.insertBefore(th, anchor.nextSibling);
      else theadRow.appendChild(th);
    }
  }

  // 3. ตรวจสอบและเพิ่มหัวตาราง StatusCall (StatusGroup column) ต่อจาก Checkbox
  let statusGroupHeader = existingHeaders.find(th => th.dataset.column === "StatusGroup");
  if (!statusGroupHeader) {
    const th = createHeader("StatusCall", "StatusGroup"); // Header text "StatusCall" for column "StatusGroup"
    // Insert after first child (checkbox) if possible
    const firstTh = theadRow.children[0];
    if (firstTh) {
      if (firstTh.nextSibling) theadRow.insertBefore(th, firstTh.nextSibling);
      else theadRow.appendChild(th);
    } else {
      theadRow.appendChild(th);
    }
  } else {
    // Ensure header text is correct (handling potential renames/moves manually if needed)
    if (statusGroupHeader.firstChild) statusGroupHeader.firstChild.textContent = "StatusCall";
  }

  // หาตำแหน่งคอลัมน์ 'คลังตอบ' เพื่อแทรกต่อท้าย
  const anchorIndex = existingHeaders.findIndex(th => th.dataset.column === "คลังตอบ" || th.textContent.trim() === "คลังตอบ");

  if (anchorIndex !== -1) {
    const anchor = existingHeaders[anchorIndex];

    let statusCallHeader = existingHeaders.find(th => th.dataset.column === "StatusCall");
    if (!statusCallHeader) {
      const th = createHeader("Status", "StatusCall");
      if (anchor.nextSibling) theadRow.insertBefore(th, anchor.nextSibling);
      else theadRow.appendChild(th);
      statusCallHeader = th;
    } else {
      if (statusCallHeader.firstChild) statusCallHeader.firstChild.textContent = "Status";
    }

    // Legacy StatusGroup placement logic removed as it's now handled above
  }
}

function initApp() {
  ensureTableHeaders();
  // เปลี่ยนชื่อการ์ด Dashboard ตามที่กำหนด
  if (pendingCard) { const h = pendingCard.querySelector('h3'); if (h) h.textContent = 'Call (รอของเข้า)'; }
  if (successCard) { const h = successCard.querySelector('h3'); if (h) h.textContent = 'Call (ระหว่างขนส่ง)'; }
  if (nawaCard) { const h = nawaCard.querySelector('h3'); if (h) h.textContent = 'Call (เบิกศูนย์อะไหล่)'; }
  if (requestCard) { const h = requestCard.querySelector('h3'); if (h) h.textContent = 'Call (ขอซื้อขอซ่อม)'; }

  // 1. Load from Cache immediately
  const cachedAllData = localStorage.getItem('app_cached_allData');
  const cachedRequestQuantities = localStorage.getItem('app_cached_requestQuantities');
  let loadedFromCache = false;

  if (cachedAllData) {
    try {
      allData = JSON.parse(cachedAllData);
      if (cachedRequestQuantities) {
        requestQuantities = JSON.parse(cachedRequestQuantities);
      }

      // Render immediately with cached data
      filterAndRenderTable();
      updateSyncStatus('success');


      // Ensure listeners attached once
      if (!document.body.dataset.sortListenersAttached) {
        addSortListeners();
        document.body.dataset.sortListenersAttached = 'true';
      }

      loadedFromCache = true;
      console.log("Loaded data from cache.");
    } catch (err) {
      console.warn("Error parsing cache:", err);
    }
  }

  // Show loading only if no cache
  if (!loadedFromCache) {
    showLoading();
  }

  // 2. Background Fetch
  updateSyncStatus('syncing');
  const mainDataPromise = fetch(url, { cache: 'no-store' })
    .then(r => {
      if (!r.ok) throw new Error(`Main sheet fetch failed (${r.status})`);
      return r.json();
    });

  const requestPromise = loadRequestQuantities();
  const poPromise = loadPoQuantities();
  const prPromise = loadPrQuantities();
  const mainSapPromise = loadMainSapData();
  const vipaPromise = loadVipaData();
  const nawaPromise = loadNawaData();
  const plantStockPromise = loadPlantStockData();

  Promise.allSettled([mainDataPromise, requestPromise, poPromise, prPromise, mainSapPromise, vipaPromise, nawaPromise, plantStockPromise])
    .then(results => {
      const [mainRes, reqRes, poRes, prRes, mainSapRes, vipaRes, nawaRes, plantStockRes] = results;
      let dataUpdated = false;

      // Create a set of existing tickets to preserve selection if possible (optional)
      // const previousSelected = new Set(selectedTickets); 

      if (mainRes.status === 'fulfilled') {
        const rawData = mainRes.value || [];
        const normalizedData = rawData.map(row => {
          const material =
            row?.Material ??
            row?.material ??
            row?.MaterialCode ??
            row?.materialcode ??
            row?.Material_Code ??
            row?.Material_code ??
            row?.Mat ??
            row?.mat ??
            row?.Item ??
            row?.item ??
            "";
          if (material) return { ...row, Material: material };
          return row;
        });

        allData = normalizedData;
        // Update Cache
        localStorage.setItem('app_cached_allData', JSON.stringify(allData));
        dataUpdated = true;
      } else {
        console.error('Error fetching main data:', mainRes.reason);
        if (!loadedFromCache) alert('เกิดข้อผิดพลาดในการโหลดข้อมูลหลัก');
        updateSyncStatus('error');
      }

      if (reqRes.status === 'fulfilled') {
        // requestQuantities is already updated by loadRequestQuantities
        localStorage.setItem('app_cached_requestQuantities', JSON.stringify(requestQuantities));
        dataUpdated = true;
      } else {
        console.warn('Request sheet load failed:', reqRes.reason);
        // Non-blocking warning
        updateSyncStatus('error');
      }

      if (mainSapRes.status === 'fulfilled') {
        dataUpdated = true;
      } else {
        console.warn('Main SAP sheet load failed:', mainSapRes.reason);
      }

      if (vipaRes.status === 'fulfilled') {
        dataUpdated = true;
      } else {
        console.warn('Vipa sheet load failed:', vipaRes.reason);
      }

      if (nawaRes.status === 'fulfilled') {
        dataUpdated = true;
      } else {
        console.warn('Nawa sheet load failed:', nawaRes.reason);
      }

      if (plantStockRes.status === 'fulfilled') {
        dataUpdated = true;
      } else {
        console.warn('Plant stock sheet load failed:', plantStockRes.reason);
      }

      if (dataUpdated) {
        // Apply Vipa and Nawa stock data into allData before filtering and rendering
        applyStockDataToAllData(allData);

        // Re-render with fresh data
        filterAndRenderTable();

        if (!document.body.dataset.sortListenersAttached) {
          addSortListeners();
          document.body.dataset.sortListenersAttached = 'true';
        }
        console.log("Background update complete.");
        updateSyncStatus('success');
      }

      hideLoading();
    })
    .catch(err => {
      console.error('Unexpected error loading app:', err);
      hideLoading();
      if (!loadedFromCache) alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      updateSyncStatus('error');
    });

  fetchUpdateDate();
  initTheme();
}
// Initial check on page load
checkLoginStatus();
function canUserOrder() {
  const userUnit = localStorage.getItem('userUnit') || '';
  const allowedUnits = [
    'แผนกคลัง Spare part วิภาวดี 62',
    'แผนกคลังวัตถุดิบ'
  ];
  return allowedUnits.includes(userUnit.trim());
}
