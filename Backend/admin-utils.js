const mongoose = require('mongoose');
const dotenv = require('dotenv');
const adminModel = require('./models/admin.model');
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');
const rideModel = require('./models/ride.model');
const connectToDb = require('./db/db');

dotenv.config();

// Utility functions for admin operations
class AdminUtils {
    static async connect() {
        await connectToDb();
        console.log('Connected to database');
    }

    static async disconnect() {
        await mongoose.disconnect();
        console.log('Disconnected from database');
    }

    // Create a new admin
    static async createAdmin(adminData) {
        try {
            const { firstname, lastname, email, password, role = 'admin', department } = adminData;
            
            const existingAdmin = await adminModel.findOne({ email });
            if (existingAdmin) {
                throw new Error('Admin with this email already exists');
            }

            const hashedPassword = await adminModel.hashPassword(password);
            
            const admin = await adminModel.create({
                fullname: { firstname, lastname },
                email,
                password: hashedPassword,
                role,
                department
            });

            console.log(`Admin created successfully: ${admin.email} (${admin.role})`);
            return admin;
        } catch (error) {
            console.error('Error creating admin:', error.message);
            throw error;
        }
    }

    // List all admins
    static async listAdmins() {
        try {
            const admins = await adminModel.find({}).select('-password');
            console.log('\n=== All Admins ===');
            admins.forEach(admin => {
                console.log(`${admin.fullname.firstname} ${admin.fullname.lastname} (${admin.email})`);
                console.log(`  Role: ${admin.role}`);
                console.log(`  Status: ${admin.status}`);
                console.log(`  Department: ${admin.department || 'Not set'}`);
                console.log(`  Last Login: ${admin.lastLogin || 'Never'}`);
                console.log('---');
            });
            return admins;
        } catch (error) {
            console.error('Error listing admins:', error.message);
            throw error;
        }
    }

    // Get system statistics
    static async getSystemStats() {
        try {
            const [totalUsers, totalCaptains, totalRides, totalAdmins] = await Promise.all([
                userModel.countDocuments(),
                captainModel.countDocuments(),
                rideModel.countDocuments(),
                adminModel.countDocuments()
            ]);

            const completedRides = await rideModel.countDocuments({ status: 'completed' });
            const activeDrivers = await captainModel.countDocuments({ status: 'active' });
            
            const totalRevenue = await rideModel.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$fare' } } }
            ]);

            const stats = {
                users: totalUsers,
                captains: totalCaptains,
                activeDrivers,
                rides: totalRides,
                completedRides,
                admins: totalAdmins,
                totalRevenue: totalRevenue[0]?.total || 0
            };

            console.log('\n=== System Statistics ===');
            console.log(`Users: ${stats.users}`);
            console.log(`Captains: ${stats.captains} (Active: ${stats.activeDrivers})`);
            console.log(`Rides: ${stats.rides} (Completed: ${stats.completedRides})`);
            console.log(`Admins: ${stats.admins}`);
            console.log(`Total Revenue: ₹${stats.totalRevenue.toLocaleString()}`);

            return stats;
        } catch (error) {
            console.error('Error fetching system stats:', error.message);
            throw error;
        }
    }

    // Reset admin password
    static async resetAdminPassword(email, newPassword) {
        try {
            const admin = await adminModel.findOne({ email });
            if (!admin) {
                throw new Error('Admin not found');
            }

            const hashedPassword = await adminModel.hashPassword(newPassword);
            await adminModel.findByIdAndUpdate(admin._id, { password: hashedPassword });
            
            console.log(`Password reset successfully for admin: ${email}`);
            return true;
        } catch (error) {
            console.error('Error resetting password:', error.message);
            throw error;
        }
    }

    // Deactivate admin
    static async deactivateAdmin(email) {
        try {
            const admin = await adminModel.findOneAndUpdate(
                { email },
                { status: 'inactive' },
                { new: true }
            );

            if (!admin) {
                throw new Error('Admin not found');
            }

            console.log(`Admin deactivated: ${email}`);
            return admin;
        } catch (error) {
            console.error('Error deactivating admin:', error.message);
            throw error;
        }
    }
}

// Command line interface
const command = process.argv[2];
const args = process.argv.slice(3);

async function runCommand() {
    try {
        await AdminUtils.connect();

        switch (command) {
            case 'create-admin':
                const [firstname, lastname, email, password, role, department] = args;
                if (!firstname || !lastname || !email || !password) {
                    console.log('Usage: node admin-utils.js create-admin <firstname> <lastname> <email> <password> [role] [department]');
                    break;
                }
                await AdminUtils.createAdmin({ firstname, lastname, email, password, role, department });
                break;

            case 'list-admins':
                await AdminUtils.listAdmins();
                break;

            case 'system-stats':
                await AdminUtils.getSystemStats();
                break;

            case 'reset-password':
                const [resetEmail, newPassword] = args;
                if (!resetEmail || !newPassword) {
                    console.log('Usage: node admin-utils.js reset-password <email> <new-password>');
                    break;
                }
                await AdminUtils.resetAdminPassword(resetEmail, newPassword);
                break;

            case 'deactivate-admin':
                const [deactivateEmail] = args;
                if (!deactivateEmail) {
                    console.log('Usage: node admin-utils.js deactivate-admin <email>');
                    break;
                }
                await AdminUtils.deactivateAdmin(deactivateEmail);
                break;

            default:
                console.log('\nAvailable commands:');
                console.log('  create-admin <firstname> <lastname> <email> <password> [role] [department]');
                console.log('  list-admins');
                console.log('  system-stats');
                console.log('  reset-password <email> <new-password>');
                console.log('  deactivate-admin <email>');
                console.log('\nExample: node admin-utils.js create-admin John Doe john@example.com password123 admin operations');
        }
    } catch (error) {
        console.error('Command failed:', error.message);
    } finally {
        await AdminUtils.disconnect();
        process.exit(0);
    }
}

// Run only if this file is executed directly
if (require.main === module) {
    runCommand();
}

module.exports = AdminUtils;