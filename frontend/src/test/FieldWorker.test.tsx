import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import FieldWorkerDashboard from '../pages/FieldWorkerDashboard';
import { BrowserRouter } from 'react-router-dom';

// Mocks
vi.mock('../services/api');
import api from '../services/api';

vi.mock('../components/DashboardLayout', () => ({
    default: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>
}));

// Mock URL and Geo
(globalThis as any).URL.createObjectURL = vi.fn();
const mockGeolocation = {
    getCurrentPosition: vi.fn()
        .mockImplementation((success) => Promise.resolve(success({
            coords: { latitude: -6.2, longitude: 106.8, accuracy: 10 }
        }))),
    watchPosition: vi.fn(),
    clearWatch: vi.fn()
};
(globalThis.navigator as any).geolocation = mockGeolocation;

// Mock srcObject for video
Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
    writable: true,
    value: null
});
// Mock play
HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());

describe('Field Worker Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('user_data', JSON.stringify({ role: 'employee', is_field_worker: 1 }));
    });

    test('renders dashboard and logs visit', async () => {
        // Mock Visits
        (api.get as any).mockResolvedValue({ data: { data: [] } }); // No visits yet
        (api.post as any).mockResolvedValue({ data: { message: 'Visit logged' } });

        render(
            <BrowserRouter>
                <FieldWorkerDashboard />
            </BrowserRouter>
        );

        // Check if "Log Kunjungan" button exists
        await screen.findByText(/Log Kunjungan/i);

        // Click Log Kunjungan
        fireEvent.click(screen.getByText(/Log Kunjungan/i));

        // Check Modal
        await screen.findByText('Catat Kunjungan');

        // Fill Form - using findByPlaceholderText for async wait
        const locationInput = await screen.findByPlaceholderText(/Contoh: Toko ABC/i);
        fireEvent.change(locationInput, { target: { value: 'Client A' } });

        const notesInput = await screen.findByPlaceholderText(/Catatan kunjungan/i);
        fireEvent.change(notesInput, { target: { value: 'Discussion' } });

        // Submit
        const submitBtn = screen.getByText('Simpan Kunjungan');
        fireEvent.click(submitBtn);

        // Verify API
        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/visits/log', expect.any(Object)); // generic object check

            // More specific check
            const formData = (api.post as any).mock.calls[0][1];
            expect(formData.get('location_name')).toBe('Client A');
            expect(formData.get('notes')).toBe('Discussion');
            expect(formData.get('latitude')).toBeDefined();
        });
    });
});
