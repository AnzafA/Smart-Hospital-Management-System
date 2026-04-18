// API Configuration
// Use relative path for Vercel deployment, fallback to localhost for development
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
    ? 'http://localhost:5000/api'
    : '/_/backend/api';
let authToken = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let patientsCache = [];
let doctorsCache = [];
let appointmentsCache = [];
let billsCache = [];
let medicinesCache = [];
let billingMedicinesCache = [];
let staffCache = [];
let dailyCodesCache = [];
let currentEdit = { type: null, id: null };

// Toast Notification System
class Toast {
    static show(message, type = 'info') {
        const container = document.querySelector('.toast-container') || this.createContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type} animate-slide-in-right`;
        
        let icon = '';
        switch(type) {
            case 'success': icon = 'check-circle'; break;
            case 'error': icon = 'exclamation-circle'; break;
            case 'warning': icon = 'exclamation-triangle'; break;
            default: icon = 'info-circle';
        }
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    static createContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }
}

// Login Handler
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Check if user is logged in and on dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        if (!authToken) {
            window.location.href = '../index.html';
            return;
        }
        initializeDashboard();
    }
    
    // Password visibility toggle
    const togglePassword = document.querySelector('.toggle-password');
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.classList.toggle('fa-eye');
            togglePassword.classList.toggle('fa-eye-slash');
        });
    }
});

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.querySelector('.login-btn');
    
    loginBtn.innerHTML = '<span class="spinner"></span> Logging in...';
    loginBtn.disabled = true;
    
    try {
        console.log('Login attempt:', { username, apiUrl: API_URL });
        
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        console.log('Login response:', { status: response.status, data });
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            authToken = data.token;
            currentUser = data.user;
            
            Toast.show('Login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'pages/dashboard.html';
            }, 1500);
        } else {
            Toast.show(data.message || 'Login failed', 'error');
            loginBtn.innerHTML = '<span>Login</span> <i class="fas fa-arrow-right"></i>';
            loginBtn.disabled = false;
        }
    } catch (error) {
        console.error('Login error details:', error);
        console.error('API URL was:', API_URL);
        
        let errorMessage = 'Network error. Please make sure the backend server is running on port 5000.';
        if (error.message.includes('fetch')) {
            errorMessage = 'Failed to connect to server. Is the backend running?';
        }
        
        Toast.show(errorMessage, 'error');
        loginBtn.innerHTML = '<span>Login</span> <i class="fas fa-arrow-right"></i>';
        loginBtn.disabled = false;
    }
}

// Initialize Database - Create default admin user
async function initializeDatabase() {
    const setupBtn = document.querySelector('.setup-btn');
    if (!setupBtn) return;
    
    setupBtn.disabled = true;
    setupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing...';
    
    try {
        console.log('Initializing database with API URL:', API_URL);
        
        const response = await fetch(`${API_URL}/auth/initialize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        console.log('Initialize response:', { status: response.status, data });
        
        if (response.ok) {
            Toast.show('Database initialized successfully! Admin user created.', 'success');
            setupBtn.innerHTML = '<i class="fas fa-check"></i> Database Ready';
            setupBtn.style.backgroundColor = '#28a745';
        } else {
            Toast.show(data.message || 'Initialization failed', 'warning');
            setupBtn.innerHTML = '<i class="fas fa-cog"></i> Initialize Database';
            setupBtn.disabled = false;
        }
    } catch (error) {
        console.error('Initialization error:', error);
        console.error('API URL was:', API_URL);
        Toast.show('Failed to connect to backend. Make sure the server is running.', 'error');
        setupBtn.innerHTML = '<i class="fas fa-cog"></i> Initialize Database';
        setupBtn.disabled = false;
    }
}

// Initialize Dashboard
function initializeDashboard() {
    loadUserProfile();
    setupNavigation();
    loadDashboardStats();
    
    // Load initial page based on URL hash or default to dashboard
    const page = window.location.hash.slice(1) || 'dashboard';
    loadPage(page);
}

// Load User Profile
function loadUserProfile() {
    if (currentUser) {
        document.getElementById('profileName').textContent = currentUser.username;
        document.getElementById('profileRole').textContent = 
            currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    }
}

// Setup Navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            loadPage(page);
            window.location.hash = page;
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

// Handle Logout
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    Toast.show('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = '../index.html';
    }, 1500);
}

// Load Page Content
async function loadPage(page) {
    const mainContent = document.querySelector('.dashboard-main');
    
    switch(page) {
        case 'dashboard':
            mainContent.innerHTML = getDashboardHTML();
            loadDashboardStats();
            break;
        case 'patients':
            mainContent.innerHTML = getPatientsHTML();
            loadPatients();
            break;
        case 'doctors':
            mainContent.innerHTML = getDoctorsHTML();
            loadDoctors();
            break;
        case 'appointments':
            mainContent.innerHTML = getAppointmentsHTML();
            loadAppointments();
            break;
        case 'billing':
            mainContent.innerHTML = getBillingHTML();
            loadBills();
            break;
        case 'medicines':
            mainContent.innerHTML = getMedicinesHTML();
            loadMedicines();
            break;
        case 'staff':
            mainContent.innerHTML = getStaffHTML();
            loadStaff();
            break;
        case 'daily-codes':
            mainContent.innerHTML = getDailyCodesHTML();
            loadDailyCodes();
            break;
    }
}

// Dashboard HTML
function getDashboardHTML() {
    return `
        <div class="stats-grid">
            <div class="stat-card animate-slide-in-up">
                <div class="stat-header">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-number" id="totalPatients">0</div>
                <div class="stat-label">Total Patients</div>
            </div>
            <div class="stat-card animate-slide-in-up" style="animation-delay: 0.1s">
                <div class="stat-header">
                    <i class="fas fa-user-md"></i>
                </div>
                <div class="stat-number" id="totalDoctors">0</div>
                <div class="stat-label">Active Doctors</div>
            </div>
            <div class="stat-card animate-slide-in-up" style="animation-delay: 0.2s">
                <div class="stat-header">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div class="stat-number" id="totalAppointments">0</div>
                <div class="stat-label">Total Appointments</div>
            </div>
            <div class="stat-card animate-slide-in-up" style="animation-delay: 0.3s">
                <div class="stat-header">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-number" id="pendingAppointments">0</div>
                <div class="stat-label">Pending Appointments</div>
            </div>
            <div class="stat-card animate-slide-in-up" style="animation-delay: 0.4s">
                <div class="stat-header">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="stat-number" id="totalRevenue">$0</div>
                <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-card animate-slide-in-up" style="animation-delay: 0.5s">
                <div class="stat-header">
                    <i class="fas fa-file-invoice"></i>
                </div>
                <div class="stat-number" id="totalBills">0</div>
                <div class="stat-label">Total Bills</div>
            </div>
            <div class="stat-card animate-slide-in-up" style="animation-delay: 0.6s">
                <div class="stat-header">
                    <i class="fas fa-pills"></i>
                </div>
                <div class="stat-number" id="totalMedicines">0</div>
                <div class="stat-label">Medicines</div>
            </div>
            <div class="stat-card animate-slide-in-up" style="animation-delay: 0.7s">
                <div class="stat-header">
                    <i class="fas fa-user-tie"></i>
                </div>
                <div class="stat-number" id="totalStaff">0</div>
                <div class="stat-label">Staff</div>
            </div>
        </div>
        
        <div class="recent-section animate-fade-in">
            <div class="section-header">
                <h3>Recent Appointments</h3>
                <a href="#" class="view-all" onclick="loadPage('appointments')">View All <i class="fas fa-arrow-right"></i></a>
            </div>
            <div class="table-responsive">
                <table id="recentAppointments">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Patient</th>
                            <th>Doctor</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    `;
}

// Load Dashboard Stats
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_URL}/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const stats = await response.json();
        
        if (response.ok) {
            document.getElementById('totalPatients').textContent = stats.totalPatients;
            document.getElementById('totalDoctors').textContent = stats.totalDoctors;
            document.getElementById('totalAppointments').textContent = stats.totalAppointments;
            document.getElementById('pendingAppointments').textContent = stats.pendingAppointments;
            document.getElementById('totalRevenue').textContent = `$${stats.totalRevenue || 0}`;
            document.getElementById('totalBills').textContent = stats.totalBills;
            document.getElementById('totalMedicines').textContent = stats.totalMedicines;
            document.getElementById('totalStaff').textContent = stats.totalStaff;
            
            const tbody = document.querySelector('#recentAppointments tbody');
            if (tbody && stats.recentAppointments) {
                tbody.innerHTML = stats.recentAppointments.map(apt => `
                    <tr>
                        <td>${apt.appointmentId}</td>
                        <td>${apt.patientId?.firstName || 'Unknown'} ${apt.patientId?.lastName || ''}</td>
                        <td>Dr. ${apt.doctorId?.firstName || 'Unknown'} ${apt.doctorId?.lastName || ''}</td>
                        <td>${new Date(apt.appointmentDate).toLocaleDateString()}</td>
                        <td><span class="status-badge status-${apt.status?.toLowerCase()}">${apt.status}</span></td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Patients Module
function getPatientsHTML() {
    return `
        <div class="page-header">
            <h2><i class="fas fa-users"></i> Patient Management</h2>
            <button class="login-btn" onclick="showAddPatientModal()">
                <i class="fas fa-plus"></i> Add Patient
            </button>
        </div>
        
        <div class="table-responsive">
            <table id="patientsTable">
                <thead>
                    <tr>
                        <th>Patient ID</th>
                        <th>Name</th>
                        <th>Gender</th>
                        <th>Contact</th>
                        <th>Blood Group</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>

        <div id="patientModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Patient</h3>
                    <button class="close-modal" onclick="closeModal('patientModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="patientForm" onsubmit="handleAddPatient(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label>First Name</label>
                                <input type="text" id="firstName" required>
                            </div>
                            <div class="form-group">
                                <label>Last Name</label>
                                <input type="text" id="lastName" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date of Birth</label>
                                <input type="date" id="dateOfBirth" required>
                            </div>
                            <div class="form-group">
                                <label>Gender</label>
                                <select id="gender" required>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Blood Group</label>
                                <select id="bloodGroup">
                                    <option value="">Select Blood Group</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Contact Number</label>
                                <input type="tel" id="contactNumber" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="email">
                        </div>
                        <button type="submit" class="submit-btn">Add Patient</button>
                    </form>
                </div>
            </div>
        </div>

        <div id="patientViewModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Patient Details</h3>
                    <button class="close-modal" onclick="closeModal('patientViewModal')">&times;</button>
                </div>
                <div class="modal-body" id="patientViewBody"></div>
            </div>
        </div>
    `;
}

async function loadPatients() {
    try {
        const response = await fetch(`${API_URL}/patients`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const patients = await response.json();
        patientsCache = patients;
        
        const tbody = document.querySelector('#patientsTable tbody');
        tbody.innerHTML = patients.map(patient => `
            <tr>
                <td><strong>${patient.patientId}</strong></td>
                <td>${patient.firstName} ${patient.lastName}</td>
                <td>${patient.gender}</td>
                <td>${patient.contactNumber}</td>
                <td>${patient.bloodGroup || 'N/A'}</td>
                <td>
                    <button class="action-btn btn-view" onclick="viewPatient('${patient._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-edit" onclick="editPatient('${patient._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deletePatient('${patient._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading patients:', error);
        Toast.show('Error loading patients', 'error');
    }
}

async function handleAddPatient(e) {
    e.preventDefault();
    
    const patientData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        dateOfBirth: document.getElementById('dateOfBirth').value,
        gender: document.getElementById('gender').value,
        bloodGroup: document.getElementById('bloodGroup').value,
        contactNumber: document.getElementById('contactNumber').value,
        email: document.getElementById('email').value
    };
    
    try {
        const method = currentEdit.type === 'patient' && currentEdit.id ? 'PUT' : 'POST';
        const url = method === 'PUT' ? `${API_URL}/patients/${currentEdit.id}` : `${API_URL}/patients`;

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(patientData)
        });
        
        if (response.ok) {
            Toast.show(currentEdit.type === 'patient' ? 'Patient updated successfully' : 'Patient added successfully', 'success');
            closeModal('patientModal');
            document.getElementById('patientForm').reset();
            resetEditState();
            document.querySelector('#patientModal .modal-header h3').textContent = 'Add New Patient';
            document.querySelector('#patientForm button[type="submit"]').textContent = 'Add Patient';
            loadPatients();
        } else {
            const error = await response.json();
            Toast.show(error.message, 'error');
        }
    } catch (error) {
        console.error('Error adding/updating patient:', error);
        Toast.show('Error saving patient', 'error');
    }
}

