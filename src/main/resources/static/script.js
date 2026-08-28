// =============================================================
// EXPENSE TRACKER - SCRIPT.JS
// =============================================================

// =============================================================
// CONFIGURATION
// =============================================================

const CONFIG = {
    API_BASE = "/api",

    ENDPOINTS: {
        login: "/auth/login",
        register: "/auth/register",
        income: "/incomes",
        expenses: "/expenses",
        categories: "/categories",
        budget: "/budget",
        profile: "/profile"
    }
};
function setDefaultDates() {
    const today = new Date().toISOString().split("T")[0];

    const dateInputs = document.querySelectorAll('input[type="date"]');

    dateInputs.forEach(input => {
        if (!input.value) {
            input.value = today;
        }
    });
}

// =============================================================
// FRONTEND DATA
// =============================================================

let MOCK = {

    user: {
        id: null,
        name: "",
        email: ""
    },
    incomes: [
        {
            id: 1,
            date: "2026-08-01",
            category: "Salary",
            amount: 4200,
            description: "Monthly salary"
        },
        {
            id: 2,
            date: "2026-08-05",
            category: "Freelance",
            amount: 600,
            description: "Project work"
        }
    ],

    // Expenses are loaded from Spring Boot + MySQL
    expenses: [],

    categories: [
        "Food",
        "Travel",
        "Education",
        "Shopping",
        "Medical",
        "Rent",
        "Bills",
        "Other"
    ],

    budget: {
    id: null,
    monthly: 1500
}
};

// =============================================================
// APPLICATION STATE
// =============================================================

let currentPage = "dashboard";
let isLoggedIn = false;
let isRegisterMode = false;

let charts = {
    pie: null,
    bar: null
};

let modalCallback = null;

// =============================================================
// DOM REFERENCES
// =============================================================

const container = document.getElementById("pageContainer");
const pageTitle = document.getElementById("pageTitle");

const modalOverlay = document.getElementById("modalOverlay");
const modalBody = document.getElementById("modalBody");
const modalCancel = document.getElementById("modalCancel");
const modalSave = document.getElementById("modalSave");
const modalTitle = document.getElementById("modalTitle");

const toast = document.getElementById("toast");

const loginOverlay = document.getElementById("loginOverlay");
const loginCard = document.getElementById("loginCard");
const loginError = document.getElementById("loginError");
const switchText = document.getElementById("switchText");

const userNameDisplay = document.getElementById("userNameDisplay");
const logoutBtn = document.getElementById("logoutBtn");

const sidebar = document.getElementById("sidebar");
const mainContent = document.getElementById("mainContent");

// =============================================================
// SAFE ELEMENT CHECK
// =============================================================

function exists(element) {
    return element !== null && element !== undefined;
}

// =============================================================
// TOAST
// =============================================================

function showToast(message, type = "success") {

    if (!exists(toast)) {
        console.log(message);
        return;
    }

    toast.textContent = message;
    toast.className = "toast " + type + " show";

    clearTimeout(toast._timer);

    toast._timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// =============================================================
// ID GENERATOR
// =============================================================

function generateId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

// =============================================================
// AMOUNT VALIDATION
// =============================================================

function validateAmount(value) {

    const amount = Number(value);

    return Number.isFinite(amount) && amount > 0;
}

// =============================================================
// ESCAPE HTML
// =============================================================

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// =============================================================
// FORMAT MONEY
// =============================================================

function formatMoney(value) {

    const amount = Number(value) || 0;

    return "₹" + amount.toFixed(2);
}


// =============================================================
// MONTHLY INCOME HELPER
// =============================================================

function getCurrentMonthKey() {

    const today = new Date();

    const year = today.getFullYear();

    const month =
        String(today.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
}
function checkMonthlyIncomeReminder() {

    const currentMonth = getCurrentMonthKey();

    const hasIncome = MOCK.incomes.some(income =>
        income.date &&
        String(income.date).startsWith(currentMonth)
    );

    if (!hasIncome) {
        showToast(
            "🔔 Reminder: Please add your monthly income!",
            "error"
        );
    }
}


// =============================================================
// CALCULATE CURRENT MONTH INCOME
// =============================================================

function calculateMonthlyIncome(incomes = MOCK.incomes) {

    const currentMonth =
        getCurrentMonthKey();

    return incomes
        .filter(income => {

            if (!income.date) {
                return false;
            }

            return income.date.startsWith(
                currentMonth
            );

        })
        .reduce(
            (sum, income) =>
                sum + Number(income.amount || 0),
            0
        );
}

// =============================================================
// API REQUEST HELPER
// =============================================================

async function apiRequest(endpoint, options = {}) {

    try {

        const response = await fetch(
            CONFIG.API_BASE + endpoint,
            {
                ...options,

                headers: {
                    "Content-Type": "application/json",
                    ...(options.headers || {})
                }
            }
        );

        const contentType =
            response.headers.get("content-type") || "";

        let data = null;

        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {

            let message = `HTTP ${response.status}`;

            if (
                typeof data === "object" &&
                data?.message
            ) {
                message = data.message;

            } else if (
                typeof data === "string" &&
                data.trim()
            ) {
                message = data;
            }

            throw new Error(message);
        }

        return data;

    } catch (error) {

        console.error(
            "API Request Failed:",
            CONFIG.API_BASE + endpoint,
            error
        );

        throw error;
    }
}

// =============================================================
// UPDATE LOGIN UI
// =============================================================

function updateUIForLoginState() {

    if (isLoggedIn) {

        if (exists(sidebar)) {
            sidebar.classList.remove("hidden-sidebar");
        }

        if (exists(mainContent)) {
            mainContent.classList.remove("blurred");
        }

        if (exists(loginOverlay)) {
            loginOverlay.classList.add("hidden");
        }

        if (exists(userNameDisplay)) {
            userNameDisplay.textContent =
                MOCK.user.name || "User";
        }

    } else {

        if (exists(sidebar)) {
            sidebar.classList.add("hidden-sidebar");
        }

        if (exists(mainContent)) {
            mainContent.classList.add("blurred");
        }

        if (exists(loginOverlay)) {
            loginOverlay.classList.remove("hidden");
        }

        if (exists(userNameDisplay)) {
            userNameDisplay.textContent = "Guest";
        }

        if (exists(container)) {
            container.innerHTML = "";
        }

        if (exists(pageTitle)) {
            pageTitle.textContent = "Dashboard";
        }

        destroyCharts();
    }
}

// =============================================================
// DESTROY CHARTS
// =============================================================

function destroyCharts() {

    if (charts.pie) {
        charts.pie.destroy();
        charts.pie = null;
    }

    if (charts.bar) {
        charts.bar.destroy();
        charts.bar = null;
    }
}

// =============================================================
// LOGIN
// =============================================================

async function handleLogin() {

    const emailElement =
        document.getElementById("loginEmail");

    const passwordElement =
        document.getElementById("loginPassword");

    if (!emailElement || !passwordElement) {

        showToast(
            "Login form not found",
            "error"
        );

        return;
    }

    const email =
        emailElement.value.trim();

    const password =
        passwordElement.value.trim();

    // ---------------------------------------------------------
    // FRONTEND VALIDATION
    // ---------------------------------------------------------

    if (!email || !password) {

        showLoginError(
            "Please fill in all fields"
        );

        return;
    }

    if (!email.includes("@")) {

        showLoginError(
            "Please enter a valid email"
        );

        return;
    }

    hideLoginError();

    // ---------------------------------------------------------
    // LOGIN THROUGH SPRING BOOT + MYSQL
    // ---------------------------------------------------------

    try {

        const response =
            await apiRequest(
                CONFIG.ENDPOINTS.login,
                {
                    method: "POST",

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );

        console.log(
            "Login response:",
            response
        );

        // -----------------------------------------------------
        // LOGIN SUCCESS
        // -----------------------------------------------------

        MOCK.user.name =
            response.name || "User";

        MOCK.user.email =
            response.email || email;

        MOCK.user.id =
            response.id;

        // SAVE USER ID FOR REPORTS AND OTHER FEATURES
        localStorage.setItem(
            "userId",
            response.id
        );

        isLoggedIn = true;

        updateUIForLoginState();

        showToast(
            "Welcome back, " +
            MOCK.user.name +
            "!"
        );

        // Load expenses from MySQL
        await fetchExpenses();

        await fetchIncome();

        checkMonthlyIncomeNotification();

        await loadBudget();

        navigateTo("dashboard");

    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );

        isLoggedIn = false;

        showLoginError(
            error.message ||
            "Invalid email or password"
        );

        showToast(
            "Login failed",
            "error"
        );
    }
}

// =============================================================
// REGISTER
// =============================================================

async function handleRegister() {

    const nameElement =
        document.getElementById("regName");

    const emailElement =
        document.getElementById("regEmail");

    const passwordElement =
        document.getElementById("regPassword");

    const confirmElement =
        document.getElementById("regConfirm");

    if (
        !nameElement ||
        !emailElement ||
        !passwordElement ||
        !confirmElement
    ) {

        showToast(
            "Registration form not found",
            "error"
        );

        return;
    }

    const name =
        nameElement.value.trim();

    const email =
        emailElement.value.trim();

    const password =
        passwordElement.value;

    const confirmPassword =
        confirmElement.value;

    if (
        !name ||
        !email ||
        !password ||
        !confirmPassword
    ) {

        showLoginError(
            "All fields are required"
        );

        return;
    }

    if (!email.includes("@")) {

        showLoginError(
            "Enter a valid email"
        );

        return;
    }

    if (password.length < 6) {

        showLoginError(
            "Password must contain at least 6 characters"
        );

        return;
    }

    if (password !== confirmPassword) {

        showLoginError(
            "Passwords do not match"
        );

        return;
    }

    hideLoginError();

    // ---------------------------------------------------------
    // REGISTER THROUGH SPRING BOOT + MYSQL
    // ---------------------------------------------------------

    try {

        const response =
            await apiRequest(
                CONFIG.ENDPOINTS.register,
                {
                    method: "POST",

                    body: JSON.stringify({
                        name: name,
                        email: email,
                        password: password
                    })
                }
            );

        console.log(
            "Register response:",
            response
        );

        MOCK.user.name =
            response.name || name;

        MOCK.user.email =
            response.email || email;
            MOCK.user.id =
    response.id;

        isLoggedIn = true;

        updateUIForLoginState();

        showToast(
            "Account created! Welcome " +
            MOCK.user.name
        );

        await fetchExpenses();
await fetchIncome();
await loadBudget();

navigateTo("dashboard");

    } catch (error) {

        console.error(
            "REGISTER ERROR:",
            error
        );

        showLoginError(
            error.message ||
            "Registration failed"
        );

        showToast(
            "Registration failed",
            "error"
        );
    }
}

// =============================================================
// LOGIN ERROR
// =============================================================

function showLoginError(message) {

    if (!exists(loginError)) {

        showToast(
            message,
            "error"
        );

        return;
    }

    loginError.textContent = message;
    loginError.classList.add("show");
}

function hideLoginError() {

    if (exists(loginError)) {
        loginError.classList.remove("show");
    }
}

// =============================================================
// SWITCH LOGIN / REGISTER
// =============================================================

function switchLoginRegister(event) {

    if (event) {
        event.preventDefault();
    }

    isRegisterMode = !isRegisterMode;

    if (exists(loginCard)) {

        loginCard.classList.toggle(
            "show-register",
            isRegisterMode
        );
    }

    if (exists(switchText)) {

        if (isRegisterMode) {

            switchText.innerHTML =
                'Already have an account? ' +
                '<a href="#" id="switchLink">Log in</a>';

        } else {

            switchText.innerHTML =
                "Don't have an account? " +
                '<a href="#" id="switchLink">Sign up</a>';
        }
    }

    hideLoginError();
}

// =============================================================
// SWITCH LINK
// =============================================================

if (exists(switchText)) {

    switchText.addEventListener(
        "click",
        function (event) {

            if (
                event.target &&
                event.target.id === "switchLink"
            ) {

                switchLoginRegister(event);
            }
        }
    );
}

// =============================================================
// LOGIN BUTTON
// =============================================================

const loginBtn =
    document.getElementById("loginBtn");

if (exists(loginBtn)) {

    loginBtn.addEventListener(
        "click",
        handleLogin
    );
}

// =============================================================
// REGISTER BUTTON
// =============================================================

const registerBtn =
    document.getElementById("registerBtn");

if (exists(registerBtn)) {

    registerBtn.addEventListener(
        "click",
        handleRegister
    );
}

// =============================================================
// ENTER KEY
// =============================================================

document
    .querySelectorAll("#loginOverlay input")
    .forEach(function (input) {

        input.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {

                    if (isRegisterMode) {
                        handleRegister();
                    } else {
                        handleLogin();
                    }
                }
            }
        );
    });

