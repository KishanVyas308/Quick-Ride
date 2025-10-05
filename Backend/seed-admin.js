const mongoose = require('mongoose');
const dotenv = require('dotenv');
const adminModel = require('./models/admin.model');
const connectToDb = require('./db/db');

dotenv.config();

async function createSuperAdmin() {
    try {
        await connectToDb();
        
        // Check if super admin already exists
        const existingAdmin = await adminModel.findOne({ role: 'super_admin' });
        
        if (existingAdmin) {
            console.log('Super admin already exists:', existingAdmin.email);
            return;
        }

        const hashedPassword = await adminModel.hashPassword('admin123456');

        const superAdmin = await adminModel.create({
            fullname: {
                firstname: 'Super',
                lastname: 'Admin'
            },
            email: 'admin@quickride.com',
            password: hashedPassword,
            role: 'super_admin',
            department: 'management',
            status: 'active'
        });

        console.log('Super Admin created successfully!');
        console.log('Email: admin@quickride.com');
        console.log('Password: admin123456');
        console.log('Role:', superAdmin.role);
        console.log('Permissions:', superAdmin.permissions);

        process.exit(0);
    } catch (error) {
        console.error('Error creating super admin:', error);
        process.exit(1);
    }
}

// Run only if this file is executed directly
if (require.main === module) {
    createSuperAdmin();
}

module.exports = { createSuperAdmin };