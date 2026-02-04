import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import Dashboard from '../pages/Dashboard';
import { BrowserRouter } from 'react-router-dom';

// Mocks
vi.mock('../services/api');
import api from '../services/api';

vi.mock('../components/DashboardLayout', () => ({
    default: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>
}));

vi.mock('../components/AttendanceHeatmap', () => ({ default: () => <div>Heatmap</div> }));

// Mock URL.createObjectURL
(globalThis as any).URL.createObjectURL = vi.fn();

// Mock Geolocation
const mockGeolocation = {
    getCurrentPosition: vi.fn()
        .mockImplementation((success) => Promise.resolve(success({
            coords: {
                latitude: 0,
                longitude: 0,
                accuracy: 10
            }
        }))),
    watchPosition: vi.fn(),
    clearWatch: vi.fn()
};
(globalThis.navigator as any).geolocation = mockGeolocation;

describe('Dashboard Checkout Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('user_data', JSON.stringify({ role: 'employee', is_field_worker: 0 }));
    });

    test('shows location selector and sends correct location', async () => {
        const now = new Date();
        const checkInTime = new Date(now.getTime() - 1000 * 60 * 60).toISOString(); // 1 hour ago

        (api.get as any).mockImplementation((url: string) => {
            if (url === '/attendance/today') {
                return Promise.resolve({
                    data: {
                        data: [{
                            id: 'att-1',
                            check_in_time: checkInTime,
                            check_out_time: null,
                            location_id: 'loc-A'
                        }],
                        meta: {
                            has_locations: true,
                            locations: [
                                { id: 'loc-A', name: 'Office A', latitude: 0, longitude: 0, radius_meters: 100 },
                                { id: 'loc-B', name: 'Office B', latitude: 0.001, longitude: 0.001, radius_meters: 100 }
                            ]
                        }
                    }
                });
            }
            if (url === '/attendance/leaves-stats') return Promise.resolve({ data: { data: { total: 12, used: 0 } } });
            if (url.includes('/attendance/history')) return Promise.resolve({ data: { data: [] } });
            return Promise.resolve({ data: {} });
        });

        (api.post as any).mockResolvedValue({ data: { message: 'Checked out' } });

        render(
            <BrowserRouter>
                <Dashboard />
            </BrowserRouter>
        );

        // Check for loading state or wait for check-out button
        await waitFor(() => expect(screen.getByText('Check Out')).toBeInTheDocument());

        // Initial state: Selector should be preset to loc-A
        const selector = screen.getByRole('combobox');
        expect(selector).toBeInTheDocument();
        expect(selector).toHaveValue('loc-A');

        // Change to Office B
        fireEvent.change(selector, { target: { value: 'loc-B' } });
        expect(selector).toHaveValue('loc-B');

        // Perform Checkout
        fireEvent.click(screen.getByText('Check Out'));

        // Verify API Call
        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/attendance/check-out', expect.objectContaining({
                location_id: 'loc-B'
            }));
        });
    });
});
