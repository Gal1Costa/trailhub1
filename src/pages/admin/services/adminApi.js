import api from '../../../api';

export async function getOverview() {
  const res = await api.get('/admin/overview');
  return res.data;
}

export async function listHikes(params = {}) {
  const res = await api.get('/admin/hikes', { params });
  return res.data;
}

export async function listUsers(params = {}) {
  const res = await api.get('/admin/users', { params });
  return res.data;
}

export async function listGuides(params = {}) {
  const res = await api.get('/admin/guides', { params });
  return res.data;
}

export async function patchHike(id, data) {
  const res = await api.patch(`/admin/hikes/${id}`, data);
  return res.data;
}

export async function patchUser(id, data) {
  const res = await api.patch(`/admin/users/${id}`, data);
  return res.data;
}

export async function patchGuide(id, data) {
  const res = await api.patch(`/admin/guides/${id}`, data);
  return res.data;
}

export async function deleteHike(id) {
  const res = await api.delete(`/admin/hikes/${id}`);
  return res.status === 204 ? { ok: true } : res.data;
}

export async function deleteUser(id) {
  const res = await api.delete(`/admin/users/${id}`);
  return res.status === 204 ? { ok: true } : res.data;
}

export async function deleteGuide(id) {
  const res = await api.delete(`/admin/guides/${id}`);
  return res.status === 204 ? { ok: true } : res.data;
}

export async function getHikeParticipants(hikeId) {
  const res = await api.get(`/admin/hikes/${hikeId}/participants`);
  return res.data;
}

export async function deleteBooking(bookingId) {
  const res = await api.delete(`/admin/bookings/${bookingId}`);
  return res.status === 204 ? { ok: true } : res.data;
}

export async function getRoleRequests() {
  const res = await api.get('/admin/role-requests');
  return res.data;
}

export async function approveRoleRequest(requestId) {
  const res = await api.post(`/admin/role-requests/${requestId}/approve`);
  return res.data;
}

export async function rejectRoleRequest(requestId) {
  const res = await api.post(`/admin/role-requests/${requestId}/reject`);
  return res.data;
}