// =============================================================
// LOGOUT
// =============================================================

function performLogout() {

    isLoggedIn = false;
    currentPage = "dashboard";

    destroyCharts();

    updateUIForLoginState();

    if (exists(loginCard)) {

        loginCard.classList.remove(
            "show-register"
        );
    }

    isRegisterMode = false;

    if (exists(switchText)) {

        switchText.innerHTML =
            "Don't have an account? " +
            '<a href="#" id="switchLink">Sign up</a>';
    }

    hideLoginError();

    showToast(
        "Logout successful!"
    );
}

if (exists(logoutBtn)) {

    logoutBtn.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            event.stopPropagation();

            performLogout();
        }
    );
}

// =============================================================
// SIDEBAR NAVIGATION
// =============================================================

document
    .querySelectorAll(".sidebar nav a[data-page]")
    .forEach(function (link) {

        link.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                if (!isLoggedIn) {

                    showToast(
                        "Please login first",
                        "error"
                    );

                    return;
                }

                navigateTo(
                    this.dataset.page
                );
            }
        );
    });

// =============================================================
// NAVIGATE
// =============================================================

function navigateTo(page) {

    if (!isLoggedIn) {
        return;
    }

    currentPage = page;

    document
        .querySelectorAll(
            ".sidebar nav a[data-page]"
        )
        .forEach(function (link) {

            link.classList.remove("active");
        });

    const activeLink =
        document.querySelector(
            '.sidebar nav a[data-page="' +
            page +
            '"]'
        );

    if (activeLink) {
        activeLink.classList.add("active");
    }

    if (exists(pageTitle)) {

        pageTitle.textContent =
            page.charAt(0).toUpperCase() +
            page.slice(1);
    }
console.log("NAVIGATING TO:", page);
    renderPage(page);

}

// =============================================================
// PAGE RENDERER
// =============================================================


function renderPage(page) {

    switch (page) {

        case "dashboard":
            renderDashboard();
            break;

        case "income":
            renderIncome();
            break;

        case "expenses":
            renderExpenses();
            break;

        case "categories":
            renderCategories();
            break;

        case "budget":
            console.log("BUDGET CASE CALLED");
            loadBudget();
            break;

        case "reports":
            renderReports();
            break;

        case "profile":
            renderProfile();
            break;

        default:

            container.innerHTML =
                "<p>Page not found.</p>";
    }
}

// =============================================================
// DASHBOARD
// =============================================================

