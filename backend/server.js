const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital_management';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ Connected to MongoDB successfully');
    initializeDatabase();
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
});

// Models
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'doctor', 'staff'], default: 'staff' },
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const patientSchema = new mongoose.Schema({
    patientId: { type: String, unique: true, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    contactNumber: { type: String, required: true },
    email: String,
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String
    },
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String
    },
    medicalHistory: [{
        condition: String,
        diagnosisDate: Date,
        notes: String
    }],
    allergies: [String],
    createdAt: { type: Date, default: Date.now }
});

const doctorSchema = new mongoose.Schema({
    doctorId: { type: String, unique: true, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    specialization: { type: String, required: true },
    department: { type: String, required: true },
    qualification: [String],
    experience: Number,
    contactNumber: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    availability: [{
        day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
        startTime: String,
        endTime: String,
        isAvailable: { type: Boolean, default: true }
    }],
    consultationFee: Number,
    createdAt: { type: Date, default: Date.now }
});

const appointmentSchema = new mongoose.Schema({
    appointmentId: { type: String, unique: true, required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointmentDate: { type: Date, required: true },
    appointmentTime: { type: String, required: true },
    status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled', 'No-Show'], default: 'Scheduled' },
    symptoms: String,
    diagnosis: String,
    prescription: String,
    notes: String,
    createdAt: { type: Date, default: Date.now }
});

const billSchema = new mongoose.Schema({
    billId: { type: String, unique: true, required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    billDate: { type: Date, default: Date.now },
    items: [{
        medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
        description: String,
        quantity: Number,
        unitPrice: Number,
        amount: Number
    }],
    consultationFee: Number,
    medicineCharges: Number,
    otherCharges: Number,
    totalAmount: Number,
    paidAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['Paid', 'Partial', 'Unpaid', 'Cancelled'], default: 'Unpaid' },
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'Insurance', 'Online'] },
    dailyCode: {
        providedCode: String,
        isVerified: {
            type: Boolean,
            default: false
        },
        verifiedAt: Date,
        discountAmount: {
            type: Number,
            default: 0
        }
    },
    dueDate: Date,
    createdAt: { type: Date, default: Date.now }
});