// Doctors Module
function getDoctorsHTML() {
    return `
        <div class="page-header">
            <h2><i class="fas fa-user-md"></i> Doctor Management</h2>
        </div>
        
        <div class="page-header">
            <h3>Doctor Profiles</h3>
            <button class="login-btn" onclick="showAddDoctorModal()">
                <i class="fas fa-plus"></i> Add Doctor
            </button>
        </div>
            
        <div class="table-responsive">
            <table id="doctorsTable">
                <thead>
                    <tr>
                        <th>Doctor ID</th>
                        <th>Name</th>
                        <th>Specialization</th>
                        <th>Department</th>
                        <th>Contact</th>
                        <th>Fee ($)</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>

        <div id="doctorModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Doctor</h3>
                    <button class="close-modal" onclick="closeModal('doctorModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="doctorForm" onsubmit="handleAddDoctor(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label>First Name</label>
                                <input type="text" id="docFirstName" required>
                            </div>
                            <div class="form-group">
                                <label>Last Name</label>
                                <input type="text" id="docLastName" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Specialization</label>
                                <input type="text" id="specialization" required>
                            </div>
                            <div class="form-group">
                                <label>Department</label>
                                <input type="text" id="department" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Contact Number</label>
                                <input type="tel" id="docContactNumber" required>
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="docEmail" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Experience (years)</label>
                                <input type="number" id="experience">
                            </div>
                            <div class="form-group">
                                <label>Consultation Fee ($)</label>
                                <input type="number" id="consultationFee" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Qualifications (comma separated)</label>
                            <input type="text" id="qualification" placeholder="e.g., MD, DM">
                        </div>
                        <button type="submit" class="submit-btn">Add Doctor</button>
                    </form>
                </div>
            </div>
        </div>

        <div id="doctorViewModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Doctor Details</h3>
                    <button class="close-modal" onclick="closeModal('doctorViewModal')">&times;</button>
                </div>
                <div class="modal-body" id="doctorViewBody"></div>
            </div>
        </div>
    `;
}