async function renderDashboard() {

    try {

        const [incomeResponse, expenseResponse] =
    await Promise.all([
        fetch(`${CONFIG.API_BASE}/incomes?userId=${MOCK.user.id}`),
        fetch(`${CONFIG.API_BASE}/expenses?userId=${MOCK.user.id}`)
    ]);
        if (!incomeResponse.ok || !expenseResponse.ok) {
            throw new Error("Failed to fetch dashboard data");
        }

        const incomes = await incomeResponse.json();
        const expenses = await expenseResponse.json();

        console.log("DASHBOARD INCOMES:", incomes);
        console.log("DASHBOARD EXPENSES:", expenses);

        // =====================================================
        // ALL TIME TOTALS
        // =====================================================

        const totalIncome =
            incomes.reduce(
                (sum, income) =>
                    sum + Number(income.amount || 0),
                0
            );

        const totalExpense =
            expenses.reduce(
                (sum, expense) =>
                    sum + Number(expense.amount || 0),
                0
            );

        const totalBalance =
            totalIncome - totalExpense;


        // =====================================================
        // CREATE AVAILABLE MONTHS
        // =====================================================

        const monthKeys = new Set();

        incomes.forEach(income => {

            if (income.date) {
                monthKeys.add(
                    String(income.date).substring(0, 7)
                );
            }

        });

        expenses.forEach(expense => {

            if (expense.date) {
                monthKeys.add(
                    String(expense.date).substring(0, 7)
                );
            }

        });


        // Current month always available
        const today = new Date();

        const currentMonthKey =
            `${today.getFullYear()}-${String(
                today.getMonth() + 1
            ).padStart(2, "0")}`;

        monthKeys.add(currentMonthKey);


        // Sort newest month first
        const availableMonths =
            Array.from(monthKeys).sort().reverse();


        // =====================================================
        // SELECTED MONTH
        // =====================================================

        if (
            !window.selectedDashboardMonth ||
            !monthKeys.has(window.selectedDashboardMonth)
        ) {

            window.selectedDashboardMonth =
                currentMonthKey;

        }

        const selectedMonth =
            window.selectedDashboardMonth;


        // =====================================================
        // MONTH NAME
        // =====================================================

        const [selectedYear, selectedMonthNumber] =
            selectedMonth.split("-");

        const selectedDate =
            new Date(
                Number(selectedYear),
                Number(selectedMonthNumber) - 1,
                1
            );

        const monthName =
            selectedDate.toLocaleString(
                "en-US",
                {
                    month: "long"
                }
            );


        // =====================================================
        // MONTHLY INCOME
        // =====================================================

        const monthlyIncome =
            incomes
                .filter(income => {

                    return (
                        String(income.date)
                            .substring(0, 7) ===
                        selectedMonth
                    );

                })
                .reduce(
                    (sum, income) =>
                        sum + Number(income.amount || 0),
                    0
                );


        // =====================================================
        // MONTHLY EXPENSE
        // =====================================================

        const monthlyExpense =
            expenses
                .filter(expense => {

                    return (
                        String(expense.date)
                            .substring(0, 7) ===
                        selectedMonth
                    );

                })
                .reduce(
                    (sum, expense) =>
                        sum + Number(expense.amount || 0),
                    0
                );


        // =====================================================
        // MONTHLY BALANCE
        // =====================================================

        const monthlyBalance =
            monthlyIncome - monthlyExpense;


        // =====================================================
        // MONTHLY BUDGET
        // =====================================================

        const monthlyBudget =
            Number(MOCK.budget.monthly || 0);


        const remainingBudget =
            monthlyBudget - monthlyExpense;


        // =====================================================
        // MONTHLY TRANSACTIONS
        // =====================================================

        const monthlyTransactions = [

            ...incomes
                .filter(income =>
                    String(income.date)
                        .substring(0, 7) ===
                    selectedMonth
                )
                .map(income => ({
                    ...income,
                    type: "Income"
                })),

            ...expenses
                .filter(expense =>
                    String(expense.date)
                        .substring(0, 7) ===
                    selectedMonth
                )
                .map(expense => ({
                    ...expense,
                    type: "Expense"
                }))

        ];


        monthlyTransactions.sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        );


        // =====================================================
        // DEBUG
        // =====================================================

        console.log(
            "SELECTED MONTH:",
            selectedMonth
        );

        console.log(
            "MONTHLY INCOME:",
            monthlyIncome
        );

        console.log(
            "MONTHLY EXPENSE:",
            monthlyExpense
        );

        console.log(
            "MONTHLY BALANCE:",
            monthlyBalance
        );

        console.log(
            "TOTAL INCOME:",
            totalIncome
        );

        console.log(
            "TOTAL EXPENSE:",
            totalExpense
        );


        // =====================================================
        // DASHBOARD UI
        // =====================================================

        container.innerHTML = `

            <!-- MONTH SELECTOR -->

            <div class="table-wrapper">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:20px;
                    flex-wrap:wrap;
                ">

                    <div>

                        <h3 style="margin-bottom:5px;">
                            ${monthName} ${selectedYear}
                        </h3>

                        <p style="margin:0;">
                            Monthly Financial Summary
                        </p>

                    </div>


                    <div>

                        <label
                            for="dashboardMonth"
                            style="
                                font-weight:600;
                                margin-right:8px;
                            "
                        >
                            Select Month:
                        </label>

                        <select
                            id="dashboardMonth"
                            onchange="changeDashboardMonth(this.value)"
                            style="
                                padding:10px;
                                border-radius:8px;
                                border:1px solid #ddd;
                                font-size:14px;
                            "
                        >

                            ${
                                availableMonths
                                    .map(monthKey => {

                                        const [year, month] =
                                            monthKey.split("-");

                                        const date =
                                            new Date(
                                                Number(year),
                                                Number(month) - 1,
                                                1
                                            );

                                        const label =
                                            date.toLocaleString(
                                                "en-US",
                                                {
                                                    month: "long",
                                                    year: "numeric"
                                                }
                                            );

                                        return `
                                            <option
                                                value="${monthKey}"
                                                ${
                                                    monthKey === selectedMonth
                                                        ? "selected"
                                                        : ""
                                                }
                                            >
                                                ${label}
                                            </option>
                                        `;

                                    })
                                    .join("")
                            }

                        </select>

                    </div>

                </div>

            </div>


            <!-- SUMMARY CARDS -->

            <div class="cards">


                <!-- THIS MONTH INCOME -->

                <div class="card income">

                    <div class="label">
                        This Month Income
                    </div>

                    <div class="value">
                        ${formatMoney(monthlyIncome)}
                    </div>

                </div>


                <!-- THIS MONTH EXPENSE -->

                <div class="card expense">

                    <div class="label">
                        This Month Expense
                    </div>

                    <div class="value">
                        ${formatMoney(monthlyExpense)}
                    </div>

                </div>


                <!-- THIS MONTH BALANCE -->

                <div class="card">

                    <div class="label">
                        This Month Balance
                    </div>

                    <div class="value">
                        ${formatMoney(monthlyBalance)}
                    </div>

                </div>


                <!-- TOTAL INCOME -->

                <div class="card income">

                    <div class="label">
                        Total Income
                    </div>

                    <div class="value">
                        ${formatMoney(totalIncome)}
                    </div>

                </div>


                <!-- TOTAL EXPENSE -->

                <div class="card expense">

                    <div class="label">
                        Total Expenses
                    </div>

                    <div class="value">
                        ${formatMoney(totalExpense)}
                    </div>

                </div>


                <!-- TOTAL BALANCE -->

                <div class="card">

                    <div class="label">
                        Total Balance
                    </div>

                    <div class="value">
                        ${formatMoney(totalBalance)}
                    </div>

                </div>


                <!-- MONTHLY BUDGET -->

                <div class="card budget">

                    <div class="label">
                        Monthly Budget
                    </div>

                    <div class="value">
                        ${formatMoney(monthlyBudget)}
                    </div>

                </div>


                <!-- REMAINING BUDGET -->

                <div class="card">

                    <div class="label">
                        Remaining Budget
                    </div>

                    <div class="value">
                        ${formatMoney(remainingBudget)}
                    </div>

                </div>

            </div>


            <!-- QUICK ACTIONS -->

            <div class="quick-actions">

                <button
                    class="btn btn-success"
                    onclick="quickAdd('income')"
                >

                    <i class="fas fa-plus"></i>
                    Add Income

                </button>


                <button
                    class="btn btn-danger"
                    onclick="quickAdd('expense')"
                >

                    <i class="fas fa-plus"></i>
                    Add Expense

                </button>


                <button
                    class="btn btn-primary"
                    onclick="quickBudget()"
                >

                    <i class="fas fa-edit"></i>
                    Set Budget

                </button>

            </div>


            <!-- MONTHLY TRANSACTIONS -->

            <div class="table-wrapper">

                <h4>
                    ${monthName} ${selectedYear} Transactions
                </h4>

                <table>

                    <thead>

                        <tr>

                            <th>Date</th>
                            <th>Type</th>
                            <th>Category</th>
                            <th>Amount</th>

                        </tr>

                    </thead>


                    <tbody>

                        ${
                            monthlyTransactions.length === 0

                                ? `

                                    <tr>

                                        <td colspan="4">
                                            No transactions found for
                                            ${monthName} ${selectedYear}
                                        </td>

                                    </tr>

                                `

                                :

                                monthlyTransactions
                                    .map(transaction => {

                                        const typeClass =
                                            transaction.type === "Income"
                                                ? "income"
                                                : "expense";

                                        return `

                                            <tr>

                                                <td>
                                                    ${escapeHTML(
                                                        transaction.date
                                                    )}
                                                </td>


                                                <td>

                                                    <span
                                                        class="badge ${typeClass}"
                                                    >
                                                        ${transaction.type}
                                                    </span>

                                                </td>


                                                <td>
                                                    ${escapeHTML(
                                                        transaction.category || "-"
                                                    )}
                                                </td>


                                                <td>
                                                    ${formatMoney(
                                                        transaction.amount
                                                    )}
                                                </td>

                                            </tr>

                                        `;

                                    })
                                    .join("")

                        }

                    </tbody>

                </table>

            </div>

        `;

    }

    catch (error) {

        console.error(
            "Dashboard Error:",
            error
        );

        container.innerHTML = `

            <div class="error-message">

                Failed to load dashboard data.

            </div>

        `;

    }


}
function changeDashboardMonth(month) {

    window.selectedDashboardMonth = month;

    renderDashboard();

}

/// =============================================================
// INCOME PAGE - SPRING BOOT + MYSQL
// =============================================================

