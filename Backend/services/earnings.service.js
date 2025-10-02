const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model');

class EarningsService {
    // Calculate earnings for a completed ride
    static async calculateRideEarnings(ride) {
        if (!ride || ride.status !== 'completed') {
            throw new Error('Invalid ride for earnings calculation');
        }

        const baseFare = ride.fare || 0;
        const platformCommission = 0.15; // 15% platform commission
        const driverEarnings = Math.round(baseFare * (1 - platformCommission));
        const commissionAmount = baseFare - driverEarnings;

        // Calculate bonus for peak hours or good ratings
        let bonus = 0;
        const rideHour = new Date(ride.completedAt).getHours();
        const isPeakHour = (rideHour >= 8 && rideHour <= 10) || (rideHour >= 17 && rideHour <= 20);
        
        if (isPeakHour) {
            bonus = Math.round(driverEarnings * 0.1); // 10% peak hour bonus
        }

        const totalEarnings = driverEarnings + bonus;

        return {
            baseFare,
            driverEarnings,
            bonus,
            totalEarnings,
            commissionAmount,
            platformCommission: platformCommission * 100, // Convert to percentage
            isPeakHour,
            rideId: ride._id,
            captainId: ride.captain
        };
    }

    // Update captain earnings after ride completion
    static async updateCaptainEarnings(captainId, earningsData) {
        try {
            const captain = await captainModel.findById(captainId);
            if (!captain) {
                throw new Error('Captain not found');
            }

            const today = new Date();
            const todayString = today.toISOString().split('T')[0];
            const currentDailyDate = captain.dailyStats.date ? captain.dailyStats.date.toISOString().split('T')[0] : null;

            // Reset daily stats if it's a new day
            if (currentDailyDate !== todayString) {
                captain.dailyStats = {
                    date: today,
                    rides: 0,
                    earnings: 0,
                    onlineHours: captain.dailyStats.onlineHours || 0
                };
            }

            // Update total stats
            captain.stats.totalEarnings += earningsData.totalEarnings;
            captain.stats.totalRides += 1;

            // Update daily stats
            captain.dailyStats.rides += 1;
            captain.dailyStats.earnings += earningsData.totalEarnings;

            // Calculate acceptance rate (simplified)
            if (captain.stats.totalRides > 0) {
                captain.stats.acceptanceRate = Math.round((captain.stats.totalRides / (captain.stats.totalRides * 1.2)) * 100);
            }

            // Update completion rate
            captain.stats.completionRate = Math.min(100, captain.stats.completionRate + 0.5);

            await captain.save();

            return {
                updatedStats: captain.stats,
                dailyStats: captain.dailyStats,
                earningsBreakdown: earningsData
            };
        } catch (error) {
            console.error('Error updating captain earnings:', error);
            throw error;
        }
    }

    // Get earnings summary for a captain
    static async getEarningsSummary(captainId, period = 'today') {
        try {
            const captain = await captainModel.findById(captainId);
            if (!captain) {
                throw new Error('Captain not found');
            }

            let dateFilter = {};
            const now = new Date();
            
            switch (period) {
                case 'today':
                    dateFilter = {
                        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
                    };
                    break;
                case 'week':
                    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                    dateFilter = {
                        $gte: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()),
                        $lt: new Date()
                    };
                    break;
                case 'month':
                    dateFilter = {
                        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                        $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
                    };
                    break;
                default:
                    dateFilter = {
                        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
                    };
            }

            // Get rides for the period
            const rides = await rideModel.find({
                captain: captainId,
                status: 'completed',
                completedAt: dateFilter
            }).populate('user', 'fullname');

            // Calculate detailed earnings
            let totalEarnings = 0;
            let totalFares = 0;
            let totalCommission = 0;
            let totalBonus = 0;
            let peakHourRides = 0;

            const rideEarnings = [];

            for (const ride of rides) {
                const earnings = await this.calculateRideEarnings(ride);
                totalEarnings += earnings.totalEarnings;
                totalFares += earnings.baseFare;
                totalCommission += earnings.commissionAmount;
                totalBonus += earnings.bonus;
                
                if (earnings.isPeakHour) {
                    peakHourRides++;
                }

                rideEarnings.push({
                    rideId: ride._id,
                    pickup: ride.pickup,
                    destination: ride.destination,
                    completedAt: ride.completedAt,
                    baseFare: earnings.baseFare,
                    earnings: earnings.totalEarnings,
                    bonus: earnings.bonus,
                    isPeakHour: earnings.isPeakHour,
                    user: ride.user?.fullname
                });
            }

            return {
                period,
                summary: {
                    totalRides: rides.length,
                    totalEarnings: Math.round(totalEarnings),
                    totalFares: Math.round(totalFares),
                    totalCommission: Math.round(totalCommission),
                    totalBonus: Math.round(totalBonus),
                    peakHourRides,
                    averageEarningsPerRide: rides.length > 0 ? Math.round(totalEarnings / rides.length) : 0,
                    averageFarePerRide: rides.length > 0 ? Math.round(totalFares / rides.length) : 0
                },
                rideEarnings,
                captainStats: {
                    totalLifetimeEarnings: captain.stats.totalEarnings,
                    totalLifetimeRides: captain.stats.totalRides,
                    rating: captain.stats.rating,
                    acceptanceRate: captain.stats.acceptanceRate,
                    completionRate: captain.stats.completionRate
                },
                dailyStats: captain.dailyStats
            };
        } catch (error) {
            console.error('Error getting earnings summary:', error);
            throw error;
        }
    }

    // Get earnings breakdown by time periods
    static async getEarningsAnalytics(captainId) {
        try {
            const now = new Date();
            
            // Get different period summaries
            const [todayEarnings, weekEarnings, monthEarnings] = await Promise.all([
                this.getEarningsSummary(captainId, 'today'),
                this.getEarningsSummary(captainId, 'week'),
                this.getEarningsSummary(captainId, 'month')
            ]);

            // Get hourly earnings for today (for chart data)
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const hourlyEarnings = await rideModel.aggregate([
                {
                    $match: {
                        captain: captainId,
                        status: 'completed',
                        completedAt: { $gte: startOfDay }
                    }
                },
                {
                    $group: {
                        _id: { $hour: '$completedAt' },
                        totalEarnings: { $sum: '$fare' },
                        rideCount: { $sum: 1 }
                    }
                },
                {
                    $sort: { '_id': 1 }
                }
            ]);

            // Format hourly data for charts
            const hourlyData = Array.from({ length: 24 }, (_, hour) => {
                const found = hourlyEarnings.find(h => h._id === hour);
                return {
                    hour,
                    earnings: found ? Math.round(found.totalEarnings * 0.85) : 0, // After commission
                    rides: found ? found.rideCount : 0
                };
            });

            return {
                analytics: {
                    today: todayEarnings.summary,
                    week: weekEarnings.summary,
                    month: monthEarnings.summary
                },
                trends: {
                    hourlyEarnings: hourlyData
                },
                performance: {
                    rating: todayEarnings.captainStats.rating,
                    acceptanceRate: todayEarnings.captainStats.acceptanceRate,
                    completionRate: todayEarnings.captainStats.completionRate,
                    totalLifetimeEarnings: todayEarnings.captainStats.totalLifetimeEarnings,
                    totalLifetimeRides: todayEarnings.captainStats.totalLifetimeRides
                }
            };
        } catch (error) {
            console.error('Error getting earnings analytics:', error);
            throw error;
        }
    }
}

module.exports = EarningsService;