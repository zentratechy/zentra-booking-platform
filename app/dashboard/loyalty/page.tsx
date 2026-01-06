'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/useToast';
import { getCurrencySymbol } from '@/lib/currency';
import DashboardSidebar from '@/components/DashboardSidebar';

function LoyaltyContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(true);
  const [programActive, setProgramActive] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loyaltySettings, setLoyaltySettings] = useState({
    pointsPerDollar: 1,
    birthdayBonus: 50,
    referralBonus: 100,
    expirationMonths: 12,
    birthdayEnabled: true,
    referralEnabled: true,
  });
  const [businessCurrency, setBusinessCurrency] = useState('usd');
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [showEditSettingsModal, setShowEditSettingsModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rewardFormData, setRewardFormData] = useState({
    name: '',
    points: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch business settings
        const businessDoc = await getDoc(doc(db, 'businesses', user.uid));
        if (businessDoc.exists()) {
          const data = businessDoc.data();
          
          // Set business currency
          setBusinessCurrency(data.currency || 'usd');

          // Initialize loyalty program if it doesn't exist
          if (!data.loyaltyProgram) {
            await updateDoc(doc(db, 'businesses', user.uid), {
              loyaltyProgram: {
                active: true,
                settings: {
                  pointsPerDollar: 1,
                  birthdayBonus: 50,
                  referralBonus: 100,
                  expirationMonths: 12,
                }
              }
            });
            setProgramActive(true);
            setLoyaltySettings({
              pointsPerDollar: 1,
              birthdayBonus: 50,
              referralBonus: 100,
              expirationMonths: 12,
              birthdayEnabled: true,
              referralEnabled: true,
            });
          } else {
            setProgramActive(data.loyaltyProgram?.active ?? true);
            if (data.loyaltyProgram?.settings) {
              const s = data.loyaltyProgram.settings;
              setLoyaltySettings({
                pointsPerDollar: s.pointsPerDollar ?? 1,
                birthdayBonus: s.birthdayBonus ?? 50,
                referralBonus: s.referralBonus ?? 100,
                expirationMonths: s.expirationMonths ?? 12,
                birthdayEnabled: (s.birthday?.enabled ?? s.birthdayEnabled ?? true),
                referralEnabled: (s.referral?.enabled ?? s.referralEnabled ?? true),
              });
            }
          }
        }

        // Fetch clients with loyalty points
        const clientsQuery = query(
          collection(db, 'clients'),
          where('businessId', '==', user.uid)
        );
        const clientsSnapshot = await getDocs(clientsQuery);
        const clientsData = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClients(clientsData);

        // Fetch rewards
        const rewardsQuery = query(
          collection(db, 'rewards'),
          where('businessId', '==', user.uid)
        );
        const rewardsSnapshot = await getDocs(rewardsQuery);
        const rewardsData = rewardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRewards(rewardsData);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching loyalty data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleToggleProgram = async () => {
    if (!user) return;
    
    try {
      const newStatus = !programActive;
      await updateDoc(doc(db, 'businesses', user.uid), {
        'loyaltyProgram.active': newStatus,
      });
      setProgramActive(newStatus);
      showToast(newStatus ? 'Loyalty program activated' : 'Loyalty program deactivated', 'success');
    } catch (error) {
      console.error('Error toggling program:', error);
      showToast('Failed to update program status', 'error');
    }
  };

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const pointsValue = parseInt(rewardFormData.points);
    if (isNaN(pointsValue) || pointsValue <= 0) {
      showToast('Please enter a valid points value', 'error');
      return;
    }

    setSaving(true);
    try {
      const newReward = {
        businessId: user.uid,
        name: rewardFormData.name.trim(),
        points: pointsValue,
        description: rewardFormData.description.trim(),
        active: true,
        claimed: 0,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'rewards'), newReward);
      setRewards([...rewards, { id: docRef.id, ...newReward, createdAt: new Date() }]);
      
      setRewardFormData({ name: '', points: '', description: '' });
      setShowAddRewardModal(false);
      setSaving(false);
      showToast('Reward added successfully!', 'success');
    } catch (error) {
      console.error('Error adding reward:', error);
      showToast('Failed to add reward', 'error');
      setSaving(false);
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!confirm('Are you sure you want to delete this reward?')) return;

    try {
      await deleteDoc(doc(db, 'rewards', rewardId));
      setRewards(rewards.filter(r => r.id !== rewardId));
      showToast('Reward deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting reward:', error);
      showToast('Failed to delete reward', 'error');
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'businesses', user.uid), {
        'loyaltyProgram.settings': loyaltySettings,
      });
      
      setShowEditSettingsModal(false);
      setSaving(false);
      showToast('Settings updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('Failed to update settings', 'error');
      setSaving(false);
    }
  };

  const handleRefreshClients = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      const clientsQuery = query(
        collection(db, 'clients'),
        where('businessId', '==', user.uid)
      );
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientsData = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(clientsData);
      showToast('Client data refreshed!', 'success');
    } catch (error) {
      console.error('Error refreshing clients:', error);
      showToast('Failed to refresh client data', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate stats
  const activeMembers = clients.filter(c => (c.loyaltyPoints || 0) > 0).length;
  const totalPoints = clients.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);
  const totalRedeemed = rewards.reduce((sum, r) => sum + (r.claimed || 0), 0);
  const avgPoints = activeMembers > 0 ? Math.round(totalPoints / activeMembers) : 0;

  // Get top members
  const topMembers = [...clients]
    .sort((a, b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0))
    .slice(0, 5);

  const stats = [
    { label: 'Active Members', value: activeMembers.toString() },
    { label: 'Points Issued', value: totalPoints.toString() },
    { label: 'Rewards Redeemed', value: totalRedeemed.toString() },
    { label: 'Avg. Points/Client', value: avgPoints.toString() },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading loyalty program...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-cream">
      <ToastContainer />
      <DashboardSidebar />

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {/* Top Bar */}
        <div className="bg-white shadow-sm sticky top-16 lg:top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Loyalty Program</h2>
              <p className="text-sm lg:text-base text-gray-600">Reward your loyal clients and boost retention</p>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Program Status:</span>
                <button
                  onClick={handleToggleProgram}
                  className={`toggle-switch relative inline-flex min-h-[25px] w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${programActive ? 'bg-primary' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm border border-gray-200 transition-transform duration-200 ease-in-out ${programActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className={`text-sm font-medium ${programActive ? 'text-green-600' : 'text-gray-600'}`}>
                  {programActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button 
                onClick={() => setShowAddRewardModal(true)}
                className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg font-semibold transition-colors min-h-[44px] w-full lg:w-auto"
              >
                + New Reward
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Stats Grid */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Loyalty Program Overview</h2>
            <button
              onClick={handleRefreshClients}
              disabled={refreshing}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] w-full lg:w-auto"
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100">
                <p className="text-xs lg:text-sm text-gray-600 mb-2">{stat.label}</p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Program Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Points Rules */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Points & Rewards Rules</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-soft-pink/20 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">Earn {loyaltySettings.pointsPerDollar} point per {getCurrencySymbol(businessCurrency)}1 spent</div>
                      <div className="text-sm text-gray-600">Standard earning rate</div>
                    </div>
                    <button 
                      onClick={() => setShowEditSettingsModal(true)}
                      className="text-primary hover:text-primary-dark text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-soft-pink/20 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">Birthday Bonus: {loyaltySettings.birthdayBonus} points</div>
                      <div className="text-sm text-gray-600">Automatic on client's birthday • {loyaltySettings.birthdayEnabled ? 'On' : 'Off'}</div>
                    </div>
                    <button 
                      onClick={() => setShowEditSettingsModal(true)}
                      className="text-primary hover:text-primary-dark text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-soft-pink/20 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">Referral Bonus: {loyaltySettings.referralBonus} points</div>
                      <div className="text-sm text-gray-600">When referred friend books first appointment • {loyaltySettings.referralEnabled ? 'On' : 'Off'}</div>
                    </div>
                    <button 
                      onClick={() => setShowEditSettingsModal(true)}
                      className="text-primary hover:text-primary-dark text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-soft-pink/20 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">Points Expiration: {loyaltySettings.expirationMonths} months</div>
                      <div className="text-sm text-gray-600">Points expire after inactivity</div>
                    </div>
                    <button 
                      onClick={() => setShowEditSettingsModal(true)}
                      className="text-primary hover:text-primary-dark text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>


              {/* Available Rewards */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Rewards</h3>
                {rewards.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 mb-4">No rewards created yet</p>
                    <button
                      onClick={() => setShowAddRewardModal(true)}
                      className="text-primary hover:text-primary-dark font-medium"
                    >
                      + Create Your First Reward
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rewards.map((reward) => (
                      <div key={reward.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors">
                        <div>
                          <h4 className="font-medium text-gray-900">{reward.name}</h4>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-sm text-gray-600">{reward.points} points</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-sm text-gray-600">Claimed {reward.claimed || 0} times</span>
                          </div>
                          {reward.description && (
                            <p className="text-xs text-gray-500 mt-1">{reward.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${reward.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {reward.active ? 'Active' : 'Inactive'}
                          </span>
                          <button 
                            onClick={() => handleDeleteReward(reward.id)}
                            className="p-2 hover:bg-red-50 rounded-lg"
                            title="Delete reward"
                          >
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Members */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Top Members</h3>
                  <button
                    onClick={handleRefreshClients}
                    disabled={refreshing}
                    className="text-gray-500 hover:text-gray-700 text-sm font-medium disabled:opacity-50"
                  >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                {topMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 text-sm">No loyalty members yet</p>
                    <p className="text-gray-500 text-xs mt-2">Points are earned when clients complete bookings</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topMembers.map((member, index) => (
                    <div key={member.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/40 rounded-full flex items-center justify-center text-lg font-bold text-primary">
                            {member.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          {index < 3 && (
                            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-400 text-yellow-900' : index === 1 ? 'bg-gray-300 text-gray-700' : 'bg-amber-600 text-white'}`}>
                              {index + 1}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">{member.name}</h4>
                        <p className="text-xs text-gray-600 truncate">{member.email}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div>
                            <div className="text-lg font-bold text-primary">{member.loyaltyPoints || 0}</div>
                            <div className="text-xs text-gray-600">points</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{member.totalVisits || 0} visits</div>
                            <div className="text-xs text-gray-600">{getCurrencySymbol(businessCurrency)}{member.totalSpent || 0}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                )}

                <Link 
                  href="/dashboard/clients"
                  className="block w-full mt-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg font-medium transition-colors text-center"
                >
                  View All Clients
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Reward Modal */}
      {showAddRewardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">New Reward</h3>
                <button 
                  onClick={() => setShowAddRewardModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleAddReward} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reward Name *</label>
                <input 
                  type="text"
                  value={rewardFormData.name}
                  onChange={(e) => setRewardFormData({ ...rewardFormData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="e.g., 10% Off Next Service"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Points Required *</label>
                <input 
                  type="number"
                  value={rewardFormData.points}
                  onChange={(e) => setRewardFormData({ ...rewardFormData, points: e.target.value })}
                  required
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea 
                  value={rewardFormData.description}
                  onChange={(e) => setRewardFormData({ ...rewardFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Describe what the client receives..."
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setShowAddRewardModal(false)}
                  disabled={saving}
                  className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Adding...' : 'Add Reward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Settings Modal */}
      {showEditSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">Edit Loyalty Settings</h3>
                <button 
                  onClick={() => setShowEditSettingsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateSettings} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Points Per Dollar Spent</label>
                <input 
                  type="number"
                  value={loyaltySettings.pointsPerDollar}
                  onChange={(e) => setLoyaltySettings({ ...loyaltySettings, pointsPerDollar: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="10"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-600 mt-1">How many points clients earn per {getCurrencySymbol(businessCurrency)}1 spent</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Birthday Bonus Points</label>
                <input 
                  type="number"
                  value={loyaltySettings.birthdayBonus}
                  onChange={(e) => setLoyaltySettings({ ...loyaltySettings, birthdayBonus: parseInt(e.target.value) || 0 })}
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-600 mt-1">Bonus points on client's birthday</p>
                <div className="mt-2 flex items-center space-x-2">
                  <input
                    id="birthdayEnabled"
                    type="checkbox"
                    checked={loyaltySettings.birthdayEnabled}
                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, birthdayEnabled: e.target.checked })}
                  />
                  <label htmlFor="birthdayEnabled" className="text-sm text-gray-700">Enable Birthday Bonus</label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Referral Bonus Points</label>
                <input 
                  type="number"
                  value={loyaltySettings.referralBonus}
                  onChange={(e) => setLoyaltySettings({ ...loyaltySettings, referralBonus: parseInt(e.target.value) || 0 })}
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-600 mt-1">Points when a referred client books</p>
                <div className="mt-2 flex items-center space-x-2">
                  <input
                    id="referralEnabled"
                    type="checkbox"
                    checked={loyaltySettings.referralEnabled}
                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, referralEnabled: e.target.checked })}
                  />
                  <label htmlFor="referralEnabled" className="text-sm text-gray-700">Enable Referral Bonus</label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Points Expiration (Months)</label>
                <input 
                  type="number"
                  value={loyaltySettings.expirationMonths}
                  onChange={(e) => setLoyaltySettings({ ...loyaltySettings, expirationMonths: parseInt(e.target.value) || 12 })}
                  min="1"
                  max="36"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-600 mt-1">Points expire after this many months of inactivity</p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setShowEditSettingsModal(false)}
                  disabled={saving}
                  className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoyaltyProgram() {
  return (
    <ProtectedRoute>
      <LoyaltyContent />
    </ProtectedRoute>
  );
}

