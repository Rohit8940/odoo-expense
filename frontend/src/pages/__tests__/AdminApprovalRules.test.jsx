import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminApprovalRules from '../AdminApprovalRules.jsx';

// mock api
vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn()
      .mockResolvedValueOnce({ data: [{ id:'u1', firstName:'Marc', lastName:'', role:'EMPLOYEE', managerId:'m1' }, { id:'m1', firstName:'Sarah', lastName:'', role:'MANAGER', managerId:null }] })
      .mockResolvedValueOnce({ data: { flow: { description:'d', useManagerAsFirstApprover:true, isSequential:true, steps:[] }, policy: { requiredPercent:60, specificApproverId:null } } }),
    post: vi.fn(),
    patch: vi.fn()
  }
}));

vi.mock('../../providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'admin1' } })
}));

describe('AdminApprovalRules', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders and saves', async () => {
    render(<AdminApprovalRules />);
    expect(await screen.findByText(/Approval rules/i)).toBeInTheDocument();

    const percent = await screen.findByLabelText(/Minimum approval percentage/i);
    fireEvent.change(percent, { target: { value: '70' } });

    const saveBtn = screen.getByRole('button', { name: /save rules/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      const { api } = require('../../lib/api');
      expect(api.post).toHaveBeenCalledWith('/api/admin/flow', expect.objectContaining({
        name: 'Miscellaneous',
        requiredPercent: 70
      }));
    });
  });
});