async function renderIncome() {

    container.innerHTML = `

        <div class="grid-2">

            <!-- ADD INCOME FORM -->

            <div class="form-card">

                <h4>Add Income</h4>

                <div class="form-group">

                    <label>Amount (₹)</label>

                    <input
                        type="number"
                        id="incAmount"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                    >

                </div>

                <div class="form-group">

                    <label>Source</label>

                    <input
                        type="text"
                        id="incSource"
                        placeholder="Salary, Freelance..."
                    >

                </div>

                <div class="form-group">

                    <label>Date</label>

                    <input
                        type="date"
                        id="incDate"
                    >

                </div>

                <button
                    type="button"
                    class="btn btn-success"
                    id="addIncomeBtn"
                >

                    <i class="fas fa-plus"></i>

                    Add Income

                </button>

                <button
                    type="button"
                    class="btn btn-outline"
                    id="clearIncomeBtn"
                >

                    Clear

                </button>

            </div>


            <!-- INCOME LIST -->

            <div class="table-wrapper">

                <h4>Income List</h4>

                <table>

                    <thead>

                        <tr>

                            <th>Date</th>

                            <th>Source</th>

                            <th>Amount</th>

                            <th>Action</th>

                        </tr>

                    </thead>

                    <tbody id="incomeTableBody">

                        <tr>

                            <td
                                colspan="4"
                                style="text-align:center;"
                            >

                                Loading income...

                            </td>

                        </tr>

                    </tbody>

                </table>

            </div>

        </div>
    `;

    setDefaultDates();

    const addButton =
        document.getElementById("addIncomeBtn");

    const clearButton =
        document.getElementById("clearIncomeBtn");

    if (addButton) {

        addButton.addEventListener(
            "click",
            addIncome
        );

    }

   if (clearButton) {
    clearButton.addEventListener("click", () => {

        document.getElementById("incAmount").value = "";
        document.getElementById("incSource").value = "";
        document.getElementById("incDate").value = "";

    });
}

    // Load income from MySQL
    await fetchIncome();
}


// =============================================================
// FETCH INCOME FROM SPRING BOOT + MYSQL
// =============================================================