const medicineSchema = new mongoose.Schema({
    medicineId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    genericName: String,
    category: { type: String, required: true },
    manufacturer: String,
    price: { type: Number, required: true },
    stockQuantity: { type: Number, required: true, min: 0 },
    expiryDate: Date,
    dosage: String,
    description: String,
    requiresPrescription: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const staffSchema = new mongoose.Schema({
    staffId: { type: String, unique: true, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: { type: String, enum: ['Nurse', 'Receptionist', 'Technician', 'Pharmacist', 'Admin'], required: true },
    department: String,
    qualification: [String],
    joiningDate: { type: Date, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String
    },
    shift: { type: String, enum: ['Morning', 'Evening', 'Night'] },
    salary: Number,
    createdAt: { type: Date, default: Date.now }
});

const dailyCodeSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        unique: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient date queries
dailyCodeSchema.index({ date: 1 });

const User = mongoose.model('User', userSchema);
const Patient = mongoose.model('Patient', patientSchema);
const Doctor = mongoose.model('Doctor', doctorSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const Bill = mongoose.model('Bill', billSchema);
const Medicine = mongoose.model('Medicine', medicineSchema);
const Staff = mongoose.model('Staff', staffSchema);
const DailyCode = mongoose.model('DailyCode', dailyCodeSchema);

// Initialize Database
async function initializeDatabase() {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            const adminUser = new User({
                username: 'admin',
                email: 'admin@hospital.com',
                password: 'Admin@123',
                role: 'admin'
            });
            await adminUser.save();
            console.log('✅ Admin user created');
        }

        // Add sample data if collections are empty
        const patientCount = await Patient.countDocuments();
        if (patientCount === 0) {
            await Patient.insertMany([
                {
                    patientId: 'PAT001',
                    firstName: 'John',
                    lastName: 'Doe',
                    dateOfBirth: '1990-05-15',
                    gender: 'Male',
                    bloodGroup: 'O+',
                    contactNumber: '+1234567890',
                    email: 'john.doe@email.com'
                },
                {
                    patientId: 'PAT002',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    dateOfBirth: '1985-08-22',
                    gender: 'Female',
                    bloodGroup: 'A+',
                    contactNumber: '+1234567891',
                    email: 'jane.smith@email.com'
                }
            ]);
            console.log('✅ Sample patients added');
        }

        const doctorCount = await Doctor.countDocuments();
        if (doctorCount === 0) {
            await Doctor.insertMany([
                {
                    doctorId: 'DOC001',
                    firstName: 'Sarah',
                    lastName: 'Johnson',
                    specialization: 'Cardiology',
                    department: 'Cardiology',
                    qualification: ['MD', 'DM Cardiology'],
                    experience: 15,
                    contactNumber: '+1234567892',
                    email: 'sarah.johnson@hospital.com',
                    consultationFee: 200
                },
                {
                    doctorId: 'DOC002',
                    firstName: 'Michael',
                    lastName: 'Brown',
                    specialization: 'Pediatrics',
                    department: 'Pediatrics',
                    qualification: ['MD', 'DCH'],
                    experience: 10,
                    contactNumber: '+1234567893',
                    email: 'michael.brown@hospital.com',
                    consultationFee: 150
                }
            ]);
            console.log('✅ Sample doctors added');
        }
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'Hospital Management System API',
        status: 'running',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth/login',
            patients: '/api/patients',
            doctors: '/api/doctors',
            appointments: '/api/appointments',
            bills: '/api/bills',
            medicines: '/api/medicines',
            staff: '/api/staff',
            dashboard: '/api/dashboard/stats'
        }
    });
});

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Initialize Database Endpoint - creates default admin if none exists
app.post('/api/auth/initialize', async (req, res) => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        if (adminExists) {
            return res.json({ message: 'Admin user already exists', user: { username: adminExists.username, email: adminExists.email } });
        }

        const adminUser = new User({
            username: 'admin',
            email: 'admin@hospital.com',
            password: 'Admin@123',
            role: 'admin'
        });
        await adminUser.save();
        
        res.json({ 
            message: 'Admin user created successfully',
            credentials: {
                username: 'admin',
                password: 'Admin@123',
                email: 'admin@hospital.com'
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error initializing database', error: error.message });
    }
});

// Patient Routes
app.get('/api/patients', authenticateToken, async (req, res) => {
    try {
        const patients = await Patient.find().sort({ createdAt: -1 });
        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching patients', error: error.message });
    }
});

app.post('/api/patients', authenticateToken, async (req, res) => {
    try {
        const patientData = req.body;
        patientData.patientId = 'PAT' + Date.now().toString().slice(-6);

        const patient = new Patient(patientData);
        await patient.save();
        res.status(201).json(patient);
    } catch (error) {
        res.status(500).json({ message: 'Error creating patient', error: error.message });
    }
});

app.put('/api/patients/:id', authenticateToken, async (req, res) => {
    try {
        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ message: 'Error updating patient', error: error.message });
    }
});

app.delete('/api/patients/:id', authenticateToken, async (req, res) => {
    try {
        const patient = await Patient.findByIdAndDelete(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }
        res.json({ message: 'Patient deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting patient', error: error.message });
    }
});

// Doctor Routes
app.get('/api/doctors', authenticateToken, async (req, res) => {
    try {
        const doctors = await Doctor.find().sort({ createdAt: -1 });
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching doctors', error: error.message });
    }
});

app.post('/api/doctors', authenticateToken, async (req, res) => {
    try {
        const doctorData = req.body;
        doctorData.doctorId = 'DOC' + Date.now().toString().slice(-6);

        const doctor = new Doctor(doctorData);
        await doctor.save();
        res.status(201).json(doctor);
    } catch (error) {
        res.status(500).json({ message: 'Error creating doctor', error: error.message });
    }
});

app.put('/api/doctors/:id', authenticateToken, async (req, res) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        res.json(doctor);
    } catch (error) {
        res.status(500).json({ message: 'Error updating doctor', error: error.message });
    }
});

app.delete('/api/doctors/:id', authenticateToken, async (req, res) => {
    try {
        const doctor = await Doctor.findByIdAndDelete(req.params.id);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        res.json({ message: 'Doctor deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting doctor', error: error.message });
    }
});

// Appointment Routes
app.get('/api/appointments', authenticateToken, async (req, res) => {
    try {
        const query = {};

        if (req.query.doctorId) {
            query.doctorId = req.query.doctorId;
        }

        if (req.query.date) {
            const date = new Date(req.query.date);
            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + 1);
            query.appointmentDate = { $gte: date, $lt: nextDate };
        }

        const appointments = await Appointment.find(query)
            .populate('patientId', 'firstName lastName patientId')
            .populate('doctorId', 'firstName lastName specialization consultationFee')
            .sort({ appointmentDate: -1 });
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching appointments', error: error.message });
    }
});

