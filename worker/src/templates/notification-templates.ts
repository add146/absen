/**
 * WhatsApp Notification Templates
 * Templates for various notification types sent via WAHA
 */

export interface NotificationData {
    userName?: string;
    dates?: string;
    leaveType?: string;
    days?: number;
    reason?: string;
    points?: number;
    totalPoints?: number;
    activity?: string;
    locationName?: string;
    productName?: string;
    pointsUsed?: number;
    checkInTime?: string;
    checkOutTime?: string;
    status?: string;
}

export const notificationTemplates = {
    /**
     * Leave approved notification
     */
    leave_approved: (data: NotificationData): string => {
        return `✅ *Cuti Disetujui*

Halo ${data.userName},

Permohonan cuti Anda telah *disetujui* ✓

📅 *Tanggal:* ${data.dates}
📝 *Jenis:* ${data.leaveType}
⏱️ *Durasi:* ${data.days} hari

Semoga istirahat yang menyenangkan! 🌴`;
    },

    /**
     * Leave rejected notification
     */
    leave_rejected: (data: NotificationData): string => {
        return `❌ *Cuti Ditolak*

Halo ${data.userName},

Mohon maaf, permohonan cuti Anda untuk tanggal *${data.dates}* tidak dapat disetujui.

📝 *Alasan:* ${data.reason || 'Tidak disebutkan'}

Silakan hubungi admin untuk informasi lebih lanjut.`;
    },

    /**
     * Points earned notification
     */
    points_earned: (data: NotificationData): string => {
        return `🌟 *Poin Didapat!*

Selamat ${data.userName}! 🎉

Anda mendapatkan *+${data.points} poin*
${data.activity ? `Dari: ${data.activity}` : ''}

💰 *Total Poin:* ${data.totalPoints}

Tukarkan poin Anda dengan hadiah menarik! 🎁`;
    },

    /**
     * Check-in reminder notification
     */
    check_in_reminder: (data: NotificationData): string => {
        return `⏰ *Reminder Check-in*

Halo ${data.userName},

Jangan lupa untuk check-in hari ini! 📍

🏢 *Lokasi:* ${data.locationName}

Segera lakukan check-in untuk mendapatkan poin! 🌟`;
    },

    /**
     * Order processed notification
     */
    order_processed: (data: NotificationData): string => {
        return `🎁 *Pesanan Diproses*

Halo ${data.userName},

Pesanan Anda telah diproses! ✓

📦 *Produk:* ${data.productName}
💰 *Poin Digunakan:* ${data.pointsUsed}

Silakan ambil pesanan Anda di kantor. Terima kasih! 🙏`;
    },

    /**
     * Check-in success notification
     */
    check_in_success: (data: NotificationData): string => {
        return `✅ *Check-in Berhasil*

Halo ${data.userName},

Check-in Anda berhasil! 📍

🕐 *Waktu:* ${data.checkInTime}
📍 *Lokasi:* ${data.locationName}
${data.points ? `🌟 *Poin:* +${data.points}` : ''}

Semangat bekerja hari ini! 💪`;
    },

    /**
     * Check-out success notification
     */
    check_out_success: (data: NotificationData): string => {
        return `✅ *Check-out Berhasil*

Halo ${data.userName},

Check-out Anda berhasil! 👋

🕐 *Waktu:* ${data.checkOutTime}
📍 *Lokasi:* ${data.locationName}

Terima kasih atas kerja keras Anda hari ini! 🙏`;
    },

    /**
     * Late check-in warning
     */
    late_check_in: (data: NotificationData): string => {
        return `⚠️ *Check-in Terlambat*

Halo ${data.userName},

Anda terlambat check-in hari ini.

🕐 *Waktu:* ${data.checkInTime}
📍 *Lokasi:* ${data.locationName}

Harap lebih tepat waktu di lain kesempatan.`;
    },

    /**
     * Points milestone notification
     */
    points_milestone: (data: NotificationData): string => {
        return `🏆 *Pencapaian Poin!*

Selamat ${data.userName}! 🎉

Anda telah mencapai *${data.totalPoints} poin*!

Terus semangat untuk mengumpulkan lebih banyak poin! 💪`;
    },

    /**
     * Generic notification
     */
    generic: (data: NotificationData): string => {
        return `📢 *Notifikasi*

Halo ${data.userName || 'User'},

${data.activity || 'Ada pembaruan untuk Anda.'}`;
    },
};

/**
 * Get notification title based on type
 */
export function getNotificationTitle(type: string): string {
    const titles: Record<string, string> = {
        leave_approved: 'Cuti Disetujui',
        leave_rejected: 'Cuti Ditolak',
        points_earned: 'Poin Didapat',
        check_in_reminder: 'Reminder Check-in',
        order_processed: 'Pesanan Diproses',
        check_in_success: 'Check-in Berhasil',
        check_out_success: 'Check-out Berhasil',
        late_check_in: 'Terlambat Check-in',
        points_milestone: 'Pencapaian Poin',
    };

    return titles[type] || 'Notifikasi';
}