async function fetchIncome() {

    if (!MOCK.user.id) {
    showToast(
        "User not logged in",
        "error"
    );
    return;
}
    try {

        console.log(
            "Fetching income from:",
            CONFIG.API_BASE +
            CONFIG.ENDPOINTS.income
        );

        const data =
    await apiRequest(
        CONFIG.ENDPOINTS.income +
        "?userId=" +
        MOCK.user.id
    );

        console.log(
            "Income backend response:",
            data
        );

        if (!Array.isArray(data)) {

            throw new Error(
                "Backend did not return an array"
            );

        }

        // Convert backend Income object
        // into frontend format

        MOCK.incomes =
            data.map(income => ({

                id: income.id,

                amount:
                    Number(income.amount) || 0,

                source:
                    income.source || "",

                date:
                    income.date || ""

            }));

        console.log(
            "Income loaded:",
            MOCK.incomes
        );

        renderIncomeTable(
            MOCK.incomes
        );

        // Refresh dashboard/reports
        if (currentPage === "dashboard") {

            renderDashboard();

        }

        if (currentPage === "reports") {

            renderReports();

        }

    } catch (error) {

        console.error(
            "FETCH INCOME ERROR:",
            error
        );

        showToast(
            "Unable to load income: " +
            error.message,
            "error"
        );

        const tableBody =
            document.getElementById(
                "incomeTableBody"
            );

        if (tableBody) {

            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="4"
                        style="
                            text-align:center;
                            color:#e53935;
                        "
                    >

                        Failed to load income.

                        <br><br>

                        <small>
                            ${escapeHTML(
                                error.message
                            )}
                        </small>

                    </td>

                </tr>

            `;

        }

    }

}


// =============================================================
// RENDER INCOME TABLE
// =============================================================

function renderIncomeTable(incomes) {

    const tableBody =
        document.getElementById(
            "incomeTableBody"
        );

    if (!tableBody) {

        return;

    }

    if (
        !Array.isArray(incomes) ||
        incomes.length === 0
    ) {

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="4"
                    style="text-align:center;"
                >

                    No income found.

                </td>

            </tr>

        `;

        return;

    }

    tableBody.innerHTML =
        incomes
            .map(income => `

                <tr>

                    <td>

                        ${escapeHTML(
                            income.date
                        )}

                    </td>

                    <td>

                        ${escapeHTML(
                            income.source
                        )}

                    </td>

                    <td>

                        ${formatMoney(
                            income.amount
                        )}

                    </td>

                    <td>

                        <button
                            type="button"
                            class="btn btn-danger"
                            onclick="deleteIncome(${income.id})"
                            title="Delete Income"
                        >

                            <i class="fas fa-trash"></i>

                        </button>

                    </td>

                </tr>

            `)
            .join("");

}


// =============================================================
// ADD INCOME - SPRING BOOT + MYSQL
// =============================================================

async function addIncome() {

    const amountElement =
        document.getElementById(
            "incAmount"
        );

    const sourceElement =
        document.getElementById(
            "incSource"
        );

    const dateElement =
        document.getElementById(
            "incDate"
        );


    if (
        !amountElement ||
        !sourceElement ||
        !dateElement
    ) {

        showToast(
            "Income form not found",
            "error"
        );

        return;

    }


    const amount =
        Number(
            amountElement.value
        );

    const source =
        sourceElement.value.trim();

    const date =
        dateElement.value;


    // Validation

    if (!validateAmount(amount)) {

        showToast(
            "Please enter a valid amount",
            "error"
        );

        return;

    }

    if (!source) {

        showToast(
            "Income source is required",
            "error"
        );

        return;

    }

    if (!date) {

        showToast(
            "Date is required",
            "error"
        );

        return;

    }


    // Object matching Income.java

    const incomeData = {

        source: source,

        amount: amount,

        date: date

    };


    console.log(
        "Sending income to Spring Boot:",
        incomeData
    );
    if (!MOCK.user.id) {
    showToast(
        "User not logged in",
        "error"
    );
    return;
}


    try {

        const savedIncome =
    await apiRequest(
        CONFIG.ENDPOINTS.income +
        "?userId=" +
        MOCK.user.id,
        {
            method: "POST",

            body:
                JSON.stringify(
                    incomeData
                )
        }
    );

        console.log(
            "Saved income:",
            savedIncome
        );


        // Clear form

        amountElement.value = "";

        sourceElement.value = "";

        setDefaultDates();


        // Reload from MySQL

        await fetchIncome();


        showToast(
            "Income added successfully"
        );


    } catch (error) {

        console.error(
            "ADD INCOME ERROR:",
            error
        );

        showToast(
            "Failed to add income: " +
            error.message,
            "error"
        );

    }

}


// =============================================================
// DELETE INCOME - SPRING BOOT + MYSQL
// =============================================================

window.deleteIncome = async function (id) {

    if (!id) {
        showToast(
            "Invalid income ID",
            "error"
        );
        return;
    }

    if (!MOCK.user.id) {
        showToast(
            "User not logged in",
            "error"
        );
        return;
    }

    const confirmed =
        confirm(
            "Are you sure you want to delete this income?"
        );

    if (!confirmed) {
        return;
    }

    try {

        console.log(
            "Deleting income:",
            id,
            "for user:",
            MOCK.user.id
        );

        await apiRequest(
            CONFIG.ENDPOINTS.income +
            "/" +
            id +
            "?userId=" +
            MOCK.user.id,
            {
                method: "DELETE"
            }
        );

        console.log(
            "Income deleted:",
            id
        );

        await fetchIncome();

        showToast(
            "Income deleted successfully"
        );

    } catch (error) {

        console.error(
            "DELETE INCOME ERROR:",
            error
        );

        showToast(
            "Failed to delete income: " +
            error.message,
            "error"
        );
    }

};

// =============================================================
// EXPENSE PAGE - SPRING BOOT + MYSQL
// =============================================================

async function renderExpenses() {

    container.innerHTML = `

        <div class="grid-2">

            <div class="form-card">

                <h4>Add Expense</h4>

                <div class="form-group">

                    <label>Amount (₹)</label>

                    <input
                        type="number"
                        id="expAmount"
                        min="0.01"
                        step="0.01"
                        placeholder="Enter amount"
                    >

                </div>

                <div class="form-group">

                    <label>Category</label>

                    <input
                        type="text"
                        id="expCategory"
                        placeholder="Food, Travel, Education..."
                    >

                </div>

                <div class="form-group">

                    <label>Date</label>

                    <input
                        type="date"
                        id="expDate"
                    >

                </div>

                <div class="form-group">

                    <label>Description</label>

                    <input
                        type="text"
                        id="expDesc"
                        placeholder="Optional description"
                    >

                </div>

                <button
                    type="button"
                    class="btn btn-danger"
                    id="addExpenseBtn"
                >
                    <i class="fas fa-plus"></i>
                    Add Expense
                </button>

                <button
                    type="button"
                    class="btn btn-outline"
                    id="clearExpBtn"
                >
                    Clear
                </button>

            </div>

            <div
                class="table-wrapper"
                style="margin:0;"
            >

                <h4 style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:10px;
                ">

                    <span>Expense List</span>

                    <input
                        type="text"
                        id="expSearch"
                        placeholder="Search..."
                        style="width:150px;"
                    >

                </h4>

                <table id="expenseTable">

                    <thead>

                        <tr>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Description</th>
                            <th>Action</th>
                        </tr>

                    </thead>

                    <tbody id="expenseTableBody">

                        <tr>

                            <td
                                colspan="5"
                                style="text-align:center;"
                            >
                                Loading expenses...
                            </td>

                        </tr>

                    </tbody>

                </table>

            </div>

        </div>
    `;

    setDefaultDates();

    const addExpenseBtn =
        document.getElementById("addExpenseBtn");

    const clearExpBtn =
        document.getElementById("clearExpBtn");

    const expSearch =
        document.getElementById("expSearch");

    if (addExpenseBtn) {
        addExpenseBtn.addEventListener(
            "click",
            addExpense
        );
    }

    if (clearExpBtn) {
    clearExpBtn.addEventListener("click", () => {
        document.getElementById("expAmount").value = "";
        document.getElementById("expCategory").value = "";
        document.getElementById("expDate").value = "";
        document.getElementById("expDesc").value = "";
    });
}
    if (expSearch) {
        expSearch.addEventListener(
            "input",
            searchExpenses
        );
    }

    await fetchExpenses();
}

// =============================================================
// FETCH EXPENSES
// =============================================================

// =============================================================
// FETCH EXPENSES
// =============================================================

async function fetchExpenses() {

    try {

        if (!MOCK.user.id) {
            throw new Error("User is not logged in");
        }

        console.log(
            "Fetching expenses for user:",
            MOCK.user.id
        );

        const data = await apiRequest(
            CONFIG.ENDPOINTS.expenses +
            "?userId=" +
            MOCK.user.id
        );

        console.log(
            "EXPENSE API DATA:",
            data
        );

        if (!Array.isArray(data)) {

            throw new Error(
                "Backend did not return an array"
            );
        }

        MOCK.expenses =
            data.map(expense => ({

                id: expense.id,

                amount:
                    Number(expense.amount) || 0,

                category:
                    expense.category || "Other",

                date:
                    expense.date || "",

                description:
                    expense.title || ""
            }));

        console.log(
            "Expenses loaded:",
            MOCK.expenses
        );

        if (currentPage === "expenses") {

            renderExpenseTable(
                MOCK.expenses
            );
        }

        if (currentPage === "dashboard") {

            renderDashboard();
        }

        if (currentPage === "reports") {

            renderReports();
        }

    } catch (error) {

        console.error(
            "FETCH EXPENSE ERROR:",
            error
        );

        showToast(
            "Unable to load expenses: " +
            error.message,
            "error"
        );

        const tableBody =
            document.getElementById(
                "expenseTableBody"
            );

        if (tableBody) {

            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="5"
                        style="
                            text-align:center;
                            color:#e53935;
                        "
                    >

                        Failed to load expenses.

                        <br><br>

                        <small>
                            ${escapeHTML(
                                error.message
                            )}
                        </small>

                    </td>

                </tr>
            `;
        }
    }
}

// =============================================================
// RENDER EXPENSE TABLE
// =============================================================

function renderExpenseTable(expenses) {

    const tableBody =
        document.getElementById(
            "expenseTableBody"
        );

    if (!tableBody) {
        return;
    }

    if (
        !Array.isArray(expenses) ||
        expenses.length === 0
    ) {

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    style="text-align:center;"
                >
                    No expenses found.
                </td>

            </tr>
        `;

        return;
    }

    tableBody.innerHTML =
        expenses
            .map(expense => `

                <tr>

                    <td>
                        ${escapeHTML(
                            expense.date
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            expense.category
                        )}
                    </td>

                    <td>
                        ${formatMoney(
                            expense.amount
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            expense.description
                        )}
                    </td>

                    <td>

                        <button
                            type="button"
                            class="btn btn-danger"
                            onclick="deleteExpense(${expense.id})"
                            title="Delete Expense"
                        >

                            <i class="fas fa-trash"></i>

                        </button>

                    </td>

                </tr>
            `)
            .join("");
}
// =============================================================
// FETCH BUDGET FROM BACKEND
// =============================================================

async function loadBudget() {

    try {

        console.log(
            "Fetching budget from:",
            CONFIG.API_BASE +
            CONFIG.ENDPOINTS.budget
        );

        const data =
    await apiRequest(
        CONFIG.ENDPOINTS.budget +
        "?userId=" +
        MOCK.user.id
    );

        console.log(
            "Budget backend response:",
            data
        );

        if (!Array.isArray(data)) {

            throw new Error(
                "Backend did not return an array"
            );
        }

        if (data.length > 0) {

            const latestBudget =
                data[data.length - 1];
MOCK.budget.id = latestBudget.id;
            MOCK.budget.monthly =
                Number(
                    latestBudget.amount
                ) || 0;

            console.log(
                "Budget loaded:",
                MOCK.budget.monthly
            );
        }

        
           if (currentPage === "budget") {
    renderBudget();
}

if (currentPage === "dashboard") {
    renderDashboard();
}

if (currentPage === "reports") {
    renderReports();
}
    } catch (error) {

        console.error(
            "FETCH BUDGET ERROR:",
            error
        );

        showToast(
            "Unable to load budget: " +
            error.message,
            "error"
        );
    }
}
// =============================================================
// ADD EXPENSE
// =============================================================

async function addExpense() {

    const amountElement =
        document.getElementById(
            "expAmount"
        );

    const categoryElement =
        document.getElementById(
            "expCategory"
        );

    const dateElement =
        document.getElementById(
            "expDate"
        );

    const descriptionElement =
        document.getElementById(
            "expDesc"
        );

    if (
        !amountElement ||
        !categoryElement ||
        !dateElement ||
        !descriptionElement
    ) {

        showToast(
            "Expense form not found",
            "error"
        );

        return;
    }

    const amount =
        Number(
            amountElement.value
        );

    const category =
        categoryElement.value.trim();

    const date =
        dateElement.value;

    const description =
        descriptionElement.value.trim();

    if (!validateAmount(amount)) {

        showToast(
            "Enter a valid positive amount",
            "error"
        );

        return;
    }

    if (!category) {

        showToast(
            "Category is required",
            "error"
        );

        return;
    }

    if (!date) {

        showToast(
            "Date is required",
            "error"
        );

        return;
    }

    const expenseData = {

        title: description,

        amount: amount,

        category: category,

        date: date
    };

    console.log(
        "Sending to Spring Boot:",
        expenseData
    );

    try {

       const savedExpense =
    await apiRequest(
        CONFIG.ENDPOINTS.expenses +
        "?userId=" +
        MOCK.user.id,
        {
            method: "POST",

            body:
                JSON.stringify(
                    expenseData
                )
        }
    );

        console.log(
            "Saved expense:",
            savedExpense
        );

        amountElement.value = "";
        categoryElement.value = "";
        descriptionElement.value = "";

        setDefaultDates();

        await fetchExpenses();

        showToast(
            "Expense added successfully"
        );

    } catch (error) {

        console.error(
            "ADD EXPENSE ERROR:",
            error
        );

        showToast(
            "Failed to add expense: " +
            error.message,
            "error"
        );
    }
}

// =============================================================
// DELETE EXPENSE
// =============================================================

window.deleteExpense = async function (id) {

    if (!id) {

        showToast(
            "Invalid expense ID",
            "error"
        );

        return;
    }

    if (!MOCK.user.id) {

        showToast(
            "User not logged in",
            "error"
        );

        return;
    }

    const confirmed =
        confirm(
            "Are you sure you want to delete this expense?"
        );

    if (!confirmed) {
        return;
    }

    try {

        console.log(
            "Deleting expense:",
            id,
            "for user:",
            MOCK.user.id
        );

        await apiRequest(
            CONFIG.ENDPOINTS.expenses +
            "/" +
            id +
            "?userId=" +
            MOCK.user.id,
            {
                method: "DELETE"
            }
        );

        console.log(
            "Expense deleted:",
            id
        );

        await fetchExpenses();

        showToast(
            "Expense deleted successfully"
        );

    } catch (error) {

        console.error(
            "DELETE EXPENSE ERROR:",
            error
        );

        showToast(
            "Failed to delete expense: " +
            error.message,
            "error"
        );
    }
};

// =============================================================
// SEARCH EXPENSES
// =============================================================

function searchExpenses() {

    const searchInput =
        document.getElementById(
            "expSearch"
        );

    if (!searchInput) {
        return;
    }

    const searchValue =
        searchInput.value
            .toLowerCase()
            .trim();

    const rows =
        document.querySelectorAll(
            "#expenseTableBody tr"
        );

    rows.forEach(row => {

        const text =
            row.textContent
                .toLowerCase();

        row.style.display =
            text.includes(searchValue)
                ? ""
                : "none";
    });
}

// =============================================================
// CATEGORIES
// =============================================================

async function renderCategories() {
    try {
        // Fetch categories from backend
        const response = await fetch(
            `${CONFIG.API_BASE}/categories`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch categories");
        }

        const categories = await response.json();
        console.log("Categories from backend:", categories);

        container.innerHTML = `
            <div class="form-card">

                <h4>Manage Categories</h4>

                <div style="
                    display:flex;
                    gap:10px;
                    margin:20px 0;
                ">

                    <input
                        type="text"
                        id="newCategory"
                        placeholder="New category"
                        style="flex:1;"
                    >

                    <button
                        class="btn btn-primary"
                        id="addCategoryBtn"
                    >
                        Add
                    </button>

                </div>

                <ul style="
                    list-style:none;
                    padding:0;
                ">

                    ${
                        categories.map(category => `
                            <li style="
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                                padding:12px 0;
                                border-bottom:1px solid #eee;
                            ">

                                <span>
                                    ${escapeHTML(category.name)}
                                </span>

                                <span>

                                   <button
    class="btn btn-outline"
    onclick="editCategory(${category.id}, '${escapeHTML(category.name)}')"
>
    <i class="fas fa-edit"></i>
</button>
                                   <button
    class="btn btn-danger"
    onclick="deleteCategory(${category.id}, '${escapeHTML(category.name)}')"
>
    <i class="fas fa-trash"></i>
</button>

                                </span>

                            </li>
                        `).join("")
                    }

                </ul>

            </div>
        `;

        // ADD CATEGORY
        const button = document.getElementById("addCategoryBtn");

        if (button) {
            button.addEventListener("click", async function () {

                const input =
                    document.getElementById("newCategory");

                const value = input.value.trim();

                if (!value) {
                    showToast("Enter category name", "error");
                    return;
                }

                try {
                    const response = await fetch(
                        `${CONFIG.API_BASE}/categories`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                name: value
                            })
                        }
                    );

                    if (!response.ok) {
                        throw new Error("Failed to add category");
                    }

                    showToast("Category added");

                    // Reload categories from MySQL
                    renderCategories();

                } catch (error) {
                    console.error("Add category error:", error);
                    showToast(
                        "Failed to add category",
                        "error"
                    );
                }
            });
        }

    } catch (error) {
        console.error("Categories loading error:", error);

        container.innerHTML = `
            <div class="form-card">
                <h4>Categories</h4>
                <p>Failed to load categories.</p>
            </div>
        `;
    }
}
// =============================================================
// EDIT CATEGORY
// =============================================================

