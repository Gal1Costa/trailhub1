import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import './admin.css';
import LoadingSkeleton from './components/LoadingSkeleton';
import EditHikeForm from '../../components/EditHikeForm';

function showToast(message, type = 'info') {
  try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } })); } catch (e) {}
}

export default function HikeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hike, setHike] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHike();
  }, [id]);

  const loadHike = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/hikes/${id}`);
      setHike(res.data);
    } catch (err) {
      console.error('Failed to load hike', err);
      showToast('Failed to load hike', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // EditHikeForm handles the save internally, just reload data
    try {
      await loadHike(); // Reload hike data after successful save
      showToast('Hike updated successfully', 'success');
    } catch (err) {
      console.error('Failed to reload hike', err);
      // Don't show error toast here as EditHikeForm already handles errors
    }
  };

  const handleBack = () => {
    navigate('/admin/hikes');
  };

  if (loading) return <LoadingSkeleton rows={10} cols={1} />;

  if (!hike) {
    return (
      <div className="admin-hike-edit">
        <div style={{ padding: 20, textAlign: 'center' }}>
          <p>Hike not found</p>
          <button className="btn" onClick={handleBack}>Back to Hikes</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-hike-edit">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Edit Hike</h2>
          <p style={{ margin: '4px 0 0 0', color: '#666' }}>{hike.name}</p>
        </div>
        <button className="btn" onClick={handleBack}>← Back to Hikes</button>
      </div>

      <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <EditHikeForm 
          hike={hike}
          onSave={handleSave}
          onCancel={handleBack}
        />
      </div>
    </div>
  );
}
