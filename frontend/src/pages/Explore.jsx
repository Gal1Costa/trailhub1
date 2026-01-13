import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { auth, onAuthStateChanged } from "../firebase";
import api from "../api";
import HikeCard from "../components/HikeCard";
import FilterSection from "../components/explore/FilterSection";
import SortingControls from "../components/explore/SortingControls";
import SearchBar from "../components/explore/SearchBar";
import "./Explore.css";

export default function Explore() {
  const [hikes, setHikes] = useState([]);
  const [joinedIds, setJoinedIds] = useState([]);
  const [filter, setFilter] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [user, setUser] = useState(auth.currentUser);
  const [userProfile, setUserProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [userReviews, setUserReviews] = useState([]);
  const [sort, setSort] = useState("priceHigh");

  // Filter states
  const [q, setQ] = useState("");
  const [difficulty, setDifficulty] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [locationQ, setLocationQ] = useState("");

  // Listen for auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setJoinedIds([]);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      // Build query parameters
      const params = {
        search: q.trim() || undefined,
        difficulty: difficulty.length > 0 
          ? (difficulty.includes("all") ? undefined : difficulty.join(","))
          : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        priceFrom: priceFrom !== "" ? priceFrom : undefined,
        priceTo: priceTo !== "" ? priceTo : undefined,
        location: locationQ.trim() || undefined,
      };

      const hikesRes = await api.get("/hikes", { params });
      const hikesData = hikesRes.data || [];
      setHikes(hikesData);

      // Only get profile/bookings if user is logged in
      if (user) {
        try {
          const profileRes = await api.get("/me");
          const profile = profileRes.data || {};
          setUserProfile(profile);
          const bookings = Array.isArray(profile.bookings) ? profile.bookings : [];
          const joined = bookings
            .filter((b) => b.hikeId)
            .map((b) => b.hikeId);
          setJoinedIds(joined);

          const reviewsRes = await api.get('/reviews/user/me');
          setUserReviews(reviewsRes.data || []);
        } catch (profileErr) {
          console.warn("Failed to load profile:", profileErr);
          setJoinedIds([]);
          setUserProfile(null);
          setUserReviews([]);
        }
      } else {
        setJoinedIds([]);
        setUserProfile(null);
        setUserReviews([]);
      }
    } catch (e) {
      console.error("Failed to load explore data", e);
      setErr(e?.response?.data?.error || e.message || "Failed to load hikes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authReady) return;
    load();
  }, [authReady, user]);

  const navigate = useNavigate();

  async function handleJoin(hikeId) {
    if (!user) {
      window.dispatchEvent(new CustomEvent('openAuthModal', { detail: { tab: 'login' } }));
      return;
    }

    try {
      await api.post(`/hikes/${hikeId}/join`);
      await load();
    } catch (e) {
      console.error("Join failed", e);
      if (e?.response?.status === 401) {
        window.dispatchEvent(new CustomEvent('openAuthModal', { detail: { tab: 'login' } }));
      } else {
        alert(e?.response?.data?.error || "Failed to join hike");
      }
    }
  }

  async function handleLeave(hikeId) {
    try {
      await api.delete(`/hikes/${hikeId}/join`);
      await load();
    } catch (e) {
      console.error("Leave failed", e);
      alert(e?.response?.data?.error || "Failed to leave hike");
    }
  }

  const joinedSet = useMemo(() => new Set(joinedIds), [joinedIds]);
  const now = new Date();

  const hasReviewedHike = (hikeId) => {
    return userReviews.some(review => review.hikeId === hikeId);
  };

  // Apply time filter (upcoming/past)
  const filteredHikes = useMemo(() => {
    const hikesArr = Array.isArray(hikes) ? hikes : [];
    return hikesArr.filter((h) => {
      const date = h.date || h.createdAt;
      const d = date ? new Date(date) : null;

      if (filter === "upcoming") {
        if (!d) return false;
        
        // Combine date and meetingTime for accurate comparison
        const hikeDate = new Date(d);
        
        // If meetingTime exists, combine it with the date
        if (h.meetingTime) {
          const [hours, minutes] = h.meetingTime.split(':').map(Number);
          hikeDate.setHours(hours, minutes, 0, 0);
        } else {
          // If no time specified, set to end of day to keep upcoming
          hikeDate.setHours(23, 59, 59, 999);
        }
        
        return hikeDate >= now;
      }

      if (filter === "past") {
        if (!d) return false;
        
        // Combine date and meetingTime for accurate comparison
        const hikeDate = new Date(d);
        
        // If meetingTime exists, combine it with the date
        if (h.meetingTime) {
          const [hours, minutes] = h.meetingTime.split(':').map(Number);
          hikeDate.setHours(hours, minutes, 0, 0);
        } else {
          // If no time specified, set to end of day to keep upcoming
          hikeDate.setHours(23, 59, 59, 999);
        }
        
        return hikeDate < now;
      }

      return true;
    });
  }, [hikes, filter, now]);

  // Apply sorting
  const sortedHikes = useMemo(() => {
    const arr = [...filteredHikes];

    if (sort === "soonest") {
      arr.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
    } else if (sort === "priceLow") {
      arr.sort((a, b) => (a.price ?? 999999) - (b.price ?? 999999));
    } else if (sort === "priceHigh") {
      arr.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    } else {
      // newest (default)
      arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return arr;
  }, [filteredHikes, sort]);

  if (loading) {
    return <div style={{ padding: 16 }}>Loading hikes…</div>;
  }

  if (err) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Explore Hikes</h2>
        <p style={{ color: "red" }}>Error: {err}</p>
      </div>
    );
  }

  return (
    <div className="explore-page">
      <div className="explore-layout">
        {/* Left: Filter Sidebar */}
        <div className="filter-sidebar">
          <FilterSection
            locationValue={locationQ}
            onLocationChange={setLocationQ}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            priceFrom={priceFrom}
            onPriceFromChange={setPriceFrom}
            priceTo={priceTo}
            onPriceToChange={setPriceTo}
            difficultyValue={difficulty}
            onDifficultyChange={setDifficulty}
            activeFilter={filter}
            onFilterChange={setFilter}
            onClearFilters={() => {
              setQ("");
              setDifficulty([]);
              setDateFrom("");
              setDateTo("");
              setPriceFrom("");
              setPriceTo("");
              setLocationQ("");
            }}
            onApplyFilters={() => {
              load();
            }}
            isSidebar={true}
          />
        </div>

        {/* Right: Content Area */}
        <div className="content-area">
          {/* Hero Header */}
          <div className="explore-hero">
            <div className="glow-blue"></div>
            <h1 className="hero-title">Discover Your Next Adventure</h1>
            <p className="hero-subtitle">Explore breathtaking trails and unforgettable hiking experiences</p>

            {/* Search Bar */}
            <SearchBar value={q} onChange={setQ} onSearch={load} />

            {/* Results Count + Sort */}
            <div className="results-header">
              <span className="results-badge">{sortedHikes.length} hikes available</span>
              <SortingControls sortValue={sort} onSortChange={setSort} />
            </div>
          </div>

          {/* Hike Cards Grid */}
          {sortedHikes.length === 0 ? (
            <div className="empty-state">
              <p>No hikes match your filters.</p>
            </div>
          ) : (
            <div className="hikes-grid">
              {sortedHikes.map((h) => {
                const hikeDate = h.date || h.createdAt;
                const d = hikeDate ? new Date(hikeDate) : null;
                
                // Determine if hike is past by combining date and meetingTime
                const isPastHike = (() => {
                  if (!d) return false;
                  
                  const hikeDateObj = new Date(d);
                  
                  // If meetingTime exists, combine it with the date
                  if (h.meetingTime) {
                    const [hours, minutes] = h.meetingTime.split(':').map(Number);
                    hikeDateObj.setHours(hours, minutes, 0, 0);
                  } else {
                    // If no time specified, set to end of day to keep upcoming
                    hikeDateObj.setHours(23, 59, 59, 999);
                  }
                  
                  return hikeDateObj < now;
                })();
                
                const isJoinedHike = joinedSet.has(h.id);
                const needsReview = isPastHike && isJoinedHike && !hasReviewedHike(h.id);

                return (
                  <HikeCard
                    key={h.id}
                    hike={h}
                    isJoined={isJoinedHike}
                    onJoin={(id) => handleJoin(id)}
                    onLeave={(id) => handleLeave(id)}
                    allowJoin={filter === "upcoming"}
                    allowLeave={true}
                    userProfile={userProfile}
                    needsReview={needsReview}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}