app.get('/api/appointments/:id', authenticateToken, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('patientId', 'firstName lastName patientId')
            .populate('doctorId', 'firstName lastName specialization consultationFee');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        res.json(appointment);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching appointment', error: error.message });
    }
});

app.post('/api/appointments', authenticateToken, async (req, res) => {
    try {
        const appointmentData = req.body;
        appointmentData.appointmentId = 'APT' + Date.now().toString().slice(-6);

        const appointment = new Appointment(appointmentData);
        await appointment.save();

        const populatedAppointment = await Appointment.findById(appointment._id)
            .populate('patientId', 'firstName lastName patientId')
            .populate('doctorId', 'firstName lastName specialization');

        res.status(201).json(populatedAppointment);
    } catch (error) {
        res.status(500).json({ message: 'Error creating appointment', error: error.message });
    }
});

app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
    try {
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('patientId', 'firstName lastName patientId')
         .populate('doctorId', 'firstName lastName specialization');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        res.json(appointment);
    } catch (error) {
        res.status(500).json({ message: 'Error updating appointment', error: error.message });
    }
});

app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
    try {
        const appointment = await Appointment.findByIdAndDelete(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        res.json({ message: 'Appointment deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting appointment', error: error.message });
    }
});

// Bill Routes
app.get('/api/bills', authenticateToken, async (req, res) => {
    try {
        const bills = await Bill.find()
            .populate('patientId', 'firstName lastName patientId')
            .sort({ billDate: -1 });
        res.json(bills);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bills', error: error.message });
    }
});

app.post('/api/bills', authenticateToken, async (req, res) => {
    try {
        const billData = req.body;
        billData.billId = 'BIL' + Date.now().toString().slice(-6);

        // Auto-fetch doctor's consultation fee if appointment is provided
        if (billData.appointmentId) {
            const appointment = await Appointment.findById(billData.appointmentId).populate('doctorId');
            if (appointment && appointment.doctorId && appointment.doctorId.consultationFee) {
                billData.consultationFee = appointment.doctorId.consultationFee;
            }
        }

        // Handle daily code verification
        let codeDeduction = 0;
        if (billData.dailyCode?.providedCode) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const dailyCode = await DailyCode.findOne({ 
                date: today, 
                code: billData.dailyCode.providedCode,
                isActive: true 
            });
            
            if (dailyCode) {
                billData.dailyCode.isVerified = true;
                billData.dailyCode.verifiedAt = new Date();
                // Use the discount amount provided by frontend (verified via button)
                codeDeduction = billData.dailyCode.discountAmount || 0;
            } else {
                billData.dailyCode.isVerified = false;
                // Reset discount if code is not verified
                billData.dailyCode.discountAmount = 0;
            }
        }

        billData.totalAmount = (billData.consultationFee || 0) +
                              (billData.medicineCharges || 0) +
                              (billData.otherCharges || 0);
        
        billData.financialToken = {
            tokenId: billData.financialToken?.tokenId || billData.tokenId || '',
            amount: billData.financialToken?.amount != null ? billData.financialToken.amount : (parseFloat(billData.tokenAmount) || 0),
            description: billData.financialToken?.description || billData.tokenDescription || ''
        };
        
        // Apply both token deduction and code deduction
        const totalDeduction = (billData.financialToken.amount || 0) + codeDeduction;
        billData.netAmount = Math.max(0, billData.totalAmount - totalDeduction);

        const paidAmount = parseFloat(billData.paidAmount) || 0;
        billData.paidAmount = paidAmount;
        if (paidAmount >= billData.netAmount) {
            billData.paymentStatus = 'Paid';
        } else if (paidAmount > 0) {
            billData.paymentStatus = 'Partial';
        } else {
            billData.paymentStatus = 'Unpaid';
        }

        const bill = new Bill(billData);
        await bill.save();

        const populatedBill = await Bill.findById(bill._id)
            .populate('patientId', 'firstName lastName patientId');

        res.status(201).json(populatedBill);
    } catch (error) {
        res.status(500).json({ message: 'Error creating bill', error: error.message });
    }
});