window.editCategory = async function (id, oldCategory) {

    const newName = prompt(
        "Enter new category name:",
        oldCategory
    );

    if (!newName) {
        return;
    }

    const trimmed = newName.trim();

    if (!trimmed) {
        showToast("Enter category name", "error");
        return;
    }

    try {

        const response = await fetch(
            `${CONFIG.API_BASE}/categories/${id}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: trimmed
                })
            }
        );

        if (!response.ok) {
            throw new Error("Update failed");
        }

        const updatedCategory = await response.json();

        console.log("Updated category:", updatedCategory);

        showToast("Category updated successfully");

        renderCategories();

    } catch (error) {

        console.error("Category update error:", error);

        showToast(
            "Failed to update category",
            "error"
        );
    }
};

// =============================================================
// DELETE CATEGORY
// =============================================================

window.deleteCategory = async function (id, categoryName) {

    if (!confirm('Delete "' + categoryName + '"?')) {
        return;
    }

    try {

        const response = await fetch(
            `${CONFIG.API_BASE}/categories/${id}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            throw new Error("Delete failed");
        }

        showToast("Category deleted successfully");

        await renderCategories();

    } catch (error) {

        console.error("Category delete error:", error);

        showToast(
            "Failed to delete category",
            "error"
        );
    }
};

function renderBudget() {
     console.log("🔥 renderBudget() CALLED");

    const monthlyBudget =
        Number(
            MOCK.budget.monthly
        ) || 0;

    const spent =
        MOCK.expenses.reduce(
            (sum, expense) =>
                sum +
                Number(
                    expense.amount || 0
                ),
            0
        );

    const remaining =
        monthlyBudget - spent;

    const percentage =
        monthlyBudget > 0
            ? Math.min(
                (spent / monthlyBudget) * 100,
                100
            )
            : 0;

    container.innerHTML = `

        <div class="form-card">

            <h4>Monthly Budget</h4>

            <div
                style="
                    display:flex;
                    gap:30px;
                    margin:25px 0;
                    flex-wrap:wrap;
                "
            >

                <div>

                    <span class="label">
                        Budget
                    </span>

                    <div
                        style="
                            font-size:1.8rem;
                            font-weight:700;
                        "
                    >
                        ${formatMoney(monthlyBudget)}
                    </div>

                </div>

                <div>

                    <span class="label">
                        Spent
                    </span>

                    <div
                        style="
                            font-size:1.8rem;
                            font-weight:700;
                        "
                    >
                        ${formatMoney(spent)}
                    </div>

                </div>

                <div>

                    <span class="label">
                        Remaining
                    </span>

                    <div
                        style="
                            font-size:1.8rem;
                            font-weight:700;
                        "
                    >
                        ${formatMoney(remaining)}
                    </div>

                </div>

            </div>

            <div
                style="
                    background:#e9edf4;
                    height:14px;
                    border-radius:20px;
                    overflow:hidden;
                "
            >

                <div
                    style="
                        width:${percentage}%;
                        height:100%;
                        background:${
                            percentage > 90
                                ? "#e53935"
                                : "#4285f4"
                        };
                    "
                ></div>

            </div>

            ${
                percentage > 90
                    ? `
                        <p
                            style="
                                color:#e53935;
                                font-weight:bold;
                            "
                        >
                            ⚠️ Budget is almost exceeded!
                        </p>
                    `
                    : ""
            }

            <div
                style="
                    display:flex;
                    gap:10px;
                    margin-top:25px;
                "
            >

                <input
                    type="number"
                    id="budgetInput"
                    value="${monthlyBudget}"
                    min="0.01"
                    step="0.01"
                    style="flex:1;"
                >

                <button
                    class="btn btn-primary"
                    id="updateBudgetBtn"
                >
                    Update
                </button>

            </div>

        </div>
    `;

    const updateButton =
        document.getElementById(
            "updateBudgetBtn"
        );

   if (updateButton) {

    updateButton.addEventListener(
        "click",
        function () {

            const value =
                Number(
                    document.getElementById(
                        "budgetInput"
                    ).value
                );

            if (!validateAmount(value)) {

                showToast(
                    "Enter a valid budget",
                    "error"
                );

                return;
            }

           fetch(
    `${CONFIG.API_BASE}/budget/${MOCK.budget.id}?userId=${MOCK.user.id}`,
    {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    amount: value,
                    category: "Food",
                    month: "2026-08-01"
                })
            })
            .then(response => {

                if (!response.ok) {
                    throw new Error(
                        "Failed to update budget"
                    );
                }

                return response.json();
            })
            .then(data => {

                console.log(
                    "Budget updated in backend:",
                    data
                );

                MOCK.budget.monthly = value;

                renderBudget();

                showToast(
                    "Budget updated"
                );
            })
            .catch(error => {

                console.error(
                    "Budget update error:",
                    error
                );

                showToast(
                    "Failed to update budget",
                    "error"
                );
            });
        }
    );
   }}
// =============================================================
// REPORTS
// =============================================================

// =============================================================
// REPORTS
// =============================================================

// =============================================================
// REPORTS
// =============================================================

