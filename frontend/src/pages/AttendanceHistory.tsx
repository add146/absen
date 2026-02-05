import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import AttendanceCalendarView from '../components/AttendanceCalendarView';

const AttendanceHistory: React.FC = () => {
    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto">
                <AttendanceCalendarView />
            </div>
        </DashboardLayout>
    );
};

export default AttendanceHistory;