app.put('/api/bills/:id', authenticateToken, async (req, res) => {
    try {
        const billData = req.body;
        
        // Auto-fetch doctor's consultation fee if appointment is provided and changed
        if (billData.appointmentId) {
            const appointment = await Appointment.findById(billData.appointmentId).populate('doctorId');
            if (appointment && appointment.doctorId && appointment.doctorId.consultationFee) {
                billData.consultationFee = appointment.doctorId.consultationFee;
            }
        }

        // Handle daily code verification (only if code is provided and not already verified)
        let codeDeduction = 0;
        const existingBill = await Bill.findById(req.params.id);
        
        if (billData.dailyCode?.providedCode && !existingBill?.dailyCode?.isVerified) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const dailyCode = await DailyCode.findOne({ 
                date: today, 
                code: billData.dailyCode.providedCode,
                isActive: true 
            });
            
            if (dailyCode) {
                billData.dailyCode.isVerified = true;
                billData.dailyCode.verifiedAt = new Date();
                // Use the discount amount provided by frontend (verified via button)
                codeDeduction = billData.dailyCode.discountAmount || 0;
            } else {
                billData.dailyCode.isVerified = false;
                // Reset discount if code is not verified
                billData.dailyCode.discountAmount = 0;
            }
        } else if (existingBill?.dailyCode) {
            // Preserve existing verification status
            billData.dailyCode = existingBill.dailyCode;
            if (billData.dailyCode.isVerified) {
                // Use existing discount amount or new one if provided
                codeDeduction = billData.dailyCode.discountAmount || existingBill.dailyCode.discountAmount || 0;
            }
        }

        billData.totalAmount = (billData.consultationFee || 0) +
                              (billData.medicineCharges || 0) +
                              (billData.otherCharges || 0);
        
        billData.financialToken = {
            tokenId: billData.financialToken?.tokenId || billData.tokenId || '',
            amount: billData.financialToken?.amount != null ? billData.financialToken.amount : (parseFloat(billData.tokenAmount) || 0),
            description: billData.financialToken?.description || billData.tokenDescription || ''
        };
        
        // Apply both token deduction and code deduction
        const totalDeduction = (billData.financialToken.amount || 0) + codeDeduction;
        billData.netAmount = Math.max(0, billData.totalAmount - totalDeduction);

        const paidAmount = parseFloat(billData.paidAmount) || 0;
        billData.paidAmount = paidAmount;
        if (paidAmount >= billData.netAmount) {
            billData.paymentStatus = 'Paid';
        } else if (paidAmount > 0) {
            billData.paymentStatus = 'Partial';
        } else {
            billData.paymentStatus = 'Unpaid';
        }

        const bill = await Bill.findByIdAndUpdate(
            req.params.id,
            billData,
            { new: true, runValidators: true }
        ).populate('patientId', 'firstName lastName patientId');

        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        res.json(bill);
    } catch (error) {
        res.status(500).json({ message: 'Error updating bill', error: error.message });
    }
});

app.delete('/api/bills/:id', authenticateToken, async (req, res) => {
    try {
        const bill = await Bill.findByIdAndDelete(req.params.id);
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        res.json({ message: 'Bill deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting bill', error: error.message });
    }
});

// Medicine Routes
app.get('/api/medicines', authenticateToken, async (req, res) => {
    try {
        const medicines = await Medicine.find().sort({ name: 1 });
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching medicines', error: error.message });
    }
});

app.post('/api/medicines', authenticateToken, async (req, res) => {
    try {
        const medicineData = req.body;
        medicineData.medicineId = 'MED' + Date.now().toString().slice(-6);

        const medicine = new Medicine(medicineData);
        await medicine.save();
        res.status(201).json(medicine);
    } catch (error) {
        res.status(500).json({ message: 'Error creating medicine', error: error.message });
    }
});

app.put('/api/medicines/:id', authenticateToken, async (req, res) => {
    try {
        const medicine = await Medicine.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }
        res.json(medicine);
    } catch (error) {
        res.status(500).json({ message: 'Error updating medicine', error: error.message });
    }
});

app.delete('/api/medicines/:id', authenticateToken, async (req, res) => {
    try {
        const medicine = await Medicine.findByIdAndDelete(req.params.id);
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }
        res.json({ message: 'Medicine deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting medicine', error: error.message });
    }
});

// Staff Routes
app.get('/api/staff', authenticateToken, async (req, res) => {
    try {
        const staff = await Staff.find().sort({ createdAt: -1 });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching staff', error: error.message });
    }
});