async function renderReports() {

    try {

        destroyCharts();

        // ---------------------------------------------------------
        // CHECK LOGGED-IN USER
        // ---------------------------------------------------------

        if (!MOCK.user || !MOCK.user.id) {

            container.innerHTML = `
                <div class="error-message">
                    User session not found. Please login again.
                </div>
            `;

            return;
        }

        const userId = MOCK.user.id;

        console.log("REPORT USER ID:", userId);

        // ---------------------------------------------------------
        // FETCH DATA
        // ---------------------------------------------------------

        const [incomeResponse, expenseResponse] =
            await Promise.all([

                fetch(
                    `${CONFIG.API_BASE}/incomes?userId=${userId}`
                ),

                fetch(
                    `${CONFIG.API_BASE}/expenses?userId=${userId}`
                )

            ]);

        if (!incomeResponse.ok || !expenseResponse.ok) {

            throw new Error(
                "Failed to fetch report data"
            );
        }

        let incomes = await incomeResponse.json();
        let expenses = await expenseResponse.json();

        console.log("REPORT RAW INCOMES:", incomes);
        console.log("REPORT RAW EXPENSES:", expenses);

        // ---------------------------------------------------------
        // EXTRA FRONTEND USER FILTER
        // Prevent another user's data from appearing
        // ---------------------------------------------------------

        incomes = incomes.filter(income => {

            const incomeUserId =
                income.userId ??
                income.user?.id ??
                income.user?.userId;

            return Number(incomeUserId) === Number(userId);
        });

        expenses = expenses.filter(expense => {

            const expenseUserId =
                expense.userId ??
                expense.user?.id ??
                expense.user?.userId;

            return Number(expenseUserId) === Number(userId);
        });

        console.log("REPORT FILTERED INCOMES:", incomes);
        console.log("REPORT FILTERED EXPENSES:", expenses);

        // ---------------------------------------------------------
        // CURRENT MONTH
        // ---------------------------------------------------------

        const today = new Date();

        const currentMonth =
            `${today.getFullYear()}-${String(
                today.getMonth() + 1
            ).padStart(2, "0")}`;

        // ---------------------------------------------------------
        // SELECTED MONTH
        // ---------------------------------------------------------

        const selectedMonth =
            window.selectedReportMonth || currentMonth;

        window.selectedReportMonth = selectedMonth;

        // ---------------------------------------------------------
        // MONTHLY INCOME
        // ---------------------------------------------------------

        const monthlyIncome =
            incomes
                .filter(income => {

                    return (
                        income.date &&
                        String(income.date).substring(0, 7) ===
                        selectedMonth
                    );

                })
                .reduce(
                    (sum, income) =>
                        sum + Number(income.amount || 0),
                    0
                );

        // ---------------------------------------------------------
        // MONTHLY EXPENSE
        // ---------------------------------------------------------

        const monthlyExpense =
            expenses
                .filter(expense => {

                    return (
                        expense.date &&
                        String(expense.date).substring(0, 7) ===
                        selectedMonth
                    );

                })
                .reduce(
                    (sum, expense) =>
                        sum + Number(expense.amount || 0),
                    0
                );

        // ---------------------------------------------------------
        // BALANCE
        // ---------------------------------------------------------

        const balance =
            monthlyIncome - monthlyExpense;

        // ---------------------------------------------------------
        // EXPENSE CATEGORY DATA
        // ---------------------------------------------------------

        const categoryMap = {};

        expenses
            .filter(expense => {

                return (
                    expense.date &&
                    String(expense.date).substring(0, 7) ===
                    selectedMonth
                );

            })
            .forEach(expense => {

                const category =
                    expense.category || "Other";

                categoryMap[category] =
                    (categoryMap[category] || 0) +
                    Number(expense.amount || 0);

            });

        const labels =
            Object.keys(categoryMap);

        const categoryData =
            Object.values(categoryMap);

        // ---------------------------------------------------------
        // MONTH NAME
        // ---------------------------------------------------------

        const [year, month] =
            selectedMonth.split("-");

        const selectedDate =
            new Date(
                Number(year),
                Number(month) - 1,
                1
            );

        const monthName =
            selectedDate.toLocaleString(
                "en-US",
                {
                    month: "long",
                    year: "numeric"
                }
            );

        // ---------------------------------------------------------
        // DEBUG
        // ---------------------------------------------------------

        console.log(
            "REPORT SELECTED MONTH:",
            selectedMonth
        );

        console.log(
            "REPORT MONTHLY INCOME:",
            monthlyIncome
        );

        console.log(
            "REPORT MONTHLY EXPENSE:",
            monthlyExpense
        );

        console.log(
            "REPORT MONTHLY BALANCE:",
            balance
        );

        // ---------------------------------------------------------
        // REPORT UI
        // ---------------------------------------------------------

        container.innerHTML = `

            <div class="report-download-card">

                <div class="report-card-header">

                    <div class="report-icon">
                        <i class="fas fa-file-invoice"></i>
                    </div>

                    <div>

                        <h3>
                            Monthly Financial Report
                        </h3>

                        <p>
                            Select a month to download
                            your complete financial report.
                        </p>

                    </div>

                </div>


                <div class="report-card-body">

                    <div class="report-month-group">

                        <label for="reportMonth">

                            <i class="fas fa-calendar-alt"></i>

                            Select Month

                        </label>

                        <input
                            type="month"
                            id="reportMonth"
                            value="${selectedMonth}"
                        >

                    </div>


                    <button
                        class="download-report-btn"
                        id="downloadMonthlyReport"
                        type="button"
                    >

                        <i class="fas fa-download"></i>

                        <span>
                            Download Monthly Report
                        </span>

                    </button>

                </div>

            </div>


            <div class="cards">

                <div class="card income">

                    <div class="label">
                        ${monthName} Income
                    </div>

                    <div class="value">
                        ${formatMoney(monthlyIncome)}
                    </div>

                </div>


                <div class="card expense">

                    <div class="label">
                        ${monthName} Expenses
                    </div>

                    <div class="value">
                        ${formatMoney(monthlyExpense)}
                    </div>

                </div>


                <div class="card">

                    <div class="label">
                        ${monthName} Balance
                    </div>

                    <div class="value">
                        ${formatMoney(balance)}
                    </div>

                </div>

            </div>


            <div class="grid-2">

                <div class="table-wrapper">

                    <h4>
                        Expense Distribution
                    </h4>

                    <canvas
                        id="expensePieChart"
                    ></canvas>

                </div>


                <div class="table-wrapper">

                    <h4>
                        Income vs Expenses
                    </h4>

                    <canvas
                        id="incomeExpenseBarChart"
                    ></canvas>

                </div>

            </div>

        `;

        // ---------------------------------------------------------
        // MONTH CHANGE
        // ---------------------------------------------------------

        const reportMonthElement =
            document.getElementById("reportMonth");

        if (reportMonthElement) {

            reportMonthElement.addEventListener(
                "change",
                function () {

                    window.selectedReportMonth =
                        this.value;

                    renderReports();

                }
            );

        }

        // ---------------------------------------------------------
        // DOWNLOAD BUTTON
        // ---------------------------------------------------------

        const downloadButton =
            document.getElementById(
                "downloadMonthlyReport"
            );

        if (downloadButton) {

            downloadButton.addEventListener(
                "click",
                downloadMonthlyReport
            );

        }

        // ---------------------------------------------------------
        // PIE CHART
        // ---------------------------------------------------------

        const pieCanvas =
            document.getElementById(
                "expensePieChart"
            );

        if (
            pieCanvas &&
            typeof Chart !== "undefined" &&
            labels.length > 0
        ) {

            charts.pie =
                new Chart(
                    pieCanvas,
                    {
                        type: "pie",

                        data: {

                            labels: labels,

                            datasets: [
                                {
                                    data: categoryData,

                                    backgroundColor: [
                                        "#36A2EB",
                                        "#FF6384",
                                        "#4BC0C0",
                                        "#FFCE56",
                                        "#9966FF",
                                        "#FF9F40",
                                        "#66BB6A",
                                        "#AB47BC"
                                    ]
                                }
                            ]

                        },

                        options: {
                            responsive: true,
                            maintainAspectRatio: true
                        }
                    }
                );

        }

        // ---------------------------------------------------------
        // BAR CHART
        // ---------------------------------------------------------

        const barCanvas =
            document.getElementById(
                "incomeExpenseBarChart"
            );

        if (
            barCanvas &&
            typeof Chart !== "undefined"
        ) {

            charts.bar =
                new Chart(
                    barCanvas,
                    {

                        type: "bar",

                        data: {

                            labels: [
                                "Income",
                                "Expenses"
                            ],

                            datasets: [
                                {

                                    label: monthName,

                                    data: [
                                        monthlyIncome,
                                        monthlyExpense
                                    ],

                                    backgroundColor: [
                                        "#42A5F5",
                                        "#EF5350"
                                    ]

                                }

                            ]

                        },

                        options: {

                            responsive: true,
                            maintainAspectRatio: true,

                            scales: {

                                y: {
                                    beginAtZero: true
                                }

                            }

                        }

                    }
                );

        }

    }

    catch (error) {

        console.error(
            "Reports Error:",
            error
        );

        container.innerHTML = `

            <div class="error-message">

                Failed to load report data.

                <br><br>

                <small>
                    ${escapeHTML(error.message)}
                </small>

            </div>

        `;

    }

}
// =============================================================
// DOWNLOAD MONTHLY REPORT
// =============================================================

async function downloadMonthlyReport() {

    const month =
        document.getElementById("reportMonth").value;

    if (!month) {
        alert("Please select a month");
        return;
    }

    if (!MOCK.user || !MOCK.user.id) {
        alert("User session not found. Please login again.");
        return;
    }

    try {

        console.log(
            "Downloading report for user:",
            MOCK.user.id
        );

        const response = await fetch(
            `${CONFIG.API_BASE}/reports/monthly?month=${month}&userId=${MOCK.user.id}`
        );

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "Report API error:",
                errorText
            );

            throw new Error(
                "Failed to download report"
            );
        }

        const blob =
            await response.blob();

        const url =
            window.URL.createObjectURL(blob);

        const a =
            document.createElement("a");

        a.href = url;

        a.download =
            `Monthly-Report-${month}.pdf`;

        document.body.appendChild(a);

        a.click();

        a.remove();

        window.URL.revokeObjectURL(url);

        console.log(
            "Report downloaded successfully for user:",
            MOCK.user.id
        );

    } catch (error) {

        console.error(
            "Download error:",
            error
        );

        alert(
            "Failed to download monthly report"
        );
    }
}
// =============================================================
// PROFILE
// =============================================================