async function loadDoctors() {
    try {
        const response = await fetch(`${API_URL}/doctors`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const doctors = await response.json();
        doctorsCache = doctors;

        const tbody = document.querySelector('#doctorsTable tbody');
        tbody.innerHTML = doctors.map(doctor => `
            <tr class="doctor-row" data-doctor-id="${doctor._id}">
                <td><strong>${doctor.doctorId}</strong></td>
                <td>
                    <div class="doctor-name-cell">
                        <span class="doctor-name">Dr. ${doctor.firstName} ${doctor.lastName}</span>
                        <button class="expand-btn" onclick="toggleDoctorAppointments('${doctor._id}')" title="View Today's Appointments">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </td>
                <td>${doctor.specialization}</td>
                <td>${doctor.department}</td>
                <td>${doctor.contactNumber}</td>
                <td>$${doctor.consultationFee || 0}</td>
                <td>
                    <button class="action-btn btn-view" onclick="viewDoctor('${doctor._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-edit" onclick="editDoctor('${doctor._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteDoctor('${doctor._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
            <tr class="appointments-row" id="appointments-${doctor._id}" style="display: none;">
                <td colspan="7" class="appointments-container">
                    <div class="doctor-appointments-content">
                        <div class="appointments-summary">
                            <h4>Today's Appointments</h4>
                            <div class="appointment-stats">
                                <div class="stat-item">
                                    <span class="stat-number" id="pending-count-${doctor._id}">0</span>
                                    <span class="stat-label">Pending</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-number" id="completed-count-${doctor._id}">0</span>
                                    <span class="stat-label">Completed</span>
                                </div>
                            </div>
                        </div>
                        <div class="appointments-list" id="appointments-list-${doctor._id}">
                            <!-- Appointments will be loaded here -->
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading doctors:', error);
        Toast.show('Error loading doctors', 'error');
    }
}

async function handleAddDoctor(e) {
    e.preventDefault();
    
    const qualifications = document.getElementById('qualification').value
        .split(',')
        .map(q => q.trim())
        .filter(q => q);
    
    const doctorData = {
        firstName: document.getElementById('docFirstName').value,
        lastName: document.getElementById('docLastName').value,
        specialization: document.getElementById('specialization').value,
        department: document.getElementById('department').value,
        contactNumber: document.getElementById('docContactNumber').value,
        email: document.getElementById('docEmail').value,
        experience: parseInt(document.getElementById('experience').value) || 0,
        consultationFee: parseFloat(document.getElementById('consultationFee').value) || 0,
        qualification: qualifications
    };
    
    try {
        const method = currentEdit.type === 'doctor' && currentEdit.id ? 'PUT' : 'POST';
        const url = method === 'PUT' ? `${API_URL}/doctors/${currentEdit.id}` : `${API_URL}/doctors`;
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(doctorData)
        });
        
        if (response.ok) {
            Toast.show(currentEdit.type === 'doctor' ? 'Doctor updated successfully' : 'Doctor added successfully', 'success');
            closeModal('doctorModal');
            document.getElementById('doctorForm').reset();
            resetEditState();
            document.querySelector('#doctorModal .modal-header h3').textContent = 'Add New Doctor';
            document.querySelector('#doctorForm button[type="submit"]').textContent = 'Add Doctor';
            loadDoctors();
        } else {
            const error = await response.json();
            Toast.show(error.message, 'error');
        }
    } catch (error) {
        console.error('Error adding/updating doctor:', error);
        Toast.show('Error saving doctor', 'error');
    }
}

// Appointments Module
function getAppointmentsHTML() {
    return `
        <div class="page-header">
            <h2><i class="fas fa-calendar-check"></i> Appointment Management</h2>
            <button class="login-btn" onclick="showAddAppointmentModal()">
                <i class="fas fa-plus"></i> New Appointment
            </button>
        </div>
        
        <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-clock" style="color: #f39c12;"></i>
                </div>
                <div class="stat-number" id="scheduledCount">0</div>
                <div class="stat-label">Scheduled</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-check-circle" style="color: #27ae60;"></i>
                </div>
                <div class="stat-number" id="completedCount">0</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-times-circle" style="color: #e74c3c;"></i>
                </div>
                <div class="stat-number" id="cancelledCount">0</div>
                <div class="stat-label">Cancelled</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-calendar-day" style="color: #3498db;"></i>
                </div>
                <div class="stat-number" id="todayCount">0</div>
                <div class="stat-label">Today</div>
            </div>
        </div>
        
        <div class="table-responsive">
            <table id="appointmentsTable">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>

        <div id="appointmentModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Schedule New Appointment</h3>
                    <button class="close-modal" onclick="closeModal('appointmentModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="appointmentForm" onsubmit="handleAddAppointment(event)">
                        <div class="form-group">
                            <label>Select Patient</label>
                            <select id="patientSelect" required>
                                <option value="">Loading patients...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Select Doctor</label>
                            <select id="doctorSelect" required>
                                <option value="">Loading doctors...</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date</label>
                                <input type="date" id="appointmentDate" required>
                            </div>
                            <div class="form-group">
                                <label>Time</label>
                                <input type="time" id="appointmentTime" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Status</label>
                                <select id="statusSelect">
                                    <option value="Scheduled">Scheduled</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                    <option value="No-Show">No-Show</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Symptoms</label>
                                <textarea id="symptoms" rows="3"></textarea>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Diagnosis</label>
                            <textarea id="diagnosis" rows="2"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Additional Notes</label>
                            <textarea id="notes" rows="2"></textarea>
                        </div>
                        <button type="submit" class="submit-btn">Schedule Appointment</button>
                    </form>
                </div>
            </div>
        </div>

        <div id="appointmentViewModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Appointment Details</h3>
                    <button class="close-modal" onclick="closeModal('appointmentViewModal')">&times;</button>
                </div>
                <div class="modal-body" id="appointmentViewBody"></div>
            </div>
        </div>
    `;
}

async function loadAppointments() {
    try {
        const response = await fetch(`${API_URL}/appointments`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const appointments = await response.json();
        appointmentsCache = appointments;
        
        // Update stats
        const scheduled = appointments.filter(a => a.status === 'Scheduled').length;
        const completed = appointments.filter(a => a.status === 'Completed').length;
        const cancelled = appointments.filter(a => a.status === 'Cancelled').length;
        const today = new Date().toDateString();
        const todayCount = appointments.filter(a => 
            new Date(a.appointmentDate).toDateString() === today
        ).length;
        
        document.getElementById('scheduledCount').textContent = scheduled;
        document.getElementById('completedCount').textContent = completed;
        document.getElementById('cancelledCount').textContent = cancelled;
        document.getElementById('todayCount').textContent = todayCount;
        
        const tbody = document.querySelector('#appointmentsTable tbody');
        tbody.innerHTML = appointments.map(apt => `
            <tr>
                <td><strong>${apt.appointmentId}</strong></td>
                <td>${apt.patientId?.firstName || 'Unknown'} ${apt.patientId?.lastName || ''}</td>
                <td>Dr. ${apt.doctorId?.firstName || 'Unknown'} ${apt.doctorId?.lastName || ''}</td>
                <td>${new Date(apt.appointmentDate).toLocaleDateString()}</td>
                <td>${apt.appointmentTime}</td>
                <td><span class="status-badge status-${apt.status?.toLowerCase()}">${apt.status}</span></td>
                <td>
                    <button class="action-btn btn-view" onclick="viewAppointment('${apt._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-edit" onclick="editAppointment('${apt._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteAppointment('${apt._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading appointments:', error);
        Toast.show('Error loading appointments', 'error');
    }
}

async function populateAppointmentModalOptions() {
    try {
        const [patientsRes, doctorsRes, medicinesRes] = await Promise.all([
            fetch(`${API_URL}/patients`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch(`${API_URL}/doctors`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch(`${API_URL}/medicines`, { headers: { 'Authorization': `Bearer ${authToken}` } })
        ]);

        const patients = await patientsRes.json();
        const doctors = await doctorsRes.json();
        const medicines = await medicinesRes.json();

        patientsCache = patients;
        doctorsCache = doctors;
        medicinesCache = medicines;

        const patientSelect = document.getElementById('patientSelect');
        patientSelect.innerHTML = '<option value="">Select Patient</option>' +
            patients.map(p => `<option value="${p._id}">${p.patientId} - ${p.firstName} ${p.lastName}</option>`).join('');

        const doctorSelect = document.getElementById('doctorSelect');
        doctorSelect.innerHTML = '<option value="">Select Doctor</option>' +
            doctors.map(d => `<option value="${d._id}">Dr. ${d.firstName} ${d.lastName} - ${d.specialization}</option>`).join('');

        const medicineSelect = document.getElementById('medicineSelect');
        medicineSelect.innerHTML = '<option value="">Select medicines to prescribe</option>' +
            medicines.map(m => `<option value="${m._id}">${m.name} - $${m.price} (${m.stockQuantity} available)</option>`).join('');
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function showAddAppointmentModal() {
    currentEdit = { type: 'appointment', id: null };
    document.querySelector('#appointmentModal .modal-header h3').textContent = 'Schedule New Appointment';
    document.querySelector('#appointmentForm button[type="submit"]').textContent = 'Schedule Appointment';
    document.getElementById('appointmentForm').reset();
    await populateAppointmentModalOptions();
    document.getElementById('statusSelect').value = 'Scheduled';
    document.getElementById('appointmentModal').style.display = 'flex';
}

async function handleAddAppointment(e) {
    e.preventDefault();
    
    const appointmentData = {
        patientId: document.getElementById('patientSelect').value,
        doctorId: document.getElementById('doctorSelect').value,
        appointmentDate: document.getElementById('appointmentDate').value,
        appointmentTime: document.getElementById('appointmentTime').value,
        symptoms: document.getElementById('symptoms').value,
        diagnosis: document.getElementById('diagnosis').value,
        notes: document.getElementById('notes').value,
        status: document.getElementById('statusSelect').value || 'Scheduled'
    };
    
    try {
        const method = currentEdit.type === 'appointment' && currentEdit.id ? 'PUT' : 'POST';
        const url = method === 'PUT' ? `${API_URL}/appointments/${currentEdit.id}` : `${API_URL}/appointments`;

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(appointmentData)
        });
        
        if (response.ok) {
            Toast.show(currentEdit.type === 'appointment' ? 'Appointment updated successfully' : 'Appointment scheduled successfully', 'success');
            closeModal('appointmentModal');
            document.getElementById('appointmentForm').reset();
            resetEditState();
            document.querySelector('#appointmentModal .modal-header h3').textContent = 'Schedule New Appointment';
            document.querySelector('#appointmentForm button[type="submit"]').textContent = 'Schedule Appointment';
            loadAppointments();
        } else {
            const error = await response.json();
            Toast.show(error.message, 'error');
        }
    } catch (error) {
        console.error('Error saving appointment:', error);
        Toast.show('Error saving appointment', 'error');
    }
}

// Billing Module
function getBillingHTML() {
    return `
        <div class="page-header">
            <h2><i class="fas fa-file-invoice-dollar"></i> Billing Management</h2>
            <button class="login-btn" onclick="showAddBillModal()">
                <i class="fas fa-plus"></i> Generate Bill
            </button>
        </div>
        
        <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-dollar-sign" style="color: #27ae60;"></i>
                </div>
                <div class="stat-number" id="totalRevenue">$0</div>
                <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-check-circle" style="color: #27ae60;"></i>
                </div>
                <div class="stat-number" id="paidBills">0</div>
                <div class="stat-label">Paid Bills</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-hourglass-half" style="color: #f39c12;"></i>
                </div>
                <div class="stat-number" id="pendingBills">0</div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>
                </div>
                <div class="stat-number" id="unpaidBills">0</div>
                <div class="stat-label">Unpaid</div>
            </div>
        </div>
        
        <div class="table-responsive">
            <table id="billsTable">
                <thead>
                    <tr>
                        <th>Bill ID</th>
                        <th>Patient</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Deduction</th>
                        <th>Net Total</th>
                        <th>Paid</th>
                        <th>Due</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>

        <div id="billModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Generate New Bill</h3>
                    <button class="close-modal" onclick="closeModal('billModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="billForm" onsubmit="handleAddBill(event)">
                        <div class="form-group">
                            <label>Select Patient</label>
                            <select id="billPatientSelect" required onchange="loadPatientAppointments()">
                                <option value="">Loading patients...</option>
                            </select>
                        </div>
                        
                        <!-- Doctor Information Display -->
                        <div id="doctorInfoSection" class="form-group" style="display: none; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef;">
                            <h4 style="margin: 0 0 10px 0; color: #2c3e50;">Selected Doctor Information</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div><strong>Doctor:</strong> <span id="selectedDoctorName">-</span></div>
                                <div><strong>Specialization:</strong> <span id="selectedDoctorSpecialization">-</span></div>
                                <div><strong>Consultation Fee:</strong> $<span id="selectedDoctorFee">0</span></div>
                                <div><strong>Appointment Date:</strong> <span id="selectedAppointmentDate">-</span></div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Select Appointment (Optional)</label>
                            <select id="billAppointmentSelect" onchange="autoFillConsultationFee()">
                                <option value="">Select appointment to auto-fill consultation fee</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Select Medicines</label>
                            <select id="billMedicineSelect" multiple size="5" onchange="handleMedicineSelectionChange()">
                                <option value="">Loading medicines...</option>
                            </select>
                            <small style="color: #666; display: block; margin-top: 5px;">Hold Ctrl/Cmd to select multiple medicines.</small>
                        </div>
                        <div id="selectedMedicinesContainer" class="form-group"></div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Consultation Fee ($)</label>
                                <input type="number" id="consultationFee" value="0" readonly>
                                <small style="color: #666;">Auto-filled from appointment</small>
                            </div>
                            <div class="form-group">
                                <label>Medicine Charges ($)</label>
                                <input type="number" id="medicineCharges" value="0" readonly>
                                <small style="color: #666;">Calculated from selected medicines</small>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Other Charges ($)</label>
                                <input type="number" id="otherCharges" value="0">
                            </div>
                            <div class="form-group">
                                <label>Paid Amount ($)</label>
                                <input type="number" id="paidAmount" value="0">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Support Token Code</label>
                                <input type="text" id="tokenId" placeholder="Enter token code if issued">
                            </div>
                            <div class="form-group">
                                <label>Daily Code</label>
                                <div style="display: flex; gap: 10px;">
                                    <input type="text" id="dailyCode" placeholder="Enter today's code">
                                    <button type="button" id="verifyCodeBtn" class="action-btn" onclick="verifyDailyCode()" style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                        Verify
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Deduction Amount ($)</label>
                                <input type="number" id="tokenAmount" value="0" min="0">
                            </div>
                            <div class="form-group">
                                <label>Code Discount ($)</label>
                                <input type="number" id="codeDiscount" value="0" min="0">
                                <small style="color: #666;">Verified code gives 20% discount (editable)</small>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Token Description</label>
                            <input type="text" id="tokenDescription" placeholder="e.g. financial support">
                        </div>
                        <div class="form-group">
                            <label>Payment Method</label>
                            <select id="paymentMethod" required>
                                <option value="Cash">Cash</option>
                                <option value="Card">Card</option>
                                <option value="Insurance">Insurance</option>
                                <option value="Online">Online</option>
                            </select>
                        </div>
                        <button type="submit" class="submit-btn">Generate Bill</button>
                    </form>
                </div>
            </div>
        </div>

        <div id="billViewModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Bill Details</h3>
                    <button class="close-modal" onclick="closeModal('billViewModal')">&times;</button>
                </div>
                <div class="modal-body" id="billViewBody"></div>
            </div>
        </div>
    `;
}

async function loadBills() {
    try {
        const response = await fetch(`${API_URL}/bills`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const bills = await response.json();
        billsCache = bills;
        
        // Update stats
        const totalRevenue = bills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
        const paidBills = bills.filter(b => b.paymentStatus === 'Paid').length;
        const pendingBills = bills.filter(b => b.paymentStatus === 'Partial').length;
        const unpaidBills = bills.filter(b => b.paymentStatus === 'Unpaid').length;
        
        document.getElementById('totalRevenue').textContent = `$${totalRevenue}`;
        document.getElementById('paidBills').textContent = paidBills;
        document.getElementById('pendingBills').textContent = pendingBills;
        document.getElementById('unpaidBills').textContent = unpaidBills;
        
        const tbody = document.querySelector('#billsTable tbody');
        tbody.innerHTML = bills.map(bill => {
            const dueAmount = (bill.netAmount || bill.totalAmount || 0) - (bill.paidAmount || 0);
            const deduction = bill.financialToken?.amount || 0;
            const netTotal = bill.netAmount != null ? bill.netAmount : Math.max(0, (bill.totalAmount || 0) - deduction);
            return `
                <tr>
                    <td><strong>${bill.billId}</strong></td>
                    <td>${bill.patientId?.firstName || 'Unknown'} ${bill.patientId?.lastName || ''}</td>
                    <td>${new Date(bill.billDate).toLocaleDateString()}</td>
                    <td>$${bill.totalAmount || 0}</td>
                    <td>$${deduction}</td>
                    <td>$${netTotal}</td>
                    <td>$${bill.paidAmount || 0}</td>
                    <td>$${dueAmount}</td>
                    <td><span class="status-badge status-${bill.paymentStatus?.toLowerCase()}">${bill.paymentStatus || 'Unpaid'}</span></td>
                    <td>
                        <button class="action-btn btn-view" onclick="viewBill('${bill._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn btn-edit" onclick="editBill('${bill._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteBill('${bill._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading bills:', error);
        Toast.show('Error loading bills', 'error');
    }
}

async function showAddBillModal() {
    resetEditState();
    document.querySelector('#billModal .modal-header h3').textContent = 'Generate New Bill';
    document.querySelector('#billForm button[type="submit"]').textContent = 'Generate Bill';
    document.getElementById('billForm').reset();
    
    // Reset doctor information section
    document.getElementById('doctorInfoSection').style.display = 'none';
    document.getElementById('selectedMedicinesContainer').innerHTML = '';
    document.getElementById('medicineCharges').value = '0';
    document.getElementById('billMedicineSelect').innerHTML = '<option value="">Loading medicines...</option>';
    
    // Reset verify button and discount field
    const verifyBtn = document.getElementById('verifyCodeBtn');
    verifyBtn.textContent = 'Verify';
    verifyBtn.style.background = '#3498db';
    verifyBtn.disabled = false;
    document.getElementById('codeDiscount').readOnly = true;
    document.getElementById('codeDiscount').value = '0';
    
    document.getElementById('billModal').style.display = 'flex';
    
    try {
        const [patientsRes, medicinesRes] = await Promise.all([
            fetch(`${API_URL}/patients`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch(`${API_URL}/medicines`, { headers: { 'Authorization': `Bearer ${authToken}` } })
        ]);

        const [patients, medicines] = await Promise.all([patientsRes.json(), medicinesRes.json()]);
        patientsCache = patients;
        billingMedicinesCache = medicines;

        const patientSelect = document.getElementById('billPatientSelect');
        patientSelect.innerHTML = '<option value="">Select Patient</option>' +
            patients.map(p => `<option value="${p._id}">${p.patientId} - ${p.firstName} ${p.lastName}</option>`).join('');

        const medicineSelect = document.getElementById('billMedicineSelect');
        medicineSelect.innerHTML = '<option value="">Select medicines</option>' +
            medicines.map(m => `<option value="${m._id}">${m.name} - $${m.price} (${m.stockQuantity} available)</option>`).join('');
    } catch (error) {
        console.error('Error loading patients or medicines:', error);
    }
}

async function handleAddBill(e) {
    e.preventDefault();
    
    const items = Array.from(document.querySelectorAll('.selected-medicine-row')).map(row => {
        return {
            medicineId: row.dataset.id,
            name: row.querySelector('.selected-medicine-name').textContent,
            quantity: parseInt(row.querySelector('.selected-medicine-qty').value, 10) || 1,
            unitPrice: parseFloat(row.dataset.price) || 0,
            amount: parseInt(row.querySelector('.selected-medicine-qty').value, 10) * parseFloat(row.dataset.price)
        };
    });

    const medicineCharges = items.reduce((sum, item) => sum + item.amount, 0);

    const billData = {
        patientId: document.getElementById('billPatientSelect').value,
        appointmentId: document.getElementById('billAppointmentSelect').value || undefined,
        consultationFee: parseFloat(document.getElementById('consultationFee').value) || 0,
        medicineCharges,
        otherCharges: parseFloat(document.getElementById('otherCharges').value) || 0,
        paidAmount: parseFloat(document.getElementById('paidAmount').value) || 0,
        paymentMethod: document.getElementById('paymentMethod').value,
        paymentStatus: 'Unpaid',
        items,
        financialToken: {
            tokenId: document.getElementById('tokenId').value.trim(),
            amount: parseFloat(document.getElementById('tokenAmount').value) || 0,
            description: document.getElementById('tokenDescription').value.trim()
        },
        dailyCode: {
            providedCode: document.getElementById('dailyCode').value.trim(),
            discountAmount: parseFloat(document.getElementById('codeDiscount').value) || 0
        }
    };
    
    try {
        const method = currentEdit.type === 'bill' && currentEdit.id ? 'PUT' : 'POST';
        const url = method === 'PUT' ? `${API_URL}/bills/${currentEdit.id}` : `${API_URL}/bills`;
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(billData)
        });
        
        if (response.ok) {
            Toast.show(currentEdit.type === 'bill' ? 'Bill updated successfully' : 'Bill generated successfully', 'success');
            closeModal('billModal');
            document.getElementById('billForm').reset();
            document.getElementById('doctorInfoSection').style.display = 'none';
            document.getElementById('selectedMedicinesContainer').innerHTML = '';
            document.getElementById('medicineCharges').value = '0';
            resetEditState();
            document.querySelector('#billModal .modal-header h3').textContent = 'Generate New Bill';
            document.querySelector('#billForm button[type="submit"]').textContent = 'Generate Bill';
            loadBills();
        } else {
            const error = await response.json();
            Toast.show(error.message, 'error');
        }
    } catch (error) {
        console.error('Error saving bill:', error);
        Toast.show('Error saving bill', 'error');
    }
}

async function loadPatientAppointments() {
    const patientId = document.getElementById('billPatientSelect').value;
    const appointmentSelect = document.getElementById('billAppointmentSelect');
    const doctorInfoSection = document.getElementById('doctorInfoSection');
    
    if (!patientId) {
        appointmentSelect.innerHTML = '<option value="">Select appointment to auto-fill consultation fee</option>';
        doctorInfoSection.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/appointments`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const appointments = await response.json();
        
        // Filter appointments for selected patient and completed status
        const patientAppointments = appointments.filter(apt => 
            apt.patientId._id === patientId && apt.status === 'Completed'
        );
        
        if (patientAppointments.length === 0) {
            appointmentSelect.innerHTML = '<option value="">No completed appointments found for this patient</option>';
            doctorInfoSection.style.display = 'none';
            return;
        }
        
        // Sort appointments by date (most recent first)
        patientAppointments.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
        
        appointmentSelect.innerHTML = '<option value="">Select appointment to auto-fill consultation fee</option>' +
            patientAppointments.map(apt => 
                `<option value="${apt._id}">Appointment on ${new Date(apt.appointmentDate).toLocaleDateString()} with Dr. ${apt.doctorId.firstName} ${apt.doctorId.lastName}</option>`
            ).join('');
        
        // Auto-select the most recent appointment
        if (patientAppointments.length > 0) {
            const mostRecentAppointment = patientAppointments[0];
            appointmentSelect.value = mostRecentAppointment._id;
            
            // Auto-fill doctor information and fee
            await displayDoctorInfo(mostRecentAppointment);
        }
        
    } catch (error) {
        console.error('Error loading appointments:', error);
        appointmentSelect.innerHTML = '<option value="">Error loading appointments</option>';
        doctorInfoSection.style.display = 'none';
    }
}

async function toggleDoctorAppointments(doctorId) {
    const appointmentsRow = document.getElementById(`appointments-${doctorId}`);
    const expandBtn = document.querySelector(`[data-doctor-id="${doctorId}"] .expand-btn i`);
    
    if (appointmentsRow.style.display === 'none' || appointmentsRow.style.display === '') {
        // Show appointments
        appointmentsRow.style.display = 'table-row';
        expandBtn.className = 'fas fa-chevron-up';
        await loadDoctorTodayAppointments(doctorId);
    } else {
        // Hide appointments
        appointmentsRow.style.display = 'none';
        expandBtn.className = 'fas fa-chevron-down';
    }
}

async function loadDoctorTodayAppointments(doctorId) {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch appointments for this doctor today
        const response = await fetch(`${API_URL}/appointments?doctorId=${doctorId}&date=${today}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const appointments = await response.json();
        
        // Count pending and completed
        const pendingCount = appointments.filter(apt => apt.status === 'Scheduled').length;
        const completedCount = appointments.filter(apt => apt.status === 'Completed').length;
        
        document.getElementById(`pending-count-${doctorId}`).textContent = pendingCount;
        document.getElementById(`completed-count-${doctorId}`).textContent = completedCount;
        
        // Display appointments list
        const appointmentsList = document.getElementById(`appointments-list-${doctorId}`);
        if (appointments.length === 0) {
            appointmentsList.innerHTML = '<p class="no-appointments">No appointments scheduled for today.</p>';
            return;
        }
        
        appointmentsList.innerHTML = appointments.map(appointment => `
            <div class="appointment-item ${appointment.status.toLowerCase()}" data-appointment-id="${appointment._id}">
                <div class="appointment-header">
                    <div class="appointment-info">
                        <span class="appointment-id">${appointment.appointmentId}</span>
                        <span class="patient-name">${appointment.patientId?.firstName || 'Unknown'} ${appointment.patientId?.lastName || ''}</span>
                        <span class="appointment-time">${appointment.appointmentTime || 'N/A'}</span>
                        <span class="status-badge status-${appointment.status.toLowerCase()}">${appointment.status}</span>
                    </div>
                    ${appointment.status === 'Scheduled' ? `
                        <button class="consult-btn" onclick="startConsultation('${appointment._id}')">
                            <i class="fas fa-stethoscope"></i> Start Consultation
                        </button>
                    ` : appointment.status === 'Completed' ? `
                        <button class="view-consultation-btn" onclick="viewConsultation('${appointment._id}')">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                    ` : ''}
                </div>
                ${appointment.status === 'Scheduled' ? `
                    <div class="consultation-form" id="consultation-form-${appointment._id}" style="display: none;">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Symptoms</label>
                                <textarea id="symptoms-${appointment._id}" rows="2" placeholder="Describe patient symptoms...">${appointment.symptoms || ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label>Diagnosis</label>
                                <textarea id="diagnosis-${appointment._id}" rows="2" placeholder="Enter diagnosis...">${appointment.diagnosis || ''}</textarea>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Prescribe Medicines</label>
                            <div class="medicine-search-container">
                                <input type="text" id="medicine-search-${appointment._id}" placeholder="Search medicines..." onkeyup="filterMedicines('${appointment._id}', this.value)">
                                <div class="medicine-dropdown" id="medicine-dropdown-${appointment._id}" style="display: none;">
                                    <!-- Medicines will be populated here -->
                                </div>
                            </div>
                            <div class="selected-medicines" id="selected-medicines-${appointment._id}">
                                <!-- Selected medicines will appear here -->
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Additional Notes</label>
                            <textarea id="notes-${appointment._id}" rows="2" placeholder="Additional notes...">${appointment.notes || ''}</textarea>
                        </div>
                        <div class="consultation-actions">
                            <button class="action-btn btn-save" onclick="saveConsultation('${appointment._id}')">
                                <i class="fas fa-save"></i> Save Consultation
                            </button>
                            <button class="action-btn btn-cancel" onclick="cancelConsultation('${appointment._id}')">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading doctor appointments:', error);
        Toast.show('Error loading appointments', 'error');
    }
}

async function displayDoctorInfo(appointment) {
    const doctorInfoSection = document.getElementById('doctorInfoSection');
    const selectedDoctorName = document.getElementById('selectedDoctorName');
    const selectedDoctorSpecialization = document.getElementById('selectedDoctorSpecialization');
    const selectedDoctorFee = document.getElementById('selectedDoctorFee');
    const selectedAppointmentDate = document.getElementById('selectedAppointmentDate');
    const consultationFeeInput = document.getElementById('consultationFee');
    
    if (appointment && appointment.doctorId) {
        selectedDoctorName.textContent = `Dr. ${appointment.doctorId.firstName} ${appointment.doctorId.lastName}`;
        selectedDoctorSpecialization.textContent = appointment.doctorId.specialization || 'Not specified';
        selectedDoctorFee.textContent = appointment.doctorId.consultationFee || '0';
        selectedAppointmentDate.textContent = new Date(appointment.appointmentDate).toLocaleDateString();
        
        // Auto-fill consultation fee
        consultationFeeInput.value = appointment.doctorId.consultationFee || '0';
        consultationFeeInput.readOnly = true;
        
        doctorInfoSection.style.display = 'block';
        Toast.show('Doctor information and consultation fee auto-filled', 'success');
    } else {
        doctorInfoSection.style.display = 'none';
        consultationFeeInput.value = '0';
        consultationFeeInput.readOnly = false;
    }
}

async function autoFillConsultationFee() {
    const appointmentId = document.getElementById('billAppointmentSelect').value;
    const consultationFeeInput = document.getElementById('consultationFee');
    
    if (!appointmentId) {
        consultationFeeInput.value = '0';
        consultationFeeInput.readOnly = false;
        document.getElementById('doctorInfoSection').style.display = 'none';
        // Clear any auto-selected medicines
        const medicineSelect = document.getElementById('billMedicineSelect');
        Array.from(medicineSelect.options).forEach(option => option.selected = false);
        handleMedicineSelectionChange();
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const appointment = await response.json();
            await displayDoctorInfo(appointment);
        } else {
            consultationFeeInput.value = '0';
            consultationFeeInput.readOnly = false;
            document.getElementById('doctorInfoSection').style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching appointment details:', error);
        consultationFeeInput.readOnly = false;
        document.getElementById('doctorInfoSection').style.display = 'none';
    }
}

async function verifyDailyCode() {
    const codeInput = document.getElementById('dailyCode');
    const discountInput = document.getElementById('codeDiscount');
    const verifyBtn = document.getElementById('verifyCodeBtn');
    
    const providedCode = codeInput.value.trim();
    if (!providedCode) {
        Toast.show('Please enter a code to verify', 'error');
        return;
    }
    
    // Disable button during verification
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    
    try {
        const response = await fetch(`${API_URL}/daily-codes/today`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.code && data.code === providedCode) {
                // Calculate 20% discount of total amount
                const consultationFee = parseFloat(document.getElementById('consultationFee').value) || 0;
                const medicineCharges = parseFloat(document.getElementById('medicineCharges').value) || 0;
                const otherCharges = parseFloat(document.getElementById('otherCharges').value) || 0;
                const totalAmount = consultationFee + medicineCharges + otherCharges;
                const discountAmount = Math.round(totalAmount * 0.20); // 20% discount
                
                discountInput.value = discountAmount;
                discountInput.readOnly = false; // Allow editing after verification
                
                Toast.show(`Code verified! 20% discount applied: $${discountAmount}`, 'success');
                verifyBtn.textContent = '✓ Verified';
                verifyBtn.style.background = '#27ae60';
            } else {
                discountInput.value = '0';
                Toast.show('Invalid code. Please check today\'s code.', 'error');
                verifyBtn.textContent = '✗ Invalid';
                verifyBtn.style.background = '#e74c3c';
            }
        } else {
            Toast.show('Unable to verify code. Please try again.', 'error');
            verifyBtn.textContent = 'Verify';
            verifyBtn.style.background = '#3498db';
        }
    } catch (error) {
        console.error('Error verifying code:', error);
        Toast.show('Error verifying code', 'error');
        verifyBtn.textContent = 'Verify';
        verifyBtn.style.background = '#3498db';
    } finally {
        verifyBtn.disabled = false;
        // Re-enable button after 3 seconds
        setTimeout(() => {
            verifyBtn.textContent = 'Verify';
            verifyBtn.style.background = '#3498db';
        }, 3000);
    }
}

// Medicines Module
function getMedicinesHTML() {
    return `
        <div class="page-header">
            <h2><i class="fas fa-pills"></i> Medicine Inventory</h2>
            <button class="login-btn" onclick="showAddMedicineModal()">
                <i class="fas fa-plus"></i> Add Medicine
            </button>
        </div>
        
        <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-capsules" style="color: #3498db;"></i>
                </div>
                <div class="stat-number" id="totalMedicines">0</div>
                <div class="stat-label">Total Medicines</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>
                </div>
                <div class="stat-number" id="lowStock">0</div>
                <div class="stat-label">Low Stock</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-dollar-sign" style="color: #27ae60;"></i>
                </div>
                <div class="stat-number" id="inventoryValue">$0</div>
                <div class="stat-label">Inventory Value</div>
            </div>
        </div>
        
        <div class="table-responsive">
            <table id="medicinesTable">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Expiry Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>

        <div id="medicineModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Medicine</h3>
                    <button class="close-modal" onclick="closeModal('medicineModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="medicineForm" onsubmit="handleAddMedicine(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Medicine Name</label>
                                <input type="text" id="medicineName" required>
                            </div>
                            <div class="form-group">
                                <label>Category</label>
                                <input type="text" id="medicineCategory" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Price ($)</label>
                                <input type="number" id="medicinePrice" required>
                            </div>
                            <div class="form-group">
                                <label>Stock Quantity</label>
                                <input type="number" id="medicineStock" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Expiry Date</label>
                                <input type="date" id="medicineExpiry">
                            </div>
                            <div class="form-group">
                                <label>Manufacturer</label>
                                <input type="text" id="medicineManufacturer">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="medicineDescription" rows="3"></textarea>
                        </div>
                        <button type="submit" class="submit-btn">Add Medicine</button>
                    </form>
                </div>
            </div>
        </div>

        <div id="medicineViewModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Medicine Details</h3>
                    <button class="close-modal" onclick="closeModal('medicineViewModal')">&times;</button>
                </div>
                <div class="modal-body" id="medicineViewBody"></div>
            </div>
        </div>
    `;
}

async function loadMedicines() {
    try {
        const response = await fetch(`${API_URL}/medicines`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const medicines = await response.json();
        medicinesCache = medicines;
        
        // Update stats
        document.getElementById('totalMedicines').textContent = medicines.length;
        const lowStock = medicines.filter(m => m.stockQuantity < 10).length;
        document.getElementById('lowStock').textContent = lowStock;
        const inventoryValue = medicines.reduce((sum, m) => sum + (m.price * m.stockQuantity), 0);
        document.getElementById('inventoryValue').textContent = `$${inventoryValue}`;
        
        const tbody = document.querySelector('#medicinesTable tbody');
        tbody.innerHTML = medicines.map(medicine => `
            <tr>
                <td><strong>${medicine.medicineId}</strong></td>
                <td>${medicine.name}</td>
                <td>${medicine.category}</td>
                <td>$${medicine.price}</td>
                <td>
                    <span style="color: ${medicine.stockQuantity < 10 ? '#e74c3c' : '#27ae60'}; font-weight: 600;">
                        ${medicine.stockQuantity}
                    </span>
                </td>
                <td>${medicine.expiryDate ? new Date(medicine.expiryDate).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <button class="action-btn btn-view" onclick="viewMedicine('${medicine._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-edit" onclick="editMedicine('${medicine._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteMedicine('${medicine._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading medicines:', error);
        Toast.show('Error loading medicines', 'error');
    }
}

async function handleAddMedicine(e) {
    e.preventDefault();
    
    const medicineData = {
        name: document.getElementById('medicineName').value,
        category: document.getElementById('medicineCategory').value,
        price: parseFloat(document.getElementById('medicinePrice').value),
        stockQuantity: parseInt(document.getElementById('medicineStock').value),
        expiryDate: document.getElementById('medicineExpiry').value,
        manufacturer: document.getElementById('medicineManufacturer').value,
        description: document.getElementById('medicineDescription').value
    };
    
    try {
        const method = currentEdit.type === 'medicine' && currentEdit.id ? 'PUT' : 'POST';
        const url = method === 'PUT' ? `${API_URL}/medicines/${currentEdit.id}` : `${API_URL}/medicines`;
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(medicineData)
        });
        
        if (response.ok) {
            Toast.show(currentEdit.type === 'medicine' ? 'Medicine updated successfully' : 'Medicine added successfully', 'success');
            closeModal('medicineModal');
            document.getElementById('medicineForm').reset();
            resetEditState();
            document.querySelector('#medicineModal .modal-header h3').textContent = 'Add New Medicine';
            document.querySelector('#medicineForm button[type="submit"]').textContent = 'Add Medicine';
            loadMedicines();
        } else {
            const error = await response.json();
            Toast.show(error.message, 'error');
        }
    } catch (error) {
        console.error('Error saving medicine:', error);
        Toast.show('Error saving medicine', 'error');
    }
}

// Staff Module
function getStaffHTML() {
    return `
        <div class="page-header">
            <h2><i class="fas fa-user-tie"></i> Staff Management</h2>
            <button class="login-btn" onclick="showAddStaffModal()">
                <i class="fas fa-plus"></i> Add Staff
            </button>
        </div>
        
        <div class="table-responsive">
            <table id="staffTable">
                <thead>
                    <tr>
                        <th>Staff ID</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Contact</th>
                        <th>Shift</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>

        <div id="staffModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Staff</h3>
                    <button class="close-modal" onclick="closeModal('staffModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="staffForm" onsubmit="handleAddStaff(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label>First Name</label>
                                <input type="text" id="staffFirstName" required>
                            </div>
                            <div class="form-group">
                                <label>Last Name</label>
                                <input type="text" id="staffLastName" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Role</label>
                                <select id="staffRole" required>
                                    <option value="">Select Role</option>
                                    <option value="Nurse">Nurse</option>
                                    <option value="Receptionist">Receptionist</option>
                                    <option value="Technician">Technician</option>
                                    <option value="Pharmacist">Pharmacist</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Department</label>
                                <input type="text" id="staffDepartment">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Contact Number</label>
                                <input type="tel" id="staffContact" required>
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="staffEmail" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Joining Date</label>
                                <input type="date" id="joiningDate" required>
                            </div>
                            <div class="form-group">
                                <label>Shift</label>
                                <select id="staffShift">
                                    <option value="Morning">Morning</option>
                                    <option value="Evening">Evening</option>
                                    <option value="Night">Night</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Salary ($)</label>
                            <input type="number" id="staffSalary">
                        </div>
                        <button type="submit" class="submit-btn">Add Staff</button>
                    </form>
                </div>
            </div>
        </div>

        <div id="staffViewModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Staff Details</h3>
                    <button class="close-modal" onclick="closeModal('staffViewModal')">&times;</button>
                </div>
                <div class="modal-body" id="staffViewBody"></div>
            </div>
        </div>
    `;
}

async function loadStaff() {
    try {
        const response = await fetch(`${API_URL}/staff`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const staff = await response.json();
        staffCache = staff;
        
        const tbody = document.querySelector('#staffTable tbody');
        tbody.innerHTML = staff.map(member => `
            <tr>
                <td><strong>${member.staffId}</strong></td>
                <td>${member.firstName} ${member.lastName}</td>
                <td>${member.role}</td>
                <td>${member.department || 'N/A'}</td>
                <td>${member.contactNumber}</td>
                <td>${member.shift || 'N/A'}</td>
                <td>
                    <button class="action-btn btn-view" onclick="viewStaff('${member._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-edit" onclick="editStaff('${member._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteStaff('${member._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading staff:', error);
        Toast.show('Error loading staff', 'error');
    }
}

async function handleAddStaff(e) {
    e.preventDefault();
    
    const staffData = {
        firstName: document.getElementById('staffFirstName').value,
        lastName: document.getElementById('staffLastName').value,
        role: document.getElementById('staffRole').value,
        department: document.getElementById('staffDepartment').value,
        contactNumber: document.getElementById('staffContact').value,
        email: document.getElementById('staffEmail').value,
        joiningDate: document.getElementById('joiningDate').value,
        shift: document.getElementById('staffShift').value,
        salary: parseFloat(document.getElementById('staffSalary').value) || 0
    };
    
    try {
        const method = currentEdit.type === 'staff' && currentEdit.id ? 'PUT' : 'POST';
        const url = method === 'PUT' ? `${API_URL}/staff/${currentEdit.id}` : `${API_URL}/staff`;
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(staffData)
        });
        
        if (response.ok) {
            Toast.show(currentEdit.type === 'staff' ? 'Staff updated successfully' : 'Staff added successfully', 'success');
            closeModal('staffModal');
            document.getElementById('staffForm').reset();
            resetEditState();
            document.querySelector('#staffModal .modal-header h3').textContent = 'Add New Staff';
            document.querySelector('#staffForm button[type="submit"]').textContent = 'Add Staff';
            loadStaff();
        } else {
            const error = await response.json();
            Toast.show(error.message, 'error');
        }
    } catch (error) {
        console.error('Error saving staff:', error);
        Toast.show('Error saving staff', 'error');
    }
}

// Modal Functions
function showAddPatientModal() {
    resetEditState();
    document.querySelector('#patientModal .modal-header h3').textContent = 'Add New Patient';
    document.querySelector('#patientForm button[type="submit"]').textContent = 'Add Patient';
    document.getElementById('patientForm').reset();
    document.getElementById('patientModal').style.display = 'flex';
}

function showAddDoctorModal() {
    resetEditState();
    document.querySelector('#doctorModal .modal-header h3').textContent = 'Add New Doctor';
    document.querySelector('#doctorForm button[type="submit"]').textContent = 'Add Doctor';
    document.getElementById('doctorForm').reset();
    document.getElementById('doctorModal').style.display = 'flex';
}

function showAddMedicineModal() {
    resetEditState();
    document.querySelector('#medicineModal .modal-header h3').textContent = 'Add New Medicine';
    document.querySelector('#medicineForm button[type="submit"]').textContent = 'Add Medicine';
    document.getElementById('medicineForm').reset();
    document.getElementById('medicineModal').style.display = 'flex';
}

function showAddStaffModal() {
    resetEditState();
    document.querySelector('#staffModal .modal-header h3').textContent = 'Add New Staff';
    document.querySelector('#staffForm button[type="submit"]').textContent = 'Add Staff';
    document.getElementById('staffForm').reset();
    document.getElementById('staffModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Delete Functions
async function deletePatient(id) {
    if (confirm('Are you sure you want to delete this patient?')) {
        try {
            const response = await fetch(`${API_URL}/patients/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (response.ok) {
                Toast.show('Patient deleted successfully', 'success');
                loadPatients();
            } else {
                Toast.show('Error deleting patient', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            Toast.show('Error deleting patient', 'error');
        }
    }
}

async function deleteDoctor(id) {
    if (confirm('Are you sure you want to delete this doctor?')) {
        try {
            const response = await fetch(`${API_URL}/doctors/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (response.ok) {
                Toast.show('Doctor deleted successfully', 'success');
                loadDoctors();
            } else {
                Toast.show('Error deleting doctor', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            Toast.show('Error deleting doctor', 'error');
        }
    }
}

async function deleteAppointment(id) {
    if (confirm('Are you sure you want to delete this appointment?')) {
        try {
            const response = await fetch(`${API_URL}/appointments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (response.ok) {
                Toast.show('Appointment deleted successfully', 'success');
                loadAppointments();
            } else {
                Toast.show('Error deleting appointment', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            Toast.show('Error deleting appointment', 'error');
        }
    }
}

async function deleteMedicine(id) {
    if (confirm('Are you sure you want to delete this medicine?')) {
        try {
            const response = await fetch(`${API_URL}/medicines/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (response.ok) {
                Toast.show('Medicine deleted successfully', 'success');
                loadMedicines();
            } else {
                Toast.show('Error deleting medicine', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            Toast.show('Error deleting medicine', 'error');
        }
    }
}

async function deleteBill(id) {
    if (confirm('Are you sure you want to delete this bill?')) {
        try {
            const response = await fetch(`${API_URL}/bills/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (response.ok) {
                Toast.show('Bill deleted successfully', 'success');
                loadBills();
            } else {
                Toast.show('Error deleting bill', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            Toast.show('Error deleting bill', 'error');
        }
    }
}

async function deleteStaff(id) {
    if (confirm('Are you sure you want to delete this staff member?')) {
        try {
            const response = await fetch(`${API_URL}/staff/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (response.ok) {
                Toast.show('Staff deleted successfully', 'success');
                loadStaff();
            } else {
                Toast.show('Error deleting staff', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            Toast.show('Error deleting staff', 'error');
        }
    }
}

// Edit / View Helpers
function resetEditState() {
    currentEdit = { type: null, id: null };
}

function showMessageOnMissing(item) {
    Toast.show(`${item} data not found`, 'error');
}

function editPatient(id) {
    const patient = patientsCache.find(p => p._id === id);
    if (!patient) return showMessageOnMissing('Patient');

    currentEdit = { type: 'patient', id };
    document.querySelector('#patientModal .modal-header h3').textContent = 'Edit Patient';
    document.querySelector('#patientForm button[type="submit"]').textContent = 'Save Changes';
    document.getElementById('firstName').value = patient.firstName || '';
    document.getElementById('lastName').value = patient.lastName || '';
    document.getElementById('dateOfBirth').value = patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '';
    document.getElementById('gender').value = patient.gender || '';
    document.getElementById('bloodGroup').value = patient.bloodGroup || '';
    document.getElementById('contactNumber').value = patient.contactNumber || '';
    document.getElementById('email').value = patient.email || '';
    document.getElementById('patientModal').style.display = 'flex';
}

function viewPatient(id) {
    const patient = patientsCache.find(p => p._id === id);
    if (!patient) return showMessageOnMissing('Patient');

    const body = document.getElementById('patientViewBody');
    body.innerHTML = `
        <p><strong>Patient ID:</strong> ${patient.patientId}</p>
        <p><strong>Name:</strong> ${patient.firstName} ${patient.lastName}</p>
        <p><strong>DOB:</strong> ${patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Gender:</strong> ${patient.gender || 'N/A'}</p>
        <p><strong>Blood Group:</strong> ${patient.bloodGroup || 'N/A'}</p>
        <p><strong>Contact:</strong> ${patient.contactNumber || 'N/A'}</p>
        <p><strong>Email:</strong> ${patient.email || 'N/A'}</p>
    `;
    document.getElementById('patientViewModal').style.display = 'flex';
}

function editDoctor(id) {
    const doctor = doctorsCache.find(d => d._id === id);
    if (!doctor) return showMessageOnMissing('Doctor');

    currentEdit = { type: 'doctor', id };
    document.querySelector('#doctorModal .modal-header h3').textContent = 'Edit Doctor';
    document.querySelector('#doctorForm button[type="submit"]').textContent = 'Save Changes';
    document.getElementById('docFirstName').value = doctor.firstName || '';
    document.getElementById('docLastName').value = doctor.lastName || '';
    document.getElementById('specialization').value = doctor.specialization || '';
    document.getElementById('department').value = doctor.department || '';
    document.getElementById('docContactNumber').value = doctor.contactNumber || '';
    document.getElementById('docEmail').value = doctor.email || '';
    document.getElementById('experience').value = doctor.experience || 0;
    document.getElementById('consultationFee').value = doctor.consultationFee || 0;
    document.getElementById('qualification').value = (doctor.qualification || []).join(', ');
    document.getElementById('doctorModal').style.display = 'flex';
}

function viewDoctor(id) {
    const doctor = doctorsCache.find(d => d._id === id);
    if (!doctor) return showMessageOnMissing('Doctor');

    const body = document.getElementById('doctorViewBody');
    body.innerHTML = `
        <p><strong>Doctor ID:</strong> ${doctor.doctorId}</p>
        <p><strong>Name:</strong> Dr. ${doctor.firstName} ${doctor.lastName}</p>
        <p><strong>Specialization:</strong> ${doctor.specialization || 'N/A'}</p>
        <p><strong>Department:</strong> ${doctor.department || 'N/A'}</p>
        <p><strong>Contact:</strong> ${doctor.contactNumber || 'N/A'}</p>
        <p><strong>Email:</strong> ${doctor.email || 'N/A'}</p>
        <p><strong>Fee:</strong> $${doctor.consultationFee || 0}</p>
        <p><strong>Qualifications:</strong> ${(doctor.qualification || []).join(', ') || 'N/A'}</p>
    `;
    document.getElementById('doctorViewModal').style.display = 'flex';
}

async function editAppointment(id) {
    const appointment = appointmentsCache.find(a => a._id === id);
    if (!appointment) return showMessageOnMissing('Appointment');

    currentEdit = { type: 'appointment', id };
    document.querySelector('#appointmentModal .modal-header h3').textContent = 'Edit Appointment';
    document.querySelector('#appointmentForm button[type="submit"]').textContent = 'Save Changes';
    document.getElementById('symptoms').value = appointment.symptoms || '';
    document.getElementById('diagnosis').value = appointment.diagnosis || '';
    document.getElementById('notes').value = appointment.notes || '';
    document.getElementById('appointmentDate').value = appointment.appointmentDate ? new Date(appointment.appointmentDate).toISOString().split('T')[0] : '';
    document.getElementById('appointmentTime').value = appointment.appointmentTime || '';
    await populateAppointmentModalOptions();
    document.getElementById('patientSelect').value = appointment.patientId?._id || appointment.patientId || '';
    document.getElementById('doctorSelect').value = appointment.doctorId?._id || appointment.doctorId || '';
    document.getElementById('statusSelect').value = appointment.status || 'Scheduled';
    document.getElementById('appointmentModal').style.display = 'flex';
}

function viewAppointment(id) {
    const appointment = appointmentsCache.find(a => a._id === id);
    if (!appointment) return showMessageOnMissing('Appointment');

    const body = document.getElementById('appointmentViewBody');
    body.innerHTML = `
        <p><strong>Appointment ID:</strong> ${appointment.appointmentId}</p>
        <p><strong>Patient:</strong> ${appointment.patientId?.firstName || 'Unknown'} ${appointment.patientId?.lastName || ''}</p>
        <p><strong>Doctor:</strong> Dr. ${appointment.doctorId?.firstName || 'Unknown'} ${appointment.doctorId?.lastName || ''}</p>
        <p><strong>Date:</strong> ${appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Time:</strong> ${appointment.appointmentTime || 'N/A'}</p>
        <p><strong>Status:</strong> ${appointment.status || 'Scheduled'}</p>
        <p><strong>Symptoms:</strong> ${appointment.symptoms || 'N/A'}</p>
        <p><strong>Diagnosis:</strong> ${appointment.diagnosis || 'N/A'}</p>
        <p><strong>Prescription:</strong> ${appointment.prescription || 'N/A'}</p>
        <p><strong>Notes:</strong> ${appointment.notes || 'N/A'}</p>
    `;
    document.getElementById('appointmentViewModal').style.display = 'flex';
}

function editMedicine(id) {
    const medicine = medicinesCache.find(m => m._id === id);
    if (!medicine) return showMessageOnMissing('Medicine');

    currentEdit = { type: 'medicine', id };
    document.querySelector('#medicineModal .modal-header h3').textContent = 'Edit Medicine';
    document.querySelector('#medicineForm button[type="submit"]').textContent = 'Save Changes';
    document.getElementById('medicineName').value = medicine.name || '';
    document.getElementById('medicineCategory').value = medicine.category || '';
    document.getElementById('medicinePrice').value = medicine.price || 0;
    document.getElementById('medicineStock').value = medicine.stockQuantity || 0;
    document.getElementById('medicineExpiry').value = medicine.expiryDate ? new Date(medicine.expiryDate).toISOString().split('T')[0] : '';
    document.getElementById('medicineManufacturer').value = medicine.manufacturer || '';
    document.getElementById('medicineDescription').value = medicine.description || '';
    document.getElementById('medicineModal').style.display = 'flex';
}

function viewMedicine(id) {
    const medicine = medicinesCache.find(m => m._id === id);
    if (!medicine) return showMessageOnMissing('Medicine');

    const body = document.getElementById('medicineViewBody');
    body.innerHTML = `
        <p><strong>Medicine ID:</strong> ${medicine.medicineId}</p>
        <p><strong>Name:</strong> ${medicine.name}</p>
        <p><strong>Category:</strong> ${medicine.category}</p>
        <p><strong>Price:</strong> $${medicine.price}</p>
        <p><strong>Stock:</strong> ${medicine.stockQuantity}</p>
        <p><strong>Expiry Date:</strong> ${medicine.expiryDate ? new Date(medicine.expiryDate).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Manufacturer:</strong> ${medicine.manufacturer || 'N/A'}</p>
        <p><strong>Description:</strong> ${medicine.description || 'N/A'}</p>
    `;
    document.getElementById('medicineViewModal').style.display = 'flex';
}

function editStaff(id) {
    const member = staffCache.find(s => s._id === id);
    if (!member) return showMessageOnMissing('Staff');

    currentEdit = { type: 'staff', id };
    document.querySelector('#staffModal .modal-header h3').textContent = 'Edit Staff';
    document.querySelector('#staffForm button[type="submit"]').textContent = 'Save Changes';
    document.getElementById('staffFirstName').value = member.firstName || '';
    document.getElementById('staffLastName').value = member.lastName || '';
    document.getElementById('staffRole').value = member.role || '';
    document.getElementById('staffDepartment').value = member.department || '';
    document.getElementById('staffContact').value = member.contactNumber || '';
    document.getElementById('staffEmail').value = member.email || '';
    document.getElementById('joiningDate').value = member.joiningDate ? new Date(member.joiningDate).toISOString().split('T')[0] : '';
    document.getElementById('staffShift').value = member.shift || 'Morning';
    document.getElementById('staffSalary').value = member.salary || 0;
    document.getElementById('staffModal').style.display = 'flex';
}

function viewStaff(id) {
    const member = staffCache.find(s => s._id === id);
    if (!member) return showMessageOnMissing('Staff');

    const body = document.getElementById('staffViewBody');
    body.innerHTML = `
        <p><strong>Staff ID:</strong> ${member.staffId}</p>
        <p><strong>Name:</strong> ${member.firstName} ${member.lastName}</p>
        <p><strong>Role:</strong> ${member.role}</p>
        <p><strong>Department:</strong> ${member.department || 'N/A'}</p>
        <p><strong>Contact:</strong> ${member.contactNumber || 'N/A'}</p>
        <p><strong>Email:</strong> ${member.email || 'N/A'}</p>
        <p><strong>Joining Date:</strong> ${member.joiningDate ? new Date(member.joiningDate).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Shift:</strong> ${member.shift || 'N/A'}</p>
        <p><strong>Salary:</strong> $${member.salary || 0}</p>
    `;
    document.getElementById('staffViewModal').style.display = 'flex';
}

async function editBill(id) {
    const bill = billsCache.find(b => b._id === id);
    if (!bill) return showMessageOnMissing('Bill');

    currentEdit = { type: 'bill', id };
    document.querySelector('#billModal .modal-header h3').textContent = 'Edit Bill';
    document.querySelector('#billForm button[type="submit"]').textContent = 'Save Changes';
    
    document.getElementById('billForm').reset();
    document.getElementById('doctorInfoSection').style.display = 'none';
    document.getElementById('selectedMedicinesContainer').innerHTML = '';
    document.getElementById('medicineCharges').value = '0';

    // Populate form fields
    document.getElementById('consultationFee').value = bill.consultationFee || 0;
    document.getElementById('medicineCharges').value = bill.medicineCharges || 0;
    document.getElementById('otherCharges').value = bill.otherCharges || 0;
    document.getElementById('paidAmount').value = bill.paidAmount || 0;
    document.getElementById('tokenId').value = bill.financialToken?.tokenId || '';
    document.getElementById('tokenAmount').value = bill.financialToken?.amount || 0;
    document.getElementById('tokenDescription').value = bill.financialToken?.description || '';
    document.getElementById('paymentMethod').value = bill.paymentMethod || 'Cash';
    document.getElementById('dailyCode').value = bill.dailyCode?.providedCode || '';
    document.getElementById('codeDiscount').value = bill.dailyCode?.discountAmount || 0;

    try {
        const [patientsRes, medicinesRes] = await Promise.all([
            fetch(`${API_URL}/patients`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch(`${API_URL}/medicines`, { headers: { 'Authorization': `Bearer ${authToken}` } })
        ]);

        const [patients, medicines] = await Promise.all([patientsRes.json(), medicinesRes.json()]);
        patientsCache = patients;
        billingMedicinesCache = medicines;

        const patientSelect = document.getElementById('billPatientSelect');
        patientSelect.innerHTML = '<option value="">Select Patient</option>' +
            patients.map(p => `<option value="${p._id}">${p.patientId} - ${p.firstName} ${p.lastName}</option>`).join('');
        patientSelect.value = bill.patientId?._id || bill.patientId || '';

        const medicineSelect = document.getElementById('billMedicineSelect');
        medicineSelect.innerHTML = '<option value="">Select medicines</option>' +
            medicines.map(m => `<option value="${m._id}">${m.name} - $${m.price} (${m.stockQuantity} available)</option>`).join('');

        if (Array.isArray(bill.items) && bill.items.length > 0) {
            const selectedIds = bill.items.map(item => item.medicineId || item._id || '');
            Array.from(medicineSelect.options).forEach(option => {
                if (selectedIds.includes(option.value)) {
                    option.selected = true;
                }
            });
            handleMedicineSelectionChange();

            // Set quantities from bill items
            bill.items.forEach(item => {
                const row = document.querySelector(`.selected-medicine-row[data-id="${item.medicineId || item._id || ''}"]`);
                if (row) {
                    const qtyInput = row.querySelector('.selected-medicine-qty');
                    qtyInput.value = item.quantity || 1;
                }
            });
            updateMedicineCharges();
        }

        // Load appointments for the selected patient
        await loadPatientAppointments();

        // Set appointment if it exists
        if (bill.appointmentId) {
            const appointmentSelect = document.getElementById('billAppointmentSelect');
            appointmentSelect.value = bill.appointmentId._id || bill.appointmentId || '';
            if (appointmentSelect.value) {
                await autoFillConsultationFee();
            }
        }
    } catch (err) {
        console.error('Error preparing bill edit:', err);
    }

    document.getElementById('billModal').style.display = 'flex';
}

function viewBill(id) {
    const bill = billsCache.find(b => b._id === id);
    if (!bill) return showMessageOnMissing('Bill');

    const body = document.getElementById('billViewBody');
    body.innerHTML = `
        <p><strong>Bill ID:</strong> ${bill.billId}</p>
        <p><strong>Patient:</strong> ${bill.patientId?.firstName || 'Unknown'} ${bill.patientId?.lastName || ''}</p>
        <p><strong>Date:</strong> ${new Date(bill.billDate).toLocaleDateString()}</p>
        <p><strong>Consultation Fee:</strong> $${bill.consultationFee || 0}</p>
        <p><strong>Medicine Charges:</strong> $${bill.medicineCharges || 0}</p>
        ${bill.items?.length ? `<div style="margin: 10px 0; padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa;"><strong>Selected Medicines:</strong><ul style="margin: 8px 0 0 16px;">${bill.items.map(item => `<li>${item.description || 'Medicine'} x${item.quantity || 1} @ $${item.unitPrice?.toFixed(2) || 0} = $${item.amount?.toFixed(2) || 0}</li>`).join('')}</ul></div>` : ''}
        <p><strong>Other Charges:</strong> $${bill.otherCharges || 0}</p>
        <p><strong>Token Code:</strong> ${bill.financialToken?.tokenId || 'N/A'}</p>
        <p><strong>Token Deduction:</strong> $${bill.financialToken?.amount || 0}</p>
        <p><strong>Token Description:</strong> ${bill.financialToken?.description || 'N/A'}</p>
        <p><strong>Daily Code:</strong> ${bill.dailyCode?.providedCode || 'N/A'}</p>
        <p><strong>Code Verified:</strong> <span style="color: ${bill.dailyCode?.isVerified ? 'green' : 'red'};">${bill.dailyCode?.isVerified ? `Yes ($${bill.dailyCode?.discountAmount || 0} discount applied)` : 'No'}</span></p>
        <p><strong>Net Amount:</strong> $${bill.netAmount || 0}</p>
        <p><strong>Paid Amount:</strong> $${bill.paidAmount || 0}</p>
        <p><strong>Payment Method:</strong> ${bill.paymentMethod || 'N/A'}</p>
        <p><strong>Status:</strong> ${bill.paymentStatus || 'Unpaid'}</p>
        <button class="login-btn" onclick="toggleBillPaidStatus('${bill._id}')" style="margin-top: 15px;">
            Toggle Paid Status
        </button>
    `;
    document.getElementById('billViewModal').style.display = 'flex';
}

async function toggleBillPaidStatus(id) {
    const bill = billsCache.find(b => b._id === id);
    if (!bill) return showMessageOnMissing('Bill');

    const updatedStatus = bill.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    const updatedData = {
        consultationFee: bill.consultationFee || 0,
        medicineCharges: bill.medicineCharges || 0,
        otherCharges: bill.otherCharges || 0,
        paidAmount: bill.paidAmount || 0,
        paymentMethod: bill.paymentMethod || 'Cash',
        financialToken: bill.financialToken || { tokenId: '', amount: 0, description: '' }
    };

    if (updatedStatus === 'Paid') {
        updatedData.paidAmount = bill.netAmount || bill.totalAmount || 0;
    }

    try {
        const response = await fetch(`${API_URL}/bills/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            Toast.show(`Bill marked ${updatedStatus}`, 'success');
            loadBills();
            if (document.getElementById('billViewModal').style.display === 'flex') {
                viewBill(id);
            }
        } else {
            const error = await response.json();
            Toast.show(error.message, 'error');
        }
    } catch (error) {
        console.error('Error toggling bill status:', error);
        Toast.show('Unable to toggle bill status', 'error');
    }
}

// Daily Codes Module
function getDailyCodesHTML() {
    return `
        <div class="page-header">
            <h2><i class="fas fa-key"></i> Daily Codes Management</h2>
            <button class="login-btn" onclick="showAddDailyCodeModal()">
                <i class="fas fa-plus"></i> Generate Today's Code
            </button>
        </div>
        
        <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-calendar-day" style="color: #3498db;"></i>
                </div>
                <div class="stat-number" id="todayCode">N/A</div>
                <div class="stat-label">Today's Code</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-list" style="color: #e74c3c;"></i>
                </div>
                <div class="stat-number" id="totalCodes">0</div>
                <div class="stat-label">Total Codes</div>
            </div>
        </div>
        
        <div class="table-responsive">
            <table id="dailyCodesTable">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Code</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>

        <div id="dailyCodeModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Generate Daily Code</h3>
                    <button class="close-modal" onclick="closeModal('dailyCodeModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="dailyCodeForm" onsubmit="handleAddDailyCode(event)">
                        <div class="form-group">
                            <label>Code</label>
                            <input type="text" id="dailyCodeInput" placeholder="Enter 4-8 character code" required minlength="4" maxlength="8">
                            <small style="color: #666;">This code will be valid only for today</small>
                        </div>
                        <button type="submit" class="submit-btn">Generate Code</button>
                    </form>
                </div>
            </div>
        </div>
    `;
}

async function loadDailyCodes() {
    try {
        const response = await fetch(`${API_URL}/daily-codes`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const codes = await response.json();
            dailyCodesCache = codes;
            
            // Update stats
            const today = new Date().toDateString();
            const todayCode = codes.find(code => new Date(code.date).toDateString() === today);
            document.getElementById('todayCode').textContent = todayCode ? todayCode.code : 'Not Set';
            document.getElementById('totalCodes').textContent = codes.length;
            
            const tbody = document.querySelector('#dailyCodesTable tbody');
            tbody.innerHTML = codes.sort((a, b) => new Date(b.date) - new Date(a.date)).map(code => `
                <tr>
                    <td>${new Date(code.date).toLocaleDateString()}</td>
                    <td><code>${code.code}</code></td>
                    <td><span class="status-badge status-${code.isActive ? 'active' : 'inactive'}">${code.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>${new Date(code.createdAt).toLocaleDateString()}</td>
                    <td>
                        <button class="action-btn btn-edit" onclick="toggleCodeStatus('${code._id}', ${code.isActive})">
                            <i class="fas fa-${code.isActive ? 'ban' : 'check'}"></i>
                        </button>
                        <button class="action-btn btn-delete" onclick="deleteDailyCode('${code._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading daily codes:', error);
        Toast.show('Error loading daily codes', 'error');
    }
}

async function showAddDailyCodeModal() {
    document.querySelector('#dailyCodeModal .modal-header h3').textContent = 'Generate Today\'s Code';
    document.getElementById('dailyCodeForm').reset();
    document.getElementById('dailyCodeModal').style.display = 'flex';
}

async function handleAddDailyCode(e) {
    e.preventDefault();
    
    const code = document.getElementById('dailyCodeInput').value.trim();
    
    try {
        const response = await fetch(`${API_URL}/daily-codes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ code })
        });
        
        if (response.ok) {
            Toast.show('Daily code generated successfully', 'success');
            closeModal('dailyCodeModal');
            loadDailyCodes();
        } else {
            const error = await response.json();
            Toast.show(error.message, 'error');
        }
    } catch (error) {
        console.error('Error creating daily code:', error);
        Toast.show('Error creating daily code', 'error');
    }
}

async function toggleCodeStatus(id, currentStatus) {
    try {
        const response = await fetch(`${API_URL}/daily-codes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ isActive: !currentStatus })
        });
        
        if (response.ok) {
            Toast.show(`Code ${!currentStatus ? 'activated' : 'deactivated'}`, 'success');
            loadDailyCodes();
        } else {
            const error = await response.json();
            Toast.show(error.message, 'error');
        }
    } catch (error) {
        console.error('Error toggling code status:', error);
        Toast.show('Error updating code status', 'error');
    }
}

async function deleteDailyCode(id) {
    if (!confirm('Are you sure you want to delete this daily code?')) return;
    
    try {
        const response = await fetch(`${API_URL}/daily-codes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            Toast.show('Daily code deleted successfully', 'success');
            loadDailyCodes();
        } else {
            const error = await response.json();
            Toast.show(error.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting daily code:', error);
        Toast.show('Error deleting daily code', 'error');
    }
}

// Make functions globally available
window.showAddPatientModal = showAddPatientModal;
window.showAddDoctorModal = showAddDoctorModal;
window.showAddAppointmentModal = showAddAppointmentModal;
window.showAddBillModal = showAddBillModal;
window.showAddMedicineModal = showAddMedicineModal;
window.showAddStaffModal = showAddStaffModal;
window.closeModal = closeModal;
window.handleAddPatient = handleAddPatient;
window.handleAddDoctor = handleAddDoctor;
window.handleAddAppointment = handleAddAppointment;
window.handleAddBill = handleAddBill;
window.handleAddMedicine = handleAddMedicine;
window.handleAddStaff = handleAddStaff;
window.deletePatient = deletePatient;
window.deleteDoctor = deleteDoctor;
window.deleteAppointment = deleteAppointment;
window.deleteBill = deleteBill;
window.deleteMedicine = deleteMedicine;
window.deleteStaff = deleteStaff;
window.editPatient = editPatient;
window.editDoctor = editDoctor;
window.editAppointment = editAppointment;
window.editMedicine = editMedicine;
window.editStaff = editStaff;
window.viewBill = viewBill;
window.loadPage = loadPage;
window.showAddDailyCodeModal = showAddDailyCodeModal;
window.handleAddDailyCode = handleAddDailyCode;
window.toggleCodeStatus = toggleCodeStatus;
window.deleteDailyCode = deleteDailyCode;