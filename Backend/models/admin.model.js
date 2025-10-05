const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const adminSchema = new mongoose.Schema({
    fullname: {
        firstname: {
            type: String,
            required: true,
            minlength: [3, 'First name must be at least 3 characters long'],
        },
        lastname: {
            type: String,
            minlength: [3, 'Last name must be at least 3 characters long'],
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'moderator'],
        default: 'admin'
    },
    permissions: [{
        type: String,
        enum: [
            'view_users', 'manage_users', 'ban_users',
            'view_captains', 'manage_captains', 'verify_captains',
            'view_rides', 'manage_rides', 'cancel_rides',
            'view_analytics', 'manage_system', 'financial_reports',
            'manage_admins', 'system_settings'
        ]
    }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    lastLogin: {
        type: Date
    },
    loginHistory: [{
        timestamp: Date,
        ipAddress: String,
        userAgent: String
    }],
    profileImage: {
        type: String
    },
    department: {
        type: String,
        enum: ['operations', 'customer_support', 'finance', 'technical', 'management']
    }
}, {
    timestamps: true
});

// Default permissions based on role
adminSchema.pre('save', function(next) {
    if (this.isNew) {
        switch(this.role) {
            case 'super_admin':
                this.permissions = [
                    'view_users', 'manage_users', 'ban_users',
                    'view_captains', 'manage_captains', 'verify_captains',
                    'view_rides', 'manage_rides', 'cancel_rides',
                    'view_analytics', 'manage_system', 'financial_reports',
                    'manage_admins', 'system_settings'
                ];
                break;
            case 'admin':
                this.permissions = [
                    'view_users', 'manage_users',
                    'view_captains', 'manage_captains', 'verify_captains',
                    'view_rides', 'manage_rides',
                    'view_analytics', 'financial_reports'
                ];
                break;
            case 'moderator':
                this.permissions = [
                    'view_users', 'view_captains', 'view_rides', 'view_analytics'
                ];
                break;
        }
    }
    next();
});

adminSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ 
        _id: this._id, 
        role: this.role,
        permissions: this.permissions
    }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return token;
}

adminSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

adminSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
}

adminSchema.methods.hasPermission = function(permission) {
    return this.permissions.includes(permission) || this.role === 'super_admin';
}

const adminModel = mongoose.model('admin', adminSchema);

module.exports = adminModel;