function renderProfile() {

    container.innerHTML = `

        <div class="grid-2">

            <div class="form-card">

                <h4>My Profile</h4>

                <div class="form-group">

                    <label>Name</label>

                    <input
                        type="text"
                        id="profileName"
                        value="${escapeHTML(MOCK.user.name || "")}"
                    >

                </div>

                <div class="form-group">

                    <label>Email</label>

                    <input
                        type="email"
                        id="profileEmail"
                        value="${escapeHTML(MOCK.user.email || "")}"
                    >

                </div>

                <button
                    type="button"
                    class="btn btn-primary"
                    id="updateProfileBtn"
                >
                    Update Profile
                </button>

            </div>

        </div>

    `;

    const updateButton =
        document.getElementById("updateProfileBtn");

    if (updateButton) {

        updateButton.addEventListener(
            "click",
            async function () {

                const name =
                    document.getElementById("profileName")
                        .value.trim();

                const email =
                    document.getElementById("profileEmail")
                        .value.trim();

                if (!name) {
                    showToast(
                        "Name is required",
                        "error"
                    );
                    return;
                }

                if (!email || !email.includes("@")) {
                    showToast(
                        "Enter a valid email",
                        "error"
                    );
                    return;
                }

                MOCK.user.name = name;
                MOCK.user.email = email;

                if (exists(userNameDisplay)) {
                    userNameDisplay.textContent = name;
                }

                showToast(
                    "Profile updated successfully"
                );
            }
        );

    }
}
// =============================================================
// UPDATE PROFILE
// =============================================================

async function updateProfile() {

    const nameElement =
        document.getElementById("profileName");

    const emailElement =
        document.getElementById("profileEmail");

    if (!nameElement || !emailElement) {

        showToast(
            "Profile form not found",
            "error"
        );

        return;
    }

    const name =
        nameElement.value.trim();

    const email =
        emailElement.value.trim();

    if (!name) {

        showToast(
            "Name is required",
            "error"
        );

        return;
    }

    if (!email || !email.includes("@")) {

        showToast(
            "Enter a valid email",
            "error"
        );

        return;
    }

    try {

        const updatedProfile =
            await apiRequest(
                CONFIG.ENDPOINTS.profile,
                {
                    method: "PUT",

                    body: JSON.stringify({
                        name: name,
                        email: email
                    })
                }
            );

        console.log(
            "Updated profile:",
            updatedProfile
        );

        MOCK.user.name =
            updatedProfile.name || name;

        MOCK.user.email =
            updatedProfile.email || email;


        if (exists(userNameDisplay)) {

            userNameDisplay.textContent =
                MOCK.user.name;

        }

        showToast(
            "Profile updated successfully"
        );

    } catch (error) {

        console.error(
            "UPDATE PROFILE ERROR:",
            error
        );

        showToast(
            "Failed to update profile: " +
            error.message,
            "error"
        );

    }
}
// =============================================================
// PROFILE
// =============================================================

function renderProfile() {

    container.innerHTML = `

        <div class="grid-2">

            <div class="form-card">

                <h4>My Profile</h4>

                <div class="form-group">

                    <label>Name</label>

                    <input
                        type="text"
                        id="profileName"
                        value="${escapeHTML(MOCK.user.name || "")}"
                    >

                </div>

                <div class="form-group">

                    <label>Email</label>

                    <input
                        type="email"
                        id="profileEmail"
                        value="${escapeHTML(MOCK.user.email || "")}"
                    >

                </div>

                <button
                    type="button"
                    class="btn btn-primary"
                    id="updateProfileBtn"
                >
                    Update Profile
                </button>

            </div>

        </div>

    `;

    const updateButton =
        document.getElementById("updateProfileBtn");

    if (updateButton) {

        updateButton.addEventListener(
            "click",
            async function () {

                const name =
                    document.getElementById("profileName")
                        .value.trim();

                const email =
                    document.getElementById("profileEmail")
                        .value.trim();

                if (!name) {
                    showToast(
                        "Name is required",
                        "error"
                    );
                    return;
                }

                if (!email || !email.includes("@")) {
                    showToast(
                        "Enter a valid email",
                        "error"
                    );
                    return;
                }

                MOCK.user.name = name;
                MOCK.user.email = email;

                if (exists(userNameDisplay)) {
                    userNameDisplay.textContent = name;
                }

                showToast(
                    "Profile updated successfully"
                );
            }
        );

    }
}
// =============================================================
// NOTIFICATION BUTTON
// =============================================================

const notificationBtn =
    document.getElementById("notificationBtn");

const notificationPanel =
    document.getElementById("notificationPanel");

if (notificationBtn && notificationPanel) {

    notificationBtn.addEventListener("click", function () {

        notificationPanel.classList.toggle("show");

        // Notification open hui = read
        if (notificationPanel.classList.contains("show")) {

            unreadNotifications = 0;

            updateNotificationBadge();
        }

    });
}
// =====================================================
// MONTHLY INCOME REMINDER
// =====================================================

// =====================================================
// NOTIFICATION SYSTEM
// =====================================================

let unreadNotifications = 0;

function addMonthlyIncomeNotification() {

    const notificationPanel =
        document.getElementById("notificationPanel");

    const notificationBtn =
        document.getElementById("notificationBtn");

    if (!notificationPanel) {
        console.error("notificationPanel not found");
        return;
    }

    // Prevent duplicate notification
    if (
        document.getElementById("monthlyIncomeNotification")
    ) {
        return;
    }

    const notification =
        document.createElement("div");

    notification.id =
        "monthlyIncomeNotification";

    notification.className =
        "notification-item";

    notification.innerHTML = `

        <div class="notification-icon">
            🔔
        </div>

        <div class="notification-content">

            <strong>
                Monthly Income Reminder
            </strong>

            <p>
                It's time to add your monthly income 💰
            </p>

        </div>

    `;

    notificationPanel.prepend(notification);

    // Unread count
    unreadNotifications++;

    updateNotificationBadge();

    // Popup notification
    showIncomeReminderPopup();
}


// =====================================================
// NOTIFICATION BADGE
// =====================================================

function updateNotificationBadge() {

    const notificationBtn =
        document.getElementById("notificationBtn");

    if (!notificationBtn) {
        return;
    }

    let badge =
        document.getElementById(
            "notificationBadge"
        );

    if (unreadNotifications > 0) {

        if (!badge) {

            badge =
                document.createElement("span");

            badge.id =
                "notificationBadge";

            badge.className =
                "notification-badge";

            notificationBtn.style.position =
                "relative";

            notificationBtn.appendChild(
                badge
            );
        }

        badge.textContent =
            unreadNotifications;

    } else {

        if (badge) {
            badge.remove();
        }
    }
}


// =====================================================
// POPUP
// =====================================================

function showIncomeReminderPopup() {

    const popup =
        document.createElement("div");

    popup.className =
        "income-reminder";

    popup.innerHTML = `

        <div class="reminder-icon">
            🔔
        </div>

        <div class="reminder-content">

            <strong>
                Monthly Income Reminder
            </strong>

            <span>
                It's time to add your monthly income 💰
            </span>

        </div>

        <button
            type="button"
            onclick="this.parentElement.remove()"
        >
            ×
        </button>

    `;

    document.body.appendChild(popup);

    setTimeout(() => {

        if (popup.parentElement) {
            popup.remove();
        }

    }, 5000);
}


// =====================================================
// CHECK MONTHLY INCOME
// =====================================================

function checkMonthlyIncomeNotification() {

    if (!isLoggedIn) {
        return;
    }

    const currentMonth =
        getCurrentMonthKey();

    const hasIncome =
        MOCK.incomes.some(income => {

            if (!income.date) {
                return false;
            }

            return String(income.date)
                .startsWith(currentMonth);

        });

    console.log(
        "Monthly income exists:",
        hasIncome
    );

    if (!hasIncome) {

        addMonthlyIncomeNotification();

    } else {

        console.log(
            "Income already added for this month."
        );
    }
}
function addMonthlyIncomeNotification() {

    const notificationPanel =
        document.getElementById("notificationPanel");

    if (!notificationPanel) {
        console.error("notificationPanel not found");
        return;
    }

    // Duplicate notification mat banao
    if (
        document.getElementById("monthlyIncomeNotification")
    ) {
        return;
    }

    const notification =
        document.createElement("div");

    notification.id =
        "monthlyIncomeNotification";

    notification.className =
        "notification-item";

    notification.innerHTML = `

        <div class="notification-icon">
            🔔
        </div>

        <div class="notification-content">

            <strong>
                Monthly Income Reminder
            </strong>

            <p>
                It's time to add your monthly income 💰
            </p>

        </div>

    `;

    notificationPanel.prepend(notification);

    unreadNotifications = 1;

    updateNotificationBadge();

    // Popup bhi show hoga
    showIncomeReminderPopup();
}