app.post('/api/staff', authenticateToken, async (req, res) => {
    try {
        const staffData = req.body;
        staffData.staffId = 'STF' + Date.now().toString().slice(-6);

        const staff = new Staff(staffData);
        await staff.save();
        res.status(201).json(staff);
    } catch (error) {
        res.status(500).json({ message: 'Error creating staff', error: error.message });
    }
});

app.put('/api/staff/:id', authenticateToken, async (req, res) => {
    try {
        const staff = await Staff.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' });
        }
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: 'Error updating staff', error: error.message });
    }
});

app.delete('/api/staff/:id', authenticateToken, async (req, res) => {
    try {
        const staff = await Staff.findByIdAndDelete(req.params.id);
        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' });
        }
        res.json({ message: 'Staff deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting staff', error: error.message });
    }
});

// Daily Code Routes
app.get('/api/daily-codes', authenticateToken, async (req, res) => {
    try {
        const codes = await DailyCode.find().sort({ date: -1 });
        res.json(codes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching daily codes', error: error.message });
    }
});

app.get('/api/daily-codes/today', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const code = await DailyCode.findOne({ 
            date: today,
            isActive: true 
        });
        
        if (!code) {
            return res.status(404).json({ message: 'No active code for today' });
        }
        
        res.json({ code: code.code, date: code.date });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching today\'s code', error: error.message });
    }
});

app.post('/api/daily-codes', authenticateToken, async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ message: 'Code is required' });
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check if code already exists for today
        const existingCode = await DailyCode.findOne({ date: today });
        if (existingCode) {
            return res.status(400).json({ message: 'Code already exists for today' });
        }
        
        const dailyCode = new DailyCode({
            date: today,
            code: code.trim()
        });
        
        await dailyCode.save();
        res.status(201).json(dailyCode);
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ message: 'Code already exists' });
        } else {
            res.status(500).json({ message: 'Error creating daily code', error: error.message });
        }
    }
});

app.put('/api/daily-codes/:id', authenticateToken, async (req, res) => {
    try {
        const { code, isActive } = req.body;
        
        const updateData = {};
        if (code) updateData.code = code.trim();
        if (isActive !== undefined) updateData.isActive = isActive;
        
        const dailyCode = await DailyCode.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        
        if (!dailyCode) {
            return res.status(404).json({ message: 'Daily code not found' });
        }
        
        res.json(dailyCode);
    } catch (error) {
        res.status(500).json({ message: 'Error updating daily code', error: error.message });
    }
});

app.delete('/api/daily-codes/:id', authenticateToken, async (req, res) => {
    try {
        const dailyCode = await DailyCode.findByIdAndDelete(req.params.id);
        if (!dailyCode) {
            return res.status(404).json({ message: 'Daily code not found' });
        }
        res.json({ message: 'Daily code deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting daily code', error: error.message });
    }
});

// Dashboard Stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const totalPatients = await Patient.countDocuments();
        const totalDoctors = await Doctor.countDocuments();
        const totalAppointments = await Appointment.countDocuments();
        const pendingAppointments = await Appointment.countDocuments({ status: 'Scheduled' });
        const completedAppointments = await Appointment.countDocuments({ status: 'Completed' });
        const totalBills = await Bill.countDocuments();
        const paidBills = await Bill.countDocuments({ paymentStatus: 'Paid' });
        const unpaidBills = await Bill.countDocuments({ paymentStatus: 'Unpaid' });
        
        const bills = await Bill.find();
        const totalRevenue = bills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
        
        const totalMedicines = await Medicine.countDocuments();
        const lowStockMedicines = await Medicine.countDocuments({ stockQuantity: { $lt: 10 } });
        const totalStaff = await Staff.countDocuments();

        const recentAppointments = await Appointment.find()
            .populate('patientId', 'firstName lastName')
            .populate('doctorId', 'firstName lastName specialization')
            .sort({ appointmentDate: -1 })
            .limit(5);

        res.json({
            totalPatients,
            totalDoctors,
            totalAppointments,
            pendingAppointments,
            completedAppointments,
            totalBills,
            paidBills,
            unpaidBills,
            totalRevenue,
            totalMedicines,
            lowStockMedicines,
            totalStaff,
            recentAppointments
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
    }
});

// Serve frontend static files
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`📍 Test API: http://localhost:${PORT}/`);
    });
}

module.exports = app;