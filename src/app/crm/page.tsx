'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Clock,
  MapPin,
} from 'lucide-react';
import { AppShell, Header } from '@/components/layout';
import { MetricCard, StatusIndicator, DataTable, Column } from '@/components/dashboard';
import api from '@/lib/api';

export default function CrmPage() {
  const [tab, setTab] = useState<'customers' | 'appointments'>('customers');
  const [customers, setCustomers] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [custForm, setCustForm] = useState({
    name: '',
    phone: '',
    email: '',
    source: '',
    note: '',
    teeth_condition: '',
  });
  const [aptForm, setAptForm] = useState({
    customer_id: '',
    appointment_date: '',
    service: 'Niềng Răng Trong Suốt',
    branch: '',
    note: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cusRes, aptRes, statsRes] = await Promise.all([
        api.get('/crm/customers'),
        api.get('/crm/appointments'),
        api.get('/crm/stats'),
      ]);
      setCustomers(Array.isArray(cusRes.data) ? cusRes.data : []);
      setAppointments(Array.isArray(aptRes.data) ? aptRes.data : []);
      setStats(statsRes.data && typeof statsRes.data === 'object' ? statsRes.data : null);
    } catch {
      toast.error('Lỗi tải dữ liệu');
      setCustomers([]);
      setAppointments([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCustForm({ name: '', phone: '', email: '', source: '', note: '', teeth_condition: '' });
    setAptForm({ customer_id: '', appointment_date: '', service: 'Niềng Răng Trong Suốt', branch: '', note: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleCreateCustomer = async () => {
    if (!custForm.name.trim()) {
      toast.error('Nhập tên khách hàng');
      return;
    }
    try {
      setSubmitting(true);
      if (editingId) {
        await api.put(`/crm/customers/${editingId}`, custForm);
        toast.success('Đã cập nhật');
      } else {
        await api.post('/crm/customers', custForm);
        toast.success('Đã thêm khách hàng');
      }
      resetForm();
      loadData();
    } catch {
      toast.error('Lỗi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAppointment = async () => {
    if (!aptForm.customer_id || !aptForm.appointment_date) {
      toast.error('Chọn khách và ngày hẹn');
      return;
    }
    try {
      setSubmitting(true);
      if (editingId) {
        await api.put(`/crm/appointments/${editingId}`, aptForm);
        toast.success('Đã cập nhật');
      } else {
        await api.post('/crm/appointments', aptForm);
        toast.success('Đã đặt lịch');
      }
      resetForm();
      loadData();
    } catch {
      toast.error('Lỗi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (type: 'customers' | 'appointments', id: string) => {
    if (!confirm('Xóa?')) return;
    try {
      await api.delete(`/crm/${type}/${id}`);
      toast.success('Đã xóa');
      loadData();
    } catch {
      toast.error('Lỗi');
    }
  };

  const editCustomer = (c: any) => {
    setCustForm({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      source: c.source || '',
      note: c.note || '',
      teeth_condition: c.teeth_condition || '',
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const editAppointment = (a: any) => {
    setAptForm({
      customer_id: a.customer_id,
      appointment_date: a.appointment_date?.slice(0, 16),
      service: a.service || '',
      branch: a.branch || '',
      note: a.note || '',
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const getStatusType = (status: string) => {
    if (status === 'new' || status === 'pending') return 'pending';
    if (status === 'contacted' || status === 'confirmed') return 'healthy';
    if (status === 'completed') return 'healthy';
    if (status === 'cancelled') return 'error';
    return 'inactive';
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Table columns
  const customerColumns: Column<any>[] = [
    {
      key: 'name',
      header: 'Tên',
      sortable: true,
      render: (row) => (
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'SĐT',
      render: (row) => (
        <span style={{ color: 'var(--text-secondary)' }}>{row.phone || '—'}</span>
      ),
    },
    {
      key: 'teeth_condition',
      header: 'Tình trạng',
      render: (row) => (
        <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          {row.teeth_condition || '—'}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'Nguồn',
      render: (row) => (
        <span style={{ color: 'var(--text-secondary)' }}>{row.source || '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <StatusIndicator status={getStatusType(row.status)} label={row.status} size="sm" />
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); editCustomer(row); }}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete('customers', row.id); }}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const appointmentColumns: Column<any>[] = [
    {
      key: 'customer',
      header: 'Khách hàng',
      sortable: true,
      render: (row) => (
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {row.customer?.name || '—'}
        </span>
      ),
    },
    {
      key: 'appointment_date',
      header: 'Ngày hẹn',
      sortable: true,
      render: (row) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {formatDateTime(row.appointment_date)}
        </span>
      ),
    },
    {
      key: 'service',
      header: 'Dịch vụ',
      render: (row) => (
        <span style={{ color: 'var(--text-secondary)' }}>{row.service}</span>
      ),
    },
    {
      key: 'branch',
      header: 'Chi nhánh',
      render: (row) => (
        <span style={{ color: 'var(--text-tertiary)' }}>{row.branch || '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <StatusIndicator status={getStatusType(row.status)} label={row.status} size="sm" />
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); editAppointment(row); }}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete('appointments', row.id); }}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // Render
  return (
    <AppShell>
      <Header
        title="CRM"
        subtitle="Khách hàng & Lịch hẹn"
        tabs={[
          { id: 'customers', label: 'Khách hàng', icon: Users },
          { id: 'appointments', label: 'Lịch hẹn', icon: Calendar },
        ]}
        activeTab={tab}
        onTabChange={(t) => { setTab(t as any); resetForm(); }}
        actions={
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Plus className="w-4 h-4" />
            {tab === 'customers' ? 'Thêm khách' : 'Đặt lịch'}
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : (
          <>
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <MetricCard
                  title="Khách hàng"
                  value={stats.customers}
                  icon={<Users className="w-4 h-4" />}
                  sparkline={{ values: [3, 5, 4, 7, 6, 8, stats.customers], color: 'var(--accent)' }}
                />
                <MetricCard
                  title="Lịch hẹn"
                  value={stats.appointments}
                  icon={<Calendar className="w-4 h-4" />}
                  sparkline={{ values: [2, 4, 3, 5, 4, 6, stats.appointments], color: 'var(--accent-purple)' }}
                />
                <MetricCard
                  title="Chờ xác nhận"
                  value={stats.pending}
                  icon={<Clock className="w-4 h-4" />}
                  trend={{ value: 12, direction: 'up', label: 'tuần này' }}
                />
                <MetricCard
                  title="Đã xác nhận"
                  value={stats.confirmed}
                  icon={<MapPin className="w-4 h-4" />}
                  trend={{ value: 8, direction: 'up', label: 'tuần này' }}
                />
              </div>
            )}

            {/* Data Table */}
            {tab === 'customers' ? (
              <DataTable
                data={customers}
                columns={customerColumns}
                title="Danh sách khách hàng"
                searchable
                searchPlaceholder="Tìm theo tên, SĐT..."
                searchKeys={['name', 'phone', 'email']}
                emptyMessage="Chưa có khách hàng"
              />
            ) : (
              <DataTable
                data={appointments}
                columns={appointmentColumns}
                title="Danh sách lịch hẹn"
                searchable
                searchPlaceholder="Tìm theo khách hàng..."
                searchKeys={['customer.name', 'service']}
                emptyMessage="Chưa có lịch hẹn"
              />
            )}
          </>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={resetForm} />
          <div
            className="relative w-full max-w-lg mx-4 rounded-xl p-6"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingId ? 'Sửa' : tab === 'customers' ? 'Thêm khách hàng' : 'Đặt lịch hẹn'}
              </h3>
              <button
                onClick={resetForm}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {tab === 'customers' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Tên khách hàng *
                    </label>
                    <input
                      type="text"
                      value={custForm.name}
                      onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-[13px] outline-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      value={custForm.phone}
                      onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-[13px] outline-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={custForm.email}
                      onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-[13px] outline-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Nguồn
                    </label>
                    <input
                      type="text"
                      value={custForm.source}
                      onChange={(e) => setCustForm({ ...custForm, source: e.target.value })}
                      placeholder="Facebook, Zalo..."
                      className="w-full px-4 py-2.5 rounded-lg text-[13px] outline-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Tình trạng răng
                  </label>
                  <input
                    type="text"
                    value={custForm.teeth_condition}
                    onChange={(e) => setCustForm({ ...custForm, teeth_condition: e.target.value })}
                    placeholder="Hô, móm, khấp khểnh..."
                    className="w-full px-4 py-2.5 rounded-lg text-[13px] outline-none"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Ghi chú
                  </label>
                  <textarea
                    value={custForm.note}
                    onChange={(e) => setCustForm({ ...custForm, note: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg text-[13px] outline-none resize-none"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCreateCustomer}
                    disabled={submitting}
                    className="flex-1 px-6 py-2.5 rounded-lg text-[13px] font-medium disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editingId ? 'Cập nhật' : 'Thêm'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-6 py-2.5 rounded-lg text-[13px] font-medium hover:bg-[var(--bg-hover)]"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Khách hàng *
                    </label>
                    <select
                      value={aptForm.customer_id}
                      onChange={(e) => setAptForm({ ...aptForm, customer_id: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-[13px] outline-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    >
                      <option value="">Chọn khách hàng</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `- ${c.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Ngày hẹn *
                    </label>
                    <input
                      type="datetime-local"
                      value={aptForm.appointment_date}
                      onChange={(e) => setAptForm({ ...aptForm, appointment_date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-[13px] outline-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Dịch vụ
                    </label>
                    <input
                      type="text"
                      value={aptForm.service}
                      onChange={(e) => setAptForm({ ...aptForm, service: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-[13px] outline-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Chi nhánh
                    </label>
                    <input
                      type="text"
                      value={aptForm.branch}
                      onChange={(e) => setAptForm({ ...aptForm, branch: e.target.value })}
                      placeholder="Q1 HCM, Hà Nội..."
                      className="w-full px-4 py-2.5 rounded-lg text-[13px] outline-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Ghi chú
                  </label>
                  <textarea
                    value={aptForm.note}
                    onChange={(e) => setAptForm({ ...aptForm, note: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg text-[13px] outline-none resize-none"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCreateAppointment}
                    disabled={submitting}
                    className="flex-1 px-6 py-2.5 rounded-lg text-[13px] font-medium disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editingId ? 'Cập nhật' : 'Đặt lịch'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-6 py-2.5 rounded-lg text-[13px] font-medium hover:bg-[var(--bg-hover)]"